import type { ApiDiary } from "@/types/api";

import { FECA_PLACES_ORIGIN_HEADER, getApiBaseUrl, parseError } from "./base";

type DiariesListResponse = {
  diaries: ApiDiary[];
  total: number;
};

export type SearchPublicDiariesResult = {
  diaries: ApiDiary[];
  total: number;
  /** True si no existía `GET /v1/diaries/search` y se filtraron guías públicas propias. */
  usedFallback: boolean;
};

type DiaryResponse = {
  diary: ApiDiary;
};

type CreateDiaryBody = {
  name: string;
  description?: string;
  intro?: string;
  visibility?: "private" | "unlisted" | "public";
  coverImageUrl?: string;
  editorialReason?: string;
  publishedAt?: string;
};

export type UpdateDiaryBody = {
  name?: string;
  description?: string;
  intro?: string;
  editorialReason?: string;
  coverImageUrl?: string;
  visibility?: "private" | "unlisted" | "public";
  publishedAt?: string;
};

type AddDiaryPlaceBody = {
  placeId?: string;
  googlePlaceId?: string;
  sessionToken?: string;
};

export async function createDiaryApi(
  accessToken: string,
  body: CreateDiaryBody,
): Promise<ApiDiary> {
  const payload: Record<string, unknown> = { name: body.name };
  if (body.description !== undefined) {
    payload.description = body.description;
  }
  if (body.intro !== undefined) {
    payload.intro = body.intro;
  }
  if (body.visibility !== undefined) {
    payload.visibility = body.visibility;
  }
  if (body.coverImageUrl !== undefined) {
    payload.coverImageUrl = body.coverImageUrl;
  }
  if (body.editorialReason !== undefined) {
    payload.editorialReason = body.editorialReason;
  }
  if (body.publishedAt !== undefined) {
    payload.publishedAt = body.publishedAt;
  }

  const response = await fetch(`${getApiBaseUrl()}/v1/diaries`, {
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

  const data = (await response.json()) as DiaryResponse;
  return data.diary;
}

export async function fetchMyDiaries(
  accessToken: string,
): Promise<DiariesListResponse> {
  const response = await fetch(`${getApiBaseUrl()}/v1/me/diaries`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return (await response.json()) as DiariesListResponse;
}

/**
 * Búsqueda de guías públicas. Usa `GET /v1/diaries/search` si está disponible;
 * si la ruta no existe (404/405/501), filtra en cliente las guías públicas de `fetchMyDiaries`.
 */
export async function searchPublicDiaries(
  accessToken: string,
  params: { q: string; limit?: number },
): Promise<SearchPublicDiariesResult> {
  const q = params.q.trim();
  const limit = params.limit ?? 25;

  if (!q) {
    return { diaries: [], total: 0, usedFallback: false };
  }

  const search = new URLSearchParams();
  search.set("q", q);
  search.set("limit", String(limit));

  const response = await fetch(
    `${getApiBaseUrl()}/v1/diaries/search?${search.toString()}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (response.ok) {
    const data = (await response.json()) as DiariesListResponse;
    const diaries = data.diaries ?? [];
    return {
      diaries,
      total: data.total ?? diaries.length,
      usedFallback: false,
    };
  }

  if (response.status === 404 || response.status === 405 || response.status === 501) {
    return filterMyPublicDiariesByQuery(accessToken, q);
  }

  throw new Error(await parseError(response));
}

async function filterMyPublicDiariesByQuery(
  accessToken: string,
  q: string,
): Promise<SearchPublicDiariesResult> {
  const res = await fetchMyDiaries(accessToken);
  const qLower = q.toLowerCase();
  const filtered = res.diaries.filter((d) => {
    if (d.visibility !== "public") {
      return false;
    }
    const hay = `${d.name} ${d.description ?? ""} ${d.intro ?? ""}`.toLowerCase();
    return hay.includes(qLower);
  });
  return {
    diaries: filtered,
    total: filtered.length,
    usedFallback: true,
  };
}

export async function fetchUserDiaries(
  userId: string,
  accessToken: string,
): Promise<DiariesListResponse> {
  const response = await fetch(
    `${getApiBaseUrl()}/v1/users/${encodeURIComponent(userId)}/diaries`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return (await response.json()) as DiariesListResponse;
}

export async function updateDiaryApi(
  diaryId: string,
  accessToken: string,
  body: UpdateDiaryBody,
): Promise<ApiDiary> {
  const response = await fetch(
    `${getApiBaseUrl()}/v1/diaries/${encodeURIComponent(diaryId)}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data = (await response.json()) as DiaryResponse;
  return data.diary;
}

export async function fetchDiary(
  diaryId: string,
  accessToken: string,
): Promise<ApiDiary> {
  const response = await fetch(
    `${getApiBaseUrl()}/v1/diaries/${encodeURIComponent(diaryId)}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data = (await response.json()) as DiaryResponse;
  return data.diary;
}

export async function addPlaceToDiaryApi(
  diaryId: string,
  accessToken: string,
  body: AddDiaryPlaceBody,
  options?: { origin?: string },
): Promise<ApiDiary> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };
  if (options?.origin?.trim()) {
    headers[FECA_PLACES_ORIGIN_HEADER] = options.origin.trim();
  }

  const response = await fetch(
    `${getApiBaseUrl()}/v1/diaries/${encodeURIComponent(diaryId)}/places`,
    {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    },
  );

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data = (await response.json()) as DiaryResponse;
  return data.diary;
}
