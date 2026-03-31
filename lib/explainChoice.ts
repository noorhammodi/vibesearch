import { callLLM } from "./llm";

export async function explainChoice(query: string, result: string) {
  const prompt = `
User vibe:
${query}

Top result:
${result}

Explain in 1 elegant sentence why this is the #1 choice.
`;

  return await callLLM(prompt);
}