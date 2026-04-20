import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { EmptyState } from "@/components/ui/empty-state";
import { PageBackground } from "@/components/ui/page-background";
import { addPlaceToDiaryApi, fetchDiary, updateDiaryApi } from "@/lib/api/diaries";
import { fetchPlacesAutocomplete } from "@/lib/api/places";
import { fetchMySavedPlaces } from "@/lib/api/saved";
import { fetchMyVisits } from "@/lib/api/visits";
import { mapApiDiaryToCafeDiary, mapApiSavedRowToSavedPlace } from "@/lib/feca/map-api-social";
import { mapApiVisitToVisit } from "@/lib/visits/map-api-visit";
import { useAuth } from "@/providers/auth-provider";
import { fecaTheme } from "@/theme/feca";
import type { CafeDiary, GuideVisibility, Place, SavedPlace, Visit } from "@/types/feca";
import type { ApiPlaceAutocompleteItem } from "@/types/places";

const WINDOW_H = Dimensions.get("window").height;
/** El FlatList del modal necesita altura acotada; sin esto el listado no se renderiza bien. */
const ADD_STOP_LIST_HEIGHT = Math.min(Math.round(WINDOW_H * 0.48), 420);

type AddStopRow =
  | { kind: "local"; place: Place }
  | { kind: "remote"; item: ApiPlaceAutocompleteItem };

function createPlacesSessionToken(): string {
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

function guideVisibilityLabel(v: GuideVisibility | null | undefined): string | null {
  if (v === "public") return "Pública";
  if (v === "unlisted") return "Enlace";
  if (v === "private") return "Solo vos";
  return null;
}

export default function DiaryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const accessToken = session?.accessToken;

  const [apiDiary, setApiDiary] = useState<CafeDiary | null>(null);
  const [diaryLoading, setDiaryLoading] = useState(false);
  const [apiVisits, setApiVisits] = useState<Visit[] | null>(null);
  const [apiSaved, setApiSaved] = useState<SavedPlace[] | null>(null);

  const [addVisible, setAddVisible] = useState(false);
  const [search, setSearch] = useState("");
  const [publishBusy, setPublishBusy] = useState(false);
  const [remoteItems, setRemoteItems] = useState<ApiPlaceAutocompleteItem[] | null>(null);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const remoteAbortRef = useRef<AbortController | null>(null);
  const lastRemoteRequestKeyRef = useRef<string | null>(null);
  const autocompleteSessionTokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!id || !accessToken) {
      setApiDiary(null);
      setDiaryLoading(false);
      return;
    }
    setDiaryLoading(true);
    void fetchDiary(id, accessToken)
      .then((d) => setApiDiary(mapApiDiaryToCafeDiary(d)))
      .catch(() => setApiDiary(null))
      .finally(() => setDiaryLoading(false));
  }, [accessToken, id]);

  useEffect(() => {
    if (!accessToken) {
      setApiVisits(null);
      setApiSaved(null);
      return;
    }
    void Promise.all([
      fetchMyVisits(accessToken, { limit: 50 }),
      fetchMySavedPlaces(accessToken, { limit: 50 }),
    ])
      .then(([v, s]) => {
        setApiVisits(v.visits.map(mapApiVisitToVisit));
        setApiSaved(s.places.map(mapApiSavedRowToSavedPlace));
      })
      .catch(() => {
        setApiVisits(null);
        setApiSaved(null);
      });
  }, [accessToken]);

  useEffect(() => {
    if (!addVisible) {
      remoteAbortRef.current?.abort();
      lastRemoteRequestKeyRef.current = null;
      autocompleteSessionTokenRef.current = null;
      setSearch("");
      setRemoteItems(null);
      setRemoteLoading(false);
    }
  }, [addVisible]);

  useEffect(() => {
    if (!addVisible || !accessToken) {
      remoteAbortRef.current?.abort();
      return;
    }
    const q = search.trim();
    if (q.length < 2) {
      remoteAbortRef.current?.abort();
      if (!q.length) {
        autocompleteSessionTokenRef.current = null;
        lastRemoteRequestKeyRef.current = null;
      }
      setRemoteItems(null);
      setRemoteLoading(false);
      return;
    }

    setRemoteLoading(true);
    const timer = setTimeout(() => {
      const requestKey = JSON.stringify({
        city: session?.user.city ?? "",
        lat: session?.user.lat ?? null,
        lng: session?.user.lng ?? null,
        q,
      });
      if (lastRemoteRequestKeyRef.current === requestKey) {
        setRemoteLoading(false);
        return;
      }

      if (!autocompleteSessionTokenRef.current) {
        autocompleteSessionTokenRef.current = createPlacesSessionToken();
      }

      remoteAbortRef.current?.abort();
      const ac = new AbortController();
      remoteAbortRef.current = ac;
      lastRemoteRequestKeyRef.current = requestKey;

      void (async () => {
        try {
          const res = await fetchPlacesAutocomplete(accessToken, {
            q,
            city: session?.user.city,
            lat: session?.user.lat,
            lng: session?.user.lng,
            limit: 10,
            origin: "diary_add_place",
            sessionToken: autocompleteSessionTokenRef.current ?? undefined,
            signal: ac.signal,
          });
          if (!ac.signal.aborted) {
            setRemoteItems(res.items ?? []);
          }
        } catch {
          if (!ac.signal.aborted) {
            setRemoteItems([]);
          }
        } finally {
          if (!ac.signal.aborted) {
            setRemoteLoading(false);
          }
        }
      })();
    }, 340);

    return () => {
      clearTimeout(timer);
      remoteAbortRef.current?.abort();
    };
  }, [
    accessToken,
    addVisible,
    search,
    session?.user.city,
    session?.user.lat,
    session?.user.lng,
  ]);

  const profileVisits = useMemo(() => apiVisits ?? [], [apiVisits]);
  const savedPlaces = useMemo(() => apiSaved ?? [], [apiSaved]);
  const diary = apiDiary;

  const ratingByPlaceId = useMemo(() => {
    const map = new Map<string, number>();
    for (const v of profileVisits) {
      if (!map.has(v.place.id) || v.rating > map.get(v.place.id)!) {
        map.set(v.place.id, v.rating);
      }
    }
    return map;
  }, [profileVisits]);

  const visibilityLabel = diary ? guideVisibilityLabel(diary.visibility) : null;

  const isOwner = Boolean(
    session?.user.id && diary && session.user.id === diary.createdBy.id,
  );
  const canPublishGuide =
    isOwner &&
    diary &&
    (diary.visibility !== "public" || !diary.publishedAt?.trim());

  const allPlaces = useMemo(() => {
    const seen = new Set<string>();
    const result: Place[] = [];
    for (const sp of savedPlaces) {
      if (!seen.has(sp.place.id)) {
        seen.add(sp.place.id);
        result.push(sp.place);
      }
    }
    for (const visit of profileVisits) {
      const p = visit.place;
      if (!seen.has(p.id)) {
        seen.add(p.id);
        result.push(p);
      }
    }
    return result;
  }, [profileVisits, savedPlaces]);

  const diaryPlaceIds = useMemo(
    () => new Set(diary?.places.map((p) => p.id) ?? []),
    [diary?.places],
  );

  const diaryGooglePlaceIds = useMemo(
    () =>
      new Set(
        (diary?.places ?? [])
          .map((p) => p.googlePlaceId)
          .filter((gid): gid is string => Boolean(gid?.trim())),
      ),
    [diary?.places],
  );

  const availablePlacesBase = useMemo(
    () => allPlaces.filter((p) => !diaryPlaceIds.has(p.id)),
    [allPlaces, diaryPlaceIds],
  );

  const localPlacesMatchingSearch = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      return availablePlacesBase;
    }
    return availablePlacesBase.filter((p) => {
      const name = (p.name ?? "").toLowerCase();
      const neighborhood = (p.neighborhood ?? "").toLowerCase();
      const city = (p.city ?? "").toLowerCase();
      return name.includes(q) || neighborhood.includes(q) || city.includes(q);
    });
  }, [availablePlacesBase, search]);

  const addStopRows = useMemo((): AddStopRow[] => {
    const q = search.trim();
    if (q.length >= 2 && remoteItems !== null) {
      return remoteItems
        .filter((item) => {
          if (item.placeId && diaryPlaceIds.has(item.placeId)) {
            return false;
          }
          if (item.sourcePlaceId && diaryGooglePlaceIds.has(item.sourcePlaceId)) {
            return false;
          }
          return true;
        })
        .map((item) => ({ kind: "remote" as const, item }));
    }
    return localPlacesMatchingSearch.map((place) => ({ kind: "local" as const, place }));
  }, [
    diaryGooglePlaceIds,
    diaryPlaceIds,
    localPlacesMatchingSearch,
    remoteItems,
    search,
  ]);

  const handleAddRemoteItem = (item: ApiPlaceAutocompleteItem) => {
    const diaryId = id ?? "";
    if (!diaryId || !accessToken) {
      return;
    }
    const sessionToken = autocompleteSessionTokenRef.current?.trim();

    const body =
      item.placeId?.trim()
        ? {
            placeId: item.placeId.trim(),
            ...(item.sourcePlaceId?.trim()
              ? { googlePlaceId: item.sourcePlaceId.trim() }
              : {}),
            ...(sessionToken && item.sourcePlaceId?.trim()
              ? { sessionToken }
              : {}),
          }
        : item.sourcePlaceId?.trim()
          ? {
              googlePlaceId: item.sourcePlaceId.trim(),
              ...(sessionToken ? { sessionToken } : {}),
            }
          : null;

    if (!body) {
      return;
    }

    void (async () => {
      try {
        const updated = await addPlaceToDiaryApi(diaryId, accessToken, body, {
          origin: "diary_add_place",
        });
        setApiDiary(mapApiDiaryToCafeDiary(updated));
        autocompleteSessionTokenRef.current = null;
        lastRemoteRequestKeyRef.current = null;
        setAddVisible(false);
        setSearch("");
        setRemoteItems(null);
      } catch {
        Alert.alert("No se pudo agregar", "Reintentá o elegí otro resultado.");
      }
    })();
  };

  const handleAddPlace = (place: Place) => {
    const diaryId = id ?? "";
    if (!diaryId || !accessToken) {
      return;
    }

    void (async () => {
      try {
        const updated = await addPlaceToDiaryApi(diaryId, accessToken, {
          placeId: place.id,
          googlePlaceId: place.googlePlaceId,
        }, {
          origin: "diary_add_place",
        });
        setApiDiary(mapApiDiaryToCafeDiary(updated));
        setAddVisible(false);
        setSearch("");
        setRemoteItems(null);
      } catch {
        return;
      }
    })();
  };

  if (!accessToken) {
    return <Redirect href="/(onboarding)/welcome" />;
  }

  if (diaryLoading && !apiDiary) {
    return (
      <PageBackground>
        <View style={styles.notFound}>
          <Pressable onPress={() => router.back()} style={styles.navBtn}>
            <Ionicons color={fecaTheme.colors.onSurface} name="chevron-back" size={20} />
          </Pressable>
          <ActivityIndicator color={fecaTheme.colors.primary} size="large" />
        </View>
      </PageBackground>
    );
  }

  if (!diary) {
    return (
      <PageBackground>
        <View style={styles.notFound}>
          <Pressable onPress={() => router.back()} style={styles.navBtn}>
            <Ionicons color={fecaTheme.colors.onSurface} name="chevron-back" size={20} />
          </Pressable>
          <EmptyState
            description="Esta guía no existe o fue eliminada."
            icon="alert-circle-outline"
            title="Guía no encontrada"
          />
        </View>
      </PageBackground>
    );
  }

  return (
    <PageBackground>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} style={styles.navBtn}>
            <Ionicons color={fecaTheme.colors.onSurface} name="chevron-back" size={20} />
          </Pressable>
          <View style={styles.topBarRight}>
            {canPublishGuide && accessToken ? (
              <Pressable
                accessibilityRole="button"
                disabled={publishBusy}
                onPress={() => {
                  const diaryId = id ?? "";
                  if (!diaryId || !accessToken) {
                    return;
                  }
                  void (async () => {
                    setPublishBusy(true);
                    try {
                      const updated = await updateDiaryApi(diaryId, accessToken, {
                        visibility: "public",
                      });
                      setApiDiary(mapApiDiaryToCafeDiary(updated));
                    } catch {
                      Alert.alert(
                        "No se pudo publicar",
                        "Reintentá o comprobá tu conexión.",
                      );
                    } finally {
                      setPublishBusy(false);
                    }
                  })();
                }}
                style={({ pressed }) => [
                  styles.publishBtn,
                  (pressed || publishBusy) && styles.publishBtnPressed,
                ]}
              >
                <Text style={styles.publishBtnLabel}>
                  {publishBusy ? "Publicando…" : "Publicar"}
                </Text>
              </Pressable>
            ) : null}
            <Pressable onPress={() => { setSearch(""); setAddVisible(true); }} style={styles.addBtn}>
              <Ionicons color={fecaTheme.colors.onPrimary} name="add" size={20} />
            </Pressable>
          </View>
        </View>

        {diary.coverImageUrl ? (
          <Image
            accessibilityIgnoresInvertColors
            contentFit="cover"
            source={{ uri: diary.coverImageUrl }}
            style={styles.coverHero}
          />
        ) : null}

        <View style={styles.header}>
          <Text style={styles.diaryName}>{diary.name}</Text>
          {diary.intro?.trim() ? (
            <Text style={styles.diaryIntro}>{diary.intro.trim()}</Text>
          ) : diary.description ? (
            <Text style={styles.diaryDesc}>{diary.description}</Text>
          ) : null}
          {diary.editorialReason?.trim() ? (
            <View style={styles.editorialBox}>
              <Text style={styles.editorialLabel}>Por qué esta guía</Text>
              <Text style={styles.editorialText}>{diary.editorialReason.trim()}</Text>
            </View>
          ) : null}
          <View style={styles.diaryMetaRow}>
            <Text style={styles.diaryMeta}>
              {diary.places.length} {diary.places.length === 1 ? "parada" : "paradas"}
            </Text>
            {visibilityLabel ? (
              <Text style={styles.visibilityBadge}>{visibilityLabel}</Text>
            ) : null}
          </View>
        </View>

        {diary.places.length === 0 ? (
          <EmptyState
            description="Tocá + para sumar cafés a esta guía."
            icon="cafe-outline"
            title="Guía vacía"
          />
        ) : (
          <View style={styles.grid}>
            {diary.places.map((place, index) => {
              const rating = ratingByPlaceId.get(place.id);
              const note = diary.placeNotes?.[place.id];
              return (
                <Pressable
                  key={place.id}
                  onPress={() =>
                    router.push(`/place/${place.googlePlaceId ?? place.id}`)
                  }
                  style={styles.gridCard}
                >
                  <View style={styles.gridOrderRow}>
                    <Text style={styles.gridOrder}>{index + 1}</Text>
                    <View style={[styles.gridAccent, { backgroundColor: place.accent }]} />
                  </View>
                  <View style={styles.gridBody}>
                    <Text numberOfLines={1} style={styles.gridName}>{place.name}</Text>
                    <Text numberOfLines={1} style={styles.gridNeighborhood}>{place.neighborhood}</Text>
                    {note ? (
                      <Text numberOfLines={2} style={styles.gridNote}>{note}</Text>
                    ) : null}
                    {rating != null ? (
                      <View style={styles.ratingRow}>
                        {Array.from({ length: 5 }, (_, i) => (
                          <Ionicons
                            key={i}
                            color={i < rating ? fecaTheme.colors.secondary : fecaTheme.colors.iconSubtle}
                            name={i < rating ? "star" : "star-outline"}
                            size={13}
                          />
                        ))}
                      </View>
                    ) : (
                      <Text style={styles.noRating}>Sin reseña</Text>
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      <Modal
        animationType="slide"
        onRequestClose={() => setAddVisible(false)}
        transparent
        visible={addVisible}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Pressable onPress={() => setAddVisible(false)} style={styles.modalClose}>
                <Ionicons color={fecaTheme.colors.onSurface} name="close" size={20} />
              </Pressable>
              <Text style={styles.modalTitle}>Agregar parada</Text>
              <View style={styles.modalClose} />
            </View>

            <View style={styles.searchRow}>
              <Ionicons color={fecaTheme.colors.muted} name="search" size={16} />
              <TextInput
                autoCorrect={false}
                onChangeText={setSearch}
                placeholder="Nombre del café (2+ letras: Google + FECA)"
                placeholderTextColor={fecaTheme.colors.muted}
                style={styles.searchInput}
                value={search}
              />
              {search.length > 0 ? (
                <Pressable onPress={() => setSearch("")}>
                  <Ionicons color={fecaTheme.colors.muted} name="close-circle" size={16} />
                </Pressable>
              ) : null}
            </View>

            {remoteLoading && search.trim().length >= 2 && remoteItems === null ? (
              <View style={styles.remoteLoadingBanner}>
                <ActivityIndicator color={fecaTheme.colors.primary} size="small" />
                <Text style={styles.remoteLoadingText}>Buscando en Google…</Text>
              </View>
            ) : null}

            <FlatList
              contentContainerStyle={styles.modalList}
              data={addStopRows}
              keyExtractor={(row) =>
                row.kind === "local" ? `l-${row.place.id}` : `r-${row.item.id}`
              }
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <Text style={styles.emptyText}>
                  {(() => {
                    const q = search.trim();
                    if (remoteLoading && q.length >= 2) {
                      return "Buscando…";
                    }
                    if (q.length >= 2 && !remoteLoading && addStopRows.length === 0) {
                      return "Sin resultados en Google ni en FECA.";
                    }
                    if (q.length > 0 && q.length < 2 && addStopRows.length === 0) {
                      return "Sin coincidencias en tus lugares. Escribí 2 letras o más para buscar en Google.";
                    }
                    if (q.length === 0 && availablePlacesBase.length === 0) {
                      return "No hay cafés para agregar (visitá o guardá lugares primero).";
                    }
                    return "Sin resultados.";
                  })()}
                </Text>
              }
              renderItem={({ item: row }) =>
                row.kind === "local" ? (
                  <Pressable
                    onPress={() => handleAddPlace(row.place)}
                    style={styles.modalRow}
                  >
                    <View style={[styles.placeDot, { backgroundColor: row.place.accent }]} />
                    <View style={styles.placeInfo}>
                      <Text style={styles.placeName}>{row.place.name}</Text>
                      <Text style={styles.placeMeta}>
                        {row.place.neighborhood}
                        {row.place.city ? ` · ${row.place.city}` : ""}
                      </Text>
                    </View>
                    <Ionicons color={fecaTheme.colors.primary} name="add-circle" size={22} />
                  </Pressable>
                ) : (
                  <Pressable
                    onPress={() => handleAddRemoteItem(row.item)}
                    style={styles.modalRow}
                  >
                    <View style={[styles.placeDot, { backgroundColor: fecaTheme.colors.primary }]} />
                    <View style={styles.placeInfo}>
                      <Text style={styles.placeName}>{row.item.name}</Text>
                      <Text numberOfLines={2} style={styles.placeMeta}>
                        {row.item.address || row.item.city || "Google Places"}
                      </Text>
                      {row.item.alreadyInFeca ? (
                        <Text style={styles.inFecaHint}>En FECA</Text>
                      ) : null}
                    </View>
                    <Ionicons color={fecaTheme.colors.primary} name="add-circle" size={22} />
                  </Pressable>
                )
              }
              showsVerticalScrollIndicator={false}
              style={styles.modalFlatList}
            />
          </View>
        </View>
      </Modal>
    </PageBackground>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: 80,
    paddingHorizontal: fecaTheme.spacing.xl,
    paddingTop: fecaTheme.spacing.xxl,
  },
  notFound: {
    flex: 1,
    gap: fecaTheme.spacing.xl,
    justifyContent: "center",
    paddingHorizontal: fecaTheme.spacing.xl,
    paddingTop: fecaTheme.spacing.xl,
  },
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: fecaTheme.spacing.lg,
  },
  navBtn: {
    alignItems: "center",
    backgroundColor: fecaTheme.surfaces.high,
    borderRadius: fecaTheme.radii.pill,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  addBtn: {
    alignItems: "center",
    backgroundColor: fecaTheme.colors.primary,
    borderRadius: fecaTheme.radii.pill,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  topBarRight: {
    alignItems: "center",
    flexDirection: "row",
    gap: fecaTheme.spacing.sm,
  },
  publishBtn: {
    backgroundColor: fecaTheme.surfaces.high,
    borderRadius: fecaTheme.radii.pill,
    paddingHorizontal: fecaTheme.spacing.md,
    paddingVertical: 10,
  },
  publishBtnPressed: {
    opacity: 0.88,
  },
  publishBtnLabel: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.primary,
    fontWeight: "600",
  },
  coverHero: {
    borderRadius: fecaTheme.radii.lg,
    height: 168,
    marginBottom: fecaTheme.spacing.lg,
    width: "100%",
  },
  header: {
    gap: fecaTheme.spacing.sm,
    marginBottom: fecaTheme.spacing.xl,
  },
  diaryName: {
    ...fecaTheme.typography.headline,
    color: fecaTheme.colors.onSurface,
  },
  diaryIntro: {
    ...fecaTheme.typography.body,
    color: fecaTheme.colors.onSurface,
    lineHeight: 22,
  },
  diaryDesc: {
    ...fecaTheme.typography.body,
    color: fecaTheme.colors.muted,
    lineHeight: 22,
  },
  editorialBox: {
    backgroundColor: fecaTheme.surfaces.high,
    borderRadius: fecaTheme.radii.sm,
    gap: fecaTheme.spacing.xs,
    padding: fecaTheme.spacing.md,
  },
  editorialLabel: {
    ...fecaTheme.typography.label,
    color: fecaTheme.colors.primary,
  },
  editorialText: {
    ...fecaTheme.typography.body,
    color: fecaTheme.colors.onSurface,
    lineHeight: 22,
  },
  diaryMetaRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: fecaTheme.spacing.sm,
    marginTop: fecaTheme.spacing.xs,
  },
  diaryMeta: {
    ...fecaTheme.typography.label,
    color: fecaTheme.colors.primary,
  },
  visibilityBadge: {
    ...fecaTheme.typography.label,
    color: fecaTheme.colors.muted,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: fecaTheme.spacing.sm,
  },
  gridCard: {
    backgroundColor: fecaTheme.surfaces.lowest,
    borderRadius: fecaTheme.radii.md,
    overflow: "hidden",
    width: (Dimensions.get("window").width - fecaTheme.spacing.xl * 2 - fecaTheme.spacing.sm) / 2,
    ...fecaTheme.elevation.ambient,
  },
  gridOrderRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: fecaTheme.spacing.xs,
    paddingHorizontal: fecaTheme.spacing.sm,
    paddingTop: fecaTheme.spacing.sm,
  },
  gridOrder: {
    ...fecaTheme.typography.numeric,
    color: fecaTheme.colors.muted,
    fontSize: 13,
    minWidth: 18,
  },
  gridAccent: {
    borderRadius: fecaTheme.radii.pill,
    flex: 1,
    height: 6,
  },
  gridBody: {
    gap: 3,
    padding: fecaTheme.spacing.md,
  },
  gridNote: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.onSurface,
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
  },
  gridName: {
    ...fecaTheme.typography.bodyStrong,
    color: fecaTheme.colors.onSurface,
    fontSize: 14,
  },
  gridNeighborhood: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.muted,
    fontSize: 12,
  },
  ratingRow: {
    flexDirection: "row",
    gap: 2,
    marginTop: 4,
  },
  noRating: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.onSurfaceVariant,
    fontSize: 11,
    marginTop: 4,
  },
  placeDot: {
    borderRadius: fecaTheme.radii.pill,
    height: 16,
    width: 16,
  },
  placeInfo: {
    flex: 1,
    gap: 2,
  },
  placeName: {
    ...fecaTheme.typography.bodyStrong,
    color: fecaTheme.colors.onSurface,
    fontSize: 15,
  },
  placeMeta: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.muted,
  },
  modalOverlay: {
    backgroundColor: fecaTheme.colors.scrim,
    flex: 1,
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: fecaTheme.surfaces.lowest,
    borderTopLeftRadius: fecaTheme.radii.xl,
    borderTopRightRadius: fecaTheme.radii.xl,
    maxHeight: Math.round(WINDOW_H * 0.88),
    paddingBottom: 32,
    paddingTop: fecaTheme.spacing.lg,
    ...fecaTheme.elevation.floating,
  },
  modalFlatList: {
    height: ADD_STOP_LIST_HEIGHT,
    marginTop: fecaTheme.spacing.sm,
  },
  modalHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: fecaTheme.spacing.xl,
  },
  modalTitle: {
    ...fecaTheme.typography.title,
    color: fecaTheme.colors.onSurface,
  },
  modalClose: {
    alignItems: "center",
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  searchRow: {
    alignItems: "center",
    backgroundColor: fecaTheme.surfaces.low,
    borderRadius: fecaTheme.radii.sm,
    flexDirection: "row",
    gap: fecaTheme.spacing.sm,
    marginHorizontal: fecaTheme.spacing.xl,
    marginTop: fecaTheme.spacing.md,
    paddingHorizontal: fecaTheme.spacing.md,
    paddingVertical: fecaTheme.spacing.sm,
  },
  searchInput: {
    ...fecaTheme.typography.body,
    color: fecaTheme.colors.onSurface,
    flex: 1,
    minHeight: 32,
    padding: 0,
  },
  modalList: {
    paddingHorizontal: fecaTheme.spacing.xl,
    paddingTop: fecaTheme.spacing.md,
  },
  modalRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: fecaTheme.spacing.sm,
    minHeight: 56,
    paddingVertical: fecaTheme.spacing.sm,
  },
  emptyText: {
    ...fecaTheme.typography.body,
    color: fecaTheme.colors.muted,
    paddingVertical: fecaTheme.spacing.xl,
    textAlign: "center",
  },
  remoteLoadingBanner: {
    alignItems: "center",
    flexDirection: "row",
    gap: fecaTheme.spacing.sm,
    justifyContent: "center",
    paddingVertical: fecaTheme.spacing.sm,
  },
  remoteLoadingText: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.muted,
  },
  inFecaHint: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.secondary,
    marginTop: 2,
  },
});
