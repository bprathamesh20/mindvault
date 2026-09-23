import { Alert, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import Constants from "expo-constants";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { useAuthActions } from "@convex-dev/auth/react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { api, type Id } from "../../lib/backend";
import { LargeTitle, Row, Section, Segmented } from "../../components/ui";
import { useActionSheet } from "../../components/action-sheet";
import { useToast } from "../../components/toast";
import { ASK_MODELS, modelName, setPrefs, type ThemePreference, usePrefs } from "../../lib/prefs";
import { setVaultFilter } from "../../lib/vault-filter";
import { type ItemType, typeLabel } from "../../lib/types";
import { CONVEX_URL } from "../../lib/convex-url";
import { type Palette, useStyles } from "../../lib/theme";
import { haptics } from "../../lib/haptics";

const THEMES: { label: string; value: ThemePreference }[] = [
  { label: "System", value: "system" },
  { label: "Light", value: "light" },
  { label: "Dark", value: "dark" },
];

export default function SettingsScreen() {
  const router = useRouter();
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const prefs = usePrefs();
  const { signOut } = useAuthActions();
  const showSheet = useActionSheet();
  const toast = useToast();
  const spaces = useQuery(api.spaces.list);
  const removeSpace = useMutation(api.spaces.remove);

  function pickModel() {
    showSheet({
      title: "Answer with",
      actions: ASK_MODELS.map((m) => ({
        label: m.name,
        selected: m.id === prefs.askModel,
        onPress: () => setPrefs({ askModel: m.id }),
      })),
    });
  }

  function spaceActions(space: { id: Id<"spaces">; name: string; type?: ItemType; tag?: string }) {
    showSheet({
      title: space.name,
      actions: [
        {
          label: "Open in Vault",
          icon: "albums-outline",
          onPress: () => {
            setVaultFilter({ type: space.type, tag: space.tag, spaceId: space.id });
            router.navigate("/");
          },
        },
        {
          label: "Delete Space",
          icon: "trash-outline",
          destructive: true,
          onPress: () => void removeSpace({ id: space.id }).then(() => toast("Space deleted")),
        },
      ],
    });
  }

  function lock() {
    haptics.warning();
    const run = () => void signOut();
    if (Platform.OS === "web") {
      if (globalThis.confirm?.("Lock your vault? You’ll need your passphrase to get back in.")) run();
      return;
    }
    Alert.alert("Lock your vault?", "You’ll need your passphrase to get back in.", [
      { text: "Cancel", style: "cancel" },
      { text: "Lock", style: "destructive", onPress: run },
    ]);
  }

  let backendHost = "Not configured";
  try {
    if (CONVEX_URL) backendHost = new URL(CONVEX_URL).host;
  } catch {
    backendHost = CONVEX_URL;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top, paddingBottom: tabBarHeight + 32 }}
      contentInsetAdjustmentBehavior="never"
    >
      <LargeTitle title="settings" />

      <Section header="Appearance" footer="System follows your device’s light and dark setting.">
        <View style={styles.segmentWrap}>
          <Segmented label="Appearance" options={THEMES} value={prefs.theme} onChange={(theme) => setPrefs({ theme })} />
        </View>
      </Section>

      <Section header="Ask" footer="The model that writes answers from your saved memories.">
        <Row first icon="sparkles-outline" title="Answer model" value={modelName(prefs.askModel)} chevron onPress={pickModel} />
      </Section>

      <Section
        header="Spaces"
        footer={
          spaces && spaces.length > 0
            ? "Spaces are saved views of your vault. Create one from any filter on the Vault tab."
            : "No Spaces yet. Filter the Vault by type or tag, then tap “Save as Space”."
        }
      >
        {spaces && spaces.length > 0 ? (
          spaces.map((s, i) => (
            <Row
              key={s.id}
              first={i === 0}
              icon="sparkles-outline"
              title={s.name}
              value={[s.type ? typeLabel(s.type) : undefined, s.tag ? `#${s.tag}` : undefined].filter(Boolean).join(" · ")}
              chevron
              onPress={() => spaceActions(s)}
            />
          ))
        ) : (
          <Row first icon="sparkles-outline" title="No spaces yet" />
        )}
      </Section>

      <Section header="Saving" footer="Use the Share button in Safari, X, Instagram, YouTube or any app and choose MindVault. It saves in the background.">
        <Row first icon="share-outline" title="Save from other apps" />
        <Row icon="add" title="New memory" chevron onPress={() => router.push("/capture")} />
      </Section>

      <Section header="About">
        <Row first title="Version" value={Constants.expoConfig?.version ?? "1.0.0"} />
        <Row title="Server" value={backendHost} />
      </Section>

      <Section>
        <Row first title="Lock my vault — sign out" destructive onPress={lock} accessibilityHint="Signs out. You’ll need your passphrase again." />
      </Section>

      <Text style={styles.colophon}>MindVault · Remember everything. Organize nothing.</Text>
    </ScrollView>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    segmentWrap: { padding: 12 },
    colophon: { fontSize: 13, color: c.textFaint, textAlign: "center", marginTop: 28 },
  });
