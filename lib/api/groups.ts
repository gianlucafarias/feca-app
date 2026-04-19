import type {
  ApiEventRsvp,
  ApiFriendPublicPlanSummary,
  ApiGroup,
  ApiGroupEvent,
  ApiGroupVisibility,
  ApiMemberProposalInteraction,
  ApiPlaceProposalPolicy,
} from "@/types/api";

import {
  ApiRequestError,
  getApiBaseUrl,
  parseApiErrorJson,
  parseError,
} from "./base";
import {
  normalizeApiFriendPublicPlanSummary,
  normalizeApiGroup,
  normalizeApiGroupEvent,
  parseGroupResponsePayload,
} from "./normalize-groups-payload";

type GroupsListResponse = {
  groups: ApiGroup[];
  total: number;
};

export type CreateGroupBody = {
  name: string;
  memberIds: string[];
  visibility?: ApiGroupVisibility;
  placeProposalPolicy?: ApiPlaceProposalPolicy;
  memberProposalInteraction?: ApiMemberProposalInteraction;
};

export type PatchGroupBody = Partial<{
  name: string;
  visibility: ApiGroupVisibility;
  placeProposalPolicy: ApiPlaceProposalPolicy;
  memberProposalInteraction: ApiMemberProposalInteraction;
}>;

type AddGroupEventBody = {
  placeId?: string;
  googlePlaceId?: string;
  date: string;
};

async function readGroupResponse(response: Response): Promise<ApiGroup | null> {
  if (response.status === 204) {
    return null;
  }
  const text = await response.text();
  if (!text.trim()) {
    return null;
  }
  let data: unknown;
  try {
    data = JSON.parse(text) as unknown;
  } catch {
    throw new Error("Respuesta de grupo no es JSON válido");
  }
  return parseGroupResponsePayload(data);
}

export async function createGroup(
  accessToken: string,
  body: CreateGroupBody,
): Promise<ApiGroup> {
  const response = await fetch(`${getApiBaseUrl()}/v1/groups`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const { message, code } = await parseApiErrorJson(response);
    throw new ApiRequestError(message, response.status, code);
  }

  const data = (await response.json()) as unknown;
  return parseGroupResponsePayload(data);
}

export async function fetchMyGroups(
  accessToken: string,
): Promise<GroupsListResponse> {
  const response = await fetch(`${getApiBaseUrl()}/v1/me/groups`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const payload = await response.json();
  const data =
    payload !== null &&
    typeof payload === "object" &&
    !Array.isArray(payload)
      ? (payload as Record<string, unknown>)
      : {};
  const raw = data.groups;
  const groups = Array.isArray(raw) ? raw.map((g) => normalizeApiGroup(g)) : [];
  const total =
    typeof data.total === "number"
      ? data.total
      : typeof data.total === "string"
        ? Number(data.total)
        : groups.length;
  return { groups, total: Number.isFinite(total) ? total : groups.length };
}

type FriendsPublicPlansResponse = {
  plans: ApiFriendPublicPlanSummary[];
  total: number;
};

/**
 * Planes con visibilidad pública donde participa alguien que el usuario sigue.
 * `404` / `405` / `501`: se interpreta como ruta aún no disponible → lista vacía.
 * Otros `!ok` (p. ej. `403`, `500`): lanza `ApiRequestError`. `401`: `ApiRequestError`.
 */
export async function fetchFriendsPublicPlans(
  accessToken: string,
  params?: { limit?: number; offset?: number },
): Promise<FriendsPublicPlansResponse> {
  const search = new URLSearchParams();
  if (params?.limit != null) search.set("limit", String(params.limit));
  if (params?.offset != null) search.set("offset", String(params.offset));
  const qs = search.toString();
  const url = `${getApiBaseUrl()}/v1/me/friends/public-group-plans${qs ? `?${qs}` : ""}`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (response.status === 401) {
    const { message, code } = await parseApiErrorJson(response);
    throw new ApiRequestError(message, response.status, code);
  }

  if (
    response.status === 404 ||
    response.status === 405 ||
    response.status === 501
  ) {
    return { plans: [], total: 0 };
  }

  if (!response.ok) {
    const { message, code } = await parseApiErrorJson(response);
    throw new ApiRequestError(message, response.status, code);
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new ApiRequestError(
      "Respuesta inválida del servidor",
      response.status,
    );
  }

  const rec =
    data !== null &&
    typeof data === "object" &&
    !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : {};
  const rawPlans = rec.plans;
  const plansRaw = Array.isArray(rawPlans) ? rawPlans : [];
  const plans: ApiFriendPublicPlanSummary[] = [];
  for (const row of plansRaw) {
    try {
      plans.push(normalizeApiFriendPublicPlanSummary(row));
    } catch {
      // Fila con shape inválido: se omite para no tirar todo el listado.
    }
  }
  const totalRaw = rec.total;
  const total =
    typeof totalRaw === "number"
      ? totalRaw
      : typeof totalRaw === "string"
        ? Number(totalRaw)
        : plans.length;
  return {
    plans,
    total: Number.isFinite(total) ? total : plans.length,
  };
}

export async function fetchGroup(
  groupId: string,
  accessToken: string,
): Promise<ApiGroup> {
  const response = await fetch(
    `${getApiBaseUrl()}/v1/groups/${encodeURIComponent(groupId)}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data = (await response.json()) as unknown;
  return parseGroupResponsePayload(data);
}

export async function updateGroup(
  groupId: string,
  accessToken: string,
  body: PatchGroupBody,
): Promise<ApiGroup> {
  const response = await fetch(
    `${getApiBaseUrl()}/v1/groups/${encodeURIComponent(groupId)}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );

  if (!response.ok) {
    const { message, code } = await parseApiErrorJson(response);
    throw new ApiRequestError(message, response.status, code);
  }

  const data = (await response.json()) as unknown;
  return parseGroupResponsePayload(data);
}

/** El miembro autenticado abandona el plan. */
export async function leaveGroup(
  groupId: string,
  accessToken: string,
): Promise<ApiGroup | null> {
  const response = await fetch(
    `${getApiBaseUrl()}/v1/groups/${encodeURIComponent(groupId)}/leave`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    },
  );

  if (!response.ok) {
    const { message, code } = await parseApiErrorJson(response);
    throw new ApiRequestError(message, response.status, code);
  }

  return readGroupResponse(response);
}

export async function addGroupEventApi(
  groupId: string,
  accessToken: string,
  body: AddGroupEventBody,
): Promise<ApiGroupEvent> {
  const response = await fetch(
    `${getApiBaseUrl()}/v1/groups/${encodeURIComponent(groupId)}/events`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );

  if (!response.ok) {
    const { message, code } = await parseApiErrorJson(response);
    throw new ApiRequestError(message, response.status, code);
  }

  const data = (await response.json()) as unknown;
  const rec =
    data !== null && typeof data === "object" && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : {};
  const ev = rec.event ?? data;
  return normalizeApiGroupEvent(ev);
}

type JoinGroupBody = { code: string };

/** Une al usuario autenticado a un plan/grupo por código corto. */
type AddGroupMembersBody = {
  memberIds: string[];
};

/** Invita usuarios al plan (mismos ids que al crear el grupo). */
export async function addGroupMembers(
  groupId: string,
  accessToken: string,
  body: AddGroupMembersBody,
): Promise<ApiGroup> {
  const response = await fetch(
    `${getApiBaseUrl()}/v1/groups/${encodeURIComponent(groupId)}/members`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );

  if (!response.ok) {
    const { message, code } = await parseApiErrorJson(response);
    throw new ApiRequestError(message, response.status, code);
  }

  const data = (await response.json()) as unknown;
  return parseGroupResponsePayload(data);
}

export async function joinGroupByCode(
  accessToken: string,
  body: JoinGroupBody,
): Promise<ApiGroup> {
  const response = await fetch(`${getApiBaseUrl()}/v1/groups/join`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data = (await response.json()) as unknown;
  return parseGroupResponsePayload(data);
}

type RsvpBody = { rsvp: ApiEventRsvp };

/** RSVP del usuario autenticado para un evento del plan. */
export async function setGroupEventRsvp(
  groupId: string,
  eventId: string,
  accessToken: string,
  body: RsvpBody,
): Promise<ApiGroup> {
  const response = await fetch(
    `${getApiBaseUrl()}/v1/groups/${encodeURIComponent(groupId)}/events/${encodeURIComponent(eventId)}/rsvp`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );

  if (!response.ok) {
    const { message, code } = await parseApiErrorJson(response);
    throw new ApiRequestError(message, response.status, code);
  }

  const data = (await response.json()) as unknown;
  return parseGroupResponsePayload(data);
}
