import { normalizeFriendRowFromApi } from "@/lib/places/nearby-friend-rows";
import { normalizePlaceDetail } from "@/lib/places/normalize-place-detail";
import type { ApiStoredPlace } from "@/types/api";
import type {
  ApiPlacesAutocompleteResponse,
  NearbyPlace,
  NearbyPlaceFriendRow,
  PlaceDetail,
} from "@/types/places";

import {
  FECA_PLACES_ORIGIN_HEADER,
  getApiBaseUrl,
  parseError,
  rethrowWithNetworkHelp,
} from "./base";

/** Acepta camelCase o snake_case en señales sociales (carruseles / explore). */
function mergeNearbySocialAliases(place: NearbyPlace): NearbyPlace {
  const r = place as unknown as Record<string, unknown>;
  const socialChips =
    place.socialChips ??
    (Array.isArray(r.social_chips) ? (r.social_chips as string[]) : undefined);
  const friendSocialRowsRaw =
    place.friendSocialRows ??
    (Array.isArray(r.friend_social_rows) ? (r.friend_social_rows as unknown[]) : undefined);
  const friendSocialRows = friendSocialRowsRaw
    ? friendSocialRowsRaw
        .map(normalizeFriendRowFromApi)
        .filter((row): row is NearbyPlaceFriendRow => row != null)
    : undefined;
  if (socialChips === undefined && friendSocialRows === undefined) {
    return place;
  }
  return {
    ...place,
    ...(socialChips !== undefined ? { socialChips } : {}),
    ...(friendSocialRows !== undefined ? { friendSocialRows } : {}),
  };
}

type NearbyPlacesParams = {
  accessToken: string;
  /** Si faltan, el backend usa las coordenadas guardadas en el perfil. */
  lat?: number;
  lng?: number;
  query?: string;
  type?: string;
  limit?: number;
  /** Home / secciones de carrusel (ver contrato backend `GET /v1/places/nearby`). */
  variant?:
    | "home_city"
    | "home_network"
    | "home_nearby"
    | "home_open_now"
    | "home_friends_liked";
  /** P. ej. `Date.now()` al refrescar para reordenar sin invalidar caché de candidatos. */
  rotate?: number;
  origin?: string;
  signal?: AbortSignal;
};

function buildPlacesHeaders(
  accessToken: string,
  options?: { origin?: string; json?: boolean },
) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
  };
  if (options?.json) {
    headers["Content-Type"] = "application/json";
  }
  if (options?.origin?.trim()) {
    headers[FECA_PLACES_ORIGIN_HEADER] = options.origin.trim();
  }
  return headers;
}

export async function fetchPlacesAutocomplete(
  accessToken: string,
  params: {
    q: string;
    city?: string;
    lat?: number;
    lng?: number;
    limit?: number;
    sessionToken?: string;
    origin?: string;
    signal?: AbortSignal;
  },
): Promise<ApiPlacesAutocompleteResponse> {
  const q = params.q.trim();
  const search = new URLSearchParams();
  search.set("q", q);
  search.set("limit", String(Math.min(Math.max(params.limit ?? 10, 1), 10)));
  if (params.city?.trim()) {
    search.set("city", params.city.trim());
  }
  if (
    params.lat != null &&
    params.lng != null &&
    Number.isFinite(params.lat) &&
    Number.isFinite(params.lng)
  ) {
    search.set("lat", String(params.lat));
    search.set("lng", String(params.lng));
  }
  if (params.sessionToken?.trim()) {
    search.set("sessionToken", params.sessionToken.trim());
  }

  const response = await fetch(
    `${getApiBaseUrl()}/v1/places/autocomplete?${search.toString()}`,
    {
      headers: buildPlacesHeaders(accessToken, { origin: params.origin }),
      signal: params.signal,
    },
  );

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return (await response.json()) as ApiPlacesAutocompleteResponse;
}

export async function fetchNearbyPlaces({
  accessToken,
  lat,
  lng,
  query,
  type,
  limit,
  variant,
  rotate,
  origin,
  signal,
}: NearbyPlacesParams): Promise<NearbyPlace[]> {
  const params = new URLSearchParams();
  if (lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng)) {
    params.set("lat", String(lat));
    params.set("lng", String(lng));
  }

  if (query) params.set("query", query);
  if (type) params.set("type", type);
  if (variant) params.set("variant", variant);
  if (rotate != null && Number.isFinite(rotate) && rotate > 0) {
    params.set("rotate", String(Math.floor(rotate)));
  }
  params.set("limit", String(limit ?? 20));

  const response = await fetch(
    `${getApiBaseUrl()}/v1/places/nearby?${params.toString()}`,
    {
      headers: buildPlacesHeaders(accessToken, { origin }),
      signal,
    },
  );

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const payload = (await response.json()) as { places?: NearbyPlace[] };
  return (payload.places ?? []).map(mergeNearbySocialAliases);
}

export async function fetchExploreContext(params: {
  accessToken: string;
  intent: string;
  lat?: number;
  lng?: number;
  limit?: number;
  origin?: string;
  signal?: AbortSignal;
}): Promise<NearbyPlace[]> {
  const search = new URLSearchParams({
    intent: params.intent,
  });
  if (
    params.lat != null &&
    params.lng != null &&
    Number.isFinite(params.lat) &&
    Number.isFinite(params.lng)
  ) {
    search.set("lat", String(params.lat));
    search.set("lng", String(params.lng));
  }

  search.set("limit", String(params.limit ?? 12));

  const response = await fetch(
    `${getApiBaseUrl()}/v1/explore/context?${search.toString()}`,
    {
      headers: buildPlacesHeaders(params.accessToken, { origin: params.origin }),
      signal: params.signal,
    },
  );

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const payload = (await response.json()) as { places?: NearbyPlace[] };
  return (payload.places ?? []).map(mergeNearbySocialAliases);
}

export async function fetchPlaceDetail(
  googlePlaceId: string,
  accessToken: string,
  options?: { origin?: string; signal?: AbortSignal },
): Promise<PlaceDetail> {
  const response = await fetch(
    `${getApiBaseUrl()}/v1/places/${encodeURIComponent(googlePlaceId)}`,
    {
      headers: buildPlacesHeaders(accessToken, { origin: options?.origin }),
      signal: options?.signal,
    },
  );

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const payload = (await response.json()) as { place: Record<string, unknown> };
  return normalizePlaceDetail(payload.place);
}

export async function resolveGooglePlace(
  accessToken: string,
  googlePlaceId: string,
  options?: {
    origin?: string;
    sessionToken?: string;
    signal?: AbortSignal;
  },
): Promise<ApiStoredPlace> {
  let response: Response;
  try {
    response = await fetch(`${getApiBaseUrl()}/v1/places/resolve`, {
      method: "POST",
      headers: buildPlacesHeaders(accessToken, {
        json: true,
        origin: options?.origin,
      }),
      signal: options?.signal,
      body: JSON.stringify({
        source: "google",
        sourcePlaceId: googlePlaceId,
        ...(options?.sessionToken?.trim()
          ? { sessionToken: options.sessionToken.trim() }
          : {}),
      }),
    });
  } catch (e) {
    rethrowWithNetworkHelp(e);
  }

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const payload = (await response.json()) as { place: ApiStoredPlace };
  return payload.place;
}

export async function createManualPlaceApi(
  accessToken: string,
  body: {
    name: string;
    address: string;
    city: string;
    cityGooglePlaceId: string;
    lat?: number;
    lng?: number;
  },
  options?: { origin?: string; signal?: AbortSignal },
): Promise<ApiStoredPlace> {
  const response = await fetch(`${getApiBaseUrl()}/v1/places/manual`, {
    method: "POST",
    headers: buildPlacesHeaders(accessToken, {
      json: true,
      origin: options?.origin,
    }),
    signal: options?.signal,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const payload = (await response.json()) as { place: ApiStoredPlace };
  return payload.place;
}
