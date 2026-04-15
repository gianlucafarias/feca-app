import type { ApiUserPublic, ApiUserPublicProfile } from "@/types/api";

import { getApiBaseUrl, parseError } from "./base";

type UserEnvelope = {
  user?: ApiUserPublic;
  social?: {
    following?: boolean;
  };
  stats?: {
    followersCount?: number;
    followingCount?: number;
    savedCount?: number;
    visitCount?: number;
  };
};

type UserResponse = {
  user: ApiUserPublicProfile | ApiUserPublic;
  social?: UserEnvelope["social"];
  stats?: UserEnvelope["stats"];
};

type RawSearchUsersResponse = {
  users: Array<ApiUserPublic | UserEnvelope>;
  total: number;
};

type SearchUsersResponse = {
  users: ApiUserPublic[];
  total: number;
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

export async function fetchUserById(
  userId: string,
  accessToken: string,
): Promise<ApiUserPublicProfile> {
  const response = await fetch(
    `${getApiBaseUrl()}/v1/users/${encodeURIComponent(userId)}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data = (await response.json()) as UserResponse;
  const user = extractApiUserPublic(data.user);
  if (!user) {
    throw new Error("Invalid user payload");
  }

  return {
    ...user,
    isFollowing: Boolean(data.social?.following),
    followersCount: data.stats?.followersCount,
    followingCount: data.stats?.followingCount,
    savedCount: data.stats?.savedCount,
    visitCount: data.stats?.visitCount,
  };
}

export async function searchUsersByUsername(
  accessToken: string,
  params: { q: string; limit?: number; offset?: number },
): Promise<SearchUsersResponse> {
  const search = new URLSearchParams();
  search.set("q", params.q.trim());
  if (params.limit != null) search.set("limit", String(params.limit));
  if (params.offset != null) search.set("offset", String(params.offset));

  const response = await fetch(
    `${getApiBaseUrl()}/v1/users/search?${search.toString()}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const raw = (await response.json()) as RawSearchUsersResponse;
  const users = raw.users
    .map((entry) => extractApiUserPublic(entry))
    .filter((user): user is ApiUserPublic => Boolean(user));

  return {
    users,
    total: raw.total ?? users.length,
  };
}
