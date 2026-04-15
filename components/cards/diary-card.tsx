import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { fecaTheme } from "@/theme/feca";
import type { CafeDiary } from "@/types/feca";

type DiaryCardProps = {
  diary: CafeDiary;
};

export function DiaryCard({ diary }: DiaryCardProps) {
  const accentColors = diary.places.slice(0, 4).map((p) => p.accent);
  const subtitle =
    diary.intro?.trim() ||
    diary.description?.trim() ||
    `${diary.places.length} ${diary.places.length === 1 ? "café" : "cafés"}`;

  return (
    <Pressable
      onPress={() => router.push(`/diary/${diary.id}`)}
      style={styles.outer}
    >
      {diary.coverImageUrl ? (
        <Image
          accessibilityIgnoresInvertColors
          contentFit="cover"
          source={{ uri: diary.coverImageUrl }}
          style={styles.coverThumb}
        />
      ) : (
        <View style={styles.dots}>
          {accentColors.map((color, i) => (
            <View key={`${diary.id}-dot-${i}`} style={[styles.dot, { backgroundColor: color }]} />
          ))}
          {diary.places.length === 0 ? (
            <View style={[styles.dot, { backgroundColor: fecaTheme.colors.iconSubtle }]} />
          ) : null}
        </View>
      )}
      <View style={styles.body}>
        <Text numberOfLines={1} style={styles.name}>{diary.name}</Text>
        <Text numberOfLines={2} style={styles.meta}>
          {subtitle}
        </Text>
      </View>
      <Ionicons color={fecaTheme.colors.iconSubtle} name="chevron-forward" size={16} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  outer: {
    alignItems: "center",
    backgroundColor: fecaTheme.surfaces.lowest,
    borderRadius: fecaTheme.radii.md,
    flexDirection: "row",
    gap: fecaTheme.spacing.md,
    padding: fecaTheme.spacing.md,
    ...fecaTheme.elevation.ambient,
  },
  coverThumb: {
    borderRadius: fecaTheme.radii.sm,
    height: 56,
    width: 56,
  },
  dots: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
  },
  dot: {
    borderRadius: 6,
    height: 12,
    width: 12,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  name: {
    ...fecaTheme.typography.bodyStrong,
    color: fecaTheme.colors.onSurface,
  },
  meta: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.muted,
  },
});
