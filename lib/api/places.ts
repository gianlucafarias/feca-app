import { normalizePlaceDetail } from "@/lib/places/normalize-place-detail";
import type { ApiStoredPlace } from "@/types/api";
import type { NearbyPlace, PlaceDetail } from "@/types/places";

import { getApiBaseUrl, parseError } from "./base";

type NearbyPlacesParams = {
  accessToken: string;
  /** Si faltan, el backend usa las coordenadas guardadas en el perfil. */
  lat?: number;
  lng?: number;
  query?: string;
  type?: string;
  limit?: number;
};

export async function fetchNearbyPlaces({
  accessToken,
  lat,
  lng,
  query,
  type,
  limit,
}: NearbyPlacesParams): Promise<NearbyPlace[]> {
  const params = new URLSearchParams();
  if (lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng)) {
    params.set("lat", String(lat));
    params.set("lng", String(lng));
  }

  if (query) params.set("query", query);
  if (type) params.set("type", type);
  params.set("limit", String(limit ?? 20));

  const response = await fetch(
    `${getApiBaseUrl()}/v1/places/nearby?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const payload = (await response.json()) as { places?: NearbyPlace[] };
  return payload.places ?? [];
}

export async function fetchExploreContext(params: {
  accessToken: string;
  intent: string;
  lat?: number;
  lng?: number;
  limit?: number;
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
      headers: { Authorization: `Bearer ${params.accessToken}` },
    },
  );

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const payload = (await response.json()) as { places?: NearbyPlace[] };
  return payload.places ?? [];
}

export async function fetchPlaceDetail(
  googlePlaceId: string,
  accessToken: string,
): Promise<PlaceDetail> {
  const response = await fetch(
    `${getApiBaseUrl()}/v1/places/${encodeURIComponent(googlePlaceId)}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
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
): Promise<ApiStoredPlace> {
  const response = await fetch(`${getApiBaseUrl()}/v1/places/resolve`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      source: "google",
      sourcePlaceId: googlePlaceId,
    }),
  });

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
): Promise<ApiStoredPlace> {
  const response = await fetch(`${getApiBaseUrl()}/v1/places/manual`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const payload = (await response.json()) as { place: ApiStoredPlace };
  return payload.place;
}
