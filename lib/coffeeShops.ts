/** Montreal drink spots from Google Places. Server-only. */
import { supabase } from "./supabase";

const SHOP_TTL_MS = 60 * 60 * 1000; // 1 hour (shops don't change often)

export type MontrealCoffeeShop = {
  /** Google Places placeId */
  id: string;
  name: string;
  lat: number;
  lon: number;
  address?: string;
  /** Short text for the model */
  summary: string;
};

const CHAIN_BLACKLIST = new Set([
  "starbucks",
  "tim hortons",
  "mcdonald's",
  "second cup",
  "van houtte",
  "dunkin",
  "dunkin'",
  "costa coffee",
  "pete's coffee",
  "timothy's",
]);

const PRICE_LABELS: Record<string, string> = {
  PRICE_LEVEL_FREE: "free",
  PRICE_LEVEL_INEXPENSIVE: "$",
  PRICE_LEVEL_MODERATE: "$$",
  PRICE_LEVEL_EXPENSIVE: "$$$",
  PRICE_LEVEL_VERY_EXPENSIVE: "$$$$",
};

// Maps Google Places types to readable descriptors useful for vibe matching
const TYPE_LABELS: Record<string, string> = {
  cafe: "café",
  bar: "bar",
  bakery: "bakery",
  restaurant: "restaurant",
  book_store: "bookstore",
  art_gallery: "gallery",
  juice_bar: "juice bar",
  coffee_shop: "coffee shop",
  tea_house: "tea house",
  meal_takeaway: "takeaway",
  dessert_shop: "dessert",
};

function buildSummary(p: {
  types?: string[];
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string;
  businessStatus?: string;
  servesCoffee?: boolean;
  takeout?: boolean;
  dineIn?: boolean;
}): string {
  const bits: string[] = [];

  // Quality signal — describe rating in words rather than bare numbers
  if (p.rating != null) {
    const label = p.rating >= 4.5 ? "top-rated" : p.rating >= 4.0 ? "well-rated" : null;
    const count = p.userRatingCount != null ? `${p.userRatingCount} reviews` : "";
    if (label && count) bits.push(`${label} (${count})`);
    else if (label) bits.push(label);
    else if (count) bits.push(count);
  }

  // Price
  if (p.priceLevel) {
    const label = PRICE_LABELS[p.priceLevel];
    if (label) bits.push(label);
  }

  // Venue type — most descriptive signal after the name
  const typeLabels = (p.types ?? []).map((t) => TYPE_LABELS[t]).filter(Boolean).slice(0, 2);
  if (typeLabels.length) bits.push(...typeLabels);
  else if (p.servesCoffee) bits.push("coffee");

  // Format
  if (p.dineIn && p.takeout) bits.push("dine-in + takeout");
  else if (p.dineIn) bits.push("dine-in");
  else if (p.takeout) bits.push("takeout");

  if (p.businessStatus && p.businessStatus !== "OPERATIONAL") {
    bits.push(p.businessStatus.toLowerCase().replace(/_/g, " "));
  }

  return bits.join(" · ") || "café";
}

export async function fetchMontrealCoffeeShops(
  limit = 60
): Promise<MontrealCoffeeShop[]> {
  // Check Supabase cache
  const { data: cacheRow } = await supabase
    .from("shop_cache")
    .select("data, created_at")
    .eq("cache_key", "shops")
    .single();

  if (cacheRow && Date.now() - new Date(cacheRow.created_at).getTime() < SHOP_TTL_MS) {
    return cacheRow.data as MontrealCoffeeShop[];
  }

  const key = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_API_KEY;
  if (!key?.trim()) {
    throw new Error("Missing GOOGLE_PLACES_API_KEY");
  }

  // Montreal bounding box (approx): west, south, east, north
  const montrealRect = {
    low: { latitude: 45.40, longitude: -73.99 },
    high: { latitude: 45.71, longitude: -73.47 },
  };

  const fieldMask =
    "places.id,places.displayName,places.formattedAddress,places.location,places.types,places.rating,places.userRatingCount,places.priceLevel,places.businessStatus,places.servesCoffee,places.takeout,places.dineIn";

  const queries = [
    "coffee shop in Montreal QC",
    "matcha in Montreal QC",
    "juice bar in Montreal QC",
    "tea house in Montreal QC",
    "bubble tea in Montreal QC",
    "drink spots in Montreal QC",
  ];

  const perQueryLimit = Math.min(Math.max(8, Math.ceil(limit / queries.length) + 4), 20);

  const placeBuckets = await Promise.all(
    queries.map(async (textQuery) => {
      const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": key,
          "X-Goog-FieldMask": fieldMask,
        },
        body: JSON.stringify({
          textQuery,
          maxResultCount: perQueryLimit,
          locationBias: { rectangle: montrealRect },
          languageCode: "en",
        }),
        cache: "no-store",
      });

      if (!res.ok) {
        const t = await res.text();
        throw new Error(`Places HTTP ${res.status}: ${t.slice(0, 160)}`);
      }

      const data = (await res.json()) as {
        places?: Array<{
          id?: string;
          displayName?: { text?: string };
          formattedAddress?: string;
          location?: { latitude?: number; longitude?: number };
          types?: string[];
          rating?: number;
          userRatingCount?: number;
          priceLevel?: string;
          businessStatus?: string;
          servesCoffee?: boolean;
          takeout?: boolean;
          dineIn?: boolean;
        }>;
      };

      return Array.isArray(data.places) ? data.places : [];
    })
  );

  const places = placeBuckets.flat();

  const shops: MontrealCoffeeShop[] = [];
  const seenIds = new Set<string>();
  for (const p of places) {
    const id = p.id?.trim();
    const name = p.displayName?.text?.trim();
    const lat = p.location?.latitude;
    const lon = p.location?.longitude;
    if (!id || !name || lat == null || lon == null) continue;
    if (CHAIN_BLACKLIST.has(name.toLowerCase())) continue;
    if (seenIds.has(id)) continue;
    seenIds.add(id);

    shops.push({
      id,
      name,
      lat,
      lon,
      address: p.formattedAddress,
      summary: buildSummary(p),
    });
    if (shops.length >= limit) break;
  }

  // Store in Supabase cache
  await supabase.from("shop_cache").upsert({
    cache_key: "shops",
    data: shops,
    created_at: new Date().toISOString(),
  });

  return shops;
}
