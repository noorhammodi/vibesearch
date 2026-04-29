// Simplified boundary of Île de Montréal (clockwise from western tip).
// Southern shore follows the St. Lawrence; northern shore follows the Rivière des Prairies.
export const MONTREAL_ISLAND_COORDS: [number, number][] = [
  [-73.965, 45.413], // western tip (Ste-Anne-de-Bellevue)
  // --- southern shore east ---
  [-73.948, 45.405],
  [-73.928, 45.397],
  [-73.905, 45.389],
  [-73.880, 45.382],
  [-73.853, 45.377],
  [-73.825, 45.374],
  [-73.796, 45.374],
  [-73.768, 45.379],
  [-73.740, 45.388],
  [-73.713, 45.400],
  [-73.686, 45.412],
  [-73.659, 45.422],
  [-73.631, 45.429],
  [-73.604, 45.435],
  [-73.576, 45.443],
  [-73.550, 45.454],
  [-73.525, 45.468],
  [-73.504, 45.486],
  [-73.488, 45.509],
  [-73.477, 45.536],
  [-73.474, 45.565],
  [-73.478, 45.593],
  [-73.490, 45.619],
  [-73.508, 45.641],
  [-73.529, 45.659],
  // --- eastern tip ---
  [-73.554, 45.671],
  [-73.577, 45.679],
  // --- northern shore west ---
  [-73.603, 45.690],
  [-73.634, 45.703],
  [-73.666, 45.714],
  [-73.698, 45.720],
  [-73.727, 45.720],
  [-73.753, 45.715],
  [-73.776, 45.706],
  [-73.797, 45.694],
  [-73.815, 45.679],
  [-73.830, 45.662],
  [-73.842, 45.643],
  [-73.850, 45.621],
  [-73.854, 45.598],
  [-73.854, 45.575],
  [-73.848, 45.551],
  [-73.838, 45.528],
  [-73.824, 45.507],
  [-73.806, 45.487],
  // --- northwest taper ---
  [-73.825, 45.477],
  [-73.843, 45.468],
  [-73.860, 45.459],
  [-73.876, 45.451],
  [-73.893, 45.445],
  [-73.910, 45.438],
  [-73.925, 45.431],
  [-73.940, 45.423],
  [-73.954, 45.417],
  [-73.965, 45.413], // close
];

export function getIslandMaskGeoJson() {
  return {
    type: "Feature" as const,
    geometry: {
      type: "Polygon" as const,
      coordinates: [
        // outer ring: world bbox
        [[-180, -90], [-180, 90], [180, 90], [180, -90], [-180, -90]],
        // inner ring: island (creates the hole / island-shaped window)
        MONTREAL_ISLAND_COORDS,
      ],
    },
    properties: {},
  };
}

export function getIslandOutlineGeoJson() {
  return {
    type: "Feature" as const,
    geometry: {
      type: "Polygon" as const,
      coordinates: [MONTREAL_ISLAND_COORDS],
    },
    properties: {},
  };
}
