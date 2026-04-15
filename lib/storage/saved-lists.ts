import AsyncStorage from "@react-native-async-storage/async-storage";

import type { SavedListItem, SavedListRecord } from "@/types/saved-lists";

const STORAGE_KEY = "@feca/saved-lists/v2";

/** Lista local para reseñas y planes bajo “Quiero ir” (los lugares van por API). */
export const LOCAL_QUIERO_IR_ID = "local-quiero-ir";

type Persisted = {
  lists: SavedListRecord[];
};

function newId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function itemKey(item: SavedListItem): string {
  if (item.kind === "place") {
    return `place:${item.googlePlaceId}`;
  }
  if (item.kind === "visit") {
    return `visit:${item.visitId}`;
  }
  return `group:${item.groupId}`;
}

export async function loadCustomLists(): Promise<SavedListRecord[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const seed = [seedQuieroIrLocal()];
    await persist(seed);
    return seed;
  }
  try {
    const p = JSON.parse(raw) as Persisted;
    let lists = Array.isArray(p.lists) ? p.lists : [];
    if (!lists.some((l) => l.id === LOCAL_QUIERO_IR_ID)) {
      lists = sortLists([seedQuieroIrLocal(), ...lists]);
      await persist(lists);
    } else {
      lists = sortLists(lists);
    }
    return lists;
  } catch {
    const seed = [seedQuieroIrLocal()];
    await persist(seed);
    return seed;
  }
}

function seedQuieroIrLocal(): SavedListRecord {
  return {
    id: LOCAL_QUIERO_IR_ID,
    title: "Quiero ir",
    emoji: "🧭",
    items: [],
    createdAt: new Date(0).toISOString(),
  };
}

function sortLists(lists: SavedListRecord[]): SavedListRecord[] {
  return [...lists].sort((a, b) => {
    if (a.id === LOCAL_QUIERO_IR_ID) {
      return -1;
    }
    if (b.id === LOCAL_QUIERO_IR_ID) {
      return 1;
    }
    return b.createdAt.localeCompare(a.createdAt);
  });
}

async function persist(lists: SavedListRecord[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ lists }));
}

export async function createCustomList(
  title: string,
  emoji: string,
): Promise<SavedListRecord> {
  const lists = await loadCustomLists();
  const record: SavedListRecord = {
    id: newId("lst"),
    title: title.trim() || "Sin título",
    emoji: emoji.trim() || "📋",
    items: [],
    createdAt: new Date().toISOString(),
  };
  await persist(sortLists([...lists, record]));
  return record;
}

export async function addItemToList(
  listId: string,
  item: SavedListItem,
): Promise<void> {
  const lists = await loadCustomLists();
  const list = lists.find((l) => l.id === listId);
  if (!list) {
    throw new Error("Lista no encontrada");
  }
  const key = itemKey(item);
  if (list.items.some((i) => itemKey(i) === key)) {
    return;
  }
  list.items.push(item);
  await persist(lists);
}

export async function removeItemFromList(
  listId: string,
  item: SavedListItem,
): Promise<void> {
  const lists = await loadCustomLists();
  const list = lists.find((l) => l.id === listId);
  if (!list) {
    return;
  }
  const key = itemKey(item);
  list.items = list.items.filter((i) => itemKey(i) !== key);
  await persist(lists);
}

export function listHasItem(
  list: SavedListRecord,
  item: SavedListItem,
): boolean {
  const key = itemKey(item);
  return list.items.some((i) => itemKey(i) === key);
}

export async function deleteCustomList(listId: string): Promise<void> {
  if (listId === LOCAL_QUIERO_IR_ID) {
    return;
  }
  const lists = (await loadCustomLists()).filter((l) => l.id !== listId);
  await persist(lists);
}
