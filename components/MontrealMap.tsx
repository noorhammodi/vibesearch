"use client";

import { useMemo } from "react";
import {
  CircleMarker,
  GeoJSON,
  MapContainer,
  Popup,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  MONTREAL_MAP_VIEW,
  TILE_ATTRIBUTION,
  TILE_URL,
  ZONE_FILL_OPACITY,
  ZONE_STROKE_COLOR,
  ZONE_STROKE_WIDTH,
} from "@/lib/map/mapStyle";
import { getActiveZoneSource } from "@/lib/map/zoneSource";

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

type MontrealMapProps = {
  results: MapRecommendation[];
  selectedShopId: string | null;
  onSelectShop: (shopId: string) => void;
};

function MapFlyToSelection({
  selectedShopId,
  byId,
}: {
  selectedShopId: string | null;
  byId: Map<string, MapRecommendation>;
}) {
  const map = useMap();
  if (!selectedShopId) return null;
  const item = byId.get(selectedShopId);
  if (!item) return null;
  map.flyTo([item.shop.lat, item.shop.lon], Math.max(map.getZoom(), 13), {
    duration: 0.75,
  });
  return null;
}

export default function MontrealMap({
  results,
  selectedShopId,
  onSelectShop,
}: MontrealMapProps) {
  const zones = useMemo(() => getActiveZoneSource(), []);
  const byId = useMemo(
    () => new Map(results.map((r) => [r.shop.id, r])),
    [results]
  );

  return (
    <div className="h-[520px] overflow-hidden rounded-3xl border border-[#2f2534] bg-[#130d17] shadow-xl">
      <MapContainer
        center={[MONTREAL_MAP_VIEW.center[1], MONTREAL_MAP_VIEW.center[0]] as LatLngExpression}
        zoom={MONTREAL_MAP_VIEW.zoom}
        minZoom={MONTREAL_MAP_VIEW.minZoom}
        maxZoom={MONTREAL_MAP_VIEW.maxZoom}
        zoomControl
        className="h-full w-full"
      >
        <TileLayer attribution={TILE_ATTRIBUTION} url={TILE_URL} />

        <GeoJSON
          data={zones.zonesGeoJson as any}
          style={(feature) => ({
            fillColor: String(feature?.properties?.color ?? "#ff5aa9"),
            fillOpacity: ZONE_FILL_OPACITY,
            color: ZONE_STROKE_COLOR,
            weight: ZONE_STROKE_WIDTH,
          })}
        />

        {zones.labelsGeoJson.features.map((feature) => {
          const coords = feature.geometry.coordinates;
          return (
            <Tooltip
              key={String(feature.properties.id)}
              permanent
              direction="center"
              opacity={1}
              position={[coords[1], coords[0]]}
              className="!bg-transparent !border-none !shadow-none !text-[#f8f5ff] !font-semibold tracking-wide"
            >
              {feature.properties.label}
            </Tooltip>
          );
        })}

        {results.map((item) => {
          const selected = item.shop.id === selectedShopId;
          return (
            <CircleMarker
              key={item.shop.id}
              center={[item.shop.lat, item.shop.lon]}
              radius={selected ? 10 : 8}
              pathOptions={{
                color: "#ffffff",
                weight: 2,
                fillColor: selected ? "#ff7ec8" : "#ff4daf",
                fillOpacity: 0.95,
              }}
              eventHandlers={{ click: () => onSelectShop(item.shop.id) }}
            >
              <Popup>
                <div className="text-slate-900">
                  <strong>{item.shop.name}</strong>
                  <br />
                  <span className="text-xs">{item.shop.address ?? "Montreal"}</span>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}

        <MapFlyToSelection selectedShopId={selectedShopId} byId={byId} />
      </MapContainer>
    </div>
  );
}
