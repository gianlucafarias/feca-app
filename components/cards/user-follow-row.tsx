import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { AvatarBadge } from "@/components/ui/avatar-badge";
import { fecaTheme } from "@/theme/feca";
import type { User } from "@/types/feca";

type UserFollowRowProps = {
  user: User;
  isFollowing: boolean;
  busy?: boolean;
  onPressUser: () => void;
  onToggleFollow: () => void;
};

export function UserFollowRow({
  user,
  isFollowing,
  busy = false,
  onPressUser,
  onToggleFollow,
}: UserFollowRowProps) {
  return (
    <View style={styles.row}>
      <Pressable onPress={onPressUser} style={styles.main}>
        <AvatarBadge
          accent={fecaTheme.colors.primary}
          name={user.displayName}
          size={40}
        />
        <View style={styles.info}>
          <Text numberOfLines={1} style={styles.name}>
            {user.displayName}
          </Text>
          <Text numberOfLines={1} style={styles.username}>
            @{user.username}
          </Text>
        </View>
      </Pressable>
      <Pressable
        disabled={busy}
        onPress={onToggleFollow}
        style={[styles.followBtn, isFollowing && styles.followBtnOutline]}
      >
        {busy ? (
          <ActivityIndicator
            color={isFollowing ? fecaTheme.colors.primary : fecaTheme.colors.onPrimary}
            size="small"
          />
        ) : (
          <>
            <Ionicons
              color={isFollowing ? fecaTheme.colors.primary : fecaTheme.colors.onPrimary}
              name={isFollowing ? "checkmark" : "person-add-outline"}
              size={16}
            />
            <Text
              style={[
                styles.followLabel,
                isFollowing && styles.followLabelOutline,
              ]}
            >
              {isFollowing ? "Siguiendo" : "Seguir"}
            </Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: fecaTheme.spacing.sm,
    justifyContent: "space-between",
    minHeight: 56,
    paddingVertical: fecaTheme.spacing.xs,
  },
  main: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: fecaTheme.spacing.sm,
  },
  info: {
    flex: 1,
    gap: 1,
    minWidth: 0,
  },
  name: {
    ...fecaTheme.typography.bodyStrong,
    color: fecaTheme.colors.onSurface,
    fontSize: 15,
  },
  username: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.muted,
    fontSize: 13,
  },
  followBtn: {
    alignItems: "center",
    backgroundColor: fecaTheme.colors.primary,
    borderRadius: fecaTheme.radii.pill,
    flexDirection: "row",
    gap: 4,
    minWidth: 108,
    justifyContent: "center",
    paddingHorizontal: fecaTheme.spacing.md,
    paddingVertical: fecaTheme.spacing.xs,
  },
  followBtnOutline: {
    backgroundColor: fecaTheme.surfaces.container,
  },
  followLabel: {
    ...fecaTheme.typography.bodyStrong,
    color: fecaTheme.colors.onPrimary,
    fontSize: 13,
  },
  followLabelOutline: {
    color: fecaTheme.colors.primary,
  },
});
