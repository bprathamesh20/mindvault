import { useEffect, useRef } from "react";
import { ActivityIndicator, BackHandler, Platform, StyleSheet, Text, View } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import { Newsreader_400Regular } from "@expo-google-fonts/newsreader/400Regular";
import { Newsreader_400Regular_Italic } from "@expo-google-fonts/newsreader/400Regular_Italic";
import { Newsreader_500Medium } from "@expo-google-fonts/newsreader/500Medium";
import { Newsreader_700Bold } from "@expo-google-fonts/newsreader/700Bold";
import { ShareIntentProvider, useShareIntentContext } from "expo-share-intent";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useConvexAuth } from "@convex-dev/auth/react";
import { ConvexClientProvider } from "../components/convex-provider";
import { SignIn } from "../components/sign-in";
import { ToastProvider, useToast } from "../components/toast";
import { ActionSheetProvider } from "../components/action-sheet";
import { PromptProvider } from "../components/prompt";
import { fonts, useTheme } from "../lib/theme";
import { hydratePrefs } from "../lib/prefs";
import { useCapture } from "../lib/capture";
import { CONVEX_URL } from "../lib/convex-url";

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

void hydratePrefs();
void SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  // Newsreader is the brand serif shared with the web app. Hold the splash
  // until it's in so titles never flash in a fallback face.
  const [fontsLoaded, fontError] = useFonts({
    Newsreader_400Regular,
    Newsreader_400Regular_Italic,
    Newsreader_500Medium,
    Newsreader_700Bold,
  });
  const ready = fontsLoaded || !!fontError;

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <ShareIntentProvider>
          <ConvexClientProvider>
            <ThemedRoot />
          </ConvexClientProvider>
        </ShareIntentProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function ThemedRoot() {
  const c = useTheme();

  // Keeps the window behind screens (visible during transitions and
  // keyboard animations) the same color as the app.
  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(c.bg).catch(() => {});
  }, [c.bg]);

  return (
    <ToastProvider>
      <ActionSheetProvider>
        <PromptProvider>
          <StatusBar style={c.scheme === "dark" ? "light" : "dark"} />
          <AuthGate />
        </PromptProvider>
      </ActionSheetProvider>
    </ToastProvider>
  );
}

function AuthGate() {
  // No backend configured means no Convex provider either — bail before
  // any Convex hook runs.
  if (!CONVEX_URL) return <SetupNeeded />;
  return <AuthedApp />;
}

function AuthedApp() {
  const c = useTheme();
  const { isLoading, isAuthenticated } = useConvexAuth();

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: c.bg }]} accessibilityLabel="Opening your vault">
        <ActivityIndicator color={c.textFaint} />
      </View>
    );
  }
  if (!isAuthenticated) return <SignIn />;

  return (
    <>
      <ShareIntentHandler />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: c.bg },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="item/[id]"
          options={{ animation: Platform.OS === "ios" ? "default" : "slide_from_right" }}
        />
        <Stack.Screen
          name="capture"
          options={{
            presentation: "modal",
            animation: Platform.OS === "ios" ? "default" : "slide_from_bottom",
            contentStyle: { backgroundColor: Platform.OS === "ios" ? c.surface : c.bg },
          }}
        />
      </Stack>
    </>
  );
}

/**
 * Links shared from other apps land here. Saving happens without opening
 * any UI; on Android we then hand the person straight back to where they
 * shared from.
 */
function ShareIntentHandler() {
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntentContext();
  const { saveText } = useCapture();
  const toast = useToast();
  const lastShared = useRef<string | null>(null);

  useEffect(() => {
    if (!hasShareIntent) return;
    const target = (shareIntent.webUrl ?? shareIntent.text ?? "").trim();
    if (!target || lastShared.current === target) return;
    lastShared.current = target;
    resetShareIntent();
    void saveText(target).then((r) => {
      toast(r.message, r.ok ? "success" : "error");
      if (r.ok && Platform.OS === "android") setTimeout(() => BackHandler.exitApp(), 900);
    });
  }, [hasShareIntent, shareIntent, resetShareIntent, saveText, toast]);

  return null;
}

function SetupNeeded() {
  const c = useTheme();
  return (
    <View style={[styles.center, { backgroundColor: c.bg }]}>
      <Text style={[styles.setupTitle, { color: c.text }]}>MindVault</Text>
      <Text style={[styles.setupBody, { color: c.textMuted }]}>
        Set EXPO_PUBLIC_CONVEX_URL in apps/mobile/.env.local to your Convex deployment URL, then reload.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 12 },
  setupTitle: { fontFamily: fonts.serif, fontSize: 34 },
  setupBody: { fontSize: 15, lineHeight: 21, textAlign: "center" },
});
