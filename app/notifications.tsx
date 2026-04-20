import { Ionicons } from "@expo/vector-icons";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AvatarBadge } from "@/components/ui/avatar-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageBackground } from "@/components/ui/page-background";
import { paddingBottomStackScreen } from "@/components/ui/screen-padding";
import { StackScreenHeader } from "@/components/ui/stack-screen-header";
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/api/notifications";
import { openApiNotification } from "@/lib/notifications/open-notification-target";
import { useAuth } from "@/providers/auth-provider";
import { useUnreadNotifications } from "@/providers/unread-notifications-provider";
import { fecaTheme, hexToRgba } from "@/theme/feca";
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

function notificationFallbackText(notification: ApiNotification): string {
  const actor = notification.actor;

  switch (notification.type) {
    case "follow":
      return actor
        ? `${actor.displayName} empezo a seguirte`
        : "Alguien empezo a seguirte";
    case "group_invite":
      return actor ? `${actor.displayName} te invito a un plan` : "Te invitaron a un plan";
    case "group_joined":
      return actor ? `${actor.displayName} se unio al plan` : "Alguien se unio al plan";
    case "group_event_proposed":
      return actor ? `${actor.displayName} propuso un encuentro` : "Nuevo encuentro en un plan";
    case "group_event_rsvp":
      return actor ? `${actor.displayName} respondio al encuentro` : "Respuesta en un plan";
    case "visit_created":
      return actor ? `${actor.displayName} registro una visita` : "Nueva visita en tu red";
    case "diary_published":
      return actor ? `${actor.displayName} publico una guia` : "Nueva guia en tu red";
    case "group_invite_reminder":
      return "Tenes una invitacion pendiente";
    case "group_event_rsvp_reminder":
      return "Falta tu respuesta en un plan";
    case "group_event_today_reminder":
      return "Tenes un plan para hoy";
    case "weekly_digest":
      return "Resumen semanal disponible";
    case "contextual_recommendation":
      return "Tenemos una recomendacion para vos";
    default:
      return "Nueva notificacion";
  }
}

function primaryLines(notification: ApiNotification): {
  headline?: string;
  text: string;
} {
  const title = notification.title?.trim();
  const body = notification.body?.trim();

  if (title && body) {
    return { headline: title, text: body };
  }

  return {
    text: body || title || notificationFallbackText(notification),
  };
}

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const { refreshUnreadCount } = useUnreadNotifications();
  const [items, setItems] = useState<ApiNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markAllBusy, setMarkAllBusy] = useState(false);

  const load = useCallback(async () => {
    if (!session?.accessToken) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await fetchNotifications(session.accessToken, { limit: 50 });
      setItems(response.notifications);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
      void refreshUnreadCount();
    }
  }, [refreshUnreadCount, session?.accessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const handleMarkAllRead = useCallback(async () => {
    if (!session?.accessToken || markAllBusy) {
      return;
    }

    setMarkAllBusy(true);
    try {
      await markAllNotificationsRead(session.accessToken);
      setItems((current) => current.map((item) => ({ ...item, read: true })));
      void refreshUnreadCount();
    } catch {
      // Ignore optimistic refresh failures here.
    } finally {
      setMarkAllBusy(false);
    }
  }, [markAllBusy, refreshUnreadCount, session?.accessToken]);

  const handleOpen = useCallback(
    (notification: ApiNotification) => {
      if (!session?.accessToken) {
        return;
      }

      void (async () => {
        try {
          if (!notification.read) {
            await markNotificationRead(notification.id, session.accessToken);
            setItems((current) =>
              current.map((item) =>
                item.id === notification.id ? { ...item, read: true } : item,
              ),
            );
            void refreshUnreadCount();
          }
        } catch {
          // Ignore mark-read failures; opening the target still matters.
        }

        openApiNotification(notification);
      })();
    },
    [refreshUnreadCount, session?.accessToken],
  );

  const listPaddingBottom = paddingBottomStackScreen(insets.bottom);
  const hasUnread = items.some((item) => !item.read);

  if (!session?.accessToken) {
    return (
      <PageBackground>
        <View style={styles.flex}>
          <StackScreenHeader title="Notificaciones" />
          <EmptyState
            description="Inicia sesion para ver avisos de tu red y tus planes."
            icon="notifications-outline"
            title="Sin sesion"
          />
        </View>
      </PageBackground>
    );
  }

  return (
    <PageBackground>
      <View style={styles.flex}>
        <StackScreenHeader
          right={
            hasUnread ? (
              <Pressable
                accessibilityLabel="Marcar todas como leidas"
                accessibilityRole="button"
                disabled={markAllBusy}
                hitSlop={8}
                onPress={() => void handleMarkAllRead()}
                style={styles.markAllBtn}
              >
                <Text style={styles.markAllText}>
                  {markAllBusy ? "..." : "Todas leidas"}
                </Text>
              </Pressable>
            ) : null
          }
          title="Notificaciones"
        />

        {loading && items.length === 0 ? (
          <View style={styles.centered}>
            <ActivityIndicator color={fecaTheme.colors.primary} size="large" />
          </View>
        ) : (
          <FlatList
            contentContainerStyle={[
              styles.list,
              { paddingBottom: listPaddingBottom },
            ]}
            contentInsetAdjustmentBehavior="never"
            data={items}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={
              <EmptyState
                description="Cuando haya novedades de tu red o tus planes, las vas a ver aca."
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
            renderItem={({ item }) => {
              const { headline, text } = primaryLines(item);
              const metaActor = item.actor ? `@${item.actor.username}` : null;

              return (
                <Pressable
                  onPress={() => handleOpen(item)}
                  style={[styles.row, !item.read && styles.rowUnread]}
                >
                  {item.actor ? (
                    <AvatarBadge
                      accent={fecaTheme.colors.primary}
                      name={item.actor.displayName}
                      size={48}
                    />
                  ) : (
                    <View style={styles.iconPlaceholder}>
                      <Ionicons
                        color={fecaTheme.colors.muted}
                        name="notifications-outline"
                        size={26}
                      />
                    </View>
                  )}

                  <View style={styles.rowBody}>
                    {headline ? <Text style={styles.rowHeadline}>{headline}</Text> : null}
                    <Text style={styles.rowText}>{text}</Text>
                    <Text style={styles.rowMeta}>
                      {[metaActor, formatNotifTime(item.createdAt)]
                        .filter(Boolean)
                        .join(" / ")}
                    </Text>
                  </View>

                  {!item.read ? <View style={styles.dot} /> : null}
                  <Ionicons
                    color={fecaTheme.colors.muted}
                    name="chevron-forward"
                    size={18}
                  />
                </Pressable>
              );
            }}
            showsVerticalScrollIndicator={false}
            style={styles.listFlex}
          />
        )}
      </View>
    </PageBackground>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  listFlex: {
    flex: 1,
  },
  list: {
    paddingHorizontal: fecaTheme.spacing.lg,
  },
  markAllBtn: {
    justifyContent: "center",
    minHeight: 40,
    paddingHorizontal: fecaTheme.spacing.xs,
  },
  markAllText: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.primary,
    fontFamily: "PlusJakartaSans_600SemiBold",
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
    backgroundColor: hexToRgba(fecaTheme.colors.primary, 0.08),
  },
  rowBody: {
    flex: 1,
    gap: 4,
  },
  rowHeadline: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.onSurface,
    fontFamily: "PlusJakartaSans_600SemiBold",
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
    borderRadius: fecaTheme.radii.pill,
    height: 8,
    width: 8,
  },
  iconPlaceholder: {
    alignItems: "center",
    backgroundColor: fecaTheme.surfaces.low,
    borderRadius: 24,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
  },
});
