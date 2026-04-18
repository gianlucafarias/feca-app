# Contrato API FECA — Backend (respuestas esperadas por el frontend)

Este documento define **qué debe enviar el backend** para que la app Expo deje de usar datos mock. Complementa [places-backend.md](./places-backend.md) (Google Places) y [social-auth-architecture.md](./social-auth-architecture.md) (auth).

**Base URL:** la app usa `EXPO_PUBLIC_API_BASE_URL` (sin slash final).

**Auth:** salvo rutas públicas de auth, todas las peticiones llevan:

```http
Authorization: Bearer <feca_access_token>
Content-Type: application/json
```

**Errores (convención recomendada):**

```json
{
  "message": "Texto legible para mostrar al usuario"
}
```

Códigos típicos: `400` validación, `401` token inválido/expirado, `403` prohibido, `404` no encontrado, `409` conflicto (ej. username duplicado), `422` reglas de negocio, `500` interno.

**Paginación (lista):** query `limit` (default 20, max 50) y `offset` (default 0). Respuesta incluye `total` cuando aplique.

---

## Ya implementado (referencia rápida)

| Método | Ruta | Respuesta esperada |
|--------|------|----------------------|
| POST | `/v1/auth/google/mobile` | `{ isNewUser, session }` — ver `types/auth.ts` |
| POST | `/v1/auth/refresh` | `{ session }` |
| POST | `/v1/auth/logout` | `204` o `{}` |
| PATCH | `/v1/me` | `{ user: AuthenticatedUser }` |
| GET | `/v1/places/nearby` | `{ places: NearbyPlace[] }` — ver [places-backend.md](./places-backend.md) |
| GET | `/v1/places/:googlePlaceId` | `{ place: PlaceDetail }` — idem |

Tipos TypeScript de referencia en el repo: `types/auth.ts`, `types/places.ts`.

---

## Tipos compartidos (snake_case en JSON recomendado; el front puede mapear)

### UserPublic (usuario en listados y anidado en visitas)

```json
{
  "id": "usr_01H...",
  "username": "muni",
  "displayName": "Muni",
  "avatarUrl": "https://...",
  "city": "Buenos Aires"
}
```

Campos opcionales si no aplican: `avatarUrl`, `city`.

### PlaceSummary (lugar FECA asociado a una visita o guardado)

```json
{
  "id": "plc_01H...",
  "googlePlaceId": "ChIJ2abc...",
  "name": "Café Tortoni",
  "address": "Av. de Mayo 825, CABA",
  "photoUrl": "https://..."
}
```

- `googlePlaceId` puede ser `null` si el lugar fue creado solo manual.
- `photoUrl` opcional; si no hay, el front muestra placeholder.

### Visit (visita)

```json
{
  "id": "vis_01H...",
  "user": { "id": "usr_...", "username": "...", "displayName": "...", "avatarUrl": null, "city": "..." },
  "place": {
    "id": "plc_01H...",
    "googlePlaceId": "ChIJ...",
    "name": "Café Tortoni",
    "address": "Av. de Mayo 825",
    "photoUrl": null
  },
  "rating": 4,
  "note": "Flat white excelente",
  "tags": ["cafe"],
  "visitedAt": "2026-04-07",
  "createdAt": "2026-04-07T14:30:00.000Z"
}
```

- `tags`: array de strings; valores esperados por la app hoy: `"cafe"`, `"brunch"`.
- `visitedAt`: fecha local del usuario en formato `YYYY-MM-DD`.
- `createdAt`: ISO 8601 UTC.

---

## Fase 1 — Visitas y feed

### POST `/v1/visits`

**Body:**

```json
{
  "googlePlaceId": "ChIJ2abc...",
  "placeName": "Café Tortoni",
  "rating": 4,
  "note": "Flat white excelente",
  "tags": ["cafe"],
  "visitedAt": "2026-04-07"
}
```

Reglas:

- Si `googlePlaceId` está presente: resolver o reutilizar `place` en DB (Places/Google en servidor).
- Si no hay `googlePlaceId`: crear visita con lugar manual usando `placeName` (obligatorio en ese caso).
- `placeName` puede enviarse siempre como display; si hay `googlePlaceId`, el backend puede ignorar o validar consistencia.

**201 Created:**

```json
{
  "visit": { "...": "mismo shape que Visit arriba" }
}
```

### GET `/v1/me/visits`

**Query:** `limit`, `offset`

**200:**

```json
{
  "visits": [ { "...": "Visit" } ],
  "total": 42
}
```

Orden: `visitedAt` descendente, luego `createdAt` descendente.

### GET `/v1/feed`

**Query:** `limit`, `offset`

**200:**

```json
{
  "items": [
    {
      "id": "feed_01H...",
      "visit": { "...": "Visit" },
      "summary": "Texto corto para la tarjeta (opcional, puede ser generado o vacío)"
    }
  ],
  "total": 100
}
```

- Si el usuario no sigue a nadie: el backend puede devolver feed por ciudad/recientes/popular (`summary` puede ser `""`).

### GET `/v1/users/:userId/visits`

**Query:** `limit`, `offset`

**200:** igual que `/v1/me/visits` (`visits` + `total`).

**404:** usuario no existe.

---

## Fase 2 — Perfil, guardados, amigos

### GET `/v1/me`

**200:** usuario autenticado ampliado con stats (el front usa esto al migrar perfil).

```json
{
  "user": {
    "id": "usr_01H...",
    "username": "muni",
    "displayName": "Muni",
    "email": "muni@gmail.com",
    "avatarUrl": null,
    "city": "Buenos Aires",
    "lat": -34.6037,
    "lng": -58.3816,
    "bio": "Texto corto o null",
    "visitCount": 42,
    "savedCount": 15,
    "followingCount": 8
  }
}
```

Notas:

- `visitCount` / `savedCount` / `followingCount`: enteros >= 0.
- Si `PATCH /v1/me` ya existe, alinear los mismos campos en `AuthenticatedUser` que devuelve PATCH con los de GET (o documentar diferencias).

### GET `/v1/users/:userId`

**200:** mismo shape que `user` en GET `/v1/me`, sin `email` si la política es privacidad (indicar en respuesta qué campos son públicos).

**404:** no existe.

### POST `/v1/places/:googlePlaceId/save`

**200:**

```json
{ "saved": true }
```

Idempotente: si ya estaba guardado, `200` con `saved: true`.

### DELETE `/v1/places/:googlePlaceId/save`

**200:**

```json
{ "saved": false }
```

### GET `/v1/places/:googlePlaceId/saved`

**200:** si está guardado por el usuario actual.

```json
{ "saved": true }
```

### GET `/v1/me/saved`

**Query:** `limit`, `offset`

**200:**

```json
{
  "places": [
    {
      "savedAt": "2026-04-01T12:00:00.000Z",
      "place": {
        "id": "plc_01H...",
        "googlePlaceId": "ChIJ...",
        "name": "...",
        "address": "...",
        "photoUrl": null
      },
      "reason": ""
    }
  ],
  "total": 15
}
```

- `reason` puede ser string vacío si no hay motivo guardado (compat con UI mock).

### GET `/v1/me/friends`

**Query:** `q` (opcional, búsqueda), `limit`, `offset`

**200:**

```json
{
  "friends": [
    {
      "id": "usr_...",
      "username": "...",
      "displayName": "...",
      "avatarUrl": null,
      "city": "..."
    }
  ],
  "total": 8
}
```

### POST `/v1/users/:userId/follow`

**200:**

```json
{ "following": true }
```

### DELETE `/v1/users/:userId/follow`

**200:**

```json
{ "following": false }
```

---

## Fase 3 — Grupos y diarios

### POST `/v1/groups`

**Body:**

```json
{
  "name": "Café los viernes",
  "memberIds": ["usr_02...", "usr_03..."]
}
```

**201:**

```json
{
  "group": {
    "id": "grp_01H...",
    "name": "Café los viernes",
    "createdBy": { "id": "usr_...", "username": "...", "displayName": "...", "avatarUrl": null, "city": "..." },
    "members": [
      { "user": { "...": "UserPublic" }, "accepted": true }
    ],
    "events": []
  }
}
```

### GET `/v1/me/groups`

**200:**

```json
{
  "groups": [
    {
      "id": "grp_01H...",
      "name": "...",
      "createdBy": { "...": "UserPublic" },
      "members": [],
      "events": []
    }
  ],
  "total": 3
}
```

Definir shape mínimo de `events` alineado con la UI (fecha, lugar, estado): ver implementación en `app/group/[id].tsx`.

### GET `/v1/groups/:groupId`

**200:** un objeto `group` como arriba.

**404:** no existe.

### POST `/v1/groups/:groupId/events`

**Body (propuesta):**

```json
{
  "placeId": "plc_01H...",
  "googlePlaceId": "ChIJ...",
  "date": "2026-04-15"
}
```

(El backend elige si el evento referencia `placeId` interno o resuelve por `googlePlaceId`.)

**201:** `{ "event": { ... } }`

### POST `/v1/diaries`

**Body:**

```json
{
  "name": "Palermo specialty",
  "description": "Notas de cafés en Palermo"
}
```

**201:**

```json
{
  "diary": {
    "id": "dry_01H...",
    "name": "Palermo specialty",
    "description": "...",
    "places": [],
    "createdBy": { "...": "UserPublic" },
    "createdAt": "2026-04-07"
  }
}
```

### GET `/v1/me/diaries`

**200:** `{ "diaries": [ { ... } ], "total": N }`

### GET `/v1/users/:userId/diaries`

**200:** igual; solo diarios visibles públicamente.

### GET `/v1/diaries/:diaryId`

**200:**

```json
{
  "diary": {
    "id": "dry_01H...",
    "name": "...",
    "description": "...",
    "places": [ { "...": "PlaceSummary extendido o Place mock-compatible" } ],
    "createdBy": { "...": "UserPublic" },
    "createdAt": "2026-04-07"
  }
}
```

### POST `/v1/diaries/:diaryId/places`

**Body:**

```json
{
  "googlePlaceId": "ChIJ...",
  "placeId": "plc_01H..."
}
```

(Uno de los dos obligatorio según decisión del backend.)

**201:** `{ "diary": { ... } }` o `{ "place": { ... } }`

---

## Búsqueda unificada (pantalla `search` en la app)

La app abre [`app/search.tsx`](../app/search.tsx) con tres modos: **Lugares**, **Guías**, **Personas**. Solo dispara requests cuando el usuario escribió **al menos 2 caracteres** (`q` recortado).

### 1. Personas — `GET /v1/users/search`

**Cliente:** [`searchUsersByUsername`](../lib/api/users.ts)

```http
GET /v1/users/search?q=<texto>&limit=25&offset=0
Authorization: Bearer <token>
```

**Query:**

| Parámetro | Obligatorio | Notas |
|-----------|-------------|--------|
| `q` | Sí | Texto de búsqueda (el front envía `trim()`). |
| `limit` | No | Default razonable 20–25; el cliente usa 25. |
| `offset` | No | Paginación si el backend la soporta. |

**200 esperado:**

```json
{
  "users": [
    {
      "id": "usr_...",
      "username": "muni",
      "displayName": "Muni",
      "avatarUrl": "https://..." ,
      "city": "Buenos Aires"
    }
  ],
  "total": 42
}
```

- El cliente acepta ítems envueltos como `{ "user": { ... } }` y normaliza.
- **Recomendado backend:** buscar por `username` y opcionalmente `displayName`; normalizar `@` y case; excluir al usuario autenticado si aplica; `total` estable para paginación; rate limit por usuario.

---

### 2. Lugares — `GET /v1/places/nearby` (con texto)

**Cliente:** [`fetchNearbyPlaces`](../lib/api/places.ts) en modo búsqueda solo envía `query`, `lat`, `lng`, `limit` (sin `type` en la pantalla de búsqueda actual).

```http
GET /v1/places/nearby?query=<texto>&lat=-34.6&lng=-58.4&limit=20
Authorization: Bearer <token>
```

- Si faltan `lat`/`lng`, el backend puede usar la ciudad/coords guardadas en el perfil del usuario (comportamiento ya asumido en el cliente).
- **200:** `{ "places": [ ... ] }` — forma `NearbyPlace` en [`types/places.ts`](../types/places.ts).
- Calidad de ranking y sinónimos (barrio, “wifi”, etc.) son responsabilidad del backend / proxy a Google.

---

### 3. Guías públicas — `GET /v1/diaries/search` (nuevo / crítico para descubrimiento)

**Cliente:** [`searchPublicDiaries`](../lib/api/diaries.ts)

Hoy el cliente intenta esta ruta; si responde **404**, **405** o **501**, hace **fallback** solo con `GET /v1/me/diaries` filtrando guías **`visibility: "public"`** del usuario logueado (no hay descubrimiento comunitario).

Para que el modo **Guías** sea útil en producción, el backend debe implementar:

```http
GET /v1/diaries/search?q=<texto>&limit=25&offset=0
Authorization: Bearer <token>
```

**Comportamiento esperado:**

- Solo incluir diarios/guías con **`visibility: "public"`** (y reglas de moderación si existen).
- Buscar al menos en `name`, `description`, `intro` (campos del modelo `ApiDiary` en [`types/api.ts`](../types/api.ts)).
- Opcional: ponderar por autor, ciudad, recencia.

**200 — misma forma que listados de diarios:**

```json
{
  "diaries": [
    {
      "id": "dry_...",
      "name": "...",
      "description": "...",
      "intro": "...",
      "places": [],
      "createdBy": { "id": "...", "username": "...", "displayName": "...", "avatarUrl": null, "city": "..." },
      "createdAt": "2026-04-07T12:00:00.000Z",
      "visibility": "public",
      "coverImageUrl": null,
      "orderedPlaces": null
    }
  ],
  "total": 10
}
```

- Debe ser compatible con el tipo **`ApiDiary`** que ya usa el detalle `GET /v1/diaries/:id`.
- Si `q` está vacío, el cliente **no llama**; el backend puede devolver `400` o `[]` si se llama igual.

**Errores:** cuerpo `{ "message": "..." }` coherente con el resto de la API.

---

## Checklist para el equipo backend

- [ ] Errores con cuerpo `{ "message": "..." }`
- [ ] Listas paginadas con `total` donde se indique
- [ ] Fechas: `visitedAt` como `YYYY-MM-DD`, `createdAt` en ISO UTC
- [ ] Lugares: siempre `id` interno FECA + `googlePlaceId` cuando venga de Google
- [ ] Tags de visita: strings `cafe` / `brunch` (extensible después)
- [ ] GET `/v1/me` alineado con el user devuelto por PATCH `/v1/me` + stats
- [ ] `GET /v1/diaries/search` para búsqueda global de guías públicas (pantalla Buscar)

---

## Versión

- Documento alineado con el plan de migración mock → real (abril 2026).
- Cambios futuros: versionar API (`Accept-Version` o prefijo `/v2`) si hay breaking changes.

---

## Cliente Expo (implementado en Fase 1)

La app ya llama a estos endpoints cuando hay sesión y `EXPO_PUBLIC_API_BASE_URL`:

| Módulo | Archivo |
|--------|---------|
| Visitas | `lib/api/visits.ts` |
| Perfil / stats | `lib/api/me.ts` (`GET /v1/me`) |
| Usuario ajeno | `lib/api/users.ts` (`GET /v1/users/:id`) |
| Guardado en lugar | `lib/api/saved.ts` |
| Búsqueda (lugares / guías / personas) | `lib/api/places.ts`, `lib/api/diaries.ts` (`searchPublicDiaries`), `lib/api/users.ts` (`searchUsersByUsername`) — ver sección **Búsqueda unificada** arriba |

Si el backend aún no expone alguna ruta, la UI muestra error o datos mock de respaldo donde aplica (perfil: visitas mock si falla `GET /v1/me/visits`; usuario: mock si falla `GET /v1/users/:id`). Si falta `GET /v1/diaries/search`, el modo Guías en Buscar solo filtra las guías públicas del propio usuario.
