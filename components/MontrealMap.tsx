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

const MAP_CENTER: [number, number] = [-73.620, 45.540];
const MAP_ZOOM = 10.8;
const MAP_PITCH = 52;
const MAP_BEARING = -12;

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
      // Top-face border for crispness
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
          "text-size": 11,
          "text-font": ["Noto Sans Bold", "Open Sans Bold"],
          "text-anchor": "center",
          "text-allow-overlap": true,
          "text-ignore-placement": true,
        },
        paint: {
          "text-color": "#ffffff",
          "text-opacity": 0.9,
          "text-halo-color": "#000000",
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
    <div className="relative h-[520px] overflow-hidden rounded-3xl border border-[#2f2534] shadow-2xl">
      {/* subtle vignette */}
      <div className="pointer-events-none absolute inset-0 z-10 rounded-3xl ring-1 ring-inset ring-[#b76e79]/20" />
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}
