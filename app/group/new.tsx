import { Ionicons } from "@expo/vector-icons";
import { Redirect, router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  UIManager,
  View,
} from "react-native";

import { FriendRow } from "@/components/cards/friend-row";
import { FormField } from "@/components/ui/form-field";
import { GradientButton } from "@/components/ui/gradient-button";
import { PageBackground } from "@/components/ui/page-background";
import { TextLinkButton } from "@/components/ui/text-link-button";
import { useKeyboardBottomInset } from "@/hooks/use-keyboard-bottom-inset";
import { fetchMyFriends } from "@/lib/api/friends";
import { createGroup, joinGroupByCode } from "@/lib/api/groups";
import { mapApiUserPublicToUser } from "@/lib/feca/map-api-user";
import { useAuth } from "@/providers/auth-provider";
import { fecaTheme } from "@/theme/feca";
import type { User } from "@/types/feca";

type Step = "name" | "join" | "members" | "success";

export default function NewGroupScreen() {
  const { session } = useAuth();
  const accessToken = session?.accessToken;
  const [friends, setFriends] = useState<User[]>([]);

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

  const [step, setStep] = useState<Step>("name");
  const [groupName, setGroupName] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [friendSearch, setFriendSearch] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [joinBusy, setJoinBusy] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);
  const keyboardInset = useKeyboardBottomInset();

  useEffect(() => {
    if (UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  useEffect(() => {
    if (step !== "success") return;
    const timeout = setTimeout(() => router.back(), 1500);
    return () => clearTimeout(timeout);
  }, [step]);

  const filteredFriends = useMemo(() => {
    const q = friendSearch.trim().toLowerCase();
    if (!q) return friends;
    return friends.filter((f) =>
      `${f.displayName} ${f.username}`.toLowerCase().includes(q),
    );
  }, [friends, friendSearch]);

  const goToStep = (next: Step) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setStep(next);
  };

  const toggleMember = (id: string) => {
    setSelectedMemberIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  };

  if (!accessToken) {
    return <Redirect href="/(onboarding)/welcome" />;
  }

  const handleCreate = () => {
    Keyboard.dismiss();
    void (async () => {
      setCreateBusy(true);
      try {
        await createGroup(accessToken, {
          name: groupName,
          memberIds: selectedMemberIds,
        });
        goToStep("success");
      } catch {
        return;
      } finally {
        setCreateBusy(false);
      }
    })();
  };

  const handleJoinByCode = () => {
    Keyboard.dismiss();
    const code = joinCode.trim();
    if (!code) return;

    setJoinBusy(true);
    void (async () => {
      try {
        const group = await joinGroupByCode(accessToken, { code });
        router.replace(`/group/${group.id}`);
      } catch {
        setJoinBusy(false);
      }
    })();
  };

  return (
    <PageBackground>
      <View style={styles.root}>
        <View style={styles.topBar}>
          <Pressable
            onPress={() => {
              if (step === "members") {
                goToStep("name");
                return;
              }
              if (step === "join") {
                setJoinCode("");
                goToStep("name");
                return;
              }
              router.back();
            }}
            style={styles.navButton}
          >
            <Ionicons color={fecaTheme.colors.onSurface} name="chevron-back" size={18} />
          </Pressable>
          <Pressable onPress={() => router.back()} style={styles.navButton}>
            <Ionicons color={fecaTheme.colors.onSurface} name="close" size={20} />
          </Pressable>
        </View>

        {step === "name" ? (
          <View style={styles.stepWrap}>
            <Text style={styles.title}>Nuevo plan</Text>
            <Text style={styles.stepSubtitle}>
              Un nombre para organizar salidas con fecha y lugar (no hace falta que sea eterno).
            </Text>
            <FormField
              autoCapitalize="words"
              autoCorrect={false}
              onChangeText={setGroupName}
              onSubmitEditing={() => {
                Keyboard.dismiss();
                if (groupName.trim()) {
                  goToStep("members");
                }
              }}
              placeholder="Nombre del plan..."
              returnKeyType="next"
              value={groupName}
            />
            <View style={styles.spacer} />
            <Pressable onPress={() => goToStep("join")} style={styles.joinLink}>
              <Ionicons color={fecaTheme.colors.primary} name="enter-outline" size={16} />
              <Text style={styles.joinLinkText}>Tengo un código de invitación</Text>
            </Pressable>
            <GradientButton
              disabled={!groupName.trim()}
              label="Siguiente"
              onPress={() => goToStep("members")}
            />
          </View>
        ) : null}

        {step === "join" ? (
          <View style={styles.stepWrap}>
            <Text style={styles.title}>Unirme con código</Text>
            <Text style={styles.joinDescription}>
              El código lo envía el servidor como inviteCode (no es el id del plan).
            </Text>
            <FormField
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={12}
              onChangeText={setJoinCode}
              onSubmitEditing={() => {
                Keyboard.dismiss();
                if (joinCode.trim() && !joinBusy) {
                  handleJoinByCode();
                }
              }}
              placeholder="Código de invitación"
              returnKeyType="go"
              value={joinCode}
            />
            <View style={styles.spacer} />
            <GradientButton
              disabled={!joinCode.trim() || joinBusy}
              label={joinBusy ? "Uniendo…" : "Unirme"}
              onPress={handleJoinByCode}
            />
            <TextLinkButton
              label="Volver"
              onPress={() => {
                setJoinCode("");
                goToStep("name");
              }}
            />
          </View>
        ) : null}

        {step === "members" ? (
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.stepWrap}
          >
            <Text style={styles.title}>Invitar amigos</Text>
            <Text style={styles.membersHint}>
              Es opcional: podés elegir gente ahora o crear el plan sin invitados y sumar
              amigos más tarde desde el plan.
            </Text>
            {selectedMemberIds.length > 0 ? (
              <Text style={styles.selectedCount}>
                {selectedMemberIds.length} seleccionado{selectedMemberIds.length > 1 ? "s" : ""}
              </Text>
            ) : null}
            <FormField
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={setFriendSearch}
              onSubmitEditing={Keyboard.dismiss}
              placeholder="Buscar amigo..."
              returnKeyType="search"
              value={friendSearch}
            />
            <ScrollView
              contentContainerStyle={{
                flexGrow: 1,
                paddingBottom:
                  keyboardInset > 0
                    ? keyboardInset + fecaTheme.spacing.xl
                    : fecaTheme.spacing.md,
              }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              style={styles.listScroll}
            >
              {filteredFriends.length === 0 ? (
                <Text style={styles.emptyFriends}>
                  {friends.length === 0
                    ? "Todavía no tenés amigos en feca. Podés crear el plan igual y compartir el código cuando quieras."
                    : "No encontramos coincidencias con la búsqueda."}
                </Text>
              ) : (
                filteredFriends.map((friend) => (
                  <FriendRow
                    key={friend.id}
                    mode="picker"
                    onPress={() => toggleMember(friend.id)}
                    selected={selectedMemberIds.includes(friend.id)}
                    user={friend}
                  />
                ))
              )}
            </ScrollView>
            <View style={styles.actions}>
              <GradientButton
                disabled={createBusy}
                label={
                  createBusy
                    ? "Creando…"
                    : selectedMemberIds.length === 0
                      ? "Crear plan sin invitados"
                      : "Crear plan"
                }
                onPress={handleCreate}
              />
              <TextLinkButton label="Atrás" onPress={() => goToStep("name")} />
            </View>
          </KeyboardAvoidingView>
        ) : null}

        {step === "success" ? (
          <Pressable
            onPress={() => router.back()}
            style={styles.successPressable}
          >
            <View style={styles.successWrap}>
              <Ionicons color={fecaTheme.colors.primary} name="checkmark-circle" size={64} />
              <Text style={styles.successTitle}>Plan creado</Text>
              <Text style={styles.successMeta}>{groupName}</Text>
            </View>
          </Pressable>
        ) : null}
      </View>
    </PageBackground>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: fecaTheme.spacing.xl,
    paddingTop: fecaTheme.spacing.xl,
  },
  navButton: {
    alignItems: "center",
    backgroundColor: fecaTheme.surfaces.high,
    borderRadius: fecaTheme.radii.pill,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  stepWrap: {
    flex: 1,
    paddingBottom: fecaTheme.spacing.xl,
    paddingHorizontal: fecaTheme.spacing.xl,
  },
  title: {
    ...fecaTheme.typography.headline,
    color: fecaTheme.colors.onSurface,
    marginBottom: fecaTheme.spacing.sm,
    marginTop: fecaTheme.spacing.xl,
  },
  stepSubtitle: {
    ...fecaTheme.typography.body,
    color: fecaTheme.colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: fecaTheme.spacing.lg,
  },
  selectedCount: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.primary,
    marginBottom: fecaTheme.spacing.sm,
  },
  membersHint: {
    ...fecaTheme.typography.body,
    color: fecaTheme.colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: fecaTheme.spacing.md,
  },
  emptyFriends: {
    ...fecaTheme.typography.body,
    color: fecaTheme.colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: fecaTheme.spacing.md,
    paddingVertical: fecaTheme.spacing.sm,
  },
  listScroll: {
    flex: 1,
    marginTop: fecaTheme.spacing.sm,
  },
  spacer: {
    flex: 1,
  },
  joinLink: {
    alignItems: "center",
    alignSelf: "center",
    flexDirection: "row",
    gap: 6,
    marginBottom: fecaTheme.spacing.lg,
    paddingVertical: fecaTheme.spacing.sm,
  },
  joinLinkText: {
    ...fecaTheme.typography.bodyStrong,
    color: fecaTheme.colors.primary,
    fontSize: 14,
  },
  joinDescription: {
    ...fecaTheme.typography.body,
    color: fecaTheme.colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: fecaTheme.spacing.lg,
  },
  actions: {
    gap: fecaTheme.spacing.md,
    marginTop: fecaTheme.spacing.xl,
  },
  successPressable: {
    flex: 1,
  },
  successWrap: {
    alignItems: "center",
    flex: 1,
    gap: fecaTheme.spacing.sm,
    justifyContent: "center",
    paddingHorizontal: fecaTheme.spacing.xl,
  },
  successTitle: {
    ...fecaTheme.typography.title,
    color: fecaTheme.colors.onSurface,
  },
  successMeta: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.muted,
  },
});
