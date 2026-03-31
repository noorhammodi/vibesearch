import places from '../data/places';
import { getEmbedding } from './ai';
import { cosineSimilarity } from './similarity';

export async function rankResults(prompt: string) {
  const userEmbedding = await getEmbedding(prompt);

  const results = await Promise.all(
    places.map(async (place) => {
      const placeEmbedding = await getEmbedding(place.vibe);
      const score = cosineSimilarity(userEmbedding, placeEmbedding);

      return { ...place, score };
    })
  );

  return results.sort((a, b) => b.score - a.score);
}