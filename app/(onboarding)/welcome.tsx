import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import LottieView from "lottie-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ImageSourcePropType } from "react-native";
import {
  AccessibilityInfo,
  ActivityIndicator,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PageBackground } from "@/components/ui/page-background";
import { getOnboardingRouteForSession } from "@/lib/auth/onboarding-route";
import { useAuth } from "@/providers/auth-provider";
import { useOnboarding } from "@/providers/onboarding-provider";
import { fecaTheme } from "@/theme/feca";

/** Lienzo único del onboarding (sin gradientes): mismo tono que `PageBackground`. */
const ONBOARDING_CANVAS = fecaTheme.colors.background;

type SlideDef = {
  step: string;
  kicker: string;
  title: string;
  body: string;
  /** Fondo a pantalla completa por paso. */
  image: ImageSourcePropType;
};

const BLOOMINGO_LOTTIE = require("../../assets/animations/bloomingo.json");

/** Pausa entre el final de un ciclo y el reinicio (solo si no está “Reducir movimiento”). */
const BLOOMINGO_LOOP_PAUSE_MS = 1800;

const SLIDES: SlideDef[] = [
  {
    step: "1",
    kicker: "Qué hace FECA",
    title: "Registrá cada salida\na un lugar",
    body: "Cafés, bares y restaurantes: anotá la visita con nota y estrellas cuando volvés.",
    image: require("../../assets/images/onboarding/onboarding-1.jpg"),
  },
  {
    step: "2",
    kicker: "Listas",
    title: "Guardá lo que\nquerés ir a probar",
    body: "Armá listas y recorridos para vos o para compartir.",
    image: require("../../assets/images/onboarding/onboarding-2.jpg"),
  },
  {
    step: "3",
    kicker: "Tu red",
    title: "Mirá lo que visitan\ntus amigos",
    body: "Un feed con visitas y recomendaciones de la gente que seguís.",
    image: require("../../assets/images/onboarding/onboarding-3.jpg"),
  },
];

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const { width: slideWidth, height: windowHeight } = useWindowDimensions();

  const { clearError, errorMessage, isSigningIn, signInWithGoogle } = useAuth();
  const { resetDraft, updateDraft } = useOnboarding();

  const [stage, setStage] = useState<"slides" | "auth">("slides");
  const [slideIndex, setSlideIndex] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const lottieRef = useRef<InstanceType<typeof LottieView> | null>(null);
  const lottiePauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearLottiePauseTimer = useCallback(() => {
    if (lottiePauseTimerRef.current != null) {
      clearTimeout(lottiePauseTimerRef.current);
      lottiePauseTimerRef.current = null;
    }
  }, []);

  const handleBloomingoFinish = useCallback(
    (isCancelled: boolean) => {
      if (reduceMotion || isCancelled) {
        return;
      }
      clearLottiePauseTimer();
      lottiePauseTimerRef.current = setTimeout(() => {
        lottiePauseTimerRef.current = null;
        lottieRef.current?.reset();
        lottieRef.current?.play();
      }, BLOOMINGO_LOOP_PAUSE_MS);
    },
    [clearLottiePauseTimer, reduceMotion],
  );

  useEffect(() => {
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduceMotion,
    );
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    return () => {
      clearLottiePauseTimer();
    };
  }, [clearLottiePauseTimer]);

  useEffect(() => {
    if (stage !== "auth") {
      clearLottiePauseTimer();
    }
  }, [clearLottiePauseTimer, stage]);

  const onMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const i = Math.round(x / slideWidth);
    setSlideIndex(Math.min(Math.max(i, 0), SLIDES.length - 1));
  };

  const goNextSlide = () => {
    if (slideIndex < SLIDES.length - 1) {
      scrollRef.current?.scrollTo({
        x: slideWidth * (slideIndex + 1),
        animated: true,
      });
    } else {
      setStage("auth");
    }
  };

  const handleGoogleSignIn = async () => {
    clearError();
    resetDraft();

    try {
      const result = await signInWithGoogle();

      if (!result) {
        return;
      }

      const { isNewUser, session } = result;

      const fallbackUsername =
        session.user.username ||
        session.user.email.split("@")[0] ||
        session.user.displayName;

      updateDraft({
        city: session.user.city ?? "",
        displayName: session.user.displayName,
        lat: session.user.lat,
        lng: session.user.lng,
        username: fallbackUsername,
      });

      const nextRoute = isNewUser
        ? "/(onboarding)/username"
        : (getOnboardingRouteForSession(session) ?? "/(tabs)");

      if (isNewUser && nextRoute.includes("username")) {
        router.push(nextRoute);
      } else {
        router.replace(nextRoute);
      }
    } catch {
      // error state is already handled by the auth provider.
    }
  };

  const activeSlide = SLIDES[slideIndex] ?? SLIDES[0];
  const slideFooterReserve =
    insets.bottom + fecaTheme.spacing.xl * 2 + 54 + fecaTheme.spacing.lg + 12;

  return (
    <PageBackground>
      <View
        style={[
          styles.root,
          stage === "slides" ? styles.rootSlides : { paddingTop: insets.top + 6 },
        ]}
      >
        {stage === "slides" ? (
          <View style={[styles.slidesShell, { height: windowHeight }]}>
            <ScrollView
              ref={scrollRef}
              decelerationRate="fast"
              horizontal
              onMomentumScrollEnd={onMomentumScrollEnd}
              pagingEnabled
              scrollEventThrottle={16}
              showsHorizontalScrollIndicator={false}
              style={{ height: windowHeight }}
            >
              {SLIDES.map((slide) => (
                <View
                  key={slide.step}
                  style={[styles.slidePageBleed, { height: windowHeight, width: slideWidth }]}
                >
                  <Image
                    accessibilityIgnoresInvertColors
                    contentFit="cover"
                    source={slide.image}
                    style={[
                      StyleSheet.absoluteFillObject,
                      { height: windowHeight, width: slideWidth },
                    ]}
                    transition={220}
                  />
                  <LinearGradient
                    colors={[
                      "transparent",
                      "rgba(0,0,0,0.18)",
                      "rgba(0,0,0,0.62)",
                    ]}
                    locations={[0, 0.42, 1]}
                    pointerEvents="none"
                    style={styles.slideBottomGradient}
                  />
                  <View
                    pointerEvents="box-none"
                    style={[styles.slideBottomAnchor, { paddingBottom: slideFooterReserve }]}
                  >
                    <Text style={styles.slideTitleOnImage}>{slide.title}</Text>
                    <Text style={styles.slideBodyOnImage}>{slide.body}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>

            <View
              pointerEvents="box-none"
              style={[styles.slidesTopChrome, { paddingTop: insets.top + 8 }]}
            >
              <View style={styles.topBar}>
                <Text style={styles.slideWordmark}>feca</Text>
                <Pressable
                  accessibilityHint="Pasá directo a iniciar sesión con Google"
                  accessibilityLabel="Ir al inicio de sesión"
                  accessibilityRole="button"
                  hitSlop={12}
                  onPress={() => setStage("auth")}
                  style={({ pressed }) => [
                    styles.skipHit,
                    pressed && styles.skipPressedLight,
                  ]}
                >
                  <Text style={styles.slideSkipLabel}>Saltar</Text>
                </Pressable>
              </View>
             
            </View>

            <View
              style={[
                styles.footerOnImage,
                { paddingBottom: Math.max(insets.bottom, 20) },
              ]}
            >
              <View style={styles.dots}>
                {SLIDES.map((_, i) => (
                  <View
                    key={String(i)}
                    style={[
                      styles.dot,
                      i === slideIndex ? styles.dotOnImageActive : styles.dotOnImageIdle,
                    ]}
                  />
                ))}
              </View>
              <Pressable
                accessibilityHint={
                  slideIndex === SLIDES.length - 1
                    ? "Abre la pantalla para entrar con Google"
                    : "Pasá a la siguiente pantalla del recorrido"
                }
                accessibilityLabel={
                  slideIndex === SLIDES.length - 1 ? "Comenzar" : "Siguiente pantalla"
                }
                accessibilityRole="button"
                onPress={goNextSlide}
                style={({ pressed }) => [
                  styles.ctaMain,
                  pressed ? styles.slideCtaPressed : styles.slideCtaFill,
                ]}
              >
                <View style={styles.ctaInner}>
                  <Text style={styles.slideCtaLabel}>
                    {slideIndex === SLIDES.length - 1 ? "Comenzar" : "Siguiente"}
                  </Text>
                  <Ionicons
                    color={fecaTheme.colors.primary}
                    name="arrow-forward"
                    size={18}
                    style={styles.slideCtaArrow}
                  />
                </View>
              </Pressable>
            </View>
          </View>
        ) : (
          <Animated.View
            entering={FadeIn.duration(380)}
            style={[styles.authOuter, { backgroundColor: ONBOARDING_CANVAS }]}
          >
            <View style={styles.authTopBar}>
              <Pressable
                accessibilityHint="Vuelve al recorrido de tres pantallas"
                accessibilityLabel="Volver al recorrido"
                accessibilityRole="button"
                hitSlop={12}
                onPress={() => setStage("slides")}
                style={({ pressed }) => [
                  styles.skipHit,
                  pressed && styles.skipPressed,
                ]}
              >
                <Text style={styles.skipLabel}>Volver</Text>
              </Pressable>
            </View>

            <View
              style={[
                styles.authColumn,
                { paddingBottom: insets.bottom + fecaTheme.spacing.xl },
              ]}
            >
              <Animated.View
                entering={FadeIn.duration(400).delay(20)}
                style={styles.authHeroLogoWrap}
              >
                <Text accessibilityRole="header" style={styles.authHeroWordmark}>
                  feca
                </Text>
              </Animated.View>

              <Animated.View
                entering={FadeInDown.duration(420).delay(40)}
                style={styles.authLottieWrap}
              >
                <LottieView
                  ref={lottieRef}
                  autoPlay={!reduceMotion}
                  loop={false}
                  onAnimationFinish={handleBloomingoFinish}
                  progress={reduceMotion ? 0 : undefined}
                  resizeMode="contain"
                  source={BLOOMINGO_LOTTIE}
                  style={styles.authLottie}
                />
              </Animated.View>

              <Animated.View
                entering={FadeIn.duration(360).delay(100)}
                style={styles.authCopyWrap}
              >
                <Text style={styles.kickerLine}>Ingresar</Text>
                <Text style={[styles.slideTitle, styles.authLoginTitle]}>Bienvenido a feca</Text>
                <Text style={styles.authLoginBody}>
                  Ingresá con tu cuenta de Google para ver lugares cerca y comenzar a explorar.
                </Text>
              </Animated.View>

              <Animated.View
                entering={FadeIn.duration(360).delay(160)}
                style={styles.authActionsStack}
              >
                <Pressable
                  accessibilityRole="button"
                  disabled={isSigningIn}
                  onPress={() => {
                    void handleGoogleSignIn();
                  }}
                  style={({ pressed }) => [
                    styles.ctaMain,
                    pressed && !isSigningIn
                      ? styles.ctaMainPressedFill
                      : styles.ctaMainFill,
                    isSigningIn && styles.googleBtnDisabled,
                  ]}
                >
                  <View style={styles.ctaInner}>
                    {isSigningIn ? (
                      <ActivityIndicator
                        color={fecaTheme.colors.onPrimary}
                        size="small"
                      />
                    ) : (
                      <Ionicons
                        color={fecaTheme.colors.onPrimary}
                        name="logo-google"
                        size={20}
                      />
                    )}
                    <Text style={styles.ctaMainLabel}>
                      {isSigningIn
                        ? "Conectando con Google…"
                        : "Continuar con Google"}
                    </Text>
                  </View>
                </Pressable>

                <Text style={styles.loginHint}>
                  Al ingresar aceptás nuestros Términos y condiciones que nadie lee.
                </Text>

                {errorMessage ? (
                  <View style={styles.errorBanner}>
                    <Text style={styles.errorText}>{errorMessage}</Text>
                  </View>
                ) : null}
              </Animated.View>
            </View>
          </Animated.View>
        )}
      </View>
    </PageBackground>
  );
}

const textShadowOnImage = {
  textShadowColor: "rgba(0,0,0,0.45)",
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 10,
} as const;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  rootSlides: {
    flex: 1,
    paddingTop: 0,
  },
  slidesShell: {
    flex: 1,
    position: "relative",
  },
  slidePageBleed: {
    backgroundColor: "#000",
    overflow: "hidden",
  },
  /** Oscurece suavemente la foto en la parte baja para legibilidad del copy. */
  slideBottomGradient: {
    bottom: 0,
    height: "52%",
    left: 0,
    position: "absolute",
    right: 0,
  },
  slideBottomAnchor: {
    bottom: 0,
    justifyContent: "flex-end",
    left: 0,
    paddingHorizontal: fecaTheme.spacing.lg,
    position: "absolute",
    right: 0,
  },
  slideTitleOnImage: {
    color: "#fff",
    fontFamily: "Newsreader_700Bold",
    fontSize: 34,
    letterSpacing: -0.55,
    lineHeight: 38,
    marginBottom: fecaTheme.spacing.sm,
    ...textShadowOnImage,
  },
  slideBodyOnImage: {
    color: "rgba(255,255,255,0.92)",
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 17,
    lineHeight: 26,
    maxWidth: 400,
    ...textShadowOnImage,
  },
  slidesTopChrome: {
    left: 0,
    overflow: "visible",
    paddingHorizontal: fecaTheme.spacing.lg,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 20,
  },
  slideWordmark: {
    ...fecaTheme.typography.logo,
    color: "#fff",
    fontSize: 26,
    includeFontPadding: false,
    lineHeight: 34,
    paddingLeft: fecaTheme.spacing.md,
    paddingRight: fecaTheme.spacing.xs,
    paddingVertical: 2,
    ...textShadowOnImage,
  },
  slideSkipLabel: {
    color: "#fff",
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 13,
    lineHeight: 18,
    ...textShadowOnImage,
  },
  slideKickerOnImage: {
    color: "#fff",
    fontFamily: "Newsreader_500Medium_Italic",
    fontSize: 15,
    letterSpacing: 0.2,
    marginTop: fecaTheme.spacing.sm,
    ...textShadowOnImage,
  },
  footerOnImage: {
    bottom: 0,
    gap: fecaTheme.spacing.lg,
    left: 0,
    paddingHorizontal: fecaTheme.spacing.lg,
    paddingTop: fecaTheme.spacing.lg,
    position: "absolute",
    right: 0,
    zIndex: 20,
  },
  dotOnImageIdle: {
    backgroundColor: "rgba(255,255,255,0.35)",
    width: 6,
  },
  dotOnImageActive: {
    backgroundColor: "#fff",
    width: 28,
  },
  slideCtaFill: {
    backgroundColor: "#fff",
  },
  slideCtaPressed: {
    backgroundColor: "rgba(255,255,255,0.88)",
  },
  slideCtaLabel: {
    color: fecaTheme.colors.primary,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 16,
    includeFontPadding: false,
    lineHeight: 20,
  },
  /** Alineación óptica con el texto (Ionicons suele quedar ~1–2px alto). */
  slideCtaArrow: {
    marginTop: 2,
  },
  skipPressedLight: {
    opacity: 0.55,
  },
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    overflow: "visible",
    paddingBottom: fecaTheme.spacing.sm,
  },
  /** Login: solo acción derecha; el wordmark va centrado sobre la animación. */
  authTopBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: fecaTheme.spacing.lg,
    paddingBottom: fecaTheme.spacing.sm,
  },
  authHeroLogoWrap: {
    alignItems: "center",
    alignSelf: "stretch",
    marginBottom: fecaTheme.spacing.md,
    overflow: "visible",
    paddingHorizontal: fecaTheme.spacing.xs,
  },
  /** Marca principal del login; padding extra evita que la «f» itálica quede recortada. */
  authHeroWordmark: {
    ...fecaTheme.typography.logo,
    color: fecaTheme.colors.onSurface,
    fontSize: 62,
    includeFontPadding: false,
    lineHeight: 76,
    paddingLeft: fecaTheme.spacing.md,
    paddingRight: fecaTheme.spacing.md,
    paddingVertical: fecaTheme.spacing.xs,
    textAlign: "center",
  },
  skipHit: {
    paddingHorizontal: fecaTheme.spacing.xs,
    paddingVertical: fecaTheme.spacing.xs,
  },
  skipPressed: {
    opacity: 0.55,
  },
  skipLabel: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.muted,
    fontFamily: "PlusJakartaSans_600SemiBold",
  },
  kickerLine: {
    fontFamily: "Newsreader_500Medium_Italic",
    fontSize: 15,
    letterSpacing: 0.2,
    color: fecaTheme.colors.muted,
  },
  slideTitle: {
    color: fecaTheme.colors.onSurface,
    fontFamily: "Newsreader_700Bold",
    fontSize: 34,
    letterSpacing: -0.55,
    lineHeight: 38,
    marginTop: fecaTheme.spacing.xs,
  },
  /** En login el `gap` del bloque ya separa kicker / título. */
  authLoginTitle: {
    marginTop: 0,
  },
  dots: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
  },
  dot: {
    borderRadius: fecaTheme.radii.pill,
    height: 5,
  },
  ctaMain: {
    borderRadius: fecaTheme.radii.pill,
    overflow: "hidden",
  },
  ctaMainFill: {
    backgroundColor: fecaTheme.colors.primary,
  },
  ctaMainPressedFill: {
    backgroundColor: fecaTheme.colors.primaryDim,
    transform: [{ scale: 0.99 }],
  },
  ctaInner: {
    alignItems: "center",
    flexDirection: "row",
    gap: fecaTheme.spacing.sm,
    justifyContent: "center",
    minHeight: 54,
    paddingHorizontal: fecaTheme.spacing.xl,
  },
  ctaMainLabel: {
    color: fecaTheme.colors.onPrimary,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 16,
  },
  authOuter: {
    flex: 1,
  },
  authColumn: {
    flex: 1,
    justifyContent: "flex-end",
    minHeight: 0,
    paddingHorizontal: fecaTheme.spacing.lg,
    paddingTop: fecaTheme.spacing.xs,
  },
  /** Hero Lottie: grande, anclado abajo junto al copy y al CTA. */
  authLottieWrap: {
    alignItems: "center",
    alignSelf: "stretch",
    aspectRatio: 1,
    flexShrink: 1,
    maxHeight: 560,
    maxWidth: 600,
    transform: [{ translateX: fecaTheme.spacing.xl }],
    width: "100%",
  },
  authLottie: {
    flex: 1,
    width: "100%",
  },
  authCopyWrap: {
    gap: fecaTheme.spacing.xs,
    marginBottom: fecaTheme.spacing.lg,
    marginTop: fecaTheme.spacing.sm,
    paddingBottom: 0,
    paddingTop: 0,
  },
  authLoginBody: {
    ...fecaTheme.typography.body,
    color: fecaTheme.colors.onSurfaceVariant,
    fontSize: 17,
    lineHeight: 26,
    maxWidth: 340,
  },
  authActionsStack: {
    gap: fecaTheme.spacing.sm,
    paddingTop: 0,
  },
  googleBtnDisabled: {
    opacity: 0.55,
  },
  loginHint: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.muted,
    lineHeight: 20,
    paddingHorizontal: fecaTheme.spacing.sm,
    textAlign: "center",
  },
  errorBanner: {
    alignSelf: "stretch",
    backgroundColor: fecaTheme.colors.overlay,
    borderRadius: fecaTheme.radii.md,
    marginTop: fecaTheme.spacing.xs,
    paddingHorizontal: fecaTheme.spacing.md,
    paddingVertical: fecaTheme.spacing.sm,
  },
  errorText: {
    ...fecaTheme.typography.body,
    color: fecaTheme.colors.secondaryDim,
    textAlign: "left",
  },
});
