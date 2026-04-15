import { Pressable, StyleSheet, Text } from "react-native";

import { fecaTheme } from "@/theme/feca";

type TextLinkButtonProps = {
  label: string;
  onPress: () => void;
};

export function TextLinkButton({ label, onPress }: TextLinkButtonProps) {
  return (
    <Pressable onPress={onPress} style={styles.container}>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: "center",
    paddingVertical: fecaTheme.spacing.sm,
  },
  label: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.muted,
    fontFamily: "PlusJakartaSans_500Medium",
  },
});
