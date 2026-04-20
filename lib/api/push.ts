import { getApiBaseUrl, parseError } from "./base";

type RegisterExpoPushTokenInput = {
  installationId: string;
  platform: "ios" | "android";
  provider: "expo";
  timezone: string;
  token: string;
};

export async function registerExpoPushToken(
  accessToken: string,
  input: RegisterExpoPushTokenInput,
): Promise<void> {
  const response = await fetch(`${getApiBaseUrl()}/v1/me/push-tokens`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (response.status === 404 || response.status === 501) {
    return;
  }

  if (!response.ok) {
    throw new Error(await parseError(response));
  }
}

export async function revokeExpoPushInstallation(
  accessToken: string,
  installationId: string,
): Promise<void> {
  const response = await fetch(
    `${getApiBaseUrl()}/v1/me/push-tokens/${encodeURIComponent(installationId)}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (response.status === 404 || response.status === 501) {
    return;
  }

  if (!response.ok) {
    throw new Error(await parseError(response));
  }
}
