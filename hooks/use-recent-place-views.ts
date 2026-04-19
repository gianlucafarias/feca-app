import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";

import { loadRecentPlaceViews } from "@/lib/recent-place-views";
import type { NearbyPlace } from "@/types/places";

export function useRecentPlaceViews() {
  const [places, setPlaces] = useState<NearbyPlace[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const next = await loadRecentPlaceViews();
      setPlaces(next);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  return { places, isLoading, refresh };
}
