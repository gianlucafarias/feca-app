import type { ApiMeUser } from "@/types/api";

import { getApiBaseUrl, parseError } from "./base";

/**
 * Activa o desactiva tu rol editor (preview; sin panel de admin).
 * Respuesta alineada a GET /v1/me (`{ user }`).
 */
export async function patchMyEditor(accessToken: string, isEditor: boolean): Promise<ApiMeUser> {
  const response = await fetch(`${getApiBaseUrl()}/v1/me/editor`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ isEditor }),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data = (await response.json()) as { user: ApiMeUser };
  return data.user;
}
