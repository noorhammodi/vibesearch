import { callLLM } from "./llm";

export async function refineQuery(input: string) {
  const prompt = `
You are a system that rewrites user input into ONE short aesthetic search query.

Rules:
- Output ONLY one phrase
- No explanation
- No list

Input: "${input}"
Output:
`;

  return await callLLM(prompt);
}