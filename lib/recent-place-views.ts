import AsyncStorage from "@react-native-async-storage/async-storage";

import type { NearbyPlace } from "@/types/places";
import type { PlaceDetail } from "@/types/places";

const STORAGE_KEY = "feca.recentPlaceProfileViews.v1";
const MAX_ITEMS = 7;

type StoredEntry = NearbyPlace & { viewedAt: string };

function toNearbyPlace(row: StoredEntry): NearbyPlace {
  const { viewedAt: _v, ...place } = row;
  return {
    ...place,
    types: place.types ?? [],
  };
}

export async function loadRecentPlaceViews(): Promise<NearbyPlace[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .filter(
        (x): x is StoredEntry =>
          Boolean(x) &&
          typeof x === "object" &&
          typeof (x as StoredEntry).googlePlaceId === "string" &&
          typeof (x as StoredEntry).name === "string",
      )
      .map(toNearbyPlace);
  } catch {
    return [];
  }
}

export async function recordRecentPlaceViewFromDetail(
  detail: PlaceDetail,
): Promise<void> {
  const gid = detail.googlePlaceId?.trim();
  if (!gid) {
    return;
  }

  const entry: StoredEntry = {
    googlePlaceId: gid,
    name: detail.name,
    address: detail.address,
    lat: detail.lat,
    lng: detail.lng,
    types: detail.types ?? [],
    primaryType: detail.primaryType,
    photoUrl: detail.photoUrl,
    rating: detail.rating,
    userRatingCount: detail.userRatingCount,
    openNow: detail.openNow,
    openingChip: detail.openingChip,
    socialChips: detail.socialChips,
    viewedAt: new Date().toISOString(),
  };

  try {
    const prev = await AsyncStorage.getItem(STORAGE_KEY);
    let list: StoredEntry[] = [];
    if (prev) {
      const parsed = JSON.parse(prev) as unknown;
      if (Array.isArray(parsed)) {
        list = parsed.filter(
          (x): x is StoredEntry =>
            Boolean(x) &&
            typeof x === "object" &&
            typeof (x as StoredEntry).googlePlaceId === "string",
        );
      }
    }
    list = list.filter((x) => x.googlePlaceId !== gid);
    list.unshift(entry);
    list = list.slice(0, MAX_ITEMS);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}
