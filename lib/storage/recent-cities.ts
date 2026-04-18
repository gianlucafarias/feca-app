import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "@feca/recent-cities";
const MAX_ITEMS = 8;

export type RecentCityEntry = {
  /** Texto mostrado en chips (típicamente `displayName` de FECA). */
  label: string;
  city: string;
  cityGooglePlaceId: string;
  lat: number;
  lng: number;
};

function normalizeLabel(label: string) {
  return label.trim().toLowerCase();
}

function parseEntry(row: unknown): RecentCityEntry | null {
  if (!row || typeof row !== "object") {
    return null;
  }
  const o = row as Record<string, unknown>;
  const label = typeof o.label === "string" ? o.label : "";
  const city = typeof o.city === "string" ? o.city : "";
  const cityGooglePlaceIdRaw =
    typeof o.cityGooglePlaceId === "string"
      ? o.cityGooglePlaceId
      : typeof o.placeId === "string"
        ? o.placeId
        : "";
  const lat = typeof o.lat === "number" ? o.lat : Number.NaN;
  const lng = typeof o.lng === "number" ? o.lng : Number.NaN;
  if (
    !label ||
    !city ||
    !cityGooglePlaceIdRaw ||
    Number.isNaN(lat) ||
    Number.isNaN(lng)
  ) {
    return null;
  }
  return {
    label: label.trim(),
    city: city.trim(),
    cityGooglePlaceId: cityGooglePlaceIdRaw,
    lat,
    lng,
  };
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
      const entry = parseEntry(row);
      if (entry) {
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
  const key = normalizeLabel(entry.cityGooglePlaceId);
  const withoutDup = prev.filter(
    (p) => normalizeLabel(p.cityGooglePlaceId) !== key,
  );
  const next = [
    {
      label: entry.label.trim(),
      city: entry.city.trim(),
      cityGooglePlaceId: entry.cityGooglePlaceId,
      lat: entry.lat,
      lng: entry.lng,
    },
    ...withoutDup,
  ].slice(0, MAX_ITEMS);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}
