import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { useSegments } from "expo-router";
import { useEffect, useRef } from "react";
import { Platform } from "react-native";

import {
  registerExpoPushToken,
  revokeExpoPushInstallation,
} from "@/lib/api/push";
import { ensureAndroidNotificationChannel } from "@/lib/push/expo-notifications-setup";
import { getPushInstallationId } from "@/lib/push/push-installation-id";
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
  const { onboardingRoute, session } = useAuth();
  const segments = useSegments();
  const lastSubmittedSignatureRef = useRef<string | null>(null);
  const lastRevokedSignatureRef = useRef<string | null>(null);
  const hasAttemptedPermissionRequestRef = useRef(false);
  const isInOnboardingFlow =
    onboardingRoute !== null || segments[0] === "(onboarding)";

  useEffect(() => {
    if (Platform.OS === "web") return;
    if (!session?.accessToken) {
      hasAttemptedPermissionRequestRef.current = false;
      lastRevokedSignatureRef.current = null;
      lastSubmittedSignatureRef.current = null;
      return;
    }
    if (!Device.isDevice) return;

    let cancelled = false;

    void (async () => {
      const installationId = await getPushInstallationId();
      if (cancelled) return;

      if (session.user.pushEnabled === false) {
        const revokeSignature = `${session.user.id}:${installationId}:revoked`;
        if (revokeSignature === lastRevokedSignatureRef.current) {
          return;
        }

        try {
          await revokeExpoPushInstallation(session.accessToken, installationId);
          lastRevokedSignatureRef.current = revokeSignature;
          lastSubmittedSignatureRef.current = null;
        } catch (e) {
          if (__DEV__) {
            console.warn("[push] No se pudo revocar la instalacion de Expo:", e);
          }
        }
        return;
      }

      if (isInOnboardingFlow) {
        return;
      }

      const permissions = await Notifications.getPermissionsAsync();
      let finalStatus = permissions.status;

      if (finalStatus !== "granted") {
        if (hasAttemptedPermissionRequestRef.current || !permissions.canAskAgain) {
          return;
        }

        hasAttemptedPermissionRequestRef.current = true;
        const requested = await Notifications.requestPermissionsAsync();
        finalStatus = requested.status;
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
        const timezone =
          Intl.DateTimeFormat().resolvedOptions().timeZone?.trim() || "UTC";
        const platform = Platform.OS === "ios" ? "ios" : "android";
        const signature = [
          session.user.id,
          token,
          installationId,
          platform,
          timezone,
        ].join(":");

        if (cancelled || !token || signature === lastSubmittedSignatureRef.current) {
          return;
        }

        await registerExpoPushToken(session.accessToken, {
          installationId,
          platform,
          provider: "expo",
          timezone,
          token,
        });
        lastSubmittedSignatureRef.current = signature;
        lastRevokedSignatureRef.current = null;
      } catch (e) {
        if (__DEV__) {
          console.warn("[push] No se pudo registrar el token de Expo:", e);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    isInOnboardingFlow,
    session?.accessToken,
    session?.user.id,
    session?.user.pushEnabled,
  ]);
}
