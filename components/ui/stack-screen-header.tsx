import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import type { ReactNode } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { fecaTheme } from "@/theme/feca";

type StackScreenHeaderProps = {
  title: string;
  onPressBack?: () => void;
  /** Contenido a la derecha (p. ej. contador). Debe caber en ~40px o el título se trunca. */
  right?: ReactNode;
  /** `center`: título centrado (notificaciones, guardados). `leading`: título a la izquierda (seguidos). */
  titleAlignment?: "center" | "leading";
};

export function StackScreenHeader({
  title,
  onPressBack = () => router.back(),
  right,
  titleAlignment = "center",
}: StackScreenHeaderProps) {
  const insets = useSafeAreaInsets();

  const back = (
    <Pressable
      accessibilityLabel="Volver"
      accessibilityRole="button"
      hitSlop={8}
      onPress={onPressBack}
      style={styles.backBtn}
    >
      <Ionicons
        color={fecaTheme.colors.onSurface}
        name="chevron-back"
        size={22}
      />
    </Pressable>
  );

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 8 }]}>
      {titleAlignment === "leading" ? (
        <View style={styles.rowLeading}>
          {back}
          <Text
            numberOfLines={1}
            style={styles.titleLeading}
            {...(Platform.OS === "android" ? { includeFontPadding: false } : {})}
          >
            {title}
          </Text>
          <View style={styles.rightLeading}>{right ?? null}</View>
        </View>
      ) : (
        <View style={styles.rowCenter}>
          <View style={styles.sideLeft}>{back}</View>
          <View style={styles.titleAbs} pointerEvents="none">
            <Text
              numberOfLines={1}
              style={styles.titleCenter}
              {...(Platform.OS === "android" ? { includeFontPadding: false } : {})}
            >
              {title}
            </Text>
          </View>
          <View style={styles.sideRight}>{right ?? <View style={styles.rightSpacer} />}</View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingBottom: fecaTheme.spacing.sm,
    paddingHorizontal: fecaTheme.spacing.lg,
  },
  rowCenter: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 40,
  },
  rowLeading: {
    alignItems: "center",
    flexDirection: "row",
    gap: fecaTheme.spacing.sm,
    minHeight: 40,
  },
  sideLeft: {
    zIndex: 1,
  },
  sideRight: {
    alignItems: "flex-end",
    justifyContent: "center",
    minWidth: 40,
    zIndex: 1,
  },
  titleAbs: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 96,
  },
  titleCenter: {
    ...fecaTheme.typography.headline,
    color: fecaTheme.colors.onSurface,
    textAlign: "center",
  },
  titleLeading: {
    ...fecaTheme.typography.headline,
    color: fecaTheme.colors.onSurface,
    flex: 1,
    minWidth: 0,
  },
  rightLeading: {
    alignItems: "flex-end",
    justifyContent: "center",
    minWidth: 40,
  },
  rightSpacer: {
    height: 40,
    width: 40,
  },
  backBtn: {
    alignItems: "center",
    backgroundColor: fecaTheme.surfaces.high,
    borderRadius: fecaTheme.radii.pill,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
});
