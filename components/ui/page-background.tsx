import type { PropsWithChildren } from "react";
import { StyleSheet, View } from "react-native";

import { fecaTheme } from "@/theme/feca";

export function PageBackground({ children }: PropsWithChildren) {
  return <View style={styles.root}>{children}</View>;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: fecaTheme.colors.background,
  },
});
