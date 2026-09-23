import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { api, type Id } from "../../lib/backend";
import { type Card, TYPE_FILTERS, typeLabel } from "../../lib/types";
import { CardFeed } from "../../components/card-feed";
import { Button, EmptyState, FilterChip, IconButton, LargeTitle } from "../../components/ui";
import { useActionSheet } from "../../components/action-sheet";
import { usePrompt } from "../../components/prompt";
import { useToast } from "../../components/toast";
import { setVaultFilter, useVaultFilter } from "../../lib/vault-filter";
import { fonts, type Palette, radius, useStyles, useTheme } from "../../lib/theme";

const PAGE = 24;
const COMPACT_AFTER = 44;

export default function VaultScreen() {
  const router = useRouter();
  const c = useTheme();
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const filter = useVaultFilter();
  const toast = useToast();
  const prompt = usePrompt();
  const showSheet = useActionSheet();

  const spaces = useQuery(api.spaces.list);
  const createSpace = useMutation(api.spaces.create);
  const removeSpace = useMutation(api.spaces.remove);

  const { results, status, loadMore, isLoading } = usePaginatedQuery(
    api.items.list,
    { type: filter.type, tag: filter.tag },
    { initialNumItems: PAGE },
  );
  const cards = results as Card[];

  // The large title scrolls away; a compact bar fades in to replace it.
  const [compact, setCompact] = useState(false);
  const barOpacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(barOpacity, { toValue: compact ? 1 : 0, duration: 160, useNativeDriver: true }).start();
  }, [compact, barOpacity]);
  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = e.nativeEvent.contentOffset.y > COMPACT_AFTER;
    setCompact((prev) => (prev === next ? prev : next));
  }, []);

  const filterActive = filter.type !== undefined || filter.tag !== undefined;
  const activeSpace = spaces?.find((s) => s.id === filter.spaceId);
  const subtitle = activeSpace
    ? activeSpace.name
    : [filter.type ? typeLabel(filter.type) : undefined, filter.tag ? `#${filter.tag}` : undefined]
        .filter(Boolean)
        .join(" · ") || undefined;

  const newMemory = () => router.push("/capture");

  function saveAsSpace() {
    prompt({
      title: "New space",
      message: `Save “${subtitle ?? "this view"}” so you can come back to it in one tap.`,
      placeholder: "Space name",
      confirmLabel: "Save",
      onSubmit: (name) => {
        void createSpace({ name, type: filter.type, tag: filter.tag })
          .then((id) => {
            setVaultFilter({ ...filter, spaceId: id });
            toast(`Space “${name}” saved`);
          })
          .catch((err: unknown) => toast(err instanceof Error ? err.message : "Couldn't save that Space", "error"));
      },
    });
  }

  function spaceMenu(space: { id: Id<"spaces">; name: string }) {
    showSheet({
      title: space.name,
      actions: [
        {
          label: "Delete Space",
          icon: "trash-outline",
          destructive: true,
          onPress: () => {
            void removeSpace({ id: space.id }).then(() => {
              if (filter.spaceId === space.id) setVaultFilter({});
              toast("Space deleted");
            });
          },
        },
      ],
    });
  }

  const header = (
    <View style={[styles.header, { paddingTop: insets.top }]}>
      <LargeTitle
        title="mindvault"
        subtitle={subtitle}
        accessory={<IconButton icon="add" label="New memory" variant="filled" size={26} onPress={newMemory} />}
      />

      <Pressable
        accessibilityRole="search"
        accessibilityLabel="Search your vault"
        onPress={() => router.navigate("/search")}
        style={({ pressed }) => [styles.searchPill, pressed && styles.pressed]}
      >
        <Ionicons name="search" size={17} color={c.placeholder} />
        <Text style={styles.searchPillText}>Search my vault…</Text>
      </Pressable>

      {spaces && spaces.length > 0 ? (
        <>
          <Text style={styles.rowLabel} accessibilityRole="header">
            Spaces
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {spaces.map((s) => (
              <Pressable
                key={s.id}
                accessibilityRole="button"
                accessibilityState={{ selected: filter.spaceId === s.id }}
                accessibilityHint="Shows this saved view. Long press to delete."
                onLongPress={() => spaceMenu(s)}
                onPress={() =>
                  filter.spaceId === s.id ? setVaultFilter({}) : setVaultFilter({ type: s.type, tag: s.tag, spaceId: s.id })
                }
                style={({ pressed }) => [
                  styles.spaceCard,
                  filter.spaceId === s.id && styles.spaceCardActive,
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons name="sparkles" size={14} color={filter.spaceId === s.id ? c.text : c.textMuted} />
                <Text style={[styles.spaceText, filter.spaceId === s.id && { color: c.text }]} numberOfLines={1}>
                  {s.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </>
      ) : null}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.chipRow, styles.filterRow]}
        accessibilityLabel="Filter by type"
      >
        {filter.tag ? (
          <FilterChip
            label={`#${filter.tag}`}
            selected
            onPress={() => {}}
            onRemove={() => setVaultFilter({ type: filter.type })}
            accessibilityHint="Removes the tag filter"
          />
        ) : null}
        {TYPE_FILTERS.map((f) => (
          <FilterChip
            key={f.label}
            label={f.label}
            selected={filter.type === f.value && !filter.spaceId}
            onPress={() => setVaultFilter({ type: f.value, tag: filter.tag })}
          />
        ))}
      </ScrollView>

      {filterActive && !filter.spaceId ? (
        <View style={styles.saveSpaceRow}>
          <FilterChip label="Save view as Space" icon="add" dashed onPress={saveAsSpace} />
        </View>
      ) : null}
    </View>
  );

  const empty = isLoading ? (
    <View style={styles.loading}>
      <ActivityIndicator color={c.textFaint} />
    </View>
  ) : filterActive ? (
    <EmptyState
      icon="funnel-outline"
      title="Nothing here yet."
      action={<Button title="Show everything" variant="tinted" onPress={() => setVaultFilter({})} />}
    />
  ) : (
    <EmptyState
      icon="sparkles-outline"
      title="Your vault is empty."
      body="Save a link, jot a note, or upload a document. You can also share straight into MindVault from any app."
      action={<Button title="New memory" icon="add" onPress={newMemory} />}
    />
  );

  const footer =
    status === "LoadingMore" ? (
      <View style={styles.loadingMore}>
        <ActivityIndicator color={c.textFaint} />
      </View>
    ) : null;

  return (
    <View style={styles.container}>
      <CardFeed
        data={cards}
        header={header}
        empty={empty}
        footer={footer}
        bottomInset={tabBarHeight}
        onScroll={onScroll}
        onEndReached={() => {
          if (status === "CanLoadMore") loadMore(PAGE);
        }}
      />

      <Animated.View
        pointerEvents={compact ? "auto" : "none"}
        style={[styles.compactBar, { paddingTop: insets.top, opacity: barOpacity }]}
        accessibilityElementsHidden={!compact}
        importantForAccessibility={compact ? "auto" : "no-hide-descendants"}
      >
        {Platform.OS === "ios" ? (
          <BlurView
            tint={c.scheme === "dark" ? "systemChromeMaterialDark" : "systemChromeMaterialLight"}
            intensity={100}
            style={StyleSheet.absoluteFill}
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: c.surface }]} />
        )}
        <View style={styles.compactInner}>
          <View style={styles.compactSide} />
          <Text style={styles.compactTitle} numberOfLines={1} accessibilityRole="header">
            {subtitle ?? "mindvault"}
          </Text>
          <View style={[styles.compactSide, styles.compactRight]}>
            <IconButton icon="add" label="New memory" size={26} onPress={newMemory} />
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    header: { marginHorizontal: -10, paddingBottom: 6 },
    pressed: { opacity: 0.6 },
    searchPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginHorizontal: 16,
      minHeight: 44,
      borderRadius: radius.full,
      paddingHorizontal: 14,
      backgroundColor: c.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
    },
    searchPillText: { fontFamily: fonts.serifItalic, fontSize: 19, color: c.placeholder },
    rowLabel: {
      fontSize: 13,
      fontWeight: "600",
      color: c.textMuted,
      textTransform: "uppercase",
      letterSpacing: 0.4,
      marginLeft: 20,
      marginTop: 20,
      marginBottom: 8,
    },
    chipRow: { paddingHorizontal: 16, gap: 8 },
    filterRow: { paddingTop: 16, paddingBottom: 6 },
    spaceCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      minHeight: 38,
      maxWidth: 220,
      paddingHorizontal: 14,
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: c.border,
    },
    spaceCardActive: { backgroundColor: c.elevated, borderColor: c.borderStrong },
    spaceText: { fontSize: 15, color: c.textMuted, flexShrink: 1 },
    saveSpaceRow: { flexDirection: "row", paddingHorizontal: 16, paddingTop: 6 },
    loading: { paddingVertical: 80, alignItems: "center" },
    loadingMore: { paddingVertical: 24, alignItems: "center" },
    compactBar: {
      position: "absolute",
      left: 0,
      right: 0,
      top: 0,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.separator,
      overflow: "hidden",
    },
    compactInner: { height: 44, flexDirection: "row", alignItems: "center", paddingHorizontal: 6 },
    compactSide: { width: 60 },
    compactRight: { alignItems: "flex-end" },
    compactTitle: { flex: 1, textAlign: "center", fontFamily: fonts.serifItalic, fontSize: 21, color: c.text },
  });
