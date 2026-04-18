import { Redirect, router } from "expo-router";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { UserFollowRow } from "@/components/cards/user-follow-row";
import { EmptyState } from "@/components/ui/empty-state";
import { FormField } from "@/components/ui/form-field";
import { PageBackground } from "@/components/ui/page-background";
import { paddingBottomStackScreen } from "@/components/ui/screen-padding";
import { StackScreenHeader } from "@/components/ui/stack-screen-header";
import { followUser, unfollowUser } from "@/lib/api/follow";
import { fetchMyFollowing } from "@/lib/api/friends";
import { mapApiUserPublicToUser } from "@/lib/feca/map-api-user";
import { searchUsersByUsername } from "@/lib/api/users";
import { useAuth } from "@/providers/auth-provider";
import { fecaTheme } from "@/theme/feca";
import type { ApiUserPublic } from "@/types/api";
import type { User } from "@/types/feca";

export default function FollowingScreen() {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const accessToken = session?.accessToken;

  const [following, setFollowing] = useState<User[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearch = useDeferredValue(searchQuery);
  const [searchResults, setSearchResults] = useState<ApiUserPublic[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  const loadFollowing = useCallback(async () => {
    if (!accessToken) {
      setFollowing([]);
      return;
    }

    setListLoading(true);
    try {
      const res = await fetchMyFollowing(accessToken, { limit: 200 });
      setFollowing(res.users.map(mapApiUserPublicToUser));
    } catch {
      setFollowing([]);
    } finally {
      setListLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void loadFollowing();
  }, [loadFollowing]);

  const followingIds = useMemo(
    () => new Set(following.map((u) => u.id)),
    [following],
  );

  useEffect(() => {
    const q = deferredSearch.trim();
    if (!accessToken || q.length < 2 || !session) {
      setSearchResults([]);
      return;
    }

    const handle = setTimeout(() => {
      void (async () => {
        setSearchLoading(true);
        try {
          const res = await searchUsersByUsername(accessToken, {
            q,
            limit: 25,
          });
          setSearchResults(res.users.filter((u) => u.id !== session.user.id));
        } catch {
          setSearchResults([]);
        } finally {
          setSearchLoading(false);
        }
      })();
    }, 400);

    return () => clearTimeout(handle);
  }, [accessToken, deferredSearch, session]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadFollowing();
    setRefreshing(false);
  }, [loadFollowing]);

  const handleToggleFollow = useCallback(
    async (apiUser: ApiUserPublic, currentlyFollowing: boolean) => {
      if (!accessToken) return;
      setBusyUserId(apiUser.id);
      try {
        if (currentlyFollowing) {
          const ok = await unfollowUser(apiUser.id, accessToken);
          if (ok) {
            setFollowing((prev) => prev.filter((u) => u.id !== apiUser.id));
          }
        } else {
          const ok = await followUser(apiUser.id, accessToken);
          if (ok) {
            setFollowing((prev) => {
              if (prev.some((u) => u.id === apiUser.id)) return prev;
              return [...prev, mapApiUserPublicToUser(apiUser)];
            });
          }
        }
        await loadFollowing();
      } finally {
        setBusyUserId(null);
      }
    },
    [accessToken, loadFollowing],
  );

  if (!accessToken) {
    return <Redirect href="/(onboarding)/welcome" />;
  }

  const listHeader = (
    <View style={styles.headerWrap}>
      <Text style={styles.helper}>
        Buscá por nombre de usuario y seguí perfiles para ver su actividad en tu feed.
      </Text>

      <FormField
        autoCapitalize="none"
        autoCorrect={false}
        onChangeText={setSearchQuery}
        placeholder="Buscar @usuario..."
        value={searchQuery}
      />

      {deferredSearch.trim().length >= 2 ? (
        <View style={styles.searchSection}>
          <Text style={styles.sectionLabel}>Resultados</Text>
          {searchLoading ? (
            <View style={styles.searchLoading}>
              <ActivityIndicator color={fecaTheme.colors.primary} />
            </View>
          ) : searchResults.length === 0 ? (
            <Text style={styles.searchEmpty}>No encontramos usuarios con ese texto.</Text>
          ) : (
            <View style={styles.searchList}>
              {searchResults.map((u) => {
                const user = mapApiUserPublicToUser(u);
                const isFollowing = followingIds.has(u.id);
                return (
                  <UserFollowRow
                    busy={busyUserId === u.id}
                    isFollowing={isFollowing}
                    key={u.id}
                    onPressUser={() => router.push(`/user/${u.id}`)}
                    onToggleFollow={() => void handleToggleFollow(u, isFollowing)}
                    user={user}
                  />
                );
              })}
            </View>
          )}
        </View>
      ) : null}

      <Text style={styles.sectionLabel}>Personas que seguís</Text>
    </View>
  );

  return (
    <PageBackground>
      <View style={styles.flex}>
        <StackScreenHeader
          right={<Text style={styles.count}>{following.length}</Text>}
          title="Seguidos"
          titleAlignment="leading"
        />
        <FlatList
        contentContainerStyle={[
          styles.content,
          { paddingBottom: paddingBottomStackScreen(insets.bottom) },
        ]}
        contentInsetAdjustmentBehavior="never"
        data={following}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          listLoading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={fecaTheme.colors.primary} />
            </View>
          ) : (
            <EmptyState
              description="Buscá arriba por @usuario y tocá Seguir para ver sus visitas en tu feed."
              icon="people-outline"
              title="Todavía no seguís a nadie"
            />
          )
        }
        ListHeaderComponent={listHeader}
        refreshControl={
          <RefreshControl
            onRefresh={() => void onRefresh()}
            refreshing={refreshing}
            tintColor={fecaTheme.colors.primary}
          />
        }
        renderItem={({ item }) => {
          const apiLike: ApiUserPublic = {
            id: item.id,
            username: item.username,
            displayName: item.displayName,
            city: item.city || null,
          };
          return (
            <UserFollowRow
              busy={busyUserId === item.id}
              isFollowing
              onPressUser={() => router.push(`/user/${item.id}`)}
              onToggleFollow={() => void handleToggleFollow(apiLike, true)}
              user={item}
            />
          );
        }}
        showsVerticalScrollIndicator={false}
        style={styles.listFlex}
      />
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
  content: {
    paddingHorizontal: fecaTheme.spacing.lg,
    paddingTop: 0,
  },
  headerWrap: {
    gap: fecaTheme.spacing.md,
    marginBottom: fecaTheme.spacing.lg,
  },
  count: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.muted,
  },
  helper: {
    ...fecaTheme.typography.body,
    color: fecaTheme.colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  sectionLabel: {
    ...fecaTheme.typography.title,
    color: fecaTheme.colors.onSurface,
    fontSize: 16,
    marginTop: fecaTheme.spacing.sm,
  },
  searchSection: {
    gap: fecaTheme.spacing.sm,
  },
  searchLoading: {
    paddingVertical: fecaTheme.spacing.lg,
  },
  searchEmpty: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.muted,
    paddingVertical: fecaTheme.spacing.sm,
  },
  searchList: {
    gap: fecaTheme.spacing.xs,
  },
  separator: {
    height: fecaTheme.spacing.sm,
  },
  loadingBox: {
    paddingVertical: fecaTheme.spacing.xxl,
  },
});
