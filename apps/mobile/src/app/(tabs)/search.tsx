import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAction, useQuery } from "convex/react";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { api } from "../../lib/backend";
import { type Card, type ItemType, TYPE_FILTERS } from "../../lib/types";
import { CardFeed } from "../../components/card-feed";
import { EmptyState, FilterChip, LargeTitle, SearchField } from "../../components/ui";
import { pendingAskStore } from "../../lib/vault-filter";
import { rememberSearch, setPrefs, usePrefs } from "../../lib/prefs";
import { HIT, type Palette, radius, useStyles, useTheme } from "../../lib/theme";

export default function SearchScreen() {
  const router = useRouter();
  const c = useTheme();
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { recentSearches } = usePrefs();
  const searchAction = useAction(api.search.search);
  const inputRef = useRef<TextInput>(null);

  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<ItemType | undefined>(undefined);
  const [debounced, setDebounced] = useState("");
  const [hybrid, setHybrid] = useState<{ key: string; cards: Card[] } | null>(null);

  // Arriving on the tab puts the caret in the field, like Spotlight.
  useFocusEffect(
    useCallback(() => {
      const t = setTimeout(() => inputRef.current?.focus(), 350);
      return () => clearTimeout(t);
    }, []),
  );

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 200);
    return () => clearTimeout(t);
  }, [query]);

  const active = debounced.length >= 2;
  const key = `${scope ?? "all"}:${debounced}`;

  // Keyword hits are live and instant; semantic results replace them when
  // they land.
  const keywordHits = useQuery(api.search.keyword, active ? { q: debounced, type: scope } : "skip") as Card[] | undefined;

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    void searchAction({ q: debounced, type: scope })
      .then((r) => {
        if (!cancelled) setHybrid({ key, cards: r as Card[] });
      })
      .catch(() => {
        if (!cancelled) setHybrid({ key, cards: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [active, debounced, scope, key, searchAction]);

  const semantic = hybrid?.key === key ? hybrid.cards : null;
  const shown = useMemo(() => (active ? (semantic ?? keywordHits ?? []) : []), [active, semantic, keywordHits]);
  const searching = active && semantic === null;
  const pending = active && shown.length === 0 && searching;
  const none = active && shown.length === 0 && !searching;

  function run(term: string) {
    setQuery(term);
    rememberSearch(term);
  }

  function askAbout() {
    const q = query.trim();
    if (!q) return;
    rememberSearch(q);
    pendingAskStore.set(q);
    router.navigate("/ask");
  }

  const header = (
    <View style={[styles.header, { paddingTop: insets.top }]}>
      <LargeTitle title="search" />
      <View style={styles.fieldWrap}>
        <SearchField
          inputRef={inputRef}
          value={query}
          onChangeText={setQuery}
          placeholder="Search my vault…"
          onSubmitEditing={() => rememberSearch(query)}
          showCancel={query.length > 0}
          onCancel={() => {
            setQuery("");
            inputRef.current?.blur();
          }}
        />
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scopes}
        keyboardShouldPersistTaps="handled"
        accessibilityLabel="Search in"
      >
        {TYPE_FILTERS.map((f) => (
          <FilterChip key={f.label} label={f.label} selected={scope === f.value} onPress={() => setScope(f.value)} />
        ))}
      </ScrollView>

      {query.trim().length > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Ask your vault: ${query.trim()}`}
          onPress={askAbout}
          style={({ pressed }) => [styles.askRow, pressed && styles.pressed]}
        >
          <View style={styles.askIcon}>
            <Ionicons name="sparkles" size={16} color={c.onTint} />
          </View>
          <Text style={styles.askText} numberOfLines={1}>
            Ask “{query.trim()}”
          </Text>
          <Ionicons name="arrow-forward" size={18} color={c.tint} />
        </Pressable>
      ) : null}

      {active && shown.length > 0 ? (
        <View style={styles.countRow} accessibilityLiveRegion="polite">
          <Text style={styles.count}>
            {shown.length} {shown.length === 1 ? "memory" : "memories"} found
          </Text>
          {searching ? <ActivityIndicator size="small" color={c.textFaint} /> : null}
        </View>
      ) : null}
    </View>
  );

  const empty = pending ? (
    <View style={styles.loading}>
      <ActivityIndicator color={c.textFaint} />
    </View>
  ) : none ? (
    <EmptyState icon="search" title={`Nothing found for “${debounced}”.`} body="Try a broader phrase, or ask your vault instead." />
  ) : !active ? (
    recentSearches.length > 0 ? (
      <View style={styles.recents}>
        <View style={styles.recentsHeader}>
          <Text style={styles.recentsTitle} accessibilityRole="header">
            Recent
          </Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Clear recent searches" hitSlop={10} onPress={() => setPrefs({ recentSearches: [] })}>
            <Text style={styles.clear}>Clear</Text>
          </Pressable>
        </View>
        {recentSearches.map((term, i) => (
          <Pressable
            key={term}
            accessibilityRole="button"
            accessibilityHint="Searches again"
            onPress={() => run(term)}
            style={({ pressed }) => [styles.recentRow, i > 0 && styles.recentDivider, pressed && styles.pressed]}
          >
            <Ionicons name="time-outline" size={18} color={c.textFaint} />
            <Text style={styles.recentText} numberOfLines={1}>
              {term}
            </Text>
          </Pressable>
        ))}
      </View>
    ) : (
      <EmptyState
        icon="search"
        title="Search by meaning"
        body="Find things by what they’re about — titles, summaries, tags and your own notes all count."
      />
    )
  ) : null;

  return (
    <View style={styles.container}>
      <CardFeed data={shown} header={header} empty={empty} bottomInset={tabBarHeight} />
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    header: { marginHorizontal: -10, paddingBottom: 8 },
    fieldWrap: { paddingHorizontal: 16 },
    scopes: { paddingHorizontal: 16, gap: 8, paddingTop: 14, paddingBottom: 4 },
    pressed: { opacity: 0.6 },
    askRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginHorizontal: 16,
      marginTop: 12,
      minHeight: HIT + 8,
      paddingHorizontal: 12,
      borderRadius: radius.md,
      backgroundColor: c.tintSoft,
    },
    askIcon: { width: 30, height: 30, borderRadius: 8, backgroundColor: c.tint, alignItems: "center", justifyContent: "center" },
    askText: { flex: 1, fontSize: 17, fontWeight: "500", color: c.text },
    countRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 2 },
    count: { fontSize: 13, color: c.textFaint, letterSpacing: 0.3 },
    loading: { paddingVertical: 60, alignItems: "center" },
    recents: { marginTop: 16, marginHorizontal: 6, backgroundColor: c.surface, borderRadius: radius.md, overflow: "hidden" },
    recentsHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6 },
    recentsTitle: { fontSize: 12, fontWeight: "500", color: c.textFaint, textTransform: "uppercase", letterSpacing: 1.5 },
    clear: { fontSize: 15, color: c.textMuted },
    recentRow: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: HIT + 4, paddingHorizontal: 16 },
    recentDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.separator },
    recentText: { flex: 1, fontSize: 17, color: c.text },
  });
