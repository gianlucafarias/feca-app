import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { OutingPreferencesForm } from "@/components/onboarding/outing-preferences-form";
import { PageBackground } from "@/components/ui/page-background";
import { paddingBottomStackScreen } from "@/components/ui/screen-padding";
import { StackScreenHeader } from "@/components/ui/stack-screen-header";
import { useAuth } from "@/providers/auth-provider";
import { fecaTheme } from "@/theme/feca";

export default function OutingPreferencesScreen() {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();

  if (!session?.accessToken) {
    return (
      <PageBackground>
        <StackScreenHeader title="Preferencias" />
        <View style={styles.centered}>
          <Text style={styles.muted}>Iniciá sesión para guardar preferencias.</Text>
        </View>
      </PageBackground>
    );
  }

  return (
    <PageBackground>
      <StackScreenHeader title="Preferencias para recomendaciones" />
      <OutingPreferencesForm
        contentContainerStyle={{
          paddingBottom: paddingBottomStackScreen(insets.bottom),
        }}
        showTasteLink
        submitLabel="Guardar"
        onSubmitSuccess={() => {
          router.back();
        }}
      />
    </PageBackground>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    padding: fecaTheme.spacing.xl,
  },
  muted: {
    ...fecaTheme.typography.body,
    color: fecaTheme.colors.muted,
    textAlign: "center",
  },
});
