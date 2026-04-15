import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { AvatarBadge } from "@/components/ui/avatar-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageBackground } from "@/components/ui/page-background";
import {
  fetchNotifications,
  markNotificationRead,
} from "@/lib/api/notifications";
import { useAuth } from "@/providers/auth-provider";
import { fecaTheme } from "@/theme/feca";
import type { ApiNotification } from "@/types/api";

const timeFormatter = new Intl.DateTimeFormat("es-UY", {
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  month: "short",
});

function formatNotifTime(iso: string) {
  try {
    return timeFormatter.format(new Date(iso));
  } catch {
    return "";
  }
}

function notificationBody(n: ApiNotification): string {
  switch (n.type) {
    case "follow":
      return `${n.actor.displayName} empezó a seguirte`;
  }
}

export default function NotificationsScreen() {
  const { session } = useAuth();
  const [items, setItems] = useState<ApiNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!session?.accessToken) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetchNotifications(session.accessToken, { limit: 50 });
      setItems(res.notifications);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [session?.accessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const handleOpen = useCallback(
    (n: ApiNotification) => {
      if (!session?.accessToken) return;
      void (async () => {
        try {
          if (!n.read) {
            await markNotificationRead(n.id, session.accessToken);
            setItems((prev) =>
              prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)),
            );
          }
        } catch {
          /* ignore */
        }
        if (n.type === "follow") {
          router.push(`/user/${n.actor.id}`);
        }
      })();
    },
    [session?.accessToken],
  );

  if (!session?.accessToken) {
    return (
      <PageBackground>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} style={styles.navBtn}>
            <Ionicons color={fecaTheme.colors.onSurface} name="chevron-back" size={20} />
          </Pressable>
          <Text style={styles.title}>Notificaciones</Text>
          <View style={styles.navBtn} />
        </View>
        <EmptyState
          description="Iniciá sesión para ver avisos cuando alguien te siga."
          icon="notifications-outline"
          title="Sin sesión"
        />
      </PageBackground>
    );
  }

  return (
    <PageBackground>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.navBtn}>
          <Ionicons color={fecaTheme.colors.onSurface} name="chevron-back" size={20} />
        </Pressable>
        <Text style={styles.title}>Notificaciones</Text>
        <View style={styles.navBtn} />
      </View>

      {loading && items.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator color={fecaTheme.colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.list}
          data={items}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <EmptyState
              description="Cuando alguien te siga, vas a ver el aviso acá."
              icon="notifications-outline"
              title="Nada nuevo"
            />
          }
          refreshControl={
            <RefreshControl
              onRefresh={() => void onRefresh()}
              refreshing={refreshing}
              tintColor={fecaTheme.colors.primary}
            />
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => handleOpen(item)}
              style={[styles.row, !item.read && styles.rowUnread]}
            >
              <AvatarBadge
                accent={fecaTheme.colors.primary}
                name={item.actor.displayName}
                size={48}
              />
              <View style={styles.rowBody}>
                <Text style={styles.rowText}>{notificationBody(item)}</Text>
                <Text style={styles.rowMeta}>
                  @{item.actor.username} · {formatNotifTime(item.createdAt)}
                </Text>
              </View>
              {!item.read ? <View style={styles.dot} /> : null}
              <Ionicons
                color={fecaTheme.colors.muted}
                name="chevron-forward"
                size={18}
              />
            </Pressable>
          )}
          showsVerticalScrollIndicator={false}
        />
      )}
    </PageBackground>
  );
}

const styles = StyleSheet.create({
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: fecaTheme.spacing.lg,
    paddingTop: fecaTheme.spacing.xxl,
    paddingBottom: fecaTheme.spacing.md,
  },
  navBtn: {
    alignItems: "center",
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  title: {
    ...fecaTheme.typography.headline,
    color: fecaTheme.colors.onSurface,
    flex: 1,
    textAlign: "center",
  },
  list: {
    paddingBottom: 120,
    paddingHorizontal: fecaTheme.spacing.lg,
  },
  row: {
    alignItems: "center",
    borderRadius: fecaTheme.radii.lg,
    flexDirection: "row",
    gap: fecaTheme.spacing.md,
    marginBottom: fecaTheme.spacing.sm,
    paddingHorizontal: fecaTheme.spacing.md,
    paddingVertical: fecaTheme.spacing.md,
  },
  rowUnread: {
    backgroundColor: "rgba(81, 100, 67, 0.08)",
  },
  rowBody: {
    flex: 1,
    gap: 4,
  },
  rowText: {
    ...fecaTheme.typography.body,
    color: fecaTheme.colors.onSurface,
    lineHeight: 20,
  },
  rowMeta: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.muted,
  },
  dot: {
    backgroundColor: fecaTheme.colors.primary,
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    paddingTop: fecaTheme.spacing.xxl,
  },
});
