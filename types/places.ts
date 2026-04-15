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
