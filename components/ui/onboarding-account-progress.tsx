import { StyleSheet, Text } from "react-native";

import { fecaTheme } from "@/theme/feca";

export type OnboardingAccountProgressProps = {
  /** Paso visible (1-based), p. ej. 1 en “Paso 1 de 6”. */
  stepNumber: number;
  totalSteps: number;
};

/**
 * Texto único de posición en el onboarding (“Paso 1 de 6”).
 */
export function OnboardingAccountProgress({
  stepNumber,
  totalSteps,
}: OnboardingAccountProgressProps) {
  const safeStep = Math.min(Math.max(stepNumber, 1), Math.max(totalSteps, 1));
  const safeTotal = Math.max(totalSteps, 1);
  const a11y = `Paso ${safeStep} de ${safeTotal}`;

  return (
    <Text accessibilityLabel={a11y} accessibilityRole="text" style={styles.text}>
      Paso {safeStep} de {safeTotal}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.muted,
    letterSpacing: 0.3,
  },
});
