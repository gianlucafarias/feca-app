import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { FormField } from "@/components/ui/form-field";
import { GradientButton } from "@/components/ui/gradient-button";
import { OnboardingProgressBar } from "@/components/ui/onboarding-progress-bar";
import { PageBackground } from "@/components/ui/page-background";
import { StackScreenHeader } from "@/components/ui/stack-screen-header";
import { TextLinkButton } from "@/components/ui/text-link-button";
import { useOnboardingBack } from "@/hooks/use-onboarding-back";
import { useOnboarding } from "@/providers/onboarding-provider";
import { fecaTheme } from "@/theme/feca";

export default function UsernameScreen() {
  const { draft, updateDraft } = useOnboarding();
  const goBack = useOnboardingBack();

  return (
    <PageBackground>
      <StackScreenHeader title="Perfil" onPressBack={goBack} />
      <ScrollView
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <OnboardingProgressBar />
          <Text style={styles.question}>Tu perfil en FECA</Text>
          <Text style={styles.hint}>
            El usuario es único y va en minúsculas. El nombre visible es cómo te ven el resto;
            podés cambiarlo cuando quieras en Ajustes.
          </Text>
        </View>

        <View style={styles.form}>
          <FormField
            autoCapitalize="none"
            autoCorrect={false}
            label="Usuario"
            onChangeText={(value) => updateDraft({ username: value })}
            placeholder="ej.: maria_lopez"
            value={draft.username}
          />
          <FormField
            label="Nombre visible"
            onChangeText={(value) => updateDraft({ displayName: value })}
            placeholder="Ej.: María López"
            value={draft.displayName}
          />
        </View>

        <View style={styles.actions}>
          <GradientButton
            disabled={!draft.username.trim()}
            label="Continuar"
            onPress={() => {
              if (!draft.username.trim()) {
                return;
              }

              if (!draft.displayName.trim()) {
                updateDraft({ displayName: draft.username.trim() });
              }

              router.push("/(onboarding)/city");
            }}
          />
          <TextLinkButton label="Atrás" onPress={goBack} />
        </View>
      </ScrollView>
    </PageBackground>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: fecaTheme.spacing.xxl,
    paddingBottom: fecaTheme.spacing.xxxl,
    paddingHorizontal: fecaTheme.spacing.xl,
    paddingTop: fecaTheme.spacing.md,
  },
  header: {
    gap: fecaTheme.spacing.md,
  },
  question: {
    ...fecaTheme.typography.display,
    color: fecaTheme.colors.onSurface,
  },
  hint: {
    ...fecaTheme.typography.body,
    color: fecaTheme.colors.muted,
  },
  form: {
    gap: fecaTheme.spacing.xl,
  },
  actions: {
    gap: fecaTheme.spacing.md,
  },
});
