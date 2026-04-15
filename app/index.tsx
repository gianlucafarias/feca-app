import { Redirect } from "expo-router";

import { useAuth } from "@/providers/auth-provider";

export default function IndexScreen() {
  const { isHydrating, isAuthenticated, onboardingRoute } = useAuth();

  if (isHydrating) {
    return null;
  }

  return (
    <Redirect
      href={
        !isAuthenticated
          ? "/(onboarding)/welcome"
          : onboardingRoute
            ? onboardingRoute
            : "/(tabs)"
      }
    />
  );
}
