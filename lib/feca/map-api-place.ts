import { fecaTheme } from "@/theme/feca";
import type { ApiPlaceSummary } from "@/types/api";
import type { Place, PlaceCategory } from "@/types/feca";
import type { NearbyPlace } from "@/types/places";

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

/** Lugares desde `GET /v1/places/nearby` (aún sin `placeId` FECA). `id` = `googlePlaceId` hasta resolver en servidor. */
export function mapNearbyPlaceToPlace(place: NearbyPlace): Place {
  const parts = place.address.split(",").map((s) => s.trim());
  const neighborhood = parts[0] || place.address || "—";
  const city = parts.length > 1 ? parts[parts.length - 1] : "—";
  const categories: PlaceCategory[] = [
    place.primaryType === "restaurant" ? "brunch" : "cafe",
  ];
  return {
    id: place.googlePlaceId,
    name: place.name,
    neighborhood,
    city,
    categories,
    signature: place.name,
    note: "",
    accent: DEFAULT_ACCENT,
    accentSoft: DEFAULT_ACCENT_SOFT,
    savedCount: 0,
    bestMoment: "",
    photoUrl: place.photoUrl,
    googlePlaceId: place.googlePlaceId,
  };
}
