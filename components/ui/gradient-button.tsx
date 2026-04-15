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
            ? [fecaTheme.colors.outlineVariant, fecaTheme.colors.outlineVariant]
            : [fecaTheme.colors.primary, fecaTheme.colors.primaryContainer]
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
    borderRadius: fecaTheme.radii.md,
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
    color: "rgba(255,255,255,0.6)",
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
});
