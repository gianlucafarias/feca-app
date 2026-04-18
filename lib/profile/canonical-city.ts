import type { AuthenticatedUser } from "@/types/auth";

export function hasCanonicalCity(
  user: Pick<
    AuthenticatedUser,
    "city" | "cityGooglePlaceId" | "lat" | "lng"
  >,
): boolean {
  return (
    Boolean(user.cityGooglePlaceId?.trim()) &&
    Boolean(user.city?.trim()) &&
    user.lat != null &&
    user.lng != null &&
    Number.isFinite(user.lat) &&
    Number.isFinite(user.lng)
  );
}
