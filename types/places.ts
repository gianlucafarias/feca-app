/** Fila de `GET /v1/places/autocomplete` (Google + FECA). */
export type ApiPlaceAutocompleteItem = {
  id: string;
  source: "google" | "manual";
  sourcePlaceId?: string | null;
  placeId?: string | null;
  name: string;
  address: string;
  city: string;
  lat?: number | null;
  lng?: number | null;
  categories: string[];
  coverPhotoUrl?: string | null;
  ratingExternal?: number | null;
  ratingCountExternal?: number | null;
  distanceMeters?: number | null;
  alreadyInFeca: boolean;
};

export type ApiPlacesAutocompleteResponse = {
  items: ApiPlaceAutocompleteItem[];
  fallback: { allowManual: boolean; prefillName: string };
  providerAvailable: boolean;
};

/** Señal social en carrusel editorial (amigos / red). */
export type NearbyPlaceFriendRow = {
  /** Handle sin @; se muestra como @usuario */
  username: string;
  avatarUrl?: string | null;
  /** Texto al lado del usuario (ej. "volvería a ir"). */
  snippet: string;
};

export type NearbyPlace = {
  googlePlaceId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  rating?: number;
  userRatingCount?: number;
  types: string[];
  primaryType?: string;
  photoUrl?: string;
  openNow?: boolean;
  /** Chip de apertura (ej. "Abierto ahora", "Abre a las 9:00"). Viene del backend. */
  openingChip?: string;
  /** Frases cortas de tu red (ej. "María volvería a ir"). Viene del backend. */
  socialChips?: string[];
  /**
   * Amigos con avatar y @usuario (preferido sobre parsear `socialChips`).
   * Si falta, el cliente interpreta líneas `socialChips` que empiecen con `@usuario`.
   */
  friendSocialRows?: NearbyPlaceFriendRow[];
};

export type GoogleReview = {
  authorName: string;
  rating: number;
  text: string;
  relativeTime: string;
};

/** Reseña de la comunidad FECA en la ficha del lugar (viene del backend). */
export type FecaPlaceReview = {
  id: string;
  userDisplayName: string;
  rating: number;
  note: string;
  visitedAt: string;
  /** Opcional: texto relativo ya formateado (ej. "hace 2 días"). */
  relativeTime?: string;
};

export type PlaceDetail = NearbyPlace & {
  photos: string[];
  openingHours?: string[];
  editorialSummary?: string;
  /** Reseñas Google Places (fieldMask reviews). */
  reviews?: GoogleReview[];
  /** Reseñas de usuarios FECA; prioridad de producto sobre `reviews`. */
  fecaReviews?: FecaPlaceReview[];
  social?: PlaceSocial;
};

/**
 * Datos sociales mock para ficha de lugar (front-only).
 * BACKEND_CONTRACT: agregar a PlaceDetail o endpoint dedicado.
 */
export type PlaceSocial = {
  followersVisited: { userId: string; displayName: string }[];
  communityTags: string[];
  bestMoments: string[];
  userPhotoUris: string[];
  diaryAppearances: { diaryId: string; name: string }[];
};

export type MockPlaceSocial = PlaceSocial;
