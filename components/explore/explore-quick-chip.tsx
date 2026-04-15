import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { fecaTheme } from "@/theme/feca";

type ExploreQuickChipProps = {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  selected: boolean;
  /** Oscuro cuando está activo (p. ej. “Cerca de mí”) */
  emphasis?: "soft" | "strong";
  onPress: () => void;
};

export function ExploreQuickChip({
  label,
  icon,
  selected,
  emphasis = "soft",
  onPress,
}: ExploreQuickChipProps) {
  const strongOn = emphasis === "strong" && selected;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        strongOn ? styles.strongSelected : null,
        !strongOn && selected ? styles.softSelected : null,
        !selected ? styles.idle : null,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.inner}>
        {icon ? (
          <Ionicons
            color={
              strongOn
                ? fecaTheme.colors.surfaceBright
                : selected
                  ? fecaTheme.colors.onSecondaryFixed
                  : fecaTheme.colors.onSurfaceVariant
            }
            name={icon}
            size={16}
          />
        ) : null}
        <Text
          numberOfLines={1}
          style={[
            styles.label,
            strongOn ? styles.labelStrongOn : null,
            !strongOn && selected ? styles.labelSoftOn : null,
            !selected ? styles.labelIdle : null,
          ]}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: fecaTheme.radii.pill,
    justifyContent: "center",
    maxWidth: 200,
    minHeight: 44,
    paddingHorizontal: fecaTheme.spacing.md,
    paddingVertical: fecaTheme.spacing.xs,
  },
  idle: {
    backgroundColor: fecaTheme.surfaces.highest,
  },
  softSelected: {
    backgroundColor: fecaTheme.colors.secondaryFixed,
  },
  strongSelected: {
    backgroundColor: "#4d535e",
  },
  inner: {
    alignItems: "center",
    flexDirection: "row",
    gap: fecaTheme.spacing.xs,
  },
  label: {
    ...fecaTheme.typography.meta,
    flexShrink: 1,
    fontSize: 13,
  },
  labelIdle: {
    color: fecaTheme.colors.onSurfaceVariant,
  },
  labelSoftOn: {
    color: fecaTheme.colors.onSecondaryFixed,
    fontFamily: "PlusJakartaSans_600SemiBold",
  },
  labelStrongOn: {
    color: fecaTheme.colors.surfaceBright,
    fontFamily: "PlusJakartaSans_600SemiBold",
  },
  pressed: {
    opacity: 0.88,
  },
});
