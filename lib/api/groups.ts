import type { ApiEventRsvp, ApiGroup, ApiGroupEvent } from "@/types/api";

import { getApiBaseUrl, parseError } from "./base";

type GroupsListResponse = {
  groups: ApiGroup[];
  total: number;
};

type GroupResponse = {
  group: ApiGroup;
};

type CreateGroupBody = {
  name: string;
  memberIds: string[];
};

type AddGroupEventBody = {
  placeId?: string;
  googlePlaceId?: string;
  date: string;
};

type EventResponse = {
  event: ApiGroupEvent;
};

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
    throw new Error(await parseError(response));
  }

  const data = (await response.json()) as GroupResponse;
  return data.group;
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

  return (await response.json()) as GroupsListResponse;
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

  const data = (await response.json()) as GroupResponse;
  return data.group;
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
    throw new Error(await parseError(response));
  }

  const data = (await response.json()) as EventResponse;
  return data.event;
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
    throw new Error(await parseError(response));
  }

  const data = (await response.json()) as GroupResponse;
  return data.group;
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

  const data = (await response.json()) as GroupResponse;
  return data.group;
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
    throw new Error(await parseError(response));
  }

  const data = (await response.json()) as GroupResponse;
  return data.group;
}
