import { getZoneLabelPoints, getZonesGeoJson } from "./neighborhoodZones";

export type ZoneSource = {
  sourceId: string;
  zonesGeoJson: ReturnType<typeof getZonesGeoJson>;
  labelsGeoJson: ReturnType<typeof getZoneLabelPoints>;
};

// Migration hook:
// swap this implementation to load official Montreal neighborhood GeoJSON
// without touching map rendering code.
export function getActiveZoneSource(): ZoneSource {
  return {
    sourceId: "handcrafted-v1",
    zonesGeoJson: getZonesGeoJson(),
    labelsGeoJson: getZoneLabelPoints(),
  };
}
