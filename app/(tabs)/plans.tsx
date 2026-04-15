import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { Redirect, router } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { PlanHeroCard } from "@/components/cards/plan-hero-card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageBackground } from "@/components/ui/page-background";
import { fetchMyGroups } from "@/lib/api/groups";
import { mapApiGroupToFecaGroup } from "@/lib/feca/map-api-social";
import { useAuth } from "@/providers/auth-provider";
import { fecaTheme } from "@/theme/feca";
import type { FecaGroup } from "@/types/feca";

export default function PlansScreen() {
  const { session } = useAuth();
  const accessToken = session?.accessToken;
  const [groups, setGroups] = useState<FecaGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!accessToken) {
      setGroups([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetchMyGroups(accessToken);
      setGroups(res.groups.map(mapApiGroupToFecaGroup));
    } catch {
      setGroups([]);
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

  if (!accessToken) {
    return <Redirect href="/(onboarding)/welcome" />;
  }

  return (
    <PageBackground>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Planes</Text>
          <Text style={styles.subtitle}>Salidas con fecha y lugar con tu gente.</Text>
        </View>
        <Pressable
          accessibilityLabel="Nuevo plan"
          onPress={() => router.push("/group/new")}
          style={styles.newBtn}
        >
          <Ionicons color={fecaTheme.colors.onPrimary} name="add" size={22} />
        </Pressable>
      </View>

      {loading && groups.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator color={fecaTheme.colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.list}
          data={groups}
          ItemSeparatorComponent={() => <View style={styles.gap} />}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <EmptyState
              description="Creá un plan con nombre, invitá gente y proponé café o fecha. También podés unirte con un código."
              icon="people-outline"
              title="Todavía no tenés planes"
            />
          }
          refreshControl={
            <RefreshControl
              onRefresh={() => void onRefresh()}
              refreshing={refreshing}
              tintColor={fecaTheme.colors.primary}
            />
          }
          renderItem={({ item }) => <PlanHeroCard group={item} />}
          showsVerticalScrollIndicator={false}
        />
      )}
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
    paddingTop: fecaTheme.spacing.xxl,
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
    paddingBottom: 120,
    paddingHorizontal: fecaTheme.spacing.lg,
  },
  gap: {
    height: fecaTheme.spacing.lg,
  },
  center: {
    paddingVertical: fecaTheme.spacing.xxxl,
  },
});
