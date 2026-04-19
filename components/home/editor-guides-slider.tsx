import { router } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { EditorialCarouselCard } from "@/components/home/editorial-carousel-card";
import { fecaTheme } from "@/theme/feca";
import type { ApiDiary } from "@/types/api";

const ec = fecaTheme.homeEditorialCarousel;
const CARD_GAP = fecaTheme.spacing.md;
const snapInterval = ec.cardWidth + CARD_GAP;

type EditorGuidesSliderProps = {
  title: string;
  diaries: ApiDiary[];
  isLoading: boolean;
  error: string | null;
  onRetry?: () => void;
};

function buildGuidePillText(diary: ApiDiary): string {
  const reason = diary.editorialReason?.trim();
  if (reason) return reason;
  const intro = diary.intro?.trim();
  if (intro) return intro;
  const desc = diary.description?.trim();
  if (desc) return desc;
  const n = diary.places?.length ?? 0;
  if (n > 0) {
    return `${n} ${n === 1 ? "parada" : "paradas"} para recorrer`;
  }
  return `Guía por ${diary.createdBy?.displayName?.trim() || "FECA"}`;
}

function GuideEditorialCard({ diary, index, isLast }: { diary: ApiDiary; index: number; isLast: boolean }) {
  const pillText = buildGuidePillText(diary);
  const stops = diary.places?.length ?? 0;
  const sealText = stops > 0 ? String(stops) : null;
  const cover = diary.coverImageUrl?.trim();
  const stopsLine =
    stops > 0 ? `${stops} ${stops === 1 ? "parada" : "paradas"}. ` : "";

  return (
    <View style={!isLast ? { marginRight: CARD_GAP } : undefined}>
      <EditorialCarouselCard
        accessibilityLabel={`${diary.name}. ${stopsLine}${pillText}`}
        captionText={diary.name}
        fallbackIcon="map-outline"
        imageUrl={cover || undefined}
        index={index}
        onPress={() => router.push(`/diary/${encodeURIComponent(diary.id)}`)}
        pillText={pillText}
        sealText={sealText}
      />
    </View>
  );
}

export function EditorGuidesSlider({
  title,
  diaries,
  isLoading,
  error,
  onRetry,
}: EditorGuidesSliderProps) {
  const loadingHeight = ec.imageHeight + 24;

  if (isLoading) {
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text ellipsizeMode="tail" numberOfLines={1} style={styles.sectionTitle}>
            {title}
          </Text>
        </View>
        <View style={[styles.loadingRow, { height: loadingHeight }]}>
          <ActivityIndicator color={fecaTheme.colors.primary} />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text ellipsizeMode="tail" numberOfLines={1} style={styles.sectionTitle}>
            {title}
          </Text>
        </View>
        <View style={styles.errorRow}>
          <Text style={styles.errorText}>{error}</Text>
          {onRetry ? (
            <Pressable accessibilityRole="button" onPress={onRetry} style={styles.retryBtn}>
              <Text style={styles.retryLabel}>Reintentar</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    );
  }

  if (diaries.length === 0) {
    return null;
  }

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text ellipsizeMode="tail" numberOfLines={1} style={styles.sectionTitle}>
          {title}
        </Text>
      </View>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToAlignment="start"
        snapToInterval={snapInterval}
      >
        {diaries.map((d, index) => (
          <GuideEditorialCard
            diary={d}
            index={index}
            isLast={index === diaries.length - 1}
            key={d.id}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: fecaTheme.spacing.md,
    marginBottom: fecaTheme.spacing.xl,
  },
  sectionHeader: {
    minHeight: 28,
    width: "100%",
  },
  sectionTitle: {
    ...fecaTheme.typography.homeCarouselSection,
    color: fecaTheme.colors.onSurface,
    maxWidth: "100%",
  },
  scrollContent: {
    paddingRight: fecaTheme.spacing.lg,
  },
  loadingRow: {
    alignItems: "center",
    justifyContent: "center",
  },
  errorRow: {
    gap: fecaTheme.spacing.sm,
  },
  errorText: {
    ...fecaTheme.typography.body,
    color: fecaTheme.colors.secondaryDim,
  },
  retryBtn: {
    alignSelf: "flex-start",
    backgroundColor: fecaTheme.surfaces.high,
    borderRadius: fecaTheme.radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  retryLabel: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.primary,
    fontWeight: "600",
  },
});
