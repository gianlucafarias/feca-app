/**
 * Google Places API (New): autocompletado de ciudades + detalle para lat/lng.
 * Requiere EXPO_PUBLIC_GOOGLE_PLACES_API_KEY y "Places API (New)" habilitada en Google Cloud.
 */

const PLACES_V1 = "https://places.googleapis.com/v1";

export type CitySuggestion = {
  placeId: string;
  label: string;
};

export function getGooglePlacesApiKey(): string | undefined {
  return process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY?.trim() || undefined;
}

type AutocompleteWire = {
  suggestions?: Array<{
    placePrediction?: {
      placeId: string;
      text?: { text?: string };
    };
  }>;
};

type PlaceDetailsWire = {
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
};

export async function fetchCitySuggestions(
  input: string,
  sessionToken: string,
  signal?: AbortSignal,
): Promise<CitySuggestion[]> {
  const key = getGooglePlacesApiKey();
  const q = input.trim();
  if (!key || q.length < 2) {
    return [];
  }

  const res = await fetch(`${PLACES_V1}/places:autocomplete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
    },
    body: JSON.stringify({
      input: q,
      includedPrimaryTypes: ["(cities)"],
      languageCode: "es",
      sessionToken,
    }),
    signal,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Places Autocomplete: ${res.status} ${body}`);
  }

  const data = (await res.json()) as AutocompleteWire;
  const suggestions = data.suggestions ?? [];

  const out: CitySuggestion[] = [];
  for (const s of suggestions) {
    const p = s.placePrediction;
    if (!p?.placeId) continue;
    const label = p.text?.text?.trim();
    if (!label) continue;
    out.push({ placeId: p.placeId, label });
  }
  return out;
}

export async function fetchCityPlaceDetails(
  placeId: string,
  sessionToken: string,
  signal?: AbortSignal,
): Promise<{ cityLabel: string; lat: number; lng: number }> {
  const key = getGooglePlacesApiKey();
  if (!key) {
    throw new Error("Falta EXPO_PUBLIC_GOOGLE_PLACES_API_KEY.");
  }

  const url = new URL(`${PLACES_V1}/places/${encodeURIComponent(placeId)}`);
  url.searchParams.set("sessionToken", sessionToken);

  const res = await fetch(url.toString(), {
    headers: {
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": "displayName,formattedAddress,location",
    },
    signal,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Places Details: ${res.status} ${body}`);
  }

  const data = (await res.json()) as PlaceDetailsWire;
  const lat = data.location?.latitude;
  const lng = data.location?.longitude;
  if (lat == null || lng == null) {
    throw new Error("Este lugar no tiene coordenadas disponibles.");
  }

  const cityLabel =
    data.displayName?.text?.trim() ||
    data.formattedAddress?.trim() ||
    "Ciudad";

  return { cityLabel, lat, lng };
}
