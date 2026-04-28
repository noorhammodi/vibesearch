import { GoogleGenAI } from "@google/genai";
import type { MontrealCoffeeShop } from "./coffeeShops";

export type RankedPick = {
  index: number;
  score: number;
  reason: string;
};

const RERANK_SCHEMA = {
  type: "object",
  properties: {
    rankedIndices: {
      type: "array",
      items: { type: "integer" },
      description:
        "0-based indices of the best cafés from the numbered list, in best-to-worst order. Include 5–10 items when possible.",
    },
    reasons: {
      type: "array",
      items: { type: "string" },
      description:
        "One short sentence per ranked index, same length and order as rankedIndices.",
    },
  },
  required: ["rankedIndices", "reasons"],
  additionalProperties: false,
} as const;

const STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "or",
  "the",
  "in",
  "on",
  "at",
  "for",
  "to",
  "with",
  "coffee",
  "shop",
  "cafe",
  "café",
  "montreal",
]);

const GENERIC_CAFE_TERMS = new Set(["coffee", "shop", "cafe", "café"]);

const SYNONYM_GROUPS: string[][] = [
  ["quiet", "calm", "peaceful", "chill", "relaxed"],
  ["cozy", "warm", "comfy", "snug"],
  ["study", "work", "laptop", "productive", "focus"],
  ["bright", "sunny", "airy", "light"],
  ["dark", "moody", "intimate"],
  ["social", "lively", "busy", "vibrant"],
  ["wifi", "internet", "remote"],
  ["outdoor", "terrace", "patio"],
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

function keywordScore(vibes: string, shop: MontrealCoffeeShop): number {
  const titleTokens = new Set(tokenize(shop.name));
  const tokens = new Set(tokenize(`${shop.name} ${shop.summary}`));
  const vibeTokens = tokenize(vibes);
  if (vibeTokens.length === 0) return 0;

  let score = 0;
  let matched = 0;
  for (const t of vibeTokens) {
    // Stronger signal when vibe words appear in the venue title.
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
    // small fuzzy boost for "laptop-friendly" vs "laptop"
    if ([...tokens].some((x) => x.startsWith(t) || t.startsWith(x))) {
      score += 0.35;
      continue;
    }
  }

  const coverage = matched / vibeTokens.length; // 0..1
  const normalized = score / Math.max(2.5, vibeTokens.length);

  // Blend "how many vibe terms were matched" with weighted score.
  return Math.max(0, Math.min(1, normalized * 0.7 + coverage * 0.3));
}

function buildRerankPrompt(vibes: string, shops: MontrealCoffeeShop[]): string {
  const lines = shops.map((s, i) => `${i}. ${s.name} — ${s.summary}`);

  return `You match people to real Montreal cafés from a fixed list.

User vibe keywords:
${JSON.stringify(vibes)}

Cafés (choose ONLY by index 0–${shops.length - 1}; do not invent names or addresses):
${lines.join("\n")}

Return a ranked list of the best matches for the vibe. Prefer indie/local character implied by tags when relevant.
Respond only as JSON matching the schema.`;
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

export async function recommendShopsForVibes(
  vibes: string,
  shops: MontrealCoffeeShop[],
  opts?: { topN?: number; shortlist?: number }
): Promise<{ results: RankedPick[] }> {
  const key = process.env.GOOGLE_API_KEY;
  if (!key?.trim()) {
    throw new Error("Missing GOOGLE_API_KEY");
  }

  if (shops.length === 0) {
    throw new Error("No cafés to choose from");
  }

  const topN = Math.max(1, Math.min(opts?.topN ?? 7, 15));
  const shortlist = Math.max(topN, Math.min(opts?.shortlist ?? 25, shops.length));

  // Stage 1: deterministic keyword ranking
  const scored = shops
    .map((s, index) => ({ index, score: keywordScore(vibes, s) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, shortlist);

  const shortlistShops = scored.map((x) => shops[x.index]);

  const ai = new GoogleGenAI({ apiKey: key });

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: buildRerankPrompt(vibes, shortlistShops),
    config: {
      responseMimeType: "application/json",
      responseJsonSchema: RERANK_SCHEMA as unknown as Record<string, unknown>,
      temperature: 0.35,
    },
  });

  const text = response.text ?? "";
  let parsed: { rankedIndices?: unknown; reasons?: unknown };
  try {
    parsed = JSON.parse(text) as { rankedIndices?: unknown; reasons?: unknown };
  } catch {
    throw new Error("Model returned invalid JSON");
  }

  const rawIdx =
    Array.isArray(parsed.rankedIndices) ? parsed.rankedIndices : [];
  const rawReasons = Array.isArray(parsed.reasons) ? parsed.reasons : [];

  const idx = clampAndDedupe(
    rawIdx
      .map((x) => (typeof x === "number" ? x : parseInt(String(x ?? ""), 10)))
      .filter((n) => Number.isFinite(n)),
    shortlistShops.length
  ).slice(0, topN);

  const reasons = idx.map((_, i) => {
    const r = rawReasons[i];
    return typeof r === "string" && r.trim()
      ? r.trim()
      : "Fits your vibe based on café details.";
  });

  // Map shortlist indices back to original shop list and blend
  // deterministic score + Gemini rank position for a smoother match %.
  const results: RankedPick[] = idx.map((shortIdx, i) => {
    const originalIndex = scored[shortIdx]?.index ?? 0;
    const kwScore = scored[shortIdx]?.score ?? 0;
    const rankSignal = idx.length > 1 ? 1 - i / (idx.length - 1) : 1;
    const blended = Math.max(0, Math.min(1, kwScore * 0.75 + rankSignal * 0.25));
    return { index: originalIndex, score: blended, reason: reasons[i] };
  });

  return { results };
}
