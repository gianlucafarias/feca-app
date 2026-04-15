import { LinearGradient } from "expo-linear-gradient";
import {
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { fecaTheme } from "@/theme/feca";

type GradientButtonProps = Omit<PressableProps, "style"> & {
  label: string;
  style?: StyleProp<ViewStyle>;
};

const disabledGradient = [
  fecaTheme.surfaces.container,
  fecaTheme.surfaces.high,
] as const;

export function GradientButton({
  disabled,
  label,
  style,
  ...props
}: GradientButtonProps) {
  return (
    <Pressable
      {...props}
      disabled={disabled}
      style={({ pressed }) => [
        styles.outer,
        !disabled && fecaTheme.elevation.ambient,
        style,
        pressed && styles.pressed,
      ]}
    >
      <LinearGradient
        colors={
          disabled
            ? [...disabledGradient]
            : [fecaTheme.colors.secondary, fecaTheme.colors.secondaryDim]
        }
        end={{ x: 1, y: 1 }}
        start={{ x: 0, y: 0 }}
        style={styles.gradient}
      >
        <Text style={[styles.label, disabled && styles.labelDisabled]}>{label}</Text>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  outer: {
    borderRadius: fecaTheme.radii.pill,
    overflow: "hidden",
  },
  gradient: {
    alignItems: "center",
    minHeight: 52,
    justifyContent: "center",
    paddingHorizontal: fecaTheme.spacing.xl,
  },
  label: {
    ...fecaTheme.typography.bodyStrong,
    color: fecaTheme.colors.onPrimary,
    letterSpacing: 0.3,
  },
  labelDisabled: {
    color: fecaTheme.colors.onSurfaceVariant,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
});
