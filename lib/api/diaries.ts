import type { ApiDiary } from "@/types/api";

import { getApiBaseUrl, parseError } from "./base";

type DiariesListResponse = {
  diaries: ApiDiary[];
  total: number;
};

type DiaryResponse = {
  diary: ApiDiary;
};

type CreateDiaryBody = {
  name: string;
  description: string;
};

type AddDiaryPlaceBody = {
  placeId?: string;
  googlePlaceId?: string;
};

export async function createDiaryApi(
  accessToken: string,
  body: CreateDiaryBody,
): Promise<ApiDiary> {
  const response = await fetch(`${getApiBaseUrl()}/v1/diaries`, {
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
): Promise<ApiDiary> {
  const response = await fetch(
    `${getApiBaseUrl()}/v1/diaries/${encodeURIComponent(diaryId)}/places`,
    {
      method: "POST",
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
