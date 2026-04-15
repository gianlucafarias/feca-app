import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "@feca/recent-cities";
const MAX_ITEMS = 8;

export type RecentCityEntry = {
  label: string;
  lat: number;
  lng: number;
  placeId?: string;
};

function normalizeLabel(label: string) {
  return label.trim().toLowerCase();
}

export async function loadRecentCities(): Promise<RecentCityEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    const out: RecentCityEntry[] = [];
    for (const row of parsed) {
      if (
        row &&
        typeof row === "object" &&
        "label" in row &&
        "lat" in row &&
        "lng" in row
      ) {
        const o = row as Record<string, unknown>;
        const label = typeof o.label === "string" ? o.label : "";
        const lat = typeof o.lat === "number" ? o.lat : Number.NaN;
        const lng = typeof o.lng === "number" ? o.lng : Number.NaN;
        if (!label || Number.isNaN(lat) || Number.isNaN(lng)) {
          continue;
        }
        const entry: RecentCityEntry = { label, lat, lng };
        if (typeof o.placeId === "string") {
          entry.placeId = o.placeId;
        }
        out.push(entry);
      }
    }
    return out;
  } catch {
    return [];
  }
}

export async function rememberCity(entry: RecentCityEntry): Promise<void> {
  const prev = await loadRecentCities();
  const key = normalizeLabel(entry.label);
  const withoutDup = prev.filter((p) => normalizeLabel(p.label) !== key);
  const next = [{ ...entry, label: entry.label.trim() }, ...withoutDup].slice(
    0,
    MAX_ITEMS,
  );
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}
