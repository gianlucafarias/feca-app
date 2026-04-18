import { hasCanonicalCity } from "@/lib/profile/canonical-city";
import type { AuthenticatedUser } from "@/types/auth";

export type OnboardingRoute = "/(onboarding)/username" | "/(onboarding)/city";

export function getOnboardingRouteForUser(
  user: AuthenticatedUser,
): OnboardingRoute | null {
  const hasIdentity =
    Boolean(user.username.trim()) && Boolean(user.displayName.trim());

  if (!hasIdentity) {
    return "/(onboarding)/username";
  }

  if (!hasCanonicalCity(user)) {
    return "/(onboarding)/city";
  }

  return null;
}
