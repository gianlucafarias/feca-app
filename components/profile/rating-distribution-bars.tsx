import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { fecaTheme } from "@/theme/feca";
import {
  RATING_BUCKET_KEYS,
  type RatingBuckets,
} from "@/lib/visits/rating-buckets";

const MAX_BAR_HEIGHT = 96;

type Props = {
  buckets: RatingBuckets;
  max: number;
  title?: string;
};

export function RatingDistributionBars({
  buckets,
  max,
  title = "Puntuaciones",
}: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.chartRow}>
        {RATING_BUCKET_KEYS.map((key) => {
          const count = buckets[key];
          const ratio = max > 0 ? count / max : 0;
          const h = Math.max(4, ratio * MAX_BAR_HEIGHT);
          return (
            <View key={key} style={styles.col}>
              <Text style={styles.countLabel}>{count}</Text>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { height: h }]} />
              </View>
            </View>
          );
        })}
      </View>
      <View style={styles.scaleRow}>
        {RATING_BUCKET_KEYS.map((key) => (
          <View key={key} style={styles.scaleCell}>
            <Ionicons
              color={fecaTheme.colors.secondary}
              name="star"
              size={12}
            />
            <Text style={styles.scaleNum}>{key}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: "stretch",
    backgroundColor: fecaTheme.surfaces.low,
    borderRadius: fecaTheme.radii.lg,
    gap: fecaTheme.spacing.sm,
    paddingHorizontal: fecaTheme.spacing.md,
    paddingVertical: fecaTheme.spacing.lg,
  },
  title: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.muted,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  chartRow: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: fecaTheme.spacing.xs,
    justifyContent: "space-between",
    minHeight: MAX_BAR_HEIGHT + 22,
  },
  col: {
    alignItems: "center",
    flex: 1,
    gap: 4,
  },
  countLabel: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.muted,
    fontSize: 11,
    minHeight: 14,
  },
  barTrack: {
    alignItems: "center",
    height: MAX_BAR_HEIGHT,
    justifyContent: "flex-end",
    width: "100%",
  },
  barFill: {
    backgroundColor: fecaTheme.colors.primary,
    borderRadius: 4,
    width: "78%",
  },
  scaleRow: {
    flexDirection: "row",
    gap: fecaTheme.spacing.xs,
    justifyContent: "space-between",
    marginTop: fecaTheme.spacing.xs,
  },
  scaleCell: {
    alignItems: "center",
    flex: 1,
    gap: 2,
  },
  scaleNum: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.muted,
    fontSize: 10,
  },
});
