import type { MockPlaceSocial } from "@/types/places";

const bySlug: Record<string, MockPlaceSocial> = {
  ronda: {
    followersVisited: [
      { userId: "lucia", displayName: "Lucía" },
      { userId: "julieta", displayName: "Julieta" },
      { userId: "mateo", displayName: "Mateo" },
    ],
    communityTags: ["flat white", "luz lateral", "tostón ricota", "mesa larga"],
    bestMoments: [
      "Mañana de semana con cuaderno",
      "Media tarde cuando entra sol de costado",
    ],
    userPhotoUris: [
      "https://picsum.photos/seed/feca-ronda-a/400/300",
      "https://picsum.photos/seed/feca-ronda-b/400/300",
    ],
    diaryAppearances: [
      { diaryId: "diary-specialty", name: "Specialty que vale la pena" },
      { diaryId: "diary-lucia-ventanas", name: "Mesas con ventana" },
    ],
  },
  miga: {
    followersVisited: [
      { userId: "mateo", displayName: "Mateo" },
      { userId: "lucia", displayName: "Lucía" },
    ],
    communityTags: ["espresso", "barra chica", "financier", "lectura"],
    bestMoments: ["Media tarde tranquila", "Pausa rápida antes de volver al ritmo"],
    userPhotoUris: ["https://picsum.photos/seed/feca-miga-a/400/300"],
    diaryAppearances: [
      { diaryId: "diary-specialty", name: "Specialty que vale la pena" },
      { diaryId: "diary-julieta-lectura", name: "Para leer tranquila" },
    ],
  },
  bruma: {
    followersVisited: [
      { userId: "lucia", displayName: "Lucía" },
      { userId: "julieta", displayName: "Julieta" },
      { userId: "valentina", displayName: "Valentina" },
    ],
    communityTags: ["brunch", "domingo", "huevos", "cola que vale la pena"],
    bestMoments: ["Domingo después de las 10", "Brunch largo con amigas"],
    userPhotoUris: [
      "https://picsum.photos/seed/feca-bruma-a/400/300",
      "https://picsum.photos/seed/feca-bruma-b/400/300",
    ],
    diaryAppearances: [
      { diaryId: "diary-brunch-spots", name: "Brunch para repetir" },
      { diaryId: "diary-lucia-domingos", name: "Domingos lentos" },
    ],
  },
  litoral: {
    followersVisited: [{ userId: "mateo", displayName: "Mateo" }],
    communityTags: ["V60", "tostado", "barra de concreto", "antes del trabajo"],
    bestMoments: ["Mañana temprano para filtro limpio", "Cookie tibia de salida"],
    userPhotoUris: ["https://picsum.photos/seed/feca-lit-a/400/300"],
    diaryAppearances: [
      { diaryId: "diary-mateo-v60", name: "Ruta V60" },
      { diaryId: "diary-specialty", name: "Specialty que vale la pena" },
    ],
  },
  patio: {
    followersVisited: [
      { userId: "julieta", displayName: "Julieta" },
      { userId: "sofia", displayName: "Sofía" },
    ],
    communityTags: ["matcha", "patio", "sando huevo", "primera cita"],
    bestMoments: ["Cuando el patio tiene sombra", "Media mañana sin apuro"],
    userPhotoUris: [
      "https://picsum.photos/seed/feca-patio-a/400/300",
      "https://picsum.photos/seed/feca-patio-b/400/300",
    ],
    diaryAppearances: [
      { diaryId: "diary-brunch-spots", name: "Brunch para repetir" },
      { diaryId: "diary-julieta-lectura", name: "Para leer tranquila" },
    ],
  },
};

const NAME_TO_SLUG: [string, string][] = [
  ["ronda", "ronda"],
  ["miga", "miga"],
  ["bruma", "bruma"],
  ["litoral", "litoral"],
  ["patio", "patio"],
];

function slugFromName(name: string): string | null {
  const lower = name.trim().toLowerCase();
  for (const [needle, slug] of NAME_TO_SLUG) {
    if (lower.includes(needle)) return slug;
  }
  return null;
}

/**
 * Datos sociales mock para la ficha. `id` puede ser id de API o googlePlaceId.
 */
export function getMockPlaceSocial(
  id: string,
  placeName?: string,
): MockPlaceSocial | null {
  const direct = bySlug[id];
  if (direct) return direct;

  if (placeName) {
    const slug = slugFromName(placeName);
    if (slug && bySlug[slug]) return bySlug[slug];
  }

  return null;
}
