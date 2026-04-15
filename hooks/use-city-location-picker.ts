import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  fetchCityPlaceDetails,
  fetchCitySuggestions,
  getGooglePlacesApiKey,
  type CitySuggestion,
} from "@/lib/google/places-city-autocomplete";

type ExpoLocationModule = typeof import("expo-location");

export type CityLocationDraft = {
  city: string;
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
  initialCity: string;
  initialLat?: number;
  initialLng?: number;
  /**
   * Solo para sheets: al cambiar (p. ej. cada vez que se abre), se cargan de nuevo initial*.
   * En onboarding omitir: el estado no se pisa cuando cambian las props.
   */
  resetKey?: string | number | null;
  onDraftChange?: (draft: CityLocationDraft) => void;
};

export function useCityLocationPicker(options: UseCityLocationPickerOptions) {
  const {
    initialCity,
    initialLat,
    initialLng,
    resetKey,
    onDraftChange,
  } = options;

  const [cityInput, setCityInput] = useState(initialCity);
  const [draft, setDraft] = useState<CityLocationDraft>({
    city: initialCity.trim(),
    lat: initialLat,
    lng: initialLng,
  });

  const [isLocating, setIsLocating] = useState(false);
  const [isResolvingCity, setIsResolvingCity] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<CitySuggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState(cityInput);

  const sessionTokenRef = useRef(createSessionToken());
  const suggestionsAbortRef = useRef<AbortController | null>(null);
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastResolvedFromPlacesRef = useRef<string | null>(null);
  const lastAppliedResetKey = useRef<string | number | null | undefined>(
    undefined,
  );

  const placesEnabled = Boolean(getGooglePlacesApiKey());

  useEffect(() => {
    if (resetKey == null) {
      return;
    }
    if (lastAppliedResetKey.current === resetKey) {
      return;
    }
    lastAppliedResetKey.current = resetKey;
    setCityInput(initialCity);
    setDraft({
      city: initialCity.trim(),
      lat: initialLat,
      lng: initialLng,
    });
    lastResolvedFromPlacesRef.current = null;
    setSubmitError(null);
    setSuggestions([]);
  }, [resetKey, initialCity, initialLat, initialLng]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(cityInput), 320);
    return () => clearTimeout(t);
  }, [cityInput]);

  useEffect(() => {
    const q = debouncedQuery.trim();
    if (!placesEnabled || q.length < 2) {
      setSuggestions([]);
      setSuggestionsLoading(false);
      return;
    }

    if (
      lastResolvedFromPlacesRef.current &&
      q === lastResolvedFromPlacesRef.current.trim()
    ) {
      setSuggestions([]);
      setSuggestionsLoading(false);
      return;
    }

    suggestionsAbortRef.current?.abort();
    const ac = new AbortController();
    suggestionsAbortRef.current = ac;
    setSuggestionsLoading(true);

    void (async () => {
      try {
        const list = await fetchCitySuggestions(
          q,
          sessionTokenRef.current,
          ac.signal,
        );
        if (!ac.signal.aborted) {
          setSuggestions(list);
        }
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }
        if (!ac.signal.aborted) {
          setSuggestions([]);
        }
      } finally {
        if (!ac.signal.aborted) {
          setSuggestionsLoading(false);
        }
      }
    })();

    return () => ac.abort();
  }, [debouncedQuery, placesEnabled]);

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
      lastResolvedFromPlacesRef.current = null;
      setCityInput(value);
      emitDraft({
        city: value,
        lat: undefined,
        lng: undefined,
      });
    },
    [emitDraft],
  );

  const onPickCitySuggestion = useCallback(
    async (item: CitySuggestion) => {
      clearBlurTimer();
      setSuggestions([]);
      setSubmitError(null);
      setIsResolvingCity(true);

      try {
        const { cityLabel, lat, lng } = await fetchCityPlaceDetails(
          item.placeId,
          sessionTokenRef.current,
        );
        lastResolvedFromPlacesRef.current = cityLabel;
        setCityInput(cityLabel);
        emitDraft({
          city: cityLabel,
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
    () => draft.city.trim() || cityInput.trim(),
    [draft.city, cityInput],
  );

  const fillFromCurrentLocation = useCallback(async () => {
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
      const [result] = await Location.reverseGeocodeAsync({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });

      const nextCity =
        result?.city?.trim() ||
        result?.subregion?.trim() ||
        result?.region?.trim();

      if (!nextCity) {
        throw new Error(
          "No pudimos resolver tu ciudad desde la ubicación actual.",
        );
      }

      lastResolvedFromPlacesRef.current = null;
      setCityInput(nextCity);
      emitDraft({
        city: nextCity,
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });
    } catch (error) {
      setSubmitError(mapLocationNativeError(error).message);
    } finally {
      setIsLocating(false);
    }
  }, [emitDraft]);

  const resolveCoordinates = useCallback(async () => {
    const trimmedCity = cityInput.trim();
    if (!trimmedCity) {
      throw new Error("Escribe tu ciudad para continuar.");
    }

    if (
      draft.city.trim().toLowerCase() === trimmedCity.toLowerCase() &&
      draft.lat != null &&
      draft.lng != null
    ) {
      return {
        city: draft.city.trim(),
        lat: draft.lat,
        lng: draft.lng,
      };
    }

    try {
      const Location = await loadExpoLocation();
      const results = await Location.geocodeAsync(trimmedCity);
      const first = results[0];

      if (!first) {
        throw new Error(
          "No pudimos ubicar esa ciudad. Prueba con otro nombre o usá tu ubicación.",
        );
      }

      emitDraft({
        city: trimmedCity,
        lat: first.latitude,
        lng: first.longitude,
      });

      return {
        city: trimmedCity,
        lat: first.latitude,
        lng: first.longitude,
      };
    } catch (error) {
      throw mapLocationNativeError(error);
    }
  }, [cityInput, draft.city, draft.lat, draft.lng, emitDraft]);

  const setFieldBlur = useCallback(() => {
    blurTimerRef.current = setTimeout(() => {
      setSuggestions([]);
    }, 200);
  }, []);

  const setFieldFocus = useCallback(() => {
    clearBlurTimer();
  }, [clearBlurTimer]);

  const applyResolvedCity = useCallback(
    (entry: { label: string; lat: number; lng: number }) => {
      lastResolvedFromPlacesRef.current = entry.label;
      setCityInput(entry.label);
      emitDraft({
        city: entry.label,
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
    placesEnabled,
    resolveCoordinates,
    resolvedCityLabel,
    setFieldBlur,
    setFieldFocus,
    setSubmitError,
    submitError,
    suggestions,
    suggestionsLoading,
  };
}
