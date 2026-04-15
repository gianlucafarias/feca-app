import type { ApiDiary, ApiGroup, ApiSavedPlaceRow } from "@/types/api";
import type { CafeDiary, FecaGroup, GroupEvent, SavedPlace } from "@/types/feca";

import { mapApiPlaceSummaryToPlace } from "./map-api-place";
import { mapApiUserPublicToUser } from "./map-api-user";

export function mapApiSavedRowToSavedPlace(row: ApiSavedPlaceRow): SavedPlace {
  const place = mapApiPlaceSummaryToPlace(row.place);
  return {
    id: `${place.id}-${row.savedAt}`,
    place,
    savedAt: row.savedAt,
    reason: row.reason ?? "",
  };
}

export function mapApiGroupToFecaGroup(api: ApiGroup): FecaGroup {
  return {
    id: api.id,
    name: api.name,
    inviteCode: api.inviteCode ?? undefined,
    createdBy: mapApiUserPublicToUser(api.createdBy),
    members: api.members.map((m) => ({
      user: mapApiUserPublicToUser(m.user),
      accepted: m.accepted,
      role: m.role ?? undefined,
      status: m.status ?? undefined,
    })),
    events: api.events.map(
      (e): GroupEvent => ({
        id: e.id,
        place: mapApiPlaceSummaryToPlace(e.place),
        date: e.date,
        status: e.status,
        proposedBy: mapApiUserPublicToUser(e.proposedBy),
        myRsvp: e.myRsvp ?? undefined,
      }),
    ),
  };
}

function resolveDiaryPlacesAndNotes(api: ApiDiary): {
  places: CafeDiary["places"];
  placeNotes: Record<string, string> | undefined;
} {
  const ordered = api.orderedPlaces;
  if (ordered && ordered.length > 0) {
    const sorted = [...ordered].sort((a, b) => a.position - b.position);
    const placeNotes: Record<string, string> = {};
    for (const row of sorted) {
      const place = mapApiPlaceSummaryToPlace(row.place);
      if (row.note?.trim()) {
        placeNotes[place.id] = row.note.trim();
      }
    }
    return {
      places: sorted.map((row) => mapApiPlaceSummaryToPlace(row.place)),
      placeNotes: Object.keys(placeNotes).length > 0 ? placeNotes : undefined,
    };
  }
  return {
    places: (api.places ?? []).map((p) => mapApiPlaceSummaryToPlace(p)),
    placeNotes: undefined,
  };
}

export function mapApiDiaryToCafeDiary(api: ApiDiary): CafeDiary {
  const { places, placeNotes } = resolveDiaryPlacesAndNotes(api);
  return {
    id: api.id,
    name: api.name,
    description: api.description ?? "",
    places,
    createdBy: mapApiUserPublicToUser(api.createdBy),
    createdAt: api.createdAt,
    intro: api.intro ?? undefined,
    editorialReason: api.editorialReason ?? undefined,
    coverImageUrl: api.coverImageUrl ?? undefined,
    visibility: api.visibility ?? undefined,
    publishedAt: api.publishedAt ?? undefined,
    placeNotes,
  };
}
