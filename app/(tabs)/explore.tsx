import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { NearbyPlaceCard } from "@/components/cards/nearby-place-card";
import { ExploreHeader } from "@/components/explore/explore-header";
import { ExploreQuickChip } from "@/components/explore/explore-quick-chip";
import { EmptyState } from "@/components/ui/empty-state";
import { PageBackground } from "@/components/ui/page-background";
import { fetchExploreContext, fetchNearbyPlaces } from "@/lib/api/places";
import type { ExploreContextId } from "@/lib/explore-contexts";
import { useAuth } from "@/providers/auth-provider";
import { fecaTheme } from "@/theme/feca";
import type { NearbyPlace } from "@/types/places";

const DEBOUNCE_MS = 400;

type QuickMode = "near" | "wifi" | "specialty";

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();

  const [places, setPlaces] = useState<NearbyPlace[]>([]);
  const [query, setQuery] = useState("");
  const [quickMode, setQuickMode] = useState<QuickMode>("near");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<TextInput>(null);

  const lat = session?.user.lat;
  const lng = session?.user.lng;
  const accessToken = session?.accessToken;

  const search = useCallback(
    async (searchQuery: string, modeOverride?: QuickMode) => {
      if (!accessToken) {
        setPlaces([]);
        setIsLoading(false);
        setError(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      const mode = modeOverride ?? quickMode;
      const q = searchQuery.trim();

      try {
        if (q) {
          const type = mode === "specialty" ? "cafe" : undefined;
          const results = await fetchNearbyPlaces({
            accessToken,
            lat: lat ?? undefined,
            lng: lng ?? undefined,
            query: q,
            type,
          });
          setPlaces(results);
        } else if (mode === "wifi") {
          const results = await fetchExploreContext({
            accessToken,
            intent: "work_2h" as ExploreContextId,
            lat: lat ?? undefined,
            lng: lng ?? undefined,
          });
          setPlaces(results);
        } else if (mode === "specialty") {
          const results = await fetchNearbyPlaces({
            accessToken,
            lat: lat ?? undefined,
            lng: lng ?? undefined,
            type: "cafe",
          });
          setPlaces(results);
        } else {
          const results = await fetchNearbyPlaces({
            accessToken,
            lat: lat ?? undefined,
            lng: lng ?? undefined,
          });
          setPlaces(results);
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "No se pudieron cargar los lugares";
        setError(message);
        setPlaces([]);
      } finally {
        setIsLoading(false);
      }
    },
    [accessToken, lat, lng, quickMode],
  );

  const queryRef = useRef(query);
  queryRef.current = query;
  const searchRef = useRef(search);
  searchRef.current = search;

  useEffect(() => {
    void searchRef.current(queryRef.current);
  }, [accessToken, lat, lng]);

  const handleQueryChange = useCallback(
    (text: string) => {
      setQuery(text);
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        void search(text);
      }, DEBOUNCE_MS);
    },
    [search],
  );

  const selectQuickMode = useCallback((mode: QuickMode) => {
    setQuery("");
    setQuickMode(mode);
    void search("", mode);
  }, [search]);

  const filtersActive = !query.trim();

  const hasLocation = lat != null && lng != null;

  const openMapsNearby = useCallback(() => {
    if (lat != null && lng != null) {
      void Linking.openURL(
        `https://www.google.com/maps/search/café/@${lat},${lng},15z`,
      );
      return;
    }
    void Linking.openURL("https://www.google.com/maps/search/café/");
  }, [lat, lng]);

  return (
    <PageBackground>
      <View style={styles.screenWrap}>
        <FlatList
          contentContainerStyle={[
            styles.content,
            { paddingBottom: 140 + insets.bottom },
          ]}
          contentInsetAdjustmentBehavior="never"
          data={places}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          keyExtractor={(item) => item.googlePlaceId}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            isLoading ? (
              <View style={styles.centered}>
                <ActivityIndicator color={fecaTheme.colors.primary} size="large" />
              </View>
            ) : !hasLocation ? (
              <EmptyState
                description="Activá tu ubicación o volvé al onboarding para completar tu ciudad."
                icon="location-outline"
                title="Sin ubicación"
              />
            ) : error ? (
              <EmptyState
                description={error}
                icon="cloud-offline-outline"
                title="Error al buscar"
              />
            ) : (
              <EmptyState
                description="Probá otro término o cambiá los filtros."
                icon="map-outline"
                title="Sin resultados"
              />
            )
          }
          ListHeaderComponent={
            <View>
              <ExploreHeader
                onPressMenu={() => router.push("/(tabs)/profile")}
                onPressSearch={() => searchInputRef.current?.focus()}
              />

              <View style={styles.searchShell}>
                <Ionicons
                  color={fecaTheme.colors.muted}
                  name="search-outline"
                  size={20}
                  style={styles.searchIcon}
                />
                <TextInput
                  ref={searchInputRef}
                  autoCapitalize="none"
                  autoCorrect={false}
                  onChangeText={handleQueryChange}
                  placeholder="Buscar granos, barrios o baristas…"
                  placeholderTextColor={fecaTheme.colors.muted}
                  selectionColor={fecaTheme.colors.primary}
                  style={styles.searchInput}
                  value={query}
                  {...(Platform.OS === "android"
                    ? { includeFontPadding: false }
                    : {})}
                />
              </View>

              <ScrollView
                horizontal
                contentContainerStyle={styles.chipRow}
                showsHorizontalScrollIndicator={false}
              >
                <ExploreQuickChip
                  emphasis="strong"
                  icon="navigate"
                  label="Cerca de mí"
                  selected={filtersActive && quickMode === "near"}
                  onPress={() => selectQuickMode("near")}
                />
                <ExploreQuickChip
                  icon="wifi"
                  label="Wifi gratis"
                  selected={filtersActive && quickMode === "wifi"}
                  onPress={() => selectQuickMode("wifi")}
                />
                <ExploreQuickChip
                  icon="cafe-outline"
                  label="Café de especialidad"
                  selected={filtersActive && quickMode === "specialty"}
                  onPress={() => selectQuickMode("specialty")}
                />
              </ScrollView>
            </View>
          }
          removeClippedSubviews={false}
          renderItem={({ item }) => <NearbyPlaceCard place={item} />}
          showsVerticalScrollIndicator={false}
        />

        <Pressable
          accessibilityLabel="Abrir mapa de cafés cercanos"
          accessibilityRole="button"
          onPress={openMapsNearby}
          style={[
            styles.mapFab,
            { bottom: 108 + insets.bottom, right: fecaTheme.spacing.lg },
          ]}
        >
          <Ionicons color={fecaTheme.colors.surfaceBright} name="map" size={22} />
        </Pressable>
      </View>
    </PageBackground>
  );
}

const styles = StyleSheet.create({
  screenWrap: {
    flex: 1,
  },
  content: {
    paddingHorizontal: fecaTheme.spacing.lg,
    paddingTop: 0,
  },
  searchShell: {
    alignItems: "center",
    backgroundColor: fecaTheme.surfaces.low,
    borderRadius: fecaTheme.radii.pill,
    flexDirection: "row",
    marginBottom: fecaTheme.spacing.lg,
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
  chipRow: {
    flexDirection: "row",
    gap: fecaTheme.spacing.sm,
    marginBottom: fecaTheme.spacing.xl,
    paddingVertical: 2,
  },
  separator: {
    height: fecaTheme.spacing.lg,
  },
  centered: {
    alignItems: "center",
    paddingVertical: fecaTheme.spacing.xxl,
  },
  mapFab: {
    alignItems: "center",
    backgroundColor: fecaTheme.colors.primaryDim,
    borderRadius: fecaTheme.radii.pill,
    height: 56,
    justifyContent: "center",
    position: "absolute",
    width: 56,
    ...fecaTheme.elevation.floating,
  },
});
