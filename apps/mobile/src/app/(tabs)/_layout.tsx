import type { ComponentProps } from "react";
import { Platform, StyleSheet } from "react-native";
import { Tabs } from "expo-router";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../lib/theme";
import { haptics } from "../../lib/haptics";

type IconName = ComponentProps<typeof Ionicons>["name"];

function tabIcon(active: IconName, inactive: IconName) {
  function TabIcon({ color, focused }: { color: string; focused: boolean }) {
    return <Ionicons name={focused ? active : inactive} size={25} color={color} />;
  }
  return TabIcon;
}

export default function TabsLayout() {
  const c = useTheme();
  const translucent = Platform.OS === "ios";

  return (
    <Tabs
      screenListeners={{ tabPress: () => haptics.selection() }}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: c.bg },
        tabBarActiveTintColor: c.tint,
        tabBarInactiveTintColor: c.textFaint,
        tabBarLabelStyle: { fontSize: 10.5, fontWeight: "500" },
        tabBarStyle: {
          position: translucent ? "absolute" : "relative",
          backgroundColor: translucent ? "transparent" : c.surface,
          borderTopColor: c.separator,
          borderTopWidth: StyleSheet.hairlineWidth,
          elevation: 0,
        },
        tabBarBackground: translucent
          ? () => (
              <BlurView
                tint={c.scheme === "dark" ? "systemChromeMaterialDark" : "systemChromeMaterialLight"}
                intensity={100}
                style={StyleSheet.absoluteFill}
              />
            )
          : undefined,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Vault",
          tabBarIcon: tabIcon("albums", "albums-outline"),
          tabBarAccessibilityLabel: "Vault, everything you've saved",
        }}
      />
      <Tabs.Screen
        name="search"
        options={{ title: "Search", tabBarIcon: tabIcon("search", "search-outline") }}
      />
      <Tabs.Screen
        name="ask"
        options={{
          title: "Ask",
          tabBarIcon: tabIcon("sparkles", "sparkles-outline"),
          tabBarAccessibilityLabel: "Ask your vault a question",
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: "Settings", tabBarIcon: tabIcon("settings", "settings-outline") }}
      />
    </Tabs>
  );
}
