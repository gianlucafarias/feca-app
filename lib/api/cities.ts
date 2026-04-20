import { FECA_PLACES_ORIGIN_HEADER, getApiBaseUrl, parseError } from "./base";

function buildCityHeaders(accessToken: string, origin?: string) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
  };
  if (origin?.trim()) {
    headers[FECA_PLACES_ORIGIN_HEADER] = origin.trim();
  }
  return headers;
}

/** Ciudad canónica (FECA / Google Place de localidad). */
export type ApiCanonicalCity = {
  city: string;
  displayName: string;
  cityGooglePlaceId: string;
  /** Algunos backends omiten coords en autocomplete; el hook completa con sesgo al elegir. */
  lat?: number;
  lng?: number;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object";
}

function pickCityList(raw: unknown): unknown[] {
  if (Array.isArray(raw)) {
    return raw;
  }
  if (!isRecord(raw)) {
    return [];
  }
  const nested =
    raw.cities ??
    raw.items ??
    raw.results ??
    raw.data ??
    raw.suggestions ??
    raw.predictions;
  return Array.isArray(nested) ? nested : [];
}

/** Backend: limit entre 1 y 10 (class-validator). */
function clampAutocompleteLimit(n: number | undefined): number {
  if (n == null || !Number.isFinite(n)) {
    return 10;
  }
  return Math.min(10, Math.max(1, Math.floor(n)));
}

function readCoord(...candidates: unknown[]): number | undefined {
  for (const c of candidates) {
    const n = Number(c);
    if (Number.isFinite(n)) {
      return n;
    }
  }
  return undefined;
}

function mapToCanonicalCity(row: unknown): ApiCanonicalCity | null {
  if (!isRecord(row)) {
    return null;
  }
  const cityGooglePlaceId = String(
    row.cityGooglePlaceId ??
      row.city_google_place_id ??
      row.googlePlaceId ??
      row.google_place_id ??
      row.placeId ??
      row.place_id ??
      "",
  ).trim();
  const city = String(row.city ?? row.name ?? row.shortName ?? "").trim();
  const displayName = String(
    row.displayName ?? row.display_name ?? row.label ?? row.description ?? city,
  ).trim();

  let lat = readCoord(row.lat, row.latitude);
  let lng = readCoord(row.lng, row.longitude, row.lon);
  const loc = row.location;
  if (isRecord(loc)) {
    const lLat = readCoord(loc.lat, loc.latitude);
    const lLng = readCoord(loc.lng, loc.longitude, loc.lon);
    if (lat == null) {
      lat = lLat;
    }
    if (lng == null) {
      lng = lLng;
    }
  }
  const geo = row.geometry;
  if (isRecord(geo) && isRecord(geo.location)) {
    const g = geo.location;
    if (lat == null) {
      lat = readCoord(g.lat, g.latitude);
    }
    if (lng == null) {
      lng = readCoord(g.lng, g.longitude, g.lon);
    }
  }

  if (!cityGooglePlaceId || !city) {
    return null;
  }
  const label = displayName || city;

  const out: ApiCanonicalCity = { city, displayName: label, cityGooglePlaceId };
  if (lat != null && lng != null) {
    out.lat = lat;
    out.lng = lng;
  }
  return out;
}

/**
 * Tras elegir una fila del autocomplete (sin lat/lng), el backend exige resolver coords canónicas.
 * GET /v1/cities/resolve?cityGooglePlaceId=... — solo ese query param (camelCase).
 */
export async function fetchCityResolve(
  accessToken: string,
  cityGooglePlaceId: string,
  options?: { signal?: AbortSignal; origin?: string },
): Promise<ApiCanonicalCity> {
  const id = cityGooglePlaceId.trim();
  if (!id) {
    throw new Error("Falta cityGooglePlaceId para resolver la ciudad.");
  }

  const params = new URLSearchParams();
  params.set("cityGooglePlaceId", id);

  const response = await fetch(
    `${getApiBaseUrl()}/v1/cities/resolve?${params.toString()}`,
    {
      headers: buildCityHeaders(accessToken, options?.origin),
      signal: options?.signal,
    },
  );

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: unknown = await response.json();
  const row =
    isRecord(data) && "city" in data ? (data as { city: unknown }).city : data;
  const m = mapToCanonicalCity(row);
  if (!m || m.lat == null || m.lng == null) {
    throw new Error("No se pudo resolver la ciudad canónica.");
  }
  return m;
}

export async function fetchCitiesAutocomplete(
  accessToken: string,
  options: {
    q: string;
    limit?: number;
    lat?: number;
    lng?: number;
    sessionToken?: string;
    signal?: AbortSignal;
    origin?: string;
  },
): Promise<ApiCanonicalCity[]> {
  const params = new URLSearchParams();
  params.set("q", options.q.trim());
  params.set("limit", String(clampAutocompleteLimit(options.limit)));

  const { lat, lng } = options;
  if (
    lat != null &&
    lng != null &&
    Number.isFinite(lat) &&
    Number.isFinite(lng)
  ) {
    params.set("lat", String(lat));
    params.set("lng", String(lng));
  }

  const sessionToken = options.sessionToken?.trim();
  if (sessionToken) {
    params.set("sessionToken", sessionToken);
  }

  const response = await fetch(
    `${getApiBaseUrl()}/v1/cities/autocomplete?${params.toString()}`,
    {
      headers: buildCityHeaders(accessToken, options.origin),
      signal: options.signal,
    },
  );

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data: unknown = await response.json();
  const list = pickCityList(data);
  const out: ApiCanonicalCity[] = [];
  for (const row of list) {
    const m = mapToCanonicalCity(row);
    if (m) {
      out.push(m);
    }
  }
  return out;
}

export async function fetchCityReverseFromCoords(
  accessToken: string,
  lat: number,
  lng: number,
  options?: { signal?: AbortSignal; origin?: string },
): Promise<ApiCanonicalCity> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error("Coordenadas inválidas para resolver la ciudad.");
  }

  const params = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
  });

  const response = await fetch(
    `${getApiBaseUrl()}/v1/cities/reverse?${params.toString()}`,
    {
      headers: buildCityHeaders(accessToken, options?.origin),
      signal: options?.signal,
    },
  );

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data = (await response.json()) as { city?: ApiCanonicalCity };
  if (!data.city) {
    throw new Error("No se pudo resolver la ciudad.");
  }
  return data.city;
}
