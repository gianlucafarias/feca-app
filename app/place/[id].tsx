import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { AddToDiarySheet } from "@/components/ui/add-to-diary-sheet";
import { SaveToListSheet } from "@/components/ui/save-to-list-sheet";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { PageBackground } from "@/components/ui/page-background";
import { fetchPlaceDetail, resolveGooglePlace } from "@/lib/api/places";
import { fetchPlaceSaved } from "@/lib/api/saved";
import { formatRelativeVisitTime } from "@/lib/format";
import { useAuth } from "@/providers/auth-provider";
import { fecaTheme, hexToRgba } from "@/theme/feca";
import type {
  FecaPlaceReview,
  GoogleReview,
  PlaceDetail,
} from "@/types/places";

function GoogleReviewCard({ review }: { review: GoogleReview }) {
  return (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <View style={styles.reviewAvatar}>
          <Text style={styles.reviewAvatarText}>
            {review.authorName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.reviewHeaderText}>
          <Text numberOfLines={1} style={styles.reviewAuthor}>
            {review.authorName}
          </Text>
          <Text style={styles.reviewTime}>{review.relativeTime}</Text>
        </View>
        <View style={styles.reviewRatingBadge}>
          <Ionicons
            color={fecaTheme.colors.secondary}
            name="star"
            size={12}
          />
          <Text style={styles.reviewRatingValue}>{review.rating}</Text>
        </View>
      </View>
      {review.text ? (
        <Text numberOfLines={4} style={styles.reviewText}>
          {review.text}
        </Text>
      ) : null}
    </View>
  );
}

function FecaReviewCard({ review }: { review: FecaPlaceReview }) {
  const when =
    review.relativeTime ?? formatRelativeVisitTime(review.visitedAt);
  return (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <View style={styles.reviewAvatar}>
          <Text style={styles.reviewAvatarText}>
            {review.userDisplayName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.reviewHeaderText}>
          <Text numberOfLines={1} style={styles.reviewAuthor}>
            {review.userDisplayName}
          </Text>
          <Text style={styles.reviewTime}>{when}</Text>
        </View>
        <View style={styles.reviewRatingBadge}>
          <Ionicons
            color={fecaTheme.colors.secondary}
            name="star"
            size={12}
          />
          <Text style={styles.reviewRatingValue}>{review.rating}</Text>
        </View>
      </View>
      {review.note ? (
        <Text numberOfLines={5} style={styles.reviewText}>
          {review.note}
        </Text>
      ) : null}
    </View>
  );
}

export default function PlaceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const accessToken = session?.accessToken;

  const [place, setPlace] = useState<PlaceDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolvedPlaceId, setResolvedPlaceId] = useState<string | null>(null);
  const [apiSaved, setApiSaved] = useState<boolean | null>(null);
  const [diaryOpen, setDiaryOpen] = useState(false);
  const [saveSheetOpen, setSaveSheetOpen] = useState(false);
  const [googleReviewsExpanded, setGoogleReviewsExpanded] = useState(false);

  useEffect(() => {
    setGoogleReviewsExpanded(false);
  }, [id]);

  const loadPlace = useCallback(async () => {
    if (!id || !accessToken) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const detail = await fetchPlaceDetail(id, accessToken);
      setPlace(detail);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo cargar el lugar",
      );
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, id]);

  useFocusEffect(
    useCallback(() => {
      void loadPlace();
    }, [loadPlace]),
  );

  useEffect(() => {
    if (!place?.googlePlaceId || !accessToken) {
      setResolvedPlaceId(null);
      return;
    }
    let cancelled = false;
    void resolveGooglePlace(accessToken, place.googlePlaceId)
      .then((p) => {
        if (!cancelled) setResolvedPlaceId(p.id);
      })
      .catch(() => {
        if (!cancelled) setResolvedPlaceId(null);
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken, place?.googlePlaceId]);

  useEffect(() => {
    if (!place?.googlePlaceId || !accessToken) {
      setApiSaved(null);
      return;
    }
    let cancelled = false;
    void fetchPlaceSaved(place.googlePlaceId, accessToken)
      .then((v) => {
        if (!cancelled) setApiSaved(v);
      })
      .catch(() => {
        if (!cancelled) setApiSaved(null);
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken, place?.googlePlaceId]);

  const saved = apiSaved ?? false;

  const openSaveSheet = useCallback(() => {
    if (!place?.googlePlaceId) {
      Alert.alert(
        "Guardar",
        "Este lugar no tiene referencia de Google para sincronizar tu lista.",
      );
      return;
    }
    setSaveSheetOpen(true);
  }, [place?.googlePlaceId]);

  const refreshSavedFlag = useCallback(() => {
    if (!place?.googlePlaceId || !accessToken) {
      return;
    }
    void fetchPlaceSaved(place.googlePlaceId, accessToken)
      .then(setApiSaved)
      .catch(() => {});
  }, [accessToken, place?.googlePlaceId]);

  if (!accessToken) {
    return <Redirect href="/(onboarding)/welcome" />;
  }

  if (isLoading) {
    return (
      <PageBackground>
        <View style={styles.centered}>
          <ActivityIndicator color={fecaTheme.colors.primary} size="large" />
        </View>
      </PageBackground>
    );
  }

  if (error || !place) {
    return (
      <PageBackground>
        <View style={styles.notFound}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons
              color={fecaTheme.colors.onSurface}
              name="chevron-back"
              size={20}
            />
          </Pressable>
          <EmptyState
            description={error ?? "Este lugar no existe o fue eliminado."}
            icon="alert-circle-outline"
            title="Lugar no encontrado"
          />
        </View>
      </PageBackground>
    );
  }

  const heroPhoto = place.photos?.[0];
  const galleryPhotos = place.photos?.slice(1) ?? [];
  const social = place.social;

  return (
    <PageBackground>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.heroWrap}>
          {heroPhoto ? (
            <Image
              contentFit="cover"
              source={{ uri: heroPhoto }}
              style={styles.heroImage}
            />
          ) : (
            <View style={[styles.heroImage, styles.heroFallback]}>
              <Ionicons
                color={fecaTheme.colors.muted}
                name="cafe-outline"
                size={48}
              />
            </View>
          )}
          <LinearGradient
            colors={[
              fecaTheme.colors.scrimMedium,
              "transparent",
              fecaTheme.colors.background,
            ]}
            locations={[0, 0.5, 1]}
            style={styles.heroGradient}
          />
          <Pressable onPress={() => router.back()} style={styles.heroBack}>
            <Ionicons color={fecaTheme.colors.onPrimary} name="chevron-back" size={22} />
          </Pressable>
        </View>

        {/* Info */}
        <View style={styles.info}>
          <Text style={styles.placeName}>{place.name}</Text>
          <Text style={styles.placeMeta}>{place.address}</Text>
          {place.editorialSummary ? (
            <Text style={styles.summary}>{place.editorialSummary}</Text>
          ) : null}
        </View>

        <View style={styles.actionsRow}>
          <Pressable
            onPress={openSaveSheet}
            style={[styles.actionBtn, saved ? styles.actionBtnActive : null]}
          >
            <Ionicons
              color={
                saved ? fecaTheme.colors.primary : fecaTheme.colors.onSurface
              }
              name={saved ? "bookmark" : "bookmark-outline"}
              size={20}
            />
            <Text style={styles.actionBtnLabel}>
              {saved ? "Guardado" : "Guardar"}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setDiaryOpen(true)}
            style={styles.actionBtn}
          >
            <Ionicons
              color={fecaTheme.colors.onSurface}
              name="journal-outline"
              size={20}
            />
            <Text style={styles.actionBtnLabel}>A la guía</Text>
          </Pressable>
        </View>

        {/* Stats */}
        <View style={styles.statsBar}>
          <View style={styles.stat}>
            <View style={styles.statRow}>
              <Ionicons
                color={fecaTheme.colors.secondary}
                name="star"
                size={14}
              />
              <Text style={styles.statValue}>
                {place.rating?.toFixed(1) ?? "—"}
              </Text>
            </View>
            <Text style={styles.statLabel}>rating</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>
              {place.userRatingCount ?? 0}
            </Text>
            <Text style={styles.statLabel}>reseñas Google</Text>
          </View>
          <View style={styles.stat}>
            <Text
              style={[
                styles.statValue,
                {
                  color: place.openNow
                    ? fecaTheme.colors.primary
                    : fecaTheme.colors.secondary,
                },
              ]}
            >
              {place.openNow == null ? "—" : place.openNow ? "Sí" : "No"}
            </Text>
            <Text style={styles.statLabel}>abierto</Text>
          </View>
        </View>

        {social ? (
          <View style={styles.socialWrap}>
            <View style={styles.socialSection}>
              <Text style={styles.socialTitle}>Quién de tu red</Text>
              <View style={styles.followerRow}>
                {social.followersVisited.map((u) => (
                  <View key={u.userId} style={styles.followerChip}>
                    <Text style={styles.followerName}>{u.displayName}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.socialSection}>
              <Text style={styles.socialTitle}>Tags comunitarios</Text>
              <View style={styles.tagRow}>
                {social.communityTags.map((tag) => (
                  <Chip
                    key={tag}
                    label={tag}
                    onPress={() => {}}
                    selected
                  />
                ))}
              </View>
            </View>

            <View style={styles.socialSection}>
              <Text style={styles.socialTitle}>Mejores momentos</Text>
              {social.bestMoments.map((line) => (
                <Text key={line} style={styles.momentLine}>
                  · {line}
                </Text>
              ))}
            </View>

            <View style={styles.socialSection}>
              <Text style={styles.socialTitle}>Fotos de la comunidad</Text>
              <FlatList
                contentContainerStyle={styles.userPhotoList}
                data={social.userPhotoUris}
                horizontal
                keyExtractor={(uri) => uri}
                renderItem={({ item }) => (
                  <Image
                    contentFit="cover"
                    source={{ uri: item }}
                    style={styles.userPhoto}
                  />
                )}
                showsHorizontalScrollIndicator={false}
              />
            </View>

            <View style={styles.socialSection}>
              <Text style={styles.socialTitle}>En guías</Text>
              {social.diaryAppearances.map((d) => (
                <Pressable
                  key={d.diaryId}
                  onPress={() =>
                    router.push(`/diary/${encodeURIComponent(d.diaryId)}`)
                  }
                  style={({ pressed }) => [
                    styles.diaryAppearRow,
                    pressed && styles.diaryAppearRowPressed,
                  ]}
                >
                  <Ionicons
                    color={fecaTheme.colors.primary}
                    name="book-outline"
                    size={18}
                  />
                  <Text style={styles.diaryAppearName}>{d.name}</Text>
                  <Ionicons
                    color={fecaTheme.colors.muted}
                    name="chevron-forward"
                    size={18}
                  />
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        {/* Reseñas: solo comunidad feca */}
        <View style={styles.reviewsSection}>
          <View style={styles.reviewsHeader}>
            <Text style={styles.sectionTitle}>Reseñas</Text>
            {place.fecaReviews && place.fecaReviews.length > 0 ? (
              <Text style={styles.reviewsCount}>
                {place.fecaReviews.length}
              </Text>
            ) : null}
          </View>
          {place.fecaReviews && place.fecaReviews.length > 0 ? (
            <View style={styles.reviewsList}>
              {place.fecaReviews.map((review) => (
                <FecaReviewCard key={review.id} review={review} />
              ))}
            </View>
          ) : (
            <Text style={styles.reviewsEmpty}>
              Todavía no hay reseñas de la comunidad en este lugar. Sé el
              primero en registrar una visita.
            </Text>
          )}
        </View>

        {/* Gallery */}
        {galleryPhotos.length > 0 ? (
          <View style={styles.gallerySection}>
            <Text style={styles.sectionTitle}>Fotos</Text>
            <FlatList
              contentContainerStyle={styles.galleryList}
              data={galleryPhotos}
              horizontal
              keyExtractor={(_, i) => String(i)}
              renderItem={({ item }) => (
                <Image
                  contentFit="cover"
                  source={{ uri: item }}
                  style={styles.galleryImage}
                />
              )}
              showsHorizontalScrollIndicator={false}
            />
          </View>
        ) : null}

        {/* Opening hours */}
        {place.openingHours && place.openingHours.length > 0 ? (
          <View style={styles.hoursSection}>
            <Text style={styles.sectionTitle}>Horarios</Text>
            <View style={styles.hoursList}>
              {place.openingHours.map((line, i) => (
                <Text key={i} style={styles.hoursLine}>
                  {line}
                </Text>
              ))}
            </View>
          </View>
        ) : null}

        {/* Google: solo se muestran tras tocar "Ver reseñas de Google" */}
        {place.reviews && place.reviews.length > 0 ? (
          <View style={styles.googleReviewsSection}>
            <Pressable
              accessibilityHint="Muestra u oculta las opiniones de Google Maps"
              accessibilityRole="button"
              onPress={() =>
                setGoogleReviewsExpanded((expanded) => !expanded)
              }
              style={({ pressed }) => [
                styles.googleReviewsToggle,
                pressed && styles.googleReviewsTogglePressed,
              ]}
            >
              <View style={styles.googleReviewsToggleLeft}>
                <Ionicons
                  color={fecaTheme.colors.muted}
                  name="logo-google"
                  size={18}
                />
                <View style={styles.googleReviewsToggleText}>
                  <Text style={styles.googleReviewsToggleTitle}>
                    {googleReviewsExpanded
                      ? "Ocultar reseñas de Google"
                      : "Ver reseñas de Google"}
                  </Text>
                  <Text style={styles.googleReviewsToggleMeta}>
                    {place.reviews.length}{" "}
                    {place.reviews.length === 1 ? "opinión" : "opiniones"} · no
                    son de feca
                  </Text>
                </View>
              </View>
              <Ionicons
                color={fecaTheme.colors.muted}
                name={googleReviewsExpanded ? "chevron-up" : "chevron-forward"}
                size={20}
              />
            </Pressable>
            {googleReviewsExpanded ? (
              <>
                <Text style={styles.googleReviewsHint}>
                  Contenido de Google Maps; la comunidad feca está arriba en
                  “Reseñas”.
                </Text>
                <View style={styles.googleReviewsList}>
                  {place.reviews.map((review, i) => (
                    <GoogleReviewCard key={i} review={review} />
                  ))}
                </View>
              </>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      <AddToDiarySheet
        googlePlaceId={place.googlePlaceId}
        onClose={() => setDiaryOpen(false)}
        placeId={resolvedPlaceId}
        visible={diaryOpen}
      />

      <SaveToListSheet
        accessToken={accessToken}
        onApplied={refreshSavedFlag}
        onClose={() => setSaveSheetOpen(false)}
        target={
          place?.googlePlaceId
            ? {
                type: "place",
                googlePlaceId: place.googlePlaceId,
                name: place.name,
                photoUrl: place.photoUrl ?? null,
              }
            : null
        }
        visible={saveSheetOpen}
      />

      <View style={styles.fabContainer}>
        <Pressable
          onPress={() =>
            router.push({
              pathname: "/visit/new",
              params: {
                googlePlaceId: place.googlePlaceId,
                placeName: place.name,
                placeAddress: place.address,
              },
            })
          }
          style={styles.fab}
        >
          <Ionicons color={fecaTheme.colors.onPrimary} name="add" size={22} />
          <Text style={styles.fabLabel}>Registrar visita</Text>
        </Pressable>
      </View>
    </PageBackground>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: 80,
  },
  centered: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  notFound: {
    flex: 1,
    gap: fecaTheme.spacing.xl,
    justifyContent: "center",
    paddingHorizontal: fecaTheme.spacing.xl,
    paddingTop: fecaTheme.spacing.xl,
  },
  backButton: {
    alignItems: "center",
    backgroundColor: fecaTheme.surfaces.high,
    borderRadius: fecaTheme.radii.pill,
    height: 40,
    justifyContent: "center",
    width: 40,
  },

  heroWrap: {
    height: 280,
    position: "relative",
  },
  heroImage: {
    height: "100%",
    width: "100%",
  },
  heroFallback: {
    alignItems: "center",
    backgroundColor: fecaTheme.surfaces.high,
    justifyContent: "center",
  },
  heroGradient: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  heroBack: {
    alignItems: "center",
    backgroundColor: fecaTheme.colors.scrimLight,
    borderRadius: fecaTheme.radii.pill,
    height: 40,
    justifyContent: "center",
    left: fecaTheme.spacing.lg,
    position: "absolute",
    top: fecaTheme.spacing.xxl,
    width: 40,
  },

  info: {
    gap: fecaTheme.spacing.xs,
    paddingHorizontal: fecaTheme.spacing.xl,
    paddingTop: fecaTheme.spacing.lg,
  },
  placeName: {
    ...fecaTheme.typography.headline,
    color: fecaTheme.colors.onSurface,
  },
  placeMeta: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.muted,
  },
  summary: {
    ...fecaTheme.typography.body,
    color: fecaTheme.colors.onSurface,
    fontSize: 14,
    lineHeight: 20,
    marginTop: fecaTheme.spacing.xs,
  },

  actionsRow: {
    flexDirection: "row",
    gap: fecaTheme.spacing.sm,
    marginTop: fecaTheme.spacing.lg,
    paddingHorizontal: fecaTheme.spacing.xl,
  },
  actionBtn: {
    alignItems: "center",
    backgroundColor: fecaTheme.surfaces.container,
    borderRadius: fecaTheme.radii.md,
    flex: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    paddingHorizontal: fecaTheme.spacing.md,
    paddingVertical: fecaTheme.spacing.sm,
  },
  actionBtnActive: {
    backgroundColor: fecaTheme.colors.secondaryFixed,
  },
  actionBtnLabel: {
    ...fecaTheme.typography.bodyStrong,
    color: fecaTheme.colors.onSurface,
    fontSize: 14,
  },

  statsBar: {
    alignItems: "center",
    backgroundColor: fecaTheme.surfaces.low,
    borderRadius: fecaTheme.radii.lg,
    flexDirection: "row",
    gap: fecaTheme.spacing.md,
    marginHorizontal: fecaTheme.spacing.xl,
    marginTop: fecaTheme.spacing.xl,
    paddingHorizontal: fecaTheme.spacing.lg,
    paddingVertical: fecaTheme.spacing.lg,
  },
  stat: {
    alignItems: "center",
    flex: 1,
    gap: 2,
  },
  statRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
  },
  statValue: {
    ...fecaTheme.typography.numeric,
    color: fecaTheme.colors.onSurface,
    fontSize: 20,
    lineHeight: 24,
  },
  statLabel: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.muted,
    fontSize: 12,
  },

  socialWrap: {
    gap: fecaTheme.spacing.xl,
    marginTop: fecaTheme.spacing.xl,
    paddingHorizontal: fecaTheme.spacing.xl,
  },
  socialSection: {
    gap: fecaTheme.spacing.sm,
  },
  socialTitle: {
    ...fecaTheme.typography.bodyStrong,
    color: fecaTheme.colors.onSurface,
    fontSize: 17,
  },
  followerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: fecaTheme.spacing.sm,
  },
  followerChip: {
    backgroundColor: fecaTheme.surfaces.high,
    borderRadius: fecaTheme.radii.pill,
    paddingHorizontal: fecaTheme.spacing.md,
    paddingVertical: fecaTheme.spacing.xs,
  },
  followerName: {
    ...fecaTheme.typography.bodyStrong,
    color: fecaTheme.colors.onSurface,
    fontSize: 14,
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: fecaTheme.spacing.sm,
  },
  momentLine: {
    ...fecaTheme.typography.body,
    color: fecaTheme.colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  userPhotoList: {
    gap: fecaTheme.spacing.sm,
  },
  userPhoto: {
    borderRadius: fecaTheme.radii.md,
    height: 96,
    width: 96,
  },
  diaryAppearRow: {
    alignItems: "center",
    backgroundColor: fecaTheme.surfaces.high,
    borderRadius: fecaTheme.radii.sm,
    flexDirection: "row",
    gap: fecaTheme.spacing.sm,
    paddingHorizontal: fecaTheme.spacing.md,
    paddingVertical: fecaTheme.spacing.sm,
  },
  diaryAppearRowPressed: {
    opacity: 0.9,
  },
  diaryAppearName: {
    ...fecaTheme.typography.bodyStrong,
    color: fecaTheme.colors.onSurface,
    flex: 1,
  },

  gallerySection: {
    gap: fecaTheme.spacing.md,
    marginTop: fecaTheme.spacing.xxl,
  },
  galleryList: {
    gap: fecaTheme.spacing.sm,
    paddingHorizontal: fecaTheme.spacing.xl,
  },
  galleryImage: {
    borderRadius: fecaTheme.radii.md,
    height: 140,
    width: 200,
  },

  hoursSection: {
    gap: fecaTheme.spacing.md,
    marginTop: fecaTheme.spacing.xxl,
    paddingHorizontal: fecaTheme.spacing.xl,
  },
  hoursList: {
    backgroundColor: fecaTheme.surfaces.low,
    borderRadius: fecaTheme.radii.sm,
    gap: fecaTheme.spacing.xs,
    padding: fecaTheme.spacing.md,
  },
  hoursLine: {
    ...fecaTheme.typography.body,
    color: fecaTheme.colors.onSurface,
    fontSize: 14,
    lineHeight: 20,
  },

  sectionTitle: {
    ...fecaTheme.typography.bodyStrong,
    color: fecaTheme.colors.onSurface,
    paddingHorizontal: fecaTheme.spacing.xl,
  },

  reviewsSection: {
    gap: fecaTheme.spacing.lg,
    marginTop: fecaTheme.spacing.xxl,
  },
  reviewsHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: fecaTheme.spacing.sm,
    paddingHorizontal: fecaTheme.spacing.xl,
  },
  reviewsCount: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.muted,
  },
  reviewsEmpty: {
    ...fecaTheme.typography.body,
    color: fecaTheme.colors.muted,
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: fecaTheme.spacing.xl,
  },
  reviewsList: {
    gap: fecaTheme.spacing.sm,
    paddingHorizontal: fecaTheme.spacing.xl,
  },
  googleReviewsSection: {
    backgroundColor: fecaTheme.surfaces.low,
    gap: fecaTheme.spacing.md,
    marginTop: fecaTheme.spacing.xl,
    paddingBottom: fecaTheme.spacing.lg,
    paddingTop: fecaTheme.spacing.lg,
  },
  googleReviewsToggle: {
    alignItems: "center",
    backgroundColor: fecaTheme.surfaces.lowest,
    borderRadius: fecaTheme.radii.md,
    flexDirection: "row",
    gap: fecaTheme.spacing.sm,
    justifyContent: "space-between",
    marginHorizontal: fecaTheme.spacing.xl,
    paddingHorizontal: fecaTheme.spacing.md,
    paddingVertical: fecaTheme.spacing.md,
    ...fecaTheme.elevation.ambient,
  },
  googleReviewsTogglePressed: {
    opacity: 0.94,
  },
  googleReviewsToggleLeft: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: fecaTheme.spacing.sm,
  },
  googleReviewsToggleText: {
    flex: 1,
    gap: 2,
  },
  googleReviewsToggleTitle: {
    ...fecaTheme.typography.bodyStrong,
    color: fecaTheme.colors.onSurface,
    fontSize: 15,
  },
  googleReviewsToggleMeta: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.muted,
    fontSize: 12,
    lineHeight: 16,
  },
  googleReviewsHint: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.muted,
    fontSize: 11,
    lineHeight: 15,
    paddingHorizontal: fecaTheme.spacing.xl,
  },
  googleReviewsList: {
    gap: fecaTheme.spacing.sm,
    paddingHorizontal: fecaTheme.spacing.xl,
  },
  reviewCard: {
    backgroundColor: fecaTheme.surfaces.low,
    borderRadius: fecaTheme.radii.sm,
    gap: fecaTheme.spacing.sm,
    padding: fecaTheme.spacing.md,
  },
  reviewHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: fecaTheme.spacing.sm,
  },
  reviewAvatar: {
    alignItems: "center",
    backgroundColor: fecaTheme.colors.primaryContainer,
    borderRadius: 16,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  reviewAvatarText: {
    color: fecaTheme.colors.onPrimary,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 14,
  },
  reviewHeaderText: {
    flex: 1,
    gap: 1,
  },
  reviewAuthor: {
    ...fecaTheme.typography.bodyStrong,
    color: fecaTheme.colors.onSurface,
    fontSize: 14,
    lineHeight: 18,
  },
  reviewTime: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.muted,
    fontSize: 12,
    lineHeight: 16,
  },
  reviewRatingBadge: {
    alignItems: "center",
    backgroundColor: hexToRgba(fecaTheme.colors.secondary, 0.1),
    borderRadius: fecaTheme.radii.pill,
    flexDirection: "row",
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  reviewRatingValue: {
    ...fecaTheme.typography.numeric,
    color: fecaTheme.colors.secondary,
    fontSize: 13,
    lineHeight: 16,
  },
  reviewText: {
    ...fecaTheme.typography.body,
    color: fecaTheme.colors.onSurface,
    fontSize: 14,
    lineHeight: 20,
  },
  fabContainer: {
    bottom: 0,
    left: 0,
    paddingBottom: fecaTheme.spacing.xxl,
    paddingHorizontal: fecaTheme.spacing.xl,
    position: "absolute",
    right: 0,
  },
  fab: {
    alignItems: "center",
    backgroundColor: fecaTheme.colors.primary,
    borderRadius: fecaTheme.radii.pill,
    flexDirection: "row",
    gap: fecaTheme.spacing.sm,
    justifyContent: "center",
    paddingHorizontal: fecaTheme.spacing.xl,
    paddingVertical: fecaTheme.spacing.md,
    ...fecaTheme.elevation.ambient,
  },
  fabLabel: {
    color: fecaTheme.colors.onPrimary,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 16,
    lineHeight: 20,
  },
});
