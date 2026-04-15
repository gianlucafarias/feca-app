import { useCallback, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";

import { ActivityFeedRow } from "@/components/home/activity-feed-row";
import { NearbyPlacesSlider } from "@/components/home/nearby-places-slider";
import { ChangeCitySheet } from "@/components/ui/change-city-sheet";
import { EmptyState } from "@/components/ui/empty-state";
import { PageBackground } from "@/components/ui/page-background";
import { ReviewDetailSheet } from "@/components/ui/review-detail-sheet";
import { TabScreenHeader } from "@/components/ui/tab-screen-header";
import { useHomeFeed } from "@/hooks/use-home-feed";
import { useNearbyPlaces } from "@/hooks/use-nearby-places";
import { useAuth } from "@/providers/auth-provider";
import { fecaTheme } from "@/theme/feca";
import type { FeedItem, Visit } from "@/types/feca";

export default function HomeScreen() {
  const { session } = useAuth();
  const {
    listData,
    isLoading,
    error,
    refresh: refreshFeed,
    showTrustFallbackInvite,
  } = useHomeFeed({
    accessToken: session?.accessToken,
    lat: session?.user.lat,
    lng: session?.user.lng,
    mode: "network",
  });

  const {
    places: nearbyPlaces,
    isLoading: nearbyLoading,
    error: nearbyError,
    refresh: refreshNearby,
  } = useNearbyPlaces({
    accessToken: session?.accessToken,
    lat: session?.user.lat,
    lng: session?.user.lng,
  });

  const [reviewVisit, setReviewVisit] = useState<Visit | null>(null);
  const [cityPickerOpen, setCityPickerOpen] = useState(false);
  const [cityPickerNonce, setCityPickerNonce] = useState(0);

  const city = session?.user.city?.trim() ?? "";

  const openCityPicker = () => {
    setCityPickerNonce((n) => n + 1);
    setCityPickerOpen(true);
  };

  const onRefresh = useCallback(() => {
    void refreshFeed();
    void refreshNearby();
  }, [refreshFeed, refreshNearby]);

  return (
    <PageBackground>
      <FlatList
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="never"
        data={listData}
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
                  : "No hay sugerencias para mostrar todavía."
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
            />

            <View style={styles.hero}>
              {session?.accessToken ? (
                <View style={styles.heroTitleStack}>
                  <Text style={styles.heroPreLine}>Lugares para</Text>
                  <Text style={styles.heroPreLine}>visitar en</Text>
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
                  <Text style={styles.heroPreLine}>Lugares para</Text>
                  <Text style={styles.heroPreLine}>visitar en tu ciudad</Text>
                  <Text style={styles.heroCityMuted}>
                    Iniciá sesión para elegir y cambiar la ciudad
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.sliderSection}>
              <NearbyPlacesSlider
                error={nearbyError}
                isLoading={nearbyLoading}
                onRetry={() => void refreshNearby()}
                places={nearbyPlaces}
              />
            </View>

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
                      onPress={() => router.push("/friends")}
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
              (nearbyLoading && nearbyPlaces.length > 0)
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
        initialCity={session?.user.city ?? ""}
        initialLat={session?.user.lat}
        initialLng={session?.user.lng}
        onClose={() => setCityPickerOpen(false)}
        resetKey={cityPickerOpen ? cityPickerNonce : null}
        visible={cityPickerOpen}
      />
    </PageBackground>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 140,
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
