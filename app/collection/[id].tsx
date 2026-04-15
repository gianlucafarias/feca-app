import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useFocusEffect } from "@react-navigation/native";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GroupCard } from "@/components/cards/group-card";
import { PlaceCard } from "@/components/cards/place-card";
import { PageBackground } from "@/components/ui/page-background";
import { fetchGroup } from "@/lib/api/groups";
import { fetchMySavedPlaces } from "@/lib/api/saved";
import {
  mapApiGroupToFecaGroup,
  mapApiSavedRowToSavedPlace,
} from "@/lib/feca/map-api-social";
import { formatVisitDate } from "@/lib/format";
import { loadCustomLists, LOCAL_QUIERO_IR_ID } from "@/lib/storage/saved-lists";
import { useAuth } from "@/providers/auth-provider";
import { fecaTheme } from "@/theme/feca";
import type { SavedListItem } from "@/types/saved-lists";
import type { FecaGroup, SavedPlace } from "@/types/feca";

export default function CollectionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const accessToken = session?.accessToken;
  const [apiPlaces, setApiPlaces] = useState<SavedPlace[]>([]);
  const [listItems, setListItems] = useState<SavedListItem[]>([]);
  const [listTitle, setListTitle] = useState("");
  const [listEmoji, setListEmoji] = useState("");
  const [loading, setLoading] = useState(true);
  const [groupCache, setGroupCache] = useState<Record<string, FecaGroup | null>>({});

  const isQuiero = id === "quiero-ir";

  const load = useCallback(async () => {
    if (!accessToken || !id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const lists = await loadCustomLists();
      const savedRes = await fetchMySavedPlaces(accessToken, { limit: 100 });
      const byGoogle = new Map(
        savedRes.places.map((row) => [row.place.googlePlaceId, row] as const),
      );

      if (isQuiero) {
        setListTitle("Quiero ir");
        setListEmoji("🧭");
        setApiPlaces(savedRes.places.map(mapApiSavedRowToSavedPlace));
        const local = lists.find((l) => l.id === LOCAL_QUIERO_IR_ID);
        setListItems(local?.items ?? []);
        return;
      }

      const list = lists.find((l) => l.id === id);
      if (!list) {
        setListTitle("Lista");
        setListEmoji("📋");
        setApiPlaces([]);
        setListItems([]);
        return;
      }
      setListTitle(list.title);
      setListEmoji(list.emoji);

      const places: SavedPlace[] = [];
      const rest: SavedListItem[] = [];
      for (const it of list.items) {
        if (it.kind === "place") {
          const row = byGoogle.get(it.googlePlaceId);
          if (row) {
            places.push(mapApiSavedRowToSavedPlace(row));
          }
        } else {
          rest.push(it);
        }
      }
      setApiPlaces(places);
      setListItems(rest);
    } finally {
      setLoading(false);
    }
  }, [accessToken, id, isQuiero]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const groupsInList = useMemo(
    () => listItems.filter((i): i is Extract<SavedListItem, { kind: "group" }> => i.kind === "group"),
    [listItems],
  );

  useEffect(() => {
    if (!accessToken) {
      return;
    }
    for (const g of groupsInList) {
      void fetchGroup(g.groupId, accessToken)
        .then((raw) => {
          setGroupCache((prev) => {
            if (prev[g.groupId] !== undefined) {
              return prev;
            }
            return { ...prev, [g.groupId]: mapApiGroupToFecaGroup(raw) };
          });
        })
        .catch(() => {
          setGroupCache((prev) => {
            if (prev[g.groupId] !== undefined) {
              return prev;
            }
            return { ...prev, [g.groupId]: null };
          });
        });
    }
  }, [accessToken, groupsInList]);

  const visitsInList = useMemo(
    () => listItems.filter((i): i is Extract<SavedListItem, { kind: "visit" }> => i.kind === "visit"),
    [listItems],
  );

  if (!accessToken) {
    return <Redirect href="/(onboarding)/welcome" />;
  }

  if (!id) {
    return null;
  }

  return (
    <PageBackground>
      <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Ionicons color={fecaTheme.colors.onSurface} name="chevron-back" size={22} />
        </Pressable>
        <Text style={styles.screenTitle}>
          {listEmoji} {listTitle}
        </Text>
        <View style={styles.back} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={fecaTheme.colors.primary} size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {visitsInList.length > 0 ? (
            <Text style={styles.section}>Reseñas guardadas</Text>
          ) : null}
          {visitsInList.map((v) => (
            <View key={v.visitId} style={styles.visitRow}>
              {v.photoUrl ? (
                <Image contentFit="cover" source={{ uri: v.photoUrl }} style={styles.visitImg} />
              ) : (
                <View style={[styles.visitImg, styles.ph]}>
                  <Ionicons color={fecaTheme.colors.muted} name="cafe-outline" size={20} />
                </View>
              )}
              <View style={styles.visitText}>
                <Text style={styles.visitName}>{v.placeName ?? "Reseña"}</Text>
                <Text style={styles.visitMeta}>Reseña guardada</Text>
              </View>
            </View>
          ))}

          {groupsInList.length > 0 ? (
            <Text style={styles.section}>Planes</Text>
          ) : null}
          {groupsInList.map((g) => {
            const fg = groupCache[g.groupId];
            return fg ? (
              <GroupCard key={g.groupId} group={fg} />
            ) : (
              <View key={g.groupId} style={styles.fallbackRow}>
                <Text style={styles.visitName}>{g.groupName ?? "Plan"}</Text>
                <Text style={styles.visitMeta}>Cargando…</Text>
              </View>
            );
          })}

          {apiPlaces.length > 0 ? (
            <Text style={styles.section}>Lugares</Text>
          ) : null}
          {apiPlaces.map((sp) => (
            <PlaceCard
              key={sp.id}
              eyebrow={sp.reason}
              meta={formatVisitDate(sp.savedAt)}
              place={sp.place}
            />
          ))}

          {!loading && apiPlaces.length === 0 && listItems.length === 0 ? (
            <Text style={styles.empty}>Esta lista está vacía.</Text>
          ) : null}
        </ScrollView>
      )}
    </PageBackground>
  );
}

const styles = StyleSheet.create({
  top: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: fecaTheme.spacing.md,
  },
  back: {
    alignItems: "center",
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  screenTitle: {
    ...fecaTheme.typography.headline,
    color: fecaTheme.colors.onSurface,
    flex: 1,
    fontSize: 20,
    textAlign: "center",
  },
  center: {
    paddingVertical: fecaTheme.spacing.xxxl,
  },
  scroll: {
    gap: fecaTheme.spacing.md,
    paddingBottom: 120,
    paddingHorizontal: fecaTheme.spacing.lg,
    paddingTop: fecaTheme.spacing.md,
  },
  section: {
    ...fecaTheme.typography.label,
    color: fecaTheme.colors.muted,
    letterSpacing: 1,
    marginTop: fecaTheme.spacing.md,
  },
  visitRow: {
    alignItems: "center",
    backgroundColor: fecaTheme.surfaces.lowest,
    borderRadius: fecaTheme.radii.md,
    flexDirection: "row",
    gap: fecaTheme.spacing.md,
    padding: fecaTheme.spacing.md,
    ...fecaTheme.elevation.ambient,
  },
  visitText: {
    flex: 1,
    gap: 2,
  },
  visitImg: {
    borderRadius: fecaTheme.radii.sm,
    height: 48,
    width: 48,
  },
  ph: {
    alignItems: "center",
    backgroundColor: fecaTheme.surfaces.high,
    justifyContent: "center",
  },
  visitName: {
    ...fecaTheme.typography.bodyStrong,
    color: fecaTheme.colors.onSurface,
  },
  visitMeta: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.muted,
  },
  fallbackRow: {
    paddingVertical: fecaTheme.spacing.sm,
  },
  empty: {
    ...fecaTheme.typography.body,
    color: fecaTheme.colors.muted,
    paddingVertical: fecaTheme.spacing.xl,
    textAlign: "center",
  },
});
