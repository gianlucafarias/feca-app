import type { ApiNotification } from "@/types/api";

import { getApiBaseUrl, parseError } from "./base";

type NotificationsResponse = {
  notifications: ApiNotification[];
  total: number;
};

export async function fetchNotifications(
  accessToken: string,
  params?: { limit?: number; offset?: number; unreadOnly?: boolean },
): Promise<NotificationsResponse> {
  const search = new URLSearchParams();
  if (params?.limit != null) search.set("limit", String(params.limit));
  if (params?.offset != null) search.set("offset", String(params.offset));
  if (params?.unreadOnly) search.set("unreadOnly", "1");
  const qs = search.toString();
  const url = `${getApiBaseUrl()}/v1/me/notifications${qs ? `?${qs}` : ""}`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return (await response.json()) as NotificationsResponse;
}

export async function markNotificationRead(
  notificationId: string,
  accessToken: string,
): Promise<void> {
  const response = await fetch(
    `${getApiBaseUrl()}/v1/me/notifications/${encodeURIComponent(notificationId)}/read`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!response.ok) {
    throw new Error(await parseError(response));
  }
}

export async function markAllNotificationsRead(
  accessToken: string,
): Promise<void> {
  const response = await fetch(
    `${getApiBaseUrl()}/v1/me/notifications/read-all`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!response.ok) {
    throw new Error(await parseError(response));
  }
}
