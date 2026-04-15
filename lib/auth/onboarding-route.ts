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

  const hasLocation =
    Boolean(user.city?.trim()) && user.lat != null && user.lng != null;

  if (!hasLocation) {
    return "/(onboarding)/city";
  }

  return null;
}
