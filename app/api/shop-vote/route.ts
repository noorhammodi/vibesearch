import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { shopId, shopName, vote, vibes } = body as {
    shopId?: string;
    shopName?: string;
    vote?: string;
    vibes?: string;
  };

  if (!shopId || !["up", "down"].includes(vote ?? "")) {
    return NextResponse.json({ error: "shopId and vote (up|down) are required" }, { status: 400 });
  }

  const { error } = await supabase.from("shop_votes").insert({
    shop_id: shopId,
    shop_name: shopName ?? null,
    vote,
    vibes: vibes ?? null,
    created_at: new Date().toISOString(),
  });

  if (error) {
    console.error("[shop-vote]", error.message);
    // Don't fail the UX — vote persistence is best-effort
  }

  return NextResponse.json({ ok: true });
}
