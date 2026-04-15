import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

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

export function NearbyPlaceCard({ place, onPress }: NearbyPlaceCardProps) {
  const handlePress =
    onPress ?? (() => router.push(`/place/${place.googlePlaceId}`));

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
            <Text numberOfLines={1} style={styles.name}>
              {place.name}
            </Text>
            {place.rating != null ? (
              <View style={styles.ratingBadge}>
                <Ionicons
                  color={fecaTheme.colors.secondary}
                  name="star"
                  size={12}
                />
                <Text style={styles.ratingText}>
                  {place.rating.toFixed(1)}
                </Text>
              </View>
            ) : null}
          </View>
          <Text numberOfLines={1} style={styles.address}>
            {place.address}
          </Text>
          <View style={styles.footer}>
            {formatType(place.primaryType) ? (
              <Text style={styles.typeLabel}>
                {formatType(place.primaryType)}
              </Text>
            ) : null}
            {place.openNow != null ? (
              <Text
                style={[
                  styles.openStatus,
                  place.openNow ? styles.openNow : styles.closedNow,
                ]}
              >
                {place.openNow ? "Abierto" : "Cerrado"}
              </Text>
            ) : null}
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  outer: {
    backgroundColor: fecaTheme.surfaces.lowest,
    borderRadius: fecaTheme.radii.lg,
    ...fecaTheme.elevation.ambient,
  },
  card: {
    borderRadius: fecaTheme.radii.lg,
    overflow: "hidden",
  },
  image: {
    height: 160,
    width: "100%",
  },
  imageFallback: {
    alignItems: "center",
    backgroundColor: fecaTheme.surfaces.high,
    justifyContent: "center",
  },
  body: {
    gap: 4,
    paddingBottom: fecaTheme.spacing.md,
    paddingHorizontal: fecaTheme.spacing.md,
    paddingTop: fecaTheme.spacing.sm,
  },
  titleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: fecaTheme.spacing.sm,
    justifyContent: "space-between",
  },
  name: {
    ...fecaTheme.typography.bodyStrong,
    color: fecaTheme.colors.onSurface,
    flex: 1,
  },
  ratingBadge: {
    alignItems: "center",
    flexDirection: "row",
    gap: 3,
  },
  ratingText: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.onSurface,
    fontSize: 13,
    fontFamily: "Manrope_600SemiBold",
  },
  address: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.muted,
  },
  footer: {
    alignItems: "center",
    flexDirection: "row",
    gap: fecaTheme.spacing.sm,
    justifyContent: "space-between",
    marginTop: fecaTheme.spacing.xs,
  },
  typeLabel: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.primary,
    fontSize: 12,
    fontFamily: "Manrope_600SemiBold",
  },
  openStatus: {
    ...fecaTheme.typography.meta,
    fontSize: 12,
  },
  openNow: {
    color: fecaTheme.colors.primary,
  },
  closedNow: {
    color: fecaTheme.colors.secondary,
  },
});
