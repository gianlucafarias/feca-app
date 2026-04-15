import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View } from "react-native";

import { SurfaceCard } from "@/components/ui/surface-card";
import { fecaTheme } from "@/theme/feca";
import type { ExplorePin } from "@/types/feca";

type MapPlaceholderProps = {
  pins: ExplorePin[];
};

export function MapPlaceholder({ pins }: MapPlaceholderProps) {
  return (
    <SurfaceCard elevated style={styles.card}>
      <LinearGradient
        colors={["rgba(81, 100, 67, 0.18)", "rgba(150, 71, 51, 0.08)"]}
        style={styles.canvas}
      >
        <View style={styles.neighborhoodOne}>
          <Text style={styles.neighborhoodLabel}>Ciudad Vieja</Text>
        </View>
        <View style={styles.neighborhoodTwo}>
          <Text style={styles.neighborhoodLabel}>Cordón</Text>
        </View>
        <View style={styles.neighborhoodThree}>
          <Text style={styles.neighborhoodLabel}>Punta Carretas</Text>
        </View>
        {pins.map((pin) => (
          <View
            key={pin.id}
            style={[
              styles.pinWrap,
              {
                left: `${pin.x}%`,
                top: `${pin.y}%`,
              },
            ]}
          >
            <View style={styles.pin}>
              <Ionicons
                color={fecaTheme.colors.onPrimary}
                name="location"
                size={14}
              />
            </View>
            <Text style={styles.pinLabel}>{pin.label}</Text>
          </View>
        ))}
        {pins.length === 0 ? (
          <View style={styles.emptyOverlay}>
            <Ionicons
              color={fecaTheme.colors.primary}
              name="map-outline"
              size={24}
            />
            <Text style={styles.emptyText}>
              Sin resultados en el mapa
            </Text>
          </View>
        ) : null}
      </LinearGradient>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: fecaTheme.spacing.sm,
  },
  canvas: {
    borderRadius: fecaTheme.radii.md,
    height: 200,
    overflow: "hidden",
    position: "relative",
  },
  neighborhoodOne: {
    left: "8%",
    position: "absolute",
    top: "18%",
  },
  neighborhoodTwo: {
    left: "34%",
    position: "absolute",
    top: "44%",
  },
  neighborhoodThree: {
    position: "absolute",
    right: "8%",
    top: "72%",
  },
  neighborhoodLabel: {
    ...fecaTheme.typography.label,
    color: "rgba(27, 28, 26, 0.36)",
    textTransform: "uppercase",
  },
  pinWrap: {
    alignItems: "center",
    position: "absolute",
    transform: [{ translateX: -12 }, { translateY: -12 }],
  },
  pin: {
    alignItems: "center",
    backgroundColor: fecaTheme.colors.secondary,
    borderRadius: 14,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  pinLabel: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.onSurface,
    marginTop: 6,
  },
  emptyOverlay: {
    alignItems: "center",
    backgroundColor: "rgba(242, 239, 233, 0.78)",
    bottom: 24,
    borderRadius: fecaTheme.radii.md,
    gap: fecaTheme.spacing.xs,
    justifyContent: "center",
    left: 24,
    padding: fecaTheme.spacing.lg,
    position: "absolute",
    right: 24,
    top: 24,
  },
  emptyText: {
    ...fecaTheme.typography.bodyStrong,
    color: fecaTheme.colors.onSurface,
    fontSize: 14,
    textAlign: "center",
  },
});
