export type GroupInvitePolicy = "everyone" | "from_following_only";

import type { ApiOutingPreferencesV1 } from "@/types/api";

/** Pasos del onboarding extendido (usuarios nuevos, `isNewUser`). */
export type ExtendedOnboardingStep =
  | "preferences"
  | "social"
  | "places"
  | "review";

export type AuthenticatedUser = {
  avatarUrl?: string;
  bio?: string | null;
  city?: string;
  /** Place ID de Google de la localidad; fuente de verdad junto con city + lat/lng. */
  cityGooglePlaceId?: string;
  displayName: string;
  email: string;
  id: string;
  /** Calculado en servidor (lista `FECA_ADMIN_EMAILS`); no persistido en DB. */
  isAdmin?: boolean;
  isEditor?: boolean;
  lat?: number;
  lng?: number;
  username: string;
  /** Preferencia para invitaciones a planes (GET/PATCH /v1/me). */
  groupInvitePolicy?: GroupInvitePolicy;
  /** Preferencias de salida para recomendaciones (privado). */
  outingPreferences?: ApiOutingPreferencesV1 | null;
  /** Contador de visitas (GET /v1/me); opcional hasta sincronizar. */
  visitCount?: number;
};

export type AuthSession = {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
  user: AuthenticatedUser;
  /**
   * Flujo extra post-ciudad para cuentas nuevas: preferencias, sugeridos,
   * tres lugares y primera reseña. Persistido en la sesión guardada.
   */
  extendedOnboarding?: {
    active: boolean;
    step: ExtendedOnboardingStep;
  };
  /**
   * Respaldo si `extendedOnboarding` se pierde en un refresh: misma máquina de
   * pasos, sincronizado en cliente (no viene del API).
   */
  pendingExtendedOnboarding?: {
    step: ExtendedOnboardingStep;
  };
};

export type AuthLoginResult = {
  isNewUser: boolean;
  session: AuthSession;
};

export type UpdateMyProfileInput = {
  bio?: string | null;
  city?: string;
  cityGooglePlaceId?: string;
  displayName?: string;
  lat?: number;
  lng?: number;
  username?: string;
  groupInvitePolicy?: GroupInvitePolicy;
  outingPreferences?: ApiOutingPreferencesV1 | null;
};
