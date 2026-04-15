import { useCallback, useEffect, useMemo, useState } from "react";

import { Ionicons } from "@expo/vector-icons";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { DiaryCard } from "@/components/cards/diary-card";
import { VisitCard } from "@/components/cards/visit-card";
import { RatingDistributionBars } from "@/components/profile/rating-distribution-bars";
import { AvatarBadge } from "@/components/ui/avatar-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageBackground } from "@/components/ui/page-background";
import { ReviewDetailSheet } from "@/components/ui/review-detail-sheet";
import { fetchUserDiaries } from "@/lib/api/diaries";
import { followUser, unfollowUser } from "@/lib/api/follow";
import { fetchUserVisits } from "@/lib/api/visits";
import { fetchUserById } from "@/lib/api/users";
import { mapApiDiaryToCafeDiary } from "@/lib/feca/map-api-social";
import { buildRatingBuckets } from "@/lib/visits/rating-buckets";
import { mapApiVisitToVisit } from "@/lib/visits/map-api-visit";
import type { ApiUserPublicProfile } from "@/types/api";
import { useAuth } from "@/providers/auth-provider";
import { fecaTheme } from "@/theme/feca";
import type { CafeDiary, User, Visit } from "@/types/feca";

const HISTOGRAM_VISIT_CAP = 500;

function mapApiUserToUser(u: ApiUserPublicProfile): User {
  return {
    id: u.id,
    username: u.username,
    displayName: u.displayName,
    city: u.city ?? "",
    neighborhood: undefined,
    bio: u.bio ?? "",
    followingCount: u.followingCount ?? 0,
    followersCount: u.followersCount,
    savedCount: u.savedCount ?? 0,
    visitCount: u.visitCount ?? 0,
  };
}

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const accessToken = session?.accessToken;

  const [user, setUser] = useState<User | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [diaries, setDiaries] = useState<CafeDiary[]>([]);
  const [diariesTotal, setDiariesTotal] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [visitsFetchFailed, setVisitsFetchFailed] = useState(false);

  const [reviewVisit, setReviewVisit] = useState<Visit | null>(null);

  const loadUser = useCallback(async () => {
    if (!id) {
      setUser(null);
      setVisits([]);
      setDiaries([]);
      setDiariesTotal(null);
      setNotFound(true);
      setIsLoading(false);
      return;
    }

    setNotFound(false);
    setVisitsFetchFailed(false);

    if (!accessToken) {
      setUser(null);
      setVisits([]);
      setDiaries([]);
      setDiariesTotal(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const apiUser = await fetchUserById(id, accessToken);
      setUser(mapApiUserToUser(apiUser));
      setIsFollowing(Boolean(apiUser.isFollowing));

      try {
        const first = await fetchUserVisits(id, accessToken, {
          limit: 30,
        });
        let mapped = first.visits.map(mapApiVisitToVisit);
        const totalVisits = first.total;
        if (totalVisits > mapped.length) {
          const limit = Math.min(totalVisits, HISTOGRAM_VISIT_CAP);
          if (limit > mapped.length) {
            try {
              const more = await fetchUserVisits(id, accessToken, {
                limit,
              });
              mapped = more.visits.map(mapApiVisitToVisit);
            } catch {
              /* keep first page */
            }
          }
        }
        setVisits(mapped);
        setVisitsFetchFailed(false);
      } catch {
        setVisits([]);
        setVisitsFetchFailed(true);
      }

      try {
        const diaryResponse = await fetchUserDiaries(id, accessToken);
        setDiaries(diaryResponse.diaries.map(mapApiDiaryToCafeDiary));
        setDiariesTotal(diaryResponse.total);
      } catch {
        setDiaries([]);
        setDiariesTotal(null);
      }
    } catch {
      setUser(null);
      setNotFound(true);
    } finally {
      setIsLoading(false);
    }
  }, [
    accessToken,
    id,
  ]);

  useEffect(() => {
    void loadUser();
  }, [loadUser]);

  const ratingSummary = useMemo(
    () => buildRatingBuckets(visits),
    [visits],
  );

  if (!accessToken) {
    return <Redirect href="/(onboarding)/welcome" />;
  }

  if (isLoading) {
    return (
      <PageBackground>
        <View style={styles.loadingFull}>
          <ActivityIndicator color={fecaTheme.colors.primary} size="large" />
        </View>
      </PageBackground>
    );
  }

  if (notFound || !user) {
    return (
      <PageBackground>
        <View style={styles.notFound}>
          <Pressable onPress={() => router.back()} style={styles.navBtn}>
            <Ionicons color={fecaTheme.colors.onSurface} name="chevron-back" size={20} />
          </Pressable>
          <EmptyState
            description="Este perfil no existe o fue eliminado."
            icon="person-outline"
            title="Usuario no encontrado"
          />
        </View>
      </PageBackground>
    );
  }

  const isMe =
    session?.user.id === user.id ||
    user.id === "me";

  const visitStat = user.visitCount > 0 ? user.visitCount : visits.length;
  const reviewStat = visitsFetchFailed
    ? null
    : visits.filter((visit) => visit.note.trim().length > 0).length;
  const guidesStat = diariesTotal ?? diaries.length;
  const visitPreview = visits.slice(0, 3);
  const diaryPreview = diaries.slice(0, 3);
  const visitExtra =
    visitStat > visitPreview.length ? visitStat - visitPreview.length : 0;
  const diaryExtra =
    guidesStat > diaryPreview.length ? guidesStat - diaryPreview.length : 0;

  return (
    <PageBackground>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.navBtn}>
          <Ionicons color={fecaTheme.colors.onSurface} name="chevron-back" size={20} />
        </Pressable>
        <Text numberOfLines={1} style={styles.topTitle}>
          @{user.username}
        </Text>
        <View style={styles.navBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <AvatarBadge
            accent={fecaTheme.colors.secondary}
            name={user.displayName}
            size={80}
          />
          <Text style={styles.displayName}>{user.displayName}</Text>
          <Text style={styles.handle}>
            @{user.username} · {user.city}
            {user.neighborhood ? `, ${user.neighborhood}` : ""}
          </Text>
          {user.bio ? (
            <Text style={styles.bio}>{user.bio}</Text>
          ) : null}
        </View>

        <View style={styles.wrappedSection}>
          <Text style={styles.wrappedSectionLabel}>Resumen</Text>
          <View style={styles.metricRow}>
            <View style={styles.metricCell}>
              <Text style={styles.metricValue}>
                {user.followersCount ?? "—"}
              </Text>
              <Text style={styles.metricLabel}>seguidores</Text>
            </View>
            <View style={styles.metricCell}>
              <Text style={styles.metricValue}>{user.followingCount}</Text>
              <Text style={styles.metricLabel}>siguiendo</Text>
            </View>
          </View>
          <View style={styles.metricRow}>
            <View style={styles.metricCell}>
              <Text style={styles.metricValue}>{visitStat}</Text>
              <Text style={styles.metricLabel}>visitas</Text>
            </View>
            <View style={styles.metricCell}>
              <Text style={styles.metricValue}>{reviewStat ?? "—"}</Text>
              <Text style={styles.metricLabel}>reseñas</Text>
            </View>
          </View>
          <View style={styles.metricRow}>
            <View style={styles.metricCell}>
              <Text style={styles.metricValue}>{user.savedCount}</Text>
              <Text style={styles.metricLabel}>guardados</Text>
            </View>
            <View style={styles.metricCell}>
              <Text style={styles.metricValue}>{guidesStat}</Text>
              <Text style={styles.metricLabel}>guías</Text>
            </View>
          </View>
        </View>

        {!isMe && session?.accessToken ? (
          <Pressable
            disabled={followBusy}
            onPress={() => {
              if (!accessToken || !user) return;
              setFollowBusy(true);
              void (async () => {
                try {
                  if (isFollowing) {
                    await unfollowUser(user.id, accessToken);
                    setIsFollowing(false);
                  } else {
                    await followUser(user.id, accessToken);
                    setIsFollowing(true);
                  }
                  const fresh = await fetchUserById(user.id, accessToken);
                  setUser(mapApiUserToUser(fresh));
                  setIsFollowing(Boolean(fresh.isFollowing));
                } finally {
                  setFollowBusy(false);
                }
              })();
            }}
            style={[styles.followBtn, isFollowing && styles.followBtnOutline]}
          >
            <Ionicons
              color={isFollowing ? fecaTheme.colors.primary : fecaTheme.colors.onPrimary}
              name={isFollowing ? "checkmark" : "person-add-outline"}
              size={16}
            />
            <Text
              style={[
                styles.followBtnText,
                isFollowing && styles.followBtnTextOutline,
              ]}
            >
              {followBusy ? "…" : isFollowing ? "Siguiendo" : "Seguir"}
            </Text>
          </Pressable>
        ) : null}

        {ratingSummary.totalRated > 0 ? (
          <View style={styles.histogramWrap}>
            <RatingDistributionBars
              buckets={ratingSummary.buckets}
              max={ratingSummary.max}
            />
          </View>
        ) : null}

        {diaries.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Guías</Text>
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
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Últimas visitas</Text>
          {visits.length === 0 ? (
            <EmptyState
              description={`${user.displayName} todavía no tiene visitas registradas.`}
              icon="cafe-outline"
              title="Sin visitas"
            />
          ) : (
            <>
              <View style={styles.stack}>
                {visitPreview.map((visit) => (
                  <VisitCard
                    key={visit.id}
                    item={visit}
                    mode="profile"
                    onPress={() => setReviewVisit(visit)}
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
      </ScrollView>

      <ReviewDetailSheet
        onClose={() => setReviewVisit(null)}
        showPlaceLink
        visible={reviewVisit !== null}
        visit={reviewVisit}
      />
    </PageBackground>
  );
}

const styles = StyleSheet.create({
  loadingFull: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingTop: fecaTheme.spacing.xxl,
  },
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: fecaTheme.spacing.md,
    paddingTop: fecaTheme.spacing.xxl,
    paddingBottom: fecaTheme.spacing.sm,
  },
  navBtn: {
    alignItems: "center",
    backgroundColor: fecaTheme.surfaces.low,
    borderRadius: fecaTheme.radii.pill,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  topTitle: {
    ...fecaTheme.typography.bodyStrong,
    color: fecaTheme.colors.muted,
    fontSize: 14,
    flex: 1,
    textAlign: "center",
  },
  content: {
    paddingBottom: 120,
    paddingHorizontal: fecaTheme.spacing.lg,
  },
  notFound: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: fecaTheme.spacing.lg,
    paddingTop: fecaTheme.spacing.xxl,
    gap: fecaTheme.spacing.xl,
  },
  hero: {
    alignItems: "center",
    gap: fecaTheme.spacing.xs,
    paddingBottom: fecaTheme.spacing.xl,
    paddingTop: fecaTheme.spacing.lg,
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
    maxWidth: 300,
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
  histogramWrap: {
    marginBottom: fecaTheme.spacing.xl,
  },
  moreHint: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.muted,
    paddingHorizontal: fecaTheme.spacing.sm,
    textAlign: "center",
  },
  followBtn: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: fecaTheme.colors.primary,
    borderRadius: fecaTheme.radii.pill,
    flexDirection: "row",
    gap: fecaTheme.spacing.xs,
    marginBottom: fecaTheme.spacing.xl,
    paddingHorizontal: fecaTheme.spacing.lg,
    paddingVertical: fecaTheme.spacing.sm,
  },
  followBtnText: {
    ...fecaTheme.typography.bodyStrong,
    color: fecaTheme.colors.onPrimary,
    fontSize: 14,
  },
  followBtnOutline: {
    backgroundColor: fecaTheme.surfaces.container,
  },
  followBtnTextOutline: {
    color: fecaTheme.colors.primary,
  },
  section: {
    gap: fecaTheme.spacing.lg,
    marginBottom: fecaTheme.spacing.xl,
  },
  sectionTitle: {
    ...fecaTheme.typography.title,
    color: fecaTheme.colors.onSurface,
    paddingHorizontal: fecaTheme.spacing.xs,
  },
  diaryList: {
    gap: fecaTheme.spacing.sm,
  },
  stack: {
    gap: fecaTheme.spacing.lg,
  },
});
