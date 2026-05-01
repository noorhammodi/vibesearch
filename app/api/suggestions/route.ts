import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const SUGGESTIONS_FILE = path.join(process.cwd(), "suggestions.json");

function getSuggestions() {
  try {
    if (fs.existsSync(SUGGESTIONS_FILE)) {
      const data = fs.readFileSync(SUGGESTIONS_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Error reading suggestions:", error);
  }
  return [];
}

function saveSuggestions(suggestions: any[]) {
  try {
    fs.writeFileSync(SUGGESTIONS_FILE, JSON.stringify(suggestions, null, 2));
    return true;
  } catch (error) {
    console.error("Error saving suggestions:", error);
    return false;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, address, vibe } = body;

    if (!name || !address || !vibe) {
      return NextResponse.json(
        { error: "Missing required fields: name, address, vibe" },
        { status: 400 }
      );
    }

    const suggestions = getSuggestions();
    suggestions.push({
      id: Date.now().toString(),
      name: name.trim(),
      address: address.trim(),
      vibe: vibe.trim(),
      timestamp: new Date().toISOString(),
    });

    if (saveSuggestions(suggestions)) {
      return NextResponse.json(
        { success: true, message: "Suggestion saved successfully" },
        { status: 201 }
      );
    } else {
      return NextResponse.json(
        { error: "Failed to save suggestion" },
        { status: 500 }
      );
    }
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to process suggestion";
    console.error("[api/suggestions]", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const suggestions = getSuggestions();
    return NextResponse.json({ suggestions }, { status: 200 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch suggestions";
    console.error("[api/suggestions]", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
