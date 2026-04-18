import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { fecaTheme } from "@/theme/feca";
import type { NearbyPlace } from "@/types/places";

const CARD_WIDTH = 208;
const IMAGE_HEIGHT = 232;
/** Ancho reservado a la derecha para “Ver mapa” (evita recorte por flex / clip del list) */
const MAP_LINK_RESERVE = 118;

type NearbyPlacesSliderProps = {
  places: NearbyPlace[];
  isLoading: boolean;
  error: string | null;
  onRetry?: () => void;
};

function SliderCard({ place }: { place: NearbyPlace }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(`/place/${place.googlePlaceId}`)}
      style={styles.card}
    >
      <View style={styles.imageWrap}>
        {place.photoUrl ? (
          <Image
            contentFit="cover"
            source={{ uri: place.photoUrl }}
            style={styles.image}
          />
        ) : (
          <View style={[styles.image, styles.imageFallback]}>
            <Ionicons
              color={fecaTheme.colors.muted}
              name="cafe-outline"
              size={40}
            />
          </View>
        )}
        {place.rating != null ? (
          <View style={styles.ratingPill} accessibilityLabel={`Rating ${place.rating}`}>
            <Text style={styles.ratingValue}>{place.rating.toFixed(1)}</Text>
            <Ionicons color={fecaTheme.colors.onSurface} name="star" size={12} />
          </View>
        ) : null}
      </View>
      <View style={styles.cardBody}>
        <Text numberOfLines={2} style={styles.placeName}>
          {place.name}
        </Text>
        <Text numberOfLines={2} style={styles.placeAddress}>
          {place.address}
        </Text>
      </View>
    </Pressable>
  );
}

export function NearbyPlacesSlider({
  places,
  isLoading,
  error,
  onRetry,
}: NearbyPlacesSliderProps) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text
          ellipsizeMode="tail"
          numberOfLines={1}
          style={styles.sectionTitle}
        >
          Lugares cerca
        </Text>
        <Pressable
          accessibilityLabel="Ver mapa"
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => router.push("/explore")}
          style={styles.mapLinkPressable}
        >
          <Text
            style={styles.mapLink}
            {...(Platform.OS === "android" ? { includeFontPadding: false } : {})}
          >
            Ver mapa
          </Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={fecaTheme.colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.messageBox}>
          <Text style={styles.messageText}>{error}</Text>
          {onRetry ? (
            <Pressable onPress={onRetry} style={styles.retryBtn}>
              <Text style={styles.retryLabel}>Reintentar</Text>
            </Pressable>
          ) : null}
        </View>
      ) : places.length === 0 ? (
        <Text style={styles.emptyHint}>
          No hay lugares cerca para mostrar. Si acabás de cambiar de ciudad, probá
          tirar para actualizar; si sigue vacío, puede que aún no haya datos en esa
          zona en FECA.
        </Text>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          {places.map((place) => (
            <SliderCard key={place.googlePlaceId} place={place} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: fecaTheme.spacing.md,
    marginBottom: fecaTheme.spacing.xl,
  },
  sectionHeader: {
    minHeight: 28,
    overflow: "visible",
    position: "relative",
    width: "100%",
  },
  sectionTitle: {
    ...fecaTheme.typography.title,
    color: fecaTheme.colors.onSurface,
    fontSize: 22,
    lineHeight: 26,
    maxWidth: "100%",
    paddingRight: MAP_LINK_RESERVE,
  },
  mapLinkPressable: {
    alignItems: "center",
    bottom: 0,
    flexShrink: 0,
    justifyContent: "center",
    paddingLeft: fecaTheme.spacing.xs,
    paddingRight: 2,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 2,
  },
  mapLink: {
    ...fecaTheme.typography.bodyStrong,
    color: fecaTheme.colors.primary,
    fontSize: 15,
    paddingRight: Platform.OS === "android" ? 2 : 1,
  },
  scrollContent: {
    gap: fecaTheme.spacing.md,
    paddingRight: fecaTheme.spacing.lg,
  },
  card: {
    width: CARD_WIDTH,
  },
  imageWrap: {
    borderRadius: fecaTheme.radii.xl,
    height: IMAGE_HEIGHT,
    overflow: "hidden",
    position: "relative",
    width: CARD_WIDTH,
  },
  image: {
    height: IMAGE_HEIGHT,
    width: CARD_WIDTH,
  },
  imageFallback: {
    alignItems: "center",
    backgroundColor: fecaTheme.surfaces.high,
    justifyContent: "center",
  },
  ratingPill: {
    alignItems: "center",
    backgroundColor: "rgba(245, 243, 239, 0.94)",
    borderRadius: fecaTheme.radii.pill,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    position: "absolute",
    right: 10,
    top: 10,
  },
  ratingValue: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.onSurface,
    fontFamily: "Manrope_600SemiBold",
    fontSize: 13,
  },
  cardBody: {
    gap: 4,
    marginTop: fecaTheme.spacing.sm,
    paddingRight: fecaTheme.spacing.xxs,
  },
  placeName: {
    ...fecaTheme.typography.title,
    color: fecaTheme.colors.onSurface,
    fontSize: 17,
    lineHeight: 22,
  },
  placeAddress: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.muted,
    fontSize: 12,
    lineHeight: 16,
  },
  loadingRow: {
    alignItems: "center",
    height: IMAGE_HEIGHT + 56,
    justifyContent: "center",
  },
  messageBox: {
    gap: fecaTheme.spacing.sm,
  },
  messageText: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.secondary,
  },
  retryBtn: {
    alignSelf: "flex-start",
  },
  retryLabel: {
    ...fecaTheme.typography.bodyStrong,
    color: fecaTheme.colors.primary,
    fontSize: 14,
  },
  emptyHint: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.muted,
    lineHeight: 20,
  },
});
