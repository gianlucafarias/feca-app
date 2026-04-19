import { Redirect, router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
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
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { VisitVisitedAtField } from "@/components/visit/visit-visited-at-field";
import { WriteReviewEditorial } from "@/components/visit/write-review-editorial";
import { GradientButton } from "@/components/ui/gradient-button";
import { OnboardingProgressBar } from "@/components/ui/onboarding-progress-bar";
import { PageBackground } from "@/components/ui/page-background";
import { paddingBottomStackScreen } from "@/components/ui/screen-padding";
import { StackScreenHeader } from "@/components/ui/stack-screen-header";
import { TextLinkButton } from "@/components/ui/text-link-button";
import { useOnboardingBack } from "@/hooks/use-onboarding-back";
import { resolveGooglePlace } from "@/lib/api/places";
import { createVisitApi } from "@/lib/api/visits";
import {
  clearOnboardingPendingPlaces,
  readOnboardingPendingPlaces,
  type OnboardingPendingPlace,
} from "@/lib/auth/onboarding-pending-places-storage";
import { useKeyboardBottomInset } from "@/hooks/use-keyboard-bottom-inset";
import { toVisitYyyyMmDd } from "@/lib/format";
import { useAuth } from "@/providers/auth-provider";
import { fecaTheme, outlineGhost } from "@/theme/feca";
import type { PlaceCategory, RichVisitDraft } from "@/types/feca";

const DEFAULT_TAGS: PlaceCategory[] = ["cafe"];

const emptyRichDraft: RichVisitDraft = {
  orderedItems: "",
  wouldReturn: null,
  noiseLevel: null,
  wifiQuality: null,
  waitLevel: null,
  priceTier: null,
  photoUris: [],
  hasParking: null,
  petFriendly: null,
};

type Phase = "loading" | "form" | "emptyChoice";

export default function OnboardingFirstReviewScreen() {
  const insets = useSafeAreaInsets();
  const keyboardInset = useKeyboardBottomInset();
  const { session, finishExtendedOnboarding, syncMeFromServer } = useAuth();
  const goBack = useOnboardingBack();
  const [places, setPlaces] = useState<OnboardingPendingPlace[]>([]);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [rating, setRating] = useState(4);
  const [note, setNote] = useState("");
  const [richDraft, setRichDraft] = useState<RichVisitDraft>(emptyRichDraft);
  const [isSaving, setIsSaving] = useState(false);
  const [phase, setPhase] = useState<Phase>("loading");
  const [visitedAt, setVisitedAt] = useState(() => toVisitYyyyMmDd(new Date()));

  useEffect(() => {
    if (UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  const exitToApp = useCallback(async () => {
    await finishExtendedOnboarding();
    await syncMeFromServer();
    router.replace("/(tabs)");
  }, [finishExtendedOnboarding, syncMeFromServer]);

  useEffect(() => {
    if (!session?.user.id) {
      return;
    }
    let cancelled = false;
    void readOnboardingPendingPlaces(session.user.id).then((list) => {
      if (cancelled) {
        return;
      }
      if (list.length >= 1 && list.length <= 3) {
        setPlaces(list);
        setPhase("form");
        return;
      }
      setPhase("emptyChoice");
    });
    return () => {
      cancelled = true;
    };
  }, [session?.user.id]);

  const onSkipReview = useCallback(async () => {
    if (session?.user.id) {
      await clearOnboardingPendingPlaces(session.user.id);
    }
    await exitToApp();
  }, [exitToApp, session?.user.id]);

  const selected = places[reviewIndex];

  const handlePublish = useCallback(async () => {
    if (!session?.accessToken || !session.user.id || places.length < 1) {
      return;
    }
    const trimmed = note.trim();

    const ordered: OnboardingPendingPlace[] = [
      places[reviewIndex],
      ...places.filter((_, i) => i !== reviewIndex),
    ];

    setIsSaving(true);
    try {
      const token = session.accessToken;

      for (let i = 0; i < ordered.length; i += 1) {
        const p = ordered[i];
        const resolved = await resolveGooglePlace(token, p.googlePlaceId);
        if (i === 0) {
          await createVisitApi(token, {
            placeId: resolved.id,
            rating,
            note: trimmed.length > 0 ? trimmed : "",
            tags: DEFAULT_TAGS,
            visitedAt,
            orderedItems: richDraft.orderedItems.trim() || undefined,
            wouldReturn: richDraft.wouldReturn ?? undefined,
            noiseLevel: richDraft.noiseLevel ?? undefined,
            wifiQuality: richDraft.wifiQuality ?? undefined,
            waitLevel: richDraft.waitLevel ?? undefined,
            priceTier: richDraft.priceTier ?? undefined,
            photoUrls: richDraft.photoUris,
            hasParking: richDraft.hasParking === true ? true : undefined,
            petFriendly: richDraft.petFriendly === true ? true : undefined,
          });
        } else {
          await createVisitApi(token, {
            placeId: resolved.id,
            rating: 4,
            note: "",
            tags: DEFAULT_TAGS,
            visitedAt,
          });
        }
      }

      await clearOnboardingPendingPlaces(session.user.id);
      await exitToApp();
    } catch (e) {
      Alert.alert(
        "No se pudieron guardar las visitas",
        e instanceof Error ? e.message : "Revisá la conexión e intentá de nuevo.",
      );
    } finally {
      setIsSaving(false);
    }
  }, [
    exitToApp,
    note,
    places,
    rating,
    reviewIndex,
    richDraft,
    session?.accessToken,
    session?.user.id,
    visitedAt,
  ]);

  if (!session?.accessToken) {
    return <Redirect href="/(onboarding)/welcome" />;
  }

  if (phase === "loading") {
    return (
      <PageBackground>
        <View style={styles.centered}>
          <Text style={styles.muted}>Cargando…</Text>
        </View>
      </PageBackground>
    );
  }

  if (phase === "emptyChoice") {
    return (
      <PageBackground>
        <StackScreenHeader title="Primera reseña" onPressBack={goBack} />
        <View style={[styles.emptyBody, { paddingHorizontal: fecaTheme.spacing.xl }]}>
          <OnboardingProgressBar />
          <Text style={styles.question}>Reseña opcional</Text>
          <Text style={styles.hint}>
            No hay lugares guardados para este paso. Podés publicar visitas y reseñas cuando
            quieras desde cada lugar o tu perfil.
          </Text>
          <GradientButton label="Entrar a FECA" onPress={() => void onSkipReview()} />
        </View>
      </PageBackground>
    );
  }

  if (!selected) {
    return (
      <PageBackground>
        <View style={styles.centered}>
          <Text style={styles.muted}>Cargando…</Text>
        </View>
      </PageBackground>
    );
  }

  const othersCount = places.length - 1;
  const reviewHint =
    othersCount > 0
      ? `Elegí cuál querés destacar (estrellas y texto son opcionales). Los otros ${othersCount} se guardan como visita breve; después podés ampliarlos desde tu perfil.`
      : "Podés dejar solo la calificación o sumar una nota cuando quieras.";

  const writeReviewProps = {
    belowNoteSlot: (
      <VisitVisitedAtField onChangeYyyyMmDd={setVisitedAt} valueYyyyMmDd={visitedAt} />
    ),
    isManualPlace: false,
    isSaving,
    manualAddress: "",
    note,
    onBackFromDetails: goBack,
    onManualAddressChange: () => {},
    onNoteChange: setNote,
    onPublish: () => void handlePublish(),
    onRatingChange: setRating,
    onRichDraftChange: setRichDraft,
    placeAddress: selected.address,
    placeName: selected.name,
    placePhotoUrl: selected.photoUrl,
    rating,
    richDraft,
    showEditPlace: false,
    onEditPlace: () => {},
  };

  return (
    <PageBackground>
      <StackScreenHeader title="Primera reseña" onPressBack={goBack} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={insets.top + 8}
        style={styles.flex}
      >
        <View style={styles.flex}>
          <ScrollView
            contentContainerStyle={[
              styles.scroll,
              {
                paddingBottom: paddingBottomStackScreen(
                  insets.bottom + keyboardInset + 100,
                ),
              },
            ]}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.header}>
              <OnboardingProgressBar />
              <Text style={styles.question}>Reseña en detalle</Text>
              <Text style={styles.hint}>{reviewHint}</Text>
            </View>

            <View style={styles.pickRow}>
              {places.map((p, i) => (
                <Pressable
                  accessibilityRole="button"
                  key={p.googlePlaceId}
                  onPress={() => {
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setReviewIndex(i);
                    setNote("");
                    setRichDraft(emptyRichDraft);
                    setRating(4);
                  }}
                  style={({ pressed }) => [
                    styles.pickChip,
                    i === reviewIndex && styles.pickChipActive,
                    pressed && styles.pickChipPressed,
                  ]}
                >
                  <Text
                    numberOfLines={2}
                    style={[styles.pickChipText, i === reviewIndex && styles.pickChipTextActive]}
                  >
                    {p.name}
                  </Text>
                </Pressable>
              ))}
            </View>

            <WriteReviewEditorial {...writeReviewProps} />
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
            <TextLinkButton label="Omitir sin publicar" onPress={() => void onSkipReview()} />
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
    gap: fecaTheme.spacing.lg,
    paddingHorizontal: fecaTheme.spacing.lg,
    paddingTop: fecaTheme.spacing.sm,
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
  pickRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: fecaTheme.spacing.sm,
  },
  pickChip: {
    backgroundColor: fecaTheme.surfaces.container,
    borderColor: "transparent",
    borderRadius: fecaTheme.radii.md,
    borderWidth: 1,
    flexGrow: 1,
    flexShrink: 1,
    minWidth: "28%",
    paddingHorizontal: fecaTheme.spacing.sm,
    paddingVertical: fecaTheme.spacing.md,
  },
  pickChipActive: {
    borderColor: fecaTheme.colors.primary,
    backgroundColor: fecaTheme.surfaces.high,
  },
  pickChipPressed: {
    opacity: 0.9,
  },
  pickChipText: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.muted,
    textAlign: "center",
  },
  pickChipTextActive: {
    color: fecaTheme.colors.onSurface,
    fontFamily: "PlusJakartaSans_600SemiBold",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    padding: fecaTheme.spacing.xl,
  },
  emptyBody: {
    flex: 1,
    gap: fecaTheme.spacing.lg,
    justifyContent: "center",
    paddingTop: fecaTheme.spacing.sm,
  },
  muted: {
    ...fecaTheme.typography.body,
    color: fecaTheme.colors.muted,
    textAlign: "center",
  },
  footer: {
    backgroundColor: fecaTheme.colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: fecaTheme.spacing.lg,
    paddingTop: fecaTheme.spacing.sm,
  },
});
