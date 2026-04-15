import { Ionicons } from "@expo/vector-icons";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { fecaTheme } from "@/theme/feca";

type TabScreenHeaderProps = {
  /** Mostrar campana (p. ej. cuando hay sesión) */
  showNotifications?: boolean;
  onPressNotifications?: () => void;
};

export function TabScreenHeader({
  showNotifications = false,
  onPressNotifications,
}: TabScreenHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 8 }]}>
      <View style={styles.side} />
      <Text
        style={styles.logo}
        {...(Platform.OS === "android" ? { includeFontPadding: false } : {})}
      >
        feca
      </Text>
      <View style={[styles.side, styles.sideRight]}>
        {showNotifications && onPressNotifications ? (
          <Pressable
            accessibilityLabel="Notificaciones"
            accessibilityRole="button"
            hitSlop={12}
            onPress={onPressNotifications}
            style={styles.bell}
          >
            <Ionicons
              color={fecaTheme.colors.onSurface}
              name="notifications-outline"
              size={22}
            />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    overflow: "visible",
    paddingBottom: fecaTheme.spacing.sm,
    paddingHorizontal: fecaTheme.spacing.md,
  },
  side: {
    flex: 1,
  },
  sideRight: {
    alignItems: "flex-end",
    justifyContent: "center",
  },
  logo: {
    ...fecaTheme.typography.logo,
    color: fecaTheme.colors.onSurface,
    fontSize: 26,
    /** Más aire que el cuerpo: itálica Newsreader puede recortar el trazo de la “f” */
    lineHeight: 36,
    paddingHorizontal: 8,
    textAlign: "center",
  },
  bell: {
    alignItems: "center",
    height: 40,
    justifyContent: "center",
    width: 40,
  },
});
