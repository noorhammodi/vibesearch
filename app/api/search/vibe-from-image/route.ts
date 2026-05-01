import { NextResponse } from "next/server";
import { fetchMontrealCoffeeShops } from "@/lib/coffeeShops";
import { recommendShopsForVibes } from "@/lib/vibePick";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("image") as File | null;
    const topN = Number(formData.get("topN")) || 3;

    if (!file) {
      return NextResponse.json(
        { error: "No image file provided" },
        { status: 400 }
      );
    }

    // Convert file to base64
    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const mimeType = file.type || "image/jpeg";

    // Use REST API directly to analyze the vibe in the image
    const vibeAnalysisPrompt = `Analyze this image and describe the vibe/mood/aesthetic in 3-5 descriptive words.
    
Consider elements like:
- Color palette and lighting
- Overall mood (cozy, energetic, minimalist, vibrant, etc.)
- Style (modern, vintage, natural, industrial, etc.)
- Atmosphere (quiet, busy, intimate, open, etc.)

Return ONLY a comma-separated list of vibe descriptors. Example: "cozy, rainy afternoon, vintage, warm lighting"
Do not include explanations or extra text.`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${process.env.GOOGLE_API_KEY}`;

    const geminiResponse = await fetch(geminiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: vibeAnalysisPrompt },
              {
                inlineData: {
                  mimeType: mimeType,
                  data: base64,
                },
              },
            ],
          },
        ],
      }),
    });

    const geminiData = await geminiResponse.json();

    if (!geminiResponse.ok) {
      const errorMsg =
        geminiData?.error?.message || "Failed to analyze image";
      return NextResponse.json({ error: errorMsg }, { status: geminiResponse.status });
    }

    const vibesText =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!vibesText) {
      return NextResponse.json(
        { error: "Could not analyze image. Please try another image." },
        { status: 400 }
      );
    }

    // Use the extracted vibes to search for cafes
    const shops = await fetchMontrealCoffeeShops(120);
    if (shops.length === 0) {
      return NextResponse.json(
        { error: "No cafés available right now. Try again in a minute." },
        { status: 503 }
      );
    }

    const { results } = await recommendShopsForVibes(vibesText, shops, {
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
      detectedVibes: vibesText,
    });
  } catch (e: unknown) {
    const message =
      e instanceof Error ? e.message : "Something went wrong analyzing the image.";
    console.error("[api/search/vibe-from-image]", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
