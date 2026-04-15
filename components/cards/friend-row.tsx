import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AvatarBadge } from "@/components/ui/avatar-badge";
import { fecaTheme } from "@/theme/feca";
import type { User } from "@/types/feca";

type FriendRowProps = {
  user: User;
  selected?: boolean;
  onPress?: () => void;
  mode?: "list" | "picker";
};

export function FriendRow({
  user,
  selected = false,
  onPress,
  mode = "list",
}: FriendRowProps) {
  return (
    <Pressable onPress={onPress} style={styles.row}>
      <AvatarBadge
        accent={fecaTheme.colors.primary}
        name={user.displayName}
        size={40}
      />
      <View style={styles.info}>
        <Text style={styles.name}>{user.displayName}</Text>
        <Text style={styles.username}>@{user.username}</Text>
      </View>
      {mode === "picker" ? (
        <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
          {selected ? (
            <Ionicons color={fecaTheme.colors.onPrimary} name="checkmark" size={14} />
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: fecaTheme.spacing.sm,
    minHeight: 56,
    paddingHorizontal: fecaTheme.spacing.xs,
    paddingVertical: fecaTheme.spacing.xs,
  },
  info: {
    flex: 1,
    gap: 1,
  },
  name: {
    ...fecaTheme.typography.bodyStrong,
    color: fecaTheme.colors.onSurface,
    fontSize: 15,
    lineHeight: 20,
  },
  username: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.muted,
    fontSize: 13,
    lineHeight: 16,
  },
  checkbox: {
    alignItems: "center",
    backgroundColor: fecaTheme.surfaces.container,
    borderRadius: fecaTheme.radii.xs,
    height: 24,
    justifyContent: "center",
    width: 24,
  },
  checkboxSelected: {
    backgroundColor: fecaTheme.colors.primary,
  },
});
