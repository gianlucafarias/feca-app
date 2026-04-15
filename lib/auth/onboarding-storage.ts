import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const PREFIX = "feca.onboarding.done.";

function storageKey(userId: string) {
  return `${PREFIX}${userId}`;
}

export async function isOnboardingComplete(userId: string): Promise<boolean> {
  const key = storageKey(userId);

  if (Platform.OS === "web") {
    return typeof localStorage !== "undefined"
      ? localStorage.getItem(key) === "true"
      : false;
  }

  const value = await SecureStore.getItemAsync(key);
  return value === "true";
}

export async function markOnboardingComplete(userId: string): Promise<void> {
  const key = storageKey(userId);

  if (Platform.OS === "web") {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(key, "true");
    }
    return;
  }

  await SecureStore.setItemAsync(key, "true");
}
