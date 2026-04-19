/** Quita @ inicial para que buscar "@muni" encuentre username "muni". */
export function normalizeUserSearchQuery(raw: string): string {
  return raw.trim().toLowerCase().replace(/^@+/g, "");
}

export function filterUsersBySearchQuery<
  T extends { displayName: string; username: string },
>(items: T[], rawQuery: string): T[] {
  const q = normalizeUserSearchQuery(rawQuery);
  if (!q) return items;
  return items.filter((u) => {
    const name = u.displayName.toLowerCase();
    const user = u.username.toLowerCase();
    return name.includes(q) || user.includes(q);
  });
}
