import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
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

import { EditorialCarouselCard } from "@/components/home/editorial-carousel-card";
import { getNearbyFriendRows } from "@/lib/places/nearby-friend-rows";
import { fecaTheme, hexToRgba } from "@/theme/feca";
import type { NearbyPlace } from "@/types/places";

const CARD_WIDTH = 208;
const IMAGE_HEIGHT = 232;

const ec = fecaTheme.homeEditorialCarousel;

/** Ancho reservado a la derecha para “Ver mapa” (evita recorte por flex / clip del list) */
const MAP_LINK_RESERVE = 118;

const TYPE_LABELS: Record<string, string> = {
  cafe: "Café",
  restaurant: "Restaurante",
  bakery: "Panadería",
  bar: "Bar",
  meal_takeaway: "Para llevar",
};

function formatPrimaryType(primaryType?: string) {
  if (!primaryType) return null;
  return TYPE_LABELS[primaryType] ?? primaryType.replace(/_/g, " ");
}

export type NearbyPlacesSliderCardLayout = "classic" | "editorial";

type NearbyPlacesSliderProps = {
  title: string;
  places: NearbyPlace[];
  isLoading: boolean;
  error: string | null;
  onRetry?: () => void;
  /** Texto breve bajo el título. */
  hint?: string;
  /** Solo la sección principal suele mostrar el enlace a Explorar. */
  showMapLink?: boolean;
  /**
   * Si true: tras terminar de cargar sin error, no se muestra nada si no hay lugares
   * (p. ej. “Abierto ahora” vacío).
   */
  hideWhenEmptyAfterLoad?: boolean;
  /**
   * `editorial`: foto vertical, sello con rating, pill (por defecto en home).
   */
  cardLayout?: NearbyPlacesSliderCardLayout;
};

function buildSliderChips(place: NearbyPlace): { text: string; kind: "open" | "social" }[] {
  const out: { text: string; kind: "open" | "social" }[] = [];
  if (place.openingChip?.trim()) {
    out.push({ text: place.openingChip.trim(), kind: "open" });
  }
  for (const line of place.socialChips ?? []) {
    const t = line.trim();
    if (t) {
      out.push({ text: t, kind: "social" });
    }
  }
  return out.slice(0, 3);
}

function buildEditorialCaption(place: NearbyPlace): string {
  const social = place.socialChips?.find((s) => s.trim())?.trim();
  if (social) return social;
  const open = place.openingChip?.trim();
  if (open) return open;
  const typeLabel = formatPrimaryType(place.primaryType);
  if (typeLabel) {
    return `${typeLabel} para descubrir hoy`;
  }
  return place.name;
}

/** Texto del pill cuando ya mostramos amigos arriba (no repetir socialChips). */
function buildEditorialPillText(place: NearbyPlace, friendCount: number): string {
  if (friendCount > 0) {
    const open = place.openingChip?.trim();
    if (open) {
      return open;
    }
    const typeLabel = formatPrimaryType(place.primaryType);
    if (typeLabel) {
      return `${typeLabel} para descubrir hoy`;
    }
    return "Tu red pasó por acá";
  }
  return buildEditorialCaption(place);
}

function SliderCardClassic({ place }: { place: NearbyPlace }) {
  const chips = buildSliderChips(place);

  return (
    <Pressable
      accessibilityLabel={`${place.name}. ${place.address}`}
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
        {chips.length > 0 ? (
          <>
            <LinearGradient
              colors={[
                hexToRgba(fecaTheme.colors.onSurface, 0),
                hexToRgba(fecaTheme.colors.onSurface, 0.35),
                hexToRgba(fecaTheme.colors.onSurface, 0.82),
              ]}
              locations={[0, 0.45, 1]}
              pointerEvents="none"
              style={styles.photoGradient}
            />
            <View pointerEvents="none" style={styles.chipOverlay}>
              <View style={styles.chipRow}>
                {chips.map((c, i) => (
                  <View
                    key={`${place.googlePlaceId}-chip-${i}`}
                    style={[
                      styles.chip,
                      c.kind === "open" ? styles.chipOpen : styles.chipSocial,
                    ]}
                  >
                    <Text
                      numberOfLines={2}
                      style={[
                        styles.chipText,
                        c.kind === "open" ? styles.chipTextOpen : styles.chipTextSocial,
                      ]}
                    >
                      {c.text}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </>
        ) : null}
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

function SliderCardEditorial({ place, index }: { place: NearbyPlace; index: number }) {
  const friendRows = getNearbyFriendRows(place);
  const pillText = buildEditorialPillText(place, friendRows.length);
  const ratingLine =
    place.rating != null ? `Valoración ${place.rating.toFixed(1)} de 5. ` : "";
  const friendsLine =
    friendRows.length > 0
      ? `${friendRows
          .map((r) => `@${r.username}${r.snippet ? ` ${r.snippet}` : ""}`)
          .join(". ")}. `
      : "";
  return (
    <EditorialCarouselCard
      accessibilityLabel={`${place.name}. ${friendsLine}${ratingLine}${pillText}`}
      captionText={place.name}
      fallbackIcon="cafe-outline"
      friendRows={friendRows}
      imageUrl={place.photoUrl}
      index={index}
      onPress={() => router.push(`/place/${place.googlePlaceId}`)}
      pillText={pillText}
      sealText={
        place.rating != null ? place.rating.toFixed(1) : null
      }
    />
  );
}

export function NearbyPlacesSlider({
  title,
  places,
  isLoading,
  error,
  onRetry,
  hint,
  showMapLink = false,
  hideWhenEmptyAfterLoad = false,
  cardLayout = "editorial",
}: NearbyPlacesSliderProps) {
  const reserveRight = showMapLink ? MAP_LINK_RESERVE : 0;
  const editorial = cardLayout === "editorial";
  const loadingHeight = editorial ? ec.imageHeight + 24 : IMAGE_HEIGHT + 56;

  if (
    hideWhenEmptyAfterLoad &&
    !isLoading &&
    !error &&
    places.length === 0
  ) {
    return null;
  }

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text
          ellipsizeMode="tail"
          numberOfLines={1}
          style={[
            editorial ? styles.sectionTitleEditorial : styles.sectionTitle,
            { paddingRight: reserveRight },
          ]}
        >
          {title}
        </Text>
        {showMapLink ? (
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
        ) : null}
      </View>

      {hint ? (
        <Text
          style={[
            styles.hint,
            reserveRight > 0 ? { paddingRight: reserveRight } : undefined,
          ]}
        >
          {hint}
        </Text>
      ) : null}

      {isLoading ? (
        <View style={[styles.loadingRow, { height: loadingHeight }]}>
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
          {places.map((place, index) =>
            editorial ? (
              <SliderCardEditorial
                key={place.googlePlaceId}
                index={index}
                place={place}
              />
            ) : (
              <SliderCardClassic key={place.googlePlaceId} place={place} />
            ),
          )}
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
  hint: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.muted,
    lineHeight: 18,
    marginBottom: fecaTheme.spacing.xs,
  },
  sectionTitle: {
    ...fecaTheme.typography.title,
    color: fecaTheme.colors.onSurface,
    fontSize: 22,
    lineHeight: 26,
    maxWidth: "100%",
  },
  sectionTitleEditorial: {
    ...fecaTheme.typography.homeCarouselSection,
    color: fecaTheme.colors.onSurface,
    maxWidth: "100%",
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
    borderRadius: fecaTheme.radii.carouselEditorial,
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
  photoGradient: {
    bottom: 0,
    height: 112,
    left: 0,
    position: "absolute",
    right: 0,
    zIndex: 1,
  },
  chipOverlay: {
    bottom: 0,
    left: 0,
    paddingBottom: 10,
    paddingHorizontal: 10,
    paddingTop: 6,
    position: "absolute",
    right: 0,
    zIndex: 2,
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
    zIndex: 3,
  },
  ratingValue: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.onSurface,
    fontFamily: "PlusJakartaSans_600SemiBold",
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
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    borderRadius: fecaTheme.radii.pill,
    maxWidth: "100%",
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipOpen: {
    backgroundColor: "rgba(255, 255, 255, 0.96)",
    borderWidth: 1,
    borderColor: "rgba(76, 175, 128, 0.45)",
  },
  chipSocial: {
    backgroundColor: "rgba(255, 255, 255, 0.94)",
  },
  chipText: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 12,
    lineHeight: 16,
  },
  chipTextOpen: {
    color: fecaTheme.colors.onSurface,
  },
  chipTextSocial: {
    color: fecaTheme.colors.onSurface,
  },
  loadingRow: {
    alignItems: "center",
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
