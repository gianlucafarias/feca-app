import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { haversineKm } from "@/lib/geo/distance";
import { useAuth } from "@/providers/auth-provider";
import { fecaTheme } from "@/theme/feca";
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

/** Etiquetas cortas estilo editorial (mayúsculas) para chips bajo la ficha */
function placeTagLabels(place: NearbyPlace): string[] {
  const tags: string[] = [];
  const primary = formatType(place.primaryType);
  if (primary) {
    tags.push(primary.replace(/\s/g, "-").toUpperCase());
  }
  if (place.rating != null && place.rating >= 4.5) {
    tags.push("WORK-FRIENDLY");
  } else if (place.openNow === true) {
    tags.push("ABIERTO AHORA");
  } else if (tags.length < 2 && place.types.includes("meal_takeaway")) {
    tags.push("TAKE AWAY");
  }
  return tags.slice(0, 2);
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

  const tags = placeTagLabels(place);
  const metaLine =
    distanceKm != null
      ? `${barrioLine(place.address)} · ${distanceKm < 10 ? distanceKm.toFixed(1) : Math.round(distanceKm)} km`
      : barrioLine(place.address);

  return (
    <Pressable onPress={handlePress} style={styles.outer}>
      <View style={styles.card}>
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
          {tags.length > 0 ? (
            <View style={styles.tagRow}>
              {tags.map((t) => (
                <View key={t} style={styles.tagChip}>
                  <Text style={styles.tagText}>{t}</Text>
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
    borderRadius: fecaTheme.radii.xl,
    ...fecaTheme.elevation.ambient,
  },
  card: {
    borderRadius: fecaTheme.radii.xl,
    overflow: "hidden",
  },
  image: {
    borderTopLeftRadius: fecaTheme.radii.xl,
    borderTopRightRadius: fecaTheme.radii.xl,
    height: 168,
    width: "100%",
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
  tagText: {
    color: fecaTheme.colors.onSurfaceVariant,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 10,
    letterSpacing: 0.6,
  },
});
