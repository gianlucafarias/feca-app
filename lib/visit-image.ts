import { buildPlacePoster } from "@/lib/poster";
import type { Visit } from "@/types/feca";

export function getVisitCardImageUri(visit: Visit): string {
  if (visit.place.photoUrl) {
    return visit.place.photoUrl;
  }
  return buildPlacePoster(visit.place);
}
