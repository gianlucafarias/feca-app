import type { PropsWithChildren } from "react";
import {
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { fecaTheme } from "@/theme/feca";

type SurfaceCardProps = PropsWithChildren<{
  elevated?: boolean;
  style?: StyleProp<ViewStyle>;
}>;

export function SurfaceCard({
  children,
  elevated = false,
  style,
}: SurfaceCardProps) {
  return (
    <View style={[styles.base, elevated ? styles.elevated : null, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: fecaTheme.surfaces.lowest,
    borderRadius: fecaTheme.radii.lg,
    padding: fecaTheme.spacing.lg,
  },
  elevated: {
    ...fecaTheme.elevation.ambient,
  },
});
