import type { ApiDiary } from "@/types/api";

import { getApiBaseUrl, parseError } from "./base";

export type EditorGuidesResponse = {
  diaries: ApiDiary[];
  total: number;
};

export async function fetchHomeEditorGuides(
  accessToken: string,
  options?: { limit?: number },
): Promise<EditorGuidesResponse> {
  const limit = options?.limit ?? 20;
  const qs = new URLSearchParams({ limit: String(limit) });
  const response = await fetch(
    `${getApiBaseUrl()}/v1/home/editor-guides?${qs.toString()}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return (await response.json()) as EditorGuidesResponse;
}
