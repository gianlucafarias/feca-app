import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { NearbyPlaceCard } from "@/components/cards/nearby-place-card";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { FormField } from "@/components/ui/form-field";
import { PageBackground } from "@/components/ui/page-background";
import { fetchExploreContext, fetchNearbyPlaces } from "@/lib/api/places";
import {
  EXPLORE_CONTEXTS,
  type ExploreContextId,
} from "@/lib/explore-contexts";
import { useAuth } from "@/providers/auth-provider";
import { fecaTheme } from "@/theme/feca";
import type { NearbyPlace } from "@/types/places";

type TypeFilter = "all" | "cafe" | "restaurant";

const DEBOUNCE_MS = 400;

export default function ExploreScreen() {
  const { session } = useAuth();

  const [places, setPlaces] = useState<NearbyPlace[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<TypeFilter>("all");
  const [contextFilter, setContextFilter] = useState<ExploreContextId | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lat = session?.user.lat;
  const lng = session?.user.lng;
  const accessToken = session?.accessToken;

  const search = useCallback(
    async (searchQuery: string, typeFilter: TypeFilter) => {
      if (!accessToken) {
        setPlaces([]);
        setIsLoading(false);
        setError(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const results = await fetchNearbyPlaces({
          accessToken,
          lat: lat ?? undefined,
          lng: lng ?? undefined,
          query: searchQuery.trim() || undefined,
          type: typeFilter === "all" ? undefined : typeFilter,
        });
        setPlaces(results);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "No se pudieron cargar los lugares";
        setError(message);
        setPlaces([]);
      } finally {
        setIsLoading(false);
      }
    },
    [accessToken, lat, lng],
  );

  useEffect(() => {
    if (contextFilter != null) {
      if (!accessToken) {
        setPlaces([]);
        setIsLoading(false);
        setError(null);
      } else {
        setIsLoading(true);
        setError(null);
        void fetchExploreContext({
          accessToken,
          intent: contextFilter,
          lat: lat ?? undefined,
          lng: lng ?? undefined,
        })
          .then((results) => {
            setPlaces(results);
          })
          .catch((err) => {
            const message =
              err instanceof Error
                ? err.message
                : "No se pudieron cargar los contextos";
            setError(message);
            setPlaces([]);
          })
          .finally(() => {
            setIsLoading(false);
          });
      }
      return;
    }
    void search("", filter);
  }, [accessToken, contextFilter, filter, lat, lng, search]);

  const handleQueryChange = useCallback(
    (text: string) => {
      setQuery(text);
      if (contextFilter != null) {
        setContextFilter(null);
      }

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        void search(text, filter);
      }, DEBOUNCE_MS);
    },
    [filter, search, contextFilter],
  );

  const handleFilterChange = useCallback(
    (next: TypeFilter) => {
      setFilter(next);
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      if (contextFilter != null) {
        setContextFilter(null);
      }
      void search(query, next);
    },
    [query, search, contextFilter],
  );

  const selectContext = useCallback((id: ExploreContextId) => {
    setQuery("");
    setContextFilter((current) => (current === id ? null : id));
  }, []);

  const hasLocation = lat != null && lng != null;

  const contextLabel = contextFilter
    ? EXPLORE_CONTEXTS.find((c) => c.id === contextFilter)?.label
    : null;

  return (
    <PageBackground>
      <FlatList
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        data={places}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        keyExtractor={(item) => item.googlePlaceId}
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator color={fecaTheme.colors.primary} size="large" />
            </View>
          ) : !hasLocation ? (
            <EmptyState
              description="Activa tu ubicación o vuelve a onboarding para completar tu ciudad."
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
              description="Probá otro momento o limpiá la búsqueda."
              icon="map-outline"
              title="Sin resultados"
            />
          )
        }
        ListHeaderComponent={
          <View style={styles.headerWrap}>
            <Text style={styles.screenTitle}>Explorar</Text>
            <Text style={styles.screenSubtitle}>
              Elegí un momento: te sugerimos lugares con intención. El
              buscador sigue acá para cuando ya sabés qué buscar.
            </Text>

            <ScrollView
              horizontal
              contentContainerStyle={styles.contextRow}
              showsHorizontalScrollIndicator={false}
            >
              {EXPLORE_CONTEXTS.map((ctx) => (
                <Chip
                  key={ctx.id}
                  label={ctx.label}
                  onPress={() => selectContext(ctx.id)}
                  selected={contextFilter === ctx.id}
                />
              ))}
            </ScrollView>

            {contextFilter ? (
              <Text style={styles.contextHint}>
                {EXPLORE_CONTEXTS.find((c) => c.id === contextFilter)?.subtitle}
              </Text>
            ) : null}

            <FormField
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={handleQueryChange}
              placeholder="Buscar café, restaurante..."
              value={query}
            />

            <View style={styles.filters}>
              <Chip
                label="Todo"
                onPress={() => handleFilterChange("all")}
                selected={filter === "all"}
              />
              <Chip
                label="Café"
                onPress={() => handleFilterChange("cafe")}
                selected={filter === "cafe"}
              />
              <Chip
                label="Restaurante"
                onPress={() => handleFilterChange("restaurant")}
                selected={filter === "restaurant"}
              />
            </View>

            <View style={styles.listHeading}>
              <Text style={styles.listTitle}>
                {contextLabel ? contextLabel : "Lugares"}
              </Text>
              {!isLoading ? (
                <Text style={styles.listMeta}>
                  {places.length}{" "}
                  {places.length === 1 ? "resultado" : "resultados"}
                </Text>
              ) : null}
            </View>
          </View>
        }
        renderItem={({ item }) => <NearbyPlaceCard place={item} />}
        showsVerticalScrollIndicator={false}
      />
    </PageBackground>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 140,
    paddingHorizontal: fecaTheme.spacing.lg,
    paddingTop: fecaTheme.spacing.xxl,
  },
  headerWrap: {
    gap: fecaTheme.spacing.lg,
    marginBottom: fecaTheme.spacing.lg,
  },
  screenTitle: {
    ...fecaTheme.typography.headline,
    color: fecaTheme.colors.onSurface,
    paddingHorizontal: fecaTheme.spacing.xs,
  },
  screenSubtitle: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.muted,
    lineHeight: 18,
    paddingHorizontal: fecaTheme.spacing.xs,
  },
  contextRow: {
    flexDirection: "row",
    gap: fecaTheme.spacing.sm,
    paddingVertical: fecaTheme.spacing.xxs,
  },
  contextHint: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.primary,
    paddingHorizontal: fecaTheme.spacing.xs,
  },
  filters: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: fecaTheme.spacing.sm,
  },
  listHeading: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: fecaTheme.spacing.xs,
  },
  listTitle: {
    ...fecaTheme.typography.bodyStrong,
    color: fecaTheme.colors.onSurface,
  },
  listMeta: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.muted,
  },
  separator: {
    height: fecaTheme.spacing.lg,
  },
  centered: {
    alignItems: "center",
    paddingVertical: fecaTheme.spacing.xxl,
  },
});
