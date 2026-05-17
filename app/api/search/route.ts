import { NextResponse } from "next/server";
import { fetchMontrealCoffeeShops, type MontrealCoffeeShop } from "@/lib/coffeeShops";
import {
  recommendShopsForVibes,
  isSuggestedShop,
  matchingSuggestionForShop,
  vibeOverlapScore,
  type UserSuggestion,
} from "@/lib/vibePick";
import { loadSuggestions, normalizePlaceId, suggestionsCacheSignature } from "@/lib/suggestions";
import { supabase } from "@/lib/supabase";
import { TtlCache } from "@/lib/cache";

type HydratedResult = {
  shop: MontrealCoffeeShop;
  score: number;
  reason: string;
  rank: number;
};

const SEARCH_TTL_MS = 15 * 60 * 1000;
const VOTES_TTL_MS = 10 * 60 * 1000;
const MAX_RESULTS = 15;

// L1: in-process caches — zero-latency hits within a warm server instance
const searchMem = new TtlCache<HydratedResult[]>();
const votesMem = new TtlCache<Map<string, number>>();

// Dedup map — concurrent requests for the same query share one Gemini call
const inFlight = new Map<string, Promise<HydratedResult[]>>();

// Returns a map of shopId → net vote score (positive = more thumbs up, negative = more thumbs down)
async function loadVoteWeights(): Promise<Map<string, number>> {
  const cached = votesMem.get("weights");
  if (cached) return cached;

  try {
    const { data } = await supabase.from("shop_votes").select("shop_id, vote");
    const weights = new Map<string, number>();
    for (const row of (data ?? [])) {
      const cur = weights.get(row.shop_id) ?? 0;
      weights.set(row.shop_id, cur + (row.vote === "up" ? 1 : -1));
    }
    votesMem.set("weights", weights, VOTES_TTL_MS);
    return weights;
  } catch {
    // Table may not exist yet — fail gracefully
    return new Map();
  }
}

function shopFromSuggestion(sg: UserSuggestion): MontrealCoffeeShop | undefined {
  const id = normalizePlaceId(sg.placeId);
  if (!id || sg.lat == null || sg.lon == null) return undefined;
  return {
    id,
    name: sg.shopName,
    lat: sg.lat,
    lon: sg.lon,
    address: sg.formattedAddress,
    summary: `community pick · ${sg.shopName} · vibes: ${sg.vibe}`,
  };
}

function findShopForSuggestion(
  sg: UserSuggestion,
  shops: MontrealCoffeeShop[]
): MontrealCoffeeShop | undefined {
  const placeId = normalizePlaceId(sg.placeId);
  if (placeId) {
    const byId = shops.find((s) => normalizePlaceId(s.id) === placeId);
    if (byId) return byId;
    const built = shopFromSuggestion({ ...sg, placeId });
    if (built) return built;
  }
  return shops.find((s) => isSuggestedShop(s, [sg]));
}

/** Force community picks into results — Gemini often omits them from top 3. */
function mergeCommunityResults(
  hydrated: HydratedResult[],
  vibes: string,
  suggestions: UserSuggestion[],
  shops: MontrealCoffeeShop[]
): HydratedResult[] {
  const byId = new Map<string, HydratedResult>();

  for (const r of hydrated) {
    byId.set(r.shop.id, r);
  }

  for (const sg of suggestions) {
    const shop = findShopForSuggestion(sg, shops);
    if (!shop) continue;

    const overlap = vibeOverlapScore(vibes, sg.vibe);
    if (overlap < 0.08) continue;

    const score = overlap >= 0.35 ? 0.99 : 0.93 + overlap * 0.07;
    const existing = byId.get(shop.id);
    const reason =
      existing?.reason.toLowerCase().includes("community") ||
      existing?.reason.toLowerCase().includes("locals")
        ? existing.reason
        : `⭐ Recommended by locals for “${sg.vibe}”`;

    byId.set(shop.id, {
      shop,
      score: Math.max(existing?.score ?? 0, score),
      reason,
      rank: existing?.rank ?? 0,
    });
  }

  const all = [...byId.values()].sort((a, b) => b.score - a.score);
  const priority: HydratedResult[] = [];
  const rest: HydratedResult[] = [];

  for (const r of all) {
    const match = matchingSuggestionForShop(r.shop, suggestions);
    if (match && vibeOverlapScore(vibes, match.vibe) >= 0.08) {
      priority.push(r);
    } else {
      rest.push(r);
    }
  }

  return [...priority, ...rest].map((r, rank) => ({ ...r, rank }));
}

async function getCachedSearch(key: string): Promise<HydratedResult[] | null> {
  // L1: memory
  const mem = searchMem.get(key);
  if (mem) return mem;

  // L2: Supabase (survives cold starts)
  const { data } = await supabase
    .from("search_cache")
    .select("data, created_at")
    .eq("cache_key", key)
    .single();

  if (!data) return null;
  if (Date.now() - new Date(data.created_at).getTime() > SEARCH_TTL_MS) return null;

  const results = data.data as HydratedResult[];
  searchMem.set(key, results, SEARCH_TTL_MS); // warm L1 for subsequent requests
  return results;
}

async function setCachedSearch(key: string, results: HydratedResult[]): Promise<void> {
  searchMem.set(key, results, SEARCH_TTL_MS);
  await supabase.from("search_cache").upsert({
    cache_key: key,
    data: results,
    created_at: new Date().toISOString(),
  });
}

async function computeSearch(
  vibes: string,
  cacheKey: string,
  suggestions: UserSuggestion[],
  persistentDislikes: Set<string>
): Promise<HydratedResult[]> {
  let shops = await fetchMontrealCoffeeShops(120);
  if (shops.length === 0) throw new Error("No cafés available right now.");

  // Remove globally down-voted shops from the pool so better alternatives fill the shortlist
  if (persistentDislikes.size > 0) {
    shops = shops.filter((s) => !persistentDislikes.has(s.id));
  }

  // Inject community-suggested shops not already in the Places pool
  const poolIds = new Set(shops.map((s) => s.id));
  for (const sg of suggestions) {
    if (sg.placeId && poolIds.has(sg.placeId)) continue;
    if (sg.placeId && sg.lat != null && sg.lon != null) {
      shops.push({
        id: sg.placeId,
        name: sg.shopName,
        lat: sg.lat,
        lon: sg.lon,
        address: sg.formattedAddress,
        summary: `community pick · ${sg.shopName} · vibes: ${sg.vibe} · cozy spanish european local favourite`,
      });
      poolIds.add(sg.placeId);
      continue;
    }
    // Match by name in pool if Places id missing but shop already indexed
    const inPool = shops.find((s) => isSuggestedShop(s, [sg]));
    if (inPool) {
      inPool.summary = `${inPool.summary} · community pick · vibes: ${sg.vibe}`;
    }
  }

  const { results } = await recommendShopsForVibes(vibes, shops, {
    topN: MAX_RESULTS,
    shortlist: 40,
    suggestions,
  });

  let hydrated: HydratedResult[] = results.map((r, rank) => ({
    shop: shops[r.index],
    score: r.score,
    reason: r.reason,
    rank,
  }));

  hydrated = mergeCommunityResults(hydrated, vibes, suggestions, shops);

  await setCachedSearch(cacheKey, hydrated);
  return hydrated;
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
      ? Math.max(1, Math.min(Math.floor((body as { topN: number }).topN), MAX_RESULTS))
      : 3;

  // Session dislikes sent from the client
  const sessionDisliked = new Set<string>(
    Array.isArray((body as { dislikedIds?: unknown }).dislikedIds)
      ? ((body as { dislikedIds: unknown[] }).dislikedIds).filter((x): x is string => typeof x === "string")
      : []
  );

  try {
    const [suggestions, voteWeights] = await Promise.all([
      loadSuggestions(),
      loadVoteWeights(),
    ]);

    // Shops with a net score ≤ -2 are persistently disliked across sessions
    const persistentDislikes = new Set<string>(
      [...voteWeights.entries()].filter(([, n]) => n <= -2).map(([id]) => id)
    );

    // All dislikes — used to filter results on the way out (works on cache hits too)
    const allDisliked = new Set([...sessionDisliked, ...persistentDislikes]);

    const cacheKey = `v3:${vibes.toLowerCase()}:${suggestionsCacheSignature(suggestions)}`;

    let shopsForMerge = await fetchMontrealCoffeeShops(120);
    if (persistentDislikes.size > 0) {
      shopsForMerge = shopsForMerge.filter((s) => !persistentDislikes.has(s.id));
    }
    const poolIds = new Set(shopsForMerge.map((s) => s.id));
    for (const sg of suggestions) {
      if (sg.placeId && !poolIds.has(sg.placeId) && sg.lat != null && sg.lon != null) {
        shopsForMerge.push({
          id: sg.placeId,
          name: sg.shopName,
          lat: sg.lat,
          lon: sg.lon,
          address: sg.formattedAddress,
          summary: `community pick · ${sg.vibe}`,
        });
        poolIds.add(sg.placeId);
      }
    }

    const cached = await getCachedSearch(cacheKey);
    if (cached) {
      const merged = mergeCommunityResults(cached, vibes, suggestions, shopsForMerge);
      const filtered = merged.filter((r) => !allDisliked.has(r.shop.id));
      return NextResponse.json({ results: filtered.slice(0, topN), fromCache: true });
    }

    // Dedup: if another request is already computing this query, await that promise
    let promise = inFlight.get(cacheKey);
    if (!promise) {
      promise = computeSearch(vibes, cacheKey, suggestions, persistentDislikes).finally(() => {
        inFlight.delete(cacheKey);
      });
      inFlight.set(cacheKey, promise);
    }

    const hydrated = await promise;
    const merged = mergeCommunityResults(hydrated, vibes, suggestions, shopsForMerge);
    const filtered = merged.filter((r) => !allDisliked.has(r.shop.id));
    return NextResponse.json({ results: filtered.slice(0, topN) });
  } catch (e: unknown) {
    const message =
      e instanceof Error ? e.message : "Something went wrong matching vibes.";
    console.error("[api/search]", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
