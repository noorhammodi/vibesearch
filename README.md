# VibeSearch

An app that recommends Montreal drink spots from vibe keywords.

## Features

- **Text-based vibe search**: Describe your desired café vibe in keywords
- **Image-based vibe search**: Upload a photo and let Gemini 2.0 Flash analyze the vibe
- Google Places candidate retrieval (coffee, matcha, tea, juice, boba, drink spots)
- Hybrid ranking:
  - deterministic keyword/synonym scoring
  - Gemini reranking + explanation
- Top suggestions list with "Show more"
- Custom styled Montreal map (Leaflet + free tiles):
  - handcrafted neighborhood zones (MVP)
  - highlighted suggestion markers
  - card-to-map and map-to-card selection sync

## Environment

Create `.env.local` with:

```bash
GOOGLE_API_KEY=your_gemini_api_key
GOOGLE_PLACES_API_KEY=your_places_api_key
```

Notes:

- `GOOGLE_PLACES_API_KEY` is used for Places API lookups.
- `GOOGLE_API_KEY` is used for Gemini reranking.
- Map tiles use a free no-token tile source (CARTO/OSM attribution required).

## Run

```bash
npm install
npm run dev
```

## Architecture

- API:
  - `app/api/search/route.ts` – text-based vibe search
  - `app/api/search/vibe-from-image/route.ts` – image analysis with Gemini vision
- UI Components:
  - `app/page.tsx` – main page with tab switcher
  - `components/ImageUpload.tsx` – drag-and-drop image upload
  - `components/MontrealMap.tsx` – map display
- Ranking: `lib/vibePick.ts`
- Places source: `lib/coffeeShops.ts`
- Zone source abstraction: `lib/map/zoneSource.ts`

## Zone Source Migration

Current map zones are handcrafted for style control and quick iteration.
To migrate to official Montreal neighborhood boundaries later, replace the implementation in `lib/map/zoneSource.ts` while keeping `components/MontrealMap.tsx` unchanged.


