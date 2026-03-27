import Anthropic from "@anthropic-ai/sdk";
import type { VibeExtraction, SearchInput } from "@/types";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// This prompt is the heart of the product. It must return valid JSON — no preamble,
// no markdown fences, no commentary. Claude is reliable about this when instructed clearly.
const EXTRACTION_SYSTEM = `You are a vibe and aesthetic analyst. Your job is to extract the mood and aesthetic
from either a text description or an image.

Always respond with ONLY valid JSON matching this exact shape:
{
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "mood": "one evocative sentence describing the overall feeling",
  "placeType": "coffee_shop" | "coworking_space"
}

Rules:
- keywords: exactly 5, lowercase, single words or hyphenated compounds (e.g. "warm-lighting")
- mood: max 15 words, evocative and specific, not generic ("cozy" alone is not enough)
- placeType: infer from context — workspaces/productivity/focus → coworking_space, everything else → coffee_shop
- Return ONLY the JSON object. No explanation, no markdown.`;

export async function extractVibe(input: SearchInput): Promise<VibeExtraction> {
  const messageContent: Anthropic.MessageParam["content"] =
    input.type === "text"
      ? `Analyze this vibe description: "${input.vibe}"`
      : [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: input.mimeType as
                | "image/jpeg"
                | "image/png"
                | "image/webp",
              data: input.base64,
            },
          },
          {
            type: "text",
            text: "Analyze the aesthetic and vibe of this image.",
          },
        ];

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 256,
    system: EXTRACTION_SYSTEM,
    messages: [{ role: "user", content: messageContent }],
  });

  const raw = response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");

  // Strip any accidental markdown fences Claude might add
  const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

  const parsed = JSON.parse(cleaned) as VibeExtraction;

  // Validate shape — fail loudly rather than silently return garbage
  if (
    !Array.isArray(parsed.keywords) ||
    typeof parsed.mood !== "string" ||
    !["coffee_shop", "coworking_space"].includes(parsed.placeType)
  ) {
    throw new Error(`Unexpected Claude response shape: ${cleaned}`);
  }

  return parsed;
}
