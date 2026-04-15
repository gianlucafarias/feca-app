import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { fecaTheme } from "@/theme/feca";

type SavedCollectionCardProps = {
  title: string;
  emoji: string;
  countLabel: string;
  /** Hasta 3 URLs para el cluster circular */
  previewUrls: (string | undefined)[];
  onPress: () => void;
};

export function SavedCollectionCard({
  title,
  emoji,
  countLabel,
  previewUrls,
  onPress,
}: SavedCollectionCardProps) {
  const [a, b, c] = [
    previewUrls[0],
    previewUrls[1] ?? previewUrls[0],
    previewUrls[2] ?? previewUrls[0],
  ];

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <Text style={styles.title}>
        {title} {emoji}
      </Text>

      <View style={styles.cluster}>
        <View style={[styles.circle, styles.circleLeft]}>
          {a ? (
            <Image contentFit="cover" source={{ uri: a }} style={styles.circleImg} />
          ) : (
            <View style={[styles.circleImg, styles.ph]} />
          )}
        </View>
        <View style={[styles.circle, styles.circleCenter]}>
          {b ? (
            <Image contentFit="cover" source={{ uri: b }} style={styles.circleImg} />
          ) : (
            <View style={[styles.circleImg, styles.ph]} />
          )}
        </View>
        <View style={[styles.circle, styles.circleRight]}>
          {c ? (
            <Image contentFit="cover" source={{ uri: c }} style={styles.circleImg} />
          ) : (
            <View style={[styles.circleImg, styles.ph]} />
          )}
        </View>
      </View>

      <Text style={styles.footer}>{countLabel}</Text>
    </Pressable>
  );
}

const CIRCLE = 72;
const CIRCLE_SM = 56;

const styles = StyleSheet.create({
  card: {
    backgroundColor: fecaTheme.surfaces.lowest,
    borderRadius: fecaTheme.radii.xl,
    gap: fecaTheme.spacing.lg,
    overflow: "hidden",
    paddingBottom: fecaTheme.spacing.xl,
    paddingHorizontal: fecaTheme.spacing.xl,
    paddingTop: fecaTheme.spacing.xxl,
    ...fecaTheme.elevation.ambient,
  },
  cardPressed: {
    opacity: 0.92,
  },
  title: {
    fontFamily: "Newsreader_700Bold",
    fontSize: 22,
    lineHeight: 28,
    color: fecaTheme.colors.onSurface,
    textAlign: "center",
  },
  cluster: {
    alignItems: "center",
    flexDirection: "row",
    height: CIRCLE + 8,
    justifyContent: "center",
  },
  circle: {
    borderColor: fecaTheme.surfaces.lowest,
    borderRadius: 999,
    borderWidth: 3,
    overflow: "hidden",
  },
  circleLeft: {
    height: CIRCLE_SM,
    marginRight: -28,
    width: CIRCLE_SM,
    zIndex: 1,
  },
  circleCenter: {
    height: CIRCLE,
    width: CIRCLE,
    zIndex: 2,
  },
  circleRight: {
    height: CIRCLE_SM,
    marginLeft: -28,
    width: CIRCLE_SM,
    zIndex: 1,
  },
  circleImg: {
    height: "100%",
    width: "100%",
  },
  ph: {
    backgroundColor: fecaTheme.surfaces.high,
  },
  footer: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.muted,
    fontSize: 13,
    textAlign: "center",
  },
});
