import { Ionicons } from "@expo/vector-icons";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DiaryCard } from "@/components/cards/diary-card";
import { NearbyPlaceCard } from "@/components/cards/nearby-place-card";
import { UserFollowRow } from "@/components/cards/user-follow-row";
import { EmptyState } from "@/components/ui/empty-state";
import { PageBackground } from "@/components/ui/page-background";
import { paddingBottomStackScreen } from "@/components/ui/screen-padding";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { StackScreenHeader } from "@/components/ui/stack-screen-header";
import { searchPublicDiaries } from "@/lib/api/diaries";
import { followUser, unfollowUser } from "@/lib/api/follow";
import { fetchMyFollowing } from "@/lib/api/friends";
import { fetchNearbyPlaces } from "@/lib/api/places";
import { mapApiDiaryToCafeDiary } from "@/lib/feca/map-api-social";
import { mapApiUserPublicToUser } from "@/lib/feca/map-api-user";
import { searchUsersByUsername } from "@/lib/api/users";
import { useAuth } from "@/providers/auth-provider";
import { fecaTheme } from "@/theme/feca";
import type { ApiUserPublic } from "@/types/api";
import type { CafeDiary } from "@/types/feca";
import type { NearbyPlace } from "@/types/places";

const DEBOUNCE_MS = 400;
/** Sin resultados hasta que el usuario escriba al menos esto (todos los modos). */
const MIN_QUERY_LEN = 2;

type SearchMode = "places" | "guides" | "people";

type SearchListRow = NearbyPlace | CafeDiary | ApiUserPublic;

const SEARCH_SEGMENTS: { key: SearchMode; label: string }[] = [
  { key: "places", label: "Lugares" },
  { key: "guides", label: "Guías" },
  { key: "people", label: "Personas" },
];

function parseModeParam(raw: unknown): SearchMode | null {
  if (raw === "places" || raw === "guides" || raw === "people") {
    return raw;
  }
  return null;
}

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const { mode: modeParam } = useLocalSearchParams<{ mode?: string }>();

  const [searchMode, setSearchMode] = useState<SearchMode>(() => {
    return parseModeParam(modeParam) ?? "places";
  });

  const [places, setPlaces] = useState<NearbyPlace[]>([]);
  const [guides, setGuides] = useState<CafeDiary[]>([]);
  const [peopleResults, setPeopleResults] = useState<ApiUserPublic[]>([]);

  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  const [placesLoading, setPlacesLoading] = useState(false);
  const [placesError, setPlacesError] = useState<string | null>(null);

  const [guidesLoading, setGuidesLoading] = useState(false);
  const [guidesError, setGuidesError] = useState<string | null>(null);
  const [guidesUsedFallback, setGuidesUsedFallback] = useState(false);

  const [peopleLoading, setPeopleLoading] = useState(false);

  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const followingIdsRef = useRef(followingIds);
  followingIdsRef.current = followingIds;
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const placesAbortRef = useRef<AbortController | null>(null);
  const lastPlacesRequestKeyRef = useRef<string | null>(null);

  const lat = session?.user.lat;
  const lng = session?.user.lng;
  const cityGooglePlaceId = session?.user.cityGooglePlaceId;
  const accessToken = session?.accessToken;

  useEffect(() => {
    const parsed = parseModeParam(modeParam);
    if (parsed) {
      setSearchMode(parsed);
    }
  }, [modeParam]);

  useEffect(() => {
    if (searchMode !== "places" || !accessToken) {
      placesAbortRef.current?.abort();
      setPlacesLoading(false);
      return;
    }
    const q = deferredQuery.trim();
    if (q.length < MIN_QUERY_LEN) {
      placesAbortRef.current?.abort();
      lastPlacesRequestKeyRef.current = null;
      setPlaces([]);
      setPlacesLoading(false);
      setPlacesError(null);
      return;
    }

    setPlacesLoading(true);
    const timer = setTimeout(() => {
      const requestKey = JSON.stringify({
        lat: lat ?? null,
        lng: lng ?? null,
        q,
      });
      if (lastPlacesRequestKeyRef.current === requestKey) {
        setPlacesLoading(false);
        return;
      }

      placesAbortRef.current?.abort();
      const ac = new AbortController();
      placesAbortRef.current = ac;
      lastPlacesRequestKeyRef.current = requestKey;

      void (async () => {
        try {
          const results = await fetchNearbyPlaces({
            accessToken,
            lat: lat ?? undefined,
            lng: lng ?? undefined,
            query: q,
            origin: "search_places",
            signal: ac.signal,
          });
          if (!ac.signal.aborted) {
            setPlaces(results);
            setPlacesError(null);
          }
        } catch (err) {
          if (ac.signal.aborted) {
            return;
          }
          const message =
            err instanceof Error ? err.message : "No se pudieron cargar los lugares";
          setPlacesError(message);
          setPlaces([]);
        } finally {
          if (!ac.signal.aborted) {
            setPlacesLoading(false);
          }
        }
      })();
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      placesAbortRef.current?.abort();
    };
  }, [searchMode, deferredQuery, accessToken, cityGooglePlaceId, lat, lng]);

  useEffect(() => {
    if (searchMode !== "guides" || !accessToken) {
      return;
    }
    const q = deferredQuery.trim();
    if (q.length < MIN_QUERY_LEN) {
      setGuides([]);
      setGuidesLoading(false);
      setGuidesError(null);
      setGuidesUsedFallback(false);
      return;
    }

    setGuidesLoading(true);
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const res = await searchPublicDiaries(accessToken, { q, limit: 25 });
          setGuides(res.diaries.map(mapApiDiaryToCafeDiary));
          setGuidesUsedFallback(res.usedFallback);
          setGuidesError(null);
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "No se pudieron cargar las guías";
          setGuidesError(message);
          setGuides([]);
          setGuidesUsedFallback(false);
        } finally {
          setGuidesLoading(false);
        }
      })();
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [searchMode, deferredQuery, accessToken]);

  useEffect(() => {
    if (searchMode !== "people" || !accessToken || !session) {
      return;
    }
    const q = deferredQuery.trim();
    if (q.length < MIN_QUERY_LEN) {
      setPeopleResults([]);
      setPeopleLoading(false);
      return;
    }

    setPeopleLoading(true);
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const res = await searchUsersByUsername(accessToken, {
            q,
            limit: 25,
          });
          setPeopleResults(res.users.filter((u) => u.id !== session.user.id));
        } catch {
          setPeopleResults([]);
        } finally {
          setPeopleLoading(false);
        }
      })();
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [searchMode, deferredQuery, accessToken, session]);

  useEffect(() => {
    if (!accessToken) {
      setFollowingIds(new Set());
      return;
    }
    void (async () => {
      try {
        const res = await fetchMyFollowing(accessToken, { limit: 200 });
        setFollowingIds(new Set(res.users.map((u) => u.id)));
      } catch {
        // No vaciar: evita perder estado si el listado falla por red.
      }
    })();
  }, [accessToken]);

  /**
   * Tras seguir, `/me/following` a veces aún no incluye al usuario (paginación / consistencia).
   * `ensureUserIds` fusiona esos ids para no pisar el UI con un Set incompleto.
   */
  const loadFollowing = useCallback(
    async (ensureUserIds?: string[]) => {
      if (!accessToken) return;
      try {
        const res = await fetchMyFollowing(accessToken, { limit: 200 });
        const next = new Set(res.users.map((u) => u.id));
        for (const id of ensureUserIds ?? []) {
          if (id) next.add(id);
        }
        setFollowingIds(next);
      } catch {
        if (ensureUserIds?.length) {
          setFollowingIds((prev) => {
            const merged = new Set(prev);
            for (const id of ensureUserIds) {
              if (id) merged.add(id);
            }
            return merged;
          });
        }
      }
    },
    [accessToken],
  );

  const handleToggleFollow = useCallback(
    async (apiUser: ApiUserPublic) => {
      if (!accessToken) return;
      const userId = apiUser.id;
      const currentlyFollowing = followingIdsRef.current.has(userId);
      setBusyUserId(userId);
      try {
        if (currentlyFollowing) {
          const ok = await unfollowUser(userId, accessToken);
          if (ok) {
            setFollowingIds((prev) => {
              const next = new Set(prev);
              next.delete(userId);
              return next;
            });
          }
          await loadFollowing();
        } else {
          const ok = await followUser(userId, accessToken);
          if (ok) {
            setFollowingIds((prev) => new Set(prev).add(userId));
          }
          await loadFollowing([userId]);
        }
      } finally {
        setBusyUserId(null);
      }
    },
    [accessToken, loadFollowing],
  );

  const onSearchModeChange = useCallback((key: string) => {
    setSearchMode(key as SearchMode);
  }, []);

  const searchPlaceholder =
    searchMode === "places"
      ? "Buscar cafés y lugares…"
      : searchMode === "guides"
        ? "Buscar guías…"
        : "Buscar @usuario…";

  const listData: SearchListRow[] =
    searchMode === "places"
      ? places
      : searchMode === "guides"
        ? guides
        : peopleResults;

  const listLoading =
    searchMode === "places"
      ? placesLoading
      : searchMode === "guides"
        ? guidesLoading
        : peopleLoading;

  const queryReady = deferredQuery.trim().length >= MIN_QUERY_LEN;

  /** FlatList memoiza filas: sin esto, al seguir/dejar de seguir no cambia `data` y el botón no se actualiza. */
  const listExtraData = useMemo(
    () => ({
      searchMode,
      followingKey: Array.from(followingIds).sort().join(","),
      busyUserId,
    }),
    [searchMode, followingIds, busyUserId],
  );

  const emptyForMode = () => {
    if (listLoading) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator color={fecaTheme.colors.primary} size="large" />
        </View>
      );
    }

    if (!queryReady) {
      return <View style={styles.emptyQuiet} />;
    }

    if (searchMode === "places" && placesError) {
      return (
        <EmptyState
          description={placesError}
          icon="cloud-offline-outline"
          title="Error al buscar"
        />
      );
    }

    if (searchMode === "guides" && guidesError) {
      return (
        <EmptyState
          description={guidesError}
          icon="cloud-offline-outline"
          title="Error al buscar guías"
        />
      );
    }

    return (
      <EmptyState
        description="Probá con otras palabras."
        icon="search-outline"
        title="Sin resultados"
      />
    );
  };

  if (!accessToken) {
    return <Redirect href="/(onboarding)/welcome" />;
  }

  return (
    <PageBackground>
      <View style={styles.screenWrap}>
        <StackScreenHeader title="Buscar" titleAlignment="leading" />
        <FlatList<SearchListRow>
          contentContainerStyle={[
            styles.listContent,
            !queryReady && styles.listContentIdle,
            { paddingBottom: paddingBottomStackScreen(insets.bottom) },
          ]}
          contentInsetAdjustmentBehavior="never"
          data={queryReady ? listData : []}
          extraData={listExtraData}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          keyExtractor={(item) => {
            if (searchMode === "places") {
              return (item as NearbyPlace).googlePlaceId;
            }
            return (item as CafeDiary | ApiUserPublic).id;
          }}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={emptyForMode()}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <View style={styles.searchShell}>
                <Ionicons
                  color={fecaTheme.colors.muted}
                  name="search-outline"
                  size={20}
                  style={styles.searchIcon}
                />
                <TextInput
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoFocus
                  onChangeText={setQuery}
                  placeholder={searchPlaceholder}
                  placeholderTextColor={fecaTheme.colors.muted}
                  selectionColor={fecaTheme.colors.primary}
                  style={styles.searchInput}
                  value={query}
                  {...(Platform.OS === "android"
                    ? { includeFontPadding: false }
                    : {})}
                />
              </View>

              <View style={styles.segmentWrap}>
                <SegmentedControl
                  activeKey={searchMode}
                  onChange={onSearchModeChange}
                  segments={SEARCH_SEGMENTS}
                />
              </View>

              {searchMode === "guides" && guidesUsedFallback && queryReady ? (
                <Text style={styles.fallbackHint}>
                  Coincidencias entre tus guías públicas hasta que haya búsqueda global
                  en el servidor.
                </Text>
              ) : null}
            </View>
          }
          removeClippedSubviews={false}
          renderItem={({ item }) => {
            if (searchMode === "places") {
              return <NearbyPlaceCard place={item as NearbyPlace} />;
            }
            if (searchMode === "guides") {
              return <DiaryCard diary={item as CafeDiary} />;
            }
            const u = item as ApiUserPublic;
            const user = mapApiUserPublicToUser(u);
            const isFollowing = followingIds.has(u.id);
            return (
              <UserFollowRow
                busy={busyUserId === u.id}
                isFollowing={isFollowing}
                onPressUser={() => router.push(`/user/${u.id}`)}
                onToggleFollow={() => void handleToggleFollow(u)}
                user={user}
              />
            );
          }}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </PageBackground>
  );
}

const styles = StyleSheet.create({
  screenWrap: {
    flex: 1,
  },
  /** Misma columna que el contenido de Explorar: un solo `paddingHorizontal` en la lista. */
  listContent: {
    flexGrow: 1,
    paddingHorizontal: fecaTheme.spacing.lg,
    paddingTop: 0,
  },
  listContentIdle: {
    justifyContent: "flex-start",
  },
  listHeader: {
    marginBottom: fecaTheme.spacing.md,
  },
  segmentWrap: {
    marginBottom: fecaTheme.spacing.sm,
  },
  fallbackHint: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.muted,
    marginBottom: fecaTheme.spacing.sm,
  },
  searchShell: {
    alignItems: "center",
    backgroundColor: fecaTheme.surfaces.low,
    borderRadius: fecaTheme.radii.pill,
    flexDirection: "row",
    marginBottom: fecaTheme.spacing.md,
    minHeight: 52,
    paddingHorizontal: fecaTheme.spacing.md,
  },
  searchIcon: {
    marginRight: fecaTheme.spacing.sm,
  },
  searchInput: {
    ...fecaTheme.typography.body,
    color: fecaTheme.colors.onSurface,
    flex: 1,
    minHeight: 48,
    paddingVertical: fecaTheme.spacing.sm,
  },
  separator: {
    height: fecaTheme.spacing.lg,
  },
  centered: {
    alignItems: "center",
    paddingVertical: fecaTheme.spacing.xxl,
  },
  emptyQuiet: {
    minHeight: 120,
  },
});
