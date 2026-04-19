import { Ionicons } from "@expo/vector-icons";
import { Redirect, router, type Href } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ChangeCitySheet } from "@/components/ui/change-city-sheet";
import { FormField } from "@/components/ui/form-field";
import { PageBackground } from "@/components/ui/page-background";
import { PrimaryButton } from "@/components/ui/primary-button";
import { paddingBottomStackScreen } from "@/components/ui/screen-padding";
import { StackScreenHeader } from "@/components/ui/stack-screen-header";
import { fetchMe } from "@/lib/api/me";
import { useAuth } from "@/providers/auth-provider";
import { fecaTheme } from "@/theme/feca";
import type { GroupInvitePolicy } from "@/types/auth";

/** Rojo Material-style (no hay token `error` en el theme FECA). */
const DANGER = "#B3261E";

const USERNAME_RE = /^[a-z0-9-]{3,30}$/;

export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const { session, updateProfile, deleteAccount, syncMeFromServer } = useAuth();
  const token = session?.accessToken;

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [email, setEmail] = useState("");
  const [cityLabel, setCityLabel] = useState("");
  const [planInviteBusy, setPlanInviteBusy] = useState(false);
  const [citySheetOpen, setCitySheetOpen] = useState(false);
  const [citySheetResetKey, setCitySheetResetKey] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingForm, setLoadingForm] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!token) {
      setLoadingForm(false);
      return;
    }

    let cancelled = false;
    setLoadingForm(true);
    setLoadError(null);

    void (async () => {
      try {
        const me = await fetchMe(token);
        if (cancelled) {
          return;
        }
        setDisplayName(me.displayName ?? "");
        setUsername(me.username ?? "");
        setBio(me.bio?.trim() ?? "");
        setEmail(me.email ?? session.user.email ?? "");
        setCityLabel(me.city?.trim() || "Sin ciudad");
      } catch {
        if (cancelled) {
          return;
        }
        setDisplayName(session.user.displayName ?? "");
        setUsername(session.user.username ?? "");
        setBio(session.user.bio?.trim() ?? "");
        setEmail(session.user.email ?? "");
        setCityLabel(session.user.city?.trim() || "Sin ciudad");
        setLoadError("No se pudieron cargar los datos más recientes.");
      } finally {
        if (!cancelled) {
          setLoadingForm(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, session?.user?.id]);

  useEffect(() => {
    const c = session?.user.city?.trim();
    if (c) {
      setCityLabel(c);
    }
  }, [session?.user.city]);

  const openCitySheet = useCallback(() => {
    setCitySheetResetKey((k) => k + 1);
    setCitySheetOpen(true);
  }, []);

  const onPlanInviteToggle = useCallback(
    (restrictToFollowing: boolean) => {
      if (!token) {
        return;
      }
      const next: GroupInvitePolicy = restrictToFollowing
        ? "from_following_only"
        : "everyone";
      setPlanInviteBusy(true);
      void updateProfile({ groupInvitePolicy: next })
        .then(() => syncMeFromServer())
        .catch(() => {
          Alert.alert(
            "No se pudo guardar",
            "Probá de nuevo en unos segundos.",
          );
        })
        .finally(() => {
          setPlanInviteBusy(false);
        });
    },
    [syncMeFromServer, token, updateProfile],
  );

  const onSave = useCallback(async () => {
    if (!token) {
      return;
    }

    const dn = displayName.trim();
    const un = username.trim().toLowerCase();
    const bioTrim = bio.trim();

    if (dn.length === 0) {
      Alert.alert("Nombre vacío", "Escribí cómo querés que te vean en FECA.");
      return;
    }
    if (!USERNAME_RE.test(un)) {
      Alert.alert(
        "Usuario inválido",
        "Entre 3 y 30 caracteres, solo letras minúsculas, números y guiones.",
      );
      return;
    }

    setSaving(true);
    try {
      await updateProfile({
        displayName: dn,
        username: un,
        bio: bioTrim.length === 0 ? null : bioTrim,
      });
      await syncMeFromServer();
      router.back();
    } catch {
      Alert.alert("No se pudo guardar", "Reintentá en unos segundos.");
    } finally {
      setSaving(false);
    }
  }, [bio, displayName, syncMeFromServer, token, updateProfile, username]);

  const onDeletePress = useCallback(() => {
    Alert.alert(
      "Eliminar cuenta",
      "Se borrarán tu perfil, guías, visitas y datos asociados. Esta acción no se puede deshacer.",
      [
        { style: "cancel", text: "Cancelar" },
        {
          style: "destructive",
          text: "Eliminar para siempre",
          onPress: () => {
            void (async () => {
              setDeleting(true);
              try {
                await deleteAccount();
                router.replace("/(onboarding)/welcome");
              } catch {
                Alert.alert(
                  "No se pudo eliminar",
                  "Comprobá la conexión o intentá cerrar sesión y volver a entrar.",
                );
              } finally {
                setDeleting(false);
              }
            })();
          },
        },
      ],
    );
  }, [deleteAccount]);

  if (!token) {
    return <Redirect href="/(onboarding)/welcome" />;
  }

  return (
    <PageBackground>
      <ChangeCitySheet
        initialCity={session.user.city ?? ""}
        initialLat={session.user.lat}
        initialLng={session.user.lng}
        onCitySaved={({ displayName: cityDisplay, city }) => {
          setCityLabel(cityDisplay.trim() || city.trim() || "Sin ciudad");
        }}
        onClose={() => setCitySheetOpen(false)}
        resetKey={citySheetOpen ? citySheetResetKey : null}
        visible={citySheetOpen}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <StackScreenHeader title="Editar perfil" titleAlignment="leading" />
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingBottom: paddingBottomStackScreen(insets.bottom) },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {loadError ? <Text style={styles.banner}>{loadError}</Text> : null}

          {loadingForm ? (
            <View style={styles.loadingBlock}>
              <ActivityIndicator color={fecaTheme.colors.primary} />
            </View>
          ) : (
            <>
              <View style={styles.fields}>
                <FormField
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={false}
                  label="Email"
                  value={email}
                />
                <Text style={styles.fieldHint}>
                  Lo usamos para iniciar sesión; no se puede cambiar desde la app.
                </Text>
                <FormField
                  autoCapitalize="words"
                  label="Nombre visible"
                  maxLength={50}
                  onChangeText={setDisplayName}
                  placeholder="Tu nombre"
                  value={displayName}
                />
                <FormField
                  autoCapitalize="none"
                  autoCorrect={false}
                  label="Usuario"
                  maxLength={30}
                  onChangeText={(t) => setUsername(t.toLowerCase())}
                  placeholder="usuario"
                  value={username}
                />
                <FormField
                  label="Bio"
                  maxLength={280}
                  multiline
                  onChangeText={setBio}
                  placeholder="Algo breve sobre vos (opcional)"
                  value={bio}
                />

                <View style={styles.cityBlock}>
                  <Text style={styles.cityLabel}>Ciudad</Text>
                  <View style={styles.cityRow}>
                    <Text style={styles.cityValue} numberOfLines={2}>
                      {cityLabel}
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      onPress={openCitySheet}
                      style={({ pressed }) => [
                        styles.cityBtn,
                        pressed && styles.cityBtnPressed,
                      ]}
                    >
                      <Text style={styles.cityBtnText}>Cambiar</Text>
                      <Ionicons
                        color={fecaTheme.colors.primary}
                        name="chevron-forward"
                        size={18}
                      />
                    </Pressable>
                  </View>
                  <Text style={styles.fieldHint}>
                    Ciudad canónica: afecta búsquedas, feed y recomendaciones cerca tuyo.
                  </Text>
                </View>

                <View style={styles.planInviteCard}>
                  <View style={styles.planInviteTextCol}>
                    <Text style={styles.planInviteTitle}>Invitaciones a planes</Text>
                    <Text style={styles.planInviteBody}>
                      Si está activo, solo podés unirte por invitación cuando quien invita
                      es alguien que vos seguís.
                    </Text>
                  </View>
                  <Switch
                    accessibilityLabel="Solo invitaciones de gente que sigo"
                    disabled={planInviteBusy}
                    ios_backgroundColor={fecaTheme.surfaces.container}
                    onValueChange={(v) => onPlanInviteToggle(v)}
                    thumbColor={fecaTheme.surfaces.lowest}
                    trackColor={{
                      false: fecaTheme.colors.outlineVariantBase,
                      true: fecaTheme.colors.primary,
                    }}
                    value={
                      session.user.groupInvitePolicy === "from_following_only"
                    }
                  />
                </View>

                <Text style={styles.sectionLabel}>Preferencias</Text>
                <Pressable
                  onPress={() => router.push("/outing-preferences" as Href)}
                  style={({ pressed }) => [
                    styles.linkRow,
                    pressed && styles.linkRowPressed,
                  ]}
                >
                  <Ionicons
                    color={fecaTheme.colors.primary}
                    name="sparkles-outline"
                    size={22}
                  />
                  <View style={styles.linkRowText}>
                    <Text style={styles.linkRowTitle}>
                      Preferencias para recomendaciones
                    </Text>
                    <Text style={styles.linkRowMeta}>
                      Cuándo salís, con quién y qué priorizás (privado)
                    </Text>
                  </View>
                  <Ionicons
                    color={fecaTheme.colors.muted}
                    name="chevron-forward"
                    size={20}
                  />
                </Pressable>
                <Pressable
                  onPress={() => router.push("/taste" as Href)}
                  style={({ pressed }) => [
                    styles.linkRow,
                    pressed && styles.linkRowPressed,
                  ]}
                >
                  <Ionicons
                    color={fecaTheme.colors.primary}
                    name="color-palette-outline"
                    size={22}
                  />
                  <View style={styles.linkRowText}>
                    <Text style={styles.linkRowTitle}>Estilo de lugares</Text>
                    <Text style={styles.linkRowMeta}>
                      Chips de gustos para ordenar Explorar
                    </Text>
                  </View>
                  <Ionicons
                    color={fecaTheme.colors.muted}
                    name="chevron-forward"
                    size={20}
                  />
                </Pressable>
              </View>

              <PrimaryButton
                disabled={saving}
                label={saving ? "Guardando…" : "Guardar cambios"}
                onPress={() => void onSave()}
                style={styles.saveBtn}
              />

              <View style={styles.dangerZone}>
                <Text style={styles.dangerTitle}>Zona peligrosa</Text>
                <Text style={styles.dangerMeta}>
                  Al eliminar la cuenta se pierde todo el historial en FECA.
                </Text>
                <Pressable
                  accessibilityRole="button"
                  disabled={deleting}
                  onPress={onDeletePress}
                  style={({ pressed }) => [
                    styles.deleteBtn,
                    pressed && !deleting && styles.deleteBtnPressed,
                    deleting && styles.deleteBtnDisabled,
                  ]}
                >
                  {deleting ? (
                    <ActivityIndicator color={DANGER} size="small" />
                  ) : (
                    <Ionicons color={DANGER} name="trash-outline" size={20} />
                  )}
                  <Text style={styles.deleteLabel}>
                    {deleting ? "Eliminando…" : "Eliminar mi cuenta"}
                  </Text>
                </Pressable>
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </PageBackground>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scroll: {
    gap: fecaTheme.spacing.lg,
    paddingHorizontal: fecaTheme.spacing.lg,
    paddingTop: fecaTheme.spacing.md,
  },
  banner: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.secondary,
    textAlign: "center",
  },
  loadingBlock: {
    paddingVertical: fecaTheme.spacing.xl * 2,
  },
  fields: {
    gap: fecaTheme.spacing.lg,
  },
  fieldHint: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.muted,
    marginTop: -fecaTheme.spacing.sm,
  },
  cityBlock: {
    gap: fecaTheme.spacing.xs,
  },
  cityLabel: {
    ...fecaTheme.typography.label,
    color: fecaTheme.colors.muted,
  },
  cityRow: {
    alignItems: "center",
    backgroundColor: fecaTheme.surfaces.low,
    borderRadius: fecaTheme.radii.sm,
    flexDirection: "row",
    gap: fecaTheme.spacing.sm,
    minHeight: 48,
    paddingHorizontal: fecaTheme.spacing.md,
    paddingVertical: fecaTheme.spacing.sm,
  },
  cityValue: {
    ...fecaTheme.typography.body,
    color: fecaTheme.colors.onSurface,
    flex: 1,
  },
  cityBtn: {
    alignItems: "center",
    flexDirection: "row",
    gap: 2,
    paddingVertical: fecaTheme.spacing.xs,
  },
  cityBtnPressed: {
    opacity: 0.75,
  },
  cityBtnText: {
    ...fecaTheme.typography.bodyStrong,
    color: fecaTheme.colors.primary,
  },
  planInviteCard: {
    alignItems: "center",
    backgroundColor: fecaTheme.surfaces.container,
    borderRadius: fecaTheme.radii.md,
    flexDirection: "row",
    gap: fecaTheme.spacing.md,
    padding: fecaTheme.spacing.md,
    ...fecaTheme.elevation.ambient,
  },
  planInviteTextCol: {
    flex: 1,
    gap: fecaTheme.spacing.xs,
  },
  planInviteTitle: {
    ...fecaTheme.typography.bodyStrong,
    color: fecaTheme.colors.onSurface,
  },
  planInviteBody: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.muted,
    lineHeight: 18,
  },
  sectionLabel: {
    ...fecaTheme.typography.label,
    color: fecaTheme.colors.muted,
    letterSpacing: 1.2,
    marginTop: fecaTheme.spacing.sm,
  },
  linkRow: {
    alignItems: "center",
    backgroundColor: fecaTheme.surfaces.container,
    borderRadius: fecaTheme.radii.md,
    flexDirection: "row",
    gap: fecaTheme.spacing.md,
    paddingHorizontal: fecaTheme.spacing.md,
    paddingVertical: fecaTheme.spacing.md,
    ...fecaTheme.elevation.ambient,
  },
  linkRowPressed: {
    opacity: 0.92,
  },
  linkRowText: {
    flex: 1,
    gap: 2,
  },
  linkRowTitle: {
    ...fecaTheme.typography.bodyStrong,
    color: fecaTheme.colors.onSurface,
  },
  linkRowMeta: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.muted,
  },
  saveBtn: {
    marginTop: fecaTheme.spacing.sm,
  },
  dangerZone: {
    borderColor: fecaTheme.colors.outlineVariant,
    borderRadius: fecaTheme.radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    gap: fecaTheme.spacing.sm,
    marginTop: fecaTheme.spacing.xl,
    padding: fecaTheme.spacing.lg,
  },
  dangerTitle: {
    ...fecaTheme.typography.bodyStrong,
    color: fecaTheme.colors.onSurface,
  },
  dangerMeta: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.muted,
    lineHeight: 18,
  },
  deleteBtn: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderColor: DANGER,
    borderRadius: fecaTheme.radii.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: fecaTheme.spacing.sm,
    marginTop: fecaTheme.spacing.sm,
    minHeight: 44,
    paddingHorizontal: fecaTheme.spacing.lg,
    paddingVertical: fecaTheme.spacing.sm,
  },
  deleteBtnPressed: {
    opacity: 0.88,
  },
  deleteBtnDisabled: {
    opacity: 0.6,
  },
  deleteLabel: {
    ...fecaTheme.typography.bodyStrong,
    color: DANGER,
    fontSize: 15,
  },
});
