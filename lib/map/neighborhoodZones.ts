export type NeighborhoodZone = {
  id: string;
  label: string;
  color: string;
  height: number;
  polygon: Array<[number, number]>;
};

export const MONTREAL_NEIGHBORHOOD_ZONES: NeighborhoodZone[] = [
  {
    id: "downtown",
    label: "Downtown",
    color: "#60a5fa",
    height: 420,
    polygon: [
      [-73.582, 45.490],
      [-73.582, 45.514],
      [-73.547, 45.514],
      [-73.547, 45.490],
      [-73.582, 45.490],
    ],
  },
  {
    id: "old_port",
    label: "Old Port",
    color: "#c084fc",
    height: 260,
    polygon: [
      [-73.572, 45.499],
      [-73.572, 45.510],
      [-73.543, 45.510],
      [-73.543, 45.499],
      [-73.572, 45.499],
    ],
  },
  {
    id: "griffintown",
    label: "Griffintown",
    color: "#f59e0b",
    height: 310,
    polygon: [
      [-73.589, 45.481],
      [-73.589, 45.496],
      [-73.552, 45.496],
      [-73.552, 45.481],
      [-73.589, 45.481],
    ],
  },
  {
    id: "saint_henri",
    label: "Saint-Henri",
    color: "#fb7185",
    height: 190,
    polygon: [
      [-73.611, 45.469],
      [-73.611, 45.484],
      [-73.572, 45.484],
      [-73.572, 45.469],
      [-73.611, 45.469],
    ],
  },
  {
    id: "ndg",
    label: "NDG",
    color: "#2dd4bf",
    height: 155,
    polygon: [
      [-73.657, 45.462],
      [-73.657, 45.491],
      [-73.614, 45.491],
      [-73.614, 45.462],
      [-73.657, 45.462],
    ],
  },
  {
    id: "cdn",
    label: "Côte-des-Neiges",
    color: "#34d399",
    height: 175,
    polygon: [
      [-73.655, 45.491],
      [-73.655, 45.524],
      [-73.620, 45.524],
      [-73.620, 45.491],
      [-73.655, 45.491],
    ],
  },
  {
    id: "outremont",
    label: "Outremont",
    color: "#a78bfa",
    height: 165,
    polygon: [
      [-73.626, 45.517],
      [-73.626, 45.538],
      [-73.599, 45.538],
      [-73.599, 45.517],
      [-73.626, 45.517],
    ],
  },
  {
    id: "plateau",
    label: "Plateau",
    color: "#ff5aa9",
    height: 230,
    polygon: [
      [-73.601, 45.517],
      [-73.601, 45.542],
      [-73.556, 45.542],
      [-73.556, 45.517],
      [-73.601, 45.517],
    ],
  },
  {
    id: "mile_end",
    label: "Mile End",
    color: "#d4f542",
    height: 205,
    polygon: [
      [-73.622, 45.534],
      [-73.622, 45.555],
      [-73.582, 45.555],
      [-73.582, 45.534],
      [-73.622, 45.534],
    ],
  },
  {
    id: "rosemont",
    label: "Rosemont",
    color: "#ff7d3c",
    height: 180,
    polygon: [
      [-73.607, 45.542],
      [-73.607, 45.566],
      [-73.551, 45.566],
      [-73.551, 45.542],
      [-73.607, 45.542],
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
        height: z.height,
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
      const pts = z.polygon.slice(0, -1);
      const lon = pts.reduce((s, p) => s + p[0], 0) / pts.length;
      const lat = pts.reduce((s, p) => s + p[1], 0) / pts.length;
      return {
        type: "Feature" as const,
        properties: { id: z.id, label: z.label },
        geometry: { type: "Point" as const, coordinates: [lon, lat] },
      };
    }),
  };
}
