import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AvatarBadge } from "@/components/ui/avatar-badge";
import { formatVisitDate } from "@/lib/format";
import { fecaTheme } from "@/theme/feca";
import type { FecaGroup } from "@/types/feca";

type GroupCardProps = {
  group: FecaGroup;
};

const MAX_AVATARS = 4;

export function GroupCard({ group }: GroupCardProps) {
  const visibleMembers = group.members.slice(0, MAX_AVATARS);
  const overflow = group.members.length - MAX_AVATARS;

  const upcoming = group.events.find((e) => e.status === "confirmed");
  const proposed = group.events.find((e) => e.status === "proposed");
  const completedCount = group.events.filter((e) => e.status === "completed").length;

  const nextEvent = upcoming ?? proposed;

  return (
    <Pressable
      onPress={() => router.push(`/group/${group.id}`)}
      style={styles.card}
    >
      <View style={styles.topRow}>
        <Text numberOfLines={1} style={styles.name}>{group.name}</Text>
        <View style={styles.countBadge}>
          <Ionicons color={fecaTheme.colors.muted} name="cafe-outline" size={12} />
          <Text style={styles.countText}>{group.events.length}</Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        {nextEvent ? (
          <>
            <Ionicons
              color={nextEvent.status === "confirmed" ? fecaTheme.colors.primary : fecaTheme.colors.muted}
              name={nextEvent.status === "confirmed" ? "calendar" : "calendar-outline"}
              size={14}
            />
            <Text style={styles.metaDate}>{formatVisitDate(nextEvent.date)}</Text>
            <Text numberOfLines={1} style={styles.metaPlace}>{nextEvent.place.name}</Text>
          </>
        ) : completedCount > 0 ? (
          <Text style={styles.metaMuted}>{completedCount} lugar{completedCount > 1 ? "es" : ""} visitado{completedCount > 1 ? "s" : ""}</Text>
        ) : (
          <Text style={styles.metaMuted}>Sin planes todavía</Text>
        )}
      </View>

      <View style={styles.avatarRow}>
        {visibleMembers.map((member, index) => (
          <View
            key={member.user.id}
            style={[
              styles.avatarWrap,
              index > 0 && { marginLeft: -8 },
            ]}
          >
            <AvatarBadge
              accent={member.user.id === "me" ? fecaTheme.colors.secondary : fecaTheme.colors.primary}
              name={member.user.displayName}
              size={28}
            />
          </View>
        ))}
        {overflow > 0 ? (
          <View style={[styles.overflowBadge, { marginLeft: -8 }]}>
            <Text style={styles.overflowText}>+{overflow}</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: fecaTheme.surfaces.lowest,
    borderRadius: fecaTheme.radii.lg,
    gap: fecaTheme.spacing.sm,
    padding: fecaTheme.spacing.md,
    ...fecaTheme.elevation.ambient,
  },
  topRow: {
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
  countBadge: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
  },
  countText: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.muted,
    fontSize: 12,
  },
  metaRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: fecaTheme.spacing.xs,
  },
  metaDate: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.onSurface,
  },
  metaPlace: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.primary,
    flex: 1,
    fontFamily: "PlusJakartaSans_600SemiBold",
  },
  metaMuted: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.muted,
  },
  avatarRow: {
    alignItems: "center",
    flexDirection: "row",
    marginTop: 2,
  },
  avatarWrap: {
    borderColor: fecaTheme.surfaces.lowest,
    borderRadius: fecaTheme.radii.md,
    borderWidth: 2,
  },
  overflowBadge: {
    alignItems: "center",
    backgroundColor: fecaTheme.surfaces.high,
    borderColor: fecaTheme.surfaces.lowest,
    borderRadius: fecaTheme.radii.md,
    borderWidth: 2,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  overflowText: {
    ...fecaTheme.typography.label,
    color: fecaTheme.colors.muted,
    fontSize: 10,
    lineHeight: 12,
  },
});
