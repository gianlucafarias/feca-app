import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  addItemToList,
  createCustomList,
  listHasItem,
  loadCustomLists,
  LOCAL_QUIERO_IR_ID,
  removeItemFromList,
} from "@/lib/storage/saved-lists";
import {
  fetchPlaceSaved,
  savePlaceApi,
  unsavePlaceApi,
} from "@/lib/api/saved";
import { getVisitCardImageUri } from "@/lib/visit-image";
import { fecaTheme } from "@/theme/feca";
import type { SavedListItem, SavedListRecord } from "@/types/saved-lists";
import type { Visit } from "@/types/feca";

export type SaveSheetTarget =
  | {
      type: "place";
      googlePlaceId: string;
      name?: string;
      photoUrl?: string | null;
    }
  | { type: "visit"; visit: Visit }
  | {
      type: "group";
      groupId: string;
      groupName: string;
      photoUrl?: string | null;
    };

type SaveToListSheetProps = {
  visible: boolean;
  onClose: () => void;
  /** Tras guardar o quitar */
  onApplied?: () => void;
  accessToken: string | undefined;
  target: SaveSheetTarget | null;
};

function toSavedItem(target: SaveSheetTarget): SavedListItem | null {
  if (target.type === "place") {
    return {
      kind: "place",
      googlePlaceId: target.googlePlaceId,
      name: target.name,
      photoUrl: target.photoUrl ?? undefined,
    };
  }
  if (target.type === "visit") {
    return {
      kind: "visit",
      visitId: target.visit.id,
      placeName: target.visit.place.name,
      photoUrl: getVisitCardImageUri(target.visit),
    };
  }
  return {
    kind: "group",
    groupId: target.groupId,
    groupName: target.groupName,
    photoUrl: target.photoUrl ?? undefined,
  };
}

export function SaveToListSheet({
  visible,
  onClose,
  onApplied,
  accessToken,
  target,
}: SaveToListSheetProps) {
  const insets = useSafeAreaInsets();
  const [lists, setLists] = useState<SavedListRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [apiQuiero, setApiQuiero] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newEmoji, setNewEmoji] = useState("✨");
  const [creating, setCreating] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const data = await loadCustomLists();
      setLists(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!visible) {
      return;
    }
    void reload();
  }, [visible, reload]);

  useEffect(() => {
    if (!visible || !target || target.type !== "place" || !accessToken) {
      setApiQuiero(false);
      return;
    }
    let cancelled = false;
    void fetchPlaceSaved(target.googlePlaceId, accessToken)
      .then((v) => {
        if (!cancelled) {
          setApiQuiero(v);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setApiQuiero(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken, target, visible]);

  const item = target ? toSavedItem(target) : null;
  const localQuiero = lists.find((l) => l.id === LOCAL_QUIERO_IR_ID);
  const inLocalQuiero =
    Boolean(item && localQuiero && item.kind !== "place" && listHasItem(localQuiero, item));

  const userLists = lists.filter((l) => l.id !== LOCAL_QUIERO_IR_ID);

  const handleToggleApiQuiero = async () => {
    if (!target || target.type !== "place" || !accessToken) {
      return;
    }
    const next = !apiQuiero;
    setBusyId("api-quiero");
    setApiQuiero(next);
    try {
      await (next
        ? savePlaceApi(target.googlePlaceId, accessToken)
        : unsavePlaceApi(target.googlePlaceId, accessToken));
      onApplied?.();
    } catch {
      setApiQuiero(!next);
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleLocalQuiero = async () => {
    if (!item || item.kind === "place") {
      return;
    }
    setBusyId(LOCAL_QUIERO_IR_ID);
    try {
      if (inLocalQuiero) {
        await removeItemFromList(LOCAL_QUIERO_IR_ID, item);
      } else {
        await addItemToList(LOCAL_QUIERO_IR_ID, item);
      }
      await reload();
      onApplied?.();
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleCustomList = async (list: SavedListRecord) => {
    if (!item) {
      return;
    }
    setBusyId(list.id);
    try {
      if (listHasItem(list, item)) {
        await removeItemFromList(list.id, item);
      } else {
        await addItemToList(list.id, item);
      }
      await reload();
      onApplied?.();
    } finally {
      setBusyId(null);
    }
  };

  const handleCreateList = async () => {
    const title = newTitle.trim();
    if (!title || !item) {
      return;
    }
    setCreating(true);
    try {
      const list = await createCustomList(title, newEmoji.trim() || "📋");
      await addItemToList(list.id, item);
      setNewTitle("");
      setNewEmoji("✨");
      Keyboard.dismiss();
      await reload();
      onApplied?.();
    } finally {
      setCreating(false);
    }
  };

  const sheetMaxH = Math.round(Dimensions.get("window").height * 0.88);

  const quieroRow =
    target?.type === "place" ? (
      <Pressable
        disabled={!accessToken || busyId === "api-quiero"}
        onPress={() => void handleToggleApiQuiero()}
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      >
        <View style={styles.rowIcon}>
          {busyId === "api-quiero" ? (
            <ActivityIndicator color={fecaTheme.colors.primary} size="small" />
          ) : (
            <Ionicons
              color={apiQuiero ? fecaTheme.colors.primary : fecaTheme.colors.muted}
              name={apiQuiero ? "checkmark-circle" : "ellipse-outline"}
              size={22}
            />
          )}
        </View>
        <View style={styles.rowText}>
          <Text style={styles.rowTitle}>Quiero ir</Text>
          <Text style={styles.rowSub}>Tu lista principal de lugares (sincronizada)</Text>
        </View>
        <Text style={styles.emoji}>🧭</Text>
      </Pressable>
    ) : (
      <Pressable
        disabled={busyId === LOCAL_QUIERO_IR_ID || !item}
        onPress={() => void handleToggleLocalQuiero()}
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      >
        <View style={styles.rowIcon}>
          {busyId === LOCAL_QUIERO_IR_ID ? (
            <ActivityIndicator color={fecaTheme.colors.primary} size="small" />
          ) : (
            <Ionicons
              color={inLocalQuiero ? fecaTheme.colors.primary : fecaTheme.colors.muted}
              name={inLocalQuiero ? "checkmark-circle" : "ellipse-outline"}
              size={22}
            />
          )}
        </View>
        <View style={styles.rowText}>
          <Text style={styles.rowTitle}>Quiero ir</Text>
          <Text style={styles.rowSub}>Reseñas y planes en tu lista rápida</Text>
        </View>
        <Text style={styles.emoji}>🧭</Text>
      </Pressable>
    );

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <View style={styles.root}>
        <Pressable onPress={onClose} style={styles.backdrop} />
        <View style={[styles.sheet, { maxHeight: sheetMaxH, paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Guardar en…</Text>
            <Pressable hitSlop={8} onPress={onClose} style={styles.closeHit}>
              <Ionicons color={fecaTheme.colors.muted} name="close" size={22} />
            </Pressable>
          </View>

          {loading ? (
            <ActivityIndicator color={fecaTheme.colors.primary} style={styles.loader} />
          ) : (
            <ScrollView
              keyboardDismissMode="on-drag"
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              style={styles.scroll}
            >
              {quieroRow}

              {userLists.length > 0 ? (
                <Text style={styles.sectionLabel}>Tus listas</Text>
              ) : null}

              {userLists.map((list) => {
                const has = item ? listHasItem(list, item) : false;
                const busy = busyId === list.id;
                return (
                  <Pressable
                    disabled={busy || !item}
                    key={list.id}
                    onPress={() => void handleToggleCustomList(list)}
                    style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                  >
                    <View style={styles.rowIcon}>
                      {busy ? (
                        <ActivityIndicator color={fecaTheme.colors.primary} size="small" />
                      ) : (
                        <Ionicons
                          color={has ? fecaTheme.colors.primary : fecaTheme.colors.muted}
                          name={has ? "checkmark-circle" : "ellipse-outline"}
                          size={22}
                        />
                      )}
                    </View>
                    <View style={styles.rowText}>
                      <Text style={styles.rowTitle}>
                        {list.emoji} {list.title}
                      </Text>
                      <Text style={styles.rowSub}>
                        {list.items.length}{" "}
                        {list.items.length === 1 ? "elemento" : "elementos"}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}

              <Text style={styles.sectionLabel}>Nueva lista</Text>
              <View style={styles.createRow}>
                <TextInput
                  onChangeText={setNewEmoji}
                  placeholder="✨"
                  style={styles.emojiInput}
                  value={newEmoji}
                />
                <TextInput
                  onChangeText={setNewTitle}
                  placeholder="Nombre de la lista"
                  style={styles.titleInput}
                  value={newTitle}
                />
                <Pressable
                  disabled={creating || !newTitle.trim() || !item}
                  onPress={() => void handleCreateList()}
                  style={[styles.createBtn, (!newTitle.trim() || !item) && styles.createBtnOff]}
                >
                  {creating ? (
                    <ActivityIndicator color={fecaTheme.colors.onPrimary} size="small" />
                  ) : (
                    <Text style={styles.createBtnText}>Crear</Text>
                  )}
                </Pressable>
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(27, 28, 26, 0.45)",
  },
  sheet: {
    backgroundColor: fecaTheme.surfaces.lowest,
    borderTopLeftRadius: fecaTheme.radii.xl,
    borderTopRightRadius: fecaTheme.radii.xl,
    paddingTop: fecaTheme.spacing.md,
    ...fecaTheme.elevation.floating,
  },
  sheetHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: fecaTheme.spacing.sm,
    paddingHorizontal: fecaTheme.spacing.lg,
  },
  sheetTitle: {
    ...fecaTheme.typography.title,
    color: fecaTheme.colors.onSurface,
  },
  closeHit: {
    position: "absolute",
    right: fecaTheme.spacing.md,
  },
  loader: {
    paddingVertical: fecaTheme.spacing.xxl,
  },
  scroll: {
    maxHeight: Dimensions.get("window").height * 0.65,
  },
  sectionLabel: {
    ...fecaTheme.typography.label,
    color: fecaTheme.colors.muted,
    letterSpacing: 1,
    marginBottom: fecaTheme.spacing.sm,
    marginTop: fecaTheme.spacing.md,
    paddingHorizontal: fecaTheme.spacing.lg,
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: fecaTheme.spacing.md,
    paddingHorizontal: fecaTheme.spacing.lg,
    paddingVertical: fecaTheme.spacing.md,
  },
  rowPressed: {
    backgroundColor: fecaTheme.surfaces.high,
  },
  rowIcon: {
    width: 28,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    ...fecaTheme.typography.bodyStrong,
    color: fecaTheme.colors.onSurface,
    fontSize: 16,
  },
  rowSub: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.muted,
    fontSize: 12,
  },
  emoji: {
    fontSize: 22,
  },
  createRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: fecaTheme.spacing.sm,
    paddingBottom: fecaTheme.spacing.lg,
    paddingHorizontal: fecaTheme.spacing.lg,
  },
  emojiInput: {
    backgroundColor: fecaTheme.surfaces.high,
    borderRadius: fecaTheme.radii.sm,
    fontSize: 20,
    paddingHorizontal: fecaTheme.spacing.sm,
    paddingVertical: fecaTheme.spacing.sm,
    width: 48,
  },
  titleInput: {
    ...fecaTheme.typography.body,
    backgroundColor: fecaTheme.surfaces.high,
    borderRadius: fecaTheme.radii.sm,
    color: fecaTheme.colors.onSurface,
    flex: 1,
    paddingHorizontal: fecaTheme.spacing.md,
    paddingVertical: fecaTheme.spacing.sm,
  },
  createBtn: {
    backgroundColor: fecaTheme.colors.primary,
    borderRadius: fecaTheme.radii.sm,
    minWidth: 72,
    paddingHorizontal: fecaTheme.spacing.md,
    paddingVertical: fecaTheme.spacing.sm,
  },
  createBtnOff: {
    opacity: 0.45,
  },
  createBtnText: {
    ...fecaTheme.typography.bodyStrong,
    color: fecaTheme.colors.onPrimary,
    fontSize: 15,
    textAlign: "center",
  },
});
