import { useCallback, useEffect, useState } from "react";

import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Dimensions,
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FormField } from "@/components/ui/form-field";
import { GradientButton } from "@/components/ui/gradient-button";
import { TextLinkButton } from "@/components/ui/text-link-button";
import { useCityLocationPicker } from "@/hooks/use-city-location-picker";
import { useKeyboardBottomInset } from "@/hooks/use-keyboard-bottom-inset";
import { logCityChange, summarizeLocationPayload } from "@/lib/debug/city-change-debug";
import { hasCanonicalCity } from "@/lib/profile/canonical-city";
import {
  loadRecentCities,
  rememberCity,
  type RecentCityEntry,
} from "@/lib/storage/recent-cities";
import { useAuth } from "@/providers/auth-provider";
import { fecaTheme } from "@/theme/feca";

type ChangeCitySheetProps = {
  visible: boolean;
  onClose: () => void;
  /** Incrementar cada vez que se abre el sheet para sincronizar el picker con el perfil. */
  resetKey: number | null;
  initialCity: string;
  initialLat?: number;
  initialLng?: number;
  /** Tras PATCH exitoso: actualización optimista del inicio (texto de ciudad) antes de que React vea la sesión nueva. */
  onCitySaved?: (p: {
    city: string;
    cityGooglePlaceId: string;
    displayName: string;
  }) => void;
};

export function ChangeCitySheet({
  visible,
  onClose,
  resetKey,
  initialCity,
  initialLat,
  initialLng,
  onCitySaved,
}: ChangeCitySheetProps) {
  const insets = useSafeAreaInsets();
  const { height: winH } = useWindowDimensions();
  const keyboardInset = useKeyboardBottomInset();
  const { session, updateProfile } = useAuth();
  const [recents, setRecents] = useState<RecentCityEntry[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const {
    applyResolvedCity,
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
    initialCity,
    initialCityGooglePlaceId: session?.user.cityGooglePlaceId,
    initialLat,
    initialLng,
    resetKey: visible ? resetKey : null,
    /** Búsqueda global: el sesgo por perfil/simulador prioriza homónimos locales (p. ej. “Barcelona”). */
    locationBiasInAutocomplete: false,
  });

  useEffect(() => {
    if (!visible) {
      return;
    }
    void loadRecentCities().then(setRecents);
  }, [visible]);

  const handleSave = useCallback(() => {
    if (!session?.accessToken) {
      return;
    }

    setIsSaving(true);
    setSubmitError(null);

    void resolveCoordinates()
      .then(({ city, cityGooglePlaceId, displayName, lat, lng }) => {
        logCityChange("ChangeCitySheet → PATCH /v1/me", summarizeLocationPayload({
          city,
          cityGooglePlaceId,
          lat,
          lng,
        }));
        return updateProfile({
          city,
          cityGooglePlaceId,
          lat,
          lng,
        }).then(() => {
          onCitySaved?.({
            city,
            cityGooglePlaceId,
            displayName: displayName.trim() || city.trim(),
          });
          return { city, cityGooglePlaceId, displayName, lat, lng };
        });
      })
      .then(({ city, cityGooglePlaceId, displayName, lat, lng }) =>
        rememberCity({
          label: displayName,
          city,
          cityGooglePlaceId,
          lat,
          lng,
        }),
      )
      .then(() => {
        Keyboard.dismiss();
        onClose();
      })
      .catch((error: unknown) => {
        const message =
          error instanceof Error
            ? error.message
            : "No se pudo guardar tu ciudad";
        setSubmitError(message);
      })
      .finally(() => {
        setIsSaving(false);
      });
  }, [
    onCitySaved,
    onClose,
    resolveCoordinates,
    session?.accessToken,
    setSubmitError,
    updateProfile,
  ]);

  const isReady =
    Boolean(session?.accessToken) &&
    hasCanonicalCity({
      city: cityDraft.city,
      cityGooglePlaceId: cityDraft.cityGooglePlaceId,
      lat: cityDraft.lat,
      lng: cityDraft.lng,
    });
  const keyboardOpen = keyboardInset > 0;

  /**
   * En un `Modal`, `useWindowDimensions` a veces devuelve 0 → el sheet queda invisible.
   * Combinamos con `Dimensions` y un mínimo seguro.
   */
  const windowHeight = Math.max(
    winH,
    Dimensions.get("window").height,
    Dimensions.get("screen").height * 0.4,
    480,
  );

  /**
   * Con teclado abierto: el borde inferior del sheet queda en `keyboardInset` (flex-end).
   * Necesitamos `panelHeight <= windowHeight - keyboardInset - insets.top` o el panel
   * se va por arriba y desaparece. No usar un mínimo fijo (p. ej. 280) que rompa esa cota.
   */
  const maxFitAboveKeyboard =
    windowHeight - keyboardInset - insets.top - 8;
  const panelHeight = keyboardOpen
    ? Math.max(
        120,
        Math.min(Math.round(windowHeight * 0.88), maxFitAboveKeyboard),
      )
    : Math.round(windowHeight * 0.88);

  const availableForSuggestions = Math.max(
    100,
    maxFitAboveKeyboard - 220,
  );
  const suggestionsMaxH = keyboardOpen
    ? Math.min(220, Math.max(100, availableForSuggestions * 0.45))
    : 200;

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <View style={styles.modalRoot}>
        <Pressable
          accessibilityRole="button"
          onPress={onClose}
          style={styles.backdropFill}
        />
        <View
          style={[
            styles.sheetLift,
            {
              height: panelHeight,
              marginBottom: keyboardInset,
              maxHeight: panelHeight,
            },
          ]}
        >
          <View style={styles.sheet}>
            <View style={styles.header}>
              <Pressable onPress={onClose} style={styles.closeBtn}>
                <Ionicons
                  color={fecaTheme.colors.onSurface}
                  name="close"
                  size={20}
                />
              </Pressable>
              <Text style={styles.title}>Tu ciudad</Text>
              <View style={styles.closeBtn} />
            </View>

            <ScrollView
              contentContainerStyle={styles.scrollContent}
              keyboardDismissMode="on-drag"
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              showsVerticalScrollIndicator
              style={styles.scroll}
            >
              <FormField
                autoCapitalize="words"
                autoCorrect={false}
                label="Ciudad"
                onBlur={setFieldBlur}
                onChangeText={onChangeCityText}
                onFocus={setFieldFocus}
                placeholder="Buscar ciudad..."
                value={cityInput}
              />

              {cityApiEnabled ? (
                <Text style={styles.hint}>
                  Escribí la ciudad donde te encontrás
                </Text>
              ) : (
                <Text style={styles.hintMuted}>
                  Iniciá sesión para buscar ciudades o usá tu ubicación actual.
                </Text>
              )}

              {suggestionsLoading ? (
                <ActivityIndicator
                  color={fecaTheme.colors.primary}
                  style={styles.spinner}
                />
              ) : null}

              {suggestionsError ? (
                <Text style={styles.suggestionsError}>{suggestionsError}</Text>
              ) : null}

              {suggestions.length > 0 ? (
                <View
                  style={[styles.suggestionsBox, { maxHeight: suggestionsMaxH }]}
                >
                  <ScrollView
                    keyboardShouldPersistTaps="handled"
                    nestedScrollEnabled
                    style={[styles.suggestionsScroll, { maxHeight: suggestionsMaxH }]}
                  >
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
                        <Text style={styles.suggestionText}>
                          {item.displayName}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              ) : null}

              {recents.length > 0 ? (
                <View style={styles.recentsSection}>
                  <Text style={styles.recentsTitle}>Recientes</Text>
                  <View style={styles.recentsChips}>
                    {recents.map((r) => (
                      <Pressable
                        accessibilityRole="button"
                        key={r.cityGooglePlaceId}
                        onPress={() => applyResolvedCity(r)}
                        style={({ pressed }) => [
                          styles.recentChip,
                          pressed && styles.recentChipPressed,
                        ]}
                      >
                        <Text numberOfLines={1} style={styles.recentChipText}>
                          {r.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ) : null}

              <TextLinkButton
                label={
                  isLocating
                    ? "Detectando ubicación..."
                    : "Usar mi ubicación actual"
                }
                onPress={() => {
                  if (!isLocating) {
                    void fillFromCurrentLocation();
                  }
                }}
              />

             
            </ScrollView>

            <View
              style={[
                styles.footer,
                { paddingBottom: Math.max(insets.bottom, 12) },
              ]}
            >
              <GradientButton
                disabled={!isReady || isSaving || isResolvingCity}
                label={isSaving ? "Guardando..." : "Guardar ciudad"}
                onPress={handleSave}
              />
              {submitError ? (
                <Text style={styles.errorText}>{submitError}</Text>
              ) : null}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdropFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: fecaTheme.colors.scrim,
    zIndex: 0,
  },
  sheetLift: {
    alignSelf: "stretch",
    minHeight: 280,
    zIndex: 1,
  },
  sheet: {
    backgroundColor: fecaTheme.surfaces.lowest,
    borderTopLeftRadius: fecaTheme.radii.xl,
    borderTopRightRadius: fecaTheme.radii.xl,
    flex: 1,
    minHeight: 240,
    overflow: "hidden",
    paddingTop: fecaTheme.spacing.lg,
    ...fecaTheme.elevation.floating,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: fecaTheme.spacing.xl,
    paddingBottom: fecaTheme.spacing.sm,
  },
  title: {
    ...fecaTheme.typography.title,
    color: fecaTheme.colors.onSurface,
  },
  closeBtn: {
    alignItems: "center",
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  scroll: {
    flexGrow: 1,
    flexShrink: 1,
  },
  scrollContent: {
    paddingBottom: fecaTheme.spacing.md,
    paddingHorizontal: fecaTheme.spacing.xl,
  },
  footer: {
    backgroundColor: fecaTheme.surfaces.low,
    gap: fecaTheme.spacing.sm,
    paddingBottom: fecaTheme.spacing.sm,
    paddingHorizontal: fecaTheme.spacing.xl,
    paddingTop: fecaTheme.spacing.lg,
  },
  hint: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.muted,
    marginTop: fecaTheme.spacing.xs,
  },
  hintMuted: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.secondarySoft,
    marginTop: fecaTheme.spacing.xs,
  },
  spinner: {
    marginTop: fecaTheme.spacing.sm,
  },
  suggestionsError: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.secondary,
    marginTop: fecaTheme.spacing.xs,
  },
  suggestionsBox: {
    backgroundColor: fecaTheme.surfaces.container,
    borderRadius: fecaTheme.radii.md,
    marginTop: fecaTheme.spacing.sm,
    overflow: "hidden",
    ...fecaTheme.elevation.ambient,
  },
  suggestionsScroll: {
    overflow: "hidden",
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
  recentsSection: {
    gap: fecaTheme.spacing.sm,
    marginTop: fecaTheme.spacing.md,
  },
  recentsTitle: {
    ...fecaTheme.typography.label,
    color: fecaTheme.colors.muted,
    letterSpacing: 1,
  },
  recentsChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: fecaTheme.spacing.sm,
  },
  recentChip: {
    backgroundColor: fecaTheme.surfaces.low,
    borderRadius: fecaTheme.radii.sm,
    maxWidth: "100%",
    paddingHorizontal: fecaTheme.spacing.md,
    paddingVertical: fecaTheme.spacing.sm,
  },
  recentChipPressed: {
    opacity: 0.85,
  },
  recentChipText: {
    ...fecaTheme.typography.body,
    color: fecaTheme.colors.onSurface,
  },
  selectedHint: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.muted,
    marginTop: fecaTheme.spacing.sm,
  },
  errorText: {
    ...fecaTheme.typography.body,
    color: fecaTheme.colors.secondary,
    textAlign: "center",
  },
});
