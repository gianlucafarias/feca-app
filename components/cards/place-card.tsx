import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { formatCategories } from "@/lib/format";
import { buildPlacePoster } from "@/lib/poster";
import { fecaTheme } from "@/theme/feca";
import type { Place } from "@/types/feca";

type PlaceCardProps = {
  place: Place;
  eyebrow?: string;
  meta?: string;
  onPress?: () => void;
};

export function PlaceCard({ place, eyebrow, meta, onPress }: PlaceCardProps) {
  const handlePress =
    onPress ??
    (() => router.push(`/place/${place.googlePlaceId ?? place.id}`));

  return (
    <Pressable onPress={handlePress} style={styles.outer}>
      <View style={styles.card}>
        <Image
          contentFit="cover"
          source={{ uri: buildPlacePoster(place) }}
          style={styles.image}
        />
        <View style={styles.body}>
          {eyebrow ? (
            <Text style={styles.eyebrow}>{eyebrow}</Text>
          ) : null}
          <View style={styles.titleRow}>
            <Text style={styles.name}>{place.name}</Text>
            <View style={styles.savedBadge}>
              <Ionicons
                color={fecaTheme.colors.secondary}
                name="bookmark"
                size={12}
              />
              <Text style={styles.savedCount}>{place.savedCount}</Text>
            </View>
          </View>
          <Text style={styles.neighborhood}>{place.neighborhood}</Text>
          <Text style={styles.signature}>{place.signature}</Text>
          <View style={styles.footer}>
            <Text style={styles.category}>
              {formatCategories(place.categories)}
            </Text>
            <Text style={styles.footerMeta}>
              {meta || place.bestMoment}
            </Text>
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
  body: {
    gap: 4,
    paddingBottom: fecaTheme.spacing.md,
    paddingHorizontal: fecaTheme.spacing.md,
    paddingTop: fecaTheme.spacing.sm,
  },
  eyebrow: {
    ...fecaTheme.typography.label,
    color: fecaTheme.colors.secondary,
    marginBottom: 2,
    textTransform: "uppercase",
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
  savedBadge: {
    alignItems: "center",
    flexDirection: "row",
    gap: 3,
  },
  savedCount: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.muted,
    fontSize: 12,
  },
  neighborhood: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.muted,
  },
  signature: {
    ...fecaTheme.typography.body,
    color: fecaTheme.colors.onSurface,
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    alignItems: "center",
    flexDirection: "row",
    gap: fecaTheme.spacing.sm,
    justifyContent: "space-between",
    marginTop: fecaTheme.spacing.xs,
  },
  category: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.primary,
    fontSize: 12,
    fontFamily: "PlusJakartaSans_600SemiBold",
  },
  footerMeta: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.secondary,
    fontSize: 12,
  },
});
