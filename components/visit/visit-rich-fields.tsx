import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Chip } from "@/components/ui/chip";
import { FormField } from "@/components/ui/form-field";
import { fecaTheme } from "@/theme/feca";
import type { RichVisitDraft } from "@/types/feca";

type VisitRichFieldsProps = {
  draft: RichVisitDraft;
  onChange: (next: RichVisitDraft) => void;
  note: string;
  onNoteChange: (text: string) => void;
};

const TEMPLATES = [
  { label: "Bueno para enfocarse", text: "Buen ambiente para enfocarse." },
  { label: "Muy ruidoso", text: "Más ruido del que esperaba." },
  { label: "Ideal para leer", text: "Lindo para leer con calma." },
  { label: "Wifi estable", text: "Wifi estable para trabajar." },
];

function ScaleRow(props: {
  label: string;
  value: number | null;
  onChange: (n: number | null) => void;
  low: string;
  high: string;
}) {
  return (
    <View style={styles.scaleBlock}>
      <Text style={styles.scaleLabel}>{props.label}</Text>
      <View style={styles.scaleRow}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable
            key={n}
            onPress={() =>
              props.onChange(props.value === n ? null : n)
            }
            style={({ pressed }) => [
              styles.scaleDot,
              props.value === n && styles.scaleDotActive,
              pressed && styles.scaleDotPressed,
            ]}
          >
            <Text
              style={[
                styles.scaleDotText,
                props.value === n && styles.scaleDotTextActive,
              ]}
            >
              {n}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.scaleEnds}>
        <Text style={styles.scaleEndText}>{props.low}</Text>
        <Text style={styles.scaleEndText}>{props.high}</Text>
      </View>
    </View>
  );
}

export function VisitRichFields({
  draft,
  onChange,
  note,
  onNoteChange,
}: VisitRichFieldsProps) {
  const set = (partial: Partial<RichVisitDraft>) =>
    onChange({ ...draft, ...partial });

  const appendNote = (fragment: string) => {
    const t = note.trim();
    onNoteChange(t ? `${t}\n${fragment}` : fragment);
  };

  const addDemoPhoto = () => {
    const uri = `https://picsum.photos/seed/visit-${Date.now()}/300/300`;
    set({ photoUris: [...draft.photoUris, uri] });
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionTitle}>Tu visita</Text>
      <Text style={styles.sectionHint}>
        Esto arma tu huella de gusto; el servidor todavía guarda solo rating,
        nota y categoría.
      </Text>

      <FormField
        label="Qué pediste"
        onChangeText={(text) => set({ orderedItems: text })}
        placeholder="Ej. flat white + tostón de ricota"
        value={draft.orderedItems}
      />

      <View style={styles.block}>
        <Text style={styles.blockLabel}>¿Volverías?</Text>
        <View style={styles.row}>
          {(
            [
              ["yes", "Sí"],
              ["maybe", "Capaz"],
              ["no", "No"],
            ] as const
          ).map(([val, label]) => (
            <Chip
              key={val}
              label={label}
              onPress={() =>
                set({
                  wouldReturn: draft.wouldReturn === val ? null : val,
                })
              }
              selected={draft.wouldReturn === val}
            />
          ))}
        </View>
      </View>

      <ScaleRow
        high="Mucho"
        label="Ruido"
        low="Silencioso"
        onChange={(noiseLevel) => set({ noiseLevel })}
        value={draft.noiseLevel}
      />
      <ScaleRow
        high="Excelente"
        label="Wifi"
        low="Nada"
        onChange={(wifiQuality) => set({ wifiQuality })}
        value={draft.wifiQuality}
      />
      <ScaleRow
        high="Mucha"
        label="Espera"
        low="Nada"
        onChange={(waitLevel) => set({ waitLevel })}
        value={draft.waitLevel}
      />

      <View style={styles.block}>
        <Text style={styles.blockLabel}>Precio</Text>
        <View style={styles.row}>
          {([1, 2, 3] as const).map((tier) => (
            <Chip
              key={tier}
              label={"$".repeat(tier)}
              onPress={() =>
                set({
                  priceTier: draft.priceTier === tier ? null : tier,
                })
              }
              selected={draft.priceTier === tier}
            />
          ))}
        </View>
      </View>

      <View style={styles.block}>
        <Text style={styles.blockLabel}>Plantillas rápidas (añaden a la nota)</Text>
        <View style={styles.row}>
          {TEMPLATES.map((t) => (
            <Chip
              key={t.label}
              label={t.label}
              onPress={() => appendNote(t.text)}
              selected={false}
            />
          ))}
        </View>
      </View>

      <View style={styles.block}>
        <View style={styles.photoHeader}>
          <Text style={styles.blockLabel}>Fotos</Text>
          <Pressable onPress={addDemoPhoto} style={styles.photoAddBtn}>
            <Ionicons
              color={fecaTheme.colors.primary}
              name="image-outline"
              size={18}
            />
            <Text style={styles.photoAddLabel}>Foto demo</Text>
          </Pressable>
        </View>
        <Text style={styles.photoHint}>
          Próximamente: cámara y galería. Tap en “Foto demo” para simular una
          imagen.
        </Text>
        {draft.photoUris.length > 0 ? (
          <View style={styles.photoGrid}>
            {draft.photoUris.map((uri) => (
              <Image
                key={uri}
                contentFit="cover"
                source={{ uri }}
                style={styles.photoThumb}
              />
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: fecaTheme.spacing.lg,
  },
  sectionTitle: {
    ...fecaTheme.typography.title,
    color: fecaTheme.colors.onSurface,
  },
  sectionHint: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.muted,
    lineHeight: 18,
    marginTop: -fecaTheme.spacing.sm,
  },
  block: {
    gap: fecaTheme.spacing.sm,
  },
  blockLabel: {
    ...fecaTheme.typography.label,
    color: fecaTheme.colors.muted,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: fecaTheme.spacing.sm,
  },
  scaleBlock: {
    gap: fecaTheme.spacing.xs,
  },
  scaleLabel: {
    ...fecaTheme.typography.label,
    color: fecaTheme.colors.muted,
  },
  scaleRow: {
    flexDirection: "row",
    gap: fecaTheme.spacing.sm,
  },
  scaleDot: {
    alignItems: "center",
    backgroundColor: fecaTheme.surfaces.high,
    borderRadius: fecaTheme.radii.pill,
    height: 40,
    justifyContent: "center",
    minWidth: 40,
  },
  scaleDotActive: {
    backgroundColor: "rgba(81, 100, 67, 0.2)",
  },
  scaleDotPressed: {
    opacity: 0.85,
  },
  scaleDotText: {
    ...fecaTheme.typography.bodyStrong,
    color: fecaTheme.colors.muted,
    fontSize: 14,
  },
  scaleDotTextActive: {
    color: fecaTheme.colors.primary,
  },
  scaleEnds: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  scaleEndText: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.muted,
    fontSize: 11,
  },
  photoHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  photoAddBtn: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  photoAddLabel: {
    ...fecaTheme.typography.bodyStrong,
    color: fecaTheme.colors.primary,
    fontSize: 14,
  },
  photoHint: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.muted,
  },
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: fecaTheme.spacing.sm,
  },
  photoThumb: {
    borderRadius: fecaTheme.radii.sm,
    height: 72,
    width: 72,
  },
});
