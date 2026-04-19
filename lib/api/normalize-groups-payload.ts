/**
 * Unifica respuestas del backend en camelCase (contrato TS) o snake_case común.
 * Usar siempre antes de `mapApiGroupToFecaGroup` / mapeos de planes públicos.
 */
import type {
  ApiFriendPublicPlanSummary,
  ApiGroup,
  ApiGroupEvent,
  ApiGroupEventStatus,
  ApiGroupMember,
  ApiGroupViewerMembership,
  ApiPlaceSummary,
  ApiUserPublic,
} from "@/types/api";

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function pickStr(
  o: Record<string, unknown>,
  ...keys: string[]
): string | undefined {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "string" && v.length > 0) return v;
  }
  return undefined;
}

function pickNum(
  o: Record<string, unknown>,
  ...keys: string[]
): number | undefined {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
  }
  return undefined;
}

function pickBool(
  o: Record<string, unknown>,
  ...keys: string[]
): boolean | undefined {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "boolean") return v;
  }
  return undefined;
}

export function normalizeApiUserPublic(raw: unknown): ApiUserPublic {
  if (!isRecord(raw)) {
    return {
      id: "",
      username: "",
      displayName: "",
      avatarUrl: null,
      city: null,
    };
  }
  const o = raw;
  return {
    id: pickStr(o, "id") ?? "",
    username: pickStr(o, "username") ?? "",
    displayName: pickStr(o, "displayName", "display_name") ?? "",
    avatarUrl: (o.avatarUrl ?? o.avatar_url ?? null) as string | null,
    city: (o.city ?? null) as string | null,
  };
}

export function normalizeApiPlaceSummary(raw: unknown): ApiPlaceSummary {
  if (!isRecord(raw)) {
    return { id: "", name: "", address: "" };
  }
  const o = raw;
  return {
    id: pickStr(o, "id") ?? "",
    googlePlaceId: (o.googlePlaceId ?? o.google_place_id ?? null) as
      | string
      | null,
    name: pickStr(o, "name") ?? "",
    address: pickStr(o, "address") ?? "",
    photoUrl: (o.photoUrl ?? o.photo_url ?? null) as string | null,
  };
}

export function normalizeApiGroupMember(raw: unknown): ApiGroupMember {
  if (!isRecord(raw)) {
    return {
      user: normalizeApiUserPublic({}),
      accepted: true,
    };
  }
  const o = raw;
  const userRaw = o.user ?? o;
  return {
    user: normalizeApiUserPublic(userRaw),
    accepted: pickBool(o, "accepted", "is_accepted") ?? true,
    role: (o.role as ApiGroupMember["role"]) ?? null,
    status: (o.status as ApiGroupMember["status"]) ?? null,
  };
}

export function normalizeApiGroupEvent(raw: unknown): ApiGroupEvent {
  if (!isRecord(raw)) {
    return {
      id: "",
      place: normalizeApiPlaceSummary({}),
      date: "",
      status: "proposed",
      proposedBy: normalizeApiUserPublic({}),
    };
  }
  const o = raw;
  const proposedBy = o.proposedBy ?? o.proposed_by;
  return {
    id: pickStr(o, "id") ?? "",
    place: normalizeApiPlaceSummary(o.place),
    date: pickStr(o, "date") ?? "",
    status: (pickStr(o, "status") ?? "proposed") as ApiGroupEvent["status"],
    proposedBy: normalizeApiUserPublic(proposedBy),
    myRsvp: (o.myRsvp ?? o.my_rsvp ?? null) as ApiGroupEvent["myRsvp"],
    allowsRsvp: (o.allowsRsvp ?? o.allows_rsvp ?? null) as boolean | null,
    allowsConfirm: (o.allowsConfirm ?? o.allows_confirm ?? null) as
      | boolean
      | null,
    allowsCounterProposals: (o.allowsCounterProposals ??
      o.allows_counter_proposals ??
      null) as boolean | null,
  };
}

export function normalizeApiGroup(raw: unknown): ApiGroup {
  if (!isRecord(raw)) {
    throw new Error("Invalid group payload");
  }
  const o = raw;
  const membersRaw = o.members;
  const members = Array.isArray(membersRaw)
    ? membersRaw.map(normalizeApiGroupMember)
    : [];
  const eventsRaw = o.events;
  const events = Array.isArray(eventsRaw)
    ? eventsRaw.map(normalizeApiGroupEvent)
    : [];

  const createdBy = o.createdBy ?? o.created_by;

  const viewerRaw = o.viewerMembership ?? o.viewer_membership;
  const viewerMembership =
    viewerRaw === "active" || viewerRaw === "invited" || viewerRaw === "none"
      ? (viewerRaw as ApiGroupViewerMembership)
      : null;

  return {
    id: pickStr(o, "id") ?? "",
    name: pickStr(o, "name") ?? "",
    inviteCode: (o.inviteCode ?? o.invite_code ?? null) as string | null,
    createdBy: normalizeApiUserPublic(createdBy),
    members,
    events,
    visibility: (o.visibility ?? null) as ApiGroup["visibility"],
    placeProposalPolicy: (o.placeProposalPolicy ??
      o.place_proposal_policy ??
      null) as ApiGroup["placeProposalPolicy"],
    memberProposalInteraction: (o.memberProposalInteraction ??
      o.member_proposal_interaction ??
      null) as ApiGroup["memberProposalInteraction"],
    viewerMembership,
    memberCount: (o.memberCount ?? o.member_count ?? null) as number | null,
  };
}

export function normalizeApiFriendPublicPlanSummary(
  raw: unknown,
): ApiFriendPublicPlanSummary {
  if (!isRecord(raw)) {
    throw new Error("Invalid friend public plan row");
  }
  const o = raw;
  const createdBy = o.createdBy ?? o.created_by;
  const friendParticipant = o.friendParticipant ?? o.friend_participant;
  const ne = o.nextEvent ?? o.next_event;
  let nextEvent: ApiFriendPublicPlanSummary["nextEvent"];

  if (ne && isRecord(ne)) {
    const date = pickStr(ne, "date");
    const placeName = pickStr(ne, "placeName", "place_name");
    const statusRaw = pickStr(ne, "status");
    if (
      date &&
      placeName &&
      statusRaw &&
      (statusRaw === "proposed" ||
        statusRaw === "confirmed" ||
        statusRaw === "completed")
    ) {
      nextEvent = {
        date,
        placeName,
        areaLabel: (ne.areaLabel ?? ne.area_label ?? null) as string | null,
        status: statusRaw as ApiGroupEventStatus,
      };
    }
  }

  return {
    id: pickStr(o, "id") ?? "",
    name: pickStr(o, "name") ?? "",
    createdBy: normalizeApiUserPublic(createdBy),
    friendParticipant: normalizeApiUserPublic(friendParticipant),
    nextEvent,
    memberCount: pickNum(o, "memberCount", "member_count"),
  };
}

export function parseGroupResponsePayload(data: unknown): ApiGroup {
  if (!isRecord(data)) {
    throw new Error("Invalid API response");
  }
  const g = data.group ?? data;
  return normalizeApiGroup(g);
}
