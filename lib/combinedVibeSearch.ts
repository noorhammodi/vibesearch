import { callStructuredLLM } from "./llm";

export type PlaceRow = {
  name: string;
  type: string;
  lat?: number;
  lon?: number;
};

type VibeSearchPayload = {
  refinedQuery: string;
  vibes: string[];
  scores: number[];
};

const VIBE_SEARCH_JSON_SCHEMA = {
  type: "object",
  properties: {
    refinedQuery: {
      type: "string",
      description: "Single short aesthetic phrase derived from the user message.",
    },
    vibes: {
      type: "array",
      items: { type: "string" },
      description:
        "Exactly one string per input place, in the same order: comma-separated vibe keywords (about 5 each).",
    },
    scores: {
      type: "array",
      items: { type: "number" },
      description:
        "Exactly one integer per input place (same order as vibes), 1–10, rating how well the place matches the user's vibe.",
    },
  },
  required: ["refinedQuery", "vibes", "scores"],
  additionalProperties: false,
} as const;

function buildPrompt(userInput: string, places: PlaceRow[]): string {
  const lines = places.map(
    (p, i) =>
      `${i}. name=${JSON.stringify(p.name)} type=${JSON.stringify(p.type ?? "unknown")}`
  );

  return `You help a "vibe search" app for Montreal venues.

Task:
1) Rewrite the user's message into ONE short aesthetic search phrase (refinedQuery).
2) For each place, output ~5 comma-separated vibe keywords (vibes[i] matches place i).
3) For each place, output a score 1–10 for how well it matches the user's vibe (scores[i] matches place i).

User message:
${JSON.stringify(userInput)}

Places (vibes and scores arrays must each have exactly ${places.length} entries):
${lines.join("\n")}

Respond only with JSON matching the schema.`;
}

function normalizePayload(
  raw: unknown,
  places: PlaceRow[],
  fallbackQuery: string
): { refinedQuery: string; enriched: Array<PlaceRow & { vibe: string; score: number }> } {
  if (!raw || typeof raw !== "object") {
    throw new Error("LLM returned invalid JSON (not an object)");
  }

  const obj = raw as Record<string, unknown>;

  const refinedQuery =
    typeof obj.refinedQuery === "string" && obj.refinedQuery.trim().length > 0
      ? obj.refinedQuery.trim()
      : fallbackQuery.trim() || "cozy local";

  let vibes: string[] = Array.isArray(obj.vibes)
    ? obj.vibes.map((v) => (typeof v === "string" ? v : String(v ?? "")))
    : [];

  let scores: number[] = Array.isArray(obj.scores)
    ? obj.scores.map((s) => (typeof s === "number" ? s : parseFloat(s as string) || 5))
    : [];

  while (vibes.length < places.length) vibes.push("");
  while (scores.length < places.length) scores.push(5);
  vibes = vibes.slice(0, places.length);
  scores = scores.slice(0, places.length);

  const enriched = places.map((p, i) => ({
    ...p,
    vibe: vibes[i],
    score: scores[i],
  }));

  return { refinedQuery, enriched };
}

export async function combinedVibeSearch(
  userInput: string,
  places: PlaceRow[]
): Promise<{ refinedQuery: string; enriched: Array<PlaceRow & { vibe: string; score: number }> }> {
  if (places.length === 0) {
    return { refinedQuery: userInput.trim() || "cozy local", enriched: [] };
  }

  const raw = await callStructuredLLM<VibeSearchPayload>(
    buildPrompt(userInput, places),
    VIBE_SEARCH_JSON_SCHEMA as unknown as Record<string, unknown>
  );

  return normalizePayload(raw, places, userInput);
}