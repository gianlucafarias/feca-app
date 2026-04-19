import { ThemeProvider } from "@react-navigation/native";
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
} from "@expo-google-fonts/plus-jakarta-sans";
import {
  Newsreader_400Regular_Italic,
  Newsreader_500Medium_Italic,
  Newsreader_700Bold,
  Newsreader_700Bold_Italic,
} from "@expo-google-fonts/newsreader";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import * as SystemUI from "expo-system-ui";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { useExpoPushRegistration } from "@/hooks/use-expo-push-registration";
import "@/lib/push/expo-notifications-setup";
import { AuthProvider } from "@/providers/auth-provider";
import { OnboardingProvider } from "@/providers/onboarding-provider";
import { UnreadNotificationsProvider } from "@/providers/unread-notifications-provider";
import { fecaNavigationTheme, fecaTheme } from "@/theme/feca";

function ExpoPushRegistration() {
  useExpoPushRegistration();
  return null;
}

SplashScreen.preventAutoHideAsync().catch(() => {
  // noop: splash screen can already be hidden in fast refresh.
});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    Newsreader_400Regular_Italic,
    Newsreader_500Medium_Italic,
    Newsreader_700Bold,
    Newsreader_700Bold_Italic,
  });

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(fecaTheme.colors.background).catch(() => {
      // noop on unsupported platforms.
    });
  }, []);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {
        // noop
      });
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider value={fecaNavigationTheme}>
          <AuthProvider>
            <OnboardingProvider>
              <UnreadNotificationsProvider>
                <ExpoPushRegistration />
                <Stack
                  screenOptions={{
                    headerShown: false,
                    contentStyle: {
                      backgroundColor: fecaTheme.colors.background,
                    },
                  }}
                >
                <Stack.Screen name="index" />
                <Stack.Screen name="(onboarding)" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen
                  name="visit/new"
                  options={{
                    animation: "slide_from_bottom",
                    /** Sin “hoja” flotante: evita el hueco superior del sheet en iOS */
                    presentation: "fullScreenModal",
                  }}
                />
                <Stack.Screen
                  name="place/[id]"
                  options={{ animation: "slide_from_right" }}
                />
                <Stack.Screen
                  name="group/[id]"
                  options={{ animation: "slide_from_right" }}
                />
                <Stack.Screen
                  name="group/new"
                  options={{
                    animation: "slide_from_bottom",
                    presentation: "modal",
                  }}
                />
                <Stack.Screen
                  name="friends"
                  options={{ animation: "slide_from_right" }}
                />
                <Stack.Screen
                  name="search"
                  options={{
                    animation: "slide_from_bottom",
                    presentation: "fullScreenModal",
                  }}
                />
                <Stack.Screen
                  name="notifications"
                  options={{ animation: "slide_from_right" }}
                />
                <Stack.Screen
                  name="diary/[id]"
                  options={{ animation: "slide_from_right" }}
                />
                <Stack.Screen
                  name="diary/new"
                  options={{
                    animation: "slide_from_bottom",
                    presentation: "modal",
                  }}
                />
                <Stack.Screen
                  name="user/[id]"
                  options={{ animation: "slide_from_right" }}
                />
                <Stack.Screen
                  name="taste"
                  options={{ animation: "slide_from_right" }}
                />
                <Stack.Screen
                  name="outing-preferences"
                  options={{ animation: "slide_from_right" }}
                />
                <Stack.Screen
                  name="profile/edit"
                  options={{ animation: "slide_from_right" }}
                />
                <Stack.Screen
                  name="collection/[id]"
                  options={{ animation: "slide_from_right" }}
                />
                <Stack.Screen
                  name="saved"
                  options={{ animation: "slide_from_right" }}
                />
                </Stack>
                <StatusBar style="dark" />
              </UnreadNotificationsProvider>
            </OnboardingProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
