import type { ApiSavedPlaceRow } from "@/types/api";

import { getApiBaseUrl, parseError } from "./base";

type SavedFlagResponse = {
  saved: boolean;
};

type MySavedResponse = {
  places: ApiSavedPlaceRow[];
  total: number;
};

export async function fetchMySavedPlaces(
  accessToken: string,
  params?: { limit?: number; offset?: number },
): Promise<MySavedResponse> {
  const search = new URLSearchParams();
  if (params?.limit != null) search.set("limit", String(params.limit));
  if (params?.offset != null) search.set("offset", String(params.offset));
  const qs = search.toString();
  const url = `${getApiBaseUrl()}/v1/me/saved${qs ? `?${qs}` : ""}`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return (await response.json()) as MySavedResponse;
}

export async function fetchPlaceSaved(
  googlePlaceId: string,
  accessToken: string,
): Promise<boolean> {
  const response = await fetch(
    `${getApiBaseUrl()}/v1/places/${encodeURIComponent(googlePlaceId)}/saved`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!response.ok) {
    if (response.status === 404) return false;
    throw new Error(await parseError(response));
  }

  const data = (await response.json()) as SavedFlagResponse;
  return Boolean(data.saved);
}

export async function savePlaceApi(
  googlePlaceId: string,
  accessToken: string,
): Promise<void> {
  const response = await fetch(
    `${getApiBaseUrl()}/v1/places/${encodeURIComponent(googlePlaceId)}/save`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!response.ok) {
    throw new Error(await parseError(response));
  }
}

export async function unsavePlaceApi(
  googlePlaceId: string,
  accessToken: string,
): Promise<void> {
  const response = await fetch(
    `${getApiBaseUrl()}/v1/places/${encodeURIComponent(googlePlaceId)}/save`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!response.ok) {
    throw new Error(await parseError(response));
  }
}
