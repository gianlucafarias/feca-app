/**
 * Diagnóstico de cambio de ciudad / feed / nearby.
 * - En desarrollo (`__DEV__`) los logs están activos.
 * - En cualquier build: `EXPO_PUBLIC_DEBUG_CITY=1` en `.env` (reiniciar Metro).
 */

function enabled(): boolean {
  try {
    if (typeof __DEV__ !== "undefined" && __DEV__) {
      return true;
    }
  } catch {
    // ignore
  }
  return (
    typeof process !== "undefined" &&
    process.env.EXPO_PUBLIC_DEBUG_CITY === "1"
  );
}

export function logCityChange(
  label: string,
  data?: Record<string, unknown>,
): void {
  if (!enabled()) {
    return;
  }
  const ts = new Date().toISOString();
  if (data) {
    console.log(`[FECA-city ${ts}] ${label}`, data);
  } else {
    console.log(`[FECA-city ${ts}] ${label}`);
  }
}

export function summarizeLocationPayload(input: {
  city?: string;
  cityGooglePlaceId?: string;
  lat?: number;
  lng?: number;
}): Record<string, unknown> {
  return {
    city: input.city?.trim() ?? "",
    cityGooglePlaceId: input.cityGooglePlaceId?.trim() ?? "",
    lat: input.lat,
    lng: input.lng,
  };
}
