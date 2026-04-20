import * as Linking from "expo-linking";
import { router, type Href } from "expo-router";

import type { ApiNotification } from "@/types/api";

export function openNotificationDeepLink(deepLink?: string | null) {
  const normalized = deepLink?.trim();
  if (!normalized) {
    return false;
  }

  if (normalized.startsWith("/")) {
    router.push(normalized as Href);
    return true;
  }

  if (
    normalized.startsWith("http://") ||
    normalized.startsWith("https://")
  ) {
    void Linking.openURL(normalized);
    return true;
  }

  return false;
}

export function openApiNotification(notification: ApiNotification) {
  if (openNotificationDeepLink(notification.deepLink)) {
    return;
  }

  if (notification.type === "follow" && notification.actor) {
    router.push(`/user/${notification.actor.id}` as Href);
  }
}
