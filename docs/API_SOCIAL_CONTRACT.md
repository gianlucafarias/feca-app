# Contrato API: Ir, guías y planes (social)

Fuente de verdad de tipos en el cliente: [`types/api.ts`](../types/api.ts). Los mapeos a modelos de UI están en [`lib/feca/map-api-social.ts`](../lib/feca/map-api-social.ts).

## Principios

1. **Nunca** derivar `inviteCode` ni enlaces de invitación desde el `id` del grupo/plan en el cliente.
2. Fechas en **ISO 8601** (string).
3. Campos nuevos en respuestas JSON deben ser **retrocompatibles** (opcionales) hasta que el backend los rellene.

---

## Guías (recurso `diaries`)

Base URL: `/v1/diaries`, `/v1/me/diaries`.

### `ApiDiary` (respuesta)

| Campo | Tipo | Notas |
| --- | --- | --- |
| `id` | string | |
| `name` | string | Título de la guía |
| `description` | string? | Texto largo / descripción legacy |
| `places` | `ApiPlaceSummary[]` | Lista plana; orden natural si no hay `orderedPlaces` |
| `createdBy` | `ApiUserPublic` | |
| `createdAt` | string | ISO |
| `intro` | string? | Intro corta bajo el título |
| `editorialReason` | string? | Motivo editorial (“por qué esta guía”) |
| `coverImageUrl` | string? | URL de portada |
| `visibility` | `"private" \| "unlisted" \| "public"`? | |
| `publishedAt` | string? | ISO; si aplica |
| `orderedPlaces` | `ApiGuidePlaceEntry[]`? | Si viene, **tiene prioridad** sobre el orden de `places` |

### `ApiGuidePlaceEntry`

| Campo | Tipo |
| --- | --- |
| `place` | `ApiPlaceSummary` |
| `position` | number (entero, orden ascendente) |
| `note` | string? (nota por parada) |

### Endpoints existentes (cliente)

- `POST /v1/diaries` — body: `{ name, description }` (extensible con `intro`, `editorialReason`, etc.)
- `GET /v1/me/diaries` — lista
- `GET /v1/diaries/:id`
- `POST /v1/diaries/:id/places` — body: `{ placeId?, googlePlaceId? }`

---

## Planes / grupos (recurso `groups`)

### `ApiGroup`

| Campo | Tipo | Notas |
| --- | --- | --- |
| `id` | string | UUID u otro; **no** es el código de invitación |
| `name` | string | |
| `inviteCode` | string? | Código corto estable para compartir; obligatorio para mostrar UI de invitación |
| `createdBy` | `ApiUserPublic` | |
| `members` | `ApiGroupMember[]` | |
| `events` | `ApiGroupEvent[]` | |

### `ApiGroupMember`

| Campo | Tipo | Notas |
| --- | --- | --- |
| `user` | `ApiUserPublic` | |
| `accepted` | boolean | Legacy; alinear con `status` si ambos existen |
| `role` | `ApiGroupMemberRole`? | `owner` \| `admin` \| `member` |
| `status` | `ApiGroupMemberStatus`? | p.ej. `invited`, `active`, `declined`, `left` |

### `ApiGroupEvent`

| Campo | Tipo | Notas |
| --- | --- | --- |
| `id` | string | |
| `place` | `ApiPlaceSummary` | |
| `date` | string | ISO (día u hora según producto) |
| `status` | `proposed` \| `confirmed` \| `completed` | Estado del plan |
| `proposedBy` | `ApiUserPublic` | |
| `myRsvp` | `ApiEventRsvp`? | Intención del usuario autenticado: `going` \| `maybe` \| `declined` \| `none` |

### Endpoints existentes (cliente)

- `GET /v1/me/groups`
- `GET /v1/groups/:id`
- `POST /v1/groups` — body: `{ name, memberIds }`
- `POST /v1/groups/:groupId/events` — body: `{ placeId?, googlePlaceId?, date }`

### Endpoints previstos (cliente ya tipado / llamadas)

- `POST /v1/groups/join` — body: `{ code: string }` — respuesta: `{ group: ApiGroup }`
- `POST /v1/groups/:groupId/events/:eventId/rsvp` — body: `{ rsvp: ApiEventRsvp }` — respuesta: `{ group: ApiGroup }`

Errores sugeridos: `400` código inválido, `404` grupo no encontrado, `409` ya miembro / conflicto.

---

## RSVP vs estado del evento

- **`status` del evento**: flujo del plan (propuesto → confirmado → completado).
- **`myRsvp`**: respuesta del miembro al plan (asistencia). El cliente las muestra por separado.

---

## Coherencia con presenters (backend)

Los presenters del servidor deben serializar los mismos nombres de campo que `ApiGroup`, `ApiGroupMember`, `ApiGroupEvent`, `ApiDiary` y `ApiGuidePlaceEntry`, para que `map-api-social` no pierda datos (`inviteCode`, `role`, `status`, `myRsvp`, `orderedPlaces`, etc.).
