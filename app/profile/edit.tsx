import { Ionicons } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";
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
import { ensureAndroidNotificationChannel } from "@/lib/push/expo-notifications-setup";
import { useAuth } from "@/providers/auth-provider";
import { fecaTheme } from "@/theme/feca";
import type { GroupInvitePolicy } from "@/types/auth";

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
  const [pushEnabled, setPushEnabled] = useState(session?.user.pushEnabled !== false);
  const [pushBusy, setPushBusy] = useState(false);
  const [citySheetOpen, setCitySheetOpen] = useState(false);
  const [citySheetResetKey, setCitySheetResetKey] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingForm, setLoadingForm] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!token || !session) {
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
        setPushEnabled(me.pushEnabled !== false);
      } catch {
        if (cancelled) {
          return;
        }

        setDisplayName(session.user.displayName ?? "");
        setUsername(session.user.username ?? "");
        setBio(session.user.bio?.trim() ?? "");
        setEmail(session.user.email ?? "");
        setCityLabel(session.user.city?.trim() || "Sin ciudad");
        setPushEnabled(session.user.pushEnabled !== false);
        setLoadError("No se pudieron cargar los datos mas recientes.");
      } finally {
        if (!cancelled) {
          setLoadingForm(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [session, token]);

  useEffect(() => {
    const city = session?.user.city?.trim();
    if (city) {
      setCityLabel(city);
    }
  }, [session?.user.city]);

  useEffect(() => {
    setPushEnabled(session?.user.pushEnabled !== false);
  }, [session?.user.pushEnabled]);

  const openCitySheet = useCallback(() => {
    setCitySheetResetKey((current) => current + 1);
    setCitySheetOpen(true);
  }, []);

  const onPlanInviteToggle = useCallback(
    (restrictToFollowing: boolean) => {
      if (!token) {
        return;
      }

      const nextPolicy: GroupInvitePolicy = restrictToFollowing
        ? "from_following_only"
        : "everyone";

      setPlanInviteBusy(true);
      void updateProfile({ groupInvitePolicy: nextPolicy })
        .then(() => syncMeFromServer())
        .catch(() => {
          Alert.alert("No se pudo guardar", "Proba de nuevo en unos segundos.");
        })
        .finally(() => {
          setPlanInviteBusy(false);
        });
    },
    [syncMeFromServer, token, updateProfile],
  );

  const onPushToggle = useCallback(
    (nextValue: boolean) => {
      if (!token || pushBusy) {
        return;
      }

      setPushBusy(true);

      void (async () => {
        try {
          if (nextValue && Platform.OS !== "web") {
            const permissions = await Notifications.getPermissionsAsync();
            let finalStatus = permissions.status;

            if (finalStatus !== "granted") {
              if (!permissions.canAskAgain) {
                Alert.alert(
                  "Permisos desactivados",
                  "Activa las notificaciones desde Ajustes para volver a recibir push.",
                );
                return;
              }

              const requested = await Notifications.requestPermissionsAsync();
              finalStatus = requested.status;
            }

            if (finalStatus !== "granted") {
              Alert.alert(
                "Push desactivado",
                "La inbox sigue activa y podes volver a intentarlo desde este perfil.",
              );
              return;
            }

            await ensureAndroidNotificationChannel();
          }

          await updateProfile({ pushEnabled: nextValue });
          setPushEnabled(nextValue);
          await syncMeFromServer();
        } catch {
          setPushEnabled(session?.user.pushEnabled !== false);
          Alert.alert("No se pudo guardar", "Proba de nuevo en unos segundos.");
        } finally {
          setPushBusy(false);
        }
      })();
    },
    [pushBusy, session?.user.pushEnabled, syncMeFromServer, token, updateProfile],
  );

  const onSave = useCallback(async () => {
    if (!token) {
      return;
    }

    const nextDisplayName = displayName.trim();
    const nextUsername = username.trim().toLowerCase();
    const nextBio = bio.trim();

    if (nextDisplayName.length === 0) {
      Alert.alert("Nombre vacio", "Escribi como queres que te vean en FECA.");
      return;
    }

    if (!USERNAME_RE.test(nextUsername)) {
      Alert.alert(
        "Usuario invalido",
        "Entre 3 y 30 caracteres, solo letras minusculas, numeros y guiones.",
      );
      return;
    }

    setSaving(true);
    try {
      await updateProfile({
        bio: nextBio.length === 0 ? null : nextBio,
        displayName: nextDisplayName,
        username: nextUsername,
      });
      await syncMeFromServer();
      router.back();
    } catch {
      Alert.alert("No se pudo guardar", "Reintenta en unos segundos.");
    } finally {
      setSaving(false);
    }
  }, [bio, displayName, syncMeFromServer, token, updateProfile, username]);

  const onDeletePress = useCallback(() => {
    Alert.alert(
      "Eliminar cuenta",
      "Se borraran tu perfil, guias, visitas y datos asociados. Esta accion no se puede deshacer.",
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
                  "Comprueba la conexion o intenta cerrar sesion y volver a entrar.",
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

  if (!token || !session) {
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
                  Lo usamos para iniciar sesion; no se puede cambiar desde la app.
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
                  onChangeText={(value) => setUsername(value.toLowerCase())}
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
                    <Text numberOfLines={2} style={styles.cityValue}>
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
                    Ciudad canonica: afecta busquedas, feed y recomendaciones cerca
                    tuyo.
                  </Text>
                </View>

                <View style={styles.card}>
                  <View style={styles.cardTextCol}>
                    <Text style={styles.cardTitle}>Invitaciones a planes</Text>
                    <Text style={styles.cardBody}>
                      Si esta activo, solo podes unirte por invitacion cuando quien
                      invita es alguien que vos seguis.
                    </Text>
                  </View>
                  <Switch
                    accessibilityLabel="Solo invitaciones de gente que sigo"
                    disabled={planInviteBusy}
                    ios_backgroundColor={fecaTheme.surfaces.container}
                    onValueChange={(value) => onPlanInviteToggle(value)}
                    thumbColor={fecaTheme.surfaces.lowest}
                    trackColor={{
                      false: fecaTheme.colors.outlineVariantBase,
                      true: fecaTheme.colors.primary,
                    }}
                    value={session.user.groupInvitePolicy === "from_following_only"}
                  />
                </View>

                <View style={styles.card}>
                  <View style={styles.cardTextCol}>
                    <Text style={styles.cardTitle}>Notificaciones push</Text>
                    <Text style={styles.cardBody}>
                      La inbox sigue activa siempre. Este switch controla solo la
                      entrega por push y puede reactivarse desde aca.
                    </Text>
                  </View>
                  <Switch
                    accessibilityLabel="Notificaciones push"
                    disabled={pushBusy}
                    ios_backgroundColor={fecaTheme.surfaces.container}
                    onValueChange={(value) => onPushToggle(value)}
                    thumbColor={fecaTheme.surfaces.lowest}
                    trackColor={{
                      false: fecaTheme.colors.outlineVariantBase,
                      true: fecaTheme.colors.primary,
                    }}
                    value={pushEnabled}
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
                      Cuando salis, con quien y que priorizas (privado)
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
                label={saving ? "Guardando..." : "Guardar cambios"}
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
                    {deleting ? "Eliminando..." : "Eliminar mi cuenta"}
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
  card: {
    alignItems: "center",
    backgroundColor: fecaTheme.surfaces.container,
    borderRadius: fecaTheme.radii.md,
    flexDirection: "row",
    gap: fecaTheme.spacing.md,
    padding: fecaTheme.spacing.md,
    ...fecaTheme.elevation.ambient,
  },
  cardTextCol: {
    flex: 1,
    gap: fecaTheme.spacing.xs,
  },
  cardTitle: {
    ...fecaTheme.typography.bodyStrong,
    color: fecaTheme.colors.onSurface,
  },
  cardBody: {
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
