import type { ApiUserPublic } from "@/types/api";

import { getApiBaseUrl, parseError } from "./base";

type FriendsResponse = {
  friends: ApiUserPublic[];
  total: number;
};

type FollowingPayload = {
  users?: unknown[];
  friends?: unknown[];
  total?: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function extractApiUserPublic(raw: unknown): ApiUserPublic | null {
  if (!isRecord(raw)) return null;

  const candidate = isRecord(raw.user) ? raw.user : raw;
  const id = typeof candidate.id === "string" ? candidate.id : "";
  const username =
    typeof candidate.username === "string" ? candidate.username : "";
  const displayName =
    typeof candidate.displayName === "string" ? candidate.displayName : "";

  if (!id || !username || !displayName) {
    return null;
  }

  return {
    id,
    username,
    displayName,
    avatarUrl:
      typeof candidate.avatarUrl === "string" ? candidate.avatarUrl : null,
    city: typeof candidate.city === "string" ? candidate.city : null,
  };
}

function normalizeFollowingList(data: FollowingPayload): {
  users: ApiUserPublic[];
  total: number;
} {
  const source = data.users ?? data.friends ?? [];
  const users = source
    .map((entry) => extractApiUserPublic(entry))
    .filter((user): user is ApiUserPublic => Boolean(user));

  return { users, total: data.total ?? users.length };
}

export async function fetchMyFollowing(
  accessToken: string,
  params?: { q?: string; limit?: number; offset?: number },
): Promise<{ users: ApiUserPublic[]; total: number }> {
  const search = new URLSearchParams();
  if (params?.q) search.set("q", params.q);
  if (params?.limit != null) search.set("limit", String(params.limit));
  if (params?.offset != null) search.set("offset", String(params.offset));
  const qs = search.toString();
  const url = `${getApiBaseUrl()}/v1/me/following${qs ? `?${qs}` : ""}`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const raw = (await response.json()) as FollowingPayload;
  return normalizeFollowingList(raw);
}

export async function fetchMyFriends(
  accessToken: string,
  params?: { q?: string; limit?: number; offset?: number },
): Promise<FriendsResponse> {
  const { users, total } = await fetchMyFollowing(accessToken, params);
  return { friends: users, total };
}
