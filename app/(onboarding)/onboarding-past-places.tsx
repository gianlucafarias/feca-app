import { Redirect, router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { NearbyPlaceSearchResults } from "@/components/visit/nearby-place-search-results";
import { FormField } from "@/components/ui/form-field";
import { GradientButton } from "@/components/ui/gradient-button";
import { OnboardingProgressBar } from "@/components/ui/onboarding-progress-bar";
import { PageBackground } from "@/components/ui/page-background";
import { StackScreenHeader } from "@/components/ui/stack-screen-header";
import { TextLinkButton } from "@/components/ui/text-link-button";
import { useKeyboardBottomInset } from "@/hooks/use-keyboard-bottom-inset";
import { useOnboardingBack } from "@/hooks/use-onboarding-back";
import { fetchNearbyPlaces } from "@/lib/api/places";
import {
  clearOnboardingPendingPlaces,
  writeOnboardingPendingPlaces,
  type OnboardingPendingPlace,
} from "@/lib/auth/onboarding-pending-places-storage";
import { useAuth } from "@/providers/auth-provider";
import { fecaTheme, outlineGhost } from "@/theme/feca";
import type { NearbyPlace } from "@/types/places";

const DEBOUNCE_MS = 400;
const MAX_PLACES = 3;
const H_PAD = fecaTheme.spacing.xl;

export default function OnboardingPastPlacesScreen() {
  const insets = useSafeAreaInsets();
  const keyboardInset = useKeyboardBottomInset();
  const { session, setExtendedOnboardingStep, finishExtendedOnboarding, syncMeFromServer } =
    useAuth();
  const goBack = useOnboardingBack();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NearbyPlace[]>([]);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState<OnboardingPendingPlace[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);
  const lastSearchKeyRef = useRef<string | null>(null);

  const accessToken = session?.accessToken;
  const lat = session?.user.lat;
  const lng = session?.user.lng;
  const cityGooglePlaceId = session?.user.cityGooglePlaceId;

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      searchAbortRef.current?.abort();
    };
  }, []);

  const runNearbySearch = useCallback(
    async (options: { limit: number; query?: string }) => {
      if (!accessToken) {
        return;
      }
      const hasAnchor =
        (lat != null && lng != null) || Boolean(cityGooglePlaceId?.trim());
      if (!hasAnchor) {
        return;
      }

      const normalizedQuery = options.query?.trim() ?? "";
      const requestKey = JSON.stringify({
        cityGooglePlaceId: cityGooglePlaceId ?? null,
        lat: lat ?? null,
        lng: lng ?? null,
        limit: options.limit,
        query: normalizedQuery,
      });
      if (lastSearchKeyRef.current === requestKey) {
        return;
      }

      searchAbortRef.current?.abort();
      const ac = new AbortController();
      searchAbortRef.current = ac;
      lastSearchKeyRef.current = requestKey;
      setSearching(true);

      try {
        const list = await fetchNearbyPlaces({
          accessToken,
          lat: lat ?? undefined,
          lng: lng ?? undefined,
          limit: options.limit,
          ...(normalizedQuery ? { query: normalizedQuery } : {}),
          origin: "onboarding_past_places",
          signal: ac.signal,
        });
        if (!ac.signal.aborted) {
          setResults(list);
        }
      } catch {
        if (!ac.signal.aborted) {
          setResults([]);
        }
      } finally {
        if (!ac.signal.aborted) {
          setSearching(false);
        }
      }
    },
    [accessToken, cityGooglePlaceId, lat, lng],
  );

  const loadInitialPlaces = useCallback(async () => {
    if (!accessToken) {
      return;
    }
    const hasAnchor =
      (lat != null && lng != null) || Boolean(cityGooglePlaceId?.trim());
    if (!hasAnchor) {
      return;
    }

    await runNearbySearch({ limit: 8 });
  }, [accessToken, cityGooglePlaceId, lat, lng, runNearbySearch]);

  const searchPlaces = useCallback(
    async (text: string) => {
      if (!accessToken) {
        return;
      }
      const hasAnchor =
        (lat != null && lng != null) || Boolean(cityGooglePlaceId?.trim());
      if (!hasAnchor) {
        return;
      }

      if (!text.trim()) {
        await loadInitialPlaces();
        return;
      }

      await runNearbySearch({ limit: 10, query: text.trim() });
    },
    [accessToken, cityGooglePlaceId, lat, lng, loadInitialPlaces, runNearbySearch],
  );

  useEffect(() => {
    if (!accessToken) {
      return;
    }
    if (query.trim()) {
      return;
    }
    void loadInitialPlaces();
  }, [accessToken, loadInitialPlaces, query]);

  const handleQueryChange = useCallback(
    (text: string) => {
      setQuery(text);
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        void searchPlaces(text);
      }, DEBOUNCE_MS);
    },
    [searchPlaces],
  );

  const addPlace = useCallback((place: NearbyPlace) => {
    setPicked((prev) => {
      if (prev.some((p) => p.googlePlaceId === place.googlePlaceId)) {
        return prev;
      }
      if (prev.length >= MAX_PLACES) {
        return prev;
      }
      const next: OnboardingPendingPlace = {
        googlePlaceId: place.googlePlaceId,
        name: place.name,
        address: place.address,
        photoUrl: place.photoUrl,
      };
      return [...prev, next];
    });
  }, []);

  const removePlace = useCallback((googlePlaceId: string) => {
    setPicked((prev) => prev.filter((p) => p.googlePlaceId !== googlePlaceId));
  }, []);

  const exitToApp = useCallback(async () => {
    await finishExtendedOnboarding();
    await syncMeFromServer();
    router.replace("/(tabs)");
  }, [finishExtendedOnboarding, syncMeFromServer]);

  const onOmitPlaces = useCallback(async () => {
    if (!session?.user.id) {
      return;
    }
    await clearOnboardingPendingPlaces(session.user.id);
    await exitToApp();
  }, [exitToApp, session?.user.id]);

  const onContinue = useCallback(async () => {
    if (!session?.user.id) {
      return;
    }
    if (picked.length < 1 || picked.length > MAX_PLACES) {
      return;
    }
    await writeOnboardingPendingPlaces(session.user.id, picked);
    await setExtendedOnboardingStep("review");
    router.push("/(onboarding)/onboarding-first-review");
  }, [picked, session?.user.id, setExtendedOnboardingStep]);

  const canContinueToReview = picked.length >= 1 && picked.length <= MAX_PLACES;
  const trimmedQuery = query.trim();

  const isRowDimmed = useCallback(
    (place: NearbyPlace) =>
      picked.length >= MAX_PLACES &&
      !picked.some((p) => p.googlePlaceId === place.googlePlaceId),
    [picked],
  );

  if (!session?.accessToken) {
    return <Redirect href="/(onboarding)/welcome" />;
  }

  return (
    <PageBackground>
      <StackScreenHeader title="Donde fuiste?" onPressBack={goBack} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={insets.top}
        style={styles.flex}
      >
        <View style={styles.flex}>
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              {
                paddingBottom:
                  keyboardInset > 0
                    ? keyboardInset + fecaTheme.spacing.xl + 120
                    : insets.bottom + 140,
              },
            ]}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            style={styles.scroll}
          >
            <View style={styles.stepWrap}>
              <OnboardingProgressBar />
              <Text style={styles.hint}>
                Elegí hasta {MAX_PLACES} lugares que hayas visitado; en el siguiente paso podés
                escribir una reseña. También podés omitir este paso.
              </Text>
              {picked.length > 0 ? (
                <View style={styles.pickedBlock}>
                  <Text style={styles.counter}>
                    {picked.length} de {MAX_PLACES} elegidos
                  </Text>
                  {picked.map((p) => (
                    <View key={p.googlePlaceId} style={styles.pickedRow}>
                      <View style={styles.pickedText}>
                        <Text numberOfLines={1} style={styles.pickedName}>
                          {p.name}
                        </Text>
                        <Text numberOfLines={1} style={styles.pickedAddr}>
                          {p.address}
                        </Text>
                      </View>
                      <Pressable
                        accessibilityLabel={`Quitar ${p.name}`}
                        hitSlop={10}
                        onPress={() => removePlace(p.googlePlaceId)}
                        style={({ pressed }) => [styles.remove, pressed && { opacity: 0.7 }]}
                      >
                        <Text style={styles.removeText}>Quitar</Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              ) : null}
              <FormField
                autoCapitalize="words"
                autoCorrect={false}
                onChangeText={handleQueryChange}
                placeholder="Buscar cafe, restaurante..."
                value={query}
              />
              <NearbyPlaceSearchResults
                emptyNoQueryHint="Escribe el nombre del lugar que visitaste"
                emptyNoResultsHint="No encontramos coincidencias. Probá con otro nombre."
                isLoading={searching}
                isRowDimmed={isRowDimmed}
                isRowSelected={(place) =>
                  picked.some((p) => p.googlePlaceId === place.googlePlaceId)
                }
                onPressPlace={addPlace}
                places={results}
                queryTrimmed={trimmedQuery}
              />
            </View>
          </ScrollView>
          <View
            style={[
              styles.footer,
              {
                paddingBottom: Math.max(insets.bottom, fecaTheme.spacing.md),
                borderTopColor: outlineGhost,
              },
            ]}
          >
            <TextLinkButton label="Omitir sin agregar lugares" onPress={() => void onOmitPlaces()} />
            <GradientButton
              disabled={!canContinueToReview}
              label="Continuar a la reseña"
              onPress={() => void onContinue()}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </PageBackground>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: H_PAD,
    paddingTop: fecaTheme.spacing.sm,
  },
  stepWrap: {
    flex: 1,
    paddingBottom: fecaTheme.spacing.xl,
  },
  hint: {
    ...fecaTheme.typography.body,
    color: fecaTheme.colors.muted,
    marginBottom: fecaTheme.spacing.lg,
    marginTop: fecaTheme.spacing.md,
  },
  pickedBlock: {
    gap: fecaTheme.spacing.sm,
    marginBottom: fecaTheme.spacing.lg,
  },
  counter: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.onSurface,
    fontFamily: "PlusJakartaSans_600SemiBold",
  },
  pickedRow: {
    alignItems: "center",
    backgroundColor: fecaTheme.surfaces.low,
    borderRadius: fecaTheme.radii.sm,
    flexDirection: "row",
    gap: fecaTheme.spacing.sm,
    minHeight: 52,
    paddingHorizontal: fecaTheme.spacing.md,
    paddingVertical: fecaTheme.spacing.sm,
  },
  pickedText: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  pickedName: {
    ...fecaTheme.typography.bodyStrong,
    color: fecaTheme.colors.onSurface,
  },
  pickedAddr: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.muted,
  },
  remove: {
    padding: fecaTheme.spacing.xs,
  },
  removeText: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.secondary,
  },
  footer: {
    backgroundColor: fecaTheme.colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: fecaTheme.spacing.sm,
    paddingHorizontal: H_PAD,
    paddingTop: fecaTheme.spacing.md,
  },
});
