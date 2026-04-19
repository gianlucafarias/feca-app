import { useCallback, useEffect, useState } from "react";

import { logCityChange } from "@/lib/debug/city-change-debug";
import { fetchNearbyPlaces } from "@/lib/api/places";
import type { NearbyPlace } from "@/types/places";

export function useNearbyPlaces(options: {
  accessToken: string | undefined;
  lat?: number;
  lng?: number;
  cityGooglePlaceId?: string;
  limit?: number;
  /** Variante `GET /v1/places/nearby` (home u otras pantallas). */
  homeFeedVariant?:
    | "home_city"
    | "home_network"
    | "home_nearby"
    | "home_open_now"
    | "home_friends_liked";
}) {
  const { accessToken, lat, lng, cityGooglePlaceId, limit = 16, homeFeedVariant } =
    options;
  const [places, setPlaces] = useState<NearbyPlace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (rotateAt?: number) => {
      if (!accessToken) {
        setPlaces([]);
        setIsLoading(false);
        setError(null);
        return;
      }

      setError(null);
      setIsLoading(true);
      try {
        logCityChange("useNearbyPlaces fetch", {
          lat,
          lng,
          cityGooglePlaceId: cityGooglePlaceId ?? null,
          limit,
          homeFeedVariant: homeFeedVariant ?? null,
          rotate: rotateAt ?? null,
        });
        const results = await fetchNearbyPlaces({
          accessToken,
          lat,
          lng,
          limit,
          ...(homeFeedVariant ? { variant: homeFeedVariant } : {}),
          ...(rotateAt != null && rotateAt > 0 ? { rotate: rotateAt } : {}),
        });
        logCityChange("useNearbyPlaces respuesta", { count: results.length });
        setPlaces(results);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "No se pudieron cargar los lugares";
        setError(message);
        setPlaces([]);
      } finally {
        setIsLoading(false);
      }
    },
    [accessToken, cityGooglePlaceId, homeFeedVariant, lat, lng, limit],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const refresh = useCallback(() => {
    void load(Date.now());
  }, [load]);

  return { places, isLoading, error, refresh };
}
