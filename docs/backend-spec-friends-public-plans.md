# Spec backend — Planes públicos de amigos (`public-group-plans` + detalle)

Documento de implementación para el equipo servidor. Complementa [backend-plans-settings.md](./backend-plans-settings.md) y el [contrato API](./backend-api-contract.md). Cliente de referencia: `app/(tabs)/plans.tsx`, `lib/api/groups.ts` (`fetchFriendsPublicPlans`), `components/cards/friend-public-plan-card.tsx`.

---

## 1. Objetivo

Exponer un listado **solo lectura** de planes de grupo donde:

- El plan es **público para la red** (`visibility === "public_followers"`).
- El usuario autenticado **no está** en el plan *o* está: el cliente oculta duplicados si ya es miembro; el backend puede excluirlos o no (ver §4).
- Existe al menos un **miembro activo** `U` tal que el viewer **sigue** a `U` (`viewer → following → U`).

Además, definir cómo responde `**GET /v1/groups/:groupId`** cuando el viewer **no** es miembro pero el plan es público, para que la navegación desde la tarjeta no termine siempre en 403.

---

## 2. `GET /v1/me/friends/public-group-plans`

### 2.1 Autenticación

- Requiere `Authorization: Bearer <access_token>`.
- Sin token: `401`.

### 2.2 Query


| Parámetro | Tipo   | Default | Max | Notas                                                          |
| --------- | ------ | ------- | --- | -------------------------------------------------------------- |
| `limit`   | entero | 20      | 50  | Acotar payload.                                                |
| `offset`  | entero | 0       | —   | Paginación offset-based (alineado al resto del contrato FECA). |


### 2.3 Reglas de inclusión (todas deben cumplirse)

1. El grupo `G` existe y no está borrado lógicamente.
2. `G.visibility === "public_followers"` (si el campo aún no existe en DB, este endpoint devuelve `plans: []` hasta migración).
3. Existe al menos una fila de membresía `M` en `G` con:
  - `M.status` en el conjunto que el producto defina como “participa” (recomendación: `active` o equivalente; **no** `invited`/`declined`/`left` si existen).
4. Existe `follow` con `(follower_id = viewer_id AND following_id = M.user_id)` (el viewer **sigue** a ese miembro).

### 2.4 Exclusión opcional del propio viewer

- **Recomendado:** excluir grupos donde el viewer ya es miembro activo (menos ruido en “amigos”; el cliente hoy también filtra por `id`).
- Si no se excluye: el cliente sigue mostrando solo una vez; no es incorrecto.

### 2.5 Elegir `friendParticipant` (un solo `UserPublic`)

Debe ser un usuario que el viewer sigue **y** que es miembro activo del plan. Si hay varios:

- **Recomendación determinística:** el de **menor `user_id` lexicográfico** (o `joined_at` más antiguo) entre los elegibles, para respuestas estables entre páginas.
- Documentar la regla en código para evitar “saltos” al refrescar.

### 2.6 `nextEvent`

Objeto opcional `null` si no hay eventos futuros o ninguno en estado útil.

- Considerar “próximo” el evento con `date >= today` (zona del servidor o UTC + regla explícita) y prioridad:
  1. `status === "confirmed"`, fecha mínima.
  2. Si no hay, `status === "proposed"`, fecha mínima.
- Si solo hay `completed`, puede devolverse `nextEvent: null` o el último completado (producto); la app hoy muestra “Sin próxima fecha publicada” si `null`.

Campos del objeto `nextEvent`:


| Campo       | Tipo   | Obligatorio | Notas                                                                                                          |
| ----------- | ------ | ----------- | -------------------------------------------------------------------------------------------------------------- |
| `date`      | string | sí          | `YYYY-MM-DD` como en el resto de grupos.                                                                       |
| `placeName` | string | sí          | Nombre comercial / título del lugar (no domicilio particular).                                                 |
| `areaLabel` | string | no          | Barrio, localidad o ciudad; **no** incluir calle + número. Si falta, el cliente usa `placeName` como fallback. |
| `status`    | enum   | sí          | Mismo conjunto que `ApiGroupEventStatus`: `proposed` | `confirmed` | `completed`.                              |


**No** incluir en `nextEvent`: `googlePlaceId` completo si producto no quiere filtrar scraping (opcional: sí para “ver en mapa” solo en detalle miembro; en listado basta nombre + área).

### 2.7 `memberCount`

- Entero ≥ 1: número de miembros **activos** (misma semántica que §2.3).
- No hace falta desglosar invitados pendientes.

### 2.8 Orden de la lista

Sugerido: por `nextEvent.date` ascendente (los más cercanos primero), luego `G.name`, luego `G.id`. Si `nextEvent` es null, al final del listado.

### 2.9 Respuesta `200`

```json
{
  "plans": [ { "...": "ver ApiFriendPublicPlanSummary en types/api.ts del repo Expo" } ],
  "total": 42
}
```

- `total`: total de filas que cumplen §2.3 (sin paginar), para futura UI de “ver más”.

### 2.10 Errores y comportamiento del cliente móvil


| Código                                | Cuándo                                    | Cliente Expo (`fetchFriendsPublicPlans`)                                                             |
| ------------------------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `401`                                 | Sin token o token inválido.               | Lanza `ApiRequestError`; la pantalla Planes muestra el mensaje en la sección «Planes de mis amigos». |
| `404` / `405` / `501`                 | Ruta no registrada o método no soportado. | **Lista vacía** `{ "plans": [], "total": 0 }` equivalente (sin error visible).                       |
| Otros `4xx`/`5xx` con cuerpo de error | p. ej. `500`, `403` inesperado.           | Lanza `ApiRequestError` con `message` / `code` del JSON de error estándar FECA.                      |


No es necesario `403` en listado propio del viewer.

### 2.11 Convención de nombres JSON

- **Contrato canónico en TypeScript:** `camelCase` (ver `ApiFriendPublicPlanSummary` en `types/api.ts` del repo Expo).
- El cliente **normaliza** respuestas mezclando `camelCase` y `snake_case` habitual en servidores (p. ej. `friend_participant` → `friendParticipant`, `next_event` → `nextEvent`, `place_name` → `placeName`, `member_count` → `memberCount`, `created_by` → `createdBy`).
- **Recomendación backend:** responder en **camelCase** para consistencia con el resto del API documentado; el móvil seguirá aceptando alias para transiciones.

---

## 3. `GET /v1/groups/:groupId` — miembro vs visitante público

Hoy la app navega a `/group/:id` para tarjetas de “amigos”. Sin este comportamiento, el usuario ve pantalla de error.

### 3.1 Casos


| Viewer                   | `visibility`                                                                      | Respuesta                                                                                                                                                                                                                                                                             |
| ------------------------ | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Miembro activo (o admin) | cualquiera                                                                        | `200` — **grupo completo** como hoy (`members`, `events`, `inviteCode` si aplica, políticas).                                                                                                                                                                                         |
| No miembro               | `private`                                                                         | `403` **o** `404` (recomendación: **404** para no revelar existencia del id a no invitados).                                                                                                                                                                                          |
| No miembro               | `public_followers`                                                                | `200` — cuerpo `**group`** en modo **público resumido** (ver §3.2).                                                                                                                                                                                                                   |
| No miembro               | `public_followers` pero viewer no sigue al creador **ni** a ningún miembro activo | Opciones: **404** (más estricto) o mismo cuerpo público si el id se filtra por URL compartida (producto). **Recomendación:** si el acceso es solo por id adivinado, `404`; si el usuario llegó desde listado `public-group-plans`, ya pasó el filtro de “sigue a alguien en el plan”. |


### 3.2 Shape recomendado “público resumido”

Misma ruta `GET /v1/groups/:id`, distinto payload. El cliente puede detectar por flags:

Añadir en el JSON del grupo (solo en vista no miembro o siempre con valores nulos para miembros — preferible solo para no miembro):

```json
{
  "group": {
    "id": "grp_...",
    "name": "...",
    "visibility": "public_followers",
    "createdBy": { "...": "UserPublic" },
    "placeProposalPolicy": "all_members",
    "memberProposalInteraction": "collaborative",
    "viewerMembership": "none",
    "memberCount": 5,
    "members": [],
    "events": [ "..." ],
    "inviteCode": null
  }
}
```

- `viewerMembership`: `"active"` | `"invited"` | `"none"` — en vista pública para no miembro: `"none"`.
- `members`: **vacío** o máximo 0–3 avatares “públicos” acordados (por defecto **vacío** para minimizar filtraciones).
- `events`: mismos eventos que vería un miembro **pero** cada `place.address` debería sustituirse o anonimizarse a nivel **barrio** si la política de producto lo exige (o confiar en que `ApiPlaceSummary.address` ya es “zona” en backend).
- `**inviteCode`:** siempre `null` para no miembros.

La app Expo hoy no distingue `viewerMembership`; puede ignorar campos extra hasta que se adapte la pantalla de detalle (mostrar CTA “Pedí el código al creador” si `viewerMembership === "none"` y sin botón invitar).

### 3.3 Mutaciones en plan público sin membresía

- `POST .../members`, `POST .../events`, `PATCH ...`, `POST .../leave`, RSVP: deben responder `**403`** con `code` estable si `viewerMembership === "none"`.

---

## 4. Modelo de datos / índices (sugerencia)

Consulta típica (pseudológica):

```text
Grupos G
JOIN membresías M ON M.group_id = G.id AND M.status = 'active'
JOIN follows F ON F.follower_id = :viewer AND F.following_id = M.user_id
WHERE G.visibility = 'public_followers'
  [AND :viewer NOT IN (miembros activos de G)]  -- opcional
```

Índices útiles:

- `(G.visibility)` parcial donde `visibility = public_followers` (si el volumen lo merece).
- `(M.group_id, M.user_id, M.status)`.
- `(F.follower_id, F.following_id)`.

---

## 5. Checklist de implementación

- Migración / default `visibility` en grupos existentes.
- `GET /v1/me/friends/public-group-plans` con paginación y `total`.
- Regla estable para `friendParticipant`.
- Construcción de `nextEvent` + redacción de `areaLabel` desde lugar (sin doxxing).
- `GET /v1/groups/:id` modo público + `viewerMembership` + sin `inviteCode`.
- `403` en mutaciones para no miembros.
- Tests: viewer sigue a A en plan público → aparece; plan privado → no aparece; no sigue a nadie del plan → no aparece.

---

## 6. Referencia de tipos en el cliente Expo

- `ApiFriendPublicPlanSummary` — `types/api.ts`
- `fetchFriendsPublicPlans` — `lib/api/groups.ts` → `GET /v1/me/friends/public-group-plans`
- Normalización camelCase / snake_case — `lib/api/normalize-groups-payload.ts` (`normalizeApiFriendPublicPlanSummary` y, para grupos, `normalizeApiGroup` vía `parseGroupResponsePayload`)

