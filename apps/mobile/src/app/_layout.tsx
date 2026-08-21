import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ShareIntentProvider } from "expo-share-intent";
import { ConvexClientProvider } from "./convex-provider";

export default function RootLayout() {
  return (
    <ShareIntentProvider>
      <ConvexClientProvider>
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="search" />
        </Stack>
      </ConvexClientProvider>
    </ShareIntentProvider>
  );
}
