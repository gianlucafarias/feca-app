import { usePathname } from "expo-router";

import { OnboardingAccountProgress } from "@/components/ui/onboarding-account-progress";
import { getOnboardingProgressState } from "@/lib/auth/onboarding-navigation";
import { useAuth } from "@/providers/auth-provider";

/**
 * Muestra solo “Paso X de Y” según ruta y sesión.
 */
export function OnboardingProgressBar() {
  const pathname = usePathname();
  const { session } = useAuth();
  const { stepNumber, totalSteps } = getOnboardingProgressState(session, pathname);

  return (
    <OnboardingAccountProgress stepNumber={stepNumber} totalSteps={totalSteps} />
  );
}
