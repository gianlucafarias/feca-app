import type { TastePreference } from "@/types/feca";

/** Preferencias de ejemplo para perfiles (mock). */
export const TASTE_PREFERENCE_OPTIONS: TastePreference[] = [
  { id: "small_bar", label: "Te gustan las barras chicas" },
  { id: "specialty_over_brunch", label: "Preferís specialty sobre brunch masivo" },
  { id: "reading_spots", label: "Buscás lugares para leer" },
  { id: "wifi_outlets", label: "Te importan wifi y enchufes" },
  { id: "terrace", label: "Preferís terrazas" },
  { id: "indoor_table", label: "Preferís mesas de interior" },
  { id: "quiet", label: "Valorás lugares tranquilos" },
  { id: "bright_light", label: "Te importa la luz natural" },
];

const BY_USER: Record<string, string[]> = {
  lucia: ["small_bar", "bright_light", "reading_spots", "specialty_over_brunch"],
  mateo: ["specialty_over_brunch", "wifi_outlets", "quiet"],
  julieta: ["reading_spots", "indoor_table", "quiet", "bright_light"],
  sofia: ["terrace", "small_bar"],
  tomas: ["wifi_outlets", "specialty_over_brunch"],
  valentina: ["terrace", "bright_light"],
  nicolas: ["indoor_table", "quiet"],
};

export function getMockTastePreferenceIdsForUser(userId: string): string[] {
  return BY_USER[userId] ?? ["reading_spots", "wifi_outlets"];
}

export function labelsForIds(ids: string[]): string[] {
  const map = new Map(TASTE_PREFERENCE_OPTIONS.map((o) => [o.id, o.label]));
  return ids.map((id) => map.get(id)).filter((x): x is string => Boolean(x));
}
