import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  UIManager,
  View,
} from "react-native";

import { VisitRichFields } from "@/components/visit/visit-rich-fields";
import { Chip } from "@/components/ui/chip";
import { FormField } from "@/components/ui/form-field";
import { GradientButton } from "@/components/ui/gradient-button";
import { PageBackground } from "@/components/ui/page-background";
import { TextLinkButton } from "@/components/ui/text-link-button";
import {
  createManualPlaceApi,
  fetchNearbyPlaces,
  resolveGooglePlace,
} from "@/lib/api/places";
import { createVisitApi } from "@/lib/api/visits";
import { useKeyboardBottomInset } from "@/hooks/use-keyboard-bottom-inset";
import { useAuth } from "@/providers/auth-provider";
import { fecaTheme } from "@/theme/feca";
import type { PlaceCategory, RichVisitDraft } from "@/types/feca";
import type { NearbyPlace } from "@/types/places";

type Step = "search" | "details" | "success";

type SelectedPlace = {
  googlePlaceId: string;
  name: string;
  address: string;
  isManual?: boolean;
  photoUrl?: string;
  primaryType?: string;
  rating?: number;
};

const DEBOUNCE_MS = 400;

export default function NewVisitScreen() {
  const { session } = useAuth();

  const params = useLocalSearchParams<{
    googlePlaceId?: string;
    placeName?: string;
    placeAddress?: string;
  }>();

  const [step, setStep] = useState<Step>(
    params.googlePlaceId ? "details" : "search",
  );
  const [query, setQuery] = useState("");
  const [selectedPlace, setSelectedPlace] = useState<SelectedPlace | null>(
    params.googlePlaceId
      ? {
          address: params.placeAddress ?? "",
          googlePlaceId: params.googlePlaceId,
          name: params.placeName ?? "",
        }
      : null,
  );
  const [rating, setRating] = useState(4);
  const [note, setNote] = useState("");
  const [tags, setTags] = useState<PlaceCategory[]>(["cafe"]);
  const [manualAddress, setManualAddress] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [richDraft, setRichDraft] = useState<RichVisitDraft>({
    orderedItems: "",
    wouldReturn: null,
    noiseLevel: null,
    wifiQuality: null,
    waitLevel: null,
    priceTier: null,
    photoUris: [],
  });

  const [searchResults, setSearchResults] = useState<NearbyPlace[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const keyboardInset = useKeyboardBottomInset();

  const lat = session?.user.lat;
  const lng = session?.user.lng;
  const city = session?.user.city ?? "";
  const accessToken = session?.accessToken;

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

  const loadInitialPlaces = useCallback(async () => {
    if (lat == null || lng == null || !accessToken) return;

    setIsSearching(true);
    try {
      const results = await fetchNearbyPlaces({
        accessToken,
        lat,
        lng,
        limit: 8,
      });
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [accessToken, lat, lng]);

  useEffect(() => {
    if (step === "search" && !query.trim()) {
      void loadInitialPlaces();
    }
  }, [loadInitialPlaces, query, step]);

  const searchPlaces = useCallback(
    async (text: string) => {
      if (lat == null || lng == null || !accessToken) return;

      if (!text.trim()) {
        await loadInitialPlaces();
        return;
      }

      setIsSearching(true);
      try {
        const results = await fetchNearbyPlaces({
          accessToken,
          lat,
          lng,
          limit: 10,
          query: text.trim(),
        });
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    },
    [accessToken, lat, lng, loadInitialPlaces],
  );

  const handleQueryChange = useCallback(
    (text: string) => {
      setQuery(text);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        void searchPlaces(text);
      }, DEBOUNCE_MS);
    },
    [searchPlaces],
  );

  const goToStep = (nextStep: Step) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setStep(nextStep);
  };

  const toggleTag = (tag: PlaceCategory) => {
    setTags((current) =>
      current.includes(tag)
        ? current.filter((item) => item !== tag)
        : [...current, tag],
    );
  };

  const handlePickPlace = (place: NearbyPlace) => {
    setSelectedPlace({
      address: place.address,
      googlePlaceId: place.googlePlaceId,
      name: place.name,
      photoUrl: place.photoUrl,
      primaryType: place.primaryType,
      rating: place.rating,
    });
    setManualAddress("");
    setQuery(place.name);
    setTags([place.primaryType === "restaurant" ? "brunch" : "cafe"]);
    goToStep("details");
  };

  const handlePickManual = () => {
    setSelectedPlace({
      address: "",
      googlePlaceId: `manual-${Date.now()}`,
      isManual: true,
      name: query.trim(),
    });
    setManualAddress("");
    setTags(["cafe"]);
    goToStep("details");
  };

  if (!accessToken) {
    return <Redirect href="/(onboarding)/welcome" />;
  }

  const handlePublish = () => {
    const finalName = selectedPlace?.name || query.trim();
    if (!finalName) return;

    if (selectedPlace?.isManual && !manualAddress.trim()) {
      Alert.alert("Dirección", "Agrega la dirección del lugar para guardarlo.");
      return;
    }

    if (selectedPlace?.isManual && !city.trim()) {
      Alert.alert("Ciudad", "Completa tu ciudad antes de crear un lugar manual.");
      return;
    }

    const googlePlaceId = selectedPlace?.googlePlaceId ?? params.googlePlaceId;
    if (!selectedPlace?.isManual && !googlePlaceId) {
      Alert.alert("Lugar", "No se pudo resolver el lugar seleccionado.");
      return;
    }

    setIsSaving(true);

    void (async () => {
      const place = selectedPlace?.isManual
        ? await createManualPlaceApi(accessToken, {
            address: manualAddress.trim(),
            city: city.trim(),
            lat,
            lng,
            name: finalName,
          })
        : await resolveGooglePlace(accessToken, googlePlaceId!);

      return createVisitApi(accessToken, {
        note,
        noiseLevel: richDraft.noiseLevel ?? undefined,
        orderedItems: richDraft.orderedItems.trim() || undefined,
        photoUrls: richDraft.photoUris,
        placeId: place.id,
        priceTier: richDraft.priceTier ?? undefined,
        rating,
        tags,
        visitedAt: new Date().toISOString().slice(0, 10),
        waitLevel: richDraft.waitLevel ?? undefined,
        wifiQuality: richDraft.wifiQuality ?? undefined,
        wouldReturn: richDraft.wouldReturn ?? undefined,
      });
    })()
      .then(() => {
        goToStep("success");
      })
      .catch((err) => {
        const message =
          err instanceof Error ? err.message : "No se pudo guardar la visita";
        Alert.alert("Error", message);
      })
      .finally(() => {
        setIsSaving(false);
      });
  };

  const trimmedQuery = query.trim();

  return (
    <PageBackground>
      <View style={styles.root}>
        <View style={styles.topBar}>
          <Pressable
            onPress={() => {
              if (step === "details" && !params.googlePlaceId) {
                goToStep("search");
                return;
              }
              router.back();
            }}
            style={styles.backButton}
          >
            <Ionicons
              color={fecaTheme.colors.onSurface}
              name="chevron-back"
              size={18}
            />
          </Pressable>
          <Pressable onPress={() => router.back()} style={styles.closeButton}>
            <Ionicons
              color={fecaTheme.colors.onSurface}
              name="close"
              size={20}
            />
          </Pressable>
        </View>

        {step === "search" ? (
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.searchKav}
          >
            <View style={styles.stepWrap}>
              <Text style={styles.title}>Donde fuiste?</Text>
              <FormField
                autoCapitalize="words"
                autoCorrect={false}
                onChangeText={handleQueryChange}
                placeholder="Buscar cafe, restaurante..."
                value={query}
              />
              <ScrollView
                contentContainerStyle={{
                  flexGrow: 1,
                  paddingBottom:
                    keyboardInset > 0
                      ? keyboardInset + fecaTheme.spacing.xl
                      : fecaTheme.spacing.lg,
                }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                style={styles.searchScroll}
              >
              <View style={styles.results}>
                {isSearching ? (
                  <View style={styles.loadingWrap}>
                    <ActivityIndicator
                      color={fecaTheme.colors.primary}
                      size="small"
                    />
                  </View>
                ) : (
                  <>
                    {searchResults.map((place) => (
                      <Pressable
                        key={place.googlePlaceId}
                        onPress={() => handlePickPlace(place)}
                        style={styles.option}
                      >
                        {place.photoUrl ? (
                          <Image
                            contentFit="cover"
                            source={{ uri: place.photoUrl }}
                            style={styles.optionThumb}
                          />
                        ) : (
                          <View
                            style={[
                              styles.optionThumb,
                              styles.optionThumbFallback,
                            ]}
                          >
                            <Ionicons
                              color={fecaTheme.colors.muted}
                              name="cafe-outline"
                              size={16}
                            />
                          </View>
                        )}
                        <View style={styles.optionText}>
                          <Text numberOfLines={1} style={styles.optionName}>
                            {place.name}
                          </Text>
                          <Text numberOfLines={1} style={styles.optionMeta}>
                            {place.address}
                          </Text>
                        </View>
                        {place.rating != null ? (
                          <View style={styles.optionRating}>
                            <Ionicons
                              color={fecaTheme.colors.secondary}
                              name="star"
                              size={11}
                            />
                            <Text style={styles.optionRatingText}>
                              {place.rating.toFixed(1)}
                            </Text>
                          </View>
                        ) : null}
                      </Pressable>
                    ))}

                    {trimmedQuery ? (
                      <Pressable onPress={handlePickManual} style={styles.option}>
                        <View style={styles.createBadge}>
                          <Ionicons
                            color={fecaTheme.colors.primary}
                            name="add"
                            size={14}
                          />
                        </View>
                        <Text style={styles.createText}>
                          Agregar &quot;{trimmedQuery}&quot;
                        </Text>
                      </Pressable>
                    ) : null}

                    {!isSearching &&
                    searchResults.length === 0 &&
                    !trimmedQuery ? (
                      <Text style={styles.emptyHint}>
                        Escribe el nombre del lugar que visitaste
                      </Text>
                    ) : null}
                  </>
                )}
              </View>
            </ScrollView>
            </View>
          </KeyboardAvoidingView>
        ) : null}

        {step === "details" ? (
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            style={styles.detailsScroll}
          >
            <View style={styles.placeHeader}>
              {selectedPlace?.photoUrl ? (
                <Image
                  contentFit="cover"
                  source={{ uri: selectedPlace.photoUrl }}
                  style={styles.placeThumb}
                />
              ) : (
                <View style={[styles.placeThumb, styles.placeThumbFallback]}>
                  <Ionicons
                    color={fecaTheme.colors.muted}
                    name="cafe-outline"
                    size={20}
                  />
                </View>
              )}
              <View style={styles.placeHeaderText}>
                <Text numberOfLines={1} style={styles.optionName}>
                  {selectedPlace?.name || query.trim()}
                </Text>
                <Text numberOfLines={1} style={styles.optionMeta}>
                  {selectedPlace?.address || manualAddress || "Lugar nuevo"}
                </Text>
              </View>
              {!params.googlePlaceId ? (
                <TextLinkButton label="Editar" onPress={() => goToStep("search")} />
              ) : null}
            </View>

            <View style={styles.form}>
              <View style={styles.block}>
                <Text style={styles.blockLabel}>Rating</Text>
                <View style={styles.stars}>
                  {[1, 2, 3, 4, 5].map((value) => (
                    <Pressable
                      key={value}
                      hitSlop={4}
                      onPress={() => setRating(value)}
                    >
                      <Ionicons
                        color={
                          value <= rating
                            ? fecaTheme.colors.secondary
                            : fecaTheme.colors.outlineVariant
                        }
                        name={value <= rating ? "star" : "star-outline"}
                        size={28}
                      />
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={styles.block}>
                <Text style={styles.blockLabel}>Categoria</Text>
                <View style={styles.row}>
                  <Chip
                    label="Cafe"
                    onPress={() => toggleTag("cafe")}
                    selected={tags.includes("cafe")}
                  />
                  <Chip
                    label="Brunch"
                    onPress={() => toggleTag("brunch")}
                    selected={tags.includes("brunch")}
                  />
                </View>
              </View>

              {selectedPlace?.isManual ? (
                <FormField
                  label="Direccion"
                  onChangeText={setManualAddress}
                  placeholder="Direccion del lugar"
                  value={manualAddress}
                />
              ) : null}

              <FormField
                label="Nota"
                multiline
                onChangeText={setNote}
                placeholder="Algo corto o usá las plantillas abajo. Tu huella de gusto importa más que un párrafo largo."
                value={note}
              />

              <VisitRichFields
                draft={richDraft}
                note={note}
                onChange={setRichDraft}
                onNoteChange={setNote}
              />
            </View>

            <View style={styles.actions}>
              <GradientButton
                disabled={isSaving}
                label={isSaving ? "Guardando..." : "Guardar"}
                onPress={handlePublish}
              />
              <TextLinkButton
                label="Atras"
                onPress={() => {
                  if (params.googlePlaceId) {
                    router.back();
                  } else {
                    goToStep("search");
                  }
                }}
              />
            </View>
          </ScrollView>
        ) : null}

        {step === "success" ? (
          <Pressable
            accessibilityLabel="Cerrar"
            accessibilityRole="button"
            onPress={() => router.back()}
            style={styles.successBackdrop}
          >
            <View style={styles.successWrap}>
              <Ionicons
                color={fecaTheme.colors.primary}
                name="checkmark-circle"
                size={64}
              />
              <Text style={styles.successTitle}>Visita guardada</Text>
              <Text style={styles.successMeta}>
                {selectedPlace?.name || query.trim()}
              </Text>
            </View>
          </Pressable>
        ) : null}
      </View>
    </PageBackground>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  searchKav: {
    flex: 1,
  },
  detailsScroll: {
    flex: 1,
  },
  successBackdrop: {
    flex: 1,
  },
  stepWrap: {
    flex: 1,
    paddingBottom: fecaTheme.spacing.xl,
    paddingHorizontal: fecaTheme.spacing.xl,
  },
  searchScroll: {
    flex: 1,
  },
  content: {
    gap: fecaTheme.spacing.xxl,
    paddingBottom: fecaTheme.spacing.xxxl,
    paddingHorizontal: fecaTheme.spacing.xl,
    paddingTop: fecaTheme.spacing.xl,
  },
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: fecaTheme.spacing.xl,
    paddingTop: fecaTheme.spacing.xl,
  },
  backButton: {
    alignItems: "center",
    backgroundColor: fecaTheme.surfaces.high,
    borderRadius: fecaTheme.radii.pill,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  title: {
    ...fecaTheme.typography.headline,
    color: fecaTheme.colors.onSurface,
    marginBottom: fecaTheme.spacing.lg,
    marginTop: fecaTheme.spacing.xl,
  },
  closeButton: {
    alignItems: "center",
    backgroundColor: fecaTheme.surfaces.high,
    borderRadius: fecaTheme.radii.pill,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  results: {
    gap: fecaTheme.spacing.sm,
    paddingTop: fecaTheme.spacing.lg,
  },
  loadingWrap: {
    alignItems: "center",
    paddingVertical: fecaTheme.spacing.xxl,
  },
  option: {
    alignItems: "center",
    backgroundColor: fecaTheme.surfaces.low,
    borderRadius: fecaTheme.radii.sm,
    flexDirection: "row",
    gap: fecaTheme.spacing.sm,
    minHeight: 60,
    paddingHorizontal: fecaTheme.spacing.md,
    paddingVertical: fecaTheme.spacing.sm,
  },
  optionThumb: {
    borderRadius: fecaTheme.radii.sm,
    height: 40,
    width: 40,
  },
  optionThumbFallback: {
    alignItems: "center",
    backgroundColor: fecaTheme.surfaces.high,
    justifyContent: "center",
  },
  optionText: {
    flex: 1,
    gap: 2,
  },
  optionName: {
    ...fecaTheme.typography.bodyStrong,
    color: fecaTheme.colors.onSurface,
  },
  optionMeta: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.muted,
  },
  optionRating: {
    alignItems: "center",
    flexDirection: "row",
    gap: 3,
  },
  optionRatingText: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.onSurface,
    fontFamily: "Manrope_600SemiBold",
    fontSize: 12,
  },
  emptyHint: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.muted,
    paddingVertical: fecaTheme.spacing.xl,
    textAlign: "center",
  },
  createBadge: {
    alignItems: "center",
    backgroundColor: "rgba(81, 100, 67, 0.14)",
    borderRadius: fecaTheme.radii.pill,
    height: 22,
    justifyContent: "center",
    width: 22,
  },
  createText: {
    ...fecaTheme.typography.bodyStrong,
    color: fecaTheme.colors.primary,
  },
  placeHeader: {
    alignItems: "center",
    backgroundColor: fecaTheme.surfaces.low,
    borderRadius: fecaTheme.radii.md,
    flexDirection: "row",
    gap: fecaTheme.spacing.sm,
    paddingHorizontal: fecaTheme.spacing.md,
    paddingVertical: fecaTheme.spacing.sm,
  },
  placeThumb: {
    borderRadius: fecaTheme.radii.sm,
    height: 48,
    width: 48,
  },
  placeThumbFallback: {
    alignItems: "center",
    backgroundColor: fecaTheme.surfaces.high,
    justifyContent: "center",
  },
  placeHeaderText: {
    flex: 1,
    gap: 2,
  },
  form: {
    gap: fecaTheme.spacing.xl,
  },
  block: {
    gap: fecaTheme.spacing.sm,
  },
  blockLabel: {
    ...fecaTheme.typography.label,
    color: fecaTheme.colors.muted,
  },
  stars: {
    flexDirection: "row",
    gap: fecaTheme.spacing.sm,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: fecaTheme.spacing.sm,
  },
  actions: {
    gap: fecaTheme.spacing.md,
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
