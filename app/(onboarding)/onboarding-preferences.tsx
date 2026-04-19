import { Redirect, router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { OutingPreferencesForm } from "@/components/onboarding/outing-preferences-form";
import { OnboardingProgressBar } from "@/components/ui/onboarding-progress-bar";
import { PageBackground } from "@/components/ui/page-background";
import { paddingBottomStackScreen } from "@/components/ui/screen-padding";
import { StackScreenHeader } from "@/components/ui/stack-screen-header";
import { useOnboardingBack } from "@/hooks/use-onboarding-back";
import { useAuth } from "@/providers/auth-provider";
import { fecaTheme } from "@/theme/feca";

export default function OnboardingPreferencesScreen() {
  const insets = useSafeAreaInsets();
  const { session, setExtendedOnboardingStep } = useAuth();
  const goBack = useOnboardingBack();

  if (!session?.accessToken) {
    return <Redirect href="/(onboarding)/welcome" />;
  }

  return (
    <PageBackground>
      <StackScreenHeader title="Preferencias" onPressBack={goBack} />
      <View style={styles.header}>
        <OnboardingProgressBar />
        <Text style={styles.question}>Cómo salís</Text>
        <Text style={styles.hint}>
          Elegí al menos una opción donde aplique. Con esto afinamos recomendaciones y el orden en
          Explorar.
        </Text>
      </View>
      <OutingPreferencesForm
        contentContainerStyle={{
          paddingBottom: paddingBottomStackScreen(insets.bottom),
        }}
        submitLabel="Continuar"
        onSubmitSuccess={async () => {
          await setExtendedOnboardingStep("social");
          router.push("/(onboarding)/onboarding-follow-suggestions");
        }}
      />
    </PageBackground>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: fecaTheme.spacing.md,
    paddingHorizontal: fecaTheme.spacing.xl,
    paddingTop: fecaTheme.spacing.sm,
  },
  question: {
    ...fecaTheme.typography.display,
    color: fecaTheme.colors.onSurface,
  },
  hint: {
    ...fecaTheme.typography.body,
    color: fecaTheme.colors.muted,
  },
});
