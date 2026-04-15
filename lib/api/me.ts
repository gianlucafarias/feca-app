import type { ApiMeUser } from "@/types/api";

import { getApiBaseUrl, parseError } from "./base";

type MeResponse = {
  user: ApiMeUser;
  stats?: {
    followingCount?: number;
    followersCount?: number;
    savedCount?: number;
    visitCount?: number;
  };
};

export async function fetchMe(accessToken: string): Promise<ApiMeUser> {
  const response = await fetch(`${getApiBaseUrl()}/v1/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data = (await response.json()) as MeResponse;
  return {
    ...data.user,
    followingCount: data.user.followingCount ?? data.stats?.followingCount,
    followersCount: data.user.followersCount ?? data.stats?.followersCount,
    savedCount: data.user.savedCount ?? data.stats?.savedCount,
    visitCount: data.user.visitCount ?? data.stats?.visitCount,
  };
}
