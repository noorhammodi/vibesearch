"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { getZonesGeoJson } from "@/lib/map/neighborhoodZones";
import { getIslandMaskGeoJson, getIslandOutlineGeoJson } from "@/lib/map/montrealIsland";

export type MapRecommendation = {
  shop: {
    id: string;
    name: string;
    lat: number;
    lon: number;
    address?: string;
  };
  reason: string;
  score: number;
};

type Props = {
  results: MapRecommendation[];
  selectedShopId: string | null;
  onSelectShop: (shopId: string) => void;
};

// Centred over downtown / Old-Montréal, high elevated angle
const MAP_CENTER: [number, number] = [-73.568, 45.504];
const MAP_ZOOM = 12.8;
const MAP_PITCH = 58;
const MAP_BEARING = -10;

const METRO_LINES = [
  {
    id: "green", color: "#00A650",
    coords: [
      [-73.602, 45.446], [-73.588, 45.449], [-73.577, 45.452], [-73.568, 45.457],
      [-73.562, 45.461], [-73.556, 45.465], [-73.550, 45.470], [-73.563, 45.473],
      [-73.584, 45.474], [-73.587, 45.489], [-73.579, 45.494], [-73.571, 45.500],
      [-73.565, 45.504], [-73.558, 45.509], [-73.556, 45.516], [-73.547, 45.521],
      [-73.541, 45.527], [-73.534, 45.527], [-73.524, 45.534], [-73.517, 45.540],
      [-73.510, 45.546], [-73.501, 45.553], [-73.492, 45.559], [-73.484, 45.562],
      [-73.476, 45.565], [-73.468, 45.568],
    ],
  },
  {
    id: "orange", color: "#F37021",
    coords: [
      [-73.741, 45.512], [-73.729, 45.507], [-73.718, 45.503], [-73.706, 45.500],
      [-73.697, 45.498], [-73.681, 45.490], [-73.666, 45.482], [-73.653, 45.477],
      [-73.627, 45.474], [-73.601, 45.473], [-73.584, 45.474], [-73.575, 45.479],
      [-73.566, 45.488], [-73.560, 45.498], [-73.558, 45.507], [-73.556, 45.516],
      [-73.557, 45.524], [-73.565, 45.531], [-73.572, 45.539], [-73.580, 45.548],
      [-73.587, 45.556], [-73.594, 45.564], [-73.601, 45.572], [-73.609, 45.578],
      [-73.619, 45.584], [-73.628, 45.589], [-73.637, 45.598], [-73.649, 45.608],
      [-73.660, 45.618],
    ],
  },
  {
    id: "blue", color: "#0A6DB5",
    coords: [
      [-73.657, 45.488], [-73.638, 45.494], [-73.618, 45.500], [-73.604, 45.506],
      [-73.595, 45.510], [-73.585, 45.513], [-73.575, 45.519], [-73.566, 45.526],
      [-73.558, 45.533], [-73.540, 45.538], [-73.527, 45.542], [-73.519, 45.551],
    ],
  },
  {
    id: "yellow", color: "#F9D42E",
    coords: [
      [-73.556, 45.516], [-73.530, 45.508], [-73.519, 45.494],
    ],
  },
];

type MetroStation = {
  line: string;
  name: string;
  coords: [number, number];
  interchange?: boolean;
  terminus?: boolean;
};

const METRO_STATIONS: MetroStation[] = [
  // ── Green line (west → east) ───────────────────────────────────────────
  { line: "green", name: "Angrignon",          coords: [-73.602, 45.446], terminus: true },
  { line: "green", name: "Monk",               coords: [-73.588, 45.449] },
  { line: "green", name: "Verdun",             coords: [-73.577, 45.452] },
  { line: "green", name: "De l'Église",        coords: [-73.568, 45.457] },
  { line: "green", name: "LaSalle",            coords: [-73.562, 45.461] },
  { line: "green", name: "Charlevoix",         coords: [-73.556, 45.465] },
  { line: "green", name: "Lionel-Groulx",      coords: [-73.550, 45.470], interchange: true },
  { line: "green", name: "Atwater",            coords: [-73.563, 45.473] },
  { line: "green", name: "Guy-Concordia",      coords: [-73.584, 45.474] },
  { line: "green", name: "Peel",               coords: [-73.587, 45.489] },
  { line: "green", name: "McGill",             coords: [-73.579, 45.494] },
  { line: "green", name: "Place-des-Arts",     coords: [-73.571, 45.500] },
  { line: "green", name: "Saint-Laurent",      coords: [-73.565, 45.504] },
  { line: "green", name: "Berri-UQAM",         coords: [-73.558, 45.509], interchange: true },
  { line: "green", name: "Beaudry",            coords: [-73.556, 45.516] },
  { line: "green", name: "Papineau",           coords: [-73.547, 45.521] },
  { line: "green", name: "Frontenac",          coords: [-73.541, 45.527] },
  { line: "green", name: "Préfontaine",        coords: [-73.534, 45.527] },
  { line: "green", name: "Joliette",           coords: [-73.524, 45.534] },
  { line: "green", name: "Pie-IX",             coords: [-73.517, 45.540] },
  { line: "green", name: "Viau",               coords: [-73.510, 45.546] },
  { line: "green", name: "Assomption",         coords: [-73.501, 45.553] },
  { line: "green", name: "Cadillac",           coords: [-73.492, 45.559] },
  { line: "green", name: "Langelier",          coords: [-73.484, 45.562] },
  { line: "green", name: "Radisson",           coords: [-73.476, 45.565] },
  { line: "green", name: "Honoré-Beaugrand",   coords: [-73.468, 45.568], terminus: true },

  // ── Orange line (Côte-Vertu → Crémazie branch) ────────────────────────
  { line: "orange", name: "Côte-Vertu",        coords: [-73.741, 45.512], terminus: true },
  { line: "orange", name: "Du Collège",        coords: [-73.729, 45.507] },
  { line: "orange", name: "De la Savane",      coords: [-73.718, 45.503] },
  { line: "orange", name: "Namur",             coords: [-73.706, 45.500] },
  { line: "orange", name: "Plamondon",         coords: [-73.697, 45.498] },
  { line: "orange", name: "Côte-Ste-Catherine",coords: [-73.681, 45.490] },
  { line: "orange", name: "Snowdon",           coords: [-73.666, 45.482], interchange: true },
  { line: "orange", name: "Villa-Maria",       coords: [-73.653, 45.477] },
  { line: "orange", name: "Vendôme",           coords: [-73.627, 45.474] },
  { line: "orange", name: "Place-Saint-Henri", coords: [-73.601, 45.473] },
  { line: "orange", name: "Lionel-Groulx",     coords: [-73.584, 45.474], interchange: true },
  { line: "orange", name: "Georges-Vanier",    coords: [-73.575, 45.479] },
  { line: "orange", name: "Lucien-L'Allier",   coords: [-73.566, 45.488] },
  { line: "orange", name: "Bonaventure",       coords: [-73.560, 45.498] },
  { line: "orange", name: "Square-Victoria",   coords: [-73.558, 45.507] },
  { line: "orange", name: "Place-d'Armes",     coords: [-73.556, 45.516] },
  { line: "orange", name: "Champ-de-Mars",     coords: [-73.557, 45.524] },
  { line: "orange", name: "Berri-UQAM",        coords: [-73.565, 45.531], interchange: true },
  { line: "orange", name: "Sherbrooke",        coords: [-73.572, 45.539] },
  { line: "orange", name: "Mont-Royal",        coords: [-73.580, 45.548] },
  { line: "orange", name: "Laurier",           coords: [-73.587, 45.556] },
  { line: "orange", name: "Rosemont",          coords: [-73.594, 45.564] },
  { line: "orange", name: "Beaubien",          coords: [-73.601, 45.572] },
  { line: "orange", name: "Jean-Talon",        coords: [-73.609, 45.578], interchange: true },
  { line: "orange", name: "Fabre",             coords: [-73.619, 45.584] },
  { line: "orange", name: "D'Iberville",       coords: [-73.628, 45.589] },
  { line: "orange", name: "Saint-Michel",      coords: [-73.637, 45.598] },
  { line: "orange", name: "Jarry",             coords: [-73.649, 45.608] },
  { line: "orange", name: "Crémazie",          coords: [-73.660, 45.618], terminus: true },

  // ── Blue line (west → east) ───────────────────────────────────────────
  { line: "blue", name: "Snowdon",                  coords: [-73.657, 45.488], interchange: true },
  { line: "blue", name: "Côte-des-Neiges",          coords: [-73.638, 45.494] },
  { line: "blue", name: "Université-de-Montréal",   coords: [-73.618, 45.500] },
  { line: "blue", name: "Édouard-Montpetit",        coords: [-73.604, 45.506] },
  { line: "blue", name: "Outremont",                coords: [-73.595, 45.510] },
  { line: "blue", name: "Acadie",                   coords: [-73.585, 45.513] },
  { line: "blue", name: "Parc",                     coords: [-73.575, 45.519] },
  { line: "blue", name: "De Castelnau",             coords: [-73.566, 45.526] },
  { line: "blue", name: "Jean-Talon",               coords: [-73.558, 45.533], interchange: true },
  { line: "blue", name: "Beaubien",                 coords: [-73.540, 45.538] },
  { line: "blue", name: "Rosemont",                 coords: [-73.527, 45.542] },
  { line: "blue", name: "Saint-Michel",             coords: [-73.519, 45.551], terminus: true },

  // ── Yellow line ───────────────────────────────────────────────────────
  { line: "yellow", name: "Berri-UQAM",  coords: [-73.556, 45.516], interchange: true },
  { line: "yellow", name: "Jean-Drapeau",coords: [-73.530, 45.508] },
  { line: "yellow", name: "Longueuil",   coords: [-73.519, 45.494], terminus: true },
];

// Free dark vector style — no API key needed
const STYLE_URL = "https://tiles.openfreemap.org/styles/dark";

function buildCafeGeoJson(results: MapRecommendation[], selectedShopId: string | null) {
  return {
    type: "FeatureCollection" as const,
    features: results.map((r) => ({
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: [r.shop.lon, r.shop.lat] },
      properties: {
        id: r.shop.id,
        name: r.shop.name,
        selected: r.shop.id === selectedShopId,
      },
    })),
  };
}

function buildStationsGeoJson() {
  const lineColorMap: Record<string, string> = Object.fromEntries(
    METRO_LINES.map((l) => [l.id, l.color])
  );
  return {
    type: "FeatureCollection" as const,
    features: METRO_STATIONS.map((s) => ({
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: s.coords },
      properties: {
        name: s.name,
        color: lineColorMap[s.line] ?? "#ffffff",
        interchange: s.interchange ?? false,
        terminus: s.terminus ?? false,
      },
    })),
  };
}

const BTN =
  "w-8 h-8 flex items-center justify-center bg-[#1c0c10]/90 border border-white/10 text-[#F4F2EF]/70 text-[13px] leading-none hover:bg-[#60212E] hover:border-[#94B6EF]/50 hover:text-[#F4F2EF] transition-colors select-none cursor-pointer";

function NavControls({ mapRef }: { mapRef: React.RefObject<maplibregl.Map | null> }) {
  const pan = (x: number, y: number) =>
    mapRef.current?.panBy([x, y], { duration: 200 });
  const reset = () =>
    mapRef.current?.easeTo({
      center: MAP_CENTER,
      zoom: MAP_ZOOM,
      pitch: MAP_PITCH,
      bearing: MAP_BEARING,
      duration: 700,
    });

  return (
    <div className="absolute bottom-6 right-4 z-10 flex flex-col gap-px">
      {/* zoom */}
      <button className={BTN} onClick={() => mapRef.current?.zoomIn({ duration: 250 })} title="Zoom in">
        <svg width="11" height="11" viewBox="0 0 11 11" fill="currentColor"><path d="M5 0h1v5h5v1H6v5H5V6H0V5h5z"/></svg>
      </button>
      <button className={BTN} onClick={() => mapRef.current?.zoomOut({ duration: 250 })} title="Zoom out">
        <svg width="11" height="3" viewBox="0 0 11 3" fill="currentColor"><path d="M0 0h11v3H0z"/></svg>
      </button>

      {/* divider */}
      <div className="h-px bg-white/8 my-[2px]" />

      {/* directional pad */}
      <div className="grid grid-cols-3 gap-px">
        <div />
        <button className={BTN} onClick={() => pan(0, -80)} title="Pan up">
          <svg width="9" height="9" viewBox="0 0 9 9" fill="currentColor"><path d="M4.5 0 9 9H0z"/></svg>
        </button>
        <div />
        <button className={BTN} onClick={() => pan(-80, 0)} title="Pan left">
          <svg width="9" height="9" viewBox="0 0 9 9" fill="currentColor"><path d="M0 4.5 9 0v9z"/></svg>
        </button>
        <button className={BTN} onClick={reset} title="Reset view" style={{ fontSize: 10 }}>⌂</button>
        <button className={BTN} onClick={() => pan(80, 0)} title="Pan right">
          <svg width="9" height="9" viewBox="0 0 9 9" fill="currentColor"><path d="M9 4.5 0 9V0z"/></svg>
        </button>
        <div />
        <button className={BTN} onClick={() => pan(0, 80)} title="Pan down">
          <svg width="9" height="9" viewBox="0 0 9 9" fill="currentColor"><path d="M4.5 9 0 0h9z"/></svg>
        </button>
        <div />
      </div>

      {/* tilt */}
      <div className="h-px bg-white/8 my-[2px]" />
      <button
        className={BTN}
        onClick={() => mapRef.current?.easeTo({ pitch: Math.min((mapRef.current?.getPitch() ?? 0) + 10, 85), duration: 250 })}
        title="Tilt up"
        style={{ fontSize: 10 }}
      >3D↑</button>
      <button
        className={BTN}
        onClick={() => mapRef.current?.easeTo({ pitch: Math.max((mapRef.current?.getPitch() ?? 0) - 10, 0), duration: 250 })}
        title="Tilt down"
        style={{ fontSize: 10 }}
      >2D↓</button>
    </div>
  );
}

export default function MontrealMap({ results, selectedShopId, onSelectShop }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const loadedRef = useRef(false);
  const onSelectRef = useRef(onSelectShop);
  onSelectRef.current = onSelectShop;

  // Initialise map once
  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE_URL,
      center: MAP_CENTER,
      zoom: MAP_ZOOM,
      pitch: MAP_PITCH,
      bearing: MAP_BEARING,
      attributionControl: false,
      maxBounds: [[-74.4, 45.25], [-73.2, 45.85]],
    });

    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");

    map.on("load", () => {
      // Remove base-style label layers so our custom labels don't appear twice
      const baseLayers = map.getStyle().layers ?? [];
      for (const layer of baseLayers) {
        if (layer.type === "symbol") {
          map.removeLayer(layer.id);
        }
      }

      // ── island mask (dark overlay outside the island) ──────────────────
      map.addSource("island-mask", {
        type: "geojson",
        data: getIslandMaskGeoJson() as any,
      });
      map.addLayer({
        id: "island-mask-fill",
        type: "fill",
        source: "island-mask",
        paint: {
          "fill-color": "#07040c",
          "fill-opacity": 0.88,
        },
      });

      // ── island outline glow ─────────────────────────────────────────────
      map.addSource("island-outline", {
        type: "geojson",
        data: getIslandOutlineGeoJson() as any,
      });
      map.addLayer({
        id: "island-outline-glow",
        type: "line",
        source: "island-outline",
        paint: {
          "line-color": "#b76e79",
          "line-width": 3,
          "line-blur": 6,
          "line-opacity": 0.65,
        },
      });
      map.addLayer({
        id: "island-outline-sharp",
        type: "line",
        source: "island-outline",
        paint: {
          "line-color": "#e8aab5",
          "line-width": 1,
          "line-opacity": 0.5,
        },
      });

      // ── neighbourhood 3-D extrusions ───────────────────────────────────
      map.addSource("neighborhoods", {
        type: "geojson",
        data: getZonesGeoJson() as any,
      });
      map.addLayer({
        id: "neighborhoods-3d",
        type: "fill-extrusion",
        source: "neighborhoods",
        paint: {
          "fill-extrusion-color": ["get", "color"],
          "fill-extrusion-height": ["get", "height"],
          "fill-extrusion-base": 0,
          "fill-extrusion-opacity": 0.55,
        },
      });
      map.addLayer({
        id: "neighborhoods-outline",
        type: "line",
        source: "neighborhoods",
        paint: {
          "line-color": ["get", "color"],
          "line-width": 1.5,
          "line-opacity": 0.8,
        },
      });

      // ── neighbourhood labels ────────────────────────────────────────────
      map.addLayer({
        id: "neighborhood-labels",
        type: "symbol",
        source: "neighborhoods",
        layout: {
          "text-field": ["get", "label"],
          "text-size": 14,
          "text-font": ["Noto Sans Bold", "Open Sans Bold"],
          "text-anchor": "center",
          "text-allow-overlap": true,
          "text-ignore-placement": true,
        },
        paint: {
          "text-color": "#ffffff",
          "text-opacity": 0.9,
          "text-halo-color": "#000000",
          "text-halo-width": 2,
        },
      });

      // ── STM metro lines ────────────────────────────────────────────────
      for (const line of METRO_LINES) {
        map.addSource(`metro-${line.id}`, {
          type: "geojson",
          data: {
            type: "Feature",
            geometry: { type: "LineString", coordinates: line.coords },
            properties: {},
          } as any,
        });
        map.addLayer({
          id: `metro-${line.id}-glow`,
          type: "line",
          source: `metro-${line.id}`,
          layout: { "line-cap": "round", "line-join": "round" },
          paint: { "line-color": line.color, "line-width": 10, "line-opacity": 0.2, "line-blur": 5 },
        });
        map.addLayer({
          id: `metro-${line.id}-line`,
          type: "line",
          source: `metro-${line.id}`,
          layout: { "line-cap": "round", "line-join": "round" },
          paint: { "line-color": line.color, "line-width": 3, "line-opacity": 0.9 },
        });
      }

      // ── Metro stations ─────────────────────────────────────────────────
      map.addSource("stations", {
        type: "geojson",
        data: buildStationsGeoJson() as any,
      });

      // Outer halo for interchange / terminus stations
      map.addLayer({
        id: "stations-halo",
        type: "circle",
        source: "stations",
        filter: ["any", ["get", "interchange"], ["get", "terminus"]],
        paint: {
          "circle-radius": 10,
          "circle-color": ["get", "color"],
          "circle-opacity": 0.15,
          "circle-blur": 1,
        },
      });

      // Station dots
      map.addLayer({
        id: "stations-dot",
        type: "circle",
        source: "stations",
        paint: {
          "circle-radius": [
            "case",
            ["get", "interchange"], 6,
            ["get", "terminus"], 5,
            3.5,
          ],
          "circle-color": [
            "case",
            ["any", ["get", "interchange"], ["get", "terminus"]], "#ffffff",
            ["get", "color"],
          ],
          "circle-stroke-width": [
            "case",
            ["any", ["get", "interchange"], ["get", "terminus"]], 2.5,
            1.5,
          ],
          "circle-stroke-color": ["get", "color"],
          "circle-opacity": 1,
        },
      });

      // Station name labels — major (interchange/terminus) visible from zoom 12
      map.addLayer({
        id: "stations-label-major",
        type: "symbol",
        source: "stations",
        minzoom: 12,
        filter: ["any", ["get", "interchange"], ["get", "terminus"]],
        layout: {
          "text-field": ["get", "name"],
          "text-size": ["interpolate", ["linear"], ["zoom"], 12, 9, 14, 12],
          "text-font": ["Noto Sans Bold", "Open Sans Bold"],
          "text-anchor": "top",
          "text-offset": [0, 0.9],
          "text-allow-overlap": false,
          "text-padding": 3,
        },
        paint: {
          "text-color": ["get", "color"],
          "text-opacity": ["interpolate", ["linear"], ["zoom"], 12, 0.7, 13.5, 1],
          "text-halo-color": "#050205",
          "text-halo-width": 1.5,
        },
      });

      // All station labels at higher zoom
      map.addLayer({
        id: "stations-label-all",
        type: "symbol",
        source: "stations",
        minzoom: 13.5,
        layout: {
          "text-field": ["get", "name"],
          "text-size": 10,
          "text-font": ["Noto Sans Regular", "Open Sans Regular"],
          "text-anchor": "top",
          "text-offset": [0, 0.8],
          "text-allow-overlap": false,
          "text-padding": 2,
        },
        paint: {
          "text-color": ["get", "color"],
          "text-opacity": 0.85,
          "text-halo-color": "#050205",
          "text-halo-width": 1.5,
        },
      });

      // ── café markers ────────────────────────────────────────────────────
      map.addSource("cafes", {
        type: "geojson",
        data: buildCafeGeoJson([], null),
      });
      map.addLayer({
        id: "cafes-halo",
        type: "circle",
        source: "cafes",
        paint: {
          "circle-radius": ["case", ["get", "selected"], 16, 12],
          "circle-color": ["case", ["get", "selected"], "#ff5aa9", "#b76e79"],
          "circle-opacity": 0.22,
          "circle-blur": 1,
        },
      });
      map.addLayer({
        id: "cafes-circle",
        type: "circle",
        source: "cafes",
        paint: {
          "circle-radius": ["case", ["get", "selected"], 9, 7],
          "circle-color": ["case", ["get", "selected"], "#ff7ec8", "#ff4daf"],
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
          "circle-stroke-opacity": 0.9,
        },
      });

      // Click / cursor
      map.on("click", "cafes-circle", (e) => {
        const id = e.features?.[0]?.properties?.id as string | undefined;
        if (id) onSelectRef.current(id);
      });
      map.on("mouseenter", "cafes-circle", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "cafes-circle", () => {
        map.getCanvas().style.cursor = "";
      });

      loadedRef.current = true;

      // Seed initial data
      (map.getSource("cafes") as maplibregl.GeoJSONSource).setData(
        buildCafeGeoJson(results, selectedShopId) as any
      );
    });

    mapRef.current = map;
    return () => {
      loadedRef.current = false;
      map.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update café markers when results or selection changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current || !map.getSource("cafes")) return;
    (map.getSource("cafes") as maplibregl.GeoJSONSource).setData(
      buildCafeGeoJson(results, selectedShopId) as any
    );
  }, [results, selectedShopId]);

  // Fly to selected café
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current || !selectedShopId) return;
    const item = results.find((r) => r.shop.id === selectedShopId);
    if (!item) return;
    map.flyTo({
      center: [item.shop.lon, item.shop.lat],
      zoom: Math.max(map.getZoom(), 13),
      pitch: MAP_PITCH,
      bearing: MAP_BEARING,
      duration: 900,
      essential: true,
    });
  }, [selectedShopId, results]);

  return (
    <div className="relative h-full w-full" style={{ minHeight: 480 }}>
      <div ref={containerRef} className="h-full w-full" />
      <NavControls mapRef={mapRef} />
    </div>
  );
}
