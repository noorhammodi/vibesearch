import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

type PlaceResult = {
  id: string;
  formattedAddress?: string;
  displayName?: { text?: string };
  location?: { latitude?: number; longitude?: number };
};

async function searchPlaces(query: string, apiKey: string): Promise<PlaceResult[]> {
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "places.id,places.displayName.text,places.formattedAddress,places.location",
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

function editDistance(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  return dp[m][n];
}

function nameMatches(placeName: string, submitted: string): boolean {
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9\s]/g, " ");

  const placeWords = normalize(placeName).split(/\s+/).filter((w) => w.length > 2);
  const submittedWords = normalize(submitted).split(/\s+/).filter((w) => w.length > 2);

  if (submittedWords.length === 0 || placeWords.length === 0) return false;

  return submittedWords.some((sw) =>
    placeWords.some((pw) => {
      if (pw === sw) return true;
      const maxDist = sw.length >= 6 ? 2 : sw.length >= 4 ? 1 : 0;
      return maxDist > 0 && editDistance(sw, pw) <= maxDist;
    })
  );
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
): Promise<{ valid: boolean; placeId?: string; formattedAddress?: string; lat?: number; lon?: number }> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) return { valid: true };

  function extractResult(place: PlaceResult) {
    return {
      valid: true,
      placeId: place.id,
      formattedAddress: place.formattedAddress,
      lat: place.location?.latitude,
      lon: place.location?.longitude,
    };
  }

  const byAddress = await searchPlaces(`${shopName} ${address}`, apiKey);
  const addressMatch = byAddress.find((p) => isMontrealMatch(p, shopName));
  if (addressMatch) return extractResult(addressMatch);

  const byName = await searchPlaces(`${shopName} Montreal`, apiKey);
  const nameMatch = byName.find((p) => isMontrealMatch(p, shopName));
  if (nameMatch) return extractResult(nameMatch);

  return { valid: false };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { submitterName, shopName, address, vibe } = body;

    if (!shopName || !address || !vibe) {
      return NextResponse.json({ error: "Café name, address, and vibe are required." }, { status: 400 });
    }

    const validation = await validateMontrealShop(shopName.trim(), address.trim());
    if (!validation.valid) {
      return NextResponse.json(
        { error: "We couldn't find that coffee shop in Montréal. Make sure it's a real spot!" },
        { status: 422 }
      );
    }

    const { error } = await supabase.from("suggestions").insert({
      id: Date.now().toString(),
      submitter_name: submitterName?.trim() || null,
      shop_name: shopName.trim(),
      address: address.trim(),
      vibe: vibe.trim(),
      timestamp: new Date().toISOString(),
      place_id: validation.placeId ?? null,
      formatted_address: validation.formattedAddress ?? null,
      lat: validation.lat ?? null,
      lon: validation.lon ?? null,
    });

    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true, message: "Suggestion saved successfully" }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to process suggestion";
    console.error("[api/suggestions]", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("suggestions")
      .select("*")
      .order("timestamp", { ascending: false });

    if (error) throw new Error(error.message);

    return NextResponse.json({ suggestions: data ?? [] }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch suggestions";
    console.error("[api/suggestions]", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
