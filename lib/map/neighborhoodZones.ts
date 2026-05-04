export type NeighborhoodZone = {
  id: string;
  label: string;
  color: string;
  height: number;
  polygon: Array<[number, number]>;
};

export const MONTREAL_NEIGHBORHOOD_ZONES: NeighborhoodZone[] = [
  // ── Core / Central ────────────────────────────────────────────────────
  {
    id: "downtown",
    label: "Downtown",
    color: "#94B6EF",
    height: 500,
    polygon: [
      [-73.582, 45.490], [-73.582, 45.514], [-73.547, 45.514],
      [-73.547, 45.490], [-73.582, 45.490],
    ],
  },
  {
    id: "old_montreal",
    label: "Old Montréal",
    color: "#c4a2d8",
    height: 300,
    polygon: [
      [-73.572, 45.497], [-73.572, 45.512], [-73.540, 45.512],
      [-73.540, 45.497], [-73.572, 45.497],
    ],
  },
  {
    id: "griffintown",
    label: "Griffintown",
    color: "#d4946a",
    height: 350,
    polygon: [
      [-73.589, 45.481], [-73.589, 45.496], [-73.552, 45.496],
      [-73.552, 45.481], [-73.589, 45.481],
    ],
  },
  {
    id: "latin_quarter",
    label: "Quartier Latin",
    color: "#d47890",
    height: 240,
    polygon: [
      [-73.572, 45.514], [-73.572, 45.528], [-73.547, 45.528],
      [-73.547, 45.514], [-73.572, 45.514],
    ],
  },
  {
    id: "gay_village",
    label: "The Village",
    color: "#e07aac",
    height: 210,
    polygon: [
      [-73.547, 45.514], [-73.547, 45.528], [-73.516, 45.528],
      [-73.516, 45.514], [-73.547, 45.514],
    ],
  },

  // ── West / South-West ─────────────────────────────────────────────────
  {
    id: "saint_henri",
    label: "Saint-Henri",
    color: "#c87888",
    height: 200,
    polygon: [
      [-73.611, 45.469], [-73.611, 45.484], [-73.572, 45.484],
      [-73.572, 45.469], [-73.611, 45.469],
    ],
  },
  {
    id: "westmount",
    label: "Westmount",
    color: "#70a858",
    height: 195,
    polygon: [
      [-73.614, 45.484], [-73.614, 45.506], [-73.589, 45.506],
      [-73.589, 45.484], [-73.614, 45.484],
    ],
  },
  {
    id: "ndg",
    label: "NDG",
    color: "#5898a8",
    height: 165,
    polygon: [
      [-73.657, 45.462], [-73.657, 45.491], [-73.614, 45.491],
      [-73.614, 45.462], [-73.657, 45.462],
    ],
  },
  {
    id: "verdun",
    label: "Verdun",
    color: "#60a888",
    height: 155,
    polygon: [
      [-73.624, 45.442], [-73.624, 45.464], [-73.558, 45.464],
      [-73.558, 45.442], [-73.624, 45.442],
    ],
  },
  {
    id: "pointe_st_charles",
    label: "Pointe-St-Charles",
    color: "#5878a8",
    height: 155,
    polygon: [
      [-73.558, 45.450], [-73.558, 45.475], [-73.516, 45.475],
      [-73.516, 45.450], [-73.558, 45.450],
    ],
  },

  // ── Central North ─────────────────────────────────────────────────────
  {
    id: "cdn",
    label: "Côte-des-Neiges",
    color: "#74b88c",
    height: 180,
    polygon: [
      [-73.655, 45.491], [-73.655, 45.524], [-73.620, 45.524],
      [-73.620, 45.491], [-73.655, 45.491],
    ],
  },
  {
    id: "outremont",
    label: "Outremont",
    color: "#9880c4",
    height: 205,
    polygon: [
      [-73.626, 45.517], [-73.626, 45.538], [-73.599, 45.538],
      [-73.599, 45.517], [-73.626, 45.517],
    ],
  },
  {
    id: "plateau",
    label: "The Plateau",
    color: "#d4688e",
    height: 270,
    polygon: [
      [-73.601, 45.517], [-73.601, 45.542], [-73.556, 45.542],
      [-73.556, 45.517], [-73.601, 45.517],
    ],
  },
  {
    id: "mile_end",
    label: "Mile End",
    color: "#96b84e",
    height: 250,
    polygon: [
      [-73.622, 45.534], [-73.622, 45.555], [-73.582, 45.555],
      [-73.582, 45.534], [-73.622, 45.534],
    ],
  },
  {
    id: "shaughnessy",
    label: "Shaughnessy Village",
    color: "#b09070",
    height: 185,
    polygon: [
      [-73.589, 45.496], [-73.589, 45.516], [-73.553, 45.516],
      [-73.553, 45.496], [-73.589, 45.496],
    ],
  },

  // ── East ──────────────────────────────────────────────────────────────
  {
    id: "hochelaga",
    label: "Hochelaga",
    color: "#c07838",
    height: 170,
    polygon: [
      [-73.516, 45.520], [-73.516, 45.560], [-73.464, 45.560],
      [-73.464, 45.520], [-73.516, 45.520],
    ],
  },

  // ── North ─────────────────────────────────────────────────────────────
  {
    id: "rosemont",
    label: "Rosemont",
    color: "#c87848",
    height: 185,
    polygon: [
      [-73.607, 45.542], [-73.607, 45.566], [-73.551, 45.566],
      [-73.551, 45.542], [-73.607, 45.542],
    ],
  },
  {
    id: "little_italy",
    label: "Little Italy",
    color: "#c47858",
    height: 175,
    polygon: [
      [-73.617, 45.553], [-73.617, 45.576], [-73.589, 45.576],
      [-73.589, 45.553], [-73.617, 45.553],
    ],
  },
  {
    id: "petite_patrie",
    label: "Petite-Patrie",
    color: "#c89058",
    height: 170,
    polygon: [
      [-73.589, 45.553], [-73.589, 45.578], [-73.549, 45.578],
      [-73.549, 45.553], [-73.589, 45.553],
    ],
  },
  {
    id: "parc_extension",
    label: "Parc-Extension",
    color: "#a86898",
    height: 158,
    polygon: [
      [-73.660, 45.538], [-73.660, 45.565], [-73.632, 45.565],
      [-73.632, 45.538], [-73.660, 45.538],
    ],
  },
  {
    id: "villeray",
    label: "Villeray",
    color: "#6068c8",
    height: 162,
    polygon: [
      [-73.645, 45.564], [-73.645, 45.592], [-73.559, 45.592],
      [-73.559, 45.564], [-73.645, 45.564],
    ],
  },
  {
    id: "ahuntsic",
    label: "Ahuntsic",
    color: "#4888a8",
    height: 148,
    polygon: [
      [-73.682, 45.590], [-73.682, 45.622], [-73.560, 45.622],
      [-73.560, 45.590], [-73.682, 45.590],
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
