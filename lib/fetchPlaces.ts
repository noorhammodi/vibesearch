export async function fetchPlaces() {
  const query = `
  [out:json];
  area["name"="Montreal"]->.searchArea;

  (
    node["amenity"="cafe"](area.searchArea);
    node["amenity"="coworking_space"](area.searchArea);
  );

  out;
  `;

  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    body: query,
  });

  const data = await res.json();

  return data.elements.map((el: any) => ({
    name: el.tags?.name || "Unknown",
    type: el.tags?.amenity,
    lat: el.lat,
    lon: el.lon,
  }));
}