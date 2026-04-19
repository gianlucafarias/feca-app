import { hasMeaningfulOutingPreferences } from "@/lib/auth/outing-preferences";
import { hasCanonicalCity } from "@/lib/profile/canonical-city";
import type { AuthSession, ExtendedOnboardingStep } from "@/types/auth";

export function getActiveExtendedOnboarding(
  session: AuthSession,
): { active: true; step: ExtendedOnboardingStep } | null {
  const current = session.extendedOnboarding;
  if (current?.active === true) {
    return { active: true, step: current.step };
  }
  const pending = session.pendingExtendedOnboarding;
  if (pending) {
    return { active: true, step: pending.step };
  }
  return null;
}

export type OnboardingRoute =
  | "/(onboarding)/username"
  | "/(onboarding)/city"
  | "/(onboarding)/onboarding-preferences"
  | "/(onboarding)/onboarding-follow-suggestions"
  | "/(onboarding)/onboarding-past-places"
  | "/(onboarding)/onboarding-first-review";

/**
 * Primer paso de onboarding pendiente (perfil base + flujo extendido para nuevos).
 */
export function getOnboardingRouteForSession(
  session: AuthSession | null,
): OnboardingRoute | null {
  if (!session) {
    return null;
  }

  const user = session.user;
  const hasIdentity =
    Boolean(user.username.trim()) && Boolean(user.displayName.trim());

  if (!hasIdentity) {
    return "/(onboarding)/username";
  }

  if (!hasCanonicalCity(user)) {
    return "/(onboarding)/city";
  }

  const ext = getActiveExtendedOnboarding(session);
  if (!ext) {
    return null;
  }

  const prefsOk = hasMeaningfulOutingPreferences(user.outingPreferences);

  switch (ext.step) {
    case "preferences": {
      if (!prefsOk) {
        return "/(onboarding)/onboarding-preferences";
      }
      return "/(onboarding)/onboarding-follow-suggestions";
    }
    case "social": {
      return "/(onboarding)/onboarding-follow-suggestions";
    }
    case "places": {
      return "/(onboarding)/onboarding-past-places";
    }
    case "review": {
      return "/(onboarding)/onboarding-first-review";
    }
    default: {
      return null;
    }
  }
}
