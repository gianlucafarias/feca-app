import type { Href } from "expo-router";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Chip } from "@/components/ui/chip";
import { PrimaryButton } from "@/components/ui/primary-button";
import { useAuth } from "@/providers/auth-provider";
import { fecaTheme } from "@/theme/feca";
import type { ApiOutingCompany, ApiOutingPreferencesV1 } from "@/types/api";

const SLOT_OPTIONS: {
  id: NonNullable<ApiOutingPreferencesV1["typicalOutingSlots"]>[number];
  label: string;
}[] = [
  { id: "weekday_morning", label: "Mañana entre semana" },
  { id: "weekday_afternoon", label: "Tarde entre semana" },
  { id: "weekday_evening", label: "Noche entre semana" },
  { id: "weekend_day", label: "Finde de día" },
  { id: "weekend_night", label: "Finde de noche" },
];

const COMPANY_OPTIONS: { id: ApiOutingCompany; label: string }[] = [
  { id: "solo", label: "Solo/a" },
  { id: "couple", label: "En pareja" },
  { id: "small_group", label: "Grupo chico" },
  { id: "large_group", label: "Grupo grande" },
];

const PRIORITY_OPTIONS: {
  id: NonNullable<ApiOutingPreferencesV1["placePriorities"]>[number];
  label: string;
}[] = [
  { id: "atmosphere", label: "Ambiente" },
  { id: "food_drink", label: "Comida y bebida" },
  { id: "price", label: "Precio" },
  { id: "distance", label: "Cercanía" },
  { id: "quiet", label: "Tranquilidad" },
  { id: "service", label: "Servicio" },
];

type OutingPreferencesFormProps = {
  /** Texto del botón principal */
  submitLabel: string;
  /** Tras guardar OK (perfil actualizado) */
  onSubmitSuccess: () => void | Promise<void>;
  /** En la pantalla modal: enlace a afinar gustos */
  showTasteLink?: boolean;
  /** Contenido scroll (padding bottom lo fija la pantalla) */
  contentContainerStyle?: object;
};

export function OutingPreferencesForm({
  submitLabel,
  onSubmitSuccess,
  showTasteLink,
  contentContainerStyle,
}: OutingPreferencesFormProps) {
  const { session, updateProfile } = useAuth();
  const [slots, setSlots] = useState<string[]>([]);
  const [companies, setCompanies] = useState<string[]>([]);
  const [priorities, setPriorities] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initial = useMemo(
    () => session?.user.outingPreferences ?? null,
    [session?.user.outingPreferences],
  );

  useEffect(() => {
    if (!initial) {
      setSlots([]);
      setCompanies([]);
      setPriorities([]);
      return;
    }
    setSlots(initial.typicalOutingSlots ?? []);
    const fromMulti = initial.typicalCompanies?.length
      ? initial.typicalCompanies
      : initial.typicalCompany
        ? [initial.typicalCompany]
        : [];
    setCompanies(fromMulti);
    setPriorities(initial.placePriorities ?? []);
  }, [initial]);

  const toggleSlot = useCallback((id: string) => {
    setSlots((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  const toggleCompanies = useCallback((id: string) => {
    setCompanies((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  const togglePriority = useCallback((id: string) => {
    setPriorities((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  const canSubmit =
    slots.length > 0 || companies.length > 0 || priorities.length > 0;

  const onSave = useCallback(async () => {
    if (!session?.accessToken) {
      return;
    }
    if (!canSubmit) {
      setError("Elegí al menos una opción en cualquier sección.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const body: ApiOutingPreferencesV1 = { schemaVersion: 1 };
      if (slots.length > 0) {
        body.typicalOutingSlots =
          slots as ApiOutingPreferencesV1["typicalOutingSlots"];
      }
      if (companies.length > 0) {
        body.typicalCompanies = companies as ApiOutingPreferencesV1["typicalCompanies"];
      }
      if (priorities.length > 0) {
        body.placePriorities = priorities as ApiOutingPreferencesV1["placePriorities"];
      }
      await updateProfile({ outingPreferences: body });
      await onSubmitSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }, [canSubmit, companies, onSubmitSuccess, priorities, session?.accessToken, slots, updateProfile]);

  return (
    <ScrollView
      contentContainerStyle={[styles.body, contentContainerStyle]}
      keyboardShouldPersistTaps="handled"
    >
     

      <Text style={styles.sectionLabel}>¿Cuándo sueles salir? (varias)</Text>
      <View style={styles.chipWrap}>
        {SLOT_OPTIONS.map((opt) => (
          <Chip
            key={opt.id}
            label={opt.label}
            selected={slots.includes(opt.id)}
            onPress={() => toggleSlot(opt.id)}
          />
        ))}
      </View>

      <Text style={styles.sectionLabel}>¿Con quién salís más? (varias)</Text>
      <View style={styles.chipWrap}>
        {COMPANY_OPTIONS.map((opt) => (
          <Chip
            key={opt.id}
            label={opt.label}
            selected={companies.includes(opt.id)}
            onPress={() => toggleCompanies(opt.id)}
          />
        ))}
      </View>

      <Text style={styles.sectionLabel}>
        Qué priorizás al elegir (elegí todas las que quieras)
      </Text>
      <View style={styles.chipWrap}>
        {PRIORITY_OPTIONS.map((opt) => (
          <Chip
            key={opt.id}
            label={opt.label}
            selected={priorities.includes(opt.id)}
            onPress={() => togglePriority(opt.id)}
          />
        ))}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <PrimaryButton
        disabled={saving || !canSubmit}
        label={saving ? "Guardando…" : submitLabel}
        onPress={() => void onSave()}
      />

      {showTasteLink ? (
        <Pressable
          onPress={() => router.push("/taste" as Href)}
          style={({ pressed }) => [styles.secondaryLink, pressed && { opacity: 0.7 }]}
        >
          <Text style={styles.secondaryLinkText}>
            Afinar estilo de lugares (chips) →
          </Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: fecaTheme.spacing.lg,
    paddingHorizontal: fecaTheme.spacing.lg,
    paddingTop: fecaTheme.spacing.md,
  },
  lead: {
    ...fecaTheme.typography.body,
    color: fecaTheme.colors.muted,
  },
  sectionLabel: {
    ...fecaTheme.typography.title,
    color: fecaTheme.colors.onSurface,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: fecaTheme.spacing.sm,
  },
  error: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.secondary,
  },
  secondaryLink: {
    alignSelf: "center",
    paddingVertical: fecaTheme.spacing.md,
  },
  secondaryLinkText: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.primary,
  },
});
