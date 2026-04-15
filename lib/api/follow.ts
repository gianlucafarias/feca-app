import { getApiBaseUrl, parseError } from "./base";

type FollowResponse = {
  following: boolean;
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

  const data = (await response.json()) as FollowResponse;
  return Boolean(data.following ?? data.social?.following);
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

  const data = (await response.json()) as FollowResponse;
  return Boolean(data.following ?? data.social?.following);
}
