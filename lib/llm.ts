export async function callLLM(prompt: string): Promise<string> {
  const res = await fetch("/api/llm", {
    method: "POST",
    body: JSON.stringify({ prompt }),
  });

  const data = await res.json();
  return data.text;
}