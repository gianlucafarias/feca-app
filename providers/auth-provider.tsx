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
import {
  loginWithGoogleIdToken,
  logoutWithRefreshToken,
  normalizeAuthenticatedUser,
  pickDefinedRecord,
  refreshAuthSession,
  updateMyProfile,
} from "@/lib/auth/api";
import {
  getOnboardingRouteForUser,
  type OnboardingRoute,
} from "@/lib/auth/onboarding-route";
import {
  clearStoredSession,
  readStoredSession,
  writeStoredSession,
} from "@/lib/auth/session-storage";
import type {
  AuthLoginResult,
  AuthSession,
  AuthenticatedUser,
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
  signInWithGoogle: () => Promise<AuthLoginResult | null>;
  signOut: () => Promise<void>;
  updateProfile: (input: UpdateMyProfileInput) => Promise<AuthSession>;
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
      nextSession ? getOnboardingRouteForUser(nextSession.user) : null,
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

          const sessionToPersist =
            userStateVersionRef.current === startedUserStateVersion
              ? nextSession
              : {
                  ...nextSession,
                  user: currentSession.user,
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
      await persistSession(result.session);
      setOnboardingRoute(
        result.isNewUser
          ? "/(onboarding)/username"
          : getOnboardingRouteForUser(result.session.user),
      );

      return result;
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

  const updateProfile = useCallback(
    async (input: UpdateMyProfileInput) => {
      const requestSession = sessionRef.current;

      if (!requestSession) {
        throw new Error("No active session");
      }

      setErrorMessage(null);

      try {
        const patchRaw = await updateMyProfile(requestSession.accessToken, input);
        const patch = pickDefinedRecord(patchRaw);
        const currentSession = sessionRef.current;

        if (!currentSession || currentSession.user.id !== requestSession.user.id) {
          throw new Error("Session changed while updating profile");
        }

        userStateVersionRef.current += 1;
        const user = normalizeAuthenticatedUser({
          ...currentSession.user,
          ...patch,
        } as AuthenticatedUser);
        const nextSession: AuthSession = {
          ...currentSession,
          user,
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
    const refreshToken = sessionRef.current?.refreshToken;

    setErrorMessage(null);
    await clearSessionState();

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
      signInWithGoogle,
      signOut,
      updateProfile,
    }),
    [
      completeOnboarding,
      errorMessage,
      isHydrating,
      isSigningIn,
      onboardingRoute,
      session,
      signInWithGoogle,
      signOut,
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
