import { type ReactElement, useCallback } from "react";
import { type NativeScrollEvent, type NativeSyntheticEvent, StyleSheet, View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useRouter } from "expo-router";
import type { Card } from "../lib/types";
import { setCardSeed } from "../lib/card-seed";
import { useItemActions } from "../lib/item-actions";
import { haptics } from "../lib/haptics";
import { ItemCard } from "./item-card";
import { useActionSheet } from "./action-sheet";

export function useOpenItem() {
  const router = useRouter();
  return useCallback(
    (item: Card) => {
      setCardSeed(item);
      router.push({ pathname: "/item/[id]", params: { id: item.id } });
    },
    [router],
  );
}

/** The long-press menu every card shares, wherever it appears. */
export function useCardMenu() {
  const showSheet = useActionSheet();
  const open = useOpenItem();
  const { share, copy, openUrl, confirmDelete } = useItemActions();
  return useCallback(
    (item: Card) => {
      haptics.medium();
      const url = item.url;
      showSheet({
        title: item.title ?? item.sourceDomain ?? undefined,
        actions: [
          { label: "Open", icon: "reader-outline", onPress: () => open(item) },
          ...(url
            ? [
                { label: "Open Original", icon: "globe-outline" as const, onPress: () => openUrl(url) },
                { label: "Share…", icon: "share-outline" as const, onPress: () => void share(item.title, url) },
                { label: "Copy Link", icon: "link-outline" as const, onPress: () => void copy(url) },
              ]
            : item.preview
              ? [{ label: "Copy Text", icon: "copy-outline" as const, onPress: () => void copy(item.preview ?? "", "Text") }]
              : []),
          { label: "Delete", icon: "trash-outline", destructive: true, onPress: () => confirmDelete(item.id) },
        ],
      });
    },
    [showSheet, open, share, copy, openUrl, confirmDelete],
  );
}

/** Two-column masonry of cards — used by the Vault and Search. */
export function CardFeed({
  data,
  header,
  empty,
  footer,
  bottomInset,
  onEndReached,
  onScroll,
}: {
  data: Card[];
  header?: ReactElement | null;
  empty?: ReactElement | null;
  footer?: ReactElement | null;
  bottomInset: number;
  onEndReached?: () => void;
  onScroll?: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
}) {
  const open = useOpenItem();
  const menu = useCardMenu();

  const renderItem = useCallback(
    ({ item }: { item: Card }) => (
      <View style={styles.cell}>
        <ItemCard item={item} onPress={open} onLongPress={menu} />
      </View>
    ),
    [open, menu],
  );

  return (
    <FlashList
      masonry
      numColumns={2}
      data={data}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      ListHeaderComponent={header}
      ListEmptyComponent={empty}
      ListFooterComponent={footer}
      contentContainerStyle={{ paddingHorizontal: 10, paddingBottom: bottomInset + 24 }}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      onScroll={onScroll}
      scrollEventThrottle={32}
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      contentInsetAdjustmentBehavior="never"
    />
  );
}

const styles = StyleSheet.create({
  cell: { paddingHorizontal: 5, paddingBottom: 18 },
});
