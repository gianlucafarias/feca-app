# Preguntas para backend — ciudad canónica, feed y lugares

Copiar/pegar en Slack/Linear/Notion. Cuando respondan, anotar las respuestas acá o en el contrato (`docs/backend-api-contract.md`).

---

## 1. Perfil y ciudad (`PATCH /v1/me` / `GET /v1/me`)

1. ¿Cuál es la **fuente de verdad** de la ciudad del usuario: `city_google_place_id` (o equivalente), `city` texto, o ambas? ¿Hay que mandar siempre los tres (`city`, `city_google_place_id`, `lat`, `lng`) en el PATCH al cambiar ciudad?
2. Tras un `PATCH` exitoso, ¿el cuerpo devuelve el **objeto `user` completo** con `city`, `city_google_place_id`, `lat` y `lng` actualizados? Si omiten campos, ¿cuáles pueden faltar?
3. En JSON, ¿usan `**snake_case`** (`city_google_place_id`) o `**camelCase**` (`cityGooglePlaceId`) en las respuestas? ¿El validador del body del PATCH acepta solo ciertos nombres?

---

## 2. Feed (`GET /v1/feed`)

1. ¿Lista **exacta** de query params permitidos? (Ej.: `mode`, `limit`, `offset`, `lat`, `lng`, `cursor`, …)
  — Nos apareció error tipo *"property city_google_place_id should not exist"* al enviar ese param en la query; confirmar que **no** debe enviarse en el cliente y que el filtro por ciudad sale del **usuario autenticado** en BD.
2. Con `mode=city` (o el valor que usen ustedes): ¿el backend toma la ciudad / coords **solo del perfil guardado** del usuario (JWT → user id → DB)? ¿O esperan `lat`/`lng` en query para algo concreto?
3. Si el usuario acaba de hacer `PATCH` y enseguida llama `GET /v1/feed`, ¿garantizan lectura **consistente** del perfil actualizado (sin cache viejo)?

---

## 3. Lugares cercanos (`GET /v1/places/nearby` y si aplica `GET /v1/explore/context`)

1. Misma pregunta: **whitelist** de query params. ¿Está permitido enviar `city_google_place_id` o `cityGooglePlaceId`? Si no, confirmar que la ciudad ancla sale del **perfil en BD** vía token.
2. Si **no** mandamos `lat`/`lng` en query, ¿el backend usa las coords del perfil del usuario o exige siempre `lat`/`lng` en query?
3. Para `explore/context` (intent, etc.): mismas reglas que `nearby` respecto a ubicación y ciudad.

---

## 4. Ciudades / FECA (`GET` autocomplete, reverse, etc.)

1. ¿El autocomplete y el reverse siguen el contrato actual (`limit` 1–10, etc.)? ¿Algún cambio reciente que debamos reflejar en el cliente?

---

## 5. Errores y validación

1. ¿Usan `forbidNonWhitelisted` / `whitelist` en **query** y en **body**? Si sí, ¿pueden compartir los DTOs o un OpenAPI/Swagger actualizado para `/v1/feed`, `/v1/places/nearby` y `PATCH /v1/me`?

---

**Resumen para el equipo mobile:** Hoy el cliente envía `Authorization: Bearer …`, actualiza perfil con ciudad canónica vía `PATCH /v1/me`, y vuelve a pedir feed y lugares **sin** enviar `city_google_place_id` en query (porque el validador lo rechaza). Necesitamos confirmación de que el servidor usa siempre el perfil persistido para `mode=city` y para búsquedas por contexto de ciudad.