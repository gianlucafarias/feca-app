import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { Redirect, router } from "expo-router";
import { useCallback, useDeferredValue, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PlaceCard } from "@/components/cards/place-card";
import { SavedCollectionCard } from "@/components/cards/saved-collection-card";
import { SavedNewListCard } from "@/components/cards/saved-new-list-card";
import { EmptyState } from "@/components/ui/empty-state";
import { FormField } from "@/components/ui/form-field";
import { PageBackground } from "@/components/ui/page-background";
import { useSavedLists } from "@/hooks/use-saved-lists";
import { fetchMySavedPlaces } from "@/lib/api/saved";
import { mapApiSavedRowToSavedPlace } from "@/lib/feca/map-api-social";
import { formatVisitDate } from "@/lib/format";
import { LOCAL_QUIERO_IR_ID } from "@/lib/storage/saved-lists";
import { useAuth } from "@/providers/auth-provider";
import { fecaTheme } from "@/theme/feca";
import type { SavedPlace } from "@/types/feca";
import { Image } from "expo-image";

type FilterKey = "quiero" | "overview" | "places" | "reviews";

type OverviewRow =
  | {
      kind: "collection";
      id: string;
      title: string;
      emoji: string;
      count: number;
      urls: (string | undefined)[];
    }
  | { kind: "create" };

const CHIPS: { key: FilterKey; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "quiero", label: "Quiero ir", icon: "compass-outline" },
  { key: "overview", label: "Todas", icon: "albums-outline" },
  { key: "places", label: "Lugares", icon: "location-outline" },
  { key: "reviews", label: "Reseñas", icon: "chatbubble-outline" },
];

export default function SavedScreen() {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const accessToken = session?.accessToken;
  const { lists, refresh: refreshLists } = useSavedLists();
  const [apiSaved, setApiSaved] = useState<SavedPlace[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [listLoading, setListLoading] = useState(false);

  const [filter, setFilter] = useState<FilterKey>("quiero");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  const load = useCallback(async () => {
    if (!accessToken) {
      setApiSaved([]);
      return;
    }

    setListLoading(true);
    try {
      const savedRes = await fetchMySavedPlaces(accessToken, { limit: 80 });
      setApiSaved(savedRes.places.map(mapApiSavedRowToSavedPlace));
      await refreshLists();
    } catch {
      setApiSaved([]);
    } finally {
      setListLoading(false);
    }
  }, [accessToken, refreshLists]);

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

  const goBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)/profile");
    }
  }, []);

  const localQuiero = lists.find((l) => l.id === LOCAL_QUIERO_IR_ID);
  const userLists = useMemo(
    () => lists.filter((l) => l.id !== LOCAL_QUIERO_IR_ID),
    [lists],
  );

  const mergedPlaces = useMemo(() => {
    const byG = new Map<string, SavedPlace>();
    for (const sp of apiSaved) {
      const g = sp.place.googlePlaceId;
      if (g) {
        byG.set(g, sp);
      }
    }
    return Array.from(byG.values());
  }, [apiSaved]);

  const reviewItems = useMemo(() => {
    const out: Extract<(typeof lists)[0]["items"][0], { kind: "visit" }>[] = [];
    for (const list of lists) {
      for (const it of list.items) {
        if (it.kind === "visit") {
          out.push(it);
        }
      }
    }
    return out;
  }, [lists]);

  const quieroPreviewUrls = useMemo(() => {
    const urls: (string | undefined)[] = [];
    for (const sp of apiSaved.slice(0, 3)) {
      urls.push(sp.place.photoUrl);
    }
    const rest = localQuiero?.items.filter((i) => i.kind === "visit") ?? [];
    for (const v of rest) {
      if (urls.length >= 3) {
        break;
      }
      urls.push(v.photoUrl);
    }
    while (urls.length < 3) {
      urls.push(undefined);
    }
    return urls.slice(0, 3);
  }, [apiSaved, localQuiero]);

  const quieroCount =
    apiSaved.length +
    (localQuiero?.items.filter((i) => i.kind === "visit" || i.kind === "group").length ?? 0);

  const normalizedQuery = deferredQuery.trim().toLowerCase();

  const filteredMergedPlaces = mergedPlaces.filter((item) =>
    `${item.place.name} ${item.place.neighborhood} ${item.reason}`.toLowerCase().includes(normalizedQuery),
  );

  const filteredReviews = reviewItems.filter((v) =>
    `${v.placeName ?? ""}`.toLowerCase().includes(normalizedQuery),
  );

  const overviewRows = useMemo((): OverviewRow[] => {
    const quiero: OverviewRow = {
      kind: "collection",
      id: "quiero-ir",
      title: "Quiero ir",
      emoji: "🧭",
      count: quieroCount,
      urls: quieroPreviewUrls,
    };
    const rest: OverviewRow[] = [];
    for (const list of userLists) {
      const urls: (string | undefined)[] = [];
      for (const it of list.items.slice(0, 6)) {
        if (it.kind === "place") {
          const match = apiSaved.find((s) => s.place.googlePlaceId === it.googlePlaceId);
          urls.push(it.photoUrl ?? match?.place.photoUrl);
        } else if (it.kind === "visit") {
          urls.push(it.photoUrl);
        } else {
          urls.push(it.photoUrl);
        }
        if (urls.filter(Boolean).length >= 3) {
          break;
        }
      }
      while (urls.length < 3) {
        urls.push(undefined);
      }
      rest.push({
        kind: "collection",
        id: list.id,
        title: list.title,
        emoji: list.emoji,
        count: list.items.length,
        urls: urls.slice(0, 3),
      });
    }
    return [quiero, { kind: "create" }, ...rest];
  }, [apiSaved, quieroCount, quieroPreviewUrls, userLists]);

  const displayedOverviewRows = useMemo(() => {
    if (filter === "quiero") {
      return overviewRows.slice(0, 2);
    }
    if (filter === "overview") {
      const q = normalizedQuery;
      return overviewRows.filter((row) => {
        if (row.kind === "create") {
          if (!q) {
            return true;
          }
          const hints = ["nueva", "lista", "crear", "añadir", "agregar"];
          return hints.some((h) => h.includes(q) || q.includes(h));
        }
        return `${row.title} ${row.emoji}`.toLowerCase().includes(q);
      });
    }
    return [];
  }, [filter, overviewRows, normalizedQuery]);

  const handleListCreated = useCallback(
    (listId: string) => {
      void refreshLists();
      router.push({ pathname: "/collection/[id]", params: { id: listId } });
    },
    [refreshLists],
  );

  if (!accessToken) {
    return <Redirect href="/(onboarding)/welcome" />;
  }

  const header = (
    <View style={styles.headerWrap}>
      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 12) }]}>
        <Pressable accessibilityRole="button" hitSlop={8} onPress={goBack} style={styles.backBtn}>
          <Ionicons color={fecaTheme.colors.onSurface} name="chevron-back" size={22} />
        </Pressable>
        <Text style={styles.navTitle}>Guardados</Text>
        <View style={styles.backPlaceholder} />
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push("/(tabs)/plans")}
        style={({ pressed }) => [styles.plansShortcut, pressed && styles.plansShortcutPressed]}
      >
        <View style={styles.plansShortcutIcon}>
          <Ionicons color={fecaTheme.colors.primary} name="people" size={18} />
        </View>
        <View style={styles.plansShortcutText}>
          <Text style={styles.plansShortcutTitle}>Planes con amigos</Text>
          <Text style={styles.plansShortcutSub}>Salidas con fecha y lugar — pestaña Planes</Text>
        </View>
        <Ionicons color={fecaTheme.colors.muted} name="chevron-forward" size={18} />
      </Pressable>
      <ScrollView
        horizontal
        contentContainerStyle={styles.chipsRow}
        showsHorizontalScrollIndicator={false}
      >
        {CHIPS.map((c) => {
          const active = filter === c.key;
          return (
            <Pressable
              key={c.key}
              onPress={() => {
                setFilter(c.key);
                setQuery("");
              }}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Ionicons
                color={active ? fecaTheme.colors.onPrimary : fecaTheme.colors.onSurface}
                name={c.icon}
                size={16}
              />
              <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{c.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      {filter !== "quiero" ? (
        <FormField
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={setQuery}
          placeholder={
            filter === "overview"
              ? "Buscar listas..."
              : filter === "places"
                ? "Buscar lugares..."
                : "Buscar reseñas..."
          }
          value={query}
        />
      ) : null}
    </View>
  );

  if (filter === "quiero" || filter === "overview") {
    return (
      <PageBackground>
        <FlatList
          contentContainerStyle={styles.content}
          contentInsetAdjustmentBehavior="automatic"
          data={displayedOverviewRows}
          keyExtractor={(item) => (item.kind === "create" ? "__create__" : item.id)}
          ListEmptyComponent={
            listLoading && filter === "overview" ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator color={fecaTheme.colors.primary} size="large" />
              </View>
            ) : filter === "overview" && displayedOverviewRows.length === 0 ? (
              <EmptyState
                description="No hay listas que coincidan. Probá otra búsqueda o creá una lista nueva."
                icon="search-outline"
                title="Sin resultados"
              />
            ) : null
          }
          ListHeaderComponent={header}
          refreshControl={
            <RefreshControl
              onRefresh={() => void onRefresh()}
              refreshing={refreshing}
              tintColor={fecaTheme.colors.primary}
            />
          }
          renderItem={({ item }) =>
            item.kind === "create" ? (
              <SavedNewListCard onCreated={handleListCreated} />
            ) : (
              <SavedCollectionCard
                countLabel={`Guardado: ${item.count} ${item.count === 1 ? "elemento" : "elementos"}`}
                emoji={item.emoji}
                onPress={() =>
                  router.push({
                    pathname: "/collection/[id]",
                    params: { id: item.id },
                  })
                }
                previewUrls={item.urls}
                title={item.title}
              />
            )
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          showsVerticalScrollIndicator={false}
        />
      </PageBackground>
    );
  }

  if (filter === "places") {
    return (
      <PageBackground>
        <FlatList
          contentContainerStyle={styles.content}
          contentInsetAdjustmentBehavior="automatic"
          data={filteredMergedPlaces}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            listLoading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator color={fecaTheme.colors.primary} />
              </View>
            ) : (
              <EmptyState
                description="Guardá desde el detalle del lugar o desde Explorar."
                icon="location-outline"
                title="Sin lugares guardados"
              />
            )
          }
          ListHeaderComponent={header}
          refreshControl={
            <RefreshControl
              onRefresh={() => void onRefresh()}
              refreshing={refreshing}
              tintColor={fecaTheme.colors.primary}
            />
          }
          renderItem={({ item }) => (
            <PlaceCard
              eyebrow={item.reason}
              meta={formatVisitDate(item.savedAt)}
              place={item.place}
            />
          )}
          showsVerticalScrollIndicator={false}
        />
      </PageBackground>
    );
  }

  if (filter === "reviews") {
    return (
      <PageBackground>
        <FlatList
          contentContainerStyle={styles.content}
          contentInsetAdjustmentBehavior="automatic"
          data={filteredReviews}
          ItemSeparatorComponent={() => <View style={styles.separatorSm} />}
          keyExtractor={(item) => item.visitId}
          ListEmptyComponent={
            listLoading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator color={fecaTheme.colors.primary} />
              </View>
            ) : (
              <EmptyState
                description="Desde el feed o una reseña, tocá Guardar y elegí una lista."
                icon="chatbubble-outline"
                title="Sin reseñas guardadas"
              />
            )
          }
          ListHeaderComponent={header}
          refreshControl={
            <RefreshControl
              onRefresh={() => void onRefresh()}
              refreshing={refreshing}
              tintColor={fecaTheme.colors.primary}
            />
          }
          renderItem={({ item }) => (
            <View style={styles.reviewRow}>
              {item.photoUrl ? (
                <Image contentFit="cover" source={{ uri: item.photoUrl }} style={styles.reviewThumb} />
              ) : (
                <View style={[styles.reviewThumb, styles.ph]}>
                  <Ionicons color={fecaTheme.colors.muted} name="cafe-outline" size={20} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.reviewTitle}>{item.placeName ?? "Reseña"}</Text>
                <Text style={styles.reviewMeta}>Guardada en tus listas</Text>
              </View>
            </View>
          )}
          showsVerticalScrollIndicator={false}
        />
      </PageBackground>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 48,
    paddingHorizontal: fecaTheme.spacing.lg,
    paddingTop: fecaTheme.spacing.sm,
  },
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: fecaTheme.spacing.sm,
    paddingHorizontal: fecaTheme.spacing.xs,
  },
  backBtn: {
    alignItems: "center",
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  backPlaceholder: {
    width: 40,
  },
  navTitle: {
    ...fecaTheme.typography.title,
    color: fecaTheme.colors.onSurface,
    fontSize: 18,
  },
  headerWrap: {
    gap: fecaTheme.spacing.md,
    marginBottom: fecaTheme.spacing.lg,
  },
  plansShortcut: {
    alignItems: "center",
    backgroundColor: fecaTheme.surfaces.lowest,
    borderRadius: fecaTheme.radii.lg,
    flexDirection: "row",
    gap: fecaTheme.spacing.md,
    paddingHorizontal: fecaTheme.spacing.md,
    paddingVertical: fecaTheme.spacing.md,
    ...fecaTheme.elevation.ambient,
  },
  plansShortcutPressed: {
    opacity: 0.92,
  },
  plansShortcutIcon: {
    alignItems: "center",
    backgroundColor: fecaTheme.surfaces.high,
    borderRadius: fecaTheme.radii.sm,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  plansShortcutText: {
    flex: 1,
    gap: 2,
  },
  plansShortcutTitle: {
    ...fecaTheme.typography.bodyStrong,
    color: fecaTheme.colors.onSurface,
    fontSize: 15,
  },
  plansShortcutSub: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.muted,
    fontSize: 12,
  },
  chipsRow: {
    gap: fecaTheme.spacing.sm,
    paddingVertical: fecaTheme.spacing.xs,
  },
  chip: {
    alignItems: "center",
    backgroundColor: fecaTheme.surfaces.lowest,
    borderRadius: fecaTheme.radii.pill,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: fecaTheme.spacing.md,
    paddingVertical: fecaTheme.spacing.sm,
    ...fecaTheme.elevation.ambient,
  },
  chipActive: {
    backgroundColor: fecaTheme.colors.primary,
  },
  chipLabel: {
    ...fecaTheme.typography.bodyStrong,
    color: fecaTheme.colors.onSurface,
    fontSize: 14,
  },
  chipLabelActive: {
    color: fecaTheme.colors.onPrimary,
  },
  separator: {
    height: fecaTheme.spacing.lg,
  },
  separatorSm: {
    height: fecaTheme.spacing.sm,
  },
  loadingBox: {
    paddingVertical: fecaTheme.spacing.xxl,
  },
  reviewRow: {
    alignItems: "center",
    backgroundColor: fecaTheme.surfaces.lowest,
    borderRadius: fecaTheme.radii.md,
    flexDirection: "row",
    gap: fecaTheme.spacing.md,
    padding: fecaTheme.spacing.md,
    ...fecaTheme.elevation.ambient,
  },
  reviewThumb: {
    borderRadius: fecaTheme.radii.sm,
    height: 52,
    width: 52,
  },
  ph: {
    alignItems: "center",
    backgroundColor: fecaTheme.surfaces.high,
    justifyContent: "center",
  },
  reviewTitle: {
    ...fecaTheme.typography.bodyStrong,
    color: fecaTheme.colors.onSurface,
  },
  reviewMeta: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.muted,
  },
});
