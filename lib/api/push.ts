import { getApiBaseUrl, parseError } from "./base";

/**
 * Registra el token de Expo Push en el backend para que pueda enviar notificaciones.
 * El backend debe exponer esta ruta (o equivalente) y guardar el token por usuario/dispositivo.
 */
export async function registerExpoPushToken(
  accessToken: string,
  expoPushToken: string,
): Promise<void> {
  const response = await fetch(`${getApiBaseUrl()}/v1/me/push-tokens`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      token: expoPushToken,
      provider: "expo",
    }),
  });

  if (response.status === 404 || response.status === 501) {
    return;
  }

  if (!response.ok) {
    throw new Error(await parseError(response));
  }
}
