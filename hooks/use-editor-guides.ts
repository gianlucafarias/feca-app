import { useCallback, useEffect, useState } from "react";

import { fetchHomeEditorGuides } from "@/lib/api/editor-guides";
import type { ApiDiary } from "@/types/api";

export function useEditorGuides(options: {
  accessToken: string | undefined;
  limit?: number;
}) {
  const { accessToken, limit = 20 } = options;
  const [diaries, setDiaries] = useState<ApiDiary[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!accessToken) {
      setDiaries([]);
      setTotal(0);
      setIsLoading(false);
      setError(null);
      return;
    }

    setError(null);
    try {
      const res = await fetchHomeEditorGuides(accessToken, { limit });
      setDiaries(res.diaries ?? []);
      setTotal(res.total ?? 0);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "No se pudieron cargar las guías";
      setError(message);
      setDiaries([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, limit]);

  useEffect(() => {
    setIsLoading(true);
    void load();
  }, [load]);

  const refresh = useCallback(() => {
    setIsLoading(true);
    void load();
  }, [load]);

  return { diaries, total, isLoading, error, refresh };
}
