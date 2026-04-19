import * as Notifications from "expo-notifications";
import { useSegments } from "expo-router";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { AppState, Platform } from "react-native";

import { fetchNotifications } from "@/lib/api/notifications";
import { useAuth } from "@/providers/auth-provider";

type UnreadNotificationsContextValue = {
  unreadCount: number;
  refreshUnreadCount: () => Promise<void>;
};

const UnreadNotificationsContext =
  createContext<UnreadNotificationsContextValue | null>(null);

export function UnreadNotificationsProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const segments = useSegments();

  const refreshUnreadCount = useCallback(async () => {
    if (!session?.accessToken) {
      setUnreadCount(0);
      return;
    }
    try {
      const res = await fetchNotifications(session.accessToken, {
        limit: 1,
        unreadOnly: true,
      });
      const total = typeof res.total === "number" ? res.total : 0;
      const onPage = res.notifications.filter((n) => !n.read).length;
      setUnreadCount(Math.max(total, onPage));
    } catch {
      setUnreadCount(0);
    }
  }, [session?.accessToken]);

  useEffect(() => {
    void refreshUnreadCount();
  }, [refreshUnreadCount]);

  useEffect(() => {
    void refreshUnreadCount();
  }, [segments, refreshUnreadCount]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void refreshUnreadCount();
    });
    return () => sub.remove();
  }, [refreshUnreadCount]);

  useEffect(() => {
    const id = setInterval(() => void refreshUnreadCount(), 45_000);
    return () => clearInterval(id);
  }, [refreshUnreadCount]);

  useEffect(() => {
    if (Platform.OS === "web") return;
    const sub = Notifications.addNotificationReceivedListener(() => {
      void refreshUnreadCount();
    });
    return () => sub.remove();
  }, [refreshUnreadCount]);

  useEffect(() => {
    if (Platform.OS !== "ios") return;
    void Notifications.setBadgeCountAsync(unreadCount);
  }, [unreadCount]);

  const value = useMemo(
    () => ({ unreadCount, refreshUnreadCount }),
    [unreadCount, refreshUnreadCount],
  );

  return (
    <UnreadNotificationsContext.Provider value={value}>
      {children}
    </UnreadNotificationsContext.Provider>
  );
}

export function useUnreadNotifications(): UnreadNotificationsContextValue {
  const ctx = useContext(UnreadNotificationsContext);
  if (!ctx) {
    throw new Error(
      "useUnreadNotifications debe usarse dentro de UnreadNotificationsProvider",
    );
  }
  return ctx;
}
