import { Ionicons } from "@expo/vector-icons";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { fecaTheme } from "@/theme/feca";

type ExploreHeaderProps = {
  onPressMenu: () => void;
  onPressSearch: () => void;
};

export function ExploreHeader({ onPressMenu, onPressSearch }: ExploreHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 8 }]}>
      <View style={styles.side}>
        <Pressable
          accessibilityLabel="Menú"
          accessibilityRole="button"
          hitSlop={12}
          onPress={onPressMenu}
          style={styles.iconBtn}
        >
          <Ionicons
            color={fecaTheme.colors.onSurface}
            name="menu"
            size={24}
          />
        </Pressable>
      </View>
      <Text
        style={styles.title}
        {...(Platform.OS === "android" ? { includeFontPadding: false } : {})}
      >
        Explorar Cafés
      </Text>
      <View style={[styles.side, styles.sideRight]}>
        <Pressable
          accessibilityLabel="Buscar"
          accessibilityRole="button"
          hitSlop={12}
          onPress={onPressSearch}
          style={styles.iconBtn}
        >
          <Ionicons
            color={fecaTheme.colors.onSurface}
            name="search-outline"
            size={24}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: fecaTheme.spacing.md,
    paddingHorizontal: fecaTheme.spacing.md,
  },
  side: {
    flex: 1,
    justifyContent: "center",
  },
  sideRight: {
    alignItems: "flex-end",
  },
  iconBtn: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  title: {
    color: fecaTheme.colors.onSurface,
    flexShrink: 1,
    fontFamily: "Newsreader_700Bold_Italic",
    fontSize: 22,
    lineHeight: 28,
    textAlign: "center",
  },
});
