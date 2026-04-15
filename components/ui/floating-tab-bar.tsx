import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { fecaTheme } from "@/theme/feca";

const routeConfig = {
  index: {
    label: "Inicio",
    activeIcon: "home",
    idleIcon: "home-outline",
  },
  explore: {
    label: "Explorar",
    activeIcon: "compass",
    idleIcon: "compass-outline",
  },
  plans: {
    label: "Planes",
    activeIcon: "people",
    idleIcon: "people-outline",
  },
  profile: {
    label: "Perfil",
    activeIcon: "person",
    idleIcon: "person-outline",
  },
} as const;

type RouteName = keyof typeof routeConfig;

const routeOrder: RouteName[] = ["index", "explore", "plans", "profile"];

export function FloatingTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const renderTab = (routeName: RouteName) => {
    const route = state.routes.find((item) => item.name === routeName);

    if (!route) {
      return null;
    }

    const routeIndex = state.routes.findIndex((item) => item.key === route.key);
    const focused = state.index === routeIndex;
    const config = routeConfig[routeName];
    const descriptor = descriptors[route.key];

    return (
      <Pressable
        key={route.key}
        accessibilityRole="button"
        onPress={() => {
          Haptics.selectionAsync().catch(() => {
            // noop
          });

          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });

          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        }}
        onLongPress={() => navigation.emit({ type: "tabLongPress", target: route.key })}
        style={styles.tab}
      >
        <Ionicons
          color={
            focused ? fecaTheme.colors.primary : fecaTheme.colors.muted
          }
          name={focused ? config.activeIcon : config.idleIcon}
          size={20}
        />
        <Text style={[styles.tabLabel, focused ? styles.tabLabelActive : null]}>
          {(descriptor.options.title as string) || config.label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, 12) }]}
    >
      <View style={styles.bar}>
        <View style={styles.row}>
          {renderTab(routeOrder[0])}
          {renderTab(routeOrder[1])}
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {
                // noop
              });
              router.push("/visit/new");
            }}
            style={styles.actionWrap}
          >
            <LinearGradient
              colors={[
                fecaTheme.colors.secondary,
                fecaTheme.colors.primaryContainer,
              ]}
              style={styles.action}
            >
              <Ionicons color={fecaTheme.colors.onPrimary} name="add" size={24} />
            </LinearGradient>
          </Pressable>
          {renderTab(routeOrder[2])}
          {renderTab(routeOrder[3])}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    left: 0,
    position: "absolute",
    right: 0,
    bottom: 0,
  },
  bar: {
    ...fecaTheme.elevation.floating,
    alignSelf: "center",
    backgroundColor: "rgba(242, 239, 233, 0.96)",
    borderRadius: fecaTheme.radii.xl,
    width: "92%",
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: fecaTheme.spacing.sm,
    paddingVertical: fecaTheme.spacing.sm,
  },
  tab: {
    alignItems: "center",
    flex: 1,
    gap: 4,
    minHeight: 52,
    justifyContent: "center",
  },
  tabLabel: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.muted,
    fontSize: 11,
  },
  tabLabelActive: {
    color: fecaTheme.colors.primary,
    fontFamily: "Manrope_600SemiBold",
  },
  actionWrap: {
    marginHorizontal: fecaTheme.spacing.xs,
  },
  action: {
    ...fecaTheme.elevation.ambient,
    alignItems: "center",
    borderRadius: 28,
    height: 56,
    justifyContent: "center",
    width: 56,
  },
});
