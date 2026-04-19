import { router, usePathname } from "expo-router";
import { useCallback } from "react";

import { getPreviousOnboardingHref } from "@/lib/auth/onboarding-navigation";

/**
 * Atrás en onboarding: usa el historial del stack si existe; si no, salta al paso anterior lógico.
 */
export function useOnboardingBack() {
  const pathname = usePathname();

  return useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    const prev = getPreviousOnboardingHref(pathname);
    if (prev) {
      router.replace(prev);
    }
  }, [pathname]);
}
