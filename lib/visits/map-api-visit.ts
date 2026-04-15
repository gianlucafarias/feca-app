import type { ApiVisit } from "@/types/api";
import type { Visit } from "@/types/feca";

import { mapApiPlaceSummaryToPlace } from "@/lib/feca/map-api-place";
import { mapApiUserPublicToUser } from "@/lib/feca/map-api-user";

export function mapApiVisitToVisit(api: ApiVisit): Visit {
  const tags =
    api.tags.length > 0 ? api.tags : (["cafe"] as Visit["tags"]);

  return {
    id: api.id,
    user: mapApiUserPublicToUser(api.user),
    place: mapApiPlaceSummaryToPlace(api.place, tags),
    rating: api.rating,
    visitedAt: api.visitedAt,
    note: api.note,
    tags,
    companions: "",
  };
}
