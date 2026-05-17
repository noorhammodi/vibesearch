import { GoogleGenAI } from "@google/genai";
import type { MontrealCoffeeShop } from "./coffeeShops";

export type RankedPick = {
  index: number;
  score: number;
  reason: string;
};

export type UserSuggestion = {
  id: string;
  shopName: string;
  submitterName: string;
  vibe: string;
  timestamp: string;
  placeId?: string;
  formattedAddress?: string;
  lat?: number;
  lon?: number;
};

const RERANK_SCHEMA = {
  type: "object",
  properties: {
    rankedIndices: {
      type: "array",
      items: { type: "integer" },
      description:
        "0-based indices of the best cafés from the numbered list, in best-to-worst order. Include 7–10 items.",
    },
    reasons: {
      type: "array",
      items: { type: "string" },
      description:
        "One vivid sentence per ranked café (≤15 words), same length and order as rankedIndices. Be specific about WHY this café fits.",
    },
  },
  required: ["rankedIndices", "reasons"],
  additionalProperties: false,
} as const;

const STOPWORDS = new Set([
  "a", "an", "and", "or", "the", "in", "on", "at", "for", "to", "with",
  "coffee", "shop", "cafe", "café", "montreal",
]);

const GENERIC_CAFE_TERMS = new Set(["coffee", "shop", "cafe", "café"]);

// Each token appears in exactly one group
const SYNONYM_GROUPS: string[][] = [
  // Energy / noise level
  ["quiet", "calm", "peaceful", "relaxed", "tranquil", "serene", "chill", "low-key", "mellow"],
  ["lively", "busy", "vibrant", "energetic", "bustling", "social", "animated"],
  // Comfort / warmth
  ["cozy", "warm", "comfy", "snug", "welcoming", "homey", "inviting", "cosy"],
  // Lighting / space
  ["bright", "sunny", "airy", "light", "luminous", "spacious", "open", "cheerful"],
  ["dark", "moody", "dim", "atmospheric", "shadowy"],
  // Work / study
  ["study", "work", "laptop", "productive", "focus", "concentrate", "workspace", "focused"],
  ["wifi", "internet", "connected", "work-friendly", "remote"],
  // Outdoor
  ["outdoor", "terrace", "patio", "outside", "garden", "alfresco", "rooftop"],
  // Style / aesthetic
  ["hipster", "indie", "alternative", "cool", "edgy", "underground"],
  ["artsy", "eclectic", "creative", "bohemian", "gallery"],
  ["minimalist", "modern", "sleek", "nordic", "clean", "scandinavian"],
  ["vintage", "retro", "classic", "nostalgic", "old-school", "heritage", "antique"],
  ["rustic", "industrial", "brick", "exposed", "warehouse", "loft", "raw"],
  ["trendy", "fashionable", "instagram", "aesthetic", "chic", "stylish"],
  // Coffee quality
  ["specialty", "craft", "artisan", "third-wave", "pour-over", "single-origin", "filter"],
  ["espresso", "cortado", "flat-white", "cappuccino", "latte"],
  ["matcha", "tea", "herbal", "chai"],
  // Food
  ["brunch", "breakfast", "brunch-spot", "morning"],
  ["pastry", "baked", "croissant", "bakery", "cake", "viennoiserie"],
  ["vegan", "plant-based", "vegetarian", "healthy"],
  // Occasion
  ["date", "romantic", "intimate", "couple", "candles"],
  ["group", "meeting", "gathering", "friends", "social"],
  ["solo", "alone", "reading", "journaling", "thinking"],
  // Natural elements
  ["plants", "green", "botanical", "nature", "natural", "leafy"],
  // Size
  ["small", "tiny", "pocket", "hole-in-the-wall", "neighbourhood", "local", "hidden", "gem"],
  ["large", "big", "spacious", "roomy"],
  // Regional / cultural café vibes
  ["spanish", "spain", "españa", "espana", "iberian", "iberico", "ibericos", "tapas", "basque", "catalan"],
  ["italian", "italy", "espresso-bar", "roman", "milano"],
  ["french", "france", "parisian", "bistro"],
  ["latin", "latino", "hispanic", "mexican", "portuguese", "mediterranean"],
  ["european", "old-world", "continental"],
];

const SYNONYM_INDEX = new Map<string, Set<string>>();
for (const group of SYNONYM_GROUPS) {
  const set = new Set(group);
  for (const token of group) {
    SYNONYM_INDEX.set(token, set);
  }
}

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/g)
    .map((t) => t.trim())
    .filter((t) => Boolean(t) && !STOPWORDS.has(t));
}

function hasSynonymMatch(needle: string, haystack: Set<string>): boolean {
  const group = SYNONYM_INDEX.get(needle);
  if (!group) return false;
  for (const candidate of group) {
    if (haystack.has(candidate)) return true;
  }
  return false;
}

function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenMatchScore(needles: string[], haystack: Set<string>): number {
  if (needles.length === 0) return 0;
  let matched = 0;
  for (const token of needles) {
    if (haystack.has(token)) {
      matched += 1;
      continue;
    }
    if (hasSynonymMatch(token, haystack)) {
      matched += 0.9;
      continue;
    }
    if ([...haystack].some((x) => x.startsWith(token) || token.startsWith(x) || x.includes(token) || token.includes(x))) {
      matched += 0.65;
    }
  }
  return matched / needles.length;
}

/** How well search vibes align with a community-submitted vibe label (0–1). */
export function vibeOverlapScore(searchVibes: string, suggestionVibe: string): number {
  const searchTokens = tokenize(searchVibes);
  const suggestionTokens = tokenize(suggestionVibe);
  if (searchTokens.length === 0 || suggestionTokens.length === 0) return 0;

  const suggestionSet = new Set(suggestionTokens);
  const searchSet = new Set(searchTokens);
  const forward = tokenMatchScore(searchTokens, suggestionSet);
  const backward = tokenMatchScore(suggestionTokens, searchSet);
  return Math.min(1, Math.max(forward, backward));
}

function shopTokensForScoring(
  shop: MontrealCoffeeShop,
  suggestions?: UserSuggestion[]
): Set<string> {
  const tokens = new Set(tokenize(`${shop.name} ${shop.summary}`));

  if (!suggestions?.length) return tokens;

  for (const suggestion of suggestions) {
    if (!isSuggestedShop(shop, [suggestion])) continue;
    for (const t of tokenize(suggestion.vibe)) tokens.add(t);
    for (const t of tokenize(suggestion.shopName)) tokens.add(t);
  }

  return tokens;
}

function keywordScore(
  vibes: string,
  shop: MontrealCoffeeShop,
  suggestions?: UserSuggestion[]
): number {
  const titleTokens = new Set(tokenize(shop.name));
  const tokens = shopTokensForScoring(shop, suggestions);
  const vibeTokens = tokenize(vibes);
  if (vibeTokens.length === 0) return 0;

  let score = 0;
  let matched = 0;
  for (const t of vibeTokens) {
    if (!GENERIC_CAFE_TERMS.has(t) && titleTokens.has(t)) {
      score += 1.25;
      matched += 1;
      continue;
    }
    if (!GENERIC_CAFE_TERMS.has(t) && hasSynonymMatch(t, titleTokens)) {
      score += 0.9;
      matched += 1;
      continue;
    }
    if (tokens.has(t)) {
      score += 1.0;
      matched += 1;
      continue;
    }
    if (hasSynonymMatch(t, tokens)) {
      score += 0.75;
      matched += 1;
      continue;
    }
    // Prefix/substring fuzzy match
    if ([...tokens].some((x) => x.startsWith(t) || t.startsWith(x))) {
      score += 0.35;
      continue;
    }
  }

  const coverage = matched / vibeTokens.length;
  const normalized = score / Math.max(2.5, vibeTokens.length);
  let baseScore = Math.max(0, Math.min(1, normalized * 0.7 + coverage * 0.3));

  if (suggestions && suggestions.length > 0) {
    const match = matchingSuggestionForShop(shop, suggestions);
    if (match) {
      const overlap = vibeOverlapScore(vibes, match.vibe);
      const boost = calculateSuggestionBoost(vibes, suggestions, shop);
      baseScore = Math.min(1, baseScore + boost);
      // Community picks with vibe overlap should rank near the top
      if (overlap >= 0.35) {
        baseScore = Math.max(baseScore, 0.82 + overlap * 0.18);
      } else if (overlap >= 0.15) {
        baseScore = Math.max(baseScore, 0.55 + overlap * 0.35);
      }
    }
  }

  return baseScore;
}

function normalizePlaceId(id: string | undefined): string | undefined {
  if (!id) return undefined;
  return id.replace(/^places\//, "").trim() || undefined;
}

export function isSuggestedShop(shop: MontrealCoffeeShop, suggestions: UserSuggestion[]): boolean {
  const shopNorm = normalizeName(shop.name);
  const shopPlaceId = normalizePlaceId(shop.id);
  return suggestions.some((s) => {
    const sugPlaceId = normalizePlaceId(s.placeId);
    if (sugPlaceId && shopPlaceId && sugPlaceId === shopPlaceId) return true;
    const sugNorm = normalizeName(s.shopName);
    if (!shopNorm || !sugNorm) return false;
    if (shopNorm.includes(sugNorm) || sugNorm.includes(shopNorm)) return true;
    const sugWords = sugNorm.split(" ").filter((w) => w.length > 3);
    if (sugWords.length > 0 && sugWords.every((w) => shopNorm.includes(w))) return true;
    return levenshteinDistance(sugNorm, shopNorm) <= Math.max(3, Math.floor(sugNorm.length * 0.2));
  });
}

export function matchingSuggestionForShop(
  shop: MontrealCoffeeShop,
  suggestions: UserSuggestion[]
): UserSuggestion | undefined {
  return suggestions.find((s) => isSuggestedShop(shop, [s]));
}

function buildRerankPrompt(
  vibes: string,
  shops: MontrealCoffeeShop[],
  suggestions?: UserSuggestion[]
): string {
  const lines = shops.map((s, i) => {
    const tag = suggestions && isSuggestedShop(s, suggestions) ? " ⭐[local pick]" : "";
    return `${i}. ${s.name}${tag} — ${s.summary}`;
  });

  const communityNote =
    suggestions && suggestions.some((sg) => shops.some((s) => isSuggestedShop(s, [sg])))
      ? "\nCafés marked ⭐[local pick] were personally recommended by Montréal locals — strongly favour them when they fit the vibe.\n"
      : "";

  return `You are a Montréal café expert helping someone find the perfect spot.

The person is looking for: ${JSON.stringify(vibes)}

Interpret their request holistically — consider mood, energy level, aesthetic, setting, and occasion. For example:
- "cozy rainy study" → warm, quiet place ideal for focused laptop work on a grey day
- "date spot rooftop" → romantic atmosphere, ideally with outdoor or elevated seating
- "hipster specialty coffee" → independent café with third-wave coffee culture and a cool vibe
- "brunch natural light" → bright airy space good for morning meals

Use the café NAME as your primary signal for atmosphere (names often reveal personality). Use the DESCRIPTION for supporting signals like rating, price, and format.
${communityNote}
Cafés (use index 0–${shops.length - 1} only — never refer to cafés outside this list):
${lines.join("\n")}

Return 7–10 of the best matches ranked from best to worst.
For each, write one vivid sentence (≤ 15 words) explaining WHY this specific café fits the vibe. Reference what makes it right — don't write generic phrases like "fits your vibe" or "matches your request".`;
}

function clampAndDedupe(indices: number[], maxExclusive: number): number[] {
  const out: number[] = [];
  const seen = new Set<number>();
  for (const raw of indices) {
    const idx = Math.max(0, Math.min(Math.floor(raw), maxExclusive - 1));
    if (!seen.has(idx)) {
      seen.add(idx);
      out.push(idx);
    }
  }
  return out;
}

function calculateSuggestionBoost(
  searchVibes: string,
  suggestions: UserSuggestion[],
  shop: MontrealCoffeeShop
): number {
  if (suggestions.length === 0) return 0;

  const match = matchingSuggestionForShop(shop, suggestions);
  if (!match) return 0;

  const overlap = vibeOverlapScore(searchVibes, match.vibe);
  // Real community picks: strong base boost + large bonus when vibes align
  const boost = 0.28 + overlap * 0.62;
  return overlap >= 0.2 ? boost : boost * 0.35;
}

function levenshteinDistance(s1: string, s2: string): number {
  const len1 = s1.length;
  const len2 = s2.length;
  const d: number[][] = Array(len1 + 1)
    .fill(null)
    .map(() => Array(len2 + 1).fill(0));

  for (let i = 0; i <= len1; i++) d[i][0] = i;
  for (let j = 0; j <= len2; j++) d[0][j] = j;

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
    }
  }

  return d[len1][len2];
}

export async function recommendShopsForVibes(
  vibes: string,
  shops: MontrealCoffeeShop[],
  opts?: { topN?: number; shortlist?: number; suggestions?: UserSuggestion[] }
): Promise<{ results: RankedPick[] }> {
  const key = process.env.GOOGLE_API_KEY;
  if (!key?.trim()) throw new Error("Missing GOOGLE_API_KEY");
  if (shops.length === 0) throw new Error("No cafés to choose from");

  const topN = Math.max(1, Math.min(opts?.topN ?? 7, 15));
  const shortlist = Math.max(topN, Math.min(opts?.shortlist ?? 40, shops.length));

  // Stage 1: deterministic keyword ranking
  let scored = shops
    .map((s, index) => ({ index, score: keywordScore(vibes, s, opts?.suggestions) }))
    .sort((a, b) => b.score - a.score);

  // Pin community-recommended shops with matching vibes into the shortlist
  if (opts?.suggestions?.length) {
    const pinned = new Map<number, number>();
    for (const suggestion of opts.suggestions) {
      const idx = shops.findIndex((s) => isSuggestedShop(s, [suggestion]));
      if (idx < 0) continue;
      const overlap = vibeOverlapScore(vibes, suggestion.vibe);
      if (overlap < 0.1) continue;
      const pinnedScore = 0.88 + overlap * 0.12;
      pinned.set(idx, Math.max(pinned.get(idx) ?? 0, pinnedScore));
    }
    if (pinned.size > 0) {
      const scoredMap = new Map(scored.map((s) => [s.index, s]));
      for (const [idx, pinScore] of pinned) {
        const existing = scoredMap.get(idx);
        if (existing) {
          existing.score = Math.max(existing.score, pinScore);
        } else {
          scoredMap.set(idx, { index: idx, score: pinScore });
        }
      }
      scored = [...scoredMap.values()].sort((a, b) => b.score - a.score);
    }
  }

  scored = scored.slice(0, shortlist);
  const shortlistShops = scored.map((x) => shops[x.index]);

  const ai = new GoogleGenAI({ apiKey: key });

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: buildRerankPrompt(vibes, shortlistShops, opts?.suggestions),
    config: {
      responseMimeType: "application/json",
      responseJsonSchema: RERANK_SCHEMA as unknown as Record<string, unknown>,
      temperature: 0.3,
    },
  });

  const text = response.text ?? "";
  let parsed: { rankedIndices?: unknown; reasons?: unknown };
  try {
    parsed = JSON.parse(text) as { rankedIndices?: unknown; reasons?: unknown };
  } catch {
    throw new Error("Model returned invalid JSON");
  }

  const rawIdx = Array.isArray(parsed.rankedIndices) ? parsed.rankedIndices : [];
  const rawReasons = Array.isArray(parsed.reasons) ? parsed.reasons : [];

  const idx = clampAndDedupe(
    rawIdx
      .map((x) => (typeof x === "number" ? x : parseInt(String(x ?? ""), 10)))
      .filter((n) => Number.isFinite(n)),
    shortlistShops.length
  ).slice(0, topN);

  const reasons = idx.map((_, i) => {
    const r = rawReasons[i];
    return typeof r === "string" && r.trim() ? r.trim() : "A strong match for your vibe.";
  });

  // Blend keyword score (signal quality) with Gemini rank position (semantic relevance)
  // using log-decay on rank so position-2 isn't heavily penalised vs position-1
  const results: RankedPick[] = idx.map((shortIdx, i) => {
    const originalIndex = scored[shortIdx]?.index ?? 0;
    const kwScore = scored[shortIdx]?.score ?? 0;
    const rankSignal = idx.length > 1 ? 1 - Math.log(i + 1) / Math.log(idx.length + 1) : 1;
    const blended = Math.max(0, Math.min(1, kwScore * 0.6 + rankSignal * 0.4));
    return { index: originalIndex, score: blended, reason: reasons[i] };
  });

  return { results };
}
