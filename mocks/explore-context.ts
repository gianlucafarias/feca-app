import { mockPlacesById } from "@/mocks/scenarios";
import type { Place } from "@/types/feca";
import type { NearbyPlace } from "@/types/places";

export type ExploreContextId =
  | "open_now"
  | "work_2h"
  | "brunch_long"
  | "solo"
  | "first_date"
  | "snack_fast"
  | "reading"
  | "group_4";

export type ExploreContextDef = {
  id: ExploreContextId;
  label: string;
  subtitle: string;
  /** Claves de `mockPlacesById` en orden de relevancia mock. */
  placeKeys: string[];
};

export const EXPLORE_CONTEXTS: ExploreContextDef[] = [
  {
    id: "open_now",
    label: "Abiertos ahora",
    subtitle: "Para salir ya",
    placeKeys: ["litoral", "ronda", "miga", "bruma"],
  },
  {
    id: "work_2h",
    label: "Trabajar 2 h",
    subtitle: "Café y foco",
    placeKeys: ["litoral", "miga", "ronda"],
  },
  {
    id: "brunch_long",
    label: "Brunch largo",
    subtitle: "Domingo sin apuro",
    placeKeys: ["bruma", "patio", "ronda"],
  },
  {
    id: "solo",
    label: "Ir solo",
    subtitle: "Barra o mesa cómoda",
    placeKeys: ["miga", "litoral", "ronda"],
  },
  {
    id: "first_date",
    label: "Primera cita",
    subtitle: "Luz y conversación",
    placeKeys: ["patio", "ronda", "bruma"],
  },
  {
    id: "snack_fast",
    label: "Merienda rápida",
    subtitle: "Sin cola eterna",
    placeKeys: ["ronda", "miga", "litoral"],
  },
  {
    id: "reading",
    label: "Para leer",
    subtitle: "Tranqui y buena luz",
    placeKeys: ["miga", "patio", "ronda"],
  },
  {
    id: "group_4",
    label: "Con 4 personas",
    subtitle: "Mesa y compartir",
    placeKeys: ["bruma", "patio", "ronda"],
  },
];

function placeToNearby(place: Place): NearbyPlace {
  return {
    googlePlaceId: place.googlePlaceId ?? `mock-${place.id}`,
    name: place.name,
    address: `${place.neighborhood}, ${place.city}`,
    lat: -34.9,
    lng: -56.16,
    rating: 4.2 + (place.name.length % 7) * 0.1,
    userRatingCount: 12 + place.savedCount,
    types: ["cafe"],
    primaryType: place.categories.includes("brunch") ? "restaurant" : "cafe",
    photoUrl: undefined,
    openNow: true,
  };
}

export function getPlacesForContext(
  contextId: ExploreContextId | null,
): NearbyPlace[] {
  if (!contextId) return [];
  const def = EXPLORE_CONTEXTS.find((c) => c.id === contextId);
  if (!def) return [];
  return def.placeKeys
    .map((k) => mockPlacesById[k])
    .filter((p): p is Place => Boolean(p))
    .map(placeToNearby);
}
