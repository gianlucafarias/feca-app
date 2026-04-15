import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import type { AuthSession } from "@/types/auth";

const STORAGE_KEY = "feca.auth.session";

async function getRawValue() {
  if (Platform.OS === "web") {
    return typeof localStorage !== "undefined"
      ? localStorage.getItem(STORAGE_KEY)
      : null;
  }

  return SecureStore.getItemAsync(STORAGE_KEY);
}

async function setRawValue(value: string) {
  if (Platform.OS === "web") {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, value);
    }
    return;
  }

  await SecureStore.setItemAsync(STORAGE_KEY, value);
}

async function removeRawValue() {
  if (Platform.OS === "web") {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
    }
    return;
  }

  await SecureStore.deleteItemAsync(STORAGE_KEY);
}

export async function readStoredSession(): Promise<AuthSession | null> {
  const raw = await getRawValue();
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    await removeRawValue();
    return null;
  }
}

export function writeStoredSession(session: AuthSession) {
  return setRawValue(JSON.stringify(session));
}

export function clearStoredSession() {
  return removeRawValue();
}
