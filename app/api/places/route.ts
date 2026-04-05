import { NextResponse } from "next/server";

export async function GET() {
  const query = `
[out:json][timeout:30];
area["name"="Montréal"]["boundary"="administrative"]->.searchArea;
(
  node["amenity"="cafe"](area.searchArea);
  node["amenity"="coworking_space"](area.searchArea);
);
out 20;
  `;

  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "data=" + encodeURIComponent(query.trim()),
  });

  if (!res.ok) {
    return NextResponse.json({ error: `Overpass error: ${res.status}` }, { status: 502 });
  }

  const text = await res.text();

  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    console.error("Overpass non-JSON response:", text.slice(0, 300));
    return NextResponse.json({ error: "Overpass returned non-JSON" }, { status: 502 });
  }

  const places = data.elements.map((el: any) => ({
    name: el.tags?.name || "Unknown",
    type: el.tags?.amenity,
    lat: el.lat,
    lon: el.lon,
  }));

  return NextResponse.json(places);
}