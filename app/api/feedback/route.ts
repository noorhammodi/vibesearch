import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { rating, message, name } = body;

    if (!message?.trim()) {
      return NextResponse.json({ error: "Feedback message is required." }, { status: 400 });
    }

    const { error } = await supabase.from("feedback").insert({
      id: Date.now().toString(),
      rating: rating ?? null,
      message: message.trim(),
      name: name?.trim() || null,
      timestamp: new Date().toISOString(),
    });

    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to save feedback";
    console.error("[api/feedback]", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
