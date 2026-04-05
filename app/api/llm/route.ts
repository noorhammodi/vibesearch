import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export async function POST(req: Request) {
  
  try {
    const body = await req.json();
    const { prompt, responseMimeType, responseJsonSchema } = body as {
      prompt: string;
      responseMimeType?: string;
      responseJsonSchema?: Record<string, unknown>;
    };

    const ai = new GoogleGenAI({
      apiKey: process.env.GOOGLE_API_KEY!,
    });

    const useJson =
      responseMimeType === "application/json" && responseJsonSchema != null;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: useJson
        ? {
            responseMimeType: "application/json",
            responseJsonSchema,
            temperature: 0.3,
          }
        : undefined,
    });

    const text = response.text ?? "";

    let parsed: unknown = undefined;
    if (useJson && text) {
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = undefined;
      }
    }

    return NextResponse.json({
      text,
      ...(parsed !== undefined ? { parsed } : {}),
    });

  } catch (error: any) {
    console.error("🔥 LLM ERROR:", error);

    return NextResponse.json(
      { error: error?.message || "Unknown error" },
      { status: 500 }
    );
  }
}