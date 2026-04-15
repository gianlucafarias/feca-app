import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";

import { loadCustomLists } from "@/lib/storage/saved-lists";
import type { SavedListRecord } from "@/types/saved-lists";

export function useSavedLists() {
  const [lists, setLists] = useState<SavedListRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await loadCustomLists();
      setLists(data);
    } catch {
      setLists([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  return { lists, loading, refresh };
}
