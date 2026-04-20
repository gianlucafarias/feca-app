import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import { AppState, Platform, type AppStateStatus } from "react-native";
import { fetchMe } from "@/lib/api/me";
import { revokeExpoPushInstallation } from "@/lib/api/push";
import {
  deleteMyAccount,
  loginWithGoogleIdToken,
  logoutWithRefreshToken,
  mergeAuthenticatedUserAfterProfilePatch,
  normalizeAuthenticatedUser,
  refreshAuthSession,
  updateMyProfile,
} from "@/lib/auth/api";
import { logCityChange, summarizeLocationPayload } from "@/lib/debug/city-change-debug";
import {
  getOnboardingRouteForSession,
  type OnboardingRoute,
} from "@/lib/auth/onboarding-route";
import {
  clearStoredSession,
  readStoredSession,
  writeStoredSession,
} from "@/lib/auth/session-storage";
import { getPushInstallationId } from "@/lib/push/push-installation-id";
import type {
  AuthLoginResult,
  AuthSession,
  AuthenticatedUser,
  ExtendedOnboardingStep,
  UpdateMyProfileInput,
} from "@/types/auth";

let GoogleSignin: typeof import("@react-native-google-signin/google-signin").GoogleSignin | null = null;
let isCancelledResponse: typeof import("@react-native-google-signin/google-signin").isCancelledResponse | null = null;
let isErrorWithCode: typeof import("@react-native-google-signin/google-signin").isErrorWithCode | null = null;
let isSuccessResponse: typeof import("@react-native-google-signin/google-signin").isSuccessResponse | null = null;
let statusCodes: typeof import("@react-native-google-signin/google-signin").statusCodes | null = null;

try {
  const mod = require("@react-native-google-signin/google-signin");
  GoogleSignin = mod.GoogleSignin;
  isCancelledResponse = mod.isCancelledResponse;
  isErrorWithCode = mod.isErrorWithCode;
  isSuccessResponse = mod.isSuccessResponse;
  statusCodes = mod.statusCodes;
} catch {
  // Native module not available (e.g. running in Expo Go).
}

type AuthContextValue = {
  errorMessage: string | null;
  isAuthenticated: boolean;
  isHydrating: boolean;
  isSigningIn: boolean;
  needsOnboarding: boolean;
  onboardingRoute: OnboardingRoute | null;
  session: AuthSession | null;
  clearError: () => void;
  completeOnboarding: () => Promise<void>;
  setExtendedOnboardingStep: (step: ExtendedOnboardingStep) => Promise<void>;
  finishExtendedOnboarding: () => Promise<void>;
  signInWithGoogle: () => Promise<AuthLoginResult | null>;
  signOut: () => Promise<void>;
  updateProfile: (input: UpdateMyProfileInput) => Promise<AuthSession>;
  /** GET /v1/me y fusiona usuario en sesión (p. ej. tras PATCH admin editor). */
  syncMeFromServer: () => Promise<void>;
  /** DELETE /v1/me y limpia sesión local. */
  deleteAccount: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const ACCESS_TOKEN_REFRESH_SKEW_MS = 2 * 60 * 1000;

function getGoogleConfig() {
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim();

  if (!webClientId) {
    throw new Error("EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is not configured");
  }

  return {
    iosClientId,
    offlineAccess: false,
    profileImageSize: 120,
    webClientId,
  };
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isHydrating, setIsHydrating] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [onboardingRoute, setOnboardingRoute] =
    useState<OnboardingRoute | null>(null);
  const refreshInFlightRef = useRef<Promise<AuthSession | null> | null>(null);
  const sessionRef = useRef<AuthSession | null>(null);
  // Local profile writes win over slower refresh responses for the user slice.
  const userStateVersionRef = useRef(0);

  const applySessionState = useCallback((nextSession: AuthSession | null) => {
    sessionRef.current = nextSession;
    setSession(nextSession);
    setOnboardingRoute(
      nextSession ? getOnboardingRouteForSession(nextSession) : null,
    );
    return nextSession;
  }, []);

  const persistSession = useCallback(async (nextSession: AuthSession) => {
    await writeStoredSession(nextSession);
    return applySessionState(nextSession);
  }, [applySessionState]);

  const clearSessionState = useCallback(async () => {
    await clearStoredSession();
    applySessionState(null);
  }, [applySessionState]);

  const refreshSession = useCallback(
    async (
      refreshToken: string,
      options?: { clearOnFailure?: boolean; silent?: boolean },
    ) => {
      if (refreshInFlightRef.current) {
        return refreshInFlightRef.current;
      }

      const startedUserStateVersion = userStateVersionRef.current;
      const baseUserId = sessionRef.current?.user.id;
      const promise = refreshAuthSession(refreshToken)
        .then(async (nextSession) => {
          const currentSession = sessionRef.current;

          if (!currentSession) {
            return null;
          }

          if (
            (baseUserId && currentSession.user.id !== baseUserId) ||
            currentSession.refreshToken !== refreshToken
          ) {
            return currentSession;
          }

          /**
           * Si hubo PATCH de perfil mientras el refresh corría, el user local gana (rama abajo).
           * Si no, igual fusionamos: /v1/auth/refresh a veces trae un `user` desactualizado y
           * pisaba ciudad/coords recién guardados en PATCH.
           */
          const userAfterRefresh =
            userStateVersionRef.current !== startedUserStateVersion
              ? currentSession.user
              : normalizeAuthenticatedUser({
                  ...nextSession.user,
                  ...currentSession.user,
                });

          const sessionToPersist: AuthSession = {
            ...nextSession,
            user: userAfterRefresh,
            extendedOnboarding: currentSession.extendedOnboarding,
            pendingExtendedOnboarding: currentSession.pendingExtendedOnboarding,
          };

          return persistSession(sessionToPersist);
        })
        .catch(async (error) => {
          if (
            options?.clearOnFailure &&
            shouldClearSessionAfterRefreshFailure(error) &&
            sessionRef.current?.refreshToken === refreshToken
          ) {
            await clearSessionState();
          }

          if (!options?.silent) {
            const message =
              error instanceof Error
                ? error.message
                : "No se pudo renovar la sesión";
            setErrorMessage(message);
          }

          throw error;
        })
        .finally(() => {
          refreshInFlightRef.current = null;
        });

      refreshInFlightRef.current = promise;
      return promise;
    },
    [clearSessionState, persistSession],
  );

  useEffect(() => {
    if (!GoogleSignin) {
      return;
    }
    const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();
    if (!webClientId) {
      return;
    }
    try {
      GoogleSignin.configure(getGoogleConfig());
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Google Sign-In is not configured";
      setErrorMessage(message);
    }
  }, []);

  useEffect(() => {
    if (!GoogleSignin) {
      setIsHydrating(false);
      return;
    }

    let isMounted = true;

    const restoreSession = async () => {
      try {
        const stored = await readStoredSession();
        if (isMounted) {
          if (!stored) {
            applySessionState(null);
            return;
          }

          if (isAccessTokenExpired(stored)) {
            const activeSession = await refreshSession(stored.refreshToken, {
              clearOnFailure: true,
              silent: true,
            });

            if (activeSession) {
              applySessionState(activeSession);
            }

            return;
          }

          applySessionState(stored);
          void refreshSession(stored.refreshToken, {
            clearOnFailure: false,
            silent: true,
          }).catch(() => {
            // Keep the current session until it actually expires.
          });
        }
      } catch {
        await clearSessionState();
      } finally {
        if (isMounted) {
          setIsHydrating(false);
        }
      }
    };

    void restoreSession();

    return () => {
      isMounted = false;
    };
  }, [applySessionState, clearSessionState, refreshSession]);

  useEffect(() => {
    if (!session) {
      return;
    }

    const refreshInMs = getRefreshDelayMs(session);
    if (refreshInMs <= 0) {
      void refreshSession(session.refreshToken, {
        clearOnFailure: true,
        silent: true,
      }).catch(() => {
        // Handled by the refresh helper.
      });
      return;
    }

    const timeout = setTimeout(() => {
      void refreshSession(session.refreshToken, {
        clearOnFailure: true,
        silent: true,
      }).catch(() => {
        // Handled by the refresh helper.
      });
    }, refreshInMs);

    return () => clearTimeout(timeout);
  }, [refreshSession, session]);

  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState !== "active" || !session) {
        return;
      }

      if (!shouldRefreshAccessToken(session)) {
        return;
      }

      void refreshSession(session.refreshToken, {
        clearOnFailure: true,
        silent: true,
      }).catch(() => {
        // Handled by the refresh helper.
      });
    };

    const subscription = AppState.addEventListener("change", handleAppStateChange);
    return () => subscription.remove();
  }, [refreshSession, session]);

  const signInWithGoogle = useCallback(async () => {
    if (!GoogleSignin || !isCancelledResponse || !isSuccessResponse || !isErrorWithCode || !statusCodes) {
      const message = "Google Sign-In no disponible. Se requiere un development build.";
      setErrorMessage(message);
      throw new Error(message);
    }

    if (Platform.OS === "web") {
      const message =
        "Google Sign-In is configured for native builds only. Use a development build on iOS or Android.";
      setErrorMessage(message);
      throw new Error(message);
    }

    setIsSigningIn(true);
    setErrorMessage(null);

    try {
      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });

      const response = await GoogleSignin.signIn();

      if (isCancelledResponse(response)) {
        return null;
      }

      if (!isSuccessResponse(response)) {
        throw new Error("Google Sign-In did not return a valid account");
      }

      const idToken =
        response.data.idToken ?? (await GoogleSignin.getTokens()).idToken;

      if (!idToken) {
        throw new Error("Google Sign-In did not return an ID token");
      }

      const result = await loginWithGoogleIdToken(idToken);
      const sessionToPersist: AuthSession = {
        ...result.session,
        ...(result.isNewUser
          ? {
              extendedOnboarding: {
                active: true,
                step: "preferences",
              },
              pendingExtendedOnboarding: { step: "preferences" },
            }
          : {}),
      };
      await persistSession(sessionToPersist);
      setOnboardingRoute(
        result.isNewUser
          ? "/(onboarding)/username"
          : getOnboardingRouteForSession(sessionToPersist),
      );

      return { ...result, session: sessionToPersist };
    } catch (error) {
      if (isErrorWithCode(error)) {
        switch (error.code) {
          case statusCodes.IN_PROGRESS:
            setErrorMessage("Google Sign-In is already in progress");
            break;
          case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
            setErrorMessage("Google Play Services are not available on this device");
            break;
          default:
            setErrorMessage(error.message);
        }
      } else if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Could not sign in with Google");
      }

      throw error;
    } finally {
      setIsSigningIn(false);
    }
  }, [persistSession]);

  const completeOnboarding = useCallback(async () => {
    setOnboardingRoute(null);
  }, []);

  const setExtendedOnboardingStep = useCallback(
    async (step: ExtendedOnboardingStep) => {
      const current = sessionRef.current;
      const allow =
        current?.extendedOnboarding?.active === true ||
        Boolean(current?.pendingExtendedOnboarding);
      if (!current || !allow) {
        return;
      }
      const nextSession: AuthSession = {
        ...current,
        extendedOnboarding: { active: true, step },
        pendingExtendedOnboarding: { step },
      };
      await persistSession(nextSession);
    },
    [persistSession],
  );

  const finishExtendedOnboarding = useCallback(async () => {
    const current = sessionRef.current;
    if (!current) {
      return;
    }
    const nextSession: AuthSession = {
      ...current,
      extendedOnboarding: undefined,
      pendingExtendedOnboarding: undefined,
    };
    await persistSession(nextSession);
  }, [persistSession]);

  const syncMeFromServer = useCallback(async () => {
    const current = sessionRef.current;
    if (!current?.accessToken) {
      return;
    }

    setErrorMessage(null);
    try {
      const me = await fetchMe(current.accessToken);
      const nextUser = normalizeAuthenticatedUser({
        ...current.user,
        avatarUrl: me.avatarUrl ?? current.user.avatarUrl,
        bio: me.bio !== undefined ? me.bio : current.user.bio,
        city: me.city ?? current.user.city,
        cityGooglePlaceId: me.cityGooglePlaceId ?? current.user.cityGooglePlaceId,
        displayName: me.displayName,
        email: current.user.email,
        groupInvitePolicy: me.groupInvitePolicy ?? current.user.groupInvitePolicy,
        id: current.user.id,
        isAdmin: me.isAdmin ?? current.user.isAdmin,
        isEditor: me.isEditor ?? current.user.isEditor,
        lat: me.lat ?? current.user.lat,
        lng: me.lng ?? current.user.lng,
        outingPreferences: me.outingPreferences ?? current.user.outingPreferences,
        pushEnabled: me.pushEnabled ?? current.user.pushEnabled,
        username: me.username,
        visitCount: me.visitCount ?? current.user.visitCount,
      } as AuthenticatedUser);

      userStateVersionRef.current += 1;
      const nextSession: AuthSession = {
        ...current,
        user: nextUser,
        extendedOnboarding: current.extendedOnboarding,
        pendingExtendedOnboarding: current.pendingExtendedOnboarding,
      };
      await persistSession(nextSession);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo sincronizar el perfil";
      setErrorMessage(message);
    }
  }, [persistSession]);

  const updateProfile = useCallback(
    async (input: UpdateMyProfileInput) => {
      const requestSession = sessionRef.current;

      if (!requestSession) {
        throw new Error("No active session");
      }

      setErrorMessage(null);

      try {
        logCityChange("updateProfile PATCH body", summarizeLocationPayload(input));
        const patchRaw = await updateMyProfile(requestSession.accessToken, input);
        const currentSession = sessionRef.current;

        if (!currentSession || currentSession.user.id !== requestSession.user.id) {
          throw new Error("Session changed while updating profile");
        }

        userStateVersionRef.current += 1;
        /**
         * No llamar GET /v1/me después del PATCH: si el GET devolvía ciudad vieja,
         * priorizar me.city sobre el merge del PATCH volvía a mostrar la ciudad anterior.
         */
        const user = mergeAuthenticatedUserAfterProfilePatch(
          currentSession.user,
          patchRaw,
          input,
        );

        logCityChange("updateProfile sesión fusionada", summarizeLocationPayload(user));

        const nextSession: AuthSession = {
          ...currentSession,
          user,
          extendedOnboarding: currentSession.extendedOnboarding,
          pendingExtendedOnboarding: currentSession.pendingExtendedOnboarding,
        };

        await persistSession(nextSession);

        return nextSession;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "No se pudo actualizar el perfil";
        setErrorMessage(message);
        throw error;
      }
    },
    [persistSession],
  );

  const signOut = useCallback(async () => {
    const currentSession = sessionRef.current;
    const refreshToken = currentSession?.refreshToken;
    const accessToken = currentSession?.accessToken;

    setErrorMessage(null);
    await clearSessionState();

    if (accessToken) {
      try {
        const installationId = await getPushInstallationId();
        await revokeExpoPushInstallation(accessToken, installationId);
      } catch {
        // noop: local logout is enough if revoke fails.
      }
    }

    try {
      await GoogleSignin?.signOut();
    } catch {
      // noop: FECA session is already cleared locally.
    }

    if (refreshToken) {
      try {
        await logoutWithRefreshToken(refreshToken);
      } catch {
        // noop: local logout is enough for the prototype.
      }
    }
  }, [clearSessionState]);

  const deleteAccount = useCallback(async () => {
    const token = sessionRef.current?.accessToken;
    if (!token) {
      throw new Error("No active session");
    }
    setErrorMessage(null);
    await deleteMyAccount(token);
    await signOut();
  }, [signOut]);

  const value = useMemo<AuthContextValue>(
    () => ({
      errorMessage,
      isAuthenticated: Boolean(session),
      isHydrating,
      isSigningIn,
      needsOnboarding: onboardingRoute !== null,
      onboardingRoute,
      session,
      clearError: () => setErrorMessage(null),
      completeOnboarding,
      finishExtendedOnboarding,
      setExtendedOnboardingStep,
      signInWithGoogle,
      signOut,
      syncMeFromServer,
      updateProfile,
      deleteAccount,
    }),
    [
      completeOnboarding,
      finishExtendedOnboarding,
      deleteAccount,
      errorMessage,
      isHydrating,
      isSigningIn,
      onboardingRoute,
      session,
      setExtendedOnboardingStep,
      signInWithGoogle,
      signOut,
      syncMeFromServer,
      updateProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function isAccessTokenExpired(session: AuthSession) {
  return getAccessTokenExpiresAt(session) <= Date.now();
}

function shouldRefreshAccessToken(session: AuthSession) {
  return getRefreshDelayMs(session) <= 0;
}

function getRefreshDelayMs(session: AuthSession) {
  return getAccessTokenExpiresAt(session) - Date.now() - ACCESS_TOKEN_REFRESH_SKEW_MS;
}

function getAccessTokenExpiresAt(session: AuthSession) {
  return new Date(session.accessTokenExpiresAt).getTime();
}

function shouldClearSessionAfterRefreshFailure(error: unknown) {
  return (
    error instanceof Error &&
    /invalid refresh token|user not found/i.test(error.message)
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
