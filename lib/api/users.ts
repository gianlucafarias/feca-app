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

function parseUserId(raw: unknown): string {
  if (typeof raw === "string" && raw.length > 0) {
    return raw;
  }
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return String(raw);
  }
  return "";
}

function extractApiUserPublic(raw: unknown): ApiUserPublic | null {
  if (!isRecord(raw)) return null;

  const candidate = isRecord(raw.user) ? raw.user : raw;
  const id = parseUserId(candidate.id);
  const username =
    typeof candidate.username === "string" ? candidate.username.trim() : "";
  const displayName =
    typeof candidate.displayName === "string" ? candidate.displayName.trim() : "";

  if (!id) {
    return null;
  }

  const safeUsername = username.length > 0 ? username : id;
  const safeDisplay =
    displayName.length > 0 ? displayName : safeUsername;

  return {
    id,
    username: safeUsername,
    displayName: safeDisplay,
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

  const raw: Record<string, unknown> = isRecord(data.user) ? data.user : {};
  const num = (key: string) => {
    const v = raw[key];
    return typeof v === "number" ? v : undefined;
  };

  return {
    ...user,
    email: typeof raw.email === "string" ? raw.email : undefined,
    bio:
      raw.bio === null
        ? null
        : typeof raw.bio === "string"
          ? raw.bio
          : undefined,
    city: typeof raw.city === "string" ? raw.city : user.city,
    cityGooglePlaceId:
      raw.cityGooglePlaceId === null
        ? null
        : typeof raw.cityGooglePlaceId === "string"
          ? raw.cityGooglePlaceId
          : undefined,
    lat: num("lat"),
    lng: num("lng"),
    followersCount: num("followersCount") ?? data.stats?.followersCount,
    followingCount: num("followingCount") ?? data.stats?.followingCount,
    savedCount: num("savedCount") ?? data.stats?.savedCount,
    visitCount: num("visitCount") ?? data.stats?.visitCount,
    isFollowing: Boolean(data.social?.following),
  };
}

/** Alineado al backend: `q` debe tener al menos 2 caracteres útiles. */
const MIN_USER_SEARCH_LEN = 2;

export async function searchUsersByUsername(
  accessToken: string,
  params: { q: string; limit?: number; offset?: number },
): Promise<SearchUsersResponse> {
  const q = params.q.trim();
  if (q.length < MIN_USER_SEARCH_LEN) {
    return { users: [], total: 0 };
  }

  const search = new URLSearchParams();
  search.set("q", q);
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
