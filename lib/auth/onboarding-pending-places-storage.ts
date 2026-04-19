import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export type OnboardingPendingPlace = {
  googlePlaceId: string;
  name: string;
  address: string;
  photoUrl?: string;
};

const keyFor = (userId: string) => `feca.onboarding.v2.threePlaces.${userId}`;

export async function readOnboardingPendingPlaces(
  userId: string,
): Promise<OnboardingPendingPlace[]> {
  const key = keyFor(userId);
  let raw: string | null = null;
  if (Platform.OS === "web") {
    raw =
      typeof localStorage !== "undefined" ? localStorage.getItem(key) : null;
  } else {
    raw = await SecureStore.getItemAsync(key);
  }
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .map((row) => {
        if (!row || typeof row !== "object") {
          return null;
        }
        const o = row as Record<string, unknown>;
        const googlePlaceId =
          typeof o.googlePlaceId === "string" ? o.googlePlaceId : "";
        const name = typeof o.name === "string" ? o.name : "";
        const address = typeof o.address === "string" ? o.address : "";
        if (!googlePlaceId || !name) {
          return null;
        }
        const out: OnboardingPendingPlace = {
          googlePlaceId,
          name,
          address,
        };
        if (typeof o.photoUrl === "string" && o.photoUrl.length > 0) {
          out.photoUrl = o.photoUrl;
        }
        return out;
      })
      .filter((x): x is OnboardingPendingPlace => x != null);
  } catch {
    return [];
  }
}

export async function writeOnboardingPendingPlaces(
  userId: string,
  places: OnboardingPendingPlace[],
): Promise<void> {
  const key = keyFor(userId);
  const raw = JSON.stringify(places);
  if (Platform.OS === "web") {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(key, raw);
    }
    return;
  }
  await SecureStore.setItemAsync(key, raw);
}

export async function clearOnboardingPendingPlaces(userId: string): Promise<void> {
  const key = keyFor(userId);
  if (Platform.OS === "web") {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(key);
    }
    return;
  }
  await SecureStore.deleteItemAsync(key);
}
