import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import type { NearbyPlaceFriendRow } from "@/types/places";
import { fecaTheme, hexToRgba } from "@/theme/feca";

const PILL_BACKGROUNDS = ["#f8cfe0", "#e3daf6"] as const;

const AVATAR_FALLBACK_BACKGROUNDS = [
  "#6b7c93",
  "#8b7355",
  "#5c7a6e",
  "#7d6b8b",
] as const;

const { cardWidth, imageHeight, sealSize } = fecaTheme.homeEditorialCarousel;
const sealRadius = sealSize / 2;

function initialsFromUsername(username: string): string {
  const a = username.replace(/[^a-zA-Z0-9]/g, "");
  if (a.length >= 2) {
    return a.slice(0, 2).toUpperCase();
  }
  if (a.length === 1) {
    return `${a}${a}`.toUpperCase();
  }
  return "?";
}

function avatarFallbackColor(username: string): string {
  let h = 0;
  for (let i = 0; i < username.length; i += 1) {
    h = (h + username.charCodeAt(i) * (i + 1)) % 997;
  }
  return AVATAR_FALLBACK_BACKGROUNDS[h % AVATAR_FALLBACK_BACKGROUNDS.length];
}

export type EditorialCarouselCardProps = {
  index: number;
  imageUrl?: string;
  fallbackIcon: keyof typeof Ionicons.glyphMap;
  /** Contenido del sello oscuro (p. ej. rating o cantidad de paradas). Vacío = no mostrar. */
  sealText?: string | null;
  /** Copy en el pill de color (debajo del título). Vacío = no se muestra pill. */
  pillText?: string;
  /** Nombre del lugar o de la guía (destacado). */
  captionText: string;
  /** Amigos arriba: avatar + @usuario + snippet, sin fondo (solo lugares con señales). */
  friendRows?: NearbyPlaceFriendRow[];
  onPress: () => void;
  accessibilityLabel: string;
};

export function EditorialCarouselCard({
  index,
  imageUrl,
  fallbackIcon,
  sealText,
  pillText = "",
  captionText,
  friendRows,
  onPress,
  accessibilityLabel,
}: EditorialCarouselCardProps) {
  const pillBg = PILL_BACKGROUNDS[index % PILL_BACKGROUNDS.length];
  const showSeal = Boolean(sealText?.trim());
  const showPill = Boolean(pillText.trim());
  const friends = friendRows?.length ? friendRows.slice(0, 3) : [];

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={styles.card}
    >
      <View style={styles.imageWrap}>
        <View
          collapsable={false}
          pointerEvents="none"
          style={styles.photoLayer}
        >
          {imageUrl ? (
            <Image
              contentFit="cover"
              source={{ uri: imageUrl }}
              style={styles.image}
            />
          ) : (
            <View style={[styles.image, styles.imageFallback]}>
              <Ionicons color={fecaTheme.colors.muted} name={fallbackIcon} size={44} />
            </View>
          )}
        </View>
        {friends.length > 0 ? (
          <LinearGradient
            colors={[
              hexToRgba(fecaTheme.colors.onSurface, 0.42),
              hexToRgba(fecaTheme.colors.onSurface, 0.18),
              hexToRgba(fecaTheme.colors.onSurface, 0),
            ]}
            locations={[0, 0.45, 1]}
            pointerEvents="none"
            style={styles.topFade}
          />
        ) : null}
        <View
          collapsable={false}
          pointerEvents="none"
          style={styles.bottomScrim}
        >
          <LinearGradient
            colors={[
              "rgba(50,51,48,0)",
              "rgba(50,51,48,0.18)",
              "rgba(50,51,48,0.45)",
              "rgba(50,51,48,0.78)",
            ]}
            end={{ x: 0.5, y: 1 }}
            locations={[0, 0.35, 0.68, 1]}
            pointerEvents="none"
            start={{ x: 0.5, y: 0 }}
            style={StyleSheet.absoluteFillObject}
          />
        </View>
        {friends.length > 0 ? (
          <View pointerEvents="none" style={styles.friendStack}>
            {friends.map((row, i) => (
              <View key={`${row.username}-${i}`} style={styles.friendRow}>
                {row.avatarUrl?.trim() ? (
                  <Image
                    accessibilityIgnoresInvertColors
                    contentFit="cover"
                    source={{ uri: row.avatarUrl.trim() }}
                    style={styles.friendAvatarImg}
                  />
                ) : (
                  <View
                    style={[
                      styles.friendAvatarFallback,
                      { backgroundColor: avatarFallbackColor(row.username) },
                    ]}
                  >
                    <Text style={styles.friendAvatarInitials}>
                      {initialsFromUsername(row.username)}
                    </Text>
                  </View>
                )}
                <View style={styles.friendTextCol}>
                  <Text style={styles.friendUser}>@{row.username}</Text>
                  {row.snippet ? (
                    <Text numberOfLines={2} style={styles.friendSnippet}>
                      {row.snippet}
                    </Text>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        ) : null}
        {showSeal ? (
          <View style={styles.sealWrap}>
            <View
              style={[
                styles.seal,
                {
                  width: sealSize,
                  height: sealSize,
                  borderRadius: sealRadius,
                },
              ]}
            >
              <Text style={styles.sealText}>{sealText}</Text>
            </View>
          </View>
        ) : null}
        <View pointerEvents="none" style={styles.captionBlock}>
          <Text numberOfLines={2} style={styles.captionTitle}>
            {captionText}
          </Text>
          {showPill ? (
            <View style={[styles.pill, { backgroundColor: pillBg }]}>
              <Text numberOfLines={3} style={styles.pillText}>
                {pillText.trim()}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: fecaTheme.radii.carouselEditorial,
    overflow: "hidden",
    width: cardWidth,
    ...fecaTheme.elevation.ambient,
  },
  imageWrap: {
    borderRadius: fecaTheme.radii.carouselEditorial,
    height: imageHeight,
    overflow: "hidden",
    position: "relative",
    width: cardWidth,
  },
  /** Capa base: la foto no debe “tapar” el degradado en Android (orden + elevation). */
  photoLayer: {
    ...StyleSheet.absoluteFillObject,
    elevation: 0,
    zIndex: 0,
  },
  image: {
    height: imageHeight,
    width: cardWidth,
  },
  imageFallback: {
    alignItems: "center",
    backgroundColor: fecaTheme.surfaces.high,
    justifyContent: "center",
  },
  bottomScrim: {
    bottom: 0,
    height: Math.round(imageHeight * 0.52),
    left: 0,
    position: "absolute",
    width: cardWidth,
    zIndex: 4,
    ...(Platform.OS === "android" ? { elevation: 4 } : {}),
  },
  topFade: {
    height: 120,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 3,
    ...(Platform.OS === "android" ? { elevation: 3 } : {}),
  },
  friendStack: {
    gap: 8,
    left: 12,
    maxWidth: cardWidth - sealSize - 28,
    paddingTop: 12,
    position: "absolute",
    right: sealSize + 20,
    top: 0,
    zIndex: 5,
    ...(Platform.OS === "android" ? { elevation: 5 } : {}),
  },
  friendRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 10,
  },
  friendAvatarImg: {
    borderColor: hexToRgba(fecaTheme.colors.surfaceBright, 0.55),
    borderRadius: 15,
    borderWidth: 2,
    height: 30,
    width: 30,
  },
  friendAvatarFallback: {
    alignItems: "center",
    borderColor: hexToRgba(fecaTheme.colors.surfaceBright, 0.45),
    borderRadius: 15,
    borderWidth: 2,
    height: 30,
    justifyContent: "center",
    width: 30,
  },
  friendAvatarInitials: {
    color: fecaTheme.colors.surfaceBright,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 11,
    letterSpacing: 0.2,
  },
  friendTextCol: {
    flex: 1,
    flexShrink: 1,
    gap: 2,
    minWidth: 0,
    paddingTop: 1,
  },
  friendUser: {
    color: fecaTheme.colors.surfaceBright,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 13,
    letterSpacing: -0.2,
    lineHeight: 17,
    textShadowColor: hexToRgba(fecaTheme.colors.onSurface, 0.55),
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  friendSnippet: {
    color: hexToRgba(fecaTheme.colors.surfaceBright, 0.92),
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 12,
    letterSpacing: -0.1,
    lineHeight: 16,
    textShadowColor: hexToRgba(fecaTheme.colors.onSurface, 0.45),
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  sealWrap: {
    position: "absolute",
    right: 14,
    top: 14,
    zIndex: 5,
    ...(Platform.OS === "android" ? { elevation: 5 } : {}),
  },
  seal: {
    alignItems: "center",
    backgroundColor: fecaTheme.colors.onSurface,
    justifyContent: "center",
    shadowColor: fecaTheme.colors.onSurface,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 4,
  },
  sealText: {
    color: fecaTheme.colors.surfaceBright,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 16,
    fontVariant: ["tabular-nums"],
    letterSpacing: -0.3,
  },
  captionBlock: {
    alignItems: "flex-start",
    bottom: 0,
    gap: 10,
    left: 0,
    maxWidth: cardWidth - 20,
    paddingBottom: 16,
    paddingLeft: 14,
    paddingRight: 14,
    position: "absolute",
    zIndex: 6,
    ...(Platform.OS === "android" ? { elevation: 6 } : {}),
  },
  captionTitle: {
    color: fecaTheme.colors.surfaceBright,
    fontFamily: "Newsreader_700Bold_Italic",
    fontSize: 26,
    letterSpacing: -0.35,
    lineHeight: 30,
    textShadowColor: hexToRgba(fecaTheme.colors.onSurface, 0.55),
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  pill: {
    alignSelf: "flex-start",
    borderRadius: fecaTheme.radii.carouselEditorialPill,
    maxWidth: "100%",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  pillText: {
    color: fecaTheme.colors.onSurface,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 14,
    letterSpacing: -0.15,
    lineHeight: 19,
  },
});
