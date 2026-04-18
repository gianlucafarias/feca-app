import { router } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FormField } from "@/components/ui/form-field";
import { GradientButton } from "@/components/ui/gradient-button";
import { PageBackground } from "@/components/ui/page-background";
import { TextLinkButton } from "@/components/ui/text-link-button";
import {
  useCityLocationPicker,
  type CityLocationDraft,
} from "@/hooks/use-city-location-picker";
import { hasCanonicalCity } from "@/lib/profile/canonical-city";
import { rememberCity } from "@/lib/storage/recent-cities";
import { useAuth } from "@/providers/auth-provider";
import { useOnboarding } from "@/providers/onboarding-provider";
import { fecaTheme } from "@/theme/feca";

export default function CityScreen() {
  const insets = useSafeAreaInsets();

  const {
    completeOnboarding: completeAuthOnboarding,
    session,
    updateProfile,
  } = useAuth();
  const { draft, resetDraft, updateDraft } = useOnboarding();
  const [isSaving, setIsSaving] = useState(false);

  const onCityDraftChange = useCallback(
    (next: CityLocationDraft) => {
      updateDraft({
        city: next.city,
        cityGooglePlaceId: next.cityGooglePlaceId,
        cityDisplayName: next.displayName,
        lat: next.lat,
        lng: next.lng,
      });
    },
    [updateDraft],
  );

  const {
    cityInput,
    draft: cityDraft,
    fillFromCurrentLocation,
    isLocating,
    isResolvingCity,
    onChangeCityText,
    onPickCitySuggestion,
    cityApiEnabled,
    resolveCoordinates,
    resolvedCityLabel,
    setFieldBlur,
    setFieldFocus,
    setSubmitError,
    submitError,
    suggestions,
    suggestionsError,
    suggestionsLoading,
  } = useCityLocationPicker({
    accessToken: session?.accessToken,
    initialCity: draft.city.trim() || session?.user.city || "",
    initialCityGooglePlaceId:
      draft.cityGooglePlaceId ?? session?.user.cityGooglePlaceId,
    initialLat: draft.lat ?? session?.user.lat,
    initialLng: draft.lng ?? session?.user.lng,
    onDraftChange: onCityDraftChange,
  });

  const isReady = hasCanonicalCity({
    city: cityDraft.city,
    cityGooglePlaceId: cityDraft.cityGooglePlaceId,
    lat: cityDraft.lat,
    lng: cityDraft.lng,
  });
  const fallbackUsername =
    draft.username.trim() || session?.user.username || undefined;
  const fallbackDisplayName =
    draft.displayName.trim() || session?.user.displayName || undefined;
  const resolvedLabel = useMemo(
    () => resolvedCityLabel.trim(),
    [resolvedCityLabel],
  );

  const scrollBottomPadding =
    fecaTheme.spacing.xxxl + insets.bottom + fecaTheme.spacing.lg;

  return (
    <PageBackground>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboard}
      >
        <ScrollView
          automaticallyAdjustKeyboardInsets
          bounces={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: scrollBottomPadding },
          ]}
          keyboardDismissMode={
            Platform.OS === "ios" ? "interactive" : "on-drag"
          }
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={styles.scrollRoot}
        >
          <View style={styles.content}>
            <View style={styles.header}>
              <Text style={styles.step}>PASO 2 DE 2</Text>
              <Text style={styles.question}>¿De dónde sos?</Text>
              <Text style={styles.hint}>
                Tu ciudad nos ayuda a mostrarte lo que hay cerca y ordenar mejor
                FECA.
              </Text>
            </View>

            <View style={styles.form}>
              <FormField
                autoCapitalize="words"
                autoCorrect={false}
                label="Ciudad"
                onBlur={setFieldBlur}
                onChangeText={onChangeCityText}
                onFocus={setFieldFocus}
                placeholder="Montevideo, Buenos Aires, Córdoba..."
                value={cityInput}
              />
              {cityApiEnabled ? (
                <Text style={styles.placesHint}>
                  Escribí para ver sugerencias de ciudades (FECA).
                </Text>
              ) : (
                <Text style={styles.placesHintMuted}>
                  Iniciá sesión para buscar ciudades o usá tu ubicación actual.
                </Text>
              )}
              {suggestionsLoading ? (
                <ActivityIndicator
                  color={fecaTheme.colors.primary}
                  style={styles.suggestionsSpinner}
                />
              ) : null}
              {suggestionsError ? (
                <Text style={styles.suggestionsError}>{suggestionsError}</Text>
              ) : null}
              {suggestions.length > 0 ? (
                <View style={styles.suggestionsBox}>
                  {suggestions.map((item) => (
                    <Pressable
                      accessibilityRole="button"
                      key={item.cityGooglePlaceId}
                      onPress={() => {
                        void onPickCitySuggestion(item);
                      }}
                      style={({ pressed }) => [
                        styles.suggestionRow,
                        pressed && styles.suggestionRowPressed,
                      ]}
                    >
                      <Text style={styles.suggestionText}>{item.displayName}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
              <TextLinkButton
                label={
                  isLocating ? "Detectando ubicación..." : "Usar mi ubicación actual"
                }
                onPress={() => {
                  if (!isLocating) {
                    void fillFromCurrentLocation();
                  }
                }}
              />
              {resolvedLabel ? (
                <Text style={styles.helperText}>
                  Ciudad seleccionada: {resolvedLabel}
                </Text>
              ) : null}
            </View>

            <View style={styles.actions}>
              <GradientButton
                disabled={!isReady || isSaving || isResolvingCity}
                label={isSaving ? "Guardando..." : "Entrar a FECA"}
                onPress={() => {
                  if (!isReady) {
                    return;
                  }

                  setIsSaving(true);
                  setSubmitError(null);

                  void resolveCoordinates()
                    .then(({ city, cityGooglePlaceId, displayName, lat, lng }) =>
                      updateProfile({
                        city,
                        cityGooglePlaceId,
                        displayName: fallbackDisplayName,
                        lat,
                        lng,
                        username: fallbackUsername,
                      }).then(() => ({
                        city,
                        cityGooglePlaceId,
                        displayName,
                        lat,
                        lng,
                      })),
                    )
                    .then(({ city, cityGooglePlaceId, displayName, lat, lng }) =>
                      rememberCity({
                        label: displayName,
                        city,
                        cityGooglePlaceId,
                        lat,
                        lng,
                      }),
                    )
                    .then(async () => {
                      resetDraft();
                      await completeAuthOnboarding();
                      router.replace("/(tabs)");
                    })
                    .catch((error) => {
                      const message =
                        error instanceof Error
                          ? error.message
                          : "No se pudo guardar tu perfil";
                      setSubmitError(message);
                    })
                    .finally(() => {
                      setIsSaving(false);
                    });
                }}
              />
              {submitError ? (
                <Text style={styles.errorText}>{submitError}</Text>
              ) : null}
              <TextLinkButton label="Volver" onPress={() => router.back()} />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </PageBackground>
  );
}

const styles = StyleSheet.create({
  keyboard: {
    flex: 1,
  },
  scrollRoot: {
    flex: 1,
  },
  scrollContent: {},
  content: {
    gap: fecaTheme.spacing.xxl,
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
    gap: fecaTheme.spacing.xs,
  },
  placesHint: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.muted,
  },
  placesHintMuted: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.secondarySoft,
  },
  suggestionsError: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.secondary,
    marginTop: fecaTheme.spacing.xs,
  },
  suggestionsSpinner: {
    marginTop: fecaTheme.spacing.xs,
  },
  suggestionsBox: {
    backgroundColor: fecaTheme.surfaces.container,
    borderRadius: fecaTheme.radii.md,
    marginTop: fecaTheme.spacing.xs,
    overflow: "hidden",
    ...fecaTheme.elevation.ambient,
  },
  suggestionRow: {
    paddingHorizontal: fecaTheme.spacing.md,
    paddingVertical: fecaTheme.spacing.md,
  },
  suggestionRowPressed: {
    backgroundColor: fecaTheme.surfaces.high,
  },
  suggestionText: {
    ...fecaTheme.typography.body,
    color: fecaTheme.colors.onSurface,
  },
  helperText: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.muted,
  },
  actions: {
    gap: fecaTheme.spacing.md,
  },
  errorText: {
    ...fecaTheme.typography.body,
    color: fecaTheme.colors.secondary,
    textAlign: "center",
  },
});
