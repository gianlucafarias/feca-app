import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PageBackground } from "@/components/ui/page-background";
import { getOnboardingRouteForUser } from "@/lib/auth/onboarding-route";
import { useAuth } from "@/providers/auth-provider";
import { useOnboarding } from "@/providers/onboarding-provider";
import { fecaTheme } from "@/theme/feca";

type SlideDef = {
  step: string;
  kicker: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  gradient: readonly [string, string, string];
};

const SLIDES: SlideDef[] = [
  {
    step: "1",
    kicker: "Visitas",
    icon: "cafe-outline",
    title: "Cada salida,\ncon detalle",
    body: "Nota, rating y sensaciones: tu huella de gusto queda registrada.",
    gradient: ["#fcf9f6", "#f6f3f0", "#fffefb"] as const,
  },
  {
    step: "2",
    kicker: "Listas",
    icon: "bookmark-outline",
    title: "Guías e\nintenciones",
    body: "Guardá lo que querés probar y armá recorridos para compartir.",
    gradient: ["#fcf9f6", "#f0edea", "#f6f3f0"] as const,
  },
  {
    step: "3",
    kicker: "Gente",
    icon: "people-outline",
    title: "Lo que hacen\nquienes seguís",
    body: "Descubrí visitas y señales de amigos en un solo feed.",
    gradient: ["#fcf9f6", "#f6f3f0", "#E4E6EA"] as const,
  },
];

function FeatureRow({
  icon,
  text,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
}) {
  return (
    <View style={styles.featureRow}>
      <Ionicons color={fecaTheme.colors.primary} name={icon} size={22} />
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

function WelcomeMiniSplash() {
  const inner = (
    <>
      <Text style={styles.miniSplashBrand}>feca</Text>
      <ActivityIndicator
        color={fecaTheme.colors.primary}
        size="small"
        style={styles.miniSplashSpinner}
      />
    </>
  );

  if (Platform.OS === "web") {
    return (
      <View pointerEvents="auto" style={styles.miniSplashRoot}>
        <View style={styles.miniSplashBackdropSolid}>{inner}</View>
      </View>
    );
  }

  return (
    <View pointerEvents="auto" style={styles.miniSplashRoot}>
      <BlurView intensity={48} style={styles.miniSplashBlur} tint="light">
        {inner}
      </BlurView>
    </View>
  );
}

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const { width: slideWidth } = useWindowDimensions();
  const navigation = useNavigation();

  const { clearError, errorMessage, isSigningIn, signInWithGoogle } = useAuth();
  const { resetDraft, updateDraft } = useOnboarding();

  const [stage, setStage] = useState<"slides" | "auth">("slides");
  const [slideIndex, setSlideIndex] = useState(0);
  const [miniSplash, setMiniSplash] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const leftScreenOnce = useRef(false);
  const miniSplashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onFocus = () => {
      if (leftScreenOnce.current) {
        if (miniSplashTimerRef.current) {
          clearTimeout(miniSplashTimerRef.current);
        }
        setMiniSplash(true);
        miniSplashTimerRef.current = setTimeout(() => {
          setMiniSplash(false);
          miniSplashTimerRef.current = null;
        }, 680);
      }
    };

    const onBlur = () => {
      leftScreenOnce.current = true;
      if (miniSplashTimerRef.current) {
        clearTimeout(miniSplashTimerRef.current);
        miniSplashTimerRef.current = null;
      }
    };

    const subFocus = navigation.addListener("focus", onFocus);
    const subBlur = navigation.addListener("blur", onBlur);

    return () => {
      subFocus();
      subBlur();
      if (miniSplashTimerRef.current) {
        clearTimeout(miniSplashTimerRef.current);
      }
    };
  }, [navigation]);

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
        : (getOnboardingRouteForUser(session.user) ?? "/(tabs)");

      router.replace(nextRoute);
    } catch {
      // error state is already handled by the auth provider.
    }
  };

  return (
    <PageBackground>
      <View style={[styles.root, { paddingTop: insets.top + 6 }]}>
        {stage === "slides" ? (
          <View style={styles.slidesShell}>
            <View style={styles.skipRow}>
              <View style={styles.skipSpacer} />
              <Pressable
                accessibilityRole="button"
                hitSlop={12}
                onPress={() => setStage("auth")}
                style={({ pressed }) => [
                  styles.skipHit,
                  pressed && styles.skipPressed,
                ]}
              >
                <Text style={styles.skipLabel}>Saltar</Text>
              </Pressable>
            </View>

            <ScrollView
              ref={scrollRef}
              decelerationRate="fast"
              horizontal
              onMomentumScrollEnd={onMomentumScrollEnd}
              pagingEnabled
              scrollEventThrottle={16}
              showsHorizontalScrollIndicator={false}
              style={styles.slideScroll}
            >
              {SLIDES.map((slide) => (
                <View
                  key={slide.step}
                  style={[styles.slidePage, { width: slideWidth }]}
                >
                  <LinearGradient
                    colors={[...slide.gradient]}
                    end={{ x: 0.5, y: 1 }}
                    locations={[0, 0.55, 1]}
                    start={{ x: 0.15, y: 0 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <View style={styles.slideCopy}>
                    <Text style={styles.kickerLine}>
                      {slide.step} / 3 · {slide.kicker}
                    </Text>
                    <Ionicons
                      color={fecaTheme.colors.primary}
                      name={slide.icon}
                      size={52}
                      style={styles.slideIcon}
                    />
                    <Text style={styles.slideTitle}>{slide.title}</Text>
                    <Text style={styles.slideBody}>{slide.body}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>

            <View
              style={[
                styles.footer,
                { paddingBottom: Math.max(insets.bottom, 16) },
              ]}
            >
              <View style={styles.dots}>
                {SLIDES.map((_, i) => (
                  <View
                    key={String(i)}
                    style={[
                      styles.dot,
                      i === slideIndex ? styles.dotActive : styles.dotIdle,
                    ]}
                  />
                ))}
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={goNextSlide}
                style={({ pressed }) => [
                  styles.ctaMain,
                  pressed && styles.ctaMainPressed,
                ]}
              >
                <LinearGradient
                  colors={[
                    fecaTheme.colors.primary,
                    fecaTheme.colors.primaryContainer,
                  ]}
                  end={{ x: 1, y: 1 }}
                  start={{ x: 0, y: 0 }}
                  style={styles.ctaGradient}
                >
                  <Text style={styles.ctaMainLabel}>
                    {slideIndex === SLIDES.length - 1 ? "Comenzar" : "Siguiente"}
                  </Text>
                  <Ionicons
                    color={fecaTheme.colors.onPrimary}
                    name="arrow-forward"
                    size={18}
                  />
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        ) : (
          <Animated.View
            entering={FadeIn.duration(380)}
            style={styles.authShell}
          >
            <View style={styles.authTop}>
              <Text style={styles.eyebrow}>BIENVENIDA</Text>
              <Text style={styles.brand}>feca</Text>
              <Text style={styles.tagline}>
                Tu diario de cafés,{"\n"}brunch y mesas{"\n"}pendientes.
              </Text>
            </View>

            <View style={styles.features}>
              <FeatureRow
                icon="cafe-outline"
                text="Registrá cada visita con nota y rating"
              />
              <FeatureRow
                icon="bookmark-outline"
                text="Guardá los lugares que querés probar"
              />
              <FeatureRow
                icon="people-outline"
                text="Seguí amistades y descubrí sus recomendaciones"
              />
            </View>

            <View style={[styles.bottom, { paddingBottom: insets.bottom + 8 }]}>
              <Pressable
                disabled={isSigningIn}
                onPress={() => {
                  void handleGoogleSignIn();
                }}
                style={({ pressed }) => [
                  styles.googleBtn,
                  pressed && styles.googleBtnPressed,
                  isSigningIn && styles.googleBtnDisabled,
                ]}
              >
                <Ionicons
                  color={fecaTheme.colors.onSurface}
                  name="logo-google"
                  size={18}
                />
                <Text style={styles.googleBtnLabel}>
                  {isSigningIn ? "Conectando..." : "Continuar con Google"}
                </Text>
              </Pressable>
              <Text style={styles.loginHint}>
                Necesitas iniciar sesión para usar FECA.
              </Text>
              {errorMessage ? (
                <Text style={styles.errorText}>{errorMessage}</Text>
              ) : null}
            </View>
          </Animated.View>
        )}
      </View>

      {miniSplash ? (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(220)}
          style={StyleSheet.absoluteFill}
        >
          <WelcomeMiniSplash />
        </Animated.View>
      ) : null}
    </PageBackground>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  slidesShell: {
    flex: 1,
  },
  skipRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: fecaTheme.spacing.lg,
    marginBottom: fecaTheme.spacing.sm,
  },
  skipSpacer: {
    flex: 1,
  },
  skipHit: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  skipPressed: {
    opacity: 0.55,
  },
  skipLabel: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.muted,
  },
  slideScroll: {
    flex: 1,
  },
  slidePage: {
    flex: 1,
  },
  slideCopy: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: fecaTheme.spacing.xl,
    gap: fecaTheme.spacing.lg,
  },
  kickerLine: {
    ...fecaTheme.typography.label,
    color: fecaTheme.colors.muted,
    letterSpacing: 1.6,
  },
  slideIcon: {
    marginTop: fecaTheme.spacing.xs,
    opacity: 0.92,
  },
  slideTitle: {
    fontFamily: "Newsreader_700Bold",
    fontSize: 32,
    lineHeight: 38,
    color: fecaTheme.colors.onSurface,
    letterSpacing: -0.4,
  },
  slideBody: {
    ...fecaTheme.typography.body,
    fontSize: 16,
    lineHeight: 25,
    color: fecaTheme.colors.muted,
    maxWidth: 340,
  },
  footer: {
    paddingTop: fecaTheme.spacing.md,
    paddingHorizontal: fecaTheme.spacing.lg,
    gap: fecaTheme.spacing.lg,
    backgroundColor: "transparent",
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  dot: {
    height: 5,
    borderRadius: fecaTheme.radii.pill,
  },
  dotIdle: {
    width: 5,
    backgroundColor: fecaTheme.colors.scrimSubtle,
  },
  dotActive: {
    width: 24,
    backgroundColor: fecaTheme.colors.primary,
  },
  ctaMain: {
    borderRadius: fecaTheme.radii.pill,
    overflow: "hidden",
  },
  ctaMainPressed: {
    opacity: 0.9,
  },
  ctaGradient: {
    minHeight: 52,
    paddingHorizontal: fecaTheme.spacing.xl,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: fecaTheme.spacing.sm,
  },
  ctaMainLabel: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 16,
    color: fecaTheme.colors.onPrimary,
  },
  authShell: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: fecaTheme.spacing.xl,
    paddingTop: fecaTheme.spacing.lg,
  },
  authTop: {
    gap: fecaTheme.spacing.md,
  },
  eyebrow: {
    ...fecaTheme.typography.label,
    color: fecaTheme.colors.secondary,
    letterSpacing: 2,
  },
  brand: {
    ...fecaTheme.typography.logo,
    fontSize: 64,
    lineHeight: 68,
    color: fecaTheme.colors.onSurface,
  },
  tagline: {
    ...fecaTheme.typography.headline,
    color: fecaTheme.colors.muted,
    marginTop: fecaTheme.spacing.xs,
  },
  features: {
    gap: fecaTheme.spacing.xl,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: fecaTheme.spacing.md,
    paddingRight: fecaTheme.spacing.sm,
  },
  featureText: {
    ...fecaTheme.typography.body,
    color: fecaTheme.colors.onSurface,
    flex: 1,
    paddingTop: 2,
  },
  bottom: {
    gap: fecaTheme.spacing.md,
  },
  googleBtn: {
    alignItems: "center",
    backgroundColor: fecaTheme.surfaces.low,
    borderRadius: fecaTheme.radii.pill,
    flexDirection: "row",
    gap: fecaTheme.spacing.sm,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: fecaTheme.spacing.lg,
  },
  googleBtnPressed: {
    opacity: 0.88,
  },
  googleBtnDisabled: {
    opacity: 0.5,
  },
  googleBtnLabel: {
    ...fecaTheme.typography.bodyStrong,
    color: fecaTheme.colors.onSurface,
    fontSize: 15,
  },
  loginHint: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.muted,
    textAlign: "center",
  },
  errorText: {
    ...fecaTheme.typography.body,
    color: fecaTheme.colors.secondary,
    textAlign: "center",
  },
  miniSplashRoot: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
  },
  miniSplashBlur: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  miniSplashBackdropSolid: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: fecaTheme.colors.glassMedium,
  },
  miniSplashBrand: {
    ...fecaTheme.typography.logo,
    fontSize: 34,
    lineHeight: 38,
    letterSpacing: 1.5,
    color: fecaTheme.colors.onSurface,
  },
  miniSplashSpinner: {
    marginTop: 20,
  },
});
