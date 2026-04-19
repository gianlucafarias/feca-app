import type { ApiUserPublic } from "@/types/api";

import { getApiBaseUrl, parseError } from "./base";

type SuggestedUsersResponse = {
  users?: unknown[];
  total?: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function extractApiUserPublic(raw: unknown): ApiUserPublic | null {
  if (!isRecord(raw)) {
    return null;
  }
  const candidate = isRecord(raw.user) ? raw.user : raw;
  const id =
    typeof candidate.id === "string"
      ? candidate.id
      : typeof candidate.id === "number" && Number.isFinite(candidate.id)
        ? String(candidate.id)
        : "";
  const username =
    typeof candidate.username === "string" ? candidate.username.trim() : "";
  const displayName =
    typeof candidate.displayName === "string" ? candidate.displayName.trim() : "";
  if (!id) {
    return null;
  }
  const safeUsername = username.length > 0 ? username : id;
  const safeDisplay = displayName.length > 0 ? displayName : safeUsername;
  return {
    id,
    username: safeUsername,
    displayName: safeDisplay,
    avatarUrl:
      typeof candidate.avatarUrl === "string" ? candidate.avatarUrl : null,
    city: typeof candidate.city === "string" ? candidate.city : null,
  };
}

/**
 * Usuarios sugeridos para seguir durante el onboarding (GET documentado en backend-api-contract).
 */
export async function fetchOnboardingSuggestedUsers(
  accessToken: string,
  options?: { limit?: number; cityGooglePlaceId?: string },
): Promise<{ users: ApiUserPublic[]; total: number }> {
  const params = new URLSearchParams();
  const limit = options?.limit ?? 6;
  params.set("limit", String(Math.min(Math.max(limit, 1), 10)));
  if (options?.cityGooglePlaceId?.trim()) {
    params.set("cityGooglePlaceId", options.cityGooglePlaceId.trim());
  }

  const url = `${getApiBaseUrl()}/v1/onboarding/suggested-users?${params.toString()}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data = (await response.json()) as SuggestedUsersResponse;
  const users = (data.users ?? [])
    .map((row) => extractApiUserPublic(row))
    .filter((u): u is ApiUserPublic => u != null);

  return { users, total: data.total ?? users.length };
}
