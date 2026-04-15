import { useCallback, useEffect, useState } from "react";

import { fetchNearbyPlaces } from "@/lib/api/places";
import type { NearbyPlace } from "@/types/places";

export function useNearbyPlaces(options: {
  accessToken: string | undefined;
  lat?: number;
  lng?: number;
  limit?: number;
}) {
  const { accessToken, lat, lng, limit = 16 } = options;
  const [places, setPlaces] = useState<NearbyPlace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!accessToken) {
      setPlaces([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    setError(null);
    setIsLoading(true);
    try {
      const results = await fetchNearbyPlaces({
        accessToken,
        lat,
        lng,
        limit,
      });
      setPlaces(results);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "No se pudieron cargar los lugares";
      setError(message);
      setPlaces([]);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, lat, lng, limit]);

  useEffect(() => {
    void load();
  }, [load]);

  const refresh = useCallback(() => {
    void load();
  }, [load]);

  return { places, isLoading, error, refresh };
}
