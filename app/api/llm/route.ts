import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash", // ✅ correct
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({ text });

  } catch (error: any) {
    console.error("🔥 LLM ERROR:", error);

    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}