import { useCallback, useEffect, useState } from "react";

import { fetchFeed } from "@/lib/api/visits";
import { mapApiVisitToVisit } from "@/lib/visits/map-api-visit";
import type { ApiFeedItem } from "@/types/api";
import type { FeedItem, FeedMode } from "@/types/feca";

function mapApiToFeedItems(items: ApiFeedItem[]): FeedItem[] {
  return items.map((item) => ({
    id: item.id,
    visit: mapApiVisitToVisit(item.visit),
    summary: item.summary ?? "",
    reasonLine:
      item.appearanceReason?.trim() ||
      item.summary?.trim() ||
      undefined,
  }));
}

export function useHomeFeed(options: {
  accessToken: string | undefined;
  mode: FeedMode;
  lat?: number;
  lng?: number;
}) {
  const { accessToken, mode, lat, lng } = options;
  const [apiItems, setApiItems] = useState<FeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFromApi = useCallback(async () => {
    if (!accessToken) {
      setApiItems([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    setError(null);
    try {
      const { items } = await fetchFeed(accessToken, {
        limit: 30,
        mode,
        lat,
        lng,
      });
      setApiItems(mapApiToFeedItems(items));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "No se pudo cargar el feed";
      setError(message);
      setApiItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, lat, lng, mode]);

  useEffect(() => {
    setIsLoading(true);
    void loadFromApi();
  }, [loadFromApi]);

  const refresh = useCallback(() => {
    setIsLoading(true);
    void loadFromApi();
  }, [loadFromApi]);

  const showTrustFallbackInvite =
    mode === "network" &&
    Boolean(accessToken) &&
    apiItems.length === 0 &&
    !isLoading &&
    !error;

  return {
    listData: apiItems,
    isLoading,
    error,
    refresh,
    showTrustFallbackInvite,
  };
}

export const FEED_MODE_LABELS: Record<
  FeedMode,
  { title: string; hint: string }
> = {
  network: {
    title: "Tu red",
    hint: "Visitas y señales de quienes te importan",
  },
  nearby: {
    title: "Cerca tuyo",
    hint: "Lugares en tu radio con contexto",
  },
  now: {
    title: "Para ahora",
    hint: "Según horario y momento del día",
  },
};
