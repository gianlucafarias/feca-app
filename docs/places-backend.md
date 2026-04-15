# FECA Places Backend

## Objetivo

Disenar el backend de lugares para que el alta de un nuevo FECA sea asistida por busqueda y no por carga manual.

Principios del flujo:

- El usuario define solo `city`, `lat` y `lng`.
- `neighborhood` queda fuera del modelo.
- Al crear una visita, el usuario escribe el nombre del lugar y recibe autocompletado con resultados reales.
- Si el lugar existe en Google Places, FECA lo resuelve y guarda automaticamente.
- Solo si no aparece un resultado valido, se habilita la carga manual con nombre y direccion.
- Cada lugar tiene un perfil propio con fotos, informacion del negocio y resenas.

## Decisiones de producto

### Contexto de ubicacion del usuario

Cada usuario debe tener:

- `city`
- `lat`
- `lng`
- `locationUpdatedAt`

Uso previsto:

- `city` sirve como contexto legible y fallback cuando no hay GPS preciso.
- `lat/lng` sirven para sesgar busquedas, ordenar lugares cercanos y poblar la exploracion.

No vamos a pedir ni persistir `neighborhood`.

### Fuente externa principal

Google Places sera la fuente principal para:

- autocompletado por nombre
- resolucion del lugar seleccionado
- fotos
- datos basicos del negocio
- resultados cercanos

Google Places cubre bien el flujo que necesitamos con:

- `Autocomplete (New)`
- `Place Details (New)`
- `Place Photos (New)`
- `Nearby Search (New)`

### Manual entry como fallback

La carga manual no desaparece, pero pasa a ser una excepcion:

- se usa solo cuando Google no devuelve un resultado correcto
- requiere `name` y `address`
- opcionalmente puede geocodificarse despues para completar `lat/lng`

## Flujo principal

### Onboarding

1. El usuario informa su ciudad.
2. La app pide permiso de ubicacion.
3. Si el usuario acepta, guardamos `lat/lng` reales.
4. Si el usuario no acepta, dejamos la ciudad y resolvemos un centro aproximado mas adelante.

### Crear una nueva visita

1. El usuario escribe el nombre del lugar.
2. El frontend aplica debounce y llama a `GET /v1/places/autocomplete`.
3. El backend consulta primero lugares ya existentes en FECA.
4. Si hace falta, el backend consulta Google Places Autocomplete con `sessionToken`.
5. El usuario toca un resultado.
6. El frontend llama a `POST /v1/places/resolve` con el `googlePlaceId`.
7. El backend trae `Place Details`, guarda o actualiza el lugar y devuelve el `placeId` interno.
8. La visita se crea contra ese `placeId`.
9. Si no hubo match, la UI muestra `Agregar manualmente` y el usuario carga la direccion.

### Perfil del lugar

Cada lugar debe tener una pantalla propia con dos capas:

#### Datos externos

- nombre
- direccion
- coordenadas
- fotos
- rating externo
- cantidad de ratings
- categorias
- horarios
- telefono
- sitio web

#### Datos propios de FECA

- resenas de usuarios FECA
- visitas registradas
- fotos subidas por usuarios
- cantidad de guardados
- etiquetas internas

## Diseno de API

### `GET /v1/places/autocomplete`

Busca lugares por texto y devuelve resultados listos para mostrar en el input.

Query params:

- `q`
- `lat`
- `lng`
- `city`
- `sessionToken`
- `limit`

Respuesta sugerida:

```json
{
  "items": [
    {
      "id": "google:ChIJ...",
      "source": "google",
      "sourcePlaceId": "ChIJ...",
      "name": "Ronda Cafe",
      "address": "Avenida X 1234",
      "city": "Montevideo",
      "lat": -34.9,
      "lng": -56.19,
      "categories": ["cafe"],
      "coverPhotoUrl": "https://...",
      "ratingExternal": 4.6,
      "ratingCountExternal": 381,
      "alreadyInFeca": true,
      "placeId": "plc_01H..."
    }
  ],
  "fallback": {
    "allowManual": true,
    "prefillName": "Ronda"
  }
}
```

Reglas:

- minimo 2 caracteres para pegarle a Google
- debounce de 250 a 300 ms en frontend
- primero devolver coincidencias internas de FECA
- mezclar resultados internos y externos sin duplicar

### `POST /v1/places/resolve`

Convierte un resultado de Google en un lugar canonico de FECA.

Body:

```json
{
  "source": "google",
  "sourcePlaceId": "ChIJ..."
}
```

Respuesta sugerida:

```json
{
  "place": {
    "id": "plc_01H...",
    "source": "google",
    "sourcePlaceId": "ChIJ...",
    "name": "Ronda Cafe",
    "address": "Avenida X 1234",
    "city": "Montevideo",
    "lat": -34.9,
    "lng": -56.19,
    "categories": ["cafe", "brunch"],
    "coverPhotoUrl": "https://..."
  }
}
```

Reglas:

- si el lugar ya existe por `source + sourcePlaceId`, devolverlo
- si no existe, crear `place`
- guardar payload normalizado y fecha de sync

### `POST /v1/places/manual`

Crea un lugar manual cuando Google no devolvio un match valido.

Body:

```json
{
  "name": "Cafe Nuevo",
  "address": "Calle 1234",
  "city": "Montevideo",
  "lat": -34.9,
  "lng": -56.18
}
```

Reglas:

- usar solo cuando el flujo asistido no encuentra un resultado
- si `lat/lng` no estan, resolverlos despues con geocoding
- marcar el registro como `source = manual`

### `GET /v1/places/:placeId`

Devuelve la ficha completa del lugar para la pantalla de perfil.

Incluye:

- datos canonicos del lugar
- media
- metricas FECA
- ultimas resenas

### `POST /v1/visits`

La visita deja de depender de `placeName` y pasa a depender de `placeId`.

Body sugerido:

```json
{
  "placeId": "plc_01H...",
  "rating": 5,
  "note": "Flat white muy bueno.",
  "visitedAt": "2026-04-07"
}
```

## Modelo de datos

### `users`

Campos relevantes:

- `id`
- `city`
- `lat`
- `lng`
- `location_updated_at`

### `places`

Campos sugeridos:

- `id`
- `source` enum: `google | manual`
- `source_place_id`
- `name`
- `address`
- `city`
- `lat`
- `lng`
- `categories` json/array
- `rating_external`
- `rating_count_external`
- `phone`
- `website`
- `opening_hours` json
- `google_maps_uri`
- `cover_photo_ref`
- `cover_photo_url`
- `provider_payload` jsonb
- `last_synced_at`
- `created_at`
- `updated_at`

Indices recomendados:

- unique en `source + source_place_id`
- indice geoespacial por coordenadas
- indice por `city`
- indice full text por `name`

### `place_photos`

- `id`
- `place_id`
- `source`
- `source_photo_ref`
- `photo_url`
- `width`
- `height`
- `sort_order`
- `created_at`

### `reviews`

- `id`
- `place_id`
- `user_id`
- `rating`
- `body`
- `visited_at`
- `created_at`

### `review_photos`

- `id`
- `review_id`
- `storage_key`
- `width`
- `height`

### `visits`

Si queremos mantener una entidad separada de review:

- `id`
- `place_id`
- `user_id`
- `visited_at`
- `rating`
- `note`
- `created_at`

Si preferimos simplificar v1:

- una resena FECA puede funcionar como review + visita en un mismo registro

## Estrategia de sincronizacion

### Autocomplete

- no persistir cada prediccion
- usar cache corta en backend por `q + city + coarseLatLng`
- TTL recomendado: 5 a 15 minutos

### Resolve

- persistir el lugar solo cuando el usuario selecciona uno
- este es el punto en el que nace el `placeId` interno

### Refresh de un lugar

Actualizar datos externos:

- al resolver por primera vez
- al abrir el perfil si `lastSyncedAt` esta viejo
- mediante job offline para lugares populares

TTL sugerido:

- detalles del lugar: 7 dias
- fotos: 30 dias
- rating externo: 24 horas si el lugar es popular

## Reglas de deduplicacion

El backend debe evitar duplicados entre:

- un lugar ya guardado desde Google
- el mismo lugar entrando otra vez por Google
- un lugar creado manualmente y luego encontrado en Google

Heuristica minima:

1. Match exacto por `source + source_place_id`
2. Match fuerte por `normalized_name + city + distance < 80m`
3. Revision manual o job de merge para casos dudosos

## Busquedas por cercania

Ademas del alta por nombre, el producto necesita descubrimiento por ubicacion.

Endpoint sugerido:

### `GET /v1/places/nearby`

Query params:

- `lat`
- `lng`
- `radius`
- `category`
- `limit`

Uso:

- poblar la pestana Explorar
- mostrar resultados cuando el input todavia esta vacio
- ordenar por cercania o popularidad

## Consideraciones de UX

- El input de nueva visita debe priorizar seleccion, no texto libre.
- La primera accion visual debe ser `Buscar lugar`.
- `Agregar manualmente` debe vivir abajo del listado y verse como fallback.
- Si el usuario selecciona un lugar, el formulario ya deberia llegar con:
  - nombre
  - direccion
  - foto principal
  - categorias sugeridas
- El usuario no deberia tener que volver a escribir la direccion si el lugar ya existe en Google.

## Consideraciones operativas

- La app no debe llamar a Google Places directo desde cliente movil.
- La API key vive solo en backend.
- Todas las busquedas deben pasar por rate limiting.
- Cada sesion de autocomplete debe usar `sessionToken`.
- Fotos externas y resenas externas deben respetar atribucion y condiciones del proveedor.

## Decisiones para v1

- Se pide `city`, `lat` y `lng` al usuario.
- `neighborhood` no existe en el modelo.
- Google Places es el proveedor principal.
- La alta manual existe solo como fallback.
- La visita usa `placeId`, no `placeName`.
- Cada lugar tiene perfil propio.
- FECA persiste como first-class:
  - lugares
  - visitas
  - resenas de usuarios
  - fotos de usuarios

## Proximos cambios en frontend

Impacto directo en el codigo actual:

- [app/visit/new.tsx](../app/visit/new.tsx) debe pasar de busqueda local a autocomplete remoto
- [types/feca.ts](../types/feca.ts) debe cambiar `CreateVisitInput` para usar `placeId`
- [providers/mock-session-provider.tsx](../providers/mock-session-provider.tsx) no deberia resolver lugares por `placeName`
- [app/(onboarding)/city.tsx](../app/(onboarding)/city.tsx) debe pedir ciudad y ubicacion, sin barrio

## Contrato exacto del frontend (abril 2026)

La app ya implemento las pantallas de Explorar y Perfil del lugar. Los endpoints que consume son:

### `GET /v1/places/nearby` (Explorar)

La app envia:

```
GET /v1/places/nearby?lat=-34.9011&lng=-56.1645&type=cafe&query=ronda&limit=20
Authorization: Bearer <accessToken>
```

Query params:

- `lat` (required): latitud
- `lng` (required): longitud
- `query` (optional): texto de busqueda libre
- `type` (optional): `"cafe"` o `"restaurant"`
- `limit` (optional): maximo de resultados, default 20

La app espera esta respuesta:

```json
{
  "places": [
    {
      "googlePlaceId": "ChIJ2abc...",
      "name": "Ronda Cafe",
      "address": "Av. 18 de Julio 1234, Montevideo",
      "lat": -34.9011,
      "lng": -56.1645,
      "rating": 4.5,
      "userRatingCount": 123,
      "types": ["cafe", "food"],
      "primaryType": "cafe",
      "photoUrl": "https://...",
      "openNow": true
    }
  ]
}
```

Campos obligatorios: `googlePlaceId`, `name`, `address`, `lat`, `lng`, `types`.
Campos opcionales: `rating`, `userRatingCount`, `primaryType`, `photoUrl`, `openNow`.

Notas:

- Si `query` viene, usar Text Search en vez de Nearby Search.
- `photoUrl` debe ser una URL ya resuelta (no una referencia de Google). El frontend no tiene la API key.
- Si `type` viene, mapear a `includedTypes` de la Places API (New).
- Sin `query` ni `type`, devolver cafes y restaurantes cercanos por defecto.

### `GET /v1/places/:googlePlaceId` (Perfil del lugar)

La app envia:

```
GET /v1/places/ChIJ2abc...
Authorization: Bearer <accessToken>
```

La app espera esta respuesta:

```json
{
  "place": {
    "googlePlaceId": "ChIJ2abc...",
    "name": "Ronda Cafe",
    "address": "Av. 18 de Julio 1234, Montevideo",
    "lat": -34.9011,
    "lng": -56.1645,
    "rating": 4.5,
    "userRatingCount": 123,
    "types": ["cafe", "food"],
    "primaryType": "cafe",
    "photoUrl": "https://...",
    "openNow": true,
    "photos": [
      "https://places-photo-1...",
      "https://places-photo-2..."
    ],
    "openingHours": [
      "Lun: 08:00\u201320:00",
      "Mar: 08:00\u201320:00",
      "Mie: 08:00\u201320:00",
      "Jue: 08:00\u201320:00",
      "Vie: 08:00\u201322:00",
      "Sab: 09:00\u201322:00",
      "Dom: 09:00\u201318:00"
    ],
    "editorialSummary": "Cafe de especialidad con granos seleccionados...",
    "reviews": [
      {
        "authorName": "Maria",
        "rating": 5,
        "text": "Excelente cafe y ambiente muy tranquilo.",
        "relativeTime": "hace 2 semanas"
      }
    ],
    "fecaReviews": [
      {
        "id": "vis_01...",
        "userDisplayName": "Ana",
        "rating": 5,
        "note": "Flat white excelente.",
        "visitedAt": "2026-04-01",
        "relativeTime": "hace 6 días"
      }
    ]
  }
}
```

Campos adicionales respecto a nearby: `photos`, `openingHours`, `editorialSummary`, `reviews`, `fecaReviews`.

Notas:

- Todas las URLs de `photos` deben estar resueltas.
- `openingHours` es un array de strings tal como lo devuelve `regularOpeningHours.weekdayDescriptions`.
- `reviews` son **solo** reseñas de Google Places (fieldMask `reviews`). La app las muestra bajo “Google Maps”.
- `fecaReviews` son **visitas/reseñas de usuarios FECA** para ese `placeId` interno; la app las muestra primero (“Reseñas en feca”). Si el array viene vacío u omitido, solo se verán las de Google.
- `reviews[].authorName` mapea a `authorAttribution.displayName` de Google.
- `reviews[].relativeTime` mapea a `relativePublishTimeDescription` de Google.
- fieldMask recomendado para datos externos: `displayName,formattedAddress,location,rating,userRatingCount,types,primaryType,photos,regularOpeningHours,editorialSummary,reviews`.

### Tipos TypeScript del frontend

Los tipos estan definidos en `types/places.ts`:

```typescript
type NearbyPlace = {
  googlePlaceId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  rating?: number;
  userRatingCount?: number;
  types: string[];
  primaryType?: string;
  photoUrl?: string;
  openNow?: boolean;
};

type GoogleReview = {
  authorName: string;
  rating: number;
  text: string;
  relativeTime: string;
};

type PlaceDetail = NearbyPlace & {
  photos: string[];
  openingHours?: string[];
  editorialSummary?: string;
  reviews?: GoogleReview[];
};
```

### Prioridad de implementacion

1. `GET /v1/places/nearby` — la app ya llama a este endpoint al abrir Explorar
2. `GET /v1/places/:googlePlaceId` — la app llama al tocar un lugar en la lista

Sin estos endpoints, la pantalla Explorar mostrara un error y la pantalla de Perfil del lugar no cargara datos.

## Referencias

- [Google Places Autocomplete (New)](https://developers.google.com/maps/documentation/places/web-service/place-autocomplete)
- [Google Place Details (New)](https://developers.google.com/maps/documentation/places/web-service/place-details)
- [Google Nearby Search (New)](https://developers.google.com/maps/documentation/places/web-service/nearby-search)
- [Google Place Photos (New)](https://developers.google.com/maps/documentation/places/web-service/place-photos)
- [Google Place Types (New)](https://developers.google.com/maps/documentation/places/web-service/place-types)
