import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const SUGGESTIONS_FILE = path.join(process.cwd(), "suggestions.json");

function getSuggestions() {
  try {
    if (fs.existsSync(SUGGESTIONS_FILE)) {
      const data = fs.readFileSync(SUGGESTIONS_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Error reading suggestions:", error);
  }
  return [];
}

function saveSuggestions(suggestions: unknown[]) {
  try {
    fs.writeFileSync(SUGGESTIONS_FILE, JSON.stringify(suggestions, null, 2));
    return true;
  } catch (error) {
    console.error("Error saving suggestions:", error);
    return false;
  }
}

type PlaceResult = {
  id: string;
  formattedAddress?: string;
  displayName?: { text?: string };
};

async function searchPlaces(query: string, apiKey: string): Promise<PlaceResult[]> {
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "places.id,places.displayName.text,places.formattedAddress",
    },
    body: JSON.stringify({
      textQuery: query,
      locationBias: {
        circle: {
          center: { latitude: 45.5017, longitude: -73.5673 },
          radius: 30000.0,
        },
      },
      maxResultCount: 5,
    }),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.places || [];
}

function nameMatches(placeName: string, submitted: string): boolean {
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9\s]/g, " ");

  const placeWords = new Set(
    normalize(placeName).split(/\s+/).filter((w) => w.length > 2)
  );
  const submittedWords = normalize(submitted).split(/\s+/).filter((w) => w.length > 2);

  if (submittedWords.length === 0 || placeWords.size === 0) return false;

  // Exact word match only — "test" must appear as a word in the place name, not as a substring
  return submittedWords.some((w) => placeWords.has(w));
}

function isMontrealMatch(place: PlaceResult, shopName: string): boolean {
  const addr = (place.formattedAddress || "").toLowerCase();
  const inMontreal = addr.includes("montréal") || addr.includes("montreal");
  if (!inMontreal) return false;
  return nameMatches(place.displayName?.text || "", shopName);
}

async function validateMontrealShop(
  shopName: string,
  address: string
): Promise<{ valid: boolean; placeId?: string; formattedAddress?: string }> {
  const apiKey =
    process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) return { valid: true };

  // Try name + address first for a precise match
  const byAddress = await searchPlaces(`${shopName} ${address}`, apiKey);
  const addressMatch = byAddress.find((p) => isMontrealMatch(p, shopName));
  if (addressMatch) {
    return { valid: true, placeId: addressMatch.id, formattedAddress: addressMatch.formattedAddress };
  }

  // Fall back to name-only in case the address format didn't match
  const byName = await searchPlaces(`${shopName} Montreal`, apiKey);
  const nameMatch = byName.find((p) => isMontrealMatch(p, shopName));
  if (nameMatch) {
    return { valid: true, placeId: nameMatch.id, formattedAddress: nameMatch.formattedAddress };
  }

  return { valid: false };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { submitterName, shopName, address, vibe } = body;

    if (!submitterName || !shopName || !address || !vibe) {
      return NextResponse.json(
        { error: "All fields are required." },
        { status: 400 }
      );
    }

    const validation = await validateMontrealShop(shopName.trim(), address.trim());
    if (!validation.valid) {
      return NextResponse.json(
        {
          error:
            "We couldn't find that coffee shop in Montréal. Make sure it's a real spot!",
        },
        { status: 422 }
      );
    }

    const suggestions = getSuggestions();
    suggestions.push({
      id: Date.now().toString(),
      submitterName: submitterName.trim(),
      shopName: shopName.trim(),
      address: address.trim(),
      vibe: vibe.trim(),
      timestamp: new Date().toISOString(),
      ...(validation.placeId ? { placeId: validation.placeId } : {}),
      ...(validation.formattedAddress
        ? { formattedAddress: validation.formattedAddress }
        : {}),
    });

    if (saveSuggestions(suggestions)) {
      return NextResponse.json(
        { success: true, message: "Suggestion saved successfully" },
        { status: 201 }
      );
    } else {
      return NextResponse.json(
        { error: "Failed to save suggestion" },
        { status: 500 }
      );
    }
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to process suggestion";
    console.error("[api/suggestions]", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const suggestions = getSuggestions();
    return NextResponse.json({ suggestions }, { status: 200 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch suggestions";
    console.error("[api/suggestions]", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
