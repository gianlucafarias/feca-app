import { StyleSheet, Text, View } from "react-native";

import { getInitials } from "@/lib/format";
import { fecaTheme } from "@/theme/feca";

type AvatarBadgeProps = {
  name: string;
  accent?: string;
  size?: number;
};

export function AvatarBadge({
  name,
  accent = fecaTheme.colors.primary,
  size = 42,
}: AvatarBadgeProps) {
  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: accent,
          height: size,
          width: size,
          borderRadius: size / 2,
        },
      ]}
    >
      <Text style={styles.label}>{getInitials(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    color: fecaTheme.colors.onPrimary,
    fontFamily: "Manrope_600SemiBold",
    fontSize: 14,
    lineHeight: 18,
  },
});
