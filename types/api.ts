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

/** Preferencia para aceptar invitaciones a planes (PATCH /v1/me). */
export type ApiGroupInvitePolicy = "everyone" | "from_following_only";

/** Preferencias privadas de salida (GET/PATCH /v1/me); no son perfil público. */
export type ApiOutingCompany = "solo" | "couple" | "small_group" | "large_group";

export type ApiOutingPreferencesV1 = {
  schemaVersion: 1;
  typicalOutingSlots?: (
    | "weekday_morning"
    | "weekday_afternoon"
    | "weekday_evening"
    | "weekend_day"
    | "weekend_night"
  )[];
  /** Varias opciones; el backend acepta también el campo viejo `typicalCompany` al guardar. */
  typicalCompanies?: ApiOutingCompany[];
  /** @deprecated Preferir `typicalCompanies`. */
  typicalCompany?: ApiOutingCompany;
  placePriorities?: (
    "atmosphere" | "distance" | "food_drink" | "price" | "quiet" | "service"
  )[];
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
  groupInvitePolicy?: ApiGroupInvitePolicy | null;
  pushEnabled?: boolean | null;
  outingPreferences?: ApiOutingPreferencesV1 | null;
  isAdmin?: boolean;
  isEditor?: boolean;
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
  | "diary_published"
  | "group_invite_reminder"
  | "group_event_rsvp_reminder"
  | "group_event_today_reminder"
  | "weekly_digest"
  | "contextual_recommendation";

export type ApiNotificationEntity = {
  id: string;
  kind: "user" | "group" | "group_event" | "visit" | "diary" | "place";
};

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
  entity?: ApiNotificationEntity | null;
  data?: Record<string, unknown> | null;
};

export type ApiSavedPlaceRow = {
  savedAt: string;
  place: ApiPlaceSummary;
  reason?: string;
};

export type ApiGroupEventStatus = "proposed" | "confirmed" | "completed";

export type ApiGroupVisibility = "private" | "public_followers";

export type ApiPlaceProposalPolicy = "all_members" | "owner_only";

export type ApiMemberProposalInteraction = "collaborative" | "announcement_locked";

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
  /** Si el backend los envía, la UI ajusta acciones (RSVP, confirmar, contra-propuestas). */
  allowsRsvp?: boolean | null;
  allowsConfirm?: boolean | null;
  allowsCounterProposals?: boolean | null;
};

/**
 * Vista mínima de un plan público donde participa alguien que vos seguís.
 * Sin `inviteCode`, sin lista completa de miembros ni direcciones exactas.
 */
export type ApiFriendPublicPlanSummary = {
  id: string;
  name: string;
  createdBy: ApiUserPublic;
  /** Seguido tuyo que es miembro activo del plan (contexto social). */
  friendParticipant: ApiUserPublic;
  nextEvent?: {
    date: string;
    /** Nombre comercial del lugar (ej. café), no domicilio particular. */
    placeName: string;
    /** Barrio o ciudad para contexto sin exponer calle/número. */
    areaLabel?: string | null;
    status: ApiGroupEventStatus;
  } | null;
  memberCount?: number;
};

/** Relación del viewer con el plan en `GET /v1/groups/:id` (vista pública vs miembro). */
export type ApiGroupViewerMembership = "active" | "invited" | "none";

export type ApiGroup = {
  id: string;
  name: string;
  /** Código corto para unirse; nunca derivar del `id` en el cliente. */
  inviteCode?: string | null;
  createdBy: ApiUserPublic;
  members: ApiGroupMember[];
  events: ApiGroupEvent[];
  visibility?: ApiGroupVisibility | null;
  placeProposalPolicy?: ApiPlaceProposalPolicy | null;
  memberProposalInteraction?: ApiMemberProposalInteraction | null;
  /** Si el backend lo envía: `none` = resumen público sin ser miembro. */
  viewerMembership?: ApiGroupViewerMembership | null;
  /** En vista pública con `members` vacío, total de miembros activos. */
  memberCount?: number | null;
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
