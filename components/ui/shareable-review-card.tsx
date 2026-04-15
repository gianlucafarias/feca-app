import { forwardRef } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";

import { AvatarBadge } from "@/components/ui/avatar-badge";
import { formatVisitDate } from "@/lib/format";
import { fecaTheme } from "@/theme/feca";
import type { Visit } from "@/types/feca";

type ShareableReviewCardProps = {
  visit: Visit;
};

export const ShareableReviewCard = forwardRef<View, ShareableReviewCardProps>(
  function ShareableReviewCard({ visit }, ref) {
    return (
      <View
        collapsable={false}
        ref={ref}
        style={styles.container}
      >
        <View style={styles.topSection}>
          <View style={styles.brandRow}>
            <Text style={styles.brandName}>feca</Text>
            <View style={[styles.accentDot, { backgroundColor: visit.place.accent }]} />
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.placeBlock}>
            <View style={[styles.placeAccent, { backgroundColor: visit.place.accent }]} />
            <View style={styles.placeInfo}>
              <Text style={styles.placeName}>{visit.place.name}</Text>
              <Text style={styles.placeNeighborhood}>
                {visit.place.neighborhood}, {visit.place.city}
              </Text>
            </View>
          </View>

          <View style={styles.ratingRow}>
            {Array.from({ length: 5 }, (_, i) => (
              <Ionicons
                key={i}
                color={
                  i < visit.rating
                    ? fecaTheme.colors.secondary
                    : fecaTheme.colors.iconSubtle
                }
                name={i < visit.rating ? "star" : "star-outline"}
                size={24}
              />
            ))}
          </View>

          {visit.note ? (
            <Text style={styles.note}>
              &ldquo;{visit.note}&rdquo;
            </Text>
          ) : null}

          <View style={styles.userRow}>
            <AvatarBadge
              accent={fecaTheme.colors.primary}
              name={visit.user.displayName}
              size={36}
            />
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{visit.user.displayName}</Text>
              <Text style={styles.userDate}>{formatVisitDate(visit.visitedAt)}</Text>
            </View>
          </View>

          {visit.companions ? (
            <View style={styles.companionRow}>
              <Ionicons color={fecaTheme.colors.muted} name="people-outline" size={14} />
              <Text style={styles.companionText}>{visit.companions}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Encontrá tu próximo café en feca</Text>
        </View>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: fecaTheme.colors.background,
    borderRadius: fecaTheme.radii.lg,
    overflow: "hidden",
    width: 340,
  },
  topSection: {
    backgroundColor: fecaTheme.surfaces.high,
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: 24,
  },
  brandRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  brandName: {
    ...fecaTheme.typography.logo,
    fontSize: 32,
    lineHeight: 38,
    color: fecaTheme.colors.primary,
  },
  accentDot: {
    borderRadius: fecaTheme.radii.pill,
    height: 12,
    width: 12,
    marginTop: 4,
  },
  content: {
    gap: 20,
    paddingHorizontal: 28,
    paddingTop: 28,
    paddingBottom: 24,
  },
  placeBlock: {
    alignItems: "center",
    flexDirection: "row",
    gap: 14,
  },
  placeAccent: {
    borderRadius: fecaTheme.radii.pill,
    height: 48,
    width: 6,
  },
  placeInfo: {
    flex: 1,
    gap: 3,
  },
  placeName: {
    ...fecaTheme.typography.title,
    color: fecaTheme.colors.onSurface,
  },
  placeNeighborhood: {
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 14,
    lineHeight: 18,
    color: fecaTheme.colors.muted,
  },
  ratingRow: {
    flexDirection: "row",
    gap: 4,
  },
  note: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 16,
    lineHeight: 24,
    color: fecaTheme.colors.onSurface,
    fontStyle: "italic",
  },
  userRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  userInfo: {
    flex: 1,
    gap: 2,
  },
  userName: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 15,
    lineHeight: 20,
    color: fecaTheme.colors.onSurface,
  },
  userDate: {
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 12,
    lineHeight: 16,
    color: fecaTheme.colors.muted,
  },
  companionRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  companionText: {
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 13,
    lineHeight: 18,
    color: fecaTheme.colors.muted,
  },
  footer: {
    alignItems: "center",
    paddingBottom: fecaTheme.spacing.lg,
    paddingHorizontal: fecaTheme.spacing.sm,
    paddingTop: fecaTheme.spacing.xl,
  },
  footerText: {
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 12,
    lineHeight: 16,
    color: fecaTheme.colors.muted,
    letterSpacing: 0.5,
  },
});
