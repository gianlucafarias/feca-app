import { ThemeProvider } from "@react-navigation/native";
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
} from "@expo-google-fonts/manrope";
import {
  Newsreader_500Medium_Italic,
  Newsreader_700Bold,
} from "@expo-google-fonts/newsreader";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import * as SystemUI from "expo-system-ui";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthProvider } from "@/providers/auth-provider";
import { OnboardingProvider } from "@/providers/onboarding-provider";
import { fecaNavigationTheme, fecaTheme } from "@/theme/feca";

SplashScreen.preventAutoHideAsync().catch(() => {
  // noop: splash screen can already be hidden in fast refresh.
});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Newsreader_500Medium_Italic,
    Newsreader_700Bold,
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
                    presentation: "modal",
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
                  name="collection/[id]"
                  options={{ animation: "slide_from_right" }}
                />
                <Stack.Screen
                  name="saved"
                  options={{ animation: "slide_from_right" }}
                />
              </Stack>
              <StatusBar style="dark" />
            </OnboardingProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
