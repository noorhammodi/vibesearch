// All types used across API routes and UI components.
// If a shape changes, change it here. Nowhere else.

export type SearchInput =
  | { type: "text"; vibe: string; location: string }
  | { type: "image"; base64: string; mimeType: string; location: string };

export interface VibeExtraction {
  keywords: string[];
  mood: string;
  placeType: "coffee_shop" | "coworking_space";
}

export interface RawVenue {
  place_id: string;
  name: string;
  vicinity: string;
  rating?: number;
  user_ratings_total?: number;
  photos?: { photo_reference: string }[];
  geometry: { location: { lat: number; lng: number } };
}

export interface RankedVenue {
  place_id: string;
  name: string;
  vicinity: string;
  rating?: number;
  photoUrl?: string;
  vibeScore: number;
  vibeReason: string;
}

export interface SearchResponse {
  vibe: VibeExtraction;
  venues: RankedVenue[];
}