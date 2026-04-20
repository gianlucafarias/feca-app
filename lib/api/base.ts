type ErrorPayload = {
  message?: string;
  error?: string;
  code?: string;
  details?: unknown;
};

export const FECA_PLACES_ORIGIN_HEADER = "X-FECA-Places-Origin";

export class ApiRequestError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = code;
  }

  static is(e: unknown): e is ApiRequestError {
    return e instanceof ApiRequestError;
  }
}

/** Lee `{ message, code? }` del cuerpo de error (un solo `json()`). */
export async function parseApiErrorJson(
  response: Response,
): Promise<{ message: string; code?: string }> {
  try {
    const payload = (await response.json()) as ErrorPayload;
    let message =
      payload.message ??
      payload.error ??
      `Request failed with status ${response.status}`;
    if (payload.details != null) {
      const detailStr =
        typeof payload.details === "string"
          ? payload.details
          : JSON.stringify(payload.details);
      message = `${message} — ${detailStr}`;
    }
    const code = typeof payload.code === "string" ? payload.code : undefined;
    return { message, code };
  } catch {
    return { message: `Request failed with status ${response.status}` };
  }
}

export function getApiBaseUrl(): string {
  const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (!baseUrl) {
    throw new Error("EXPO_PUBLIC_API_BASE_URL is not configured");
  }
  return baseUrl.replace(/\/+$/, "");
}

export async function parseError(response: Response): Promise<string> {
  const { message } = await parseApiErrorJson(response);
  return message;
}

/**
 * Convierte fallos de `fetch` (sin respuesta HTTP) en un mensaje accionable.
 * En RN suele aparecer como "Network request failed".
 */
export function rethrowWithNetworkHelp(error: unknown): never {
  const raw = error instanceof Error ? error.message : String(error);
  if (/network request failed|failed to fetch|load failed|network error/i.test(raw)) {
    throw new Error(
      "No hubo conexión con el servidor. Revisá Wi‑Fi o datos; si probás en un teléfono, la URL del API (EXPO_PUBLIC_API_BASE_URL) tiene que ser alcanzable desde ese dispositivo (no uses localhost de tu PC).",
    );
  }
  throw error instanceof Error ? error : new Error(raw);
}
