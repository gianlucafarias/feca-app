import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { FormField } from "@/components/ui/form-field";
import { GradientButton } from "@/components/ui/gradient-button";
import { PageBackground } from "@/components/ui/page-background";
import { TextLinkButton } from "@/components/ui/text-link-button";
import { useOnboarding } from "@/providers/onboarding-provider";
import { fecaTheme } from "@/theme/feca";

export default function UsernameScreen() {
  const { draft, updateDraft } = useOnboarding();

  return (
    <PageBackground>
      <ScrollView
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.step}>PASO 1 DE 2</Text>
          <Text style={styles.question}>¿Quién sos?</Text>
          <Text style={styles.hint}>
            Elegí cómo vas a aparecer en FECA.
          </Text>
        </View>

        <View style={styles.form}>
          <FormField
            autoCapitalize="none"
            autoCorrect={false}
            label="Usuario"
            onChangeText={(value) => updateDraft({ username: value })}
            placeholder="@tuusuario"
            value={draft.username}
          />
          <FormField
            label="Nombre visible"
            onChangeText={(value) => updateDraft({ displayName: value })}
            placeholder="Cómo querés aparecer"
            value={draft.displayName}
          />
        </View>

        <View style={styles.actions}>
          <GradientButton
            disabled={!draft.username.trim()}
            label="Seguir"
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
          <TextLinkButton
            label="Volver"
            onPress={() => router.replace("/(onboarding)/welcome")}
          />
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
    paddingTop: 100,
  },
  header: {
    gap: fecaTheme.spacing.sm,
  },
  step: {
    ...fecaTheme.typography.label,
    color: fecaTheme.colors.secondary,
    letterSpacing: 2,
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
