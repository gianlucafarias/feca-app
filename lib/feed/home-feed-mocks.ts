import { mockBaseFeedItems } from "@/mocks/scenarios";
import type { FeedItem, Place, User, Visit } from "@/types/feca";

const narrator: User = {
  id: "feca-context",
  username: "feca",
  displayName: "FECA",
  city: "Montevideo",
  neighborhood: "",
  bio: "",
  followingCount: 0,
  savedCount: 0,
  visitCount: 0,
};

function visitFromPlace(
  id: string,
  place: Place,
  note: string,
  rating: number,
  visitedAt: string,
): Visit {
  return {
    id,
    user: narrator,
    place,
    rating,
    visitedAt,
    note,
    tags: place.categories,
    companions: "",
  };
}

const NETWORK_REASONS: Record<string, string> = {
  "feed-lucia-bruma": "Lucía volvería",
  "feed-mateo-litoral": "Bueno para trabajar con café limpio",
  "feed-julieta-patio": "3 personas con gusto parecido lo guardaron",
};

function networkReasonLine(item: FeedItem): string {
  if (item.reasonLine) return item.reasonLine;
  const mapped = NETWORK_REASONS[item.id];
  if (mapped) return mapped;
  if (item.summary.trim()) return item.summary;
  return "Alguien de tu red pasó por acá";
}

/** Enriquece items del feed API o mock con línea de confianza. */
export function enrichNetworkItems(items: FeedItem[]): FeedItem[] {
  return items.map((item) => ({
    ...item,
    reasonLine: networkReasonLine(item),
  }));
}

const NEARBY_PLACES_ORDER = ["ronda", "miga", "litoral", "patio", "bruma"] as const;

export function buildNearbyFeedItems(placesById: Record<string, Place>): FeedItem[] {
  const reasons = [
    "A 6 min caminando · buena luz",
    "Cerca tuyo · specialty con buena barra",
    "En tu radio · ideal para una pausa",
    "Cerca · patio o ventana según mesa",
    "Cerca · brunch los domingos con cola que vale la pena",
  ];
  return NEARBY_PLACES_ORDER.flatMap((key, index) => {
    const place = placesById[key];
    if (!place) return [];
    const v = visitFromPlace(
      `nearby-${place.id}-${index}`,
      place,
      "Sugerencia según tu zona.",
      4,
      "2026-04-06",
    );
    const item: FeedItem = {
      id: `feed-nearby-${place.id}`,
      visit: v,
      summary: "Cerca tuyo",
      reasonLine: reasons[index % reasons.length] ?? "Cerca tuyo",
    };
    return [item];
  });
}

const NOW_REASONS: { placeKey: string; reasonLine: string; note: string }[] = [
  {
    placeKey: "litoral",
    reasonLine: "Abierto ahora y bueno para trabajar",
    note: "Buen café y mesas para enfocarse.",
  },
  {
    placeKey: "ronda",
    reasonLine: "Para merienda rápida con buen flat white",
    note: "Cola corta a esta hora.",
  },
  {
    placeKey: "bruma",
    reasonLine: "Muy elegido para brunch de domingo",
    note: "Si tenés tiempo, vale la espera.",
  },
  {
    placeKey: "miga",
    reasonLine: "Tranqui para leer una hora",
    note: "Playlist suave y buena luz lateral.",
  },
  {
    placeKey: "patio",
    reasonLine: "Para una primera cita (luz y patio)",
    note: "Ambiente contenido y buen matcha.",
  },
];

export function buildNowFeedItems(placesById: Record<string, Place>): FeedItem[] {
  return NOW_REASONS.flatMap((row, index) => {
    const place = placesById[row.placeKey];
    if (!place) return [];
    const v = visitFromPlace(
      `now-${place.id}-${index}`,
      place,
      row.note,
      5,
      "2026-04-07",
    );
    const item: FeedItem = {
      id: `feed-now-${place.id}-${index}`,
      visit: v,
      summary: "Para ahora",
      reasonLine: row.reasonLine,
    };
    return [item];
  });
}

/** Feed mock cuando no hay API o lista vacía: usa escenario base con razones. */
export function getFallbackNetworkFeed(): FeedItem[] {
  return enrichNetworkItems(mockBaseFeedItems);
}
