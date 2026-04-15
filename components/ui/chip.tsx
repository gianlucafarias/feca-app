import { Pressable, StyleSheet, Text } from "react-native";

import { fecaTheme } from "@/theme/feca";

type ChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
};

export function Chip({ label, selected = false, onPress }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        selected ? styles.selected : styles.idle,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.label, selected ? styles.selectedLabel : null]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: fecaTheme.radii.pill,
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: fecaTheme.spacing.lg,
    paddingVertical: fecaTheme.spacing.xs,
  },
  idle: {
    backgroundColor: fecaTheme.surfaces.highest,
  },
  selected: {
    backgroundColor: fecaTheme.colors.secondaryFixed,
  },
  label: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.onSurfaceVariant,
  },
  selectedLabel: {
    color: fecaTheme.colors.onSecondaryFixed,
    fontFamily: "PlusJakartaSans_600SemiBold",
  },
  pressed: {
    opacity: 0.82,
  },
});
