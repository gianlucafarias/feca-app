import { getApiBaseUrl, parseError } from "./base";

/** Contrato nuevo: solo `{ "following": boolean }`. Se tolera `social.following` legacy. */
type FollowResponse = {
  following?: boolean;
  social?: {
    following?: boolean;
  };
};

export async function followUser(
  userId: string,
  accessToken: string,
): Promise<boolean> {
  const response = await fetch(
    `${getApiBaseUrl()}/v1/users/${encodeURIComponent(userId)}/follow`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    },
  );

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const raw = await response.json().catch(() => ({}));
  const data = raw as FollowResponse;
  const explicit = data.following ?? data.social?.following;
  if (typeof explicit === "boolean") {
    return explicit;
  }
  return true;
}

export async function unfollowUser(
  userId: string,
  accessToken: string,
): Promise<boolean> {
  const response = await fetch(
    `${getApiBaseUrl()}/v1/users/${encodeURIComponent(userId)}/follow`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const raw = await response.json().catch(() => ({}));
  const data = raw as FollowResponse;
  const explicit = data.following ?? data.social?.following;
  if (typeof explicit === "boolean") {
    return explicit;
  }
  return false;
}
