import {
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { fecaTheme } from "@/theme/feca";

type PrimaryButtonProps = Omit<PressableProps, "style"> & {
  label: string;
  style?: StyleProp<ViewStyle>;
};

/** DESIGN.md §5: high-contrast on-surface fill, surface text, full pill */
export function PrimaryButton({
  disabled,
  label,
  style,
  ...props
}: PrimaryButtonProps) {
  return (
    <Pressable
      {...props}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        !disabled && fecaTheme.elevation.ambient,
        disabled && styles.disabled,
        style,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Text style={[styles.label, disabled && styles.labelDisabled]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    backgroundColor: fecaTheme.colors.onSurface,
    borderRadius: fecaTheme.radii.pill,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: fecaTheme.spacing.xl,
  },
  disabled: {
    backgroundColor: fecaTheme.surfaces.container,
    opacity: 0.85,
  },
  label: {
    ...fecaTheme.typography.bodyStrong,
    color: fecaTheme.colors.surface,
  },
  labelDisabled: {
    color: fecaTheme.colors.onSurfaceVariant,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
  },
});
