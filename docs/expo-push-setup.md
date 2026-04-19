# Expo Push (FECA)

Flujo: la app obtiene un **Expo push token**, lo envía a **nuestro backend** (`POST /v1/me/push-tokens`), y el backend llama a la **Expo Push API** cuando haya un evento (seguidor nuevo, etc.). No hace falta pagar por el envío en sí; el plan gratuito de Expo alcanza para empezar.

## 1. Proyecto en Expo (gratis)

1. Cuenta en [expo.dev](https://expo.dev).
2. Crear un proyecto (o vincular el repo) y copiar el **Project ID** (UUID) desde *Project settings*.
3. En la raíz del repo:

   ```bash
   npx eas-cli login
   npx eas-cli init
   ```

   Seguí el asistente; si ya existe `eas.json`, puede pedirte vincular al proyecto correcto.

4. En `.env` (no commitear):

   ```bash
   EXPO_PUBLIC_EAS_PROJECT_ID=tu-uuid-del-proyecto
   ```

   Reiniciá Metro (`npx expo start -c`) para que Metro embeba la variable.

`app.config.ts` ya expone `extra.eas.projectId` desde esa variable; `getExpoPushTokenAsync` lo usa en runtime.

## 2. Build nativo (obligatorio para push real)

Las push **no** funcionan en el navegador web. En **Expo Go** el comportamiento de push es limitado; lo habitual es un **development build**:

```bash
# iOS (Mac + Xcode / cuenta Apple)
npx expo run:ios

# Android
npx expo run:android
```

O builds en la nube cuando lo necesiten (`eas build`). Tras cambiar plugins (p. ej. `expo-notifications`), hay que volver a generar el binario nativo.

## 3. Permisos

La app ya pide permiso de notificaciones al iniciar sesión (`useExpoPushRegistration`). En iOS: Ajustes → la app → notificaciones. En Android: canal `default` creado en código.

## 4. Backend: registrar token

La app envía:

- **Método / ruta:** `POST /v1/me/push-tokens`
- **Headers:** `Authorization: Bearer <access_token>`, `Content-Type: application/json`
- **Body:**

  ```json
  {
    "token": "ExponentPushToken[...]",
    "provider": "expo"
  }
  ```

Guardar **un registro por usuario y dispositivo** (o por token), y permitir actualizar si el token cambia.

Si la ruta aún no existe, el cliente ignora **404** / **501** sin crashear.

## 5. Backend: enviar con Expo Push API

Documentación oficial: [Send notifications with the Expo Push Service](https://docs.expo.dev/push-notifications/sending-notifications/).

Ejemplo mínimo (desde el servidor, con el token guardado):

```bash
curl -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -X POST https://exp.host/--/api/v2/push/send \
  -d '{
    "to": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
    "title": "FECA",
    "body": "Tenés una notificación nueva",
    "data": { "url": "/notifications" }
  }'
```

- Podés enviar un array en `to` para varios tokens.
- La respuesta incluye `data` con estados por ticket; conviene loguear errores.
- **No** hace falta API key de Expo para el endpoint público de envío en el flujo básico; para producción a escala revisá la doc actual sobre límites y buenas prácticas.

## 6. Comprobar que funciona

1. `.env` con `EXPO_PUBLIC_EAS_PROJECT_ID` y API apuntando a tu backend con `POST /v1/me/push-tokens` implementado.
2. Development build en dispositivo físico.
3. Iniciar sesión → el servidor debe recibir y guardar el token.
4. Enviar un `curl` como arriba con ese token → debe aparecer la notificación.

## Referencias en el cliente

| Pieza | Ubicación |
| --- | --- |
| Registro de token | `hooks/use-expo-push-registration.ts` |
| `POST` al backend | `lib/api/push.ts` |
| Handler en primer plano / canal Android | `lib/push/expo-notifications-setup.ts` |
| Contador no leídas / badge | `providers/unread-notifications-provider.tsx` |
