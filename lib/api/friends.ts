import type { ApiUserPublic } from "@/types/api";

import { getApiBaseUrl, parseError } from "./base";

type FriendsResponse = {
  friends: ApiUserPublic[];
  total: number;
};

const MAX_USER_LIST_LIMIT = 50;

type UserListPayload = {
  users?: unknown[];
  friends?: unknown[];
  following?: unknown[];
  total?: number;
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

function normalizeUserList(data: UserListPayload): {
  users: ApiUserPublic[];
  total: number;
} {
  const source = data.users ?? data.friends ?? data.following ?? [];
  const users = source
    .map((entry) => extractApiUserPublic(entry))
    .filter((user): user is ApiUserPublic => Boolean(user));

  return { users, total: data.total ?? users.length };
}

function clampLimit(limit?: number): number | undefined {
  if (limit == null) return undefined;
  return Math.min(Math.max(limit, 1), MAX_USER_LIST_LIMIT);
}

function buildUserListQuery(params?: {
  q?: string;
  limit?: number;
  offset?: number;
}): string {
  const search = new URLSearchParams();
  if (params?.q) search.set("q", params.q);
  const lim = clampLimit(params?.limit);
  if (lim != null) search.set("limit", String(lim));
  if (params?.offset != null) search.set("offset", String(params.offset));
  return search.toString();
}

export async function fetchMyFollowing(
  accessToken: string,
  params?: { q?: string; limit?: number; offset?: number },
): Promise<{ users: ApiUserPublic[]; total: number }> {
  const qs = buildUserListQuery(params);
  const url = `${getApiBaseUrl()}/v1/me/following${qs ? `?${qs}` : ""}`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const raw = (await response.json()) as UserListPayload;
  return normalizeUserList(raw);
}

/**
 * Listado para invitar a planes / UI “amigos”.
 * El contrato documentado es `GET /v1/me/friends`; si no existe en el servidor,
 * se usa `GET /v1/me/following` como respaldo.
 */
export async function fetchMyFriends(
  accessToken: string,
  params?: { q?: string; limit?: number; offset?: number },
): Promise<FriendsResponse> {
  const qs = buildUserListQuery(params);
  const base = `${getApiBaseUrl()}/v1/me/friends${qs ? `?${qs}` : ""}`;

  const friendsRes = await fetch(base, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (friendsRes.ok) {
    const raw = (await friendsRes.json()) as UserListPayload;
    let { users, total } = normalizeUserList(raw);
    if (users.length === 0) {
      try {
        const alt = await fetchMyFollowing(accessToken, params);
        if (alt.users.length > 0) {
          users = alt.users;
          total = alt.total;
        }
      } catch {
        /* mantener lista vacía */
      }
    }
    return { friends: users, total };
  }

  if (
    friendsRes.status === 404 ||
    friendsRes.status === 405 ||
    friendsRes.status === 501
  ) {
    const { users, total } = await fetchMyFollowing(accessToken, params);
    return { friends: users, total };
  }

  throw new Error(await parseError(friendsRes));
}
