import AsyncStorage from "@react-native-async-storage/async-storage";

import { FALLBACK_TASTE_OPTIONS } from "@/lib/taste-options";
import type { TasteProfileState } from "@/types/feca";

const STORAGE_KEY = "@feca/taste-profile-v1";

const defaultState = (): TasteProfileState => ({
  selectedIds: [],
});

export async function loadTasteProfile(): Promise<TasteProfileState> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as Partial<TasteProfileState>;
    if (!parsed || !Array.isArray(parsed.selectedIds)) return defaultState();
    const valid = new Set(FALLBACK_TASTE_OPTIONS.map((o) => o.id));
    return {
      selectedIds: parsed.selectedIds.filter((id) => valid.has(id)),
    };
  } catch {
    return defaultState();
  }
}

export async function saveTasteProfile(state: TasteProfileState): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
