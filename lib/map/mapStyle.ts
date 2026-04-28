export const MONTREAL_MAP_VIEW = {
  center: [-73.575, 45.505] as [number, number],
  zoom: 11.35,
  minZoom: 10.4,
  maxZoom: 16,
};

// Free, no-token tiles.
export const TILE_URL = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
export const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

export const ZONE_FILL_OPACITY = 0.42;
export const ZONE_STROKE_COLOR = "#ffffff";
export const ZONE_STROKE_WIDTH = 1.5;
