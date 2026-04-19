import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { useEffect, useRef } from "react";
import { Platform } from "react-native";

import { registerExpoPushToken } from "@/lib/api/push";
import { ensureAndroidNotificationChannel } from "@/lib/push/expo-notifications-setup";
import { useAuth } from "@/providers/auth-provider";

function resolveExpoProjectId(): string | undefined {
  const extra = Constants.expoConfig?.extra as
    | { eas?: { projectId?: string } }
    | undefined;
  const fromExtra = extra?.eas?.projectId?.trim();
  if (fromExtra) return fromExtra;
  const eas = (
    Constants as {
      easConfig?: { projectId?: string };
    }
  ).easConfig;
  return eas?.projectId?.trim();
}

/**
 * Pide permiso, obtiene el token de Expo Push y lo envía al servidor.
 * Requiere build nativo (dev client / store) y `EXPO_PUBLIC_EAS_PROJECT_ID` en app config.
 */
export function useExpoPushRegistration() {
  const { session } = useAuth();
  const lastSentTokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (Platform.OS === "web") return;
    if (!session?.accessToken) {
      lastSentTokenRef.current = null;
      return;
    }
    if (!Device.isDevice) return;

    let cancelled = false;

    void (async () => {
      const { status: existing } = await Notifications.getPermissionsAsync();
      let finalStatus = existing;
      if (existing !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== "granted" || cancelled) return;

      await ensureAndroidNotificationChannel();

      const projectId = resolveExpoProjectId();
      if (!projectId) {
        if (__DEV__) {
          console.warn(
            "[push] Definí EXPO_PUBLIC_EAS_PROJECT_ID (EAS project ID) para registrar el token de Expo.",
          );
        }
        return;
      }

      try {
        const { data: token } = await Notifications.getExpoPushTokenAsync({
          projectId,
        });
        if (cancelled || !token || token === lastSentTokenRef.current) return;
        await registerExpoPushToken(session.accessToken, token);
        lastSentTokenRef.current = token;
      } catch (e) {
        if (__DEV__) {
          console.warn("[push] No se pudo registrar el token de Expo:", e);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [session?.accessToken]);
}
