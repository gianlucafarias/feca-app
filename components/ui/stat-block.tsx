import { StyleSheet, Text } from "react-native";

import { SurfaceCard } from "@/components/ui/surface-card";
import { fecaTheme } from "@/theme/feca";

type StatBlockProps = {
  label: string;
  value: string | number;
};

export function StatBlock({ label, value }: StatBlockProps) {
  return (
    <SurfaceCard style={styles.card}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    backgroundColor: fecaTheme.surfaces.low,
    flex: 1,
    gap: fecaTheme.spacing.xxs,
    paddingHorizontal: fecaTheme.spacing.md,
    paddingVertical: fecaTheme.spacing.lg,
  },
  value: {
    ...fecaTheme.typography.numeric,
    color: fecaTheme.colors.onSurface,
    fontSize: 22,
    lineHeight: 26,
  },
  label: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.muted,
    fontSize: 12,
  },
});
