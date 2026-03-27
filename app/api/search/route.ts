import { NextRequest, NextResponse } from "next/server";
import { extractVibe } from "./claude";
import type { SearchInput } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validate the incoming shape before touching any external API
    if (!body.location || typeof body.location !== "string") {
      return NextResponse.json({ error: "location is required" }, { status: 400 });
    }

    let input: SearchInput;

    if (body.type === "text") {
      if (!body.vibe || typeof body.vibe !== "string") {
        return NextResponse.json({ error: "vibe text is required" }, { status: 400 });
      }
      input = { type: "text", vibe: body.vibe, location: body.location };
    } else if (body.type === "image") {
      if (!body.base64 || !body.mimeType) {
        return NextResponse.json({ error: "base64 and mimeType are required" }, { status: 400 });
      }
      input = {
        type: "image",
        base64: body.base64,
        mimeType: body.mimeType,
        location: body.location,
      };
    } else {
      return NextResponse.json({ error: "type must be 'text' or 'image'" }, { status: 400 });
    }

    const vibe = await extractVibe(input);

    // Day 2: return vibe extraction only. Places + ranking added Day 3.
    return NextResponse.json({ vibe, venues: [] });
  } catch (err) {
    console.error("[/api/search]", err);
    return NextResponse.json(
      { error: "Something went wrong. Check server logs." },
      { status: 500 }
    );
  }
}
