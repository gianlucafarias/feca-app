import type { ApiOutingPreferencesV1 } from "@/types/api";

export function hasMeaningfulOutingPreferences(
  p: ApiOutingPreferencesV1 | null | undefined,
): boolean {
  if (!p || typeof p !== "object") {
    return false;
  }
  const slots = p.typicalOutingSlots?.length ?? 0;
  const companies =
    (p.typicalCompanies?.length ?? 0) > 0 ||
    (p.typicalCompany != null && p.typicalCompany !== undefined);
  const priorities = p.placePriorities?.length ?? 0;
  return slots > 0 || companies || priorities > 0;
}
