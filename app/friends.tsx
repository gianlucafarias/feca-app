import { Ionicons } from "@expo/vector-icons";
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
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { UserFollowRow } from "@/components/cards/user-follow-row";
import { EmptyState } from "@/components/ui/empty-state";
import { FormField } from "@/components/ui/form-field";
import { PageBackground } from "@/components/ui/page-background";
import { followUser, unfollowUser } from "@/lib/api/follow";
import { fetchMyFollowing } from "@/lib/api/friends";
import { mapApiUserPublicToUser } from "@/lib/feca/map-api-user";
import { searchUsersByUsername } from "@/lib/api/users";
import { useAuth } from "@/providers/auth-provider";
import { fecaTheme } from "@/theme/feca";
import type { ApiUserPublic } from "@/types/api";
import type { User } from "@/types/feca";

export default function FollowingScreen() {
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
          await unfollowUser(apiUser.id, accessToken);
        } else {
          await followUser(apiUser.id, accessToken);
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
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons color={fecaTheme.colors.onSurface} name="chevron-back" size={20} />
        </Pressable>
        <Text style={styles.screenTitle}>Seguidos</Text>
        <Text style={styles.count}>{following.length}</Text>
      </View>

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
      <FlatList
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
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
      />
    </PageBackground>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 100,
    paddingHorizontal: fecaTheme.spacing.lg,
    paddingTop: fecaTheme.spacing.xxl,
  },
  headerWrap: {
    gap: fecaTheme.spacing.md,
    marginBottom: fecaTheme.spacing.lg,
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: fecaTheme.spacing.sm,
  },
  backButton: {
    alignItems: "center",
    backgroundColor: fecaTheme.surfaces.high,
    borderRadius: fecaTheme.radii.pill,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  screenTitle: {
    ...fecaTheme.typography.headline,
    color: fecaTheme.colors.onSurface,
    flex: 1,
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
