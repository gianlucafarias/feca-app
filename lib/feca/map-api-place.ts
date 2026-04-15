import { fecaTheme } from "@/theme/feca";
import type { ApiPlaceSummary } from "@/types/api";
import type { Place } from "@/types/feca";

const DEFAULT_ACCENT = fecaTheme.colors.primary;
const DEFAULT_ACCENT_SOFT = fecaTheme.colors.primaryContainer;

export function mapApiPlaceSummaryToPlace(
  place: ApiPlaceSummary,
  categories: Place["categories"] = ["cafe"],
): Place {
  const parts = place.address.split(",").map((s) => s.trim());
  const cityFromAddress = parts.length > 1 ? parts[parts.length - 1] : "";

  return {
    id: place.id,
    name: place.name,
    neighborhood: parts[0] || place.address || "—",
    city: cityFromAddress || "—",
    categories,
    signature: place.name,
    note: "",
    accent: DEFAULT_ACCENT,
    accentSoft: DEFAULT_ACCENT_SOFT,
    savedCount: 0,
    bestMoment: "",
    photoUrl: place.photoUrl ?? undefined,
    googlePlaceId: place.googlePlaceId ?? undefined,
  };
}
