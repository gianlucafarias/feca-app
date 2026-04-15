import type { NearbyPlace, PlaceDetail } from "@/types/places";

const MOCK_PLACES: NearbyPlace[] = [
  {
    googlePlaceId: "mock_cafe_01",
    name: "Café Tortoni",
    address: "Av. de Mayo 825, Buenos Aires",
    lat: -34.6089,
    lng: -58.3803,
    rating: 4.3,
    userRatingCount: 28451,
    types: ["cafe", "restaurant", "food"],
    primaryType: "cafe",
    photoUrl: undefined,
    openNow: true,
  },
  {
    googlePlaceId: "mock_cafe_02",
    name: "LAB Tostadores de Café",
    address: "Humboldt 1542, Buenos Aires",
    lat: -34.5884,
    lng: -58.4356,
    rating: 4.7,
    userRatingCount: 1823,
    types: ["cafe", "food"],
    primaryType: "cafe",
    photoUrl: undefined,
    openNow: true,
  },
  {
    googlePlaceId: "mock_cafe_03",
    name: "Cuervo Café",
    address: "Thames 620, Buenos Aires",
    lat: -34.5979,
    lng: -58.4262,
    rating: 4.5,
    userRatingCount: 965,
    types: ["cafe", "food"],
    primaryType: "cafe",
    photoUrl: undefined,
    openNow: false,
  },
  {
    googlePlaceId: "mock_rest_01",
    name: "Don Julio",
    address: "Guatemala 4699, Buenos Aires",
    lat: -34.5862,
    lng: -58.4257,
    rating: 4.6,
    userRatingCount: 15670,
    types: ["restaurant", "food"],
    primaryType: "restaurant",
    photoUrl: undefined,
    openNow: true,
  },
  {
    googlePlaceId: "mock_rest_02",
    name: "El Preferido de Palermo",
    address: "Jorge Luis Borges 2108, Buenos Aires",
    lat: -34.5876,
    lng: -58.4275,
    rating: 4.4,
    userRatingCount: 4320,
    types: ["restaurant", "food"],
    primaryType: "restaurant",
    photoUrl: undefined,
    openNow: true,
  },
  {
    googlePlaceId: "mock_cafe_04",
    name: "Full City Coffee House",
    address: "Thames 1535, Buenos Aires",
    lat: -34.5899,
    lng: -58.4335,
    rating: 4.6,
    userRatingCount: 723,
    types: ["cafe", "food"],
    primaryType: "cafe",
    photoUrl: undefined,
    openNow: true,
  },
  {
    googlePlaceId: "mock_rest_03",
    name: "Proper",
    address: "Av. Dorrego 1040, Buenos Aires",
    lat: -34.5821,
    lng: -58.4399,
    rating: 4.5,
    userRatingCount: 2100,
    types: ["restaurant", "cafe", "food"],
    primaryType: "restaurant",
    photoUrl: undefined,
    openNow: false,
  },
  {
    googlePlaceId: "mock_cafe_05",
    name: "Birkin Coffee",
    address: "Gorriti 6042, Buenos Aires",
    lat: -34.5862,
    lng: -58.4357,
    rating: 4.8,
    userRatingCount: 410,
    types: ["cafe", "food"],
    primaryType: "cafe",
    photoUrl: undefined,
    openNow: true,
  },
];

const MOCK_DETAILS: Record<string, PlaceDetail> = {};

for (const p of MOCK_PLACES) {
  MOCK_DETAILS[p.googlePlaceId] = {
    ...p,
    photos: [],
    openingHours: [
      "Lun: 08:00–20:00",
      "Mar: 08:00–20:00",
      "Mié: 08:00–20:00",
      "Jue: 08:00–20:00",
      "Vie: 08:00–22:00",
      "Sáb: 09:00–22:00",
      "Dom: 09:00–18:00",
    ],
    editorialSummary:
      p.primaryType === "cafe"
        ? "Café de especialidad con ambiente acogedor y excelente atención."
        : "Restaurante reconocido con cocina argentina de primer nivel.",
    reviews: [
      {
        authorName: "María G.",
        rating: 5,
        text: "Excelente lugar, muy recomendable. El ambiente es increíble.",
        relativeTime: "hace 1 semana",
      },
      {
        authorName: "Juan P.",
        rating: 4,
        text: "Muy bueno en general, la atención fue rápida y amable.",
        relativeTime: "hace 3 semanas",
      },
      {
        authorName: "Lucía R.",
        rating: 5,
        text: "De lo mejor que probé en la zona. Volvería sin dudarlo.",
        relativeTime: "hace 1 mes",
      },
    ],
  };
}

export function getMockNearbyPlaces(
  query?: string,
  type?: string,
): NearbyPlace[] {
  let results = [...MOCK_PLACES];

  if (type) {
    results = results.filter((p) => p.types.includes(type));
  }

  if (query) {
    const q = query.toLowerCase();
    results = results.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.address.toLowerCase().includes(q),
    );
  }

  return results;
}

export function getMockPlaceDetail(
  googlePlaceId: string,
): PlaceDetail | null {
  return MOCK_DETAILS[googlePlaceId] ?? null;
}
