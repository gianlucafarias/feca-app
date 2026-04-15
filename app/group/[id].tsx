import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  LayoutAnimation,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";

import { FriendRow } from "@/components/cards/friend-row";
import { AvatarBadge } from "@/components/ui/avatar-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { FormField } from "@/components/ui/form-field";
import { GradientButton } from "@/components/ui/gradient-button";
import { PageBackground } from "@/components/ui/page-background";
import { SaveToListSheet } from "@/components/ui/save-to-list-sheet";
import { TextLinkButton } from "@/components/ui/text-link-button";
import { fetchMyFriends } from "@/lib/api/friends";
import { addGroupEventApi, addGroupMembers, fetchGroup } from "@/lib/api/groups";
import { fetchMySavedPlaces } from "@/lib/api/saved";
import { fetchMyVisits } from "@/lib/api/visits";
import {
  mapApiGroupToFecaGroup,
  mapApiSavedRowToSavedPlace,
} from "@/lib/feca/map-api-social";
import { formatVisitDate } from "@/lib/format";
import { mapApiVisitToVisit } from "@/lib/visits/map-api-visit";
import { mapApiUserPublicToUser } from "@/lib/feca/map-api-user";
import { useKeyboardBottomInset } from "@/hooks/use-keyboard-bottom-inset";
import { useAuth } from "@/providers/auth-provider";
import { fecaTheme } from "@/theme/feca";
import type {
  FecaGroup,
  GroupEvent,
  GroupEventStatus,
  Place,
  SavedPlace,
  User,
  Visit,
} from "@/types/feca";

const EVENT_ICON: Record<GroupEventStatus, keyof typeof Ionicons.glyphMap> = {
  proposed: "help-circle-outline",
  confirmed: "calendar",
  completed: "checkmark-circle",
};

const EVENT_COLOR: Record<GroupEventStatus, string> = {
  proposed: fecaTheme.colors.muted,
  confirmed: fecaTheme.colors.primary,
  completed: fecaTheme.colors.secondary,
};

const EVENT_LABEL: Record<GroupEventStatus, string> = {
  proposed: "Propuesto",
  confirmed: "Confirmado",
  completed: "Fuimos",
};

type ProposeStep = "place" | "date";

const DATE_OPTIONS = (() => {
  const options: { label: string; value: string }[] = [];
  const today = new Date();
  const dayNames = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
  const monthNames = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  for (let i = 1; i <= 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const iso = d.toISOString().slice(0, 10);
    const label = i === 1
      ? "Mañana"
      : `${dayNames[d.getDay()]} ${d.getDate()} ${monthNames[d.getMonth()]}`;
    options.push({ label, value: iso });
  }
  return options;
})();

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const { height: winH } = useWindowDimensions();
  const keyboardInset = useKeyboardBottomInset();
  const windowHeight = Math.max(
    winH,
    Dimensions.get("window").height,
    Dimensions.get("screen").height * 0.4,
    480,
  );
  const accessToken = session?.accessToken;
  const [apiGroup, setApiGroup] = useState<FecaGroup | null>(null);
  const [groupLoading, setGroupLoading] = useState(false);
  const [apiVisits, setApiVisits] = useState<Visit[] | null>(null);
  const [apiSaved, setApiSaved] = useState<SavedPlace[] | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [shareVisible, setShareVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  const [friends, setFriends] = useState<User[]>([]);
  const [inviteVisible, setInviteVisible] = useState(false);
  const [inviteSearch, setInviteSearch] = useState("");
  const [inviteSelection, setInviteSelection] = useState<string[]>([]);
  const [inviteBusy, setInviteBusy] = useState(false);
  const [saveGroupSheetOpen, setSaveGroupSheetOpen] = useState(false);

  const [proposeVisible, setProposeVisible] = useState(false);
  const [proposeStep, setProposeStep] = useState<ProposeStep>("place");
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [placeSearch, setPlaceSearch] = useState("");
  const [placeTab, setPlaceTab] = useState<"recent" | "saved">("recent");
  const deferredSearch = useDeferredValue(placeSearch);
  const isSearching = deferredSearch.trim().length > 0;

  const currentUserId = session?.user.id;

  useEffect(() => {
    if (!id || !accessToken) {
      setApiGroup(null);
      setGroupLoading(false);
      return;
    }
    setGroupLoading(true);
    void fetchGroup(id, accessToken)
      .then((g) => setApiGroup(mapApiGroupToFecaGroup(g)))
      .catch(() => setApiGroup(null))
      .finally(() => setGroupLoading(false));
  }, [accessToken, id]);

  const loadFriends = useCallback(async () => {
    if (!accessToken) {
      setFriends([]);
      return;
    }
    try {
      const res = await fetchMyFriends(accessToken, { limit: 100 });
      setFriends(res.friends.map(mapApiUserPublicToUser));
    } catch {
      setFriends([]);
    }
  }, [accessToken]);

  useEffect(() => {
    void loadFriends();
  }, [loadFriends]);

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

  const profileVisits = useMemo(() => apiVisits ?? [], [apiVisits]);
  const savedPlaces = useMemo(() => apiSaved ?? [], [apiSaved]);

  const recentPlaces = useMemo(() => {
    const seen = new Set<string>();
    const result: Place[] = [];
    for (const v of profileVisits) {
      if (!seen.has(v.place.id)) {
        seen.add(v.place.id);
        result.push(v.place);
      }
    }
    return result;
  }, [profileVisits]);

  const savedPlacesList = useMemo(
    () => savedPlaces.map((s) => s.place),
    [savedPlaces],
  );

  const searchResults = useMemo(() => {
    if (!isSearching) return [];
    const q = deferredSearch.toLowerCase();
    const seen = new Set<string>();
    const result: Place[] = [];
    const all = [...savedPlacesList, ...recentPlaces];
    for (const p of all) {
      if (!seen.has(p.id) && (p.name.toLowerCase().includes(q) || p.neighborhood.toLowerCase().includes(q))) {
        seen.add(p.id);
        result.push(p);
      }
    }
    return result;
  }, [deferredSearch, isSearching, recentPlaces, savedPlacesList]);

  const openPropose = () => {
    setProposeStep("place");
    setSelectedPlace(null);
    setSelectedDate(null);
    setPlaceSearch("");
    setPlaceTab("recent");
    setProposeVisible(true);
  };

  const handlePickPlace = (place: Place) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedPlace(place);
    setProposeStep("date");
  };

  const reloadGroup = useCallback(async () => {
    if (!id || !accessToken) return;
    try {
      const g = await fetchGroup(id, accessToken);
      setApiGroup(mapApiGroupToFecaGroup(g));
    } catch {
      setApiGroup(null);
    }
  }, [accessToken, id]);

  const memberIdSet = useMemo(
    () => new Set(apiGroup?.members.map((m) => m.user.id) ?? []),
    [apiGroup?.members],
  );

  const friendsNotInGroup = useMemo(
    () => friends.filter((f) => !memberIdSet.has(f.id)),
    [friends, memberIdSet],
  );

  const deferredInviteSearch = useDeferredValue(inviteSearch);
  const filteredInviteFriends = useMemo(() => {
    const q = deferredInviteSearch.trim().toLowerCase();
    if (!q) return friendsNotInGroup;
    return friendsNotInGroup.filter((f) =>
      `${f.displayName} ${f.username}`.toLowerCase().includes(q),
    );
  }, [deferredInviteSearch, friendsNotInGroup]);

  const openInviteFriends = () => {
    setInviteSearch("");
    setInviteSelection([]);
    void loadFriends();
    setInviteVisible(true);
  };

  const toggleInviteFriend = (userId: string) => {
    setInviteSelection((prev) =>
      prev.includes(userId)
        ? prev.filter((x) => x !== userId)
        : [...prev, userId],
    );
  };

  const handleConfirmInvites = () => {
    if (!id || !accessToken || inviteSelection.length === 0) return;
    setInviteBusy(true);
    void (async () => {
      try {
        const g = await addGroupMembers(id, accessToken, {
          memberIds: inviteSelection,
        });
        setApiGroup(mapApiGroupToFecaGroup(g));
        setInviteVisible(false);
        setInviteSelection([]);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "No se pudo completar la invitación";
        Alert.alert("No se pudo invitar", message);
      } finally {
        setInviteBusy(false);
      }
    })();
  };

  const handleConfirmPropose = () => {
    if (!selectedPlace || !selectedDate || !id || !accessToken) return;

    void (async () => {
      try {
        await addGroupEventApi(id, accessToken, {
          placeId: selectedPlace.id,
          googlePlaceId: selectedPlace.googlePlaceId,
          date: selectedDate,
        });
        await reloadGroup();
        setProposeVisible(false);
      } catch {
        return;
      }
    })();
  };

  const group = apiGroup;

  if (!accessToken) {
    return <Redirect href="/(onboarding)/welcome" />;
  }

  if (groupLoading && !apiGroup) {
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

  if (!group) {
    return (
      <PageBackground>
        <View style={styles.notFound}>
          <Pressable onPress={() => router.back()} style={styles.navBtn}>
            <Ionicons color={fecaTheme.colors.onSurface} name="chevron-back" size={20} />
          </Pressable>
          <EmptyState
            description="Este plan no existe o fue eliminado."
            icon="alert-circle-outline"
            title="Plan no encontrado"
          />
        </View>
      </PageBackground>
    );
  }

  const inviteCode = group.inviteCode?.trim() ?? null;
  const inviteLink = inviteCode ? `https://feca.app/g/${inviteCode}` : null;

  const upcoming = group.events.filter((e) => e.status !== "completed");
  const past = group.events.filter((e) => e.status === "completed");

  const toggleExpand = (eventId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId((current) => (current === eventId ? null : eventId));
  };

  const handleCopy = async () => {
    if (!inviteLink) return;
    await Clipboard.setStringAsync(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderEventCard = (event: GroupEvent) => {
    const isExpanded = expandedId === event.id;
    const isCompleted = event.status === "completed";

    return (
      <View key={event.id} style={styles.eventCardOuter}>
        <Pressable onPress={() => toggleExpand(event.id)} style={styles.eventCard}>
          <View style={[styles.eventDot, { backgroundColor: event.place.accent }]} />
          <View style={styles.eventInfo}>
            <Text style={styles.eventPlace}>{event.place.name}</Text>
            <View style={styles.eventMetaRow}>
              <Ionicons
                color={EVENT_COLOR[event.status]}
                name={EVENT_ICON[event.status]}
                size={13}
              />
              <Text style={[styles.eventDate, { color: EVENT_COLOR[event.status] }]}>
                {formatVisitDate(event.date)}
              </Text>
              <Text style={styles.eventStatusLabel}>{EVENT_LABEL[event.status]}</Text>
            </View>
            <Text style={styles.eventProposedBy}>
              {event.proposedBy.id === currentUserId
                ? "Propuesto por vos"
                : `Por ${event.proposedBy.displayName}`}
            </Text>
          </View>
          <Ionicons
            color={fecaTheme.colors.outlineVariant}
            name={isExpanded ? "chevron-up" : "chevron-down"}
            size={16}
          />
        </Pressable>

        {isExpanded ? (
          <View style={styles.expandedActions}>
            <Pressable
              onPress={() =>
                router.push(
                  `/place/${event.place.googlePlaceId ?? event.place.id}`,
                )
              }
              style={styles.actionRow}
            >
              <Ionicons color={fecaTheme.colors.onSurface} name="storefront-outline" size={16} />
              <Text style={styles.actionText}>Ver lugar</Text>
            </Pressable>

            {isCompleted ? (
              <Pressable
                onPress={() => router.push("/visit/new")}
                style={styles.actionRow}
              >
                <Ionicons color={fecaTheme.colors.secondary} name="star-outline" size={16} />
                <Text style={[styles.actionText, { color: fecaTheme.colors.secondary }]}>
                  Reseñar
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <PageBackground>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* --- Top bar --- */}
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} style={styles.navBtn}>
            <Ionicons color={fecaTheme.colors.onSurface} name="chevron-back" size={20} />
          </Pressable>
          <View style={styles.topBarRight}>
            <Pressable
              accessibilityLabel="Guardar plan en lista"
              onPress={() => setSaveGroupSheetOpen(true)}
              style={styles.navBtn}
            >
              <Ionicons color={fecaTheme.colors.onSurface} name="bookmark-outline" size={20} />
            </Pressable>
            <Pressable onPress={() => setShareVisible(true)} style={styles.navBtn}>
              <Ionicons color={fecaTheme.colors.onSurface} name="share-outline" size={18} />
            </Pressable>
          </View>
        </View>

        <View style={styles.header}>
          <Text style={styles.groupName}>{group.name}</Text>
          <Text style={styles.createdBy}>
            Creado por{" "}
            {group.createdBy.id === currentUserId
              ? "vos"
              : group.createdBy.displayName}
          </Text>
        </View>

        {/* --- Miembros --- */}
        <View style={styles.section}>
          <View style={styles.membersHeaderRow}>
            <Text style={[styles.sectionTitle, styles.membersRowTitle]}>
              Miembros ({group.members.length})
            </Text>
            {group.createdBy.id === currentUserId ? (
              <Pressable
                accessibilityLabel="Invitar amigos al plan"
                accessibilityRole="button"
                onPress={openInviteFriends}
                style={styles.inviteMembersBtn}
              >
                <Ionicons
                  color={fecaTheme.colors.primary}
                  name="person-add-outline"
                  size={18}
                />
                <Text style={styles.inviteMembersBtnLabel}>Invitar</Text>
              </Pressable>
            ) : null}
          </View>
          <Text style={styles.membersHint}>
            Podés sumar gente desde acá o compartiendo el código del plan (icono
            compartir arriba).
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.membersScroll}
          >
            {group.members.map((member) => (
              <View key={member.user.id} style={styles.memberItem}>
                <AvatarBadge
                  accent={
                    member.user.id === currentUserId
                      ? fecaTheme.colors.secondary
                      : fecaTheme.colors.primary
                  }
                  name={member.user.displayName}
                  size={44}
                />
                <Text numberOfLines={1} style={styles.memberName}>
                  {member.user.id === currentUserId
                    ? "Vos"
                    : member.user.displayName}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* --- Próximos cafés --- */}
        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Próximos planes</Text>
            <Pressable onPress={openPropose} style={styles.addBtnSmall}>
              <Ionicons color={fecaTheme.colors.onPrimary} name="add" size={18} />
            </Pressable>
          </View>
          {upcoming.length > 0 ? (
            <View style={styles.eventList}>
              {upcoming.map(renderEventCard)}
            </View>
          ) : (
            <EmptyState
              description="Tocá + para proponer un lugar y una fecha."
              icon="cafe-outline"
              title="Sin planes todavía"
            />
          )}
        </View>

        {/* --- Ya fueron --- */}
        {past.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Salidas pasadas ({past.length})
            </Text>
            <View style={styles.eventList}>
              {past.map(renderEventCard)}
            </View>
          </View>
        ) : null}
      </ScrollView>

      {/* --- Propose café modal --- */}
      <Modal
        animationType="slide"
        onRequestClose={() => setProposeVisible(false)}
        transparent
        visible={proposeVisible}
      >
        <View style={styles.proposeOverlay}>
          <View
            style={[
              styles.proposeSheet,
              keyboardInset > 0
                ? {
                    marginBottom: keyboardInset,
                    maxHeight: Math.min(
                      windowHeight * 0.82,
                      windowHeight - keyboardInset - 24,
                    ),
                  }
                : null,
            ]}
          >
            <View style={styles.modalHeader}>
              <Pressable
                onPress={() => {
                  if (proposeStep === "date") {
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setProposeStep("place");
                  } else {
                    setProposeVisible(false);
                  }
                }}
                style={styles.modalClose}
              >
                <Ionicons
                  color={fecaTheme.colors.onSurface}
                  name={proposeStep === "date" ? "chevron-back" : "close"}
                  size={20}
                />
              </Pressable>
              <Text style={styles.modalTitle}>
                {proposeStep === "place" ? "Elegir lugar" : "Elegir fecha"}
              </Text>
              <View style={styles.modalClose} />
            </View>

            {proposeStep === "place" ? (
              <>
                <View style={styles.searchRow}>
                  <Ionicons color={fecaTheme.colors.muted} name="search" size={16} />
                  <TextInput
                    onChangeText={setPlaceSearch}
                    placeholder="Buscar café..."
                    placeholderTextColor={fecaTheme.colors.muted}
                    style={styles.searchInput}
                    value={placeSearch}
                  />
                  {placeSearch.length > 0 ? (
                    <Pressable onPress={() => setPlaceSearch("")}>
                      <Ionicons color={fecaTheme.colors.muted} name="close-circle" size={16} />
                    </Pressable>
                  ) : null}
                </View>

                {!isSearching ? (
                  <View style={styles.tabChips}>
                    <Pressable
                      onPress={() => setPlaceTab("recent")}
                      style={[styles.tabChip, placeTab === "recent" && styles.tabChipActive]}
                    >
                      <Ionicons
                        color={placeTab === "recent" ? fecaTheme.colors.onPrimary : fecaTheme.colors.onSurface}
                        name="time-outline"
                        size={14}
                      />
                      <Text style={[styles.tabChipText, placeTab === "recent" && styles.tabChipTextActive]}>
                        Visitados
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setPlaceTab("saved")}
                      style={[styles.tabChip, placeTab === "saved" && styles.tabChipActive]}
                    >
                      <Ionicons
                        color={placeTab === "saved" ? fecaTheme.colors.onPrimary : fecaTheme.colors.onSurface}
                        name="bookmark-outline"
                        size={14}
                      />
                      <Text style={[styles.tabChipText, placeTab === "saved" && styles.tabChipTextActive]}>
                        Ir
                      </Text>
                    </Pressable>
                  </View>
                ) : null}

                <FlatList
                  contentContainerStyle={[
                    styles.placeList,
                    keyboardInset > 0
                      ? { paddingBottom: keyboardInset + fecaTheme.spacing.md }
                      : null,
                  ]}
                  data={isSearching ? searchResults : placeTab === "recent" ? recentPlaces : savedPlacesList}
                  keyExtractor={(p) => p.id}
                  keyboardDismissMode="on-drag"
                  keyboardShouldPersistTaps="handled"
                  ListEmptyComponent={
                    <Text style={styles.emptyText}>
                      {isSearching ? "Sin resultados" : placeTab === "recent" ? "Todavía no visitaste cafés" : "No tenés lugares guardados"}
                    </Text>
                  }
                  renderItem={({ item }) => (
                    <Pressable
                      onPress={() => handlePickPlace(item)}
                      style={styles.placeRow}
                    >
                      <View style={[styles.placeDot, { backgroundColor: item.accent }]} />
                      <View style={styles.placeRowInfo}>
                        <Text style={styles.placeRowName}>{item.name}</Text>
                        <Text style={styles.placeRowMeta}>{item.neighborhood}</Text>
                      </View>
                    </Pressable>
                  )}
                  showsVerticalScrollIndicator={false}
                />
              </>
            ) : (
              <View style={styles.dateStep}>
                {selectedPlace ? (
                  <View style={styles.selectedPlacePreview}>
                    <View style={[styles.placeDot, { backgroundColor: selectedPlace.accent }]} />
                    <Text style={styles.selectedPlaceName}>{selectedPlace.name}</Text>
                  </View>
                ) : null}
                <ScrollView
                  contentContainerStyle={styles.dateGrid}
                  showsVerticalScrollIndicator={false}
                >
                  {DATE_OPTIONS.map((opt) => {
                    const active = selectedDate === opt.value;
                    return (
                      <Pressable
                        key={opt.value}
                        onPress={() => setSelectedDate(opt.value)}
                        style={[styles.dateChip, active && styles.dateChipActive]}
                      >
                        <Text style={[styles.dateChipText, active && styles.dateChipTextActive]}>
                          {opt.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
                <Pressable
                  disabled={!selectedDate}
                  onPress={handleConfirmPropose}
                  style={[styles.confirmBtn, !selectedDate && styles.confirmBtnDisabled]}
                >
                  <Text style={styles.confirmBtnText}>Proponer</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* --- Share modal --- */}
      <Modal
        animationType="fade"
        onRequestClose={() => setShareVisible(false)}
        transparent
        visible={shareVisible}
      >
        <Pressable
          onPress={() => setShareVisible(false)}
          style={styles.modalOverlay}
        >
          <Pressable style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Invitar al plan</Text>
              <Pressable onPress={() => setShareVisible(false)} style={styles.modalClose}>
                <Ionicons color={fecaTheme.colors.muted} name="close" size={20} />
              </Pressable>
            </View>

            {inviteCode && inviteLink ? (
              <>
                <Text style={styles.modalSubtitle}>
                  Compartí este link o código para que se sumen al plan.
                </Text>

                <View style={styles.codeBlock}>
                  <Text style={styles.codeLabel}>CÓDIGO</Text>
                  <Text style={styles.codeValue}>{inviteCode}</Text>
                </View>

                <View style={styles.linkBlock}>
                  <Text style={styles.linkLabel}>LINK</Text>
                  <View style={styles.linkRow}>
                    <Text numberOfLines={1} style={styles.linkValue}>{inviteLink}</Text>
                    <Pressable onPress={handleCopy} style={styles.copyBtn}>
                      <Ionicons
                        color={copied ? fecaTheme.colors.primary : fecaTheme.colors.onSurface}
                        name={copied ? "checkmark" : "copy-outline"}
                        size={16}
                      />
                      <Text style={[styles.copyText, copied && { color: fecaTheme.colors.primary }]}>
                        {copied ? "Copiado" : "Copiar"}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </>
            ) : (
              <Text style={styles.modalSubtitle}>
                Las invitaciones con código y enlace se habilitan cuando el servidor envía un{" "}
                <Text style={styles.modalSubtitleEm}>inviteCode</Text>. No usamos el id del plan como
                código.
              </Text>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* --- Invitar amigos (después de crear el plan) --- */}
      <Modal
        animationType="slide"
        onRequestClose={() => setInviteVisible(false)}
        transparent
        visible={inviteVisible}
      >
        <View style={styles.proposeOverlay}>
          <View
            style={[
              styles.inviteSheet,
              keyboardInset > 0
                ? {
                    marginBottom: keyboardInset,
                    maxHeight: Math.min(
                      windowHeight * 0.88,
                      windowHeight - keyboardInset - 24,
                    ),
                  }
                : null,
            ]}
          >
            <View style={styles.modalHeader}>
              <Pressable
                onPress={() => setInviteVisible(false)}
                style={styles.modalClose}
              >
                <Ionicons color={fecaTheme.colors.onSurface} name="close" size={20} />
              </Pressable>
              <Text style={styles.modalTitle}>Invitar amigos</Text>
              <View style={styles.modalClose} />
            </View>
            <Text style={styles.inviteSheetSubtitle}>
              Elegí a quiénes querés sumar a este plan. También podés compartir el
              código desde el botón compartir.
            </Text>
            <View style={styles.inviteFormPad}>
              <FormField
                autoCapitalize="none"
                autoCorrect={false}
                onChangeText={setInviteSearch}
                placeholder="Buscar amigo..."
                value={inviteSearch}
              />
            </View>
            <ScrollView
              contentContainerStyle={
                keyboardInset > 0
                  ? {
                      paddingBottom: keyboardInset + fecaTheme.spacing.md,
                    }
                  : undefined
              }
              keyboardDismissMode="on-drag"
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              style={[
                styles.inviteList,
                keyboardInset > 0
                  ? {
                      maxHeight: Math.max(
                        160,
                        Math.min(
                          340,
                          windowHeight - keyboardInset - 220,
                        ),
                      ),
                    }
                  : null,
              ]}
            >
              {filteredInviteFriends.length === 0 ? (
                <Text style={styles.inviteEmpty}>
                  {friendsNotInGroup.length === 0
                    ? friends.length === 0
                      ? "No tenés amigos para invitar todavía. Encontrá gente en la pestaña Explorar o invitá con el código del plan."
                      : "Todos tus amigos ya están en este plan."
                    : "No hay coincidencias con la búsqueda."}
                </Text>
              ) : (
                filteredInviteFriends.map((friend) => (
                  <FriendRow
                    key={friend.id}
                    mode="picker"
                    onPress={() => toggleInviteFriend(friend.id)}
                    selected={inviteSelection.includes(friend.id)}
                    user={friend}
                  />
                ))
              )}
            </ScrollView>
            <View style={styles.inviteActions}>
              <GradientButton
                disabled={inviteSelection.length === 0 || inviteBusy}
                label={
                  inviteBusy
                    ? "Enviando…"
                    : inviteSelection.length === 0
                      ? "Elegí al menos una persona"
                      : `Invitar (${inviteSelection.length})`
                }
                onPress={handleConfirmInvites}
              />
              <TextLinkButton
                label="Cerrar"
                onPress={() => setInviteVisible(false)}
              />
            </View>
          </View>
        </View>
      </Modal>

      <SaveToListSheet
        accessToken={accessToken}
        onClose={() => setSaveGroupSheetOpen(false)}
        target={
          group
            ? {
                type: "group",
                groupId: group.id,
                groupName: group.name,
                photoUrl: group.events[0]?.place.photoUrl ?? null,
              }
            : null
        }
        visible={saveGroupSheetOpen}
      />
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
  topBarRight: {
    alignItems: "center",
    flexDirection: "row",
    gap: fecaTheme.spacing.sm,
  },
  navBtn: {
    alignItems: "center",
    backgroundColor: fecaTheme.surfaces.high,
    borderRadius: fecaTheme.radii.pill,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  header: {
    gap: fecaTheme.spacing.xs,
    marginBottom: fecaTheme.spacing.xl,
  },
  groupName: {
    ...fecaTheme.typography.headline,
    color: fecaTheme.colors.onSurface,
  },
  createdBy: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.muted,
  },
  section: {
    gap: fecaTheme.spacing.sm,
    marginBottom: fecaTheme.spacing.xl,
  },
  sectionRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  membersHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: fecaTheme.spacing.sm,
    justifyContent: "space-between",
    marginBottom: fecaTheme.spacing.xs,
  },
  membersRowTitle: {
    flex: 1,
    marginBottom: 0,
  },
  sectionTitle: {
    ...fecaTheme.typography.bodyStrong,
    color: fecaTheme.colors.onSurface,
    marginBottom: fecaTheme.spacing.xs,
  },
  inviteMembersBtn: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: fecaTheme.spacing.sm,
    paddingVertical: fecaTheme.spacing.xs,
  },
  inviteMembersBtnLabel: {
    ...fecaTheme.typography.bodyStrong,
    color: fecaTheme.colors.primary,
    fontSize: 15,
  },
  membersHint: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.muted,
    lineHeight: 18,
    marginBottom: fecaTheme.spacing.sm,
  },
  addBtnSmall: {
    alignItems: "center",
    backgroundColor: fecaTheme.colors.primary,
    borderRadius: fecaTheme.radii.pill,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  membersScroll: {
    gap: fecaTheme.spacing.lg,
    paddingVertical: fecaTheme.spacing.xs,
  },
  memberItem: {
    alignItems: "center",
    gap: 4,
    width: 64,
  },
  memberName: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.onSurface,
    fontSize: 12,
    textAlign: "center",
  },
  eventList: {
    gap: fecaTheme.spacing.sm,
  },
  eventCardOuter: {
    backgroundColor: fecaTheme.surfaces.lowest,
    borderRadius: fecaTheme.radii.md,
    overflow: "hidden",
    ...fecaTheme.elevation.ambient,
  },
  eventCard: {
    alignItems: "center",
    flexDirection: "row",
    gap: fecaTheme.spacing.sm,
    padding: fecaTheme.spacing.md,
  },
  eventDot: {
    borderRadius: 8,
    height: 16,
    width: 16,
  },
  eventInfo: {
    flex: 1,
    gap: 3,
  },
  eventPlace: {
    ...fecaTheme.typography.bodyStrong,
    color: fecaTheme.colors.onSurface,
    fontSize: 15,
  },
  eventMetaRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 5,
  },
  eventDate: {
    ...fecaTheme.typography.meta,
    fontSize: 13,
  },
  eventStatusLabel: {
    ...fecaTheme.typography.label,
    color: fecaTheme.colors.muted,
    fontSize: 10,
    lineHeight: 14,
  },
  eventProposedBy: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.muted,
    fontSize: 12,
    lineHeight: 16,
  },
  expandedActions: {
    borderTopColor: fecaTheme.colors.outlineVariant,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: fecaTheme.spacing.sm,
    paddingVertical: fecaTheme.spacing.xs,
  },
  actionRow: {
    alignItems: "center",
    borderRadius: fecaTheme.radii.sm,
    flexDirection: "row",
    gap: fecaTheme.spacing.sm,
    minHeight: 44,
    paddingHorizontal: fecaTheme.spacing.sm,
  },
  actionText: {
    ...fecaTheme.typography.bodyStrong,
    color: fecaTheme.colors.onSurface,
    fontSize: 14,
  },
  proposeOverlay: {
    backgroundColor: "rgba(27, 28, 26, 0.45)",
    flex: 1,
    justifyContent: "flex-end",
  },
  proposeSheet: {
    backgroundColor: fecaTheme.surfaces.lowest,
    borderTopLeftRadius: fecaTheme.radii.xl,
    borderTopRightRadius: fecaTheme.radii.xl,
    maxHeight: "80%",
    paddingBottom: 32,
    paddingTop: fecaTheme.spacing.lg,
    ...fecaTheme.elevation.floating,
  },
  inviteSheet: {
    backgroundColor: fecaTheme.surfaces.lowest,
    borderTopLeftRadius: fecaTheme.radii.xl,
    borderTopRightRadius: fecaTheme.radii.xl,
    maxHeight: "88%",
    paddingBottom: fecaTheme.spacing.xl,
    paddingTop: fecaTheme.spacing.lg,
    ...fecaTheme.elevation.floating,
  },
  inviteSheetSubtitle: {
    ...fecaTheme.typography.body,
    color: fecaTheme.colors.muted,
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: fecaTheme.spacing.xl,
    marginBottom: fecaTheme.spacing.sm,
  },
  inviteFormPad: {
    paddingHorizontal: fecaTheme.spacing.xl,
  },
  inviteList: {
    flexGrow: 0,
    maxHeight: 340,
    paddingHorizontal: fecaTheme.spacing.xl,
  },
  inviteEmpty: {
    ...fecaTheme.typography.body,
    color: fecaTheme.colors.muted,
    fontSize: 14,
    lineHeight: 20,
    paddingVertical: fecaTheme.spacing.lg,
  },
  inviteActions: {
    gap: fecaTheme.spacing.md,
    marginTop: fecaTheme.spacing.lg,
    paddingHorizontal: fecaTheme.spacing.xl,
  },
  tabChips: {
    flexDirection: "row",
    gap: fecaTheme.spacing.sm,
    marginTop: fecaTheme.spacing.sm,
    paddingHorizontal: fecaTheme.spacing.xl,
  },
  tabChip: {
    alignItems: "center",
    backgroundColor: fecaTheme.surfaces.low,
    borderRadius: fecaTheme.radii.pill,
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: fecaTheme.spacing.md,
    paddingVertical: fecaTheme.spacing.xs,
  },
  tabChipActive: {
    backgroundColor: fecaTheme.colors.primary,
  },
  tabChipText: {
    ...fecaTheme.typography.label,
    color: fecaTheme.colors.onSurface,
    fontSize: 13,
  },
  tabChipTextActive: {
    color: fecaTheme.colors.onPrimary,
  },
  searchRow: {
    alignItems: "center",
    backgroundColor: fecaTheme.surfaces.low,
    borderRadius: fecaTheme.radii.sm,
    flexDirection: "row",
    gap: fecaTheme.spacing.sm,
    marginHorizontal: fecaTheme.spacing.xl,
    marginTop: fecaTheme.spacing.sm,
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
  placeList: {
    paddingHorizontal: fecaTheme.spacing.xl,
    paddingTop: fecaTheme.spacing.md,
  },
  placeRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: fecaTheme.spacing.sm,
    minHeight: 56,
    paddingVertical: fecaTheme.spacing.sm,
  },
  placeDot: {
    borderRadius: 10,
    height: 20,
    width: 20,
  },
  placeRowInfo: {
    flex: 1,
    gap: 2,
  },
  placeRowName: {
    ...fecaTheme.typography.bodyStrong,
    color: fecaTheme.colors.onSurface,
    fontSize: 15,
  },
  placeRowMeta: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.muted,
  },
  emptyText: {
    ...fecaTheme.typography.body,
    color: fecaTheme.colors.muted,
    paddingVertical: fecaTheme.spacing.xl,
    textAlign: "center",
  },
  dateStep: {
    gap: fecaTheme.spacing.lg,
    paddingHorizontal: fecaTheme.spacing.xl,
    paddingTop: fecaTheme.spacing.md,
  },
  selectedPlacePreview: {
    alignItems: "center",
    backgroundColor: fecaTheme.surfaces.low,
    borderRadius: fecaTheme.radii.sm,
    flexDirection: "row",
    gap: fecaTheme.spacing.sm,
    paddingHorizontal: fecaTheme.spacing.md,
    paddingVertical: fecaTheme.spacing.sm,
  },
  selectedPlaceName: {
    ...fecaTheme.typography.bodyStrong,
    color: fecaTheme.colors.onSurface,
    fontSize: 15,
  },
  dateGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: fecaTheme.spacing.sm,
  },
  dateChip: {
    backgroundColor: fecaTheme.surfaces.low,
    borderRadius: fecaTheme.radii.sm,
    paddingHorizontal: fecaTheme.spacing.md,
    paddingVertical: fecaTheme.spacing.sm,
  },
  dateChipActive: {
    backgroundColor: fecaTheme.colors.primary,
  },
  dateChipText: {
    ...fecaTheme.typography.bodyStrong,
    color: fecaTheme.colors.onSurface,
    fontSize: 13,
  },
  dateChipTextActive: {
    color: fecaTheme.colors.onPrimary,
  },
  confirmBtn: {
    alignItems: "center",
    backgroundColor: fecaTheme.colors.primary,
    borderRadius: fecaTheme.radii.md,
    paddingVertical: fecaTheme.spacing.md,
  },
  confirmBtnDisabled: {
    opacity: 0.4,
  },
  confirmBtnText: {
    ...fecaTheme.typography.bodyStrong,
    color: fecaTheme.colors.onPrimary,
    fontSize: 15,
  },
  modalOverlay: {
    alignItems: "center",
    backgroundColor: "rgba(27, 28, 26, 0.45)",
    flex: 1,
    justifyContent: "center",
    padding: fecaTheme.spacing.xl,
  },
  modalCard: {
    backgroundColor: fecaTheme.surfaces.lowest,
    borderRadius: fecaTheme.radii.lg,
    gap: fecaTheme.spacing.lg,
    maxWidth: 380,
    padding: fecaTheme.spacing.xl,
    width: "100%",
    ...fecaTheme.elevation.floating,
  },
  modalHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
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
  modalSubtitle: {
    ...fecaTheme.typography.body,
    color: fecaTheme.colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  modalSubtitleEm: {
    ...fecaTheme.typography.bodyStrong,
    color: fecaTheme.colors.onSurface,
  },
  codeBlock: {
    alignItems: "center",
    backgroundColor: fecaTheme.surfaces.low,
    borderRadius: fecaTheme.radii.sm,
    gap: fecaTheme.spacing.xs,
    paddingHorizontal: fecaTheme.spacing.lg,
    paddingVertical: fecaTheme.spacing.lg,
  },
  codeLabel: {
    ...fecaTheme.typography.label,
    color: fecaTheme.colors.muted,
  },
  codeValue: {
    ...fecaTheme.typography.numeric,
    color: fecaTheme.colors.onSurface,
    fontSize: 28,
    letterSpacing: 4,
    lineHeight: 34,
  },
  linkBlock: {
    gap: fecaTheme.spacing.xs,
  },
  linkLabel: {
    ...fecaTheme.typography.label,
    color: fecaTheme.colors.muted,
  },
  linkRow: {
    alignItems: "center",
    backgroundColor: fecaTheme.surfaces.low,
    borderRadius: fecaTheme.radii.sm,
    flexDirection: "row",
    gap: fecaTheme.spacing.sm,
    paddingHorizontal: fecaTheme.spacing.md,
    paddingVertical: fecaTheme.spacing.sm,
  },
  linkValue: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.onSurface,
    flex: 1,
  },
  copyBtn: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: fecaTheme.spacing.sm,
    paddingVertical: fecaTheme.spacing.xs,
  },
  copyText: {
    ...fecaTheme.typography.label,
    color: fecaTheme.colors.onSurface,
    fontSize: 11,
  },
});
