import type {
  AuthLoginResult,
  AuthSession,
  AuthenticatedUser,
  UpdateMyProfileInput,
} from "@/types/auth";

type ErrorPayload = {
  message?: string;
};

/** Asegura lat/lng numéricos (JSON/Prisma a veces llegan como string). */
function normalizeAuthenticatedUser(user: AuthenticatedUser): AuthenticatedUser {
  const lat =
    user.lat != null && Number.isFinite(Number(user.lat))
      ? Number(user.lat)
      : undefined;
  const lng =
    user.lng != null && Number.isFinite(Number(user.lng))
      ? Number(user.lng)
      : undefined;
  return { ...user, lat, lng };
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
) {
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

  const payload = (await response.json()) as { user: AuthenticatedUser };
  return normalizeAuthenticatedUser(payload.user);
}
