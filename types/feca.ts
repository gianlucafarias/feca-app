export type PlaceCategory = "cafe" | "brunch";

export type MockScenarioKey =
  | "full"
  | "no-following"
  | "no-saved"
  | "explore-empty"
  | "new-user";

export type User = {
  id: string;
  username: string;
  displayName: string;
  city: string;
  neighborhood?: string;
  bio: string;
  followingCount: number;
  /** Cantidad de usuarios que siguen a este perfil (si el backend lo envía). */
  followersCount?: number;
  savedCount: number;
  visitCount: number;
};

export type Place = {
  id: string;
  name: string;
  neighborhood: string;
  city: string;
  categories: PlaceCategory[];
  signature: string;
  note: string;
  accent: string;
  accentSoft: string;
  savedCount: number;
  bestMoment: string;
  /** Foto del lugar (API / Google resuelta en backend). */
  photoUrl?: string;
  /** Para enlazar a `/place/[id]` cuando existe en Google. */
  googlePlaceId?: string;
};

export type Visit = {
  id: string;
  user: User;
  place: Place;
  rating: number;
  visitedAt: string;
  note: string;
  tags: PlaceCategory[];
  companions: string;
};

export type SavedPlace = {
  id: string;
  place: Place;
  savedAt: string;
  reason: string;
};

/** Modo del feed en inicio: red, ciudad canónica, proximidad o momento/intención. */
export type FeedMode = "network" | "city" | "nearby" | "now";

export type FeedItem = {
  id: string;
  visit: Visit;
  summary: string;
  /**
   * Por qué aparece esta tarjeta (confianza). Si falta, la UI puede usar `summary`.
   * BACKEND_CONTRACT: alinear con `appearanceReason` / resumen del ranking.
   */
  reasonLine?: string;
};

/** Respuesta corta para “¿volverías?”. */
export type WouldReturn = "yes" | "maybe" | "no";

/** Campos enriquecidos de visita persistidos junto con la reseña. */
export type RichVisitDraft = {
  orderedItems: string;
  wouldReturn: WouldReturn | null;
  noiseLevel: number | null;
  wifiQuality: number | null;
  waitLevel: number | null;
  /** 1 barato … 3 caro */
  priceTier: number | null;
  /** URLs/URIs de fotos agregadas a la visita. */
  photoUris: string[];
  /** Opcional: hay buen estacionamiento (solo UI → API si el backend lo acepta). */
  hasParking: boolean | null;
  /** Opcional: apto mascotas. */
  petFriendly: boolean | null;
};

export type TastePreference = {
  id: string;
  label: string;
};

export type TasteProfileState = {
  /** IDs de `TASTE_PREFERENCE_OPTIONS` seleccionados. */
  selectedIds: string[];
};

export type ExplorePin = {
  id: string;
  placeId: string;
  x: number;
  y: number;
  label: string;
};

export type OnboardingDraft = {
  username: string;
  displayName: string;
  city: string;
  neighborhood: string;
  cityGooglePlaceId?: string;
  /** Nombre largo de la ciudad (FECA); no confundir con `displayName` del usuario. */
  cityDisplayName?: string;
  lat?: number;
  lng?: number;
};

export type GroupEventStatus = "proposed" | "confirmed" | "completed";

export type GroupMemberRole = "owner" | "admin" | "member";

export type GroupMemberStatus = "invited" | "active" | "declined" | "left";

export type GroupMember = {
  user: User;
  accepted: boolean;
  role?: GroupMemberRole;
  status?: GroupMemberStatus;
};

export type EventRsvp = "going" | "maybe" | "declined" | "none";

export type GroupEvent = {
  id: string;
  place: Place;
  date: string;
  status: GroupEventStatus;
  proposedBy: User;
  myRsvp?: EventRsvp | null;
};

export type FecaGroup = {
  id: string;
  name: string;
  inviteCode?: string | null;
  createdBy: User;
  members: GroupMember[];
  events: GroupEvent[];
};

export type CreateGroupInput = {
  name: string;
  memberIds: string[];
};

export type AddGroupEventInput = {
  groupId: string;
  placeId: string;
  date: string;
};

export type GuideVisibility = "private" | "unlisted" | "public";

/** Guía curada (API `/diaries`); alias histórico: diario. */
export type CafeDiary = {
  id: string;
  name: string;
  description: string;
  places: Place[];
  createdBy: User;
  createdAt: string;
  intro?: string;
  editorialReason?: string;
  coverImageUrl?: string;
  visibility?: GuideVisibility | null;
  publishedAt?: string | null;
  /** Notas por id de lugar cuando el API envía `orderedPlaces` con notas. */
  placeNotes?: Record<string, string>;
};

export type CreateDiaryInput = {
  name: string;
  description: string;
};

export type MockScenario = {
  key: MockScenarioKey;
  label: string;
  description: string;
  currentUser: User;
  feed: FeedItem[];
  explorePlaces: Place[];
  explorePins: ExplorePin[];
  savedPlaces: SavedPlace[];
  profileVisits: Visit[];
  placeReviews: Visit[];
  friends: User[];
  groups: FecaGroup[];
  diaries: CafeDiary[];
};

export type CreateVisitInput = {
  placeName: string;
  visitedAt: string;
  rating: number;
  note: string;
  tags: PlaceCategory[];
  photoPrompt?: string;
};
