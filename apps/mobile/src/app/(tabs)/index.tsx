import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, usePaginatedQuery } from "convex/react";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useConvexAuth } from "@convex-dev/auth/react";
import { useShareIntentContext } from "expo-share-intent";
import { api } from "../../lib/backend";
import type { Card } from "../../lib/types";
import { ItemCard } from "../../components/item-card";
import { SignIn } from "../../components/sign-in";
import { Toast } from "../../components/toast";
import { colors, fonts, radius } from "../../lib/theme";
import { CONVEX_URL } from "../../lib/convex-url";

const URL_RE = /^(https?:\/\/|www\.)\S+$/i;

export default function Home() {
  const { isLoading, isAuthenticated } = useConvexAuth();

  if (!CONVEX_URL) return <SetupNeeded />;
  if (isLoading)
    return (
      <Center>
        <Text style={styles.muted}>Opening your mind…</Text>
      </Center>
    );
  if (!isAuthenticated) return <SignIn />;
  return <HomeScreen />;
}

function HomeScreen() {
  const router = useRouter();
  const tabBarHeight = useBottomTabBarHeight();
  const captureUrl = useMutation(api.items.captureUrl);
  const captureNote = useMutation(api.items.captureNote);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { results, status, loadMore, isLoading } = usePaginatedQuery(
    api.items.list,
    {},
    { initialNumItems: 20 },
  );

  const { hasShareIntent, shareIntent, resetShareIntent } =
    useShareIntentContext();

  const flash = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2400);
  }, []);

  const capture = useCallback(
    async (raw: string, fromShare = false) => {
      const v = raw.trim();
      if (!v) return;
      setSaving(true);
      try {
        let message: string;
        if (URL_RE.test(v)) {
          const res = await captureUrl({ url: v });
          message =
            res.outcome === "duplicate"
              ? "Already in your mind ✓"
              : res.outcome === "retrying"
                ? "Retrying…"
                : "Saved to your mind";
        } else {
          await captureNote({ text: v });
          message = "Note saved";
        }
        flash(message);
        if (fromShare) {
          setTimeout(() => BackHandler.exitApp(), 900);
        }
      } catch (err) {
        flash(err instanceof Error ? err.message : "Could not save that");
      } finally {
        setSaving(false);
      }
    },
    [captureUrl, captureNote, flash],
  );

  const lastShared = useRef<string | null>(null);

  useEffect(() => {
    if (!hasShareIntent) return;
    const target = (shareIntent.webUrl ?? shareIntent.text ?? "").trim();
    if (target.length === 0) return;
    if (lastShared.current === target) return;
    lastShared.current = target;
    resetShareIntent();
    void capture(target, true);
  }, [hasShareIntent, shareIntent, capture, resetShareIntent]);

  async function save() {
    const v = draft;
    setDraft("");
    setCaptureOpen(false);
    await capture(v);
  }

  function surprise() {
    const ready = (results as Card[]).filter((r) => r.status === "ready");
    if (ready.length === 0) return;
    const pick = ready[Math.floor(Math.random() * ready.length)];
    router.push({ pathname: "/item/[id]", params: { id: pick.id } });
  }

  const openItem = useCallback(
    (id: string) => {
      router.push({ pathname: "/item/[id]", params: { id } });
    },
    [router],
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.wordmark}>MindVault</Text>
        <Pressable
          onPress={surprise}
          hitSlop={10}
          style={({ pressed }) => [styles.sparkButton, pressed && styles.pressed]}
        >
          <Ionicons name="sparkles-outline" size={21} color={colors.textMuted} />
        </Pressable>
      </View>

      <Pressable
        style={({ pressed }) => [styles.searchBar, pressed && styles.pressed]}
        onPress={() => router.push("/search")}
      >
        <Ionicons name="search" size={16} color={colors.textFaint} />
        <Text style={styles.searchPlaceholder}>Search your mind…</Text>
      </Pressable>

      {isLoading ? (
        <Center>
          <ActivityIndicator color={colors.textFaint} />
        </Center>
      ) : (
        <FlashList
          masonry
          numColumns={2}
          data={(results ?? []) as Card[]}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.cell}>
              <ItemCard item={item} onPress={openItem} />
            </View>
          )}
          contentContainerStyle={{
            paddingHorizontal: 10,
            paddingBottom: tabBarHeight + 72,
          }}
          onEndReached={() => {
            if (status === "CanLoadMore") loadMore(20);
          }}
          ListEmptyComponent={
            <Center style={styles.emptyWrap}>
              <Ionicons name="sparkles-outline" size={34} color={colors.borderStrong} />
              <Text style={styles.emptyTitle}>Your mind is empty.</Text>
              <Text style={styles.emptyBody}>
                Tap ＋ to save a link,{"\n"}or share one from any app.
              </Text>
            </Center>
          }
        />
      )}

      <Toast message={toast} />

      <Pressable
        style={({ pressed }) => [
          styles.fab,
          { bottom: tabBarHeight + 16 },
          pressed && styles.fabPressed,
        ]}
        onPress={() => setCaptureOpen(true)}
      >
        <Ionicons name="add" size={28} color={colors.inverseText} />
      </Pressable>

      <Modal
        visible={captureOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setCaptureOpen(false)}
      >
        <KeyboardAvoidingView
          style={styles.sheetBackdrop}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setCaptureOpen(false)}
          />
          <View style={[styles.sheet, { paddingBottom: 40 }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>New memory</Text>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Paste a link or jot a thought…"
              placeholderTextColor={colors.textFaint}
              style={styles.sheetInput}
              multiline
              autoFocus
            />
            <View style={styles.detectRow}>
              <Ionicons
                name={URL_RE.test(draft.trim()) ? "link" : "pencil"}
                size={13}
                color={colors.textFaint}
              />
              <Text style={styles.detectText}>
                {draft.trim()
                  ? URL_RE.test(draft.trim())
                    ? "Link — will be extracted & tagged automatically"
                    : "Will be saved as a note"
                  : "Links get extracted & tagged automatically"}
              </Text>
            </View>
            <View style={styles.sheetActions}>
              <Pressable
                style={styles.sheetCancel}
                onPress={() => setCaptureOpen(false)}
              >
                <Text style={styles.sheetCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.sheetSave,
                  (!draft.trim() || saving) && styles.buttonDisabled,
                ]}
                onPress={() => void save()}
                disabled={!draft.trim() || saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={colors.inverseText} />
                ) : (
                  <Text style={styles.sheetSaveText}>Save to my mind</Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function SetupNeeded() {
  return (
    <Center>
      <Text style={styles.wordmark}>MindVault</Text>
      <Text style={styles.emptyBody}>
        Set EXPO_PUBLIC_CONVEX_URL in apps/mobile/.env.local to your Convex
        deployment URL, then reload.
      </Text>
    </Center>
  );
}

function Center({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: object;
}) {
  return <View style={[styles.center, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 10,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: 14,
    paddingRight: 8,
    paddingTop: 6,
    paddingBottom: 12,
  },
  wordmark: {
    fontFamily: fonts.serif,
    fontSize: 26,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: -0.5,
  },
  sparkButton: { padding: 8, borderRadius: radius.full },
  pressed: { opacity: 0.6 },
  cell: { paddingHorizontal: 4, paddingBottom: 10 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    paddingHorizontal: 16,
    paddingVertical: 11,
    marginHorizontal: 14,
    marginBottom: 10,
  },
  searchPlaceholder: { fontSize: 14, color: colors.textFaint },
  emptyWrap: { marginTop: 80 },
  emptyTitle: {
    fontFamily: fonts.serif,
    fontSize: 22,
    fontStyle: "italic",
    color: colors.textFaint,
  },
  emptyBody: {
    fontSize: 13,
    color: colors.textFaint,
    textAlign: "center",
    lineHeight: 20,
  },
  muted: { color: colors.textFaint, fontStyle: "italic" },
  fab: {
    position: "absolute",
    right: 20,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.inverse,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabPressed: { transform: [{ scale: 0.94 }], opacity: 0.9 },
  sheetBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(12,10,9,0.45)",
  },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: 10,
    paddingHorizontal: 22,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 38,
    height: 4.5,
    borderRadius: 3,
    backgroundColor: colors.borderStrong,
    marginBottom: 16,
  },
  sheetTitle: {
    fontFamily: fonts.serif,
    fontSize: 19,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 14,
  },
  sheetInput: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    minHeight: 92,
    textAlignVertical: "top",
    lineHeight: 21,
  },
  detectRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
  },
  detectText: { fontSize: 11.5, color: colors.textFaint, flexShrink: 1 },
  sheetActions: { flexDirection: "row", gap: 10, marginTop: 18 },
  sheetCancel: {
    borderRadius: radius.full,
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: "center",
  },
  sheetCancelText: { color: colors.textMuted, fontSize: 14, fontWeight: "500" },
  sheetSave: {
    flex: 1,
    borderRadius: radius.full,
    backgroundColor: colors.inverse,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: { opacity: 0.4 },
  sheetSaveText: {
    color: colors.inverseText,
    fontSize: 14,
    fontWeight: "600",
  },
});
