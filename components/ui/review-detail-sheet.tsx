import { useCallback, useEffect, useRef, useState } from "react";

import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { AvatarBadge } from "@/components/ui/avatar-badge";
import { ShareableReviewCard } from "@/components/ui/shareable-review-card";
import { formatVisitDate } from "@/lib/format";
import {
  fetchPlaceSaved,
  savePlaceApi,
  unsavePlaceApi,
} from "@/lib/api/saved";
import { shareReviewImage } from "@/lib/share-review";
import { useAuth } from "@/providers/auth-provider";
import { fecaTheme } from "@/theme/feca";
import type { Visit } from "@/types/feca";

type ReviewDetailSheetProps = {
  visit: Visit | null;
  visible: boolean;
  showPlaceLink?: boolean;
  onClose: () => void;
};

export function ReviewDetailSheet({
  visit,
  visible,
  showPlaceLink = false,
  onClose,
}: ReviewDetailSheetProps) {
  const { session } = useAuth();
  const [liked, setLiked] = useState(false);
  const [apiSaved, setApiSaved] = useState(false);
  const shareCardRef = useRef<View>(null);

  useEffect(() => {
    if (!visit) {
      setApiSaved(false);
      return;
    }

    const gid = visit.place.googlePlaceId;
    if (!gid || !session?.accessToken) {
      setApiSaved(false);
      return;
    }

    let cancelled = false;
    void fetchPlaceSaved(gid, session.accessToken)
      .then((value) => {
        if (!cancelled) setApiSaved(value);
      })
      .catch(() => {
        if (!cancelled) setApiSaved(false);
      });

    return () => {
      cancelled = true;
    };
  }, [visit, session?.accessToken]);

  const handleToggleSaved = useCallback(() => {
    if (!visit?.place.googlePlaceId || !session?.accessToken) return;

    const next = !apiSaved;
    setApiSaved(next);
    void (next
      ? savePlaceApi(visit.place.googlePlaceId, session.accessToken)
      : unsavePlaceApi(visit.place.googlePlaceId, session.accessToken)
    ).catch(() => {
      setApiSaved(!next);
    });
  }, [apiSaved, session?.accessToken, visit]);

  if (!visit) return null;

  const placeRouteId = visit.place.googlePlaceId ?? visit.place.id;

  const handleShare = () => {
    shareReviewImage(shareCardRef);
  };

  return (
    <>
      <View pointerEvents="none" style={styles.offscreen}>
        <ShareableReviewCard ref={shareCardRef} visit={visit} />
      </View>

      <Modal
        animationType="slide"
        onRequestClose={onClose}
        transparent
        visible={visible}
      >
        <Pressable onPress={onClose} style={styles.overlay}>
          <Pressable style={styles.sheet}>
            <View style={styles.handle} />

            <ScrollView
              bounces={false}
              contentContainerStyle={styles.scroll}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.userRow}>
                <AvatarBadge
                  accent={visit.place.accent}
                  name={visit.user.displayName}
                  size={44}
                />
                <Pressable
                  onPress={() => {
                    onClose();
                    setTimeout(() => router.push(`/user/${visit.user.id}`), 150);
                  }}
                  style={styles.userInfo}
                >
                  <Text style={styles.userName}>{visit.user.displayName}</Text>
                  <Text style={styles.userDate}>{formatVisitDate(visit.visitedAt)}</Text>
                </Pressable>
                <Pressable
                  onPress={() => setLiked((value) => !value)}
                  style={styles.likeBtn}
                >
                  <Ionicons
                    color={liked ? fecaTheme.colors.secondary : fecaTheme.colors.outlineVariant}
                    name={liked ? "heart" : "heart-outline"}
                    size={22}
                  />
                </Pressable>
              </View>

              <View style={styles.ratingRow}>
                {Array.from({ length: 5 }, (_, i) => (
                  <Ionicons
                    key={i}
                    color={i < visit.rating ? fecaTheme.colors.secondary : fecaTheme.colors.outlineVariant}
                    name={i < visit.rating ? "star" : "star-outline"}
                    size={18}
                  />
                ))}
              </View>

              <View style={styles.placeChip}>
                <View style={[styles.placeDot, { backgroundColor: visit.place.accent }]} />
                <View style={styles.placeChipText}>
                  <Text style={styles.placeName}>{visit.place.name}</Text>
                  <Text style={styles.placeMeta}>{visit.place.neighborhood}</Text>
                </View>
              </View>

              {visit.note ? <Text style={styles.note}>{visit.note}</Text> : null}

              {visit.companions || visit.tags.length > 0 ? (
                <View style={styles.metaSection}>
                  {visit.companions ? (
                    <View style={styles.metaRow}>
                      <Ionicons color={fecaTheme.colors.muted} name="people-outline" size={14} />
                      <Text style={styles.metaText}>{visit.companions}</Text>
                    </View>
                  ) : null}
                  {visit.tags.length > 0 ? (
                    <View style={styles.tagsRow}>
                      {visit.tags.map((tag) => (
                        <View key={tag} style={styles.tag}>
                          <Text style={styles.tagText}>{tag}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </View>
              ) : null}
            </ScrollView>

            <View style={styles.footer}>
              <Pressable
                disabled={!visit.place.googlePlaceId || !session?.accessToken}
                onPress={handleToggleSaved}
                style={[styles.footerBtn, apiSaved && styles.footerBtnActive]}
              >
                <Ionicons
                  color={apiSaved ? fecaTheme.colors.primary : fecaTheme.colors.onSurface}
                  name={apiSaved ? "bookmark" : "bookmark-outline"}
                  size={17}
                />
              </Pressable>

              <Pressable onPress={handleShare} style={styles.footerBtn}>
                <Ionicons
                  color={fecaTheme.colors.onSurface}
                  name="share-outline"
                  size={17}
                />
              </Pressable>

              {showPlaceLink ? (
                <Pressable
                  onPress={() => {
                    onClose();
                    setTimeout(() => router.push(`/place/${placeRouteId}`), 150);
                  }}
                  style={styles.footerPrimary}
                >
                  <Ionicons color={fecaTheme.colors.onPrimary} name="storefront-outline" size={17} />
                  <Text style={styles.footerPrimaryLabel}>Ver lugar</Text>
                </Pressable>
              ) : null}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: "rgba(27, 28, 26, 0.45)",
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: fecaTheme.surfaces.lowest,
    borderTopLeftRadius: fecaTheme.radii.xl,
    borderTopRightRadius: fecaTheme.radii.xl,
    maxHeight: "80%",
    ...fecaTheme.elevation.floating,
  },
  handle: {
    alignSelf: "center",
    backgroundColor: fecaTheme.colors.outlineVariant,
    borderRadius: 3,
    height: 4,
    marginBottom: fecaTheme.spacing.md,
    marginTop: fecaTheme.spacing.sm,
    width: 36,
  },
  scroll: {
    gap: fecaTheme.spacing.lg,
    paddingBottom: fecaTheme.spacing.md,
    paddingHorizontal: fecaTheme.spacing.xl,
  },
  userRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: fecaTheme.spacing.sm,
  },
  userInfo: {
    flex: 1,
    gap: 2,
  },
  userName: {
    ...fecaTheme.typography.bodyStrong,
    color: fecaTheme.colors.onSurface,
    fontSize: 16,
  },
  userDate: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.muted,
  },
  likeBtn: {
    alignItems: "center",
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  ratingRow: {
    flexDirection: "row",
    gap: 3,
  },
  placeChip: {
    alignItems: "center",
    backgroundColor: fecaTheme.surfaces.low,
    borderRadius: fecaTheme.radii.md,
    flexDirection: "row",
    gap: fecaTheme.spacing.sm,
    padding: fecaTheme.spacing.md,
  },
  placeDot: {
    borderRadius: 10,
    height: 20,
    width: 20,
  },
  placeChipText: {
    flex: 1,
    gap: 2,
  },
  placeName: {
    ...fecaTheme.typography.bodyStrong,
    color: fecaTheme.colors.onSurface,
    fontSize: 15,
  },
  placeMeta: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.muted,
  },
  note: {
    ...fecaTheme.typography.body,
    color: fecaTheme.colors.onSurface,
    fontSize: 15,
    lineHeight: 23,
  },
  metaSection: {
    gap: fecaTheme.spacing.sm,
  },
  metaRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  metaText: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.muted,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: fecaTheme.spacing.xs,
  },
  tag: {
    backgroundColor: fecaTheme.surfaces.low,
    borderRadius: fecaTheme.radii.pill,
    paddingHorizontal: fecaTheme.spacing.sm,
    paddingVertical: 4,
  },
  tagText: {
    ...fecaTheme.typography.label,
    color: fecaTheme.colors.muted,
    fontSize: 12,
  },
  footer: {
    borderTopColor: fecaTheme.colors.outlineVariant,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: fecaTheme.spacing.sm,
    paddingBottom: 32,
    paddingHorizontal: fecaTheme.spacing.xl,
    paddingTop: fecaTheme.spacing.md,
  },
  footerBtn: {
    alignItems: "center",
    borderColor: fecaTheme.colors.outlineVariant,
    borderRadius: fecaTheme.radii.md,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    paddingVertical: fecaTheme.spacing.sm,
  },
  footerBtnActive: {
    backgroundColor: "rgba(81, 100, 67, 0.08)",
    borderColor: fecaTheme.colors.primary,
  },
  footerPrimary: {
    alignItems: "center",
    backgroundColor: fecaTheme.colors.primary,
    borderRadius: fecaTheme.radii.md,
    flex: 1,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    paddingVertical: fecaTheme.spacing.sm,
  },
  footerPrimaryLabel: {
    ...fecaTheme.typography.bodyStrong,
    color: fecaTheme.colors.onPrimary,
    fontSize: 14,
  },
  offscreen: {
    left: -9999,
    position: "absolute",
    top: -9999,
  },
});
