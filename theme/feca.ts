import { DefaultTheme } from "@react-navigation/native";

export const hexToRgba = (hex: string, opacity: number) => {
  const value = hex.replace("#", "");
  const bigint = Number.parseInt(value, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;

  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

/** DESIGN.md: outline-variant #b3b2ae at 15% for ghost borders only */
export const outlineGhost = hexToRgba("#b3b2ae", 0.15);

export const fecaTheme = {
  colors: {
    /** Base / surface (#fcf9f6) */
    background: "#fcf9f6",
    surface: "#fcf9f6",
    surfaceBright: "#fffefb",

    /** Acento principal (gris pizarra; antes azul #286393) */
    primary: "#595F6A",
    /** Variante más oscura para gradientes / pressed */
    primaryDim: "#464B55",
    /** Secondary solid button (DESIGN.md §5): gray container */
    primaryContainer: "#e2e2e2",
    /** Tab active chip, soft fills — tinte suave sobre el primario */
    primaryFixed: "#E4E6EA",
    /** Text/icons on secondary-fixed / primary-fixed fills */
    onPrimaryFixed: "#3A3F48",
    onSecondaryFixed: "#3A3F48",

    secondary: "#595F6A",
    secondaryDim: "#464B55",
    secondaryFixed: "#E4E6EA",
    secondarySoft: "#8E939D",

    onSurface: "#323330",
    onSurfaceVariant: "#6d685f",
    muted: "#6d685f",

    onPrimary: "#fcf9f6",
    paper: "#fcf9f6",

    /** Ghost borders / dividers (15% tint) */
    outlineVariant: outlineGhost,
    outlineVariantBase: "#b3b2ae",
    /** Icons, stars off, subtle strokes — not ghost-level */
    iconSubtle: "#b3b2ae",
    overlay: hexToRgba("#323330", 0.04),
    /** Modales / sheets — siempre desde onSurface */
    scrim: hexToRgba("#323330", 0.45),
    scrimMedium: hexToRgba("#323330", 0.4),
    scrimLight: hexToRgba("#323330", 0.3),
    scrimSubtle: hexToRgba("#323330", 0.2),
    scrimMuted: hexToRgba("#323330", 0.36),
    /** Vidrios sobre surface (reemplazan crema legacy #f2efe9) */
    glassStrong: hexToRgba("#fcf9f6", 0.94),
    glassMedium: hexToRgba("#fcf9f6", 0.92),
    glassSoft: hexToRgba("#fcf9f6", 0.78),
  },
  surfaces: {
    /** Sectional layers (DESIGN.md hierarchy) */
    low: "#f6f3f0",
    /** Alias: surface-container-low */
    containerLow: "#f6f3f0",
    container: "#f0edea",
    high: "#f0edea",
    lowest: "#ffffff",
    /** Chips — warm neutral step above container */
    highest: "#ece8e4",
    glass: "rgba(252, 249, 246, 0.8)",
  },
  spacing: {
    xxs: 6,
    xs: 8,
    sm: 12,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
    xxxl: 64,
  },
  radii: {
    /** Esquinas compactas (badges, chips pequeños) — ≥12px */
    xs: 12,
    /** DESIGN: &lt; 1rem feels too sharp — UI minimum 16 */
    sm: 16,
    md: 18,
    lg: 28,
    /** ~3rem editorial blobs */
    xl: 48,
    xxl: 48,
    pill: 999,
  },
  elevation: {
    /** DESIGN.md: 0 20 40 rgba(50,51,48,0.06) */
    ambient: {
      shadowColor: "#323330",
      shadowOpacity: 0.06,
      shadowRadius: 40,
      shadowOffset: { width: 0, height: 20 },
      elevation: 4,
    },
    floating: {
      shadowColor: "#323330",
      shadowOpacity: 0.08,
      shadowRadius: 40,
      shadowOffset: { width: 0, height: 20 },
      elevation: 8,
    },
  },
  typography: {
    logo: {
      fontFamily: "Newsreader_500Medium_Italic",
      fontSize: 32,
      lineHeight: 36,
    },
    display: {
      fontFamily: "Newsreader_700Bold",
      fontSize: 42,
      lineHeight: 48,
    },
    headline: {
      fontFamily: "Newsreader_700Bold",
      fontSize: 28,
      lineHeight: 34,
    },
    title: {
      fontFamily: "Newsreader_700Bold",
      fontSize: 22,
      lineHeight: 28,
    },
    body: {
      fontFamily: "PlusJakartaSans_400Regular",
      fontSize: 16,
      lineHeight: 24,
    },
    bodyStrong: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 16,
      lineHeight: 22,
    },
    label: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 12,
      lineHeight: 16,
      letterSpacing: 1.2,
    },
    meta: {
      fontFamily: "PlusJakartaSans_500Medium",
      fontSize: 13,
      lineHeight: 18,
    },
    numeric: {
      fontFamily: "Newsreader_700Bold",
      fontSize: 18,
      lineHeight: 20,
    },
  },
} as const;

export const fecaNavigationTheme = {
  ...DefaultTheme,
  dark: false,
  colors: {
    ...DefaultTheme.colors,
    primary: fecaTheme.colors.primary,
    background: fecaTheme.colors.background,
    card: fecaTheme.surfaces.lowest,
    text: fecaTheme.colors.onSurface,
    border: "transparent",
    notification: fecaTheme.colors.secondaryDim,
  },
};

export type FecaTheme = typeof fecaTheme;
