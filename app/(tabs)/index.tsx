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
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { NearbyPlacesSlider } from "@/components/home/nearby-places-slider";
import { VisitCard } from "@/components/cards/visit-card";
import { AvatarBadge } from "@/components/ui/avatar-badge";
import { AddToDiarySheet } from "@/components/ui/add-to-diary-sheet";
import { ChangeCitySheet } from "@/components/ui/change-city-sheet";
import { EmptyState } from "@/components/ui/empty-state";
import { PageBackground } from "@/components/ui/page-background";
import { ReviewDetailSheet } from "@/components/ui/review-detail-sheet";
import { useHomeFeed } from "@/hooks/use-home-feed";
import { useNearbyPlaces } from "@/hooks/use-nearby-places";
import { useAuth } from "@/providers/auth-provider";
import { fecaTheme } from "@/theme/feca";
import type { FeedItem, Visit } from "@/types/feca";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
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

  const [diaryPlace, setDiaryPlace] = useState<{
    placeId: string;
    googlePlaceId?: string;
  } | null>(null);
  const [reviewVisit, setReviewVisit] = useState<Visit | null>(null);
  const [cityPickerOpen, setCityPickerOpen] = useState(false);
  const [cityPickerNonce, setCityPickerNonce] = useState(0);

  const handleAddToDiary = useCallback(
    (placeId: string, googlePlaceId?: string) => {
      setDiaryPlace({ placeId, googlePlaceId });
    },
    [],
  );

  const displayName = session?.user.displayName ?? "Usuario";
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
            <View
              style={[styles.headerBar, { paddingTop: insets.top + 12 }]}
            >
              <View style={styles.headerRow}>
                <View style={styles.headerIdentity}>
                  <Pressable
                    accessibilityLabel="Ir al perfil"
                    accessibilityRole="button"
                    hitSlop={6}
                    onPress={() => router.push("/profile")}
                  >
                    <AvatarBadge name={displayName} size={48} />
                  </Pressable>
                  <View style={styles.headerTitles}>
                    <Text numberOfLines={1} style={styles.userName}>
                      {displayName}
                    </Text>
                    {session?.accessToken ? (
                      <Pressable
                        accessibilityLabel="Cambiar ciudad"
                        accessibilityRole="button"
                        hitSlop={{ top: 4, bottom: 4, left: 0, right: 0 }}
                        onPress={openCityPicker}
                        style={styles.cityPressable}
                      >
                        <Text
                          numberOfLines={2}
                          style={[
                            styles.city,
                            !city ? styles.cityPlaceholder : null,
                          ]}
                        >
                          {city || "Tocá para elegir tu ciudad"}
                        </Text>
                      </Pressable>
                    ) : city ? (
                      <Text numberOfLines={2} style={styles.city}>
                        {city}
                      </Text>
                    ) : null}
                  </View>
                </View>
                {session?.accessToken ? (
                  <Pressable
                    accessibilityLabel="Notificaciones"
                    accessibilityRole="button"
                    hitSlop={12}
                    onPress={() => router.push("/notifications")}
                    style={styles.headerBell}
                  >
                    <Ionicons
                      color={fecaTheme.colors.primary}
                      name="notifications-outline"
                      size={24}
                    />
                  </Pressable>
                ) : null}
              </View>
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
                <View style={styles.feedHeading}>
                  <Text style={styles.feedSectionTitle}>De quienes seguís</Text>
                  <Text style={styles.feedSectionSubtitle}>
                    Visitas y reseñas de quienes te importan
                  </Text>
                </View>
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

                  <View style={styles.popularHeader}>
                    <Text style={styles.popularEyebrow}>
                      Confianza en {city.trim() ? city : "tu ciudad"}
                    </Text>
                    <Text style={styles.popularTitle}>
                      Ideas mientras crece tu red
                    </Text>
                    <Text style={styles.popularSubtitle}>
                      Cada tarjeta dice por qué la estás viendo: red, cercanía o
                      contexto.
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
          <VisitCard
            item={item}
            mode="feed"
            onAddToDiary={handleAddToDiary}
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
      <AddToDiarySheet
        googlePlaceId={diaryPlace?.googlePlaceId}
        onClose={() => setDiaryPlace(null)}
        placeId={diaryPlace?.placeId ?? null}
        visible={diaryPlace !== null}
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
    marginBottom: fecaTheme.spacing.lg,
    marginHorizontal: -fecaTheme.spacing.lg,
  },
  sliderSection: {
    paddingHorizontal: fecaTheme.spacing.lg,
    paddingTop: fecaTheme.spacing.md,
  },
  feedIntro: {
    gap: fecaTheme.spacing.lg,
    paddingBottom: fecaTheme.spacing.sm,
    paddingHorizontal: fecaTheme.spacing.lg,
    paddingTop: fecaTheme.spacing.xs,
  },
  feedHeading: {
    gap: fecaTheme.spacing.xxs,
  },
  feedSectionTitle: {
    ...fecaTheme.typography.headline,
    color: fecaTheme.colors.onSurface,
    fontSize: 22,
    lineHeight: 28,
  },
  feedSectionSubtitle: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.muted,
    lineHeight: 18,
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
    marginBottom: fecaTheme.spacing.sm,
  },
  popularEyebrow: {
    ...fecaTheme.typography.label,
    color: fecaTheme.colors.primary,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  popularTitle: {
    ...fecaTheme.typography.title,
    color: fecaTheme.colors.onSurface,
  },
  popularSubtitle: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.muted,
    lineHeight: 18,
    marginTop: fecaTheme.spacing.xxs,
  },
  headerBar: {
    paddingBottom: fecaTheme.spacing.md,
    paddingHorizontal: fecaTheme.spacing.lg,
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  headerIdentity: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: fecaTheme.spacing.md,
    marginRight: fecaTheme.spacing.sm,
    minWidth: 0,
  },
  headerTitles: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  headerBell: {
    alignItems: "center",
    justifyContent: "center",
  },
  userName: {
    ...fecaTheme.typography.bodyStrong,
    color: fecaTheme.colors.primary,
    fontSize: 17,
    lineHeight: 22,
  },
  cityPressable: {
    alignSelf: "flex-start",
  },
  city: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.primary,
    fontSize: 12,
    lineHeight: 16,
    opacity: 0.78,
  },
  cityPlaceholder: {
    fontStyle: "italic",
    opacity: 0.65,
  },
  separator: {
    height: fecaTheme.spacing.lg,
  },
  centered: {
    alignItems: "center",
    paddingVertical: fecaTheme.spacing.xxl,
  },
});
