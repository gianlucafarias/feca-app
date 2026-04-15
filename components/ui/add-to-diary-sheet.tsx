import { useCallback, useEffect, useState } from "react";

import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, FlatList, ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { addPlaceToDiaryApi, fetchMyDiaries } from "@/lib/api/diaries";
import { mapApiDiaryToCafeDiary } from "@/lib/feca/map-api-social";
import { useAuth } from "@/providers/auth-provider";
import { fecaTheme } from "@/theme/feca";
import type { CafeDiary } from "@/types/feca";

type AddToDiarySheetProps = {
  placeId: string | null;
  googlePlaceId?: string | null;
  visible: boolean;
  onClose: () => void;
};

export function AddToDiarySheet({
  placeId,
  googlePlaceId,
  visible,
  onClose,
}: AddToDiarySheetProps) {
  const { session } = useAuth();
  const accessToken = session?.accessToken;
  const [apiDiaries, setApiDiaries] = useState<CafeDiary[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!accessToken) {
      setApiDiaries([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetchMyDiaries(accessToken);
      setApiDiaries(res.diaries.map(mapApiDiaryToCafeDiary));
    } catch {
      setApiDiaries([]);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (visible) void load();
  }, [visible, load]);

  const handlePick = (diaryId: string) => {
    if ((!placeId && !googlePlaceId) || !accessToken) {
      onClose();
      return;
    }

    void (async () => {
      try {
        await addPlaceToDiaryApi(diaryId, accessToken, {
          placeId: placeId ?? undefined,
          googlePlaceId: googlePlaceId ?? undefined,
        });
      } catch {
        return;
      }
      onClose();
    })();
  };

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Ionicons color={fecaTheme.colors.onSurface} name="close" size={20} />
            </Pressable>
            <Text style={styles.title}>Agregar a una guía</Text>
            <View style={styles.closeBtn} />
          </View>

          {loading && apiDiaries.length === 0 ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={fecaTheme.colors.primary} />
            </View>
          ) : (
            <FlatList
              contentContainerStyle={styles.list}
              data={apiDiaries}
              keyExtractor={(diary) => diary.id}
              ListEmptyComponent={
                <Text style={styles.emptyText}>
                  No tenés guías todavía. Creá una desde tu perfil.
                </Text>
              }
              renderItem={({ item }) => {
                const already = placeId
                  ? item.places.some((place) => place.id === placeId)
                  : false;
                return (
                  <Pressable
                    disabled={already}
                    onPress={() => handlePick(item.id)}
                    style={[styles.row, already && styles.rowDisabled]}
                  >
                    <View style={styles.rowBody}>
                      <Text style={styles.rowName}>{item.name}</Text>
                      <Text style={styles.rowMeta}>
                        {item.places.length}{" "}
                        {item.places.length === 1 ? "café" : "cafés"}
                      </Text>
                    </View>
                    {already ? (
                      <Ionicons color={fecaTheme.colors.primary} name="checkmark-circle" size={20} />
                    ) : (
                      <Ionicons color={fecaTheme.colors.primary} name="add-circle-outline" size={20} />
                    )}
                  </Pressable>
                );
              }}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: fecaTheme.colors.scrim,
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: fecaTheme.surfaces.lowest,
    borderTopLeftRadius: fecaTheme.radii.xl,
    borderTopRightRadius: fecaTheme.radii.xl,
    maxHeight: "60%",
    paddingBottom: 32,
    paddingTop: fecaTheme.spacing.lg,
    ...fecaTheme.elevation.floating,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: fecaTheme.spacing.xl,
  },
  title: {
    ...fecaTheme.typography.title,
    color: fecaTheme.colors.onSurface,
  },
  closeBtn: {
    alignItems: "center",
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  list: {
    paddingHorizontal: fecaTheme.spacing.xl,
    paddingTop: fecaTheme.spacing.md,
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: fecaTheme.spacing.sm,
    minHeight: 56,
    paddingVertical: fecaTheme.spacing.sm,
  },
  rowDisabled: {
    opacity: 0.5,
  },
  rowBody: {
    flex: 1,
    gap: 2,
  },
  rowName: {
    ...fecaTheme.typography.bodyStrong,
    color: fecaTheme.colors.onSurface,
  },
  rowMeta: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.muted,
  },
  emptyText: {
    ...fecaTheme.typography.body,
    color: fecaTheme.colors.muted,
    paddingVertical: fecaTheme.spacing.xl,
    textAlign: "center",
  },
  loadingBox: {
    paddingVertical: fecaTheme.spacing.xl,
  },
});
