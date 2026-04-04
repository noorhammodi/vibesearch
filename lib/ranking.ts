export function rankPlaces(query: string, places: any[]) {
  return places
    .map((place) => {
      let score = 0;

      const words = query.toLowerCase().split(" ");
      const vibe = place.vibe?.toLowerCase() || "";

      for (const word of words) {
        if (vibe.includes(word)) score++;
      }

      return { ...place, score };
    })
    .sort((a, b) => b.score - a.score);
}