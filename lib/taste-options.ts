import type { ApiTasteOption } from "@/types/api";

export const FALLBACK_TASTE_OPTIONS: ApiTasteOption[] = [
  { id: "small_bar", label: "Te gustan las barras chicas" },
  {
    id: "specialty_over_brunch",
    label: "Preferís specialty sobre brunch masivo",
  },
  { id: "reading_spots", label: "Buscás lugares para leer" },
  { id: "wifi_outlets", label: "Te importan wifi y enchufes" },
  { id: "terrace", label: "Preferís terrazas" },
  { id: "indoor_table", label: "Preferís mesas de interior" },
  { id: "quiet", label: "Valorás lugares tranquilos" },
  { id: "bright_light", label: "Te importa la luz natural" },
];
