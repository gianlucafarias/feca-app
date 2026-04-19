import type { PlaceCategory } from "@/types/feca";

const shortDateFormatter = new Intl.DateTimeFormat("es-UY", {
  day: "numeric",
  month: "short",
});

/** Convierte una fecha local a `YYYY-MM-DD` (contrato `visitedAt`). */
export function toVisitYyyyMmDd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Acepta `YYYY-MM-DD` (fecha local de visita) o ISO 8601 del API; evita fechas inválidas. */
function parseDisplayDate(value: string): Date | null {
  const t = value.trim();
  if (!t) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) {
    const d = new Date(`${t}T12:00:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? null : d;
}

export const formatVisitDate = (value: string): string => {
  const d = parseDisplayDate(value);
  if (!d) return "—";
  return shortDateFormatter.format(d);
};

/** Tiempo relativo tipo feed: "hace 20h", "hace 3d"; fechas viejas como corta local. */
export const formatRelativeVisitTime = (value: string): string => {
  const d = parseDisplayDate(value);
  if (!d) return "—";
  const diffMs = Date.now() - d.getTime();
  if (diffMs < 0) return "ahora";
  const min = Math.floor(diffMs / 60_000);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  if (day >= 14) {
    return shortDateFormatter.format(d);
  }
  if (day >= 1) {
    return `hace ${day}d`;
  }
  if (hr >= 1) {
    return `hace ${hr}h`;
  }
  if (min >= 1) {
    return `hace ${min}m`;
  }
  return "ahora";
};

export const formatCategories = (categories: PlaceCategory[]) =>
  categories.map((item) => (item === "cafe" ? "Café" : "Brunch")).join(" · ");

export const getInitials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2);
