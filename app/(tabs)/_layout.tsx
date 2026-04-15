import { Redirect, Tabs } from "expo-router";

import { FloatingTabBar } from "@/components/ui/floating-tab-bar";
import { useAuth } from "@/providers/auth-provider";
import { fecaTheme } from "@/theme/feca";

export default function TabsLayout() {
  const { isHydrating, isAuthenticated, onboardingRoute } = useAuth();

  if (isHydrating) {
    return null;
  }

  if (!isAuthenticated) {
    return <Redirect href="/(onboarding)/welcome" />;
  }

  if (onboardingRoute) {
    return <Redirect href={onboardingRoute} />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: fecaTheme.colors.background },
      }}
      tabBar={(props) => <FloatingTabBar {...props} />}
    >
      <Tabs.Screen name="index" options={{ title: "Inicio" }} />
      <Tabs.Screen name="explore" options={{ title: "Explorar" }} />
      <Tabs.Screen name="plans" options={{ title: "Planes" }} />
      <Tabs.Screen name="profile" options={{ title: "Perfil" }} />
    </Tabs>
  );
}
