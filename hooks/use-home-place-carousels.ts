import {
  useCallback,
  useEffect,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

import { logCityChange } from "@/lib/debug/city-change-debug";
import { fetchNearbyPlaces } from "@/lib/api/places";
import type { NearbyPlace } from "@/types/places";

const SECTION_LIMIT = 7;

type SectionState = {
  places: NearbyPlace[];
  isLoading: boolean;
  error: string | null;
};

const emptySection = (): SectionState => ({
  places: [],
  isLoading: true,
  error: null,
});

export function useHomePlaceCarousels(options: {
  accessToken: string | undefined;
  lat?: number;
  lng?: number;
}) {
  const { accessToken, lat, lng } = options;
  const [nearby, setNearby] = useState<SectionState>(emptySection);
  const [openNow, setOpenNow] = useState<SectionState>(emptySection);
  const [friends, setFriends] = useState<SectionState>(emptySection);

  const load = useCallback(
    async (rotateAt?: number) => {
      if (!accessToken) {
        const idle = { places: [], isLoading: false, error: null };
        setNearby(idle);
        setOpenNow(idle);
        setFriends(idle);
        return;
      }

      setNearby((s) => ({ ...s, isLoading: true, error: null }));
      setOpenNow((s) => ({ ...s, isLoading: true, error: null }));
      setFriends((s) => ({ ...s, isLoading: true, error: null }));

      const rotateOpts =
        rotateAt != null && rotateAt > 0 ? { rotate: rotateAt } : {};

      const base = {
        accessToken,
        lat,
        lng,
        limit: SECTION_LIMIT,
        origin: "home_carousels" as const,
        ...rotateOpts,
      };

      logCityChange("useHomePlaceCarousels fetch", { rotate: rotateAt ?? null });

      const run = async (
        variant: "home_nearby" | "home_open_now" | "home_friends_liked",
        set: Dispatch<SetStateAction<SectionState>>,
      ) => {
        try {
          const places = await fetchNearbyPlaces({ ...base, variant });
          set({ places, isLoading: false, error: null });
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "No se pudieron cargar los lugares";
          set({ places: [], isLoading: false, error: message });
        }
      };

      await Promise.all([
        run("home_nearby", setNearby),
        run("home_open_now", setOpenNow),
        run("home_friends_liked", setFriends),
      ]);
    },
    [accessToken, lat, lng],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const refreshAll = useCallback(() => {
    void load(Date.now());
  }, [load]);

  const anyLoading = nearby.isLoading || openNow.isLoading || friends.isLoading;

  return {
    nearby,
    openNow,
    friends,
    refreshAll,
    anyLoading,
  };
}
