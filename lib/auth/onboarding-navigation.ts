import type { Href } from "expo-router";

import { getActiveExtendedOnboarding } from "@/lib/auth/onboarding-route";
import type { AuthSession } from "@/types/auth";

function pathSegment(pathname: string): string {
  return pathname.toLowerCase();
}

/**
 * Paso actual (1-based) y total de pasos del onboarding unificado.
 * Son 6 pasos si hay onboarding extendido; si no, solo perfil + ciudad (2).
 */
export function getOnboardingProgressState(
  session: AuthSession | null,
  pathname: string,
): { stepNumber: number; totalSteps: number } {
  const p = pathSegment(pathname);
  const extended = session ? getActiveExtendedOnboarding(session) : null;

  if (!session || !extended) {
    const isCity = p.includes("city");
    return {
      stepNumber: isCity ? 2 : 1,
      totalSteps: 2,
    };
  }

  let index0 = 0;
  if (p.includes("username")) {
    index0 = 0;
  } else if (p.includes("city")) {
    index0 = 1;
  } else if (p.includes("onboarding-preferences")) {
    index0 = 2;
  } else if (p.includes("onboarding-follow-suggestions")) {
    index0 = 3;
  } else if (p.includes("onboarding-past-places")) {
    index0 = 4;
  } else if (p.includes("onboarding-first-review")) {
    index0 = 5;
  }

  return { stepNumber: index0 + 1, totalSteps: 6 };
}

/** Destino explícito del paso anterior (cuando no hay historial por `replace` o entrada desde `/`). */
export function getPreviousOnboardingHref(pathname: string): Href | null {
  const p = pathSegment(pathname);

  if (p.includes("username")) {
    return "/(onboarding)/welcome";
  }
  if (p.includes("city")) {
    return "/(onboarding)/username";
  }
  if (p.includes("onboarding-preferences")) {
    return "/(onboarding)/city";
  }
  if (p.includes("onboarding-follow-suggestions")) {
    return "/(onboarding)/onboarding-preferences";
  }
  if (p.includes("onboarding-past-places")) {
    return "/(onboarding)/onboarding-follow-suggestions";
  }
  if (p.includes("onboarding-first-review")) {
    return "/(onboarding)/onboarding-past-places";
  }

  return null;
}
