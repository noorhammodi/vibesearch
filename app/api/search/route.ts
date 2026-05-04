import { NextResponse } from "next/server";
import { fetchMontrealCoffeeShops, type MontrealCoffeeShop } from "@/lib/coffeeShops";
import { recommendShopsForVibes, type UserSuggestion } from "@/lib/vibePick";
import { supabase } from "@/lib/supabase";

type HydratedResult = {
  shop: MontrealCoffeeShop;
  score: number;
  reason: string;
  rank: number;
};

const SEARCH_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function loadSuggestions(): Promise<UserSuggestion[]> {
  const { data, error } = await supabase
    .from("suggestions")
    .select("id, shop_name, submitter_name, vibe, timestamp, place_id, formatted_address, lat, lon");

  if (error) {
    console.error("Error loading suggestions:", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    shopName: row.shop_name,
    submitterName: row.submitter_name ?? "",
    vibe: row.vibe,
    timestamp: row.timestamp,
    placeId: row.place_id ?? undefined,
    formattedAddress: row.formatted_address ?? undefined,
    lat: row.lat ?? undefined,
    lon: row.lon ?? undefined,
  }));
}

async function getCachedSearch(key: string): Promise<HydratedResult[] | null> {
  const { data } = await supabase
    .from("search_cache")
    .select("data, created_at")
    .eq("cache_key", key)
    .single();

  if (!data) return null;
  if (Date.now() - new Date(data.created_at).getTime() > SEARCH_TTL_MS) return null;
  return data.data as HydratedResult[];
}

async function setCachedSearch(key: string, results: HydratedResult[]): Promise<void> {
  await supabase.from("search_cache").upsert({
    cache_key: key,
    data: results,
    created_at: new Date().toISOString(),
  });
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const vibes =
    typeof body === "object" &&
    body !== null &&
    "vibes" in body &&
    typeof (body as { vibes: unknown }).vibes === "string"
      ? (body as { vibes: string }).vibes.trim()
      : "";

  if (!vibes) {
    return NextResponse.json(
      { error: "Add a few vibe words (e.g. rainy laptop cozy)." },
      { status: 400 }
    );
  }

  const topN =
    typeof body === "object" &&
    body !== null &&
    "topN" in body &&
    typeof (body as { topN: unknown }).topN === "number"
      ? Math.floor((body as { topN: number }).topN)
      : 3;

  try {
    const suggestions = await loadSuggestions();
    const cacheKey = `${vibes.toLowerCase()}:${topN}:${suggestions.length}`;

    // Check Supabase cache first
    const cached = await getCachedSearch(cacheKey);
    if (cached) {
      return NextResponse.json({ results: cached, fromCache: true });
    }

    const shops = await fetchMontrealCoffeeShops(120);
    if (shops.length === 0) {
      return NextResponse.json(
        { error: "No cafés returned from the map right now. Try again in a minute." },
        { status: 503 }
      );
    }

    // Inject any suggested shops missing from the Places pool
    const poolIds = new Set(shops.map((s) => s.id));
    for (const sg of suggestions) {
      if (!sg.placeId || poolIds.has(sg.placeId) || sg.lat == null || sg.lon == null) continue;
      const injected: MontrealCoffeeShop = {
        id: sg.placeId,
        name: sg.shopName,
        lat: sg.lat,
        lon: sg.lon,
        address: sg.formattedAddress,
        summary: `community pick · ${sg.vibe}`,
      };
      shops.push(injected);
      poolIds.add(sg.placeId);
    }

    const { results } = await recommendShopsForVibes(vibes, shops, {
      topN: Math.max(1, Math.min(topN, 15)),
      shortlist: 30,
      suggestions,
    });

    const hydrated: HydratedResult[] = results.map((r, rank) => ({
      shop: shops[r.index],
      score: r.score,
      reason: r.reason,
      rank,
    }));

    hydrated.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.shop.id.localeCompare(b.shop.id);
    });

    await setCachedSearch(cacheKey, hydrated);
    return NextResponse.json({ results: hydrated });
  } catch (e: unknown) {
    const message =
      e instanceof Error ? e.message : "Something went wrong matching vibes.";
    console.error("[api/search]", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
