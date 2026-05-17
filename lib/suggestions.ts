import { readFile } from "fs/promises";
import path from "path";
import { supabase } from "./supabase";
import { TtlCache } from "./cache";
import type { UserSuggestion } from "./vibePick";

const SUGGESTIONS_TTL_MS = 5 * 60 * 1000;
const cache = new TtlCache<UserSuggestion[]>();

export function invalidateSuggestionsCache(): void {
  cache.delete("all");
}

export function normalizePlaceId(id: string | undefined): string | undefined {
  if (!id) return undefined;
  return id.replace(/^places\//, "").trim() || undefined;
}

function mapRow(row: {
  id: string;
  shop_name: string;
  submitter_name?: string | null;
  vibe: string;
  timestamp: string;
  place_id?: string | null;
  formatted_address?: string | null;
  lat?: number | null;
  lon?: number | null;
}): UserSuggestion {
  return {
    id: row.id,
    shopName: row.shop_name,
    submitterName: row.submitter_name ?? "",
    vibe: row.vibe,
    timestamp: row.timestamp,
    placeId: normalizePlaceId(row.place_id ?? undefined),
    formattedAddress: row.formatted_address ?? undefined,
    lat: row.lat ?? undefined,
    lon: row.lon ?? undefined,
  };
}

async function loadFileSuggestions(): Promise<UserSuggestion[]> {
  try {
    const raw = await readFile(path.join(process.cwd(), "suggestions.json"), "utf8");
    const parsed = JSON.parse(raw) as Array<{
      id: string;
      shopName: string;
      submitterName?: string;
      vibe: string;
      timestamp: string;
      placeId?: string;
      formattedAddress?: string;
      lat?: number;
      lon?: number;
    }>;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((s) => ({
      id: s.id,
      shopName: s.shopName,
      submitterName: s.submitterName ?? "",
      vibe: s.vibe,
      timestamp: s.timestamp,
      placeId: normalizePlaceId(s.placeId),
      formattedAddress: s.formattedAddress,
      lat: s.lat,
      lon: s.lon,
    }));
  } catch {
    return [];
  }
}

function mergeSuggestionLists(...lists: UserSuggestion[][]): UserSuggestion[] {
  const byId = new Map<string, UserSuggestion>();
  for (const list of lists) {
    for (const s of list) {
      const existing = byId.get(s.id);
      if (!existing) {
        byId.set(s.id, s);
        continue;
      }
      byId.set(s.id, {
        ...existing,
        ...s,
        placeId: s.placeId ?? existing.placeId,
        formattedAddress: s.formattedAddress ?? existing.formattedAddress,
        lat: s.lat ?? existing.lat,
        lon: s.lon ?? existing.lon,
      });
    }
  }
  return [...byId.values()];
}

export async function loadSuggestions(): Promise<UserSuggestion[]> {
  const hit = cache.get("all");
  if (hit) return hit;

  const fileSuggestions = await loadFileSuggestions();

  const { data, error } = await supabase
    .from("suggestions")
    .select("id, shop_name, submitter_name, vibe, timestamp, place_id, formatted_address, lat, lon");

  if (error) {
    console.error("Error loading suggestions:", error.message);
    const fallback = fileSuggestions;
    cache.set("all", fallback, SUGGESTIONS_TTL_MS);
    return fallback;
  }

  const fromDb = (data ?? []).map(mapRow);
  const suggestions = mergeSuggestionLists(fromDb, fileSuggestions);

  cache.set("all", suggestions, SUGGESTIONS_TTL_MS);
  return suggestions;
}

export function suggestionsCacheSignature(suggestions: UserSuggestion[]): string {
  if (suggestions.length === 0) return "0";
  return suggestions
    .map((s) => `${s.id}:${s.placeId ?? ""}:${s.vibe.toLowerCase().trim()}`)
    .sort()
    .join("|");
}
