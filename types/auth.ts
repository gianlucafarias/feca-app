export type AuthenticatedUser = {
  avatarUrl?: string;
  city?: string;
  /** Place ID de Google de la localidad; fuente de verdad junto con city + lat/lng. */
  cityGooglePlaceId?: string;
  displayName: string;
  email: string;
  id: string;
  lat?: number;
  lng?: number;
  username: string;
};

export type AuthSession = {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
  user: AuthenticatedUser;
};

export type AuthLoginResult = {
  isNewUser: boolean;
  session: AuthSession;
};

export type UpdateMyProfileInput = {
  city?: string;
  cityGooglePlaceId?: string;
  displayName?: string;
  lat?: number;
  lng?: number;
  username?: string;
};
