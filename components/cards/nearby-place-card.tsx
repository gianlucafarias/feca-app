import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { haversineKm } from "@/lib/geo/distance";
import { useAuth } from "@/providers/auth-provider";
import { fecaTheme, hexToRgba } from "@/theme/feca";
import type { NearbyPlace } from "@/types/places";

type NearbyPlaceCardProps = {
  place: NearbyPlace;
  onPress?: () => void;
};

const TYPE_LABELS: Record<string, string> = {
  cafe: "Café",
  restaurant: "Restaurante",
  bakery: "Panadería",
  bar: "Bar",
  meal_takeaway: "Takeaway",
};

function formatType(primaryType?: string) {
  if (!primaryType) return null;
  return TYPE_LABELS[primaryType] ?? primaryType.replace(/_/g, " ");
}

/** Etiquetas cortas estilo editorial (mayúsculas) cuando el backend no mandó chips propios. */
function placeTagLabels(place: NearbyPlace): string[] {
  const tags: string[] = [];
  const primary = formatType(place.primaryType);
  if (primary) {
    tags.push(primary.replace(/\s/g, "-").toUpperCase());
  }
  const openingFromApi = Boolean(place.openingChip?.trim());
  if (place.rating != null && place.rating >= 4.5) {
    tags.push("WORK-FRIENDLY");
  } else if (!openingFromApi && place.openNow === true) {
    tags.push("ABIERTO AHORA");
  } else if (tags.length < 2 && place.types.includes("meal_takeaway")) {
    tags.push("TAKE AWAY");
  }
  return tags.slice(0, 2);
}

type CardChip = { text: string; variant: "open" | "social" | "meta" };

function buildApiChipsForOverlay(place: NearbyPlace): CardChip[] {
  const out: CardChip[] = [];
  if (place.openingChip?.trim()) {
    out.push({ text: place.openingChip.trim(), variant: "open" });
  }
  for (const line of place.socialChips ?? []) {
    const t = line.trim();
    if (t) {
      out.push({ text: t, variant: "social" });
    }
  }
  return out.slice(0, 3);
}

function buildCardChips(place: NearbyPlace): CardChip[] {
  const out: CardChip[] = [];
  if (place.openingChip?.trim()) {
    out.push({ text: place.openingChip.trim(), variant: "open" });
  }
  for (const line of place.socialChips ?? []) {
    const t = line.trim();
    if (t) {
      out.push({ text: t, variant: "social" });
    }
  }
  for (const t of placeTagLabels(place)) {
    out.push({ text: t, variant: "meta" });
  }
  return out.slice(0, 3);
}

function barrioLine(address: string) {
  const first = address.split(",")[0]?.trim();
  return first && first.length > 0 ? first : address;
}

export function NearbyPlaceCard({ place, onPress }: NearbyPlaceCardProps) {
  const { session } = useAuth();
  const userLat = session?.user.lat;
  const userLng = session?.user.lng;

  const distanceKm =
    userLat != null && userLng != null
      ? haversineKm(
          { lat: userLat, lng: userLng },
          { lat: place.lat, lng: place.lng },
        )
      : null;

  const handlePress =
    onPress ?? (() => router.push(`/place/${place.googlePlaceId}`));

  const overlayChips = buildApiChipsForOverlay(place);
  const bodyChips: CardChip[] =
    overlayChips.length > 0
      ? placeTagLabels(place).map((t) => ({ text: t, variant: "meta" as const }))
      : buildCardChips(place);
  const metaLine =
    distanceKm != null
      ? `${barrioLine(place.address)} · ${distanceKm < 10 ? distanceKm.toFixed(1) : Math.round(distanceKm)} km`
      : barrioLine(place.address);

  return (
    <Pressable onPress={handlePress} style={styles.outer}>
      <View style={styles.card}>
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
                size={32}
              />
            </View>
          )}
          {overlayChips.length > 0 ? (
            <>
              <LinearGradient
                colors={[
                  hexToRgba(fecaTheme.colors.onSurface, 0),
                  hexToRgba(fecaTheme.colors.onSurface, 0.35),
                  hexToRgba(fecaTheme.colors.onSurface, 0.82),
                ]}
                locations={[0, 0.45, 1]}
                pointerEvents="none"
                style={styles.imageGradient}
              />
              <View pointerEvents="none" style={styles.chipOverlay}>
                <View style={styles.overlayChipRow}>
                  {overlayChips.map((c, i) => (
                    <View
                      key={`${place.googlePlaceId}-ov-${i}`}
                      style={[
                        styles.overlayChip,
                        c.variant === "open"
                          ? styles.overlayChipOpen
                          : styles.overlayChipSocial,
                      ]}
                    >
                      <Text
                        numberOfLines={2}
                        style={[
                          styles.overlayChipText,
                          c.variant === "open"
                            ? styles.overlayChipTextOpen
                            : styles.overlayChipTextSocial,
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
        </View>
        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text numberOfLines={2} style={styles.name}>
              {place.name}
            </Text>
            {place.rating != null ? (
              <View style={styles.ratingBadge}>
                <Ionicons
                  color={fecaTheme.colors.onSurface}
                  name="star"
                  size={11}
                />
                <Text style={styles.ratingText}>
                  {place.rating.toFixed(1)}
                </Text>
              </View>
            ) : null}
          </View>
          <Text numberOfLines={1} style={styles.address}>
            {metaLine}
          </Text>
          {bodyChips.length > 0 ? (
            <View style={styles.tagRow}>
              {bodyChips.map((c, i) => (
                <View
                  key={`${place.googlePlaceId}-c-${i}`}
                  style={[
                    styles.tagChip,
                    c.variant === "open"
                      ? styles.tagChipOpen
                      : c.variant === "social"
                        ? styles.tagChipSocial
                        : null,
                  ]}
                >
                  <Text
                    numberOfLines={2}
                    style={[
                      styles.tagText,
                      c.variant === "open"
                        ? styles.tagTextOpen
                        : c.variant === "social"
                          ? styles.tagTextSocial
                          : null,
                    ]}
                  >
                    {c.text}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  outer: {
    backgroundColor: fecaTheme.surfaces.lowest,
    borderRadius: fecaTheme.radii.carouselEditorial,
    ...fecaTheme.elevation.ambient,
  },
  card: {
    borderRadius: fecaTheme.radii.carouselEditorial,
    overflow: "hidden",
  },
  imageWrap: {
    borderBottomLeftRadius: fecaTheme.radii.carouselEditorialPill,
    borderBottomRightRadius: fecaTheme.radii.carouselEditorialPill,
    borderTopLeftRadius: fecaTheme.radii.carouselEditorial,
    borderTopRightRadius: fecaTheme.radii.carouselEditorial,
    overflow: "hidden",
    position: "relative",
    width: "100%",
  },
  image: {
    height: 168,
    width: "100%",
  },
  imageGradient: {
    bottom: 0,
    height: 100,
    left: 0,
    position: "absolute",
    right: 0,
    zIndex: 1,
  },
  chipOverlay: {
    bottom: 0,
    left: 0,
    paddingBottom: 10,
    paddingHorizontal: fecaTheme.spacing.md,
    paddingTop: 6,
    position: "absolute",
    right: 0,
    zIndex: 2,
  },
  overlayChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  overlayChip: {
    borderRadius: fecaTheme.radii.pill,
    maxWidth: "100%",
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  overlayChipOpen: {
    backgroundColor: "rgba(255, 255, 255, 0.96)",
    borderColor: "rgba(76, 175, 128, 0.45)",
    borderWidth: 1,
  },
  overlayChipSocial: {
    backgroundColor: "rgba(255, 255, 255, 0.94)",
  },
  overlayChipText: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 12,
    lineHeight: 16,
  },
  overlayChipTextOpen: {
    color: fecaTheme.colors.onSurface,
  },
  overlayChipTextSocial: {
    color: fecaTheme.colors.onSurface,
  },
  imageFallback: {
    alignItems: "center",
    backgroundColor: fecaTheme.surfaces.high,
    justifyContent: "center",
  },
  body: {
    gap: fecaTheme.spacing.xs,
    paddingBottom: fecaTheme.spacing.lg,
    paddingHorizontal: fecaTheme.spacing.lg,
    paddingTop: fecaTheme.spacing.md,
  },
  titleRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: fecaTheme.spacing.sm,
    justifyContent: "space-between",
  },
  name: {
    color: fecaTheme.colors.onSurface,
    flex: 1,
    fontFamily: "Newsreader_700Bold_Italic",
    fontSize: 20,
    lineHeight: 26,
  },
  ratingBadge: {
    alignItems: "center",
    backgroundColor: "#d4ede3",
    borderRadius: fecaTheme.radii.pill,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: fecaTheme.spacing.sm,
    paddingVertical: 5,
  },
  ratingText: {
    color: fecaTheme.colors.onSurface,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 12,
  },
  address: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.muted,
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 12,
    lineHeight: 17,
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: fecaTheme.spacing.xs,
    marginTop: fecaTheme.spacing.xs,
  },
  tagChip: {
    backgroundColor: fecaTheme.surfaces.highest,
    borderRadius: fecaTheme.radii.pill,
    paddingHorizontal: fecaTheme.spacing.sm,
    paddingVertical: 5,
  },
  tagChipOpen: {
    backgroundColor: "#d4ede3",
  },
  tagChipSocial: {
    backgroundColor: fecaTheme.surfaces.highest,
  },
  tagText: {
    color: fecaTheme.colors.onSurfaceVariant,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 10,
    letterSpacing: 0.6,
  },
  tagTextOpen: {
    color: fecaTheme.colors.onSurface,
    letterSpacing: 0.2,
  },
  tagTextSocial: {
    color: fecaTheme.colors.onSurfaceVariant,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 10,
    letterSpacing: 0.15,
  },
});
