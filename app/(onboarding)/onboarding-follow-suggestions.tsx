import { Redirect, router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { UserFollowRow } from "@/components/cards/user-follow-row";
import { GradientButton } from "@/components/ui/gradient-button";
import { OnboardingProgressBar } from "@/components/ui/onboarding-progress-bar";
import { PageBackground } from "@/components/ui/page-background";
import { StackScreenHeader } from "@/components/ui/stack-screen-header";
import { TextLinkButton } from "@/components/ui/text-link-button";
import { useOnboardingBack } from "@/hooks/use-onboarding-back";
import { fetchOnboardingSuggestedUsers } from "@/lib/api/onboarding";
import { followUser, unfollowUser } from "@/lib/api/follow";
import { fetchMyFollowing } from "@/lib/api/friends";
import { mapApiUserPublicToUser } from "@/lib/feca/map-api-user";
import { useAuth } from "@/providers/auth-provider";
import { fecaTheme, outlineGhost } from "@/theme/feca";
import type { ApiUserPublic } from "@/types/api";

const LIST_H_PAD = fecaTheme.spacing.lg;
const SEPARATOR_H = fecaTheme.spacing.lg;

export default function OnboardingFollowSuggestionsScreen() {
  const insets = useSafeAreaInsets();
  const { session, setExtendedOnboardingStep } = useAuth();
  const goBack = useOnboardingBack();
  const [users, setUsers] = useState<ApiUserPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const followingIdsRef = useRef(followingIds);
  followingIdsRef.current = followingIds;
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.accessToken) {
      return;
    }
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    void fetchOnboardingSuggestedUsers(session.accessToken, {
      limit: 6,
      cityGooglePlaceId: session.user.cityGooglePlaceId ?? undefined,
    })
      .then((res) => {
        if (!cancelled) {
          const filtered = res.users.filter((u) => u.id !== session.user.id);
          setUsers(filtered);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : "No se pudo cargar la lista");
          setUsers([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [session?.accessToken, session?.user.cityGooglePlaceId, session?.user.id]);

  useEffect(() => {
    const token = session?.accessToken;
    if (!token) {
      setFollowingIds(new Set());
      return;
    }
    let cancelled = false;
    void fetchMyFollowing(token, { limit: 200 })
      .then((res) => {
        if (!cancelled) {
          setFollowingIds(new Set(res.users.map((u) => u.id)));
        }
      })
      .catch(() => {
        // Mantener estado local si falla la red.
      });
    return () => {
      cancelled = true;
    };
  }, [session?.accessToken]);

  const handleToggleFollow = useCallback(
    async (apiUser: ApiUserPublic) => {
      if (!session?.accessToken) {
        return;
      }
      const userId = apiUser.id;
      const currentlyFollowing = followingIdsRef.current.has(userId);
      setBusyUserId(userId);
      try {
        if (currentlyFollowing) {
          const ok = await unfollowUser(userId, session.accessToken);
          if (ok) {
            setFollowingIds((prev) => {
              const next = new Set(prev);
              next.delete(userId);
              return next;
            });
          }
        } else {
          const ok = await followUser(userId, session.accessToken);
          if (ok) {
            setFollowingIds((prev) => new Set(prev).add(userId));
          }
        }
      } catch {
        // Reintentable desde la fila
      } finally {
        setBusyUserId(null);
      }
    },
    [session?.accessToken],
  );

  const onContinue = useCallback(async () => {
    await setExtendedOnboardingStep("places");
    router.push("/(onboarding)/onboarding-past-places");
  }, [setExtendedOnboardingStep]);

  const onSkipSocial = useCallback(async () => {
    await onContinue();
  }, [onContinue]);

  const listHeader = useMemo(
    () => (
      <View style={styles.listHeader}>
        <OnboardingProgressBar />
        <Text style={styles.question}>Seguí a quien quieras</Text>
        <Text style={styles.hint}>
          Es opcional. Misma lista que en Buscar → Personas: tocá la fila para ver el perfil o el
          botón para seguir o dejar de seguir.
        </Text>
        {loading ? (
          <ActivityIndicator color={fecaTheme.colors.primary} style={styles.loader} />
        ) : null}
        {loadError ? (
          <Text style={styles.warn}>
            No pudimos cargar sugerencias. Podés omitir o continuar y buscar gente después en
            Buscar.
          </Text>
        ) : null}
      </View>
    ),
    [loadError, loading],
  );

  if (!session?.accessToken) {
    return <Redirect href="/(onboarding)/welcome" />;
  }

  return (
    <PageBackground>
      <StackScreenHeader title="Cuentas sugeridas" onPressBack={goBack} />
      <View style={styles.screenWrap}>
        <FlatList<ApiUserPublic>
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 120 },
          ]}
          data={users}
          ItemSeparatorComponent={() => <View style={{ height: SEPARATOR_H }} />}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={listHeader}
          renderItem={({ item }) => {
            const user = mapApiUserPublicToUser(item);
            const isFollowing = followingIds.has(item.id);
            return (
              <UserFollowRow
                busy={busyUserId === item.id}
                isFollowing={isFollowing}
                onPressUser={() => router.push(`/user/${item.id}`)}
                onToggleFollow={() => void handleToggleFollow(item)}
                user={user}
              />
            );
          }}
          showsVerticalScrollIndicator={false}
        />
        <View
          style={[
            styles.footer,
            {
              paddingBottom: Math.max(insets.bottom, fecaTheme.spacing.md),
              borderTopColor: outlineGhost,
            },
          ]}
        >
          <TextLinkButton label="Omitir este paso" onPress={() => void onSkipSocial()} />
          <GradientButton label="Continuar" onPress={() => void onContinue()} />
        </View>
      </View>
    </PageBackground>
  );
}

const styles = StyleSheet.create({
  screenWrap: {
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
    paddingHorizontal: LIST_H_PAD,
    paddingTop: fecaTheme.spacing.sm,
  },
  listHeader: {
    gap: fecaTheme.spacing.md,
    marginBottom: fecaTheme.spacing.md,
  },
  question: {
    ...fecaTheme.typography.display,
    color: fecaTheme.colors.onSurface,
  },
  hint: {
    ...fecaTheme.typography.body,
    color: fecaTheme.colors.muted,
  },
  loader: {
    marginVertical: fecaTheme.spacing.sm,
  },
  warn: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.secondary,
  },
  footer: {
    backgroundColor: fecaTheme.colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: fecaTheme.spacing.sm,
    paddingHorizontal: LIST_H_PAD,
    paddingTop: fecaTheme.spacing.md,
  },
});
