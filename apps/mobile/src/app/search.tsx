import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, View } from "react-native";
import { useAction } from "convex/react";
import { useConvexAuth } from "@convex-dev/auth/react";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../../../web/convex/_generated/api";
import { ItemCard, type Card } from "../components/item-card";
import { SignIn } from "../components/sign-in";
import { CONVEX_URL } from "../lib/convex-url";

export default function SearchScreen() {
  const { isLoading, isAuthenticated } = useConvexAuth();

  if (!CONVEX_URL) return <Center><Text style={styles.muted}>Set EXPO_PUBLIC_CONVEX_URL first.</Text></Center>;
  if (isLoading) return <Center><Text style={styles.muted}>Opening your mind…</Text></Center>;
  if (!isAuthenticated) return <SignIn />;
  return <SearchScreenBody />;
}

function SearchScreenBody() {
  const searchAction = useAction(api.search.search);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Card[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      setBusy(true);
      try {
        const r = await searchAction({ q });
        if (!cancelled) setResults(r as Card[]);
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setBusy(false);
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, searchAction]);

  return (
    <SafeAreaView style={styles.container}>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search your mind…"
        placeholderTextColor="#a8a29e"
        style={styles.input}
        autoFocus
        autoCapitalize="none"
      />
      {busy ? (
        <Center>
          <ActivityIndicator color="#a8a29e" />
        </Center>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ItemCard item={item} />}
          numColumns={2}
          key="grid"
          columnWrapperStyle={styles.column}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            query.trim() ? (
              <Center>
                <Text style={styles.emptyTitle}>Nothing found.</Text>
              </Center>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <View style={styles.center}>{children}</View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fafaf9", paddingHorizontal: 14 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  input: {
    borderWidth: 1,
    borderColor: "#e7e5e4",
    backgroundColor: "#fff",
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 12,
    fontSize: 14,
    marginTop: 6,
  },
  list: { paddingTop: 12, paddingBottom: 40 },
  column: { gap: 10 },
  emptyTitle: { fontSize: 20, fontStyle: "italic", color: "#a8a29e" },
  muted: { color: "#a8a29e", fontStyle: "italic" },
});
