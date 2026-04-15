import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AvatarBadge } from "@/components/ui/avatar-badge";
import { formatVisitDate } from "@/lib/format";
import { fecaTheme, hexToRgba } from "@/theme/feca";
import type { Visit } from "@/types/feca";

type ReviewCardProps = {
  visit: Visit;
  onPress?: () => void;
};

export function ReviewCard({ visit, onPress }: ReviewCardProps) {
  return (
    <Pressable onPress={onPress} style={styles.card}>
      <View style={styles.header}>
        <AvatarBadge
          accent={visit.place.accent}
          name={visit.user.displayName}
          size={32}
        />
        <View style={styles.headerText}>
          <Text style={styles.userName}>{visit.user.displayName}</Text>
          <Text style={styles.date}>{formatVisitDate(visit.visitedAt)}</Text>
        </View>
        <View style={styles.ratingBadge}>
          <Ionicons
            color={fecaTheme.colors.secondary}
            name="star"
            size={12}
          />
          <Text style={styles.ratingValue}>{visit.rating}</Text>
        </View>
      </View>
      {visit.note ? (
        <Text numberOfLines={2} style={styles.note}>{visit.note}</Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: fecaTheme.surfaces.low,
    borderRadius: fecaTheme.radii.sm,
    gap: fecaTheme.spacing.sm,
    padding: fecaTheme.spacing.md,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: fecaTheme.spacing.sm,
  },
  headerText: {
    flex: 1,
    gap: 1,
  },
  userName: {
    ...fecaTheme.typography.bodyStrong,
    color: fecaTheme.colors.onSurface,
    fontSize: 14,
    lineHeight: 18,
  },
  date: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.muted,
    fontSize: 12,
    lineHeight: 16,
  },
  ratingBadge: {
    alignItems: "center",
    backgroundColor: hexToRgba(fecaTheme.colors.secondary, 0.1),
    borderRadius: fecaTheme.radii.pill,
    flexDirection: "row",
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  ratingValue: {
    ...fecaTheme.typography.numeric,
    color: fecaTheme.colors.secondary,
    fontSize: 13,
    lineHeight: 16,
  },
  note: {
    ...fecaTheme.typography.body,
    color: fecaTheme.colors.onSurface,
    fontSize: 14,
    lineHeight: 20,
  },
});
