# Backend — Planes (grupos): visibilidad, permisos e invitaciones

Este documento amplía la fase de grupos del [contrato API](./backend-api-contract.md). La app Expo ya envía/consumirá estos campos cuando el servidor los implemente; hasta entonces puede ignorarlos con defaults seguros.

**Spec detallado “planes de amigos + detalle público”:** [backend-spec-friends-public-plans.md](./backend-spec-friends-public-plans.md) (reglas de inclusión, `friendParticipant`, `GET /v1/groups/:id` con `viewerMembership`, índices y checklist).

## Campos en el recurso `group`

Incluir en `POST /v1/groups`, `GET /v1/groups/:id`, `GET /v1/me/groups` y `PATCH /v1/groups/:groupId`:


| Campo                       | Tipo                                        | Descripción                                                                                                                                                                                                                                                                                                                                                               |
| --------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `visibility`                | `"private"` | `"public_followers"`          | **private:** solo miembros (invitación o código). **public_followers:** visible para usuarios que siguen al creador (listados / feed según producto).                                                                                                                                                                                                                     |
| `placeProposalPolicy`       | `"all_members"` | `"owner_only"`            | Quién puede crear **nuevas** propuestas de evento (lugar + fecha).                                                                                                                                                                                                                                                                                                        |
| `memberProposalInteraction` | `"collaborative"` | `"announcement_locked"` | **collaborative:** RSVP/reacciones si existen, contra-propuestas según `placeProposalPolicy`, admin puede confirmar eventos. **announcement_locked:** si el evento lo propone un **miembro** (no el creador del plan), no RSVP/votación, no contra-propuestas, el admin **no** puede pasar a `confirmed` (queda como anuncio; definir `status` o flag único en servidor). |


**Defaults recomendados** al crear sin campos: `visibility: "private"`, `placeProposalPolicy: "all_members"`, `memberProposalInteraction: "collaborative"`.

## `POST /v1/groups` — body extendido

Además de `name` y `memberIds`:

```json
{
  "name": "Café los viernes",
  "memberIds": ["usr_02..."],
  "visibility": "private",
  "placeProposalPolicy": "all_members",
  "memberProposalInteraction": "collaborative"
}
```

## `PATCH /v1/groups/:groupId`

Solo **creador** o miembro con rol **admin** (según modelo de roles ya previsto en `members[].role`).

**Body (parcial):** cualquier subconjunto de `name`, `visibility`, `placeProposalPolicy`, `memberProposalInteraction`.

**403:** sin permisos. **404:** grupo inexistente.

## `POST /v1/groups/:groupId/leave`

El usuario autenticado deja de ser miembro del plan.

- **200:** `{ "group": { ... } }` o `204` sin cuerpo (el cliente acepta ambos).
- **403:** el creador no puede abandonar sin transferir ownership (o regla equivalente).
- **404:** no es miembro o el grupo no existe.

## `POST /v1/groups/:groupId/members` — invitaciones y política del destinatario

Si el usuario invitado tiene `groupInvitePolicy: "from_following_only"` (ver abajo), el servidor debe comprobar que el **invitado sigue al invitador** (`invitee` tiene relación `following` hacia el usuario del token). Si no cumple:

- **422** con cuerpo JSON, por ejemplo:

```json
{
  "message": "Esta persona solo acepta invitaciones de usuarios que sigue.",
  "code": "INVITE_NOT_ALLOWED_BY_TARGET_POLICY"
}
```

Otros códigos útiles (misma convención `message` + `code` opcional):


| `code`                                | Uso                                                               |
| ------------------------------------- | ----------------------------------------------------------------- |
| `INVITE_NOT_ALLOWED_BY_TARGET_POLICY` | Política del invitado (solo sigue a quien invita).                |
| `PROPOSAL_NOT_ALLOWED`                | `placeProposalPolicy` impide proponer.                            |
| `CONFIRM_NOT_ALLOWED`                 | `memberProposalInteraction` o estado del evento impide confirmar. |


## Eventos — flags opcionales (alternativa a derivar todo en servidor)

Si preferís que el cliente no infiera reglas, incluir en cada ítem de `events[]`:

- `allowsRsvp`: boolean  
- `allowsConfirm`: boolean  
- `allowsCounterProposals`: boolean

Derivados en servidor desde `proposedBy`, roles y `memberProposalInteraction`.

## Perfil — preferencia de invitaciones a planes

En `**GET /v1/me**` y `**PATCH /v1/me**`, campo opcional:

- `groupInvitePolicy`: `"everyone"`  `"from_following_only"`  
  - **everyone:** cualquiera que pueda invitar por otras reglas del producto.  
  - **from_following_only:** solo acepta entrar a planes si quien invita es alguien a quien **ella/él sigue**.

Default: `everyone`.

## `GET /v1/me/friends/public-group-plans` — “planes de mis amigos”

Implementación paso a paso: **[backend-spec-friends-public-plans.md](./backend-spec-friends-public-plans.md)**.

Listado **solo lectura** para la pestaña Planes: planes donde:

1. `visibility === "public_followers"` (u otra regla explícita de “público para red”).
2. Existe al menos un miembro **activo** que el usuario autenticado **sigue** (`following`).
3. Opcional: excluir planes en los que el usuario autenticado ya es miembro (el cliente también filtra por `id`).

**Query:** `limit` (default 20, max 50), `offset`.

**200:**

```json
{
  "plans": [
    {
      "id": "grp_01H...",
      "name": "Café los viernes",
      "createdBy": { "id": "usr_...", "username": "...", "displayName": "...", "avatarUrl": null, "city": "..." },
      "friendParticipant": { "...": "UserPublic del seguido que participa" },
      "nextEvent": {
        "date": "2026-04-20",
        "placeName": "Café Tortoni",
        "areaLabel": "Monserrat, CABA",
        "status": "confirmed"
      },
      "memberCount": 5
    }
  ],
  "total": 3
}
```

**Privacidad / qué no enviar en este listado:**

- No `inviteCode`, no lista `members` completa, no emails, no notas privadas.
- Lugar: nombre comercial + `areaLabel` (barrio/ciudad); evitar dirección con altura si el lugar es sensible.
- `friendParticipant`: un solo contacto que el viewer ya sigue (contexto social sin enumerar a todos).

**404 / 501:** el cliente asume `plans: []` hasta que exista la ruta.

También documentar si `GET /v1/groups/:id` devuelve vista **pública resumida** para no miembros cuando el plan es público (para que al tocar una tarjeta no sea siempre 403); si no, el producto debe definir otra pantalla o deep link.