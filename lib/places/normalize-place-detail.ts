import type {
  FecaPlaceReview,
  GoogleReview,
  PlaceDetail,
  PlaceSocial,
} from "@/types/places";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function pickString(
  r: Record<string, unknown>,
  keys: string[],
): string | undefined {
  for (const k of keys) {
    const v = r[k];
    if (typeof v === "string" && v.trim()) return v;
  }
  return undefined;
}

function mapFecaReviewItem(raw: unknown): FecaPlaceReview | null {
  if (!isRecord(raw)) return null;

  const id =
    pickString(raw, ["id", "visitId", "visit_id"]) ??
    (typeof raw.id === "number" ? String(raw.id) : undefined);
  if (!id) return null;

  const userDisplayName =
    pickString(raw, [
      "userDisplayName",
      "user_display_name",
      "authorName",
      "author_name",
    ]) ??
    (isRecord(raw.user)
      ? pickString(raw.user, ["displayName", "display_name", "username"]) ??
        undefined
      : undefined) ??
    "Usuario";

  const rating = Number(raw.rating ?? raw.stars ?? 0);
  const note = String(raw.note ?? raw.body ?? raw.text ?? "");
  const visitedAt = String(
    raw.visitedAt ??
      raw.visited_at ??
      raw.createdAt ??
      raw.created_at ??
      "",
  );
  const relativeTime = pickString(raw, ["relativeTime", "relative_time"]);

  return {
    id,
    userDisplayName,
    rating: Number.isFinite(rating) ? rating : 0,
    note,
    visitedAt,
    ...(relativeTime ? { relativeTime } : {}),
  };
}

function collectFecaReviews(raw: Record<string, unknown>): FecaPlaceReview[] {
  const candidates: unknown[] = [];

  const pushArr = (v: unknown) => {
    if (Array.isArray(v)) candidates.push(...v);
  };

  pushArr(raw.fecaReviews);
  pushArr(raw.feca_reviews);
  pushArr(raw.communityReviews);
  pushArr(raw.community_reviews);
  pushArr(raw.platformReviews);
  pushArr(raw.platform_reviews);
  /** Algunos backends envían las visitas públicas del lugar así */
  pushArr(raw.visits);
  pushArr(raw.placeVisits);
  pushArr(raw.place_visits);

  const out: FecaPlaceReview[] = [];
  const seen = new Set<string>();
  for (const item of candidates) {
    const m = mapFecaReviewItem(item);
    if (!m || seen.has(m.id)) continue;
    seen.add(m.id);
    out.push(m);
  }
  return out;
}

function mapGoogleReviewItem(raw: unknown): GoogleReview | null {
  if (!isRecord(raw)) return null;
  const authorName =
    pickString(raw, ["authorName", "author_name"]) ?? "Google";
  const rating = Number(raw.rating ?? 0);
  const text = String(raw.text ?? "");
  const relativeTime =
    pickString(raw, ["relativeTime", "relative_time"]) ?? "";
  return {
    authorName,
    rating: Number.isFinite(rating) ? rating : 0,
    text,
    relativeTime,
  };
}

function normalizeGoogleReviews(raw: unknown): GoogleReview[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  const list = raw
    .map(mapGoogleReviewItem)
    .filter((x): x is GoogleReview => x != null);
  return list.length > 0 ? list : undefined;
}

function normalizePlaceSocial(raw: unknown): PlaceSocial | undefined {
  if (!isRecord(raw)) return undefined;

  const followersVisited = Array.isArray(raw.followersVisited)
    ? raw.followersVisited
        .filter(isRecord)
        .map((row) => ({
          userId: String(row.userId ?? row.user_id ?? ""),
          displayName: String(row.displayName ?? row.display_name ?? ""),
        }))
        .filter((row) => row.userId && row.displayName)
    : [];

  const communityTags = Array.isArray(raw.communityTags)
    ? raw.communityTags.map(String).filter(Boolean)
    : [];

  const bestMoments = Array.isArray(raw.bestMoments)
    ? raw.bestMoments.map(String).filter(Boolean)
    : [];

  const photoSource = Array.isArray(raw.userPhotoUris)
    ? raw.userPhotoUris
    : Array.isArray(raw.userPhotoUrls)
      ? raw.userPhotoUrls
      : [];

  const userPhotoUris = photoSource.map(String).filter(Boolean);

  const diarySource = Array.isArray(raw.diaryAppearances)
    ? raw.diaryAppearances
    : Array.isArray(raw.guideAppearances)
      ? raw.guideAppearances
      : [];

  const diaryAppearances = diarySource
    .filter(isRecord)
    .map((row) => ({
      diaryId: String(row.diaryId ?? row.diary_id ?? ""),
      name: String(row.name ?? ""),
    }))
    .filter((row) => row.diaryId && row.name);

  if (
    followersVisited.length === 0 &&
    communityTags.length === 0 &&
    bestMoments.length === 0 &&
    userPhotoUris.length === 0 &&
    diaryAppearances.length === 0
  ) {
    return undefined;
  }

  return {
    followersVisited,
    communityTags,
    bestMoments,
    userPhotoUris,
    diaryAppearances,
  };
}

/**
 * Unifica respuestas del backend (camelCase / snake_case) y formas de reseñas FECA.
 */
export function normalizePlaceDetail(raw: Record<string, unknown>): PlaceDetail {
  const base = raw as unknown as PlaceDetail;

  const googlePlaceId = String(
    raw.googlePlaceId ?? raw.google_place_id ?? base.googlePlaceId ?? "",
  );

  const fecaMerged = collectFecaReviews(raw);
  const fecaReviews =
    fecaMerged.length > 0 ? fecaMerged : (base.fecaReviews ?? undefined);

  const reviewsNorm =
    normalizeGoogleReviews(raw.reviews) ??
    normalizeGoogleReviews(raw.google_reviews);
  const social =
    normalizePlaceSocial(raw.social) ??
    normalizePlaceSocial(raw.placeSocial) ??
    normalizePlaceSocial(raw.place_social);

  return {
    ...base,
    googlePlaceId,
    name: String(raw.name ?? base.name),
    address: String(raw.address ?? base.address),
    lat: Number(raw.lat ?? base.lat ?? 0),
    lng: Number(raw.lng ?? base.lng ?? 0),
    types: (Array.isArray(raw.types)
      ? raw.types
      : base.types ?? []) as string[],
    photos: Array.isArray(raw.photos)
      ? (raw.photos as string[])
      : (base.photos ?? []),
    rating:
      raw.rating != null ? Number(raw.rating) : base.rating,
    userRatingCount:
      raw.userRatingCount != null
        ? Number(raw.userRatingCount)
        : raw.user_rating_count != null
          ? Number(raw.user_rating_count)
          : base.userRatingCount,
    primaryType:
      (raw.primaryType as string | undefined) ??
      (raw.primary_type as string | undefined) ??
      base.primaryType,
    photoUrl:
      (raw.photoUrl as string | undefined) ??
      (raw.photo_url as string | undefined) ??
      base.photoUrl,
    openNow:
      raw.openNow != null
        ? Boolean(raw.openNow)
        : raw.open_now != null
          ? Boolean(raw.open_now)
          : base.openNow,
    openingHours:
      (Array.isArray(raw.openingHours)
        ? raw.openingHours
        : Array.isArray(raw.opening_hours)
          ? raw.opening_hours
          : base.openingHours) as string[] | undefined,
    editorialSummary:
      (raw.editorialSummary as string | undefined) ??
      (raw.editorial_summary as string | undefined) ??
      base.editorialSummary,
    reviews: reviewsNorm ?? base.reviews,
    fecaReviews,
    social,
  };
}
