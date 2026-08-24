import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ShareIntentProvider } from "expo-share-intent";
import { ConvexClientProvider } from "./convex-provider";
import { colors } from "../lib/theme";

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

export default function RootLayout() {
  return (
    <ShareIntentProvider>
      <ConvexClientProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.bg },
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="item/[id]"
            options={{ animation: "slide_from_right" }}
          />
        </Stack>
      </ConvexClientProvider>
    </ShareIntentProvider>
  );
}
