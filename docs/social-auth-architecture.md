# FECA Social Auth Architecture

## Objetivo

Definir como resolver login con redes sociales en FECA y dejar claro que implementa cada proyecto:

- `D:\Proyectos\feca`
- `D:\Proyectos\feca-backend`

## Decision

FECA debe usar un modelo hibrido:

- la app Expo inicia el login social con el SDK o flujo nativo del proveedor
- el backend valida la identidad recibida y emite la sesion propia de FECA
- toda la API de negocio acepta solo tokens de FECA

No conviene resolverlo solo en la app ni tampoco intentar mover toda la experiencia de login al backend.

## Por Que

### Si se hace solo en la app

Problemas:

- la API termina confiando en datos que vienen del cliente
- no hay una autoridad central para sesiones, logout, refresh y revocacion
- complica linking de cuentas y merge de identidades
- mezcla tokens de Google o Apple con la sesion interna de FECA

### Si se intenta hacer "todo en backend"

Problemas:

- el login nativo y la UX del proveedor viven en cliente
- Apple y Google esperan flujos adecuados para apps moviles
- la app igual necesita manejar redirecciones, browser session y almacenamiento seguro

### Beneficio del modelo hibrido

- UX nativa en mobile
- backend como fuente de verdad
- sesion propia de FECA desacoplada del proveedor
- mejor seguridad y mas control operativo

## Recomendacion Para FECA

Proveedores iniciales:

- Google
- Apple

Notas:

- si la app ofrece Google u otro login social como login principal en iOS, hay que asumir que tambien necesitara Sign in with Apple salvo excepciones de Apple
- para FECA v1 el objetivo del login social es identidad, no acceso a APIs del proveedor

Decision importante:

- no guardar tokens de Google o Apple como sesion principal
- no usar refresh tokens del proveedor en v1
- solo emitir `accessToken` y `refreshToken` de FECA

Si en el futuro FECA necesita llamar APIs del proveedor en nombre del usuario, por ejemplo Google Calendar o contactos, ahi si convendra hacer authorization code exchange en backend y guardar credenciales del proveedor del lado servidor.

## Responsabilidades Por Proyecto

## App Expo: `D:\Proyectos\feca`

La app debe encargarse de:

- mostrar botones de login
- abrir el flujo del proveedor con SDK nativo o OAuth seguro
- recibir `id_token` o `authorization_code`
- enviar ese resultado al backend
- guardar la sesion FECA en almacenamiento seguro
- refrescar la sesion FECA
- limpiar la sesion al hacer logout
- adjuntar `Authorization: Bearer <feca_access_token>` en llamadas a la API

La app no debe:

- verificar por su cuenta la identidad del proveedor como fuente final de verdad
- usar tokens de Google o Apple como token de la API FECA
- decidir alta o merge de usuarios sin pasar por backend

SDKs o piezas recomendadas:

- Apple en iOS: `expo-apple-authentication`
- OAuth general en Expo: `expo-auth-session`
- almacenamiento local seguro: `expo-secure-store`

## Backend: `D:\Proyectos\feca-backend`

El backend debe encargarse de:

- verificar tokens o codigos de proveedor
- crear o vincular usuario FECA
- emitir `accessToken` y `refreshToken` propios
- rotar refresh tokens
- invalidar sesiones
- exponer `/v1/me`
- aplicar auth guard al resto de la API
- registrar identidades externas por proveedor

El backend no debe:

- delegar la sesion principal a tokens del proveedor
- asumir que el cliente ya valido correctamente el token

## Flujo Recomendado

## Google o Apple

1. El usuario toca "Continuar con Google" o "Continuar con Apple".
2. La app inicia el flujo nativo.
3. La app obtiene un resultado del proveedor.
4. La app llama al backend.
5. El backend valida ese resultado contra el proveedor.
6. El backend busca o crea el usuario.
7. El backend responde con sesion FECA.
8. La app guarda la sesion FECA en `SecureStore`.
9. Las siguientes llamadas a la API usan solo el token FECA.

## Contrato Recomendado De API

## `POST /v1/auth/google/mobile`

Body sugerido para MVP:

```json
{
  "idToken": "google_id_token"
}
```

Alternativa futura si FECA necesita permisos offline de Google:

```json
{
  "authorizationCode": "google_auth_code",
  "codeVerifier": "pkce_verifier",
  "redirectUri": "..."
}
```

## `POST /v1/auth/apple/mobile`

Body sugerido:

```json
{
  "identityToken": "apple_identity_token",
  "authorizationCode": "apple_authorization_code",
  "nonce": "optional_nonce_if_used"
}
```

## `POST /v1/auth/refresh`

Body sugerido:

```json
{
  "refreshToken": "feca_refresh_token"
}
```

## `POST /v1/auth/logout`

Body sugerido:

```json
{
  "refreshToken": "feca_refresh_token"
}
```

## `GET /v1/me`

Devuelve el usuario autenticado segun la sesion FECA.

## Modelo De Datos Recomendado En Backend

## `users`

Campos base:

- `id`
- `username`
- `displayName`
- `email`
- `emailVerified`
- `bio`
- `city`
- `lat`
- `lng`
- `createdAt`
- `updatedAt`

## `auth_identities`

Una fila por proveedor vinculado al usuario.

Campos:

- `id`
- `userId`
- `provider` = `google | apple`
- `providerUserId`
- `email`
- `emailVerified`
- `createdAt`
- `updatedAt`

Restricciones:

- unique en `provider + providerUserId`

## `sessions`

Si FECA maneja refresh token persistente:

- `id`
- `userId`
- `refreshTokenHash`
- `userAgent`
- `ipAddress`
- `expiresAt`
- `revokedAt`
- `createdAt`

## Estrategia De Sesion

Recomendacion:

- `accessToken` FECA corto, por ejemplo 15 minutos
- `refreshToken` FECA rotado, por ejemplo 30 dias
- guardar solo hash del refresh token en base
- invalidar refresh token anterior cada vez que se rota

La app debe guardar:

- `accessToken`
- `refreshToken`
- metadata minima de expiracion si hace falta

La app no debe guardar:

- secretos del backend
- sesiones del proveedor como fuente principal

## Que Hacer En Cada Repo

## Trabajo En `D:\Proyectos\feca`

1. Crear una pantalla o modulo de login.
2. Agregar botones de Google y Apple.
3. Integrar `expo-apple-authentication`.
4. Integrar el flujo OAuth seguro para Google.
5. Crear un `AuthProvider` o estado global de sesion.
6. Guardar sesion FECA en `expo-secure-store`.
7. Hacer interceptor o cliente API que adjunte bearer token.
8. Implementar refresh silencioso.
9. Proteger navegacion si no hay sesion.

## Trabajo En `D:\Proyectos\feca-backend`

1. Crear modulo `auth`.
2. Agregar tablas `User`, `AuthIdentity` y `Session`.
3. Implementar verificador de Google.
4. Implementar verificador de Apple.
5. Implementar `POST /v1/auth/google/mobile`.
6. Implementar `POST /v1/auth/apple/mobile`.
7. Implementar `POST /v1/auth/refresh`.
8. Implementar `POST /v1/auth/logout`.
9. Implementar `GET /v1/me`.
10. Proteger el resto de la API con guard JWT.

## Orden Recomendado

1. Backend: schema Prisma para `users`, `auth_identities`, `sessions`
2. Backend: endpoints `auth` y `me`
3. App: storage seguro y estado de sesion
4. App: Apple login
5. App: Google login
6. App: proteger navegacion y consumir `/v1/me`

## Decision De Alcance Para V1

Para no abrir demasiados frentes, FECA v1 deberia hacer esto:

- login social con Google y Apple
- backend propio emite sesion FECA
- sin login por email/password
- sin linking manual de cuentas en UI
- sin consumo de APIs de Google o Apple en nombre del usuario

## Riesgos Y Notas

- Apple entrega algunos datos, como nombre y email, solo la primera vez en ciertos flujos; no hay que depender de que siempre vuelvan
- si despues quieren permisos offline de Google, el contrato de Google tendra que pasar de `idToken` simple a `authorizationCode` con exchange en backend
- las pantallas actuales de FECA no tienen infraestructura de auth; hoy no aparecio codigo de login ni manejo de sesion en el proyecto

## Referencias

- [Expo authentication guide](https://docs.expo.dev/guides/authentication/)
- [Expo AuthSession](https://docs.expo.dev/versions/latest/sdk/auth-session/)
- [Expo Apple Authentication](https://docs.expo.dev/versions/latest/sdk/apple-authentication/)
- [Expo SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/)
- [Google OAuth for native apps](https://developers.google.com/identity/protocols/oauth2/native-app)
- [Google authenticate with a backend server](https://developers.google.com/identity/sign-in/web/backend-auth)
- [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
