export async function fetchPlaces() {
  const res = await fetch("/api/places");
  return res.json();
}