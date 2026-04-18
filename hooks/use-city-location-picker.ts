import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  fetchCitiesAutocomplete,
  fetchCityReverseFromCoords,
  type ApiCanonicalCity,
} from "@/lib/api/cities";

type ExpoLocationModule = typeof import("expo-location");

export type CityLocationDraft = {
  city: string;
  displayName?: string;
  cityGooglePlaceId?: string;
  lat?: number;
  lng?: number;
};

function createSessionToken(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") {
    return c.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    const v = ch === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

async function loadExpoLocation(): Promise<ExpoLocationModule> {
  return import("expo-location");
}

/**
 * Si el autocomplete no trae centro (lat/lng), el perfil y /places/nearby quedan sin ancla.
 * Fallback al geocodificador nativo (no es la ciudad canónica del backend, solo aproximación para mapa).
 */
async function geocodeCityLabel(
  label: string,
): Promise<{ lat: number; lng: number } | null> {
  const q = label.trim();
  if (q.length < 2) {
    return null;
  }
  try {
    const Location = await loadExpoLocation();
    const results = await Location.geocodeAsync(q);
    const first = results[0];
    if (
      !first ||
      !Number.isFinite(first.latitude) ||
      !Number.isFinite(first.longitude)
    ) {
      return null;
    }
    return { lat: first.latitude, lng: first.longitude };
  } catch {
    return null;
  }
}

function mapLocationNativeError(error: unknown): Error {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("ExpoLocation") || message.includes("native module")) {
    return new Error(
      "Actualizá la app de desarrollo (npx expo run:android) para usar mapas y ubicación.",
    );
  }
  return error instanceof Error ? error : new Error(message);
}

export type UseCityLocationPickerOptions = {
  /** Requerido para autocomplete y reverse vía FECA. */
  accessToken?: string;
  initialCity: string;
  initialLat?: number;
  initialLng?: number;
  initialCityGooglePlaceId?: string;
  /**
   * Solo para sheets: al cambiar (p. ej. cada vez que se abre), se cargan de nuevo initial*.
   * En onboarding omitir: el estado no se pisa cuando cambian las props.
   */
  resetKey?: string | number | null;
  onDraftChange?: (draft: CityLocationDraft) => void;
};

export function useCityLocationPicker(options: UseCityLocationPickerOptions) {
  const {
    accessToken,
    initialCity,
    initialLat,
    initialLng,
    initialCityGooglePlaceId,
    resetKey,
    onDraftChange,
  } = options;

  const [cityInput, setCityInput] = useState(initialCity);
  const [draft, setDraft] = useState<CityLocationDraft>({
    city: initialCity.trim(),
    displayName: initialCity.trim() || undefined,
    cityGooglePlaceId: initialCityGooglePlaceId,
    lat: initialLat,
    lng: initialLng,
  });

  const [isLocating, setIsLocating] = useState(false);
  const [isResolvingCity, setIsResolvingCity] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<ApiCanonicalCity[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);
  /** Evita disparar autocomplete al abrir el sheet con el input ya cargado; se activa al enfocar o editar. */
  const [citySearchArmed, setCitySearchArmed] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState(cityInput);

  const sessionTokenRef = useRef(createSessionToken());
  /** Sesgo opcional para autocomplete; en ref para no re-disparar el fetch al cambiar solo coords. */
  const biasLatRef = useRef(initialLat);
  const biasLngRef = useRef(initialLng);
  const suggestionsAbortRef = useRef<AbortController | null>(null);
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastResolvedLabelRef = useRef<string | null>(null);
  const lastAppliedResetKey = useRef<string | number | null | undefined>(
    undefined,
  );

  const cityApiEnabled = Boolean(accessToken);

  useEffect(() => {
    biasLatRef.current = initialLat;
    biasLngRef.current = initialLng;
  }, [initialLat, initialLng]);

  useEffect(() => {
    if (resetKey == null) {
      return;
    }
    if (lastAppliedResetKey.current === resetKey) {
      return;
    }
    lastAppliedResetKey.current = resetKey;
    setCitySearchArmed(false);
    setCityInput(initialCity);
    setDraft({
      city: initialCity.trim(),
      displayName: initialCity.trim() || undefined,
      cityGooglePlaceId: initialCityGooglePlaceId,
      lat: initialLat,
      lng: initialLng,
    });
    lastResolvedLabelRef.current = null;
    setSubmitError(null);
    setSuggestionsError(null);
    setSuggestions([]);
  }, [
    resetKey,
    initialCity,
    initialLat,
    initialLng,
    initialCityGooglePlaceId,
  ]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(cityInput), 420);
    return () => clearTimeout(t);
  }, [cityInput]);

  useEffect(() => {
    const q = debouncedQuery.trim();
    if (!citySearchArmed || !cityApiEnabled || q.length < 2) {
      setSuggestions([]);
      setSuggestionsLoading(false);
      setSuggestionsError(null);
      return;
    }

    if (
      lastResolvedLabelRef.current &&
      q === lastResolvedLabelRef.current.trim()
    ) {
      setSuggestions([]);
      setSuggestionsLoading(false);
      setSuggestionsError(null);
      return;
    }

    suggestionsAbortRef.current?.abort();
    const ac = new AbortController();
    suggestionsAbortRef.current = ac;
    setSuggestionsLoading(true);
    setSuggestionsError(null);

    void (async () => {
      try {
        const list = await fetchCitiesAutocomplete(accessToken!, {
          q,
          limit: 10,
          lat: biasLatRef.current,
          lng: biasLngRef.current,
          sessionToken: sessionTokenRef.current,
          signal: ac.signal,
        });
        if (!ac.signal.aborted) {
          setSuggestions(list);
          setSuggestionsError(null);
        }
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }
        if (!ac.signal.aborted) {
          setSuggestions([]);
          setSuggestionsError(
            error instanceof Error
              ? error.message
              : "No se pudieron cargar las ciudades.",
          );
        }
      } finally {
        if (!ac.signal.aborted) {
          setSuggestionsLoading(false);
        }
      }
    })();

    return () => ac.abort();
  }, [debouncedQuery, citySearchArmed, cityApiEnabled, accessToken]);

  const clearBlurTimer = useCallback(() => {
    if (blurTimerRef.current) {
      clearTimeout(blurTimerRef.current);
      blurTimerRef.current = null;
    }
  }, []);

  const emitDraft = useCallback(
    (next: CityLocationDraft) => {
      setDraft(next);
      onDraftChange?.(next);
    },
    [onDraftChange],
  );

  const onChangeCityText = useCallback(
    (value: string) => {
      lastResolvedLabelRef.current = null;
      setCitySearchArmed(true);
      setCityInput(value);
      startTransition(() => {
        emitDraft({
          city: value,
          displayName: undefined,
          cityGooglePlaceId: undefined,
          lat: undefined,
          lng: undefined,
        });
      });
    },
    [emitDraft],
  );

  const onPickCitySuggestion = useCallback(
    async (item: ApiCanonicalCity) => {
      clearBlurTimer();
      setSuggestions([]);
      setSuggestionsError(null);
      setSubmitError(null);
      setIsResolvingCity(true);

      try {
        setCitySearchArmed(true);
        lastResolvedLabelRef.current = item.displayName;
        setCityInput(item.displayName);

        let lat = item.lat ?? biasLatRef.current;
        let lng = item.lng ?? biasLngRef.current;
        const coordsOk =
          lat != null &&
          lng != null &&
          Number.isFinite(lat) &&
          Number.isFinite(lng);

        if (!coordsOk) {
          const geo =
            (await geocodeCityLabel(item.displayName)) ??
            (await geocodeCityLabel(item.city));
          if (geo) {
            lat = geo.lat;
            lng = geo.lng;
          } else {
            setSubmitError(
              "No pudimos obtener el centro de la ciudad para el mapa. Probá «Usar mi ubicación actual».",
            );
            return;
          }
        }

        emitDraft({
          city: item.city,
          displayName: item.displayName,
          cityGooglePlaceId: item.cityGooglePlaceId,
          lat,
          lng,
        });
        sessionTokenRef.current = createSessionToken();
      } catch (error) {
        setSubmitError(
          error instanceof Error
            ? error.message
            : "No se pudo cargar la ciudad.",
        );
      } finally {
        setIsResolvingCity(false);
      }
    },
    [clearBlurTimer, emitDraft],
  );

  const resolvedCityLabel = useMemo(
    () =>
      draft.displayName?.trim() ||
      draft.city.trim() ||
      cityInput.trim() ||
      "",
    [draft.city, draft.displayName, cityInput],
  );

  const fillFromCurrentLocation = useCallback(async () => {
    if (!accessToken) {
      setSubmitError("Iniciá sesión para usar la ubicación con FECA.");
      return;
    }

    setSubmitError(null);
    setIsLocating(true);

    try {
      const Location = await loadExpoLocation();
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        throw new Error(
          "Necesitamos permiso de ubicación para detectar tu ciudad.",
        );
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const canonical = await fetchCityReverseFromCoords(
        accessToken,
        position.coords.latitude,
        position.coords.longitude,
      );

      setCitySearchArmed(true);
      lastResolvedLabelRef.current = canonical.displayName;
      setCityInput(canonical.displayName);
      emitDraft({
        city: canonical.city,
        displayName: canonical.displayName,
        cityGooglePlaceId: canonical.cityGooglePlaceId,
        lat: canonical.lat,
        lng: canonical.lng,
      });
    } catch (error) {
      setSubmitError(mapLocationNativeError(error).message);
    } finally {
      setIsLocating(false);
    }
  }, [accessToken, emitDraft]);

  const resolveCoordinates = useCallback(async () => {
    const city = draft.city.trim();
    const id = draft.cityGooglePlaceId?.trim();
    if (
      !city ||
      !id ||
      draft.lat == null ||
      draft.lng == null ||
      !Number.isFinite(draft.lat) ||
      !Number.isFinite(draft.lng)
    ) {
      throw new Error(
        "Elegí una ciudad de la lista o usá tu ubicación actual.",
      );
    }

    return {
      city,
      cityGooglePlaceId: id,
      lat: draft.lat,
      lng: draft.lng,
      displayName: draft.displayName?.trim() || city,
    };
  }, [draft.city, draft.cityGooglePlaceId, draft.displayName, draft.lat, draft.lng]);

  const setFieldBlur = useCallback(() => {
    blurTimerRef.current = setTimeout(() => {
      setSuggestions([]);
    }, 200);
  }, []);

  const setFieldFocus = useCallback(() => {
    clearBlurTimer();
    setCitySearchArmed(true);
  }, [clearBlurTimer]);

  const applyResolvedCity = useCallback(
    (entry: {
      label: string;
      city: string;
      cityGooglePlaceId: string;
      lat: number;
      lng: number;
    }) => {
      setCitySearchArmed(true);
      lastResolvedLabelRef.current = entry.label;
      setCityInput(entry.label);
      emitDraft({
        city: entry.city,
        displayName: entry.label,
        cityGooglePlaceId: entry.cityGooglePlaceId,
        lat: entry.lat,
        lng: entry.lng,
      });
      setSuggestions([]);
      setSubmitError(null);
    },
    [emitDraft],
  );

  return {
    applyResolvedCity,
    cityInput,
    clearBlurTimer,
    draft,
    fillFromCurrentLocation,
    isLocating,
    isResolvingCity,
    onChangeCityText,
    onPickCitySuggestion,
    /** Autocomplete de ciudades vía FECA (requiere `accessToken`). */
    cityApiEnabled,
    resolveCoordinates,
    resolvedCityLabel,
    setFieldBlur,
    setFieldFocus,
    setSubmitError,
    submitError,
    suggestions,
    suggestionsError,
    suggestionsLoading,
  };
}
