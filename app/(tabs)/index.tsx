import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ActivityFeedRow } from "@/components/home/activity-feed-row";
import { EditorGuidesSlider } from "@/components/home/editor-guides-slider";
import { NearbyPlacesSlider } from "@/components/home/nearby-places-slider";
import { ChangeCitySheet } from "@/components/ui/change-city-sheet";
import { EmptyState } from "@/components/ui/empty-state";
import { PageBackground } from "@/components/ui/page-background";
import { ReviewDetailSheet } from "@/components/ui/review-detail-sheet";
import { paddingBottomWithFloatingTabBar } from "@/components/ui/screen-padding";
import { TabScreenHeader } from "@/components/ui/tab-screen-header";
import { useEditorGuides } from "@/hooks/use-editor-guides";
import { useHomeFeed } from "@/hooks/use-home-feed";
import { useHomePlaceCarousels } from "@/hooks/use-home-place-carousels";
import { useRecentPlaceViews } from "@/hooks/use-recent-place-views";
import { useAuth } from "@/providers/auth-provider";
import { useUnreadNotifications } from "@/providers/unread-notifications-provider";
import { fecaTheme } from "@/theme/feca";
import type { FeedItem, Visit } from "@/types/feca";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const { unreadCount } = useUnreadNotifications();

  const [reviewVisit, setReviewVisit] = useState<Visit | null>(null);
  const [cityPickerOpen, setCityPickerOpen] = useState(false);
  const [cityPickerNonce, setCityPickerNonce] = useState(0);
  /** Hasta que la sesión refleje el mismo cityGooglePlaceId, mostramos el texto guardado (evita hero “pegado” al valor viejo). */
  const [cityUi, setCityUi] = useState<{
    label: string;
    placeId: string;
  } | null>(null);

  useEffect(() => {
    if (!session) {
      setCityUi(null);
      return;
    }
    if (cityUi && session.user.cityGooglePlaceId === cityUi.placeId) {
      setCityUi(null);
    }
  }, [session, cityUi]);

  const {
    listData,
    isLoading,
    error,
    refresh: refreshFeed,
    showTrustFallbackInvite,
  } = useHomeFeed({
    accessToken: session?.accessToken,
    cityGooglePlaceId: cityUi?.placeId ?? session?.user.cityGooglePlaceId,
    lat: session?.user.lat,
    lng: session?.user.lng,
    mode: "network",
  });

  const {
    nearby,
    openNow,
    friends,
    refreshAll: refreshPlaceCarousels,
    anyLoading: placeCarouselsLoading,
  } = useHomePlaceCarousels({
    accessToken: session?.accessToken,
    lat: session?.user.lat,
    lng: session?.user.lng,
  });

  const {
    places: recentProfilePlaces,
    isLoading: recentPlacesLoading,
    refresh: refreshRecentPlaces,
  } = useRecentPlaceViews();

  const {
    diaries: editorGuides,
    isLoading: editorGuidesLoading,
    error: editorGuidesError,
    refresh: refreshEditorGuides,
  } = useEditorGuides({
    accessToken: session?.accessToken,
    limit: 20,
  });

  const city =
    cityUi?.label.trim() || session?.user.city?.trim() || "";

  const openCityPicker = () => {
    setCityPickerNonce((n) => n + 1);
    setCityPickerOpen(true);
  };

  const onRefresh = useCallback(() => {
    void refreshFeed();
    void refreshPlaceCarousels();
    void refreshRecentPlaces();
    void refreshEditorGuides();
  }, [refreshEditorGuides, refreshFeed, refreshPlaceCarousels, refreshRecentPlaces]);

  return (
    <PageBackground>
      <FlatList
        contentContainerStyle={[
          styles.content,
          { paddingBottom: paddingBottomWithFloatingTabBar(insets.bottom) },
        ]}
        contentInsetAdjustmentBehavior="never"
        data={listData}
        extraData={{
          cityLine: city,
          sessionPid: session?.user.cityGooglePlaceId,
          uiPid: cityUi?.placeId,
        }}
        removeClippedSubviews={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator color={fecaTheme.colors.primary} size="large" />
            </View>
          ) : error ? (
            <EmptyState
              description={error}
              icon="cloud-offline-outline"
              title="No se pudo cargar el feed"
            />
          ) : (
            <EmptyState
              description={
                showTrustFallbackInvite
                  ? "Cuando haya visitas de tu red, las vas a ver acá."
                  : "Seguí gente cuyo gusto te importe o explorá más en la pestaña Explorar."
              }
              icon="sparkles-outline"
              title="Nada por acá"
            />
          )
        }
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <TabScreenHeader
              showNotifications={Boolean(session?.accessToken)}
              onPressNotifications={() => router.push("/notifications")}
              unreadCount={unreadCount}
            />

            <View style={styles.hero}>
              {session?.accessToken ? (
                <View style={styles.heroTitleStack}>
                  <Text style={styles.heroPreLine}>Lugares por</Text>
                  <Text style={styles.heroSecondLine}>
                    <Text style={styles.heroPreLine}>visitar</Text>
                    <Text style={styles.heroPreLine}> en</Text>
                  </Text>
                  <Pressable
                    accessibilityHint="Abre el selector de ciudad"
                    accessibilityLabel="Cambiar ciudad"
                    accessibilityRole="button"
                    hitSlop={{ bottom: 8, left: 4, right: 4, top: 8 }}
                    onPress={openCityPicker}
                    style={styles.heroCityTap}
                  >
                    <Text style={styles.heroCity}>
                      {city || "elegí tu ciudad"}
                    </Text>
                    <Ionicons
                      color={fecaTheme.colors.onSurface}
                      name="chevron-down"
                      size={26}
                    />
                  </Pressable>
                </View>
              ) : (
                <View style={styles.heroTitleStack}>
                  <Text style={styles.heroPreLine}>Lugares por</Text>
                  <Text style={styles.heroSecondLine}>
                    <Text style={styles.heroAccentWord}>visitar</Text>
                    <Text style={styles.heroSecondLineRest}> en tu ciudad</Text>
                  </Text>
                  <Text style={styles.heroCityMuted}>
                    Iniciá sesión para elegir y cambiar la ciudad
                  </Text>
                </View>
              )}
            </View>

            {session?.accessToken ? (
              <View style={styles.sliderSection}>
                <EditorGuidesSlider
                  diaries={editorGuides}
                  error={editorGuidesError}
                  isLoading={editorGuidesLoading}
                  onRetry={() => void refreshEditorGuides()}
                  title="Guías de editores"
                />
                <NearbyPlacesSlider
                  error={openNow.error}
                  hideWhenEmptyAfterLoad
                  isLoading={openNow.isLoading}
                  onRetry={() => void refreshPlaceCarousels()}
                  places={openNow.places}
                  title="Abierto ahora"
                />
                <NearbyPlacesSlider
                  error={friends.error}
                  hideWhenEmptyAfterLoad
                  isLoading={friends.isLoading}
                  onRetry={() => void refreshPlaceCarousels()}
                  places={friends.places}
                  title="A tus amigos les gustó"
                />
                <NearbyPlacesSlider
                  error={nearby.error}
                  hint="Para más variedad y filtros, abrí Explorar."
                  isLoading={nearby.isLoading}
                  onRetry={() => void refreshPlaceCarousels()}
                  places={nearby.places}
                  showMapLink
                  title="Lugares cerca"
                />
                <NearbyPlacesSlider
                  error={null}
                  hideWhenEmptyAfterLoad
                  hint="Los lugares cuya ficha abriste en FECA."
                  isLoading={recentPlacesLoading}
                  onRetry={() => void refreshRecentPlaces()}
                  places={recentProfilePlaces}
                  title="Visitaste recientemente"
                />
              </View>
            ) : null}

            <View style={styles.feedIntro}>
              {session?.accessToken && !showTrustFallbackInvite ? (
                <Text style={styles.activitySectionTitle}>
                  Actividad reciente
                </Text>
              ) : null}

              {showTrustFallbackInvite ? (
                <>
                  <View style={styles.inviteCard}>
                    <Text style={styles.inviteTitle}>
                      Tu red todavía no tiene actividad reciente
                    </Text>
                    <Text style={styles.inviteBody}>
                      Mientras tanto te mostramos señales de la comunidad con
                      contexto: quién volvería, qué está abierto, qué encaja con tu
                      salida. Seguí perfiles cuyo gusto te importe para priorizar
                      acá.
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() =>
                        router.push({ pathname: "/search", params: { mode: "people" } })
                      }
                      style={styles.inviteCta}
                    >
                      <Text style={styles.inviteCtaLabel}>Descubrir gente</Text>
                    </Pressable>
                  </View>

                  <Text style={styles.activitySectionTitle}>
                    Actividad reciente
                  </Text>
                  <View style={styles.popularHeader}>
                    <Text style={styles.popularEyebrow}>
                      Confianza en {city.trim() ? city : "tu ciudad"}
                    </Text>
                    <Text style={styles.popularSubtitle}>
                      Ideas mientras crece tu red: cada tarjeta dice por qué la ves.
                    </Text>
                  </View>
                </>
              ) : null}
            </View>
          </View>
        }
        refreshControl={
          <RefreshControl
            onRefresh={() => void onRefresh()}
            refreshing={
              (isLoading && listData.length > 0) ||
              (Boolean(session?.accessToken) &&
                (placeCarouselsLoading || editorGuidesLoading))
            }
            tintColor={fecaTheme.colors.primary}
          />
        }
        renderItem={({ item }: { item: FeedItem }) => (
          <ActivityFeedRow
            item={item}
            onPress={() => setReviewVisit(item.visit)}
          />
        )}
        showsVerticalScrollIndicator={false}
      />
      <ReviewDetailSheet
        onClose={() => setReviewVisit(null)}
        showPlaceLink
        visible={reviewVisit !== null}
        visit={reviewVisit}
      />
      <ChangeCitySheet
        key={`city-sheet-${cityPickerNonce}`}
        initialCity={session?.user.city ?? ""}
        initialLat={session?.user.lat}
        initialLng={session?.user.lng}
        onCitySaved={({ cityGooglePlaceId, displayName }) => {
          setCityUi({ label: displayName, placeId: cityGooglePlaceId });
          void refreshFeed();
          void refreshPlaceCarousels();
          void refreshRecentPlaces();
        }}
        onClose={() => setCityPickerOpen(false)}
        resetKey={cityPickerOpen ? cityPickerNonce : null}
        visible={cityPickerOpen}
      />
    </PageBackground>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: fecaTheme.spacing.lg,
    paddingTop: 0,
  },
  listHeader: {
    marginBottom: fecaTheme.spacing.md,
    marginHorizontal: -fecaTheme.spacing.lg,
  },
  hero: {
    paddingBottom: fecaTheme.spacing.xl,
    paddingHorizontal: fecaTheme.spacing.lg,
    paddingTop: fecaTheme.spacing.lg,
  },
  /** Título en tres líneas fijas: “Lugares para” / “visitar en” / ciudad */
  heroTitleStack: {
    alignItems: "flex-start",
    gap: 0,
    maxWidth: "100%",
  },
  heroPreLine: {
    color: fecaTheme.colors.onSurface,
    fontFamily: "Newsreader_500Medium_Italic",
    fontSize: 40,
    letterSpacing: -0.4,
    lineHeight: 44,
    marginBottom: -2,
  },
  /** Segunda línea del hero: acento “visitar” + continuación más ligera */
  heroSecondLine: {
    marginBottom: -2,
    marginTop: -2,
  },
  heroAccentWord: {
    color: fecaTheme.colors.onSurface,
    fontFamily: "Newsreader_700Bold_Italic",
    fontSize: 46,
    letterSpacing: -0.6,
    lineHeight: 48,
  },
  heroSecondLineRest: {
    color: fecaTheme.colors.onSurfaceVariant,
    fontFamily: "Newsreader_500Medium_Italic",
    fontSize: 30,
    letterSpacing: -0.3,
    lineHeight: 48,
  },
  heroCityTap: {
    alignItems: "center",
    flexDirection: "row",
    flexShrink: 1,
    gap: 4,
    marginTop: -2,
    maxWidth: "100%",
  },
  heroCity: {
    color: fecaTheme.colors.onSurface,
    flexShrink: 1,
    fontFamily: "Newsreader_700Bold_Italic",
    fontSize: 44,
    letterSpacing: -0.5,
    lineHeight: 48,
    textDecorationColor: fecaTheme.colors.onSurface,
    textDecorationLine: "underline",
  },
  heroCityMuted: {
    color: fecaTheme.colors.muted,
    fontFamily: "Newsreader_500Medium_Italic",
    fontSize: 18,
    lineHeight: 24,
    marginTop: 4,
    maxWidth: "100%",
  },
  sliderSection: {
    gap: fecaTheme.spacing.lg,
    paddingHorizontal: fecaTheme.spacing.lg,
    paddingTop: fecaTheme.spacing.sm,
  },
  feedIntro: {
    gap: fecaTheme.spacing.lg,
    paddingBottom: fecaTheme.spacing.sm,
    paddingHorizontal: fecaTheme.spacing.lg,
    paddingTop: fecaTheme.spacing.lg,
  },
  activitySectionTitle: {
    color: fecaTheme.colors.onSurface,
    fontFamily: "Newsreader_500Medium_Italic",
    fontSize: 22,
    lineHeight: 28,
  },
  inviteCard: {
    backgroundColor: fecaTheme.surfaces.low,
    borderRadius: fecaTheme.radii.lg,
    gap: fecaTheme.spacing.md,
    padding: fecaTheme.spacing.lg,
  },
  inviteTitle: {
    ...fecaTheme.typography.title,
    color: fecaTheme.colors.onSurface,
  },
  inviteBody: {
    ...fecaTheme.typography.body,
    color: fecaTheme.colors.muted,
    lineHeight: 22,
  },
  inviteCta: {
    alignSelf: "flex-start",
    backgroundColor: fecaTheme.colors.primary,
    borderRadius: fecaTheme.radii.pill,
    paddingHorizontal: fecaTheme.spacing.lg,
    paddingVertical: fecaTheme.spacing.sm,
  },
  inviteCtaLabel: {
    ...fecaTheme.typography.bodyStrong,
    color: fecaTheme.colors.onPrimary,
    fontSize: 15,
  },
  popularHeader: {
    gap: fecaTheme.spacing.xxs,
  },
  popularEyebrow: {
    ...fecaTheme.typography.label,
    color: fecaTheme.colors.primary,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  popularSubtitle: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.muted,
    lineHeight: 18,
  },
  separator: {
    height: fecaTheme.spacing.md,
  },
  centered: {
    alignItems: "center",
    paddingVertical: fecaTheme.spacing.xxl,
  },
});
