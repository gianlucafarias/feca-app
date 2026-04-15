import { Ionicons } from "@expo/vector-icons";
import { router, type Href } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { DiaryCard } from "@/components/cards/diary-card";
import { VisitCard } from "@/components/cards/visit-card";
import { AvatarBadge } from "@/components/ui/avatar-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { RatingDistributionBars } from "@/components/profile/rating-distribution-bars";
import { PageBackground } from "@/components/ui/page-background";
import { TabScreenHeader } from "@/components/ui/tab-screen-header";
import { fetchMyDiaries } from "@/lib/api/diaries";
import { fetchMyFriends } from "@/lib/api/friends";
import { fetchMe } from "@/lib/api/me";
import { fetchMySavedPlaces } from "@/lib/api/saved";
import { fetchMyVisits } from "@/lib/api/visits";
import { mapApiDiaryToCafeDiary } from "@/lib/feca/map-api-social";
import { buildRatingBuckets } from "@/lib/visits/rating-buckets";
import { mapApiVisitToVisit } from "@/lib/visits/map-api-visit";
import { useAuth } from "@/providers/auth-provider";
import { fecaTheme } from "@/theme/feca";
import type { ApiMeUser } from "@/types/api";
import type { CafeDiary, Place, Visit } from "@/types/feca";

const HISTOGRAM_VISIT_CAP = 500;

function openPlaceFromSummary(place: Place) {
  const gid = place.googlePlaceId;
  if (gid) {
    router.push(`/place/${encodeURIComponent(gid)}`);
    return;
  }
  router.push(`/place/${encodeURIComponent(place.id)}`);
}

export default function ProfileScreen() {
  const { session, signOut } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const [meUser, setMeUser] = useState<ApiMeUser | null>(null);
  const [apiVisits, setApiVisits] = useState<Visit[]>([]);
  const [apiDiaries, setApiDiaries] = useState<CafeDiary[]>([]);
  const [savedListTotal, setSavedListTotal] = useState<number | null>(null);
  const [friendsTotal, setFriendsTotal] = useState<number | null>(null);
  const [diariesTotal, setDiariesTotal] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [meError, setMeError] = useState(false);
  const [visitsFetchFailed, setVisitsFetchFailed] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!session?.accessToken) {
      setMeUser(null);
      setApiVisits([]);
      setApiDiaries([]);
      setSavedListTotal(null);
      setFriendsTotal(null);
      setDiariesTotal(null);
      setIsLoading(false);
      return;
    }

    setMeError(false);
    setVisitsFetchFailed(false);
    setIsLoading(true);

    const token = session.accessToken;

    const [
      meResult,
      visitsResult,
      diariesResult,
      savedResult,
      friendsResult,
    ] = await Promise.allSettled([
      fetchMe(token),
      fetchMyVisits(token, { limit: 30 }),
      fetchMyDiaries(token),
      fetchMySavedPlaces(token, { limit: 1 }),
      fetchMyFriends(token, { limit: 1 }),
    ]);

    if (meResult.status === "fulfilled") {
      setMeUser(meResult.value);
      setMeError(false);
    } else {
      setMeUser(null);
      setMeError(true);
    }

    if (visitsResult.status === "fulfilled") {
      let mapped = visitsResult.value.visits.map(mapApiVisitToVisit);
      const totalVisits = visitsResult.value.total;
      if (totalVisits > mapped.length) {
        const limit = Math.min(totalVisits, HISTOGRAM_VISIT_CAP);
        if (limit > mapped.length) {
          try {
            const more = await fetchMyVisits(token, { limit });
            mapped = more.visits.map(mapApiVisitToVisit);
          } catch {
            /* keep first page */
          }
        }
      }
      setApiVisits(mapped);
      setVisitsFetchFailed(false);
    } else {
      setApiVisits([]);
      setVisitsFetchFailed(true);
    }

    if (diariesResult.status === "fulfilled") {
      setApiDiaries(diariesResult.value.diaries.map(mapApiDiaryToCafeDiary));
      setDiariesTotal(diariesResult.value.total);
    } else {
      setApiDiaries([]);
      setDiariesTotal(null);
    }

    if (savedResult.status === "fulfilled") {
      setSavedListTotal(savedResult.value.total);
    } else {
      setSavedListTotal(null);
    }

    if (friendsResult.status === "fulfilled") {
      setFriendsTotal(friendsResult.value.total);
    } else {
      setFriendsTotal(null);
    }

    setIsLoading(false);
  }, [session?.accessToken]);

  useEffect(() => {
    setIsLoading(true);
    void loadProfile();
  }, [loadProfile]);

  const displayName =
    meUser?.displayName ?? session?.user.displayName ?? "FECA";
  const username = meUser?.username ?? session?.user.username ?? "feca";
  const city = meUser?.city ?? session?.user.city ?? "";
  const neighborhood = "";
  const bio = meUser?.bio?.trim() ?? "";

  const visitsToShow = session?.accessToken ? apiVisits : [];

  const visitStat =
    meUser?.visitCount ??
    (visitsFetchFailed ? null : apiVisits.length);
  const reviewStat = visitsFetchFailed
    ? null
    : apiVisits.filter((visit) => visit.note.trim().length > 0).length;
  const savedStat = meUser?.savedCount ?? savedListTotal;
  const followingStat = meUser?.followingCount ?? friendsTotal;
  const followersStat = meUser?.followersCount;

  const diaries = session?.accessToken ? apiDiaries : [];

  const ratingSummary = useMemo(
    () => buildRatingBuckets(apiVisits),
    [apiVisits],
  );

  const visitPreview = visitsToShow.slice(0, 3);
  const diaryPreview = diaries.slice(0, 3);
  const visitExtra =
    visitStat != null && visitStat > visitPreview.length
      ? visitStat - visitPreview.length
      : 0;
  const diaryExtra =
    (diariesTotal ?? diaries.length) > diaryPreview.length
      ? (diariesTotal ?? diaries.length) - diaryPreview.length
      : 0;
  const guidesStat = diariesTotal ?? diaries.length;

  const handleSignOut = useCallback(() => {
    Alert.alert(
      "Cerrar sesión",
      "¿Salir de tu cuenta en este dispositivo?",
      [
        { style: "cancel", text: "Cancelar" },
        {
          style: "destructive",
          text: "Cerrar sesión",
          onPress: () => {
            void (async () => {
              setIsSigningOut(true);
              try {
                await signOut();
                router.replace("/(onboarding)/welcome");
              } finally {
                setIsSigningOut(false);
              }
            })();
          },
        },
      ],
    );
  }, [signOut]);

  return (
    <PageBackground>
      <ScrollView
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="never"
        refreshControl={
          <RefreshControl
            onRefresh={() => void loadProfile()}
            refreshing={isLoading}
            tintColor={fecaTheme.colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <TabScreenHeader
          showNotifications={Boolean(session?.accessToken)}
          onPressNotifications={() => router.push("/notifications")}
        />
        <View style={styles.hero}>
          <AvatarBadge
            accent={fecaTheme.colors.secondary}
            name={displayName}
            size={80}
          />
          <Text style={styles.displayName}>{displayName}</Text>
          <Text style={styles.handle}>
            @{username} · {city}
            {neighborhood ? `, ${neighborhood}` : ""}
          </Text>
          {bio ? <Text style={styles.bio}>{bio}</Text> : null}
          {meError ? (
            <Text style={styles.hint}>
              No se pudieron cargar todos los datos del servidor.
            </Text>
          ) : null}
        </View>

        <View style={styles.wrappedSection}>
          <Text style={styles.wrappedSectionLabel}>Resumen</Text>
          <View style={styles.metricRow}>
            <View style={styles.metricCell}>
              <Text style={styles.metricValue}>
                {isLoading ? "—" : followersStat ?? "—"}
              </Text>
              <Text style={styles.metricLabel}>seguidores</Text>
            </View>
            <Pressable
              onPress={() => router.push("/friends")}
              style={({ pressed }) => [
                styles.metricCell,
                pressed && styles.metricCellPressed,
              ]}
            >
              <Text style={styles.metricValue}>
                {isLoading ? "—" : followingStat ?? "—"}
              </Text>
              <Text style={styles.metricLabel}>siguiendo</Text>
            </Pressable>
          </View>
          <View style={styles.metricRow}>
            <View style={styles.metricCell}>
              <Text style={styles.metricValue}>
                {isLoading ? "—" : visitStat ?? "—"}
              </Text>
              <Text style={styles.metricLabel}>visitas</Text>
            </View>
            <View style={styles.metricCell}>
              <Text style={styles.metricValue}>
                {isLoading ? "—" : reviewStat ?? "—"}
              </Text>
              <Text style={styles.metricLabel}>reseñas</Text>
            </View>
          </View>
          <View style={styles.metricRow}>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push("/saved")}
              style={({ pressed }) => [
                styles.metricCell,
                pressed && styles.metricCellPressed,
              ]}
            >
              <Text style={styles.metricValue}>
                {isLoading ? "—" : savedStat ?? "—"}
              </Text>
              <Text style={styles.metricLabel}>guardados</Text>
            </Pressable>
            <View style={styles.metricCell}>
              <Text style={styles.metricValue}>
                {isLoading ? "—" : String(guidesStat)}
              </Text>
              <Text style={styles.metricLabel}>guías</Text>
            </View>
          </View>
        </View>

        {!isLoading && ratingSummary.totalRated > 0 ? (
          <View style={styles.histogramWrap}>
            <RatingDistributionBars
              buckets={ratingSummary.buckets}
              max={ratingSummary.max}
            />
          </View>
        ) : null}

        {session?.accessToken ? (
          <Pressable
            onPress={() => router.push("/taste" as Href)}
            style={({ pressed }) => [
              styles.tasteRow,
              pressed && styles.tasteRowPressed,
            ]}
          >
            <View style={styles.tasteRowLeft}>
              <Ionicons
                color={fecaTheme.colors.primary}
                name="color-filter-outline"
                size={22}
              />
              <View>
                <Text style={styles.tasteRowTitle}>Tu gusto</Text>
                <Text style={styles.tasteRowMeta}>
                  Preferencias que explican tus elecciones
                </Text>
              </View>
            </View>
            <Ionicons
              color={fecaTheme.colors.muted}
              name="chevron-forward"
              size={20}
            />
          </Pressable>
        ) : null}

        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Guías</Text>
            <Pressable onPress={() => router.push("/diary/new")} style={styles.addDiaryBtn}>
              <Ionicons color={fecaTheme.colors.onPrimary} name="add" size={18} />
            </Pressable>
          </View>
          {diaries.length === 0 ? (
            <EmptyState
              description="Listas públicas o compartibles, con título, intro y orden: mini guías curadas."
              icon="journal-outline"
              title="Sin guías todavía"
            />
          ) : (
            <>
              <View style={styles.diaryList}>
                {diaryPreview.map((diary) => (
                  <DiaryCard diary={diary} key={diary.id} />
                ))}
              </View>
              {diaryExtra > 0 ? (
                <Text style={styles.moreHint}>
                  +{diaryExtra} {diaryExtra === 1 ? "guía más" : "guías más"}
                </Text>
              ) : null}
            </>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Últimas visitas</Text>
          {isLoading && apiVisits.length === 0 ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={fecaTheme.colors.primary} />
            </View>
          ) : visitsFetchFailed ? (
            <EmptyState
              description="Reintentá más tarde o comprobá tu conexión."
              icon="cloud-offline-outline"
              title="No se pudieron cargar las visitas"
            />
          ) : visitsToShow.length === 0 ? (
            <EmptyState
              description="Tu primer café registrado aparece acá con nota, fecha y rating."
              icon="cafe-outline"
              title="Todavía sin visitas"
            />
          ) : (
            <>
              <View style={styles.stack}>
                {visitPreview.map((visit) => (
                  <VisitCard
                    key={visit.id}
                    item={visit}
                    mode="profile"
                    onPress={() => openPlaceFromSummary(visit.place)}
                  />
                ))}
              </View>
              {visitExtra > 0 ? (
                <Text style={styles.moreHint}>
                  +{visitExtra}{" "}
                  {visitExtra === 1 ? "visita más" : "visitas más"}
                </Text>
              ) : null}
            </>
          )}
        </View>

        {session?.accessToken ? (
          <Pressable
            accessibilityRole="button"
            disabled={isSigningOut}
            onPress={handleSignOut}
            style={({ pressed }) => [
              styles.signOutBtn,
              pressed && styles.signOutBtnPressed,
              isSigningOut && styles.signOutBtnDisabled,
            ]}
          >
            {isSigningOut ? (
              <ActivityIndicator color={fecaTheme.colors.secondary} size="small" />
            ) : (
              <Ionicons
                color={fecaTheme.colors.secondary}
                name="log-out-outline"
                size={20}
              />
            )}
            <Text style={styles.signOutLabel}>
              {isSigningOut ? "Cerrando sesión…" : "Cerrar sesión"}
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </PageBackground>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 160,
    paddingHorizontal: fecaTheme.spacing.lg,
    paddingTop: 0,
  },
  hero: {
    alignItems: "center",
    gap: fecaTheme.spacing.xs,
    paddingBottom: fecaTheme.spacing.xl,
    paddingTop: fecaTheme.spacing.md,
    position: "relative",
  },
  displayName: {
    ...fecaTheme.typography.headline,
    color: fecaTheme.colors.onSurface,
    marginTop: fecaTheme.spacing.md,
    textAlign: "center",
  },
  handle: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.muted,
    textAlign: "center",
  },
  bio: {
    ...fecaTheme.typography.body,
    color: fecaTheme.colors.onSurface,
    marginTop: fecaTheme.spacing.sm,
    maxWidth: 320,
    textAlign: "center",
  },
  hint: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.secondary,
    marginTop: fecaTheme.spacing.sm,
    textAlign: "center",
  },
  wrappedSection: {
    alignSelf: "stretch",
    gap: fecaTheme.spacing.sm,
    marginBottom: fecaTheme.spacing.lg,
  },
  wrappedSectionLabel: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.muted,
    fontSize: 11,
    letterSpacing: 1.2,
    paddingHorizontal: fecaTheme.spacing.xs,
    textTransform: "uppercase",
  },
  metricRow: {
    alignSelf: "stretch",
    flexDirection: "row",
    gap: fecaTheme.spacing.sm,
  },
  metricCell: {
    alignItems: "center",
    backgroundColor: fecaTheme.surfaces.low,
    borderRadius: fecaTheme.radii.lg,
    flex: 1,
    gap: 4,
    justifyContent: "center",
    paddingHorizontal: fecaTheme.spacing.md,
    paddingVertical: fecaTheme.spacing.lg,
  },
  metricCellPressed: {
    opacity: 0.92,
  },
  metricValue: {
    ...fecaTheme.typography.numeric,
    color: fecaTheme.colors.onSurface,
    fontSize: 24,
    lineHeight: 28,
  },
  metricLabel: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.muted,
    fontSize: 12,
  },
  moreHint: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.muted,
    paddingHorizontal: fecaTheme.spacing.sm,
    textAlign: "center",
  },
  histogramWrap: {
    marginBottom: fecaTheme.spacing.xl,
  },
  tasteRow: {
    alignItems: "center",
    backgroundColor: fecaTheme.surfaces.low,
    borderRadius: fecaTheme.radii.lg,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: fecaTheme.spacing.xl,
    paddingHorizontal: fecaTheme.spacing.lg,
    paddingVertical: fecaTheme.spacing.md,
  },
  tasteRowPressed: {
    opacity: 0.92,
  },
  tasteRowLeft: {
    alignItems: "center",
    flexDirection: "row",
    gap: fecaTheme.spacing.md,
  },
  tasteRowTitle: {
    ...fecaTheme.typography.bodyStrong,
    color: fecaTheme.colors.onSurface,
  },
  tasteRowMeta: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.muted,
    marginTop: 2,
  },
  section: {
    gap: fecaTheme.spacing.lg,
    marginBottom: fecaTheme.spacing.xl,
  },
  sectionRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: fecaTheme.spacing.xs,
  },
  sectionTitle: {
    ...fecaTheme.typography.title,
    color: fecaTheme.colors.onSurface,
    paddingHorizontal: fecaTheme.spacing.xs,
  },
  addDiaryBtn: {
    alignItems: "center",
    backgroundColor: fecaTheme.colors.primary,
    borderRadius: fecaTheme.radii.pill,
    height: 30,
    justifyContent: "center",
    width: 30,
  },
  diaryList: {
    gap: fecaTheme.spacing.sm,
  },
  stack: {
    gap: fecaTheme.spacing.lg,
  },
  loadingRow: {
    alignItems: "center",
    paddingVertical: fecaTheme.spacing.lg,
  },
  signOutBtn: {
    alignItems: "center",
    alignSelf: "stretch",
    borderColor: fecaTheme.colors.outlineVariant,
    borderRadius: fecaTheme.radii.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: fecaTheme.spacing.sm,
    justifyContent: "center",
    marginBottom: fecaTheme.spacing.xl,
    marginTop: fecaTheme.spacing.sm,
    minHeight: 48,
    paddingHorizontal: fecaTheme.spacing.lg,
  },
  signOutBtnPressed: {
    opacity: 0.88,
  },
  signOutBtnDisabled: {
    opacity: 0.65,
  },
  signOutLabel: {
    ...fecaTheme.typography.bodyStrong,
    color: fecaTheme.colors.secondary,
    fontSize: 15,
  },
});
