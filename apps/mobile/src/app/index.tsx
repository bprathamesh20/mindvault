import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { usePaginatedQuery, useMutation } from "convex/react";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../../../web/convex/_generated/api";
import { ItemCard, type Card } from "../components/item-card";
import { SignIn } from "../components/sign-in";
import { useConvexAuth } from "@convex-dev/auth/react";
import { useShareIntentContext } from "expo-share-intent";
import { CONVEX_URL } from "../lib/convex-url";

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
  const captureUrl = useMutation(api.items.captureUrl);
  const captureNote = useMutation(api.items.captureNote);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { results, status, loadMore, isLoading } = usePaginatedQuery(
    api.items.list,
    {},
    { initialNumItems: 20 },
  );

  // Share-sheet delivery (Android ACTION_SEND / iOS share extension)
  const { hasShareIntent, shareIntent, resetShareIntent } =
    useShareIntentContext();

  const flash = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2400);
  }, []);

  const capture = useCallback(
    async (raw: string) => {
      const v = raw.trim();
      if (!v) return;
      try {
        if (URL_RE.test(v)) {
          const res = await captureUrl({ url: v });
          flash(
            res.outcome === "duplicate"
              ? "Already in your mind"
              : res.outcome === "retrying"
                ? "Retrying…"
                : "Saved to your mind",
          );
        } else {
          await captureNote({ text: v });
          flash("Note saved");
        }
      } catch (err) {
        flash(err instanceof Error ? err.message : "Could not save that");
      }
    },
    [captureUrl, captureNote, flash],
  );

  // Handle shared content delivered by the share sheet
  useEffect(() => {
    if (!hasShareIntent) return;
    const target = (shareIntent.webUrl ?? shareIntent.text ?? "").trim();
    if (target.length > 0) {
      void capture(target);
      resetShareIntent();
    }
  }, [hasShareIntent, shareIntent, capture, resetShareIntent]);

  async function save() {
    const v = draft;
    setDraft("");
    setCaptureOpen(false);
    await capture(v);
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.wordmark}>MindVault</Text>

      {/* Persistent search bar — always on top */}
      <Pressable style={styles.searchBar} onPress={() => router.push("/search")}>
        <Text style={styles.searchIcon}>⌕</Text>
        <Text style={styles.searchPlaceholder}>Search your mind…</Text>
      </Pressable>

      {isLoading ? (
        <Center>
          <ActivityIndicator color="#a8a29e" />
        </Center>
      ) : (
        <FlatList
          data={results as Card[]}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ItemCard item={item} />}
          numColumns={2}
          key="grid"
          columnWrapperStyle={styles.column}
          contentContainerStyle={styles.list}
          onEndReached={() => {
            if (status === "CanLoadMore") loadMore(20);
          }}
          ListEmptyComponent={
            <Center>
              <Text style={styles.emptyTitle}>Your mind is empty.</Text>
              <Text style={styles.emptyBody}>
                Tap ＋ to save a link, or share one from any app.
              </Text>
            </Center>
          }
        />
      )}

      {toast ? <Text style={styles.toast}>{toast}</Text> : null}

      {/* Floating action button */}
      <Pressable
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        onPress={() => setCaptureOpen(true)}
      >
        <Text style={styles.fabText}>＋</Text>
      </Pressable>

      {/* Capture sheet */}
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
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setCaptureOpen(false)} />
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>New memory</Text>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Paste a link or jot a thought…"
              placeholderTextColor="#a8a29e"
              style={styles.sheetInput}
              multiline
              autoFocus
            />
            <Text style={styles.sheetHint}>
              Links get extracted & tagged automatically. Anything else is saved as a note.
            </Text>
            <View style={styles.sheetActions}>
              <Pressable style={styles.sheetCancel} onPress={() => setCaptureOpen(false)}>
                <Text style={styles.sheetCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.sheetSave, !draft.trim() && styles.buttonDisabled]}
                onPress={() => void save()}
                disabled={!draft.trim()}
              >
                <Text style={styles.sheetSaveText}>Save to my mind</Text>
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

function Center({ children }: { children: React.ReactNode }) {
  return <View style={styles.center}>{children}</View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fafaf9", paddingHorizontal: 14 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  wordmark: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1c1917",
    letterSpacing: -0.5,
    paddingTop: 6,
    paddingBottom: 12,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#e7e5e4",
    backgroundColor: "#fff",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 11,
    marginBottom: 10,
  },
  searchIcon: { fontSize: 16, color: "#a8a29e" },
  searchPlaceholder: { fontSize: 14, color: "#a8a29e" },
  list: { paddingTop: 4, paddingBottom: 96 },
  column: { gap: 10 },
  emptyTitle: { fontSize: 20, fontStyle: "italic", color: "#a8a29e" },
  emptyBody: { fontSize: 13, color: "#a8a29e", textAlign: "center", marginTop: 8 },
  muted: { color: "#a8a29e", fontStyle: "italic" },
  toast: {
    position: "absolute",
    bottom: 110,
    alignSelf: "center",
    backgroundColor: "#1c1917",
    color: "#fff",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 12,
    overflow: "hidden",
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 28,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#1c1917",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabPressed: { transform: [{ scale: 0.94 }], opacity: 0.9 },
  fabText: { color: "#fafaf9", fontSize: 30, marginTop: -2 },
  sheetBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(12,10,9,0.45)",
  },
  sheet: {
    backgroundColor: "#fafaf9",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 22,
    paddingBottom: 34,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1c1917",
    marginBottom: 14,
  },
  sheetInput: {
    borderWidth: 1,
    borderColor: "#e7e5e4",
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    minHeight: 90,
    textAlignVertical: "top",
  },
  sheetHint: { fontSize: 11, color: "#a8a29e", marginTop: 8 },
  sheetActions: { flexDirection: "row", gap: 10, marginTop: 16 },
  sheetCancel: {
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#e7e5e4",
  },
  sheetCancelText: { color: "#78716c", fontSize: 14 },
  sheetSave: {
    flex: 1,
    borderRadius: 999,
    backgroundColor: "#1c1917",
    paddingVertical: 12,
    alignItems: "center",
  },
  buttonDisabled: { opacity: 0.4 },
  sheetSaveText: { color: "#fafaf9", fontSize: 14, fontWeight: "600" },
});
