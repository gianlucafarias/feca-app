import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { fecaTheme, hexToRgba } from "@/theme/feca";
import type { NearbyPlace } from "@/types/places";

export type NearbyPlaceSearchResultsProps = {
  places: NearbyPlace[];
  isLoading: boolean;
  queryTrimmed: string;
  onPressPlace: (place: NearbyPlace) => void;
  /** Si está definido y hay texto, se muestra la fila “Agregar …” */
  onPressManualAdd?: () => void;
  isRowDimmed?: (place: NearbyPlace) => boolean;
  isRowSelected?: (place: NearbyPlace) => boolean;
  /** Hint cuando no hay búsqueda y no hay resultados (p. ej. sugerencias aún no cargaron) */
  emptyNoQueryHint?: string;
  /** Hint cuando hay búsqueda pero la lista viene vacía */
  emptyNoResultsHint?: string;
};

export function NearbyPlaceSearchResults({
  places,
  isLoading,
  queryTrimmed,
  onPressPlace,
  onPressManualAdd,
  isRowDimmed,
  isRowSelected,
  emptyNoQueryHint = "Escribe el nombre del lugar que visitaste",
  emptyNoResultsHint,
}: NearbyPlaceSearchResultsProps) {
  const showManual = Boolean(onPressManualAdd && queryTrimmed);
  const showEmptyNoQuery =
    !isLoading &&
    places.length === 0 &&
    !queryTrimmed &&
    Boolean(emptyNoQueryHint);
  const showEmptyNoResults =
    !isLoading &&
    places.length === 0 &&
    Boolean(queryTrimmed) &&
    Boolean(emptyNoResultsHint);

  return (
    <View style={styles.results}>
      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={fecaTheme.colors.primary} size="small" />
        </View>
      ) : (
        <>
          {places.map((place) => {
            const dimmed = isRowDimmed?.(place) === true;
            const selected = isRowSelected?.(place) === true;
            return (
              <Pressable
                key={place.googlePlaceId}
                disabled={dimmed}
                onPress={() => onPressPlace(place)}
                style={[
                  styles.option,
                  dimmed && styles.optionDimmed,
                  selected && styles.optionSelected,
                ]}
              >
                {place.photoUrl ? (
                  <Image
                    contentFit="cover"
                    source={{ uri: place.photoUrl }}
                    style={styles.optionThumb}
                  />
                ) : (
                  <View style={[styles.optionThumb, styles.optionThumbFallback]}>
                    <Ionicons
                      color={fecaTheme.colors.muted}
                      name="cafe-outline"
                      size={16}
                    />
                  </View>
                )}
                <View style={styles.optionText}>
                  <Text numberOfLines={1} style={styles.optionName}>
                    {place.name}
                  </Text>
                  <Text numberOfLines={1} style={styles.optionMeta}>
                    {place.address}
                  </Text>
                </View>
                {place.rating != null ? (
                  <View style={styles.optionRating}>
                    <Ionicons color={fecaTheme.colors.secondary} name="star" size={11} />
                    <Text style={styles.optionRatingText}>
                      {place.rating.toFixed(1)}
                    </Text>
                  </View>
                ) : null}
                {selected ? (
                  <Ionicons
                    color={fecaTheme.colors.primary}
                    name="checkmark-circle"
                    size={22}
                    style={styles.selectedIcon}
                  />
                ) : null}
              </Pressable>
            );
          })}

          {showManual ? (
            <Pressable onPress={onPressManualAdd} style={styles.option}>
              <View style={styles.createBadge}>
                <Ionicons color={fecaTheme.colors.primary} name="add" size={14} />
              </View>
              <Text style={styles.createText}>
                Agregar &quot;{queryTrimmed}&quot;
              </Text>
            </Pressable>
          ) : null}

          {showEmptyNoQuery ? (
            <Text style={styles.emptyHint}>{emptyNoQueryHint}</Text>
          ) : null}
          {showEmptyNoResults ? (
            <Text style={styles.emptyHint}>{emptyNoResultsHint}</Text>
          ) : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  results: {
    gap: fecaTheme.spacing.sm,
    paddingTop: fecaTheme.spacing.lg,
  },
  loadingWrap: {
    alignItems: "center",
    paddingVertical: fecaTheme.spacing.xxl,
  },
  option: {
    alignItems: "center",
    backgroundColor: fecaTheme.surfaces.low,
    borderRadius: fecaTheme.radii.sm,
    flexDirection: "row",
    gap: fecaTheme.spacing.sm,
    minHeight: 60,
    paddingHorizontal: fecaTheme.spacing.md,
    paddingVertical: fecaTheme.spacing.sm,
  },
  optionDimmed: {
    opacity: 0.45,
  },
  optionSelected: {
    borderColor: hexToRgba(fecaTheme.colors.primary, 0.35),
    borderWidth: 1.5,
  },
  optionThumb: {
    borderRadius: fecaTheme.radii.sm,
    height: 40,
    width: 40,
  },
  optionThumbFallback: {
    alignItems: "center",
    backgroundColor: fecaTheme.surfaces.high,
    justifyContent: "center",
  },
  optionText: {
    flex: 1,
    gap: 2,
  },
  optionName: {
    ...fecaTheme.typography.bodyStrong,
    color: fecaTheme.colors.onSurface,
  },
  optionMeta: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.muted,
  },
  optionRating: {
    alignItems: "center",
    flexDirection: "row",
    gap: 3,
  },
  optionRatingText: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.onSurface,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 12,
  },
  selectedIcon: {
    marginLeft: 2,
  },
  emptyHint: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.muted,
    paddingVertical: fecaTheme.spacing.xl,
    textAlign: "center",
  },
  createBadge: {
    alignItems: "center",
    backgroundColor: hexToRgba(fecaTheme.colors.primary, 0.14),
    borderRadius: fecaTheme.radii.pill,
    height: 22,
    justifyContent: "center",
    width: 22,
  },
  createText: {
    ...fecaTheme.typography.bodyStrong,
    color: fecaTheme.colors.primary,
  },
});
