export type AuthenticatedUser = {
  avatarUrl?: string;
  city?: string;
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
  displayName?: string;
  lat?: number;
  lng?: number;
  username?: string;
};
