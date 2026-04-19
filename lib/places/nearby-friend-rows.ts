import type { NearbyPlace, NearbyPlaceFriendRow } from "@/types/places";

/** Normaliza una fila API (camelCase o snake_case en campos). */
export function normalizeFriendRowFromApi(raw: unknown): NearbyPlaceFriendRow | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const r = raw as Record<string, unknown>;
  const usernameVal = r.username ?? r.user_name;
  if (typeof usernameVal !== "string") {
    return null;
  }
  const username = usernameVal.trim();
  if (!username) {
    return null;
  }
  const snippetVal = r.snippet ?? r.snippet_text ?? "";
  const snippet = typeof snippetVal === "string" ? snippetVal.trim() : "";
  const avatarVal = r.avatarUrl ?? r.avatar_url;
  const avatarUrl =
    typeof avatarVal === "string" && avatarVal.trim() ? avatarVal.trim() : null;
  return { username, snippet, avatarUrl };
}

function friendRowDedupeKey(r: NearbyPlaceFriendRow): string {
  return `${r.username.toLowerCase()}\0${r.snippet.trim().toLowerCase()}`;
}

/**
 * Interpreta una línea de `socialChips` tipo `@ana volvería a ir` o `@pepe`.
 * Sin `@` al inicio no se infieren filas (evita tratar nombres completos como usuario).
 */
export function parseSocialChipToFriendRow(line: string): NearbyPlaceFriendRow | null {
  const t = line.trim();
  const m = t.match(/^@([a-zA-Z0-9._]+)(?:\s+(.+))?$/);
  if (!m) {
    return null;
  }
  return {
    username: m[1],
    snippet: (m[2] ?? "").trim(),
    avatarUrl: null,
  };
}

export function getNearbyFriendRows(place: NearbyPlace): NearbyPlaceFriendRow[] {
  /**
   * El backend puede mandar `friendSocialRows` (p. ej. la visita más fuerte) y a la vez
   * `socialChips` con más líneas (@otro quiere ir, etc.). Antes solo usábamos una fuente.
   */
  const fromRows = (place.friendSocialRows ?? [])
    .map((row) => normalizeFriendRowFromApi(row))
    .filter((row): row is NearbyPlaceFriendRow => row != null);
  const fromChips: NearbyPlaceFriendRow[] = [];
  for (const line of place.socialChips ?? []) {
    const row = parseSocialChipToFriendRow(line);
    if (row) {
      fromChips.push(row);
    }
  }
  const seen = new Set<string>();
  const out: NearbyPlaceFriendRow[] = [];
  for (const row of [...fromRows, ...fromChips]) {
    const k = friendRowDedupeKey(row);
    if (seen.has(k)) {
      continue;
    }
    seen.add(k);
    out.push(row);
  }
  return out;
}
