import { Ionicons } from "@expo/vector-icons";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { createCustomList } from "@/lib/storage/saved-lists";
import { fecaTheme } from "@/theme/feca";

const CIRCLE = 72;
const CIRCLE_SM = 56;

type SavedNewListCardProps = {
  onCreated: (listId: string) => void;
};

export function SavedNewListCard({ onCreated }: SavedNewListCardProps) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [emoji, setEmoji] = useState("✨");
  const [busy, setBusy] = useState(false);

  const close = useCallback(() => {
    setOpen(false);
    setTitle("");
    setEmoji("✨");
    Keyboard.dismiss();
  }, []);

  const submit = useCallback(async () => {
    const t = title.trim();
    if (!t || busy) {
      return;
    }
    setBusy(true);
    try {
      const list = await createCustomList(t, emoji.trim() || "📋");
      close();
      onCreated(list.id);
    } finally {
      setBusy(false);
    }
  }, [busy, close, emoji, onCreated, title]);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Crear una nueva lista"
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      >
        <Text style={styles.title}>Nueva lista ➕</Text>

        <View style={styles.cluster}>
          <View style={[styles.circle, styles.circleLeft, styles.circleDashed]}>
            <Ionicons color={fecaTheme.colors.muted} name="ellipse-outline" size={28} />
          </View>
          <View style={[styles.circle, styles.circleCenter, styles.circleAccent]}>
            <Ionicons color={fecaTheme.colors.primary} name="add" size={36} />
          </View>
          <View style={[styles.circle, styles.circleRight, styles.circleDashed]}>
            <Ionicons color={fecaTheme.colors.muted} name="ellipse-outline" size={28} />
          </View>
        </View>

        <Text style={styles.footer}>Tocá para crear una lista con nombre e ícono</Text>
      </Pressable>

      <Modal animationType="slide" onRequestClose={close} transparent visible={open}>
        <Pressable accessibilityRole="button" onPress={close} style={styles.modalBackdrop}>
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={[
              styles.modalSheet,
              { paddingBottom: Math.max(insets.bottom, 20) },
            ]}
          >
            <Text style={styles.modalTitle}>Nueva lista</Text>
            <Text style={styles.modalHint}>Nombre e ícono (emoji)</Text>
            <TextInput
              autoFocus
              maxLength={80}
              onChangeText={setTitle}
              placeholder="Ej. Cafés con terraza"
              placeholderTextColor={fecaTheme.colors.muted}
              style={styles.input}
              value={title}
            />
            <TextInput
              maxLength={8}
              onChangeText={setEmoji}
              placeholder="✨"
              placeholderTextColor={fecaTheme.colors.muted}
              style={styles.inputEmoji}
              value={emoji}
            />
            <Pressable
              accessibilityRole="button"
              disabled={busy || !title.trim()}
              onPress={() => void submit()}
              style={({ pressed }) => [
                styles.modalBtn,
                (!title.trim() || busy) && styles.modalBtnDisabled,
                pressed && title.trim() && !busy && styles.modalBtnPressed,
              ]}
            >
              {busy ? (
                <ActivityIndicator color={fecaTheme.colors.onPrimary} />
              ) : (
                <Text style={styles.modalBtnLabel}>Crear lista</Text>
              )}
            </Pressable>
            <Pressable accessibilityRole="button" onPress={close} style={styles.modalCancel}>
              <Text style={styles.modalCancelLabel}>Cancelar</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

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
    alignItems: "center",
    borderColor: fecaTheme.surfaces.lowest,
    borderRadius: 999,
    borderWidth: 3,
    justifyContent: "center",
    overflow: "hidden",
  },
  circleDashed: {
    backgroundColor: fecaTheme.surfaces.high,
  },
  circleAccent: {
    backgroundColor: fecaTheme.surfaces.high,
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
  footer: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.muted,
    fontSize: 13,
    textAlign: "center",
  },
  modalBackdrop: {
    backgroundColor: "rgba(0,0,0,0.45)",
    flex: 1,
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: fecaTheme.colors.background,
    borderTopLeftRadius: fecaTheme.radii.xl,
    borderTopRightRadius: fecaTheme.radii.xl,
    gap: fecaTheme.spacing.md,
    paddingHorizontal: fecaTheme.spacing.xl,
    paddingTop: fecaTheme.spacing.xl,
  },
  modalTitle: {
    fontFamily: "Newsreader_700Bold",
    fontSize: 22,
    color: fecaTheme.colors.onSurface,
  },
  modalHint: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.muted,
    marginBottom: fecaTheme.spacing.xs,
  },
  input: {
    ...fecaTheme.typography.body,
    backgroundColor: fecaTheme.surfaces.low,
    borderRadius: fecaTheme.radii.md,
    color: fecaTheme.colors.onSurface,
    paddingHorizontal: fecaTheme.spacing.md,
    paddingVertical: fecaTheme.spacing.md,
  },
  inputEmoji: {
    ...fecaTheme.typography.body,
    backgroundColor: fecaTheme.surfaces.low,
    borderRadius: fecaTheme.radii.md,
    color: fecaTheme.colors.onSurface,
    maxWidth: 80,
    paddingHorizontal: fecaTheme.spacing.md,
    paddingVertical: fecaTheme.spacing.md,
  },
  modalBtn: {
    alignItems: "center",
    backgroundColor: fecaTheme.colors.primary,
    borderRadius: fecaTheme.radii.pill,
    justifyContent: "center",
    marginTop: fecaTheme.spacing.sm,
    minHeight: 48,
    paddingVertical: fecaTheme.spacing.md,
  },
  modalBtnDisabled: {
    opacity: 0.45,
  },
  modalBtnPressed: {
    opacity: 0.9,
  },
  modalBtnLabel: {
    ...fecaTheme.typography.bodyStrong,
    color: fecaTheme.colors.onPrimary,
    fontSize: 16,
  },
  modalCancel: {
    alignItems: "center",
    paddingVertical: fecaTheme.spacing.md,
  },
  modalCancelLabel: {
    ...fecaTheme.typography.bodyStrong,
    color: fecaTheme.colors.secondary,
    fontSize: 15,
  },
});
