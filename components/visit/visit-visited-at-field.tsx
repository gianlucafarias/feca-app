import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, {
  DateTimePickerAndroid,
} from "@react-native-community/datetimepicker";
import { useCallback, useMemo, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { formatVisitDate, toVisitYyyyMmDd } from "@/lib/format";
import { fecaTheme, outlineGhost } from "@/theme/feca";

type VisitVisitedAtFieldProps = {
  valueYyyyMmDd: string;
  onChangeYyyyMmDd: (next: string) => void;
};

function parseLocalDay(value: string): Date {
  const t = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) {
    const [y, m, d] = t.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    return Number.isNaN(date.getTime()) ? new Date() : date;
  }
  const date = new Date(t);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

const maxDate = new Date();
const minDate = (() => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 15);
  return d;
})();

/**
 * Pregunta “¿Cuándo fuiste?” y permite elegir la fecha de la visita (`YYYY-MM-DD`).
 */
export function VisitVisitedAtField({
  valueYyyyMmDd,
  onChangeYyyyMmDd,
}: VisitVisitedAtFieldProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [iosDraft, setIosDraft] = useState(() => parseLocalDay(valueYyyyMmDd));

  const displayLabel = useMemo(
    () => formatVisitDate(valueYyyyMmDd),
    [valueYyyyMmDd],
  );

  const openAndroidPicker = useCallback(() => {
    const current = parseLocalDay(valueYyyyMmDd);
    DateTimePickerAndroid.open({
      value: current,
      mode: "date",
      maximumDate: maxDate,
      minimumDate: minDate,
      onChange: (event, date) => {
        if (event.type !== "set" || !date) {
          return;
        }
        onChangeYyyyMmDd(toVisitYyyyMmDd(date));
      },
    });
  }, [onChangeYyyyMmDd, valueYyyyMmDd]);

  const onPressRow = useCallback(() => {
    if (Platform.OS === "android") {
      openAndroidPicker();
      return;
    }
    setIosDraft(parseLocalDay(valueYyyyMmDd));
    setPickerOpen(true);
  }, [openAndroidPicker, valueYyyyMmDd]);

  const applyPicker = useCallback(() => {
    onChangeYyyyMmDd(toVisitYyyyMmDd(iosDraft));
    setPickerOpen(false);
  }, [iosDraft, onChangeYyyyMmDd]);

  return (
    <>
      <Pressable
        accessibilityHint="Abre el selector de fecha"
        accessibilityLabel={`¿Cuándo fuiste? Fecha actual ${displayLabel}`}
        accessibilityRole="button"
        onPress={onPressRow}
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      >
        <View style={styles.rowText}>
          <Text style={styles.label}>¿Cuándo fuiste?</Text>
          <Text style={styles.value}>{displayLabel}</Text>
          <Text style={styles.hint}>Tocá para cambiar la fecha</Text>
        </View>
        <Ionicons color={fecaTheme.colors.muted} name="calendar-outline" size={22} />
      </Pressable>

      {pickerOpen && Platform.OS !== "android" ? (
        <Modal
          animationType="fade"
          transparent
          visible
          onRequestClose={() => setPickerOpen(false)}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setPickerOpen(false)}>
            <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.modalTitle}>Fecha de la visita</Text>
              <DateTimePicker
                display="spinner"
                maximumDate={maxDate}
                minimumDate={minDate}
                mode="date"
                onChange={(_, date) => {
                  if (date) {
                    setIosDraft(date);
                  }
                }}
                value={iosDraft}
              />
              <View style={styles.modalActions}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setPickerOpen(false)}
                  style={({ pressed }) => [styles.modalBtn, pressed && styles.modalBtnPressed]}
                >
                  <Text style={styles.modalBtnMuted}>Cancelar</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={applyPicker}
                  style={({ pressed }) => [styles.modalBtn, pressed && styles.modalBtnPressed]}
                >
                  <Text style={styles.modalBtnPrimary}>Listo</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    backgroundColor: fecaTheme.surfaces.container,
    borderColor: outlineGhost,
    borderRadius: fecaTheme.radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: fecaTheme.spacing.md,
    paddingHorizontal: fecaTheme.spacing.md,
    paddingVertical: fecaTheme.spacing.md,
  },
  rowPressed: {
    opacity: 0.92,
  },
  rowText: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  label: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.muted,
  },
  value: {
    ...fecaTheme.typography.title,
    color: fecaTheme.colors.onSurface,
  },
  hint: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.secondarySoft,
    marginTop: 2,
  },
  modalBackdrop: {
    backgroundColor: fecaTheme.colors.overlay,
    flex: 1,
    justifyContent: "flex-end",
    padding: fecaTheme.spacing.lg,
  },
  modalCard: {
    backgroundColor: fecaTheme.colors.background,
    borderRadius: fecaTheme.radii.lg,
    overflow: "hidden",
    paddingBottom: fecaTheme.spacing.md,
    paddingTop: fecaTheme.spacing.md,
  },
  modalTitle: {
    ...fecaTheme.typography.headline,
    color: fecaTheme.colors.onSurface,
    paddingBottom: fecaTheme.spacing.sm,
    paddingHorizontal: fecaTheme.spacing.lg,
    textAlign: "center",
  },
  modalActions: {
    borderTopColor: outlineGhost,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: fecaTheme.spacing.sm,
    paddingHorizontal: fecaTheme.spacing.lg,
    paddingTop: fecaTheme.spacing.md,
  },
  modalBtn: {
    paddingVertical: fecaTheme.spacing.sm,
  },
  modalBtnPressed: {
    opacity: 0.7,
  },
  modalBtnMuted: {
    ...fecaTheme.typography.bodyStrong,
    color: fecaTheme.colors.muted,
  },
  modalBtnPrimary: {
    ...fecaTheme.typography.bodyStrong,
    color: fecaTheme.colors.primary,
  },
});
