import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AvatarBadge } from "@/components/ui/avatar-badge";
import { formatRelativeVisitTime } from "@/lib/format";
import { fecaTheme } from "@/theme/feca";
import type { FeedItem } from "@/types/feca";

type ActivityFeedRowProps = {
  item: FeedItem;
  onPress: () => void;
};

function firstName(displayName: string): string {
  const t = displayName.trim();
  if (!t) return "Alguien";
  return t.split(/\s+/)[0] ?? t;
}

export function ActivityFeedRow({ item, onPress }: ActivityFeedRowProps) {
  const { visit } = item;
  const name = firstName(visit.user.displayName);
  const place = visit.place.name;
  const note = visit.note.trim();
  const snippet = note
    ? `${note.length > 100 ? `${note.slice(0, 100)}…` : note}`
    : "";
  const reason = item.reasonLine?.trim() ?? item.summary?.trim() ?? "";
  const tail = snippet
    ? ` · ${snippet}`
    : reason
      ? ` · ${reason.length > 120 ? `${reason.slice(0, 120)}…` : reason}`
      : "";

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.pill, pressed && styles.pillPressed]}
    >
      <AvatarBadge
        accent={visit.place.accent}
        name={visit.user.displayName}
        size={48}
      />
      <View style={styles.body}>
        <Text style={styles.line}>
          <Text style={styles.nameEm}>{name}</Text>
          <Text style={styles.serifFill}> está en </Text>
          <Text style={styles.placeEm}>{place}</Text>
          {tail ? <Text style={styles.serifFill}>{tail}</Text> : null}
        </Text>
        <View style={styles.metaRow}>
          <Text style={styles.time}>
            {formatRelativeVisitTime(visit.visitedAt)}
          </Text>
          <View style={styles.ratingBadge}>
            <Ionicons
              color={fecaTheme.colors.muted}
              name="star"
              size={14}
            />
            <Text style={styles.ratingText}>{visit.rating.toFixed(1)}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignItems: "flex-start",
    backgroundColor: fecaTheme.surfaces.high,
    borderRadius: fecaTheme.radii.xl,
    flexDirection: "row",
    gap: fecaTheme.spacing.md,
    padding: fecaTheme.spacing.lg,
  },
  pillPressed: {
    opacity: 0.92,
  },
  body: {
    flex: 1,
    gap: fecaTheme.spacing.sm,
    minWidth: 0,
  },
  line: {
    flexWrap: "wrap",
  },
  nameEm: {
    color: fecaTheme.colors.onSurface,
    fontFamily: "Newsreader_700Bold_Italic",
    fontSize: 17,
    lineHeight: 24,
  },
  serifFill: {
    color: fecaTheme.colors.onSurface,
    fontFamily: "Newsreader_400Regular_Italic",
    fontSize: 17,
    lineHeight: 24,
  },
  placeEm: {
    color: fecaTheme.colors.onSurface,
    fontFamily: "Newsreader_500Medium_Italic",
    fontSize: 17,
    lineHeight: 24,
  },
  metaRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  time: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.muted,
    fontSize: 12,
  },
  ratingBadge: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
  },
  ratingText: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.muted,
    fontSize: 13,
    fontVariant: ["tabular-nums"],
  },
});
