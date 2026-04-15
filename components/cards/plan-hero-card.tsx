import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AvatarBadge } from "@/components/ui/avatar-badge";
import { formatVisitDate } from "@/lib/format";
import { fecaTheme } from "@/theme/feca";
import type { FecaGroup } from "@/types/feca";

type PlanHeroCardProps = {
  group: FecaGroup;
};

function watermarkForGroup(group: FecaGroup): keyof typeof Ionicons.glyphMap {
  const name = group.name.toLowerCase();
  const place = group.events[0]?.place?.name?.toLowerCase() ?? "";
  const blob = `${name} ${place}`;
  if (/brunch|desayuno|breakfast|tostad/.test(blob)) {
    return "restaurant-outline";
  }
  if (/caf|coffee|espresso|flat|latte/.test(blob)) {
    return "cafe-outline";
  }
  if (/bar|wine|vino|copas|gin/.test(blob)) {
    return "wine-outline";
  }
  if (/pizza|horno|masa/.test(blob)) {
    return "pizza-outline";
  }
  return "people-outline";
}

export function PlanHeroCard({ group }: PlanHeroCardProps) {
  const upcoming = group.events.find((e) => e.status === "confirmed");
  const proposed = group.events.find((e) => e.status === "proposed");
  const nextEvent = upcoming ?? proposed;

  const members = group.members.filter((m) => m.accepted !== false);
  const activeCount = members.length;
  const shown = members.slice(0, 2);
  const overflow = activeCount > 2 ? activeCount - 2 : 0;

  const subLine = nextEvent
    ? `${activeCount} ${activeCount === 1 ? "miembro" : "miembros"} · ${formatVisitDate(nextEvent.date)} · ${nextEvent.place.neighborhood || nextEvent.place.name}`
    : `${activeCount} ${activeCount === 1 ? "miembro" : "miembros"} · Sin próxima fecha`;

  const wm = watermarkForGroup(group);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(`/group/${group.id}`)}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.inner}>
        <View style={styles.textBlock}>
          <Text numberOfLines={2} style={styles.title}>
            {group.name}
          </Text>
          <Text numberOfLines={2} style={styles.subtitle}>
            {subLine}
          </Text>
          <View style={styles.avatarRow}>
            {shown.map((member, index) => (
              <View
                key={member.user.id}
                style={[styles.avatarWrap, index > 0 && { marginLeft: -10 }]}
              >
                <AvatarBadge
                  accent={
                    member.user.id === "me"
                      ? fecaTheme.colors.secondary
                      : fecaTheme.colors.primary
                  }
                  name={member.user.displayName}
                  size={36}
                />
              </View>
            ))}
            {overflow > 0 ? (
              <View style={[styles.overflowBadge, { marginLeft: -10 }]}>
                <Text style={styles.overflowText}>+{overflow}</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View pointerEvents="none" style={styles.watermark}>
          <Ionicons color={fecaTheme.colors.primary} name={wm} size={112} style={styles.watermarkIcon} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: fecaTheme.surfaces.lowest,
    borderRadius: fecaTheme.radii.xl,
    overflow: "hidden",
    ...fecaTheme.elevation.ambient,
  },
  cardPressed: {
    opacity: 0.96,
  },
  inner: {
    minHeight: 148,
    overflow: "hidden",
    paddingBottom: fecaTheme.spacing.lg,
    paddingHorizontal: fecaTheme.spacing.xl,
    paddingTop: fecaTheme.spacing.xl,
    position: "relative",
  },
  textBlock: {
    maxWidth: "72%",
    zIndex: 1,
  },
  title: {
    fontFamily: "Newsreader_700Bold",
    fontSize: 24,
    lineHeight: 30,
    color: fecaTheme.colors.onSurface,
  },
  subtitle: {
    ...fecaTheme.typography.body,
    color: fecaTheme.colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: fecaTheme.spacing.xs,
  },
  avatarRow: {
    alignItems: "center",
    flexDirection: "row",
    marginTop: fecaTheme.spacing.md,
  },
  avatarWrap: {
    borderColor: fecaTheme.surfaces.lowest,
    borderRadius: 20,
    borderWidth: 2,
  },
  overflowBadge: {
    alignItems: "center",
    backgroundColor: "#3b5bdb",
    borderColor: fecaTheme.surfaces.lowest,
    borderRadius: 18,
    borderWidth: 2,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  overflowText: {
    color: "#ffffff",
    fontFamily: "Manrope_600SemiBold",
    fontSize: 12,
  },
  watermark: {
    bottom: -8,
    position: "absolute",
    right: -12,
  },
  watermarkIcon: {
    opacity: 0.14,
  },
});
