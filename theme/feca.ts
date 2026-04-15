import { DefaultTheme } from "@react-navigation/native";

const hexToRgba = (hex: string, opacity: number) => {
  const value = hex.replace("#", "");
  const bigint = Number.parseInt(value, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;

  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

export const fecaTheme = {
  colors: {
    background: "#f2efe9",
    primary: "#516443",
    primaryContainer: "#849974",
    secondary: "#964733",
    secondarySoft: "#c77763",
    onSurface: "#323330",
    muted: "#6d685f",
    onPrimary: "#ffffff",
    paper: "#fffdf9",
    outlineVariant: hexToRgba("#323330", 0.15),
    overlay: hexToRgba("#323330", 0.04),
  },
  surfaces: {
    low: "#f5f3ef",
    lowest: "#ffffff",
    high: "#f1ede6",
    highest: "#ece7df",
    glass: "rgba(255, 252, 247, 0.8)",
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
    sm: 12,
    md: 18,
    lg: 28,
    xl: 36,
    pill: 999,
  },
  elevation: {
    ambient: {
      shadowColor: "#323330",
      shadowOpacity: 0.08,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 4 },
      elevation: 3,
    },
    floating: {
      shadowColor: "#323330",
      shadowOpacity: 0.1,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 8 },
      elevation: 6,
    },
  },
  typography: {
    /** Wordmark "feca": Newsreader Medium 500 Italic (solo logo; no títulos) */
    logo: {
      fontFamily: "Newsreader_500Medium_Italic",
      fontSize: 32,
      lineHeight: 36,
    },
    /** Títulos: Newsreader Bold 700 (sin itálica; itálica solo en `logo`) */
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
      fontFamily: "Manrope_400Regular",
      fontSize: 16,
      lineHeight: 24,
    },
    bodyStrong: {
      fontFamily: "Manrope_600SemiBold",
      fontSize: 16,
      lineHeight: 22,
    },
    label: {
      fontFamily: "Manrope_600SemiBold",
      fontSize: 12,
      lineHeight: 16,
      letterSpacing: 1.2,
    },
    meta: {
      fontFamily: "Manrope_500Medium",
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
    notification: fecaTheme.colors.secondary,
  },
};

export type FecaTheme = typeof fecaTheme;
