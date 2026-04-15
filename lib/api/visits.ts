import type {
  ApiFeedItem,
  ApiVisit,
  CreateVisitPayload,
} from "@/types/api";

import { getApiBaseUrl, parseError } from "./base";

type ListVisitsResponse = {
  visits?: ApiVisit[];
  total?: number;
};

type FeedResponse = {
  items?: ApiFeedItem[];
  total?: number;
};

type CreateVisitResponse = {
  visit: ApiVisit;
};

export async function createVisitApi(
  accessToken: string,
  payload: CreateVisitPayload,
): Promise<ApiVisit> {
  const response = await fetch(`${getApiBaseUrl()}/v1/visits`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data = (await response.json()) as CreateVisitResponse;
  return data.visit;
}

export async function fetchMyVisits(
  accessToken: string,
  options?: { limit?: number; offset?: number },
): Promise<{ visits: ApiVisit[]; total: number }> {
  const params = new URLSearchParams();
  if (options?.limit != null) params.set("limit", String(options.limit));
  if (options?.offset != null) params.set("offset", String(options.offset));

  const qs = params.toString();
  const url = `${getApiBaseUrl()}/v1/me/visits${qs ? `?${qs}` : ""}`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data = (await response.json()) as ListVisitsResponse;
  return {
    visits: data.visits ?? [],
    total: data.total ?? (data.visits?.length ?? 0),
  };
}

export async function fetchFeed(
  accessToken: string,
  options?: {
    limit?: number;
    offset?: number;
    mode?: "network" | "nearby" | "now";
    cursor?: string;
    lat?: number;
    lng?: number;
  },
): Promise<{ items: ApiFeedItem[]; total: number }> {
  const params = new URLSearchParams();
  if (options?.limit != null) params.set("limit", String(options.limit));
  if (options?.offset != null) params.set("offset", String(options.offset));
  if (options?.mode) params.set("mode", options.mode);
  if (options?.cursor) params.set("cursor", options.cursor);
  if (options?.lat != null) params.set("lat", String(options.lat));
  if (options?.lng != null) params.set("lng", String(options.lng));

  const qs = params.toString();
  const url = `${getApiBaseUrl()}/v1/feed${qs ? `?${qs}` : ""}`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data = (await response.json()) as FeedResponse;
  return {
    items: data.items ?? [],
    total: data.total ?? (data.items?.length ?? 0),
  };
}

export async function fetchUserVisits(
  userId: string,
  accessToken: string,
  options?: { limit?: number; offset?: number },
): Promise<{ visits: ApiVisit[]; total: number }> {
  const params = new URLSearchParams();
  if (options?.limit != null) params.set("limit", String(options.limit));
  if (options?.offset != null) params.set("offset", String(options.offset));

  const qs = params.toString();
  const url = `${getApiBaseUrl()}/v1/users/${encodeURIComponent(userId)}/visits${qs ? `?${qs}` : ""}`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data = (await response.json()) as ListVisitsResponse;
  return {
    visits: data.visits ?? [],
    total: data.total ?? (data.visits?.length ?? 0),
  };
}
