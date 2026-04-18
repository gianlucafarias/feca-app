import type { PlaceCategory } from "@/types/feca";

export type ApiUserPublic = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  city?: string | null;
};

export type ApiPlaceSummary = {
  id: string;
  googlePlaceId?: string | null;
  name: string;
  address: string;
  photoUrl?: string | null;
};

export type ApiStoredPlace = {
  id: string;
  source: "google" | "manual";
  sourcePlaceId?: string | null;
  name: string;
  address: string;
  city: string;
  lat?: number | null;
  lng?: number | null;
  categories: string[];
  coverPhotoUrl?: string | null;
  ratingExternal?: number | null;
  ratingCountExternal?: number | null;
};

export type ApiVisit = {
  id: string;
  user: ApiUserPublic;
  place: ApiPlaceSummary;
  rating: number;
  note: string;
  tags: PlaceCategory[];
  visitedAt: string;
  createdAt: string;
  orderedItems?: string | null;
  wouldReturn?: "yes" | "maybe" | "no" | null;
  noiseLevel?: number | null;
  wifiQuality?: number | null;
  waitLevel?: number | null;
  priceTier?: number | null;
  photoUrls?: string[] | null;
};

export type ApiFeedItem = {
  id: string;
  visit: ApiVisit;
  summary?: string;
  appearanceReason?: string | null;
};

export type CreateVisitPayload = {
  placeId: string;
  rating: number;
  note: string;
  tags: PlaceCategory[];
  visitedAt: string;
  orderedItems?: string;
  wouldReturn?: "yes" | "maybe" | "no";
  noiseLevel?: number;
  wifiQuality?: number;
  waitLevel?: number;
  priceTier?: number;
  photoUrls?: string[];
  /** Campos extra opcionales (el servidor puede ignorarlos si aún no existen). */
  hasParking?: boolean;
  petFriendly?: boolean;
};

export type ApiMeUser = ApiUserPublic & {
  email?: string;
  cityGooglePlaceId?: string | null;
  lat?: number;
  lng?: number;
  bio?: string | null;
  visitCount?: number;
  savedCount?: number;
  followingCount?: number;
  followersCount?: number;
};

/** Perfil público (GET /v1/users/:id): relación con el usuario autenticado. */
export type ApiUserPublicProfile = ApiMeUser & {
  isFollowing?: boolean;
  followersCount?: number;
};

/** Tipos emitidos por backend (extensible si agregan más). */
export type ApiNotificationType =
  | "follow"
  | "group_invite"
  | "group_joined"
  | "group_event_proposed"
  | "group_event_rsvp"
  | "visit_created"
  | "diary_published";

/**
 * GET /v1/me/notifications — capa canónica: title, body, deepLink, entity, data.
 * `actor` puede faltar en tipos futuros; el texto mostrable prioriza body/title del servidor.
 */
export type ApiNotification = {
  id: string;
  type: ApiNotificationType | string;
  read: boolean;
  createdAt: string;
  actor?: ApiUserPublic;
  title?: string | null;
  body?: string | null;
  deepLink?: string | null;
  entity?: Record<string, unknown> | null;
  data?: Record<string, unknown> | null;
};

export type ApiSavedPlaceRow = {
  savedAt: string;
  place: ApiPlaceSummary;
  reason?: string;
};

export type ApiGroupEventStatus = "proposed" | "confirmed" | "completed";

/** Alineado al modelo de membresía en backend (roles / invitación). */
export type ApiGroupMemberRole = "owner" | "admin" | "member";

export type ApiGroupMemberStatus = "invited" | "active" | "declined" | "left";

export type ApiGroupMember = {
  user: ApiUserPublic;
  accepted: boolean;
  role?: ApiGroupMemberRole | null;
  status?: ApiGroupMemberStatus | null;
};

/** RSVP del usuario autenticado respecto al evento (si el backend lo envía). */
export type ApiEventRsvp = "going" | "maybe" | "declined" | "none";

export type ApiGroupEvent = {
  id: string;
  place: ApiPlaceSummary;
  date: string;
  status: ApiGroupEventStatus;
  proposedBy: ApiUserPublic;
  myRsvp?: ApiEventRsvp | null;
};

export type ApiGroup = {
  id: string;
  name: string;
  /** Código corto para unirse; nunca derivar del `id` en el cliente. */
  inviteCode?: string | null;
  createdBy: ApiUserPublic;
  members: ApiGroupMember[];
  events: ApiGroupEvent[];
};

/** Visibilidad de guía (listas curadas / compartibles). */
export type ApiGuideVisibility = "private" | "unlisted" | "public";

export type ApiGuidePlaceEntry = {
  place: ApiPlaceSummary;
  position: number;
  note?: string | null;
};

export type ApiTasteOption = {
  id: string;
  label: string;
};

export type ApiTasteProfile = {
  selectedIds: string[];
  preferences: ApiTasteOption[];
};

/**
 * Diario / guía: mismo recurso REST `/v1/diaries` con campos opcionales de guía.
 * Si `orderedPlaces` viene poblado, tiene prioridad sobre el orden de `places`.
 */
export type ApiDiary = {
  id: string;
  name: string;
  description?: string | null;
  places: ApiPlaceSummary[];
  createdBy: ApiUserPublic;
  createdAt: string;
  intro?: string | null;
  editorialReason?: string | null;
  coverImageUrl?: string | null;
  visibility?: ApiGuideVisibility | null;
  publishedAt?: string | null;
  orderedPlaces?: ApiGuidePlaceEntry[] | null;
};
