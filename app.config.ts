import type { ExpoConfig } from "expo/config";

/**
 * URL scheme que iOS usa para el redirect de OAuth (REVERSED_CLIENT_ID).
 * Debe ser `com.googleusercontent.apps.` + la parte del Client ID iOS antes de `.apps.googleusercontent.com`.
 * Si solo configurás `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`, se deduce solo.
 */
function getGoogleIosUrlScheme(): string {
  const explicit = process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME?.trim();
  if (explicit) {
    return explicit;
  }
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim();
  if (iosClientId?.endsWith(".apps.googleusercontent.com")) {
    const prefix = iosClientId.replace(/\.apps\.googleusercontent\.com$/i, "");
    return `com.googleusercontent.apps.${prefix}`;
  }
  return "com.googleusercontent.apps.replace-me";
}

const googleIosUrlScheme = getGoogleIosUrlScheme();

/** Para `getExpoPushTokenAsync` (EAS). Ver https://docs.expo.dev/push-notifications/push-notifications-setup/ */
const easProjectId =
  process.env.EXPO_PUBLIC_EAS_PROJECT_ID?.trim() ?? "";

const config: ExpoConfig = {
  name: "feca",
  slug: "feca",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "feca",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  ios: {
    bundleIdentifier: "com.feca.app",
    supportsTablet: true,
    infoPlist: {
      LSApplicationQueriesSchemes: [
        "instagram",
        "instagram-stories",
      ],
    },
  },
  android: {
    package: "com.feca.app",
    /** `resize` reduce el área útil con el teclado abierto (evita tapar inputs/sugerencias). */
    softwareKeyboardLayoutMode: "resize",
    adaptiveIcon: {
      backgroundColor: "#fcf9f6",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
  },
  web: {
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  extra: {
    eas: {
      projectId: easProjectId,
    },
  },
  plugins: [
    "expo-router",
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#fcf9f6",
        dark: {
          backgroundColor: "#27272a",
        },
      },
    ],
    [
      "@react-native-google-signin/google-signin",
      {
        iosUrlScheme: googleIosUrlScheme,
      },
    ],
    [
      "expo-location",
      {
        locationWhenInUsePermission:
          "FECA usa tu ubicación para sugerirte lugares y guardar tu ciudad.",
      },
    ],
    "expo-secure-store",
    [
      "expo-notifications",
      {
        icon: "./assets/images/icon.png",
        color: "#595F6A",
      },
    ],
    "@react-native-community/datetimepicker",
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
};

export default config;
