import type { ApiUserPublic } from "@/types/api";
import type { User } from "@/types/feca";

export function mapApiUserPublicToUser(u: ApiUserPublic): User {
  return {
    id: u.id,
    username: u.username,
    displayName: u.displayName,
    city: u.city ?? "",
    bio: "",
    followingCount: 0,
    followersCount: undefined,
    savedCount: 0,
    visitCount: 0,
  };
}
