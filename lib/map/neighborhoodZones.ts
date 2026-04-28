export type NeighborhoodZone = {
  id: string;
  label: string;
  color: string;
  // [lon, lat]
  polygon: Array<[number, number]>;
};

export const MONTREAL_NEIGHBORHOOD_ZONES: NeighborhoodZone[] = [
  {
    id: "mile_end",
    label: "Mile End",
    color: "#d8e74a",
    polygon: [
      [-73.6205, 45.535],
      [-73.6205, 45.5535],
      [-73.584, 45.5535],
      [-73.584, 45.535],
      [-73.6205, 45.535],
    ],
  },
  {
    id: "plateau",
    label: "Plateau",
    color: "#ff5aa9",
    polygon: [
      [-73.602, 45.518],
      [-73.602, 45.541],
      [-73.556, 45.541],
      [-73.556, 45.518],
      [-73.602, 45.518],
    ],
  },
  {
    id: "griffintown",
    label: "Griffintown",
    color: "#67b6e6",
    polygon: [
      [-73.585, 45.483],
      [-73.585, 45.497],
      [-73.552, 45.497],
      [-73.552, 45.483],
      [-73.585, 45.483],
    ],
  },
  {
    id: "atwater",
    label: "Atwater",
    color: "#4fd0c0",
    polygon: [
      [-73.612, 45.486],
      [-73.612, 45.507],
      [-73.579, 45.507],
      [-73.579, 45.486],
      [-73.612, 45.486],
    ],
  },
  {
    id: "lasalle",
    label: "LaSalle",
    color: "#ff5c7a",
    polygon: [
      [-73.653, 45.432],
      [-73.653, 45.47],
      [-73.61, 45.47],
      [-73.61, 45.432],
      [-73.653, 45.432],
    ],
  },
];

export function getZonesGeoJson() {
  return {
    type: "FeatureCollection" as const,
    features: MONTREAL_NEIGHBORHOOD_ZONES.map((z) => ({
      type: "Feature" as const,
      properties: {
        id: z.id,
        label: z.label,
        color: z.color,
      },
      geometry: {
        type: "Polygon" as const,
        coordinates: [z.polygon],
      },
    })),
  };
}

export function getZoneLabelPoints() {
  return {
    type: "FeatureCollection" as const,
    features: MONTREAL_NEIGHBORHOOD_ZONES.map((z) => {
      const points = z.polygon.slice(0, -1);
      const lon = points.reduce((s, p) => s + p[0], 0) / points.length;
      const lat = points.reduce((s, p) => s + p[1], 0) / points.length;
      return {
        type: "Feature" as const,
        properties: { id: z.id, label: z.label },
        geometry: { type: "Point" as const, coordinates: [lon, lat] },
      };
    }),
  };
}
