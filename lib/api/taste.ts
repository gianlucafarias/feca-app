import type { ApiTasteOption, ApiTasteProfile } from "@/types/api";

import { getApiBaseUrl, parseError } from "./base";

type TasteResponse = {
  taste: ApiTasteProfile;
};

type TasteOptionsResponse = {
  options: ApiTasteOption[];
};

export async function fetchTasteOptions(): Promise<ApiTasteOption[]> {
  const response = await fetch(`${getApiBaseUrl()}/v1/taste-options`);

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const payload = (await response.json()) as TasteOptionsResponse;
  return payload.options ?? [];
}

export async function fetchMyTaste(
  accessToken: string,
): Promise<ApiTasteProfile> {
  const response = await fetch(`${getApiBaseUrl()}/v1/me/taste`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const payload = (await response.json()) as TasteResponse;
  return payload.taste;
}

export async function updateMyTaste(
  accessToken: string,
  selectedIds: string[],
): Promise<ApiTasteProfile> {
  const response = await fetch(`${getApiBaseUrl()}/v1/me/taste`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ selectedIds }),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const payload = (await response.json()) as TasteResponse;
  return payload.taste;
}

export async function fetchUserTaste(
  userId: string,
  accessToken: string,
): Promise<ApiTasteProfile> {
  const response = await fetch(
    `${getApiBaseUrl()}/v1/users/${encodeURIComponent(userId)}/taste`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const payload = (await response.json()) as TasteResponse;
  return payload.taste;
}
