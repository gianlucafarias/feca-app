import { Ionicons } from "@expo/vector-icons";
import { Redirect, router } from "expo-router";
import { useEffect, useState } from "react";
import {
  LayoutAnimation,
  Pressable,
  StyleSheet,
  Text,
  UIManager,
  View,
} from "react-native";

import { FormField } from "@/components/ui/form-field";
import { GradientButton } from "@/components/ui/gradient-button";
import { PageBackground } from "@/components/ui/page-background";
import { createDiaryApi } from "@/lib/api/diaries";
import { useAuth } from "@/providers/auth-provider";
import { fecaTheme } from "@/theme/feca";

type Step = "form" | "success";

export default function NewDiaryScreen() {
  const { session } = useAuth();
  const accessToken = session?.accessToken;

  const [step, setStep] = useState<Step>("form");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  useEffect(() => {
    if (step !== "success") return;
    const timeout = setTimeout(() => router.back(), 1500);
    return () => clearTimeout(timeout);
  }, [step]);

  if (!accessToken) {
    return <Redirect href="/(onboarding)/welcome" />;
  }

  const handleCreate = () => {
    void (async () => {
      try {
        await createDiaryApi(accessToken, {
          name: name.trim() || "Nueva guía",
          description: description.trim(),
        });
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setStep("success");
      } catch {
        return;
      }
    })();
  };

  return (
    <PageBackground>
      <Pressable
        style={styles.root}
        onPress={() => {
          if (step === "success") router.back();
        }}
      >
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} style={styles.navButton}>
            <Ionicons color={fecaTheme.colors.onSurface} name="chevron-back" size={18} />
          </Pressable>
          <Pressable onPress={() => router.back()} style={styles.navButton}>
            <Ionicons color={fecaTheme.colors.onSurface} name="close" size={20} />
          </Pressable>
        </View>

        {step === "form" ? (
          <View style={styles.stepWrap}>
            <Text style={styles.title}>Nueva guía</Text>
            <Text style={styles.subtitle}>
              Una mini guía curada: título, intro y orden de paradas.
            </Text>
            <FormField
              autoCapitalize="sentences"
              autoCorrect={false}
              onChangeText={setName}
              placeholder="Nombre de la guía..."
              value={name}
            />
            <View style={styles.fieldGap} />
            <FormField
              autoCapitalize="sentences"
              multiline
              onChangeText={setDescription}
              placeholder="Descripción (opcional)"
              value={description}
            />
            <View style={styles.spacer} />
            <GradientButton
              disabled={!name.trim()}
              label="Crear guía"
              onPress={handleCreate}
            />
          </View>
        ) : null}

        {step === "success" ? (
          <View style={styles.successWrap}>
            <Ionicons color={fecaTheme.colors.primary} name="checkmark-circle" size={64} />
            <Text style={styles.successTitle}>Guía creada</Text>
            <Text style={styles.successMeta}>{name}</Text>
          </View>
        ) : null}
      </Pressable>
    </PageBackground>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: fecaTheme.spacing.xl,
    paddingTop: fecaTheme.spacing.xl,
  },
  navButton: {
    alignItems: "center",
    backgroundColor: fecaTheme.surfaces.high,
    borderRadius: fecaTheme.radii.pill,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  stepWrap: {
    flex: 1,
    paddingBottom: fecaTheme.spacing.xl,
    paddingHorizontal: fecaTheme.spacing.xl,
  },
  title: {
    ...fecaTheme.typography.headline,
    color: fecaTheme.colors.onSurface,
    marginBottom: fecaTheme.spacing.xs,
    marginTop: fecaTheme.spacing.xl,
  },
  subtitle: {
    ...fecaTheme.typography.body,
    color: fecaTheme.colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: fecaTheme.spacing.lg,
  },
  fieldGap: {
    height: fecaTheme.spacing.md,
  },
  spacer: {
    flex: 1,
  },
  successWrap: {
    alignItems: "center",
    flex: 1,
    gap: fecaTheme.spacing.sm,
    justifyContent: "center",
    paddingHorizontal: fecaTheme.spacing.xl,
  },
  successTitle: {
    ...fecaTheme.typography.title,
    color: fecaTheme.colors.onSurface,
  },
  successMeta: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.muted,
  },
});
