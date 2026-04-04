import { callLLM } from "./llm";

export async function enrichPlace(place: any) {
  const prompt = `
Give 5 vibe keywords for this place.

Only output comma-separated keywords.

Place: ${place.name}
Type: ${place.type}
`;

  const vibe = await callLLM(prompt);

  return {
    ...place,
    vibe,
  };
}