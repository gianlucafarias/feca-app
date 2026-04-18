import type {
  AuthLoginResult,
  AuthSession,
  AuthenticatedUser,
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

/**
 * Asegura lat/lng numéricos y acepta alias snake_case del backend en PATCH/GET.
 */
export function normalizeAuthenticatedUser(user: AuthenticatedUser): AuthenticatedUser {
  const raw = user as AuthenticatedUser & Record<string, unknown>;
  const lat =
    raw.lat != null && Number.isFinite(Number(raw.lat))
      ? Number(raw.lat)
      : undefined;
  const lng =
    raw.lng != null && Number.isFinite(Number(raw.lng))
      ? Number(raw.lng)
      : undefined;
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
  return {
    ...user,
    city: cityFromRaw ?? user.city,
    cityGooglePlaceId: cityGooglePlaceId ?? user.cityGooglePlaceId,
    lat,
    lng,
  };
}

function normalizeSession(session: AuthSession): AuthSession {
  return { ...session, user: normalizeAuthenticatedUser(session.user) };
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

  const data = (await response.json()) as AuthLoginResult;
  return {
    ...data,
    session: normalizeSession(data.session),
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

  const payload = (await response.json()) as { user: Record<string, unknown> };
  return payload.user;
}
