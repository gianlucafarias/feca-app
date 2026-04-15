import { Pressable, StyleSheet, Text, View } from "react-native";

import { fecaTheme } from "@/theme/feca";

type Segment = {
  key: string;
  label: string;
};

type SegmentedControlProps = {
  segments: Segment[];
  activeKey: string;
  onChange: (key: string) => void;
};

export function SegmentedControl({
  segments,
  activeKey,
  onChange,
}: SegmentedControlProps) {
  return (
    <View style={styles.track}>
      {segments.map((segment) => {
        const isActive = segment.key === activeKey;
        return (
          <Pressable
            key={segment.key}
            onPress={() => onChange(segment.key)}
            style={[styles.segment, isActive && styles.segmentActive]}
          >
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {segment.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    backgroundColor: fecaTheme.surfaces.low,
    borderRadius: fecaTheme.radii.sm,
    flexDirection: "row",
    padding: 3,
  },
  segment: {
    alignItems: "center",
    borderRadius: fecaTheme.radii.sm - 2,
    flex: 1,
    justifyContent: "center",
    paddingVertical: fecaTheme.spacing.sm,
  },
  segmentActive: {
    backgroundColor: fecaTheme.surfaces.lowest,
    ...fecaTheme.elevation.ambient,
  },
  label: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.muted,
  },
  labelActive: {
    color: fecaTheme.colors.onSurface,
    fontFamily: "PlusJakartaSans_600SemiBold",
  },
});
