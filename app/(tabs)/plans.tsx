import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { Redirect, router } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FriendPublicPlanCard } from "@/components/cards/friend-public-plan-card";
import { PlanHeroCard } from "@/components/cards/plan-hero-card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageBackground } from "@/components/ui/page-background";
import { paddingBottomWithFloatingTabBar } from "@/components/ui/screen-padding";
import { TabScreenHeader } from "@/components/ui/tab-screen-header";
import { ApiRequestError } from "@/lib/api/base";
import { fetchFriendsPublicPlans, fetchMyGroups } from "@/lib/api/groups";
import {
  mapApiFriendPublicPlanSummary,
  mapApiGroupToFecaGroup,
} from "@/lib/feca/map-api-social";
import { useAuth } from "@/providers/auth-provider";
import { useUnreadNotifications } from "@/providers/unread-notifications-provider";
import { fecaTheme } from "@/theme/feca";
import type { FecaGroup, FriendPublicPlan } from "@/types/feca";

type PlanListItem =
  | { kind: "mine"; group: FecaGroup }
  | { kind: "mine-empty" }
  | { kind: "friend"; plan: FriendPublicPlan }
  | { kind: "friend-empty" }
  | { kind: "friend-error"; message: string };

type PlanSection = {
  title: string;
  data: PlanListItem[];
};

export default function PlansScreen() {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const { unreadCount } = useUnreadNotifications();
  const accessToken = session?.accessToken;
  const [groups, setGroups] = useState<FecaGroup[]>([]);
  const [friendsPlans, setFriendsPlans] = useState<FriendPublicPlan[]>([]);
  const [friendsPlansError, setFriendsPlansError] = useState<string | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!accessToken) {
      setGroups([]);
      setFriendsPlans([]);
      setFriendsPlansError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [mineRes, friendsRes] = await Promise.allSettled([
        fetchMyGroups(accessToken),
        fetchFriendsPublicPlans(accessToken, { limit: 40 }),
      ]);

      if (mineRes.status === "fulfilled") {
        setGroups(mineRes.value.groups.map(mapApiGroupToFecaGroup));
      } else {
        setGroups([]);
      }

      if (friendsRes.status === "fulfilled") {
        setFriendsPlans(
          friendsRes.value.plans.map(mapApiFriendPublicPlanSummary),
        );
        setFriendsPlansError(null);
      } else {
        setFriendsPlans([]);
        const reason = friendsRes.reason;
        setFriendsPlansError(
          ApiRequestError.is(reason)
            ? reason.message
            : reason instanceof Error
              ? reason.message
              : "No pudimos cargar los planes de tus amigos.",
        );
      }
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const sections = useMemo((): PlanSection[] => {
    const mineRows: PlanListItem[] =
      groups.length > 0
        ? groups.map((group) => ({ kind: "mine", group }))
        : !loading
          ? [{ kind: "mine-empty" }]
          : [];

    const mineIds = new Set(groups.map((g) => g.id));
    const friendFiltered = friendsPlans.filter((p) => !mineIds.has(p.id));
    const friendRows: PlanListItem[] = friendsPlansError
      ? [{ kind: "friend-error", message: friendsPlansError }]
      : friendFiltered.length > 0
        ? friendFiltered.map((plan) => ({ kind: "friend", plan }))
        : !loading
          ? [{ kind: "friend-empty" }]
          : [];

    return [
      { title: "Mis planes", data: mineRows },
      { title: "Planes de mis amigos", data: friendRows },
    ];
  }, [groups, friendsPlans, friendsPlansError, loading]);

  if (!accessToken) {
    return <Redirect href="/(onboarding)/welcome" />;
  }

  if (loading && groups.length === 0 && friendsPlans.length === 0) {
    return (
      <PageBackground>
        <TabScreenHeader
          showNotifications
          onPressNotifications={() => router.push("/notifications")}
          unreadCount={unreadCount}
        />
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Planes</Text>
            <Text style={styles.subtitle}>
              Salidas con fecha y lugar con tu gente.
            </Text>
          </View>
          <Pressable
            accessibilityLabel="Nuevo plan"
            onPress={() => router.push("/group/new")}
            style={styles.newBtn}
          >
            <Ionicons color={fecaTheme.colors.onPrimary} name="add" size={22} />
          </Pressable>
        </View>
        <View style={styles.center}>
          <ActivityIndicator color={fecaTheme.colors.primary} size="large" />
        </View>
      </PageBackground>
    );
  }

  return (
    <PageBackground>
      <TabScreenHeader
        showNotifications
        onPressNotifications={() => router.push("/notifications")}
        unreadCount={unreadCount}
      />
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Planes</Text>
          <Text style={styles.subtitle}>
            Salidas con fecha y lugar con tu gente.
          </Text>
        </View>
        <Pressable
          accessibilityLabel="Nuevo plan"
          onPress={() => router.push("/group/new")}
          style={styles.newBtn}
        >
          <Ionicons color={fecaTheme.colors.onPrimary} name="add" size={22} />
        </Pressable>
      </View>

      <SectionList
        contentContainerStyle={[
          styles.list,
          { paddingBottom: paddingBottomWithFloatingTabBar(insets.bottom) },
        ]}
        keyExtractor={(item, index) => {
          if (item.kind === "mine") return item.group.id;
          if (item.kind === "friend") return item.plan.id;
          if (item.kind === "friend-error") return "friend-error";
          return item.kind === "mine-empty"
            ? "mine-empty"
            : `friend-empty-${index}`;
        }}
        refreshControl={
          <RefreshControl
            onRefresh={() => void onRefresh()}
            refreshing={refreshing}
            tintColor={fecaTheme.colors.primary}
          />
        }
        renderItem={({ item }) => {
          if (item.kind === "mine-empty") {
            return (
              <EmptyState
                description="Creá un plan con nombre, invitá gente y proponé café o fecha. También podés unirte con un código."
                icon="people-outline"
                title="Todavía no tenés planes"
              />
            );
          }
          if (item.kind === "friend-error") {
            return (
              <View style={styles.friendErrorBanner}>
                <Ionicons
                  color={fecaTheme.colors.muted}
                  name="alert-circle-outline"
                  size={20}
                />
                <Text style={styles.friendErrorText}>{item.message}</Text>
              </View>
            );
          }
          if (item.kind === "friend-empty") {
            return (
              <EmptyState
                description="Acá aparecen planes públicos en los que participa gente que seguís."
                icon="earth-outline"
                title="Nada por acá todavía"
              />
            );
          }
          if (item.kind === "mine") {
            return <PlanHeroCard group={item.group} />;
          }
          return <FriendPublicPlanCard plan={item.plan} />;
        }}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            
          </View>
        )}
        sections={sections}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        SectionSeparatorComponent={() => <View style={styles.sectionGap} />}
        ItemSeparatorComponent={() => <View style={styles.gap} />}
      />
    </PageBackground>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: fecaTheme.spacing.md,
    justifyContent: "space-between",
    paddingBottom: fecaTheme.spacing.md,
    paddingHorizontal: fecaTheme.spacing.lg,
    paddingTop: fecaTheme.spacing.md,
  },
  title: {
    fontFamily: "Newsreader_700Bold",
    fontSize: 28,
    lineHeight: 34,
    color: fecaTheme.colors.onSurface,
  },
  subtitle: {
    ...fecaTheme.typography.body,
    color: fecaTheme.colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
    maxWidth: 280,
  },
  newBtn: {
    alignItems: "center",
    backgroundColor: fecaTheme.colors.primary,
    borderRadius: fecaTheme.radii.pill,
    height: 44,
    justifyContent: "center",
    marginTop: 4,
    width: 44,
    ...fecaTheme.elevation.ambient,
  },
  list: {
    paddingHorizontal: fecaTheme.spacing.lg,
  },
  sectionHeader: {
    marginBottom: fecaTheme.spacing.sm,
    marginTop: fecaTheme.spacing.md,
  },
  sectionTitle: {
    ...fecaTheme.typography.bodyStrong,
    color: fecaTheme.colors.onSurface,
    fontSize: 15,
  },
  sectionHint: {
    ...fecaTheme.typography.body,
    color: fecaTheme.colors.muted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: fecaTheme.spacing.xs,
  },
  sectionGap: {
    height: fecaTheme.spacing.xl,
  },
  gap: {
    height: fecaTheme.spacing.lg,
  },
  friendErrorBanner: {
    alignItems: "flex-start",
    backgroundColor: fecaTheme.colors.primaryFixed,
    borderRadius: fecaTheme.radii.md,
    flexDirection: "row",
    gap: fecaTheme.spacing.sm,
    paddingHorizontal: fecaTheme.spacing.md,
    paddingVertical: fecaTheme.spacing.md,
  },
  friendErrorText: {
    ...fecaTheme.typography.body,
    color: fecaTheme.colors.muted,
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  center: {
    paddingVertical: fecaTheme.spacing.xxxl,
  },
});
