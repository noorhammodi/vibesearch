import { callLLM } from "./llm";

export async function refineQuery(input: string) {
  const prompt = `
Rewrite this search query to better capture the vibe, mood, and intent:

"${input}"

Make it more descriptive but still concise.
`;

  return await callLLM(prompt);
}