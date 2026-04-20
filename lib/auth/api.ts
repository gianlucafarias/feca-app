import type { ApiOutingPreferencesV1 } from "@/types/api";
import type {
  AuthSession,
  AuthenticatedUser,
  GroupInvitePolicy,
  UpdateMyProfileInput,
} from "@/types/auth";

type ErrorPayload = {
  message?: string;
};

/** Entradas del PATCH sin null/undefined para no pisar la sesión con huecos. */
export function pickDefinedRecord(
  r: Record<string, unknown>,
): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(r)) {
    if (v !== undefined && v !== null) {
      o[k] = v;
    }
  }
  return o;
}

function pickLatLng(raw: Record<string, unknown>): {
  lat?: number;
  lng?: number;
} {
  const lat =
    raw.lat != null && Number.isFinite(Number(raw.lat))
      ? Number(raw.lat)
      : raw.latitude != null && Number.isFinite(Number(raw.latitude))
        ? Number(raw.latitude)
        : undefined;
  const lng =
    raw.lng != null && Number.isFinite(Number(raw.lng))
      ? Number(raw.lng)
      : raw.longitude != null && Number.isFinite(Number(raw.longitude))
        ? Number(raw.longitude)
        : undefined;
  return { lat, lng };
}

/**
 * Asegura lat/lng numéricos y acepta alias snake_case / latitude del backend en PATCH/GET.
 */
export function normalizeAuthenticatedUser(user: AuthenticatedUser): AuthenticatedUser {
  const raw = user as AuthenticatedUser & Record<string, unknown>;
  const { lat, lng } = pickLatLng(raw);
  const cityGooglePlaceId =
    typeof raw.cityGooglePlaceId === "string"
      ? raw.cityGooglePlaceId
      : typeof raw.city_google_place_id === "string"
        ? raw.city_google_place_id
        : undefined;
  const cityFromRaw =
    typeof raw.city === "string"
      ? raw.city
      : raw.city != null
        ? String(raw.city)
        : undefined;
  const groupInvitePolicyRaw =
    typeof raw.groupInvitePolicy === "string"
      ? raw.groupInvitePolicy
      : typeof raw.group_invite_policy === "string"
        ? raw.group_invite_policy
        : undefined;
  const groupInvitePolicy: GroupInvitePolicy | undefined =
    groupInvitePolicyRaw === "from_following_only" ||
    groupInvitePolicyRaw === "everyone"
      ? groupInvitePolicyRaw
      : user.groupInvitePolicy;
  const pushEnabledRaw = readBooleanish(
    raw.pushEnabled ?? raw.push_enabled,
  );

  const outingRaw = raw.outingPreferences;
  let outingPreferences: ApiOutingPreferencesV1 | null | undefined;
  if (outingRaw === null) {
    outingPreferences = null;
  } else if (outingRaw && typeof outingRaw === "object" && !Array.isArray(outingRaw)) {
    outingPreferences = outingRaw as ApiOutingPreferencesV1;
  } else {
    outingPreferences = user.outingPreferences;
  }

  const isEditor =
    typeof raw.isEditor === "boolean"
      ? raw.isEditor
      : typeof raw.is_editor === "boolean"
        ? raw.is_editor
        : user.isEditor;
  const isAdmin =
    typeof raw.isAdmin === "boolean"
      ? raw.isAdmin
      : typeof raw.is_admin === "boolean"
        ? raw.is_admin
        : user.isAdmin;

  let bio: string | null | undefined = user.bio;
  if (raw.bio === null) {
    bio = null;
  } else if (typeof raw.bio === "string") {
    bio = raw.bio;
  }

  const visitCountRaw = raw.visitCount ?? raw.visit_count;
  const visitCountPatched =
    typeof visitCountRaw === "number" && Number.isFinite(visitCountRaw)
      ? visitCountRaw
      : undefined;
  const visitCount =
    visitCountPatched !== undefined ? visitCountPatched : user.visitCount;

  return {
    ...user,
    bio,
    city: cityFromRaw ?? user.city,
    cityGooglePlaceId: cityGooglePlaceId ?? user.cityGooglePlaceId,
    lat,
    lng,
    ...(groupInvitePolicy !== undefined ? { groupInvitePolicy } : {}),
    ...(pushEnabledRaw !== undefined ? { pushEnabled: pushEnabledRaw } : {}),
    ...(outingPreferences !== undefined ? { outingPreferences } : {}),
    ...(isEditor !== undefined ? { isEditor } : {}),
    ...(isAdmin !== undefined ? { isAdmin } : {}),
    ...(visitCount !== undefined ? { visitCount } : {}),
  };
}

/**
 * Tras PATCH /v1/me, el backend a veces devuelve un `user` parcial.
 * Los campos enviados en el body deben ganar para que el feed y “cerca” usen la ciudad nueva.
 */
export function mergeAuthenticatedUserAfterProfilePatch(
  current: AuthenticatedUser,
  patchRaw: Record<string, unknown> | undefined | null,
  input: UpdateMyProfileInput,
): AuthenticatedUser {
  const patch = pickDefinedRecord(patchRaw ?? {});
  const merged = normalizeAuthenticatedUser({
    ...current,
    ...patch,
  } as AuthenticatedUser);
  const overlay: Partial<AuthenticatedUser> = {};
  if (input.city !== undefined) overlay.city = input.city;
  if (input.cityGooglePlaceId !== undefined) {
    overlay.cityGooglePlaceId = input.cityGooglePlaceId;
  }
  if (input.displayName !== undefined) overlay.displayName = input.displayName;
  if (input.username !== undefined) overlay.username = input.username;
  if (input.bio !== undefined) overlay.bio = input.bio;
  if (input.lat !== undefined) overlay.lat = input.lat;
  if (input.lng !== undefined) overlay.lng = input.lng;
  if (input.groupInvitePolicy !== undefined) {
    overlay.groupInvitePolicy = input.groupInvitePolicy;
  }
  if (input.pushEnabled !== undefined) {
    overlay.pushEnabled = input.pushEnabled;
  }
  if (input.outingPreferences !== undefined) {
    overlay.outingPreferences = input.outingPreferences;
  }
  return normalizeAuthenticatedUser({ ...merged, ...overlay });
}

function normalizeSession(session: AuthSession): AuthSession {
  return {
    ...session,
    user: normalizeAuthenticatedUser(session.user),
    extendedOnboarding: session.extendedOnboarding,
    pendingExtendedOnboarding: session.pendingExtendedOnboarding,
  };
}

function readBooleanish(value: unknown): boolean | undefined {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    if (value === "true" || value === "1") {
      return true;
    }
    if (value === "false" || value === "0") {
      return false;
    }
  }
  return undefined;
}

function readIsNewUserFromAuthPayload(
  raw: Record<string, unknown>,
  depth = 0,
): boolean {
  if (depth > 4) {
    return false;
  }
  const direct = readBooleanish(raw.isNewUser ?? raw.is_new_user);
  if (direct !== undefined) {
    return direct;
  }
  const data = raw.data;
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return readIsNewUserFromAuthPayload(data as Record<string, unknown>, depth + 1);
  }
  return false;
}

function readSessionFromAuthPayload(raw: Record<string, unknown>): AuthSession {
  const sessionUnknown =
    raw.session ??
    (raw.data && typeof raw.data === "object" && !Array.isArray(raw.data)
      ? (raw.data as Record<string, unknown>).session
      : undefined);
  if (!sessionUnknown || typeof sessionUnknown !== "object") {
    throw new Error("Auth response did not include a session");
  }
  return normalizeSession(sessionUnknown as AuthSession);
}

function getApiBaseUrl() {
  const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();

  if (!baseUrl) {
    throw new Error("EXPO_PUBLIC_API_BASE_URL is not configured");
  }

  return baseUrl.replace(/\/+$/, "");
}

async function parseError(response: Response) {
  try {
    const payload = (await response.json()) as ErrorPayload;
    return payload.message ?? `Request failed with status ${response.status}`;
  } catch {
    return `Request failed with status ${response.status}`;
  }
}

export async function loginWithGoogleIdToken(idToken: string) {
  const response = await fetch(`${getApiBaseUrl()}/v1/auth/google/mobile`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ idToken }),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const raw = (await response.json()) as Record<string, unknown>;
  const isNewUser = readIsNewUserFromAuthPayload(raw);
  const session = readSessionFromAuthPayload(raw);
  return {
    isNewUser,
    session,
  };
}

export async function logoutWithRefreshToken(refreshToken: string) {
  const response = await fetch(`${getApiBaseUrl()}/v1/auth/logout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }
}

export async function refreshAuthSession(refreshToken: string) {
  const response = await fetch(`${getApiBaseUrl()}/v1/auth/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const payload = (await response.json()) as { session: AuthSession };
  return normalizeSession(payload.session);
}

export async function deleteMyAccount(accessToken: string): Promise<void> {
  const response = await fetch(`${getApiBaseUrl()}/v1/me`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }
}

export async function updateMyProfile(
  accessToken: string,
  input: UpdateMyProfileInput,
): Promise<Record<string, unknown>> {
  const response = await fetch(`${getApiBaseUrl()}/v1/me`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const payload = (await response.json()) as Record<string, unknown>;
  const nested =
    payload.data && typeof payload.data === "object"
      ? (payload.data as Record<string, unknown>)
      : null;
  const user = (payload.user ?? nested?.user) as Record<string, unknown> | undefined;
  return user && typeof user === "object" ? user : {};
}
