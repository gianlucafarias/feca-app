import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { SurfaceCard } from "@/components/ui/surface-card";
import { fecaTheme } from "@/theme/feca";

type EmptyStateProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
};

export function EmptyState({ icon, title, description }: EmptyStateProps) {
  return (
    <SurfaceCard style={styles.card}>
      <View style={styles.iconWrap}>
        <Ionicons color={fecaTheme.colors.primary} name={icon} size={24} />
      </View>
      <View style={styles.textWrap}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    backgroundColor: fecaTheme.surfaces.high,
    gap: fecaTheme.spacing.md,
    paddingHorizontal: fecaTheme.spacing.xl,
    paddingVertical: fecaTheme.spacing.xxl,
  },
  iconWrap: {
    alignItems: "center",
    backgroundColor: "rgba(81, 100, 67, 0.10)",
    borderRadius: fecaTheme.radii.pill,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  textWrap: {
    alignItems: "center",
    gap: fecaTheme.spacing.xs,
  },
  title: {
    ...fecaTheme.typography.title,
    color: fecaTheme.colors.onSurface,
    textAlign: "center",
  },
  description: {
    ...fecaTheme.typography.body,
    color: fecaTheme.colors.muted,
    maxWidth: 300,
    textAlign: "center",
  },
});
