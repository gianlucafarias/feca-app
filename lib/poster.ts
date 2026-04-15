import type { Place } from "@/types/feca";

const posterTemplate = (
  title: string,
  subtitle: string,
  accent: string,
  accentSoft: string,
) => `
  <svg xmlns="http://www.w3.org/2000/svg" width="800" height="520" viewBox="0 0 800 520">
    <defs>
      <linearGradient id="g" x1="0%" x2="100%" y1="0%" y2="100%">
        <stop offset="0%" stop-color="${accent}" />
        <stop offset="100%" stop-color="${accentSoft}" />
      </linearGradient>
    </defs>
    <rect width="800" height="520" rx="48" fill="#f4efe8" />
    <circle cx="640" cy="116" r="132" fill="url(#g)" opacity="0.22" />
    <circle cx="168" cy="420" r="136" fill="${accent}" opacity="0.15" />
    <rect x="56" y="58" width="240" height="16" rx="8" fill="${accent}" opacity="0.42" />
    <text x="56" y="208" fill="#323330" font-family="Georgia, serif" font-size="64" font-weight="700">${title}</text>
    <text x="56" y="258" fill="#6d685f" font-family="Arial, sans-serif" font-size="28">${subtitle}</text>
    <path d="M478 250c42 0 76 34 76 76s-34 76-76 76-76-34-76-76 34-76 76-76Z" fill="${accent}" opacity="0.16" />
    <path d="M606 176c0 46-38 84-84 84s-84-38-84-84 38-84 84-84 84 38 84 84Z" fill="${accentSoft}" opacity="0.24" />
  </svg>
`;

export const buildPosterDataUri = (
  title: string,
  subtitle: string,
  accent: string,
  accentSoft: string,
) => {
  const svg = posterTemplate(title, subtitle, accent, accentSoft);
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

export const buildPlacePoster = (place: Place) =>
  buildPosterDataUri(
    place.name,
    `${place.neighborhood} · ${place.categories.join(" / ")}`,
    place.accent,
    place.accentSoft,
  );
