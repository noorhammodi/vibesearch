import { NextResponse } from "next/server";
import { fetchMontrealCoffeeShops } from "@/lib/coffeeShops";
import { recommendShopsForVibes } from "@/lib/vibePick";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const vibes =
    typeof body === "object" &&
    body !== null &&
    "vibes" in body &&
    typeof (body as { vibes: unknown }).vibes === "string"
      ? (body as { vibes: string }).vibes.trim()
      : "";

  if (!vibes) {
    return NextResponse.json(
      { error: "Add a few vibe words (e.g. rainy laptop cozy)." },
      { status: 400 }
    );
  }

  const topN =
    typeof body === "object" &&
    body !== null &&
    "topN" in body &&
    typeof (body as { topN: unknown }).topN === "number"
      ? Math.floor((body as { topN: number }).topN)
      : 3;

  try {
    const shops = await fetchMontrealCoffeeShops(120);
    if (shops.length === 0) {
      return NextResponse.json(
        { error: "No cafés returned from the map right now. Try again in a minute." },
        { status: 503 }
      );
    }

    const { results } = await recommendShopsForVibes(vibes, shops, {
      topN: Math.max(1, Math.min(topN, 15)),
      shortlist: 30,
    });

    const hydrated = results.map((r, rank) => ({
      shop: shops[r.index],
      score: r.score,
      reason: r.reason,
      rank,
    }));

    hydrated.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.shop.id.localeCompare(b.shop.id);
    });

    return NextResponse.json({
      results: hydrated,
    });
  } catch (e: unknown) {
    const message =
      e instanceof Error ? e.message : "Something went wrong matching vibes.";
    console.error("[api/search]", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
