import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AvatarBadge } from "@/components/ui/avatar-badge";
import { SaveToListSheet } from "@/components/ui/save-to-list-sheet";
import { formatVisitDate } from "@/lib/format";
import { fetchPlaceSaved } from "@/lib/api/saved";
import { getVisitCardImageUri } from "@/lib/visit-image";
import { useAuth } from "@/providers/auth-provider";
import { fecaTheme, hexToRgba } from "@/theme/feca";
import type { FeedItem, Visit } from "@/types/feca";

type VisitCardProps =
  | {
      item: FeedItem;
      mode: "feed";
      reasonLine?: string;
      onAddToDiary?: (placeId: string, googlePlaceId?: string) => void;
      onPress?: () => void;
    }
  | {
      item: Visit;
      mode: "profile";
      onAddToDiary?: (placeId: string, googlePlaceId?: string) => void;
      onPress?: () => void;
    };

function userHandle(visit: Visit): string {
  const u = visit.user.username?.trim();
  if (u) return u.startsWith("@") ? u.slice(1) : u;
  return visit.user.displayName
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9._]/g, "");
}

export function VisitCard(props: VisitCardProps) {
  const visit = props.mode === "feed" ? props.item.visit : props.item;
  const trustLine =
    props.mode === "feed"
      ? (props.reasonLine ??
        props.item.reasonLine ??
        (props.item.summary.trim() || undefined))
      : undefined;
  const { session } = useAuth();

  const [apiSaved, setApiSaved] = useState(false);
  const [saveSheetOpen, setSaveSheetOpen] = useState(false);
  const googlePlaceId = visit.place.googlePlaceId;
  const accessToken = session?.accessToken;
  const currentUserId = session?.user.id;

  useEffect(() => {
    if (!googlePlaceId || !accessToken) {
      setApiSaved(false);
      return;
    }

    let cancelled = false;
    void fetchPlaceSaved(googlePlaceId, accessToken)
      .then((value) => {
        if (!cancelled) setApiSaved(value);
      })
      .catch(() => {
        if (!cancelled) setApiSaved(false);
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, googlePlaceId]);

  const goUserProfile = useCallback(() => {
    if (visit.user.id !== currentUserId && visit.user.id !== "me") {
      router.push(`/user/${visit.user.id}`);
    }
  }, [currentUserId, visit.user.id]);

  const handle = userHandle(visit);
  const visitDateLabel = formatVisitDate(visit.visitedAt);
  const isSelf = visit.user.id === currentUserId || visit.user.id === "me";
  const openDetail = props.onPress;

  const imageHero = (
    <View style={styles.imageSection}>
      <Image
        contentFit="cover"
        source={{ uri: getVisitCardImageUri(visit) }}
        style={styles.image}
      />
      <LinearGradient
        colors={[
          hexToRgba(fecaTheme.colors.onSurface, 0),
          hexToRgba(fecaTheme.colors.onSurface, 0.38),
          hexToRgba(fecaTheme.colors.onSurface, 0.85),
        ]}
        locations={[0, 0.4, 1]}
        style={styles.imageGradient}
      />
      <View style={styles.imageOverlay} pointerEvents="none">
        <Text style={styles.overlayHandle}>@{isSelf ? "vos" : handle}</Text>
        <Text style={styles.overlayPlaceName}>{visit.place.name}</Text>
        <View style={styles.overlayMetaRow}>
          <View style={styles.starsRow}>
            {Array.from({ length: 5 }, (_, i) => (
              <Ionicons
                key={i}
                color={
                  i < visit.rating
                    ? fecaTheme.colors.secondary
                    : hexToRgba(fecaTheme.colors.onPrimary, 0.28)
                }
                name={i < visit.rating ? "star" : "star-outline"}
                size={20}
              />
            ))}
          </View>
          <Text style={styles.overlayNeighborhood}>
            {visit.place.neighborhood}
          </Text>
        </View>
      </View>
      <View style={styles.imageDateFooter} pointerEvents="none">
        <Text style={styles.imageDateFooterText}>{visitDateLabel}</Text>
      </View>
    </View>
  );

  return (
    <>
    <View style={styles.outer}>
      <View style={styles.card}>
        <View style={styles.header}>
          <Pressable
            disabled={isSelf}
            onPress={goUserProfile}
            style={styles.avatarPress}
          >
            <AvatarBadge
              accent={visit.place.accent}
              name={visit.user.displayName}
              size={40}
            />
          </Pressable>
          <Pressable
            disabled={isSelf}
            onPress={goUserProfile}
            style={styles.headerMeta}
          >
            <Text numberOfLines={1} style={styles.headerMetaText}>
              <Text style={styles.handle}>
                @{isSelf ? "vos" : handle}
              </Text>
            </Text>
          </Pressable>
          <View style={styles.headerActions}>
            <View accessible={false} style={styles.headerIconBtn}>
              <Ionicons
                color={fecaTheme.colors.secondarySoft}
                name="heart"
                size={22}
              />
            </View>
            <Pressable
              accessibilityLabel="Guardar en lista"
              disabled={!accessToken}
              hitSlop={8}
              onPress={() => setSaveSheetOpen(true)}
              style={styles.headerIconBtn}
            >
              <Ionicons
                color={apiSaved ? fecaTheme.colors.primary : fecaTheme.colors.muted}
                name={apiSaved ? "bookmark" : "bookmark-outline"}
                size={22}
              />
            </Pressable>
          </View>
        </View>

        {trustLine ? (
          <View style={styles.trustLineWrap}>
            <Ionicons
              color={fecaTheme.colors.primary}
              name="sparkles-outline"
              size={14}
            />
            <Text numberOfLines={2} style={styles.trustLineText}>
              {trustLine}
            </Text>
          </View>
        ) : null}

        {openDetail ? (
          <Pressable
            accessibilityRole="button"
            onPress={openDetail}
            style={styles.imagePressable}
          >
            {imageHero}
          </Pressable>
        ) : (
          <View style={styles.imagePressable}>{imageHero}</View>
        )}

        {visit.note ? (
          openDetail ? (
            <Pressable onPress={openDetail}>
              <View style={styles.body}>
                <Text numberOfLines={6} style={styles.note}>
                  {visit.note}
                </Text>
              </View>
            </Pressable>
          ) : (
            <View style={styles.body}>
              <Text numberOfLines={6} style={styles.note}>
                {visit.note}
              </Text>
            </View>
          )
        ) : null}

        {props.onAddToDiary ? (
          <View style={styles.footerActions}>
            <Pressable
              onPress={() =>
                props.onAddToDiary?.(
                  visit.place.id,
                  visit.place.googlePlaceId,
                )
              }
              style={styles.footerActionBtn}
            >
              <Ionicons
                color={fecaTheme.colors.muted}
                name="journal-outline"
                size={18}
              />
              <Text style={styles.footerActionLabel}>Guía</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </View>
    <SaveToListSheet
      accessToken={accessToken}
      onClose={() => setSaveSheetOpen(false)}
      target={{ type: "visit", visit }}
      visible={saveSheetOpen}
    />
    </>
  );
}

const styles = StyleSheet.create({
  outer: {
    backgroundColor: fecaTheme.surfaces.lowest,
    borderRadius: fecaTheme.radii.lg,
    ...fecaTheme.elevation.ambient,
  },
  card: {
    borderRadius: fecaTheme.radii.lg,
    overflow: "hidden",
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: fecaTheme.spacing.sm,
    paddingBottom: fecaTheme.spacing.sm,
    paddingHorizontal: fecaTheme.spacing.md,
    paddingTop: fecaTheme.spacing.md,
  },
  avatarPress: {
    borderRadius: 999,
  },
  headerMeta: {
    flex: 1,
    minWidth: 0,
  },
  headerMetaText: {
    ...fecaTheme.typography.bodyStrong,
    color: fecaTheme.colors.onSurface,
    fontSize: 14,
    lineHeight: 20,
  },
  handle: {
    color: fecaTheme.colors.onSurface,
    fontWeight: "600",
  },
  headerActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
  },
  headerIconBtn: {
    alignItems: "center",
    height: 36,
    justifyContent: "center",
    width: 34,
  },
  trustLineWrap: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: fecaTheme.spacing.xs,
    paddingBottom: fecaTheme.spacing.sm,
    paddingHorizontal: fecaTheme.spacing.md,
  },
  trustLineText: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.primary,
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  imagePressable: {
    paddingHorizontal: fecaTheme.spacing.md,
  },
  imageSection: {
    borderRadius: fecaTheme.radii.md,
    height: 240,
    overflow: "hidden",
    position: "relative",
    width: "100%",
  },
  image: {
    ...StyleSheet.absoluteFillObject,
    height: "100%",
    width: "100%",
  },
  imageGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  imageOverlay: {
    bottom: 42,
    gap: 6,
    justifyContent: "flex-end",
    left: 0,
    paddingBottom: fecaTheme.spacing.sm,
    paddingHorizontal: fecaTheme.spacing.md,
    paddingTop: fecaTheme.spacing.lg,
    position: "absolute",
    right: 0,
    top: 0,
  },
  imageDateFooter: {
    alignItems: "center",
    backgroundColor: hexToRgba(fecaTheme.colors.onSurface, 0.97),
    borderBottomLeftRadius: fecaTheme.radii.md,
    borderBottomRightRadius: fecaTheme.radii.md,
    bottom: 0,
    height: 42,
    justifyContent: "center",
    left: 0,
    position: "absolute",
    right: 0,
  },
  imageDateFooterText: {
    ...fecaTheme.typography.meta,
    color: hexToRgba(fecaTheme.colors.paper, 0.92),
    fontSize: 13,
    letterSpacing: 0.3,
  },
  overlayHandle: {
    ...fecaTheme.typography.meta,
    color: hexToRgba(fecaTheme.colors.paper, 0.78),
    fontSize: 12,
    lineHeight: 16,
  },
  overlayPlaceName: {
    ...fecaTheme.typography.headline,
    color: fecaTheme.surfaces.lowest,
    fontSize: 24,
    lineHeight: 30,
    textShadowColor: hexToRgba(fecaTheme.colors.onSurface, 0.5),
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 10,
  },
  overlayMetaRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: fecaTheme.spacing.sm,
    marginTop: 2,
  },
  starsRow: {
    flexDirection: "row",
    gap: 2,
  },
  overlayNeighborhood: {
    ...fecaTheme.typography.bodyStrong,
    color: hexToRgba(fecaTheme.colors.paper, 0.95),
    fontSize: 14,
    lineHeight: 20,
    textShadowColor: hexToRgba(fecaTheme.colors.onSurface, 0.4),
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  body: {
    paddingBottom: fecaTheme.spacing.md,
    paddingHorizontal: fecaTheme.spacing.md,
    paddingTop: fecaTheme.spacing.md,
  },
  note: {
    ...fecaTheme.typography.body,
    color: fecaTheme.colors.onSurface,
    fontSize: 15,
    lineHeight: 22,
  },
  footerActions: {
    backgroundColor: fecaTheme.surfaces.low,
    flexDirection: "row",
    marginTop: fecaTheme.spacing.sm,
    paddingHorizontal: fecaTheme.spacing.md,
    paddingVertical: fecaTheme.spacing.sm,
  },
  footerActionBtn: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    paddingVertical: fecaTheme.spacing.xs,
  },
  footerActionLabel: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.muted,
    fontSize: 13,
  },
});
