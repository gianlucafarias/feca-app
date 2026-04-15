# Handoff backend — seguidores, feed y gaps respecto al cliente Expo

Documento para el equipo backend: qué debe cumplir la API respecto a la app **actual** (código en `lib/api/`) y qué conviene definir al incorporar el **sistema de seguidores** (seguir / dejar de seguir).

La referencia general sigue siendo [backend-api-contract.md](./backend-api-contract.md); acá se listan **cambios respecto al contrato original** y **decisiones pendientes**.

---

## 1. Visitas — cuerpo de `POST /v1/visits`

El cliente ya no envía `googlePlaceId` + `placeName`. Envía el **id interno del lugar** tras resolverlo:

```json
{
  "placeId": "plc_...",
  "rating": 4,
  "note": "...",
  "tags": ["cafe"],
  "visitedAt": "2026-04-07"
}
```

Flujo en app:

1. Lugar de Google: `POST /v1/places/resolve` con `{ "source": "google", "sourcePlaceId": "<googlePlaceId>" }` → `{ "place": ApiStoredPlace }` → usar `place.id` en `POST /v1/visits`.
2. Lugar manual: `POST /v1/places/manual` con `{ name, address, city, lat?, lng? }` → `{ place }` → mismo `placeId` en visitas.

**Backend:** persistir `ApiStoredPlace` (o equivalente), alinear shape con `types/api.ts` (`ApiStoredPlace`).

---

## 2. Lugares — rutas nuevas (cliente implementado)

| Método | Ruta | Uso |
|--------|------|-----|
| POST | `/v1/places/resolve` | Resolver/reutilizar lugar Google → id interno |
| POST | `/v1/places/manual` | Crear lugar manual |
| GET | `/v1/places/nearby` | Búsqueda cercana (sin fallback mock en cliente) |
| GET | `/v1/places/:googlePlaceId` | Detalle para pantalla de lugar |

---

## 3. `GET /v1/me` — stats

El cliente acepta contadores en el **objeto `user`** y, si no vienen, en un objeto opcional **`stats`** (merge en `lib/api/me.ts`):

```json
{
  "user": { "...": "ApiMeUser", "visitCount": null },
  "stats": {
    "visitCount": 42,
    "savedCount": 15,
    "followingCount": 8
  }
}
```

**Recomendación:** unificar en un solo lugar (`user` o `stats`) y documentar; el front ya tolera ambos.

---

## 4. Sistema de seguidores — alinear modelo y rutas

### 4.1 Semántica de “amigos” vs “seguidos”

Hoy el cliente llama **`GET /v1/me/friends`** (`lib/api/friends.ts`) para listar usuarios en la pantalla “Amigos”.

Con un modelo puro de **seguimiento (follow)** conviene aclarar con producto:

- **`/v1/me/friends`** = ¿solo mutuos? ¿o lista de **usuarios que sigo** (`following`)?
- Si pasa a ser “solo seguidos”, renombrar o duplicar rutas, por ejemplo:
  - `GET /v1/me/following` — quien yo sigo (feed y UI “seguir”).
  - Opcional: `GET /v1/me/followers`, `GET /v1/users/:id/followers`.

El contrato ya define seguimiento explícito:

- `POST /v1/users/:userId/follow` → `{ "following": true }`
- `DELETE /v1/users/:userId/follow` → `{ "following": false }`

**Backend debe:** implementar idempotencia, validar no seguirse a sí mismo, y actualizar contadores (`followingCount` del que sigue; opcional `followersCount` del perfil visitado).

### 4.2 Perfil ajeno — estado “¿lo sigo?”

La pantalla de usuario (`/user/:id`) aún no llama a follow desde el botón; para la UI har falta al menos una de:

- Incluir en `GET /v1/users/:userId` algo como `"isFollowing": true|false` para el usuario autenticado, o
- `GET /v1/users/:userId/relationship` dedicado.

Sin esto el front no puede mostrar “Siguiendo” / “Seguir” con estado real.

### 4.3 Feed y ausencia de seguidos

Comportamiento deseado (contrato ya lo menciona):

- Si el usuario **no sigue a nadie** (o no hay actividad), el backend puede devolver `items: []` y `total: 0`.

La app, si recibe feed vacío con éxito, muestra invitación a **Amigos** y una sección local **“Populares en [ciudad]”** con datos mock (solo cliente).

**Opcional para el backend (mejor UX y analytics):**

- Campo en la respuesta del feed, por ejemplo `reason: "no_following" | "empty" | "ok"`, o
- `followingCount` en `GET /v1/me` siempre actualizado, para que el cliente distinga “sin seguidos” de “sin posts”.

No es obligatorio para funcionar; el cliente hoy infiere por `items.length === 0`.

---

## 5. Feed — contenido cuando hay seguidores

Con seguidores implementados:

- `GET /v1/feed` debe devolver visitas de usuarios **que el cliente sigue** (orden acordado: ej. `visitedAt` / `createdAt` desc).
- Opcional: mezclar con “descubrimiento” (popular en ciudad) **en el mismo endpoint** o en otro (`GET /v1/feed/discover`); si no, el cliente seguirá usando mock para “populares” cuando el feed principal esté vacío.

---

## 6. Diarios de otro usuario

Contrato: `GET /v1/users/:userId/diaries`.

El cliente puede mostrar lista vacía hasta que exista; alinear permisos (público / solo seguidores).

---

## 7. Checklist rápido para backend

| Prioridad | Tarea |
|-----------|--------|
| Alta | `POST /v1/visits` con `placeId`; lugares `resolve` + `manual` + shape `ApiStoredPlace` |
| Alta | `POST/DELETE /v1/users/:id/follow` + actualización de contadores en `GET /v1/me` |
| Alta | `GET /v1/me/following` (usuarios que sigo); el cliente ya no usa el nombre “friends” en la UI |
| Alta | `GET /v1/users/search?q=` para buscar por @usuario |
| Alta | Notificaciones in-app: `GET /v1/me/notifications`, `POST .../notifications/:id/read`, tipo `follow` |
| Media | `GET /v1/users/:id` con `isFollowing` (o endpoint de relación) para el botón Seguir |
| Media | `GET /v1/feed` alimentado por el grafo de seguimiento |
| Baja | Metadato en feed (`reason` / `no_following`) o feed de descubrimiento dedicado |
| Baja | `GET /v1/users/:userId/diaries` según privacidad |

---

## 8. Errores

El cliente espera cuerpo `{ "message": "..." }` en errores (ver `lib/api/base.ts`).

---

## 9. Cliente Expo — seguimiento y notificaciones (implementado)

| Método | Ruta | Notas |
|--------|------|--------|
| GET | `/v1/me/following` | Lista **usuarios que sigo**. Respuesta: `{ "users": [UserPublic], "total" }`. El cliente acepta también la clave `friends` como alias de `users`. |
| GET | `/v1/users/search` | Query `q` (obligatorio), `limit`, `offset`. Respuesta: `{ "users": [...], "total" }`. |
| GET | `/v1/me/notifications` | Query opcional: `limit`, `offset`, `unreadOnly=1`. |
| POST | `/v1/me/notifications/:notificationId/read` | Marca leída (la app lo llama al abrir el ítem). |

**Cuerpo de notificación** (ejemplo `type: "follow"`):

```json
{
  "id": "ntf_...",
  "type": "follow",
  "read": false,
  "createdAt": "2026-04-07T14:30:00.000Z",
  "actor": { "id": "usr_...", "username": "...", "displayName": "...", "avatarUrl": null, "city": "..." }
}
```

**Push** (FCM / APNs): no está implementado en este cliente; el backend puede enviar push cuando cree la notificación `follow`.

---

*Última actualización: cliente con pantalla Seguidos, búsqueda, perfil con Seguir/Siguiendo, y pantalla Notificaciones in-app.*
