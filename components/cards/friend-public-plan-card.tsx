import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AvatarBadge } from "@/components/ui/avatar-badge";
import { formatVisitDate } from "@/lib/format";
import { fecaTheme } from "@/theme/feca";
import type { FriendPublicPlan } from "@/types/feca";

type FriendPublicPlanCardProps = {
  plan: FriendPublicPlan;
};

export function FriendPublicPlanCard({ plan }: FriendPublicPlanCardProps) {
  const f = plan.friendParticipant;
  const sub = plan.nextEvent
    ? `${plan.nextEvent.placeName} · ${plan.nextEvent.areaLabel} · ${formatVisitDate(plan.nextEvent.date)}`
    : "Sin próxima fecha publicada";
  const count = plan.memberCount;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(`/group/${plan.id}`)}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.row}>
        <AvatarBadge
          accent={fecaTheme.colors.primary}
          name={f.displayName}
          size={44}
        />
        <View style={styles.textCol}>
          <Text numberOfLines={2} style={styles.title}>
            {plan.name}
          </Text>
          <Text style={styles.friendLine}>
            <Text style={styles.friendEm}>{f.displayName}</Text>
            {` participa${count > 1 ? ` · ${count} personas` : ""}`}
          </Text>
          <Text style={styles.meta}>
            Por {plan.createdBy.displayName} · {sub}
          </Text>
        </View>
        <Ionicons
          color={fecaTheme.colors.iconSubtle}
          name="chevron-forward"
          size={18}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: fecaTheme.surfaces.low,
    borderRadius: fecaTheme.radii.lg,
    paddingHorizontal: fecaTheme.spacing.md,
    paddingVertical: fecaTheme.spacing.md,
    ...fecaTheme.elevation.ambient,
  },
  cardPressed: {
    opacity: 0.94,
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: fecaTheme.spacing.md,
  },
  textCol: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    ...fecaTheme.typography.title,
    color: fecaTheme.colors.onSurface,
    fontSize: 18,
    lineHeight: 24,
  },
  friendLine: {
    ...fecaTheme.typography.body,
    color: fecaTheme.colors.muted,
    fontSize: 14,
    marginTop: 2,
  },
  friendEm: {
    ...fecaTheme.typography.bodyStrong,
    color: fecaTheme.colors.onSurface,
  },
  meta: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.muted,
    marginTop: 4,
  },
});
