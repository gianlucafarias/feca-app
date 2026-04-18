type ErrorPayload = {
  message?: string;
  error?: string;
  details?: unknown;
};

export function getApiBaseUrl(): string {
  const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (!baseUrl) {
    throw new Error("EXPO_PUBLIC_API_BASE_URL is not configured");
  }
  return baseUrl.replace(/\/+$/, "");
}

export async function parseError(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as ErrorPayload;
    let msg =
      payload.message ??
      payload.error ??
      `Request failed with status ${response.status}`;
    if (payload.details != null) {
      const detailStr =
        typeof payload.details === "string"
          ? payload.details
          : JSON.stringify(payload.details);
      msg = `${msg} — ${detailStr}`;
    }
    return msg;
  } catch {
    return `Request failed with status ${response.status}`;
  }
}
