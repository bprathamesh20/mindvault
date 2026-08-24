import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { Ionicons } from "@expo/vector-icons";
import { useAction } from "convex/react";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useConvexAuth } from "@convex-dev/auth/react";
import { api } from "../../lib/backend";
import type { Card } from "../../lib/types";
import { ItemCard } from "../../components/item-card";
import { SignIn } from "../../components/sign-in";
import { colors, fonts, radius } from "../../lib/theme";
import { CONVEX_URL } from "../../lib/convex-url";

export default function SearchScreen() {
  const { isLoading, isAuthenticated } = useConvexAuth();

  if (!CONVEX_URL)
    return (
      <Center>
        <Text style={styles.muted}>Set EXPO_PUBLIC_CONVEX_URL first.</Text>
      </Center>
    );
  if (isLoading)
    return (
      <Center>
        <Text style={styles.muted}>Opening your mind…</Text>
      </Center>
    );
  if (!isAuthenticated) return <SignIn />;
  return <SearchScreenBody />;
}

function SearchScreenBody() {
  const router = useRouter();
  const tabBarHeight = useBottomTabBarHeight();
  const searchAction = useAction(api.search.search);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Card[]>([]);
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setBusy(true);
    const t = setTimeout(async () => {
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

  const openItem = useCallback(
    (id: string) => {
      router.push({ pathname: "/item/[id]", params: { id } });
    },
    [router],
  );

  const showEmpty = touched && query.trim().length > 0 && !busy && results.length === 0;

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.wordmark}>Search</Text>
      <View style={styles.inputWrap}>
        <Ionicons name="search" size={17} color={colors.textFaint} />
        <TextInput
          value={query}
          onChangeText={(v) => {
            setTouched(true);
            setQuery(v);
          }}
          placeholder="Search your mind…"
          placeholderTextColor={colors.textFaint}
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {query.length > 0 ? (
          <Pressable onPress={() => setQuery("")} hitSlop={8}>
            <Ionicons name="close-circle" size={17} color={colors.borderStrong} />
          </Pressable>
        ) : null}
      </View>

      {busy && query.trim() ? (
        <View style={styles.busyRow}>
          <ActivityIndicator size="small" color={colors.textFaint} />
        </View>
      ) : results.length > 0 ? (
        <Text style={styles.count}>
          {results.length} {results.length === 1 ? "memory" : "memories"} found
        </Text>
      ) : null}

      <FlashList
        masonry
        numColumns={2}
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.cell}>
            <ItemCard item={item} onPress={openItem} />
          </View>
        )}
        contentContainerStyle={{
          paddingHorizontal: 10,
          paddingBottom: tabBarHeight + 24,
        }}
        ListEmptyComponent={
          showEmpty ? (
            <Center style={styles.emptyWrap}>
              <Ionicons name="search-outline" size={34} color={colors.borderStrong} />
              <Text style={styles.emptyTitle}>Nothing found.</Text>
              <Text style={styles.emptyBody}>Try a different word or phrase.</Text>
            </Center>
          ) : !touched ? (
            <Center style={styles.emptyWrap}>
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={34}
                color={colors.borderStrong}
              />
              <Text style={styles.emptyTitle}>Ask your mind anything.</Text>
              <Text style={styles.emptyBody}>
                Titles, tags, summaries and{"\n"}your own notes are all searchable.
              </Text>
            </Center>
          ) : null
        }
      />
    </SafeAreaView>
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
  wordmark: {
    fontFamily: fonts.serif,
    fontSize: 26,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: -0.5,
    paddingLeft: 14,
    paddingTop: 6,
    paddingBottom: 12,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    paddingHorizontal: 16,
    marginHorizontal: 14,
    marginBottom: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
  },
  busyRow: {
    flexDirection: "row",
    justifyContent: "center",
    paddingVertical: 8,
  },
  count: {
    fontSize: 11.5,
    color: colors.textFaint,
    textAlign: "center",
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  emptyWrap: { marginTop: 70 },
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
  cell: { paddingHorizontal: 4, paddingBottom: 10 },
});
