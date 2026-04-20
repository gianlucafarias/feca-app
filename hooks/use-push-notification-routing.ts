import * as Notifications from "expo-notifications";
import { useEffect, useRef } from "react";
import { Platform } from "react-native";

import { markNotificationRead } from "@/lib/api/notifications";
import { openNotificationDeepLink } from "@/lib/notifications/open-notification-target";
import { useAuth } from "@/providers/auth-provider";
import { useUnreadNotifications } from "@/providers/unread-notifications-provider";

export function usePushNotificationRouting() {
  const { isHydrating, session } = useAuth();
  const { refreshUnreadCount } = useUnreadNotifications();
  const handledKeysRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (Platform.OS === "web" || isHydrating) {
      return;
    }

    let cancelled = false;

    const handleResponse = async (
      response: Notifications.NotificationResponse | null,
    ) => {
      if (!response || cancelled) {
        return;
      }

      if (!session?.accessToken) {
        return;
      }

      const key = getNotificationResponseKey(response);
      if (handledKeysRef.current.has(key)) {
        return;
      }
      handledKeysRef.current.add(key);

      const data = response.notification.request.content.data;
      const notificationId = readNotificationDataString(data, "notificationId");
      const deepLink = readNotificationDataString(data, "deepLink");

      if (notificationId) {
        try {
          await markNotificationRead(notificationId, session.accessToken);
        } catch {
          // Ignore mark-read errors; navigation should still happen.
        }
      }

      await refreshUnreadCount();
      openNotificationDeepLink(deepLink);
    };

    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        void handleResponse(response);
      },
    );

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      void handleResponse(response);
    });

    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, [isHydrating, refreshUnreadCount, session?.accessToken]);
}

function getNotificationResponseKey(response: Notifications.NotificationResponse) {
  const data = response.notification.request.content.data;
  return (
    readNotificationDataString(data, "notificationId") ??
    response.notification.request.identifier
  );
}

function readNotificationDataString(data: unknown, key: string) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return undefined;
  }

  const value = (data as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}
