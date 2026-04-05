export async function callLLM(prompt: string): Promise<string> {
  const res = await fetch("/api/llm", {
    method: "POST",
    body: JSON.stringify({ prompt }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(typeof data.error === "string" ? data.error : "LLM request failed");
  }
  return data.text;
}

export async function callStructuredLLM<T>(
  prompt: string,
  responseJsonSchema: Record<string, unknown>
): Promise<T> {
  const res = await fetch("/api/llm", {
    method: "POST",
    body: JSON.stringify({
      prompt,
      responseMimeType: "application/json",
      responseJsonSchema,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(typeof data.error === "string" ? data.error : "LLM request failed");
  }
  if (data.parsed !== undefined && data.parsed !== null) {
    return data.parsed as T;
  }
  if (typeof data.text === "string" && data.text.length > 0) {
    return JSON.parse(data.text) as T;
  }
  throw new Error("Invalid structured LLM response");
}