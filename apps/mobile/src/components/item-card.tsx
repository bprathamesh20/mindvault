import { Image } from "expo-image";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useMutation } from "convex/react";
import { api } from "../../../web/convex/_generated/api";
import type { Id } from "../../../web/convex/_generated/dataModel";
import { resolveFileUrl } from "../lib/convex-url";

export type Card = {
  id: string;
  type: "article" | "tweet" | "instagram" | "image" | "note" | "link";
  url?: string;
  title?: string;
  author?: string;
  sourceDomain?: string;
  preview?: string;
  summary?: string;
  tags: string[];
  status: "pending" | "ready" | "failed";
  savedAt: number;
  thumbnailUrl?: string;
  embedJson?: unknown;
};

export function ItemCard({ item }: { item: Card }) {
  const removeItem = useMutation(api.items.removeItem);

  if (item.status === "pending") {
    return (
      <View style={[styles.card, styles.pending]}>
        <ActivityIndicator size="small" color="#a8a29e" />
        <Text style={styles.pendingText}>saving…</Text>
      </View>
    );
  }

  if (item.status === "failed") {
    return (
      <View style={styles.card}>
        <Text style={styles.failedText}>Couldn&apos;t save this one.</Text>
        {item.url ? (
          <Text style={styles.domain} numberOfLines={1}>
            {item.url}
          </Text>
        ) : null}
      </View>
    );
  }

  const isSocial = item.type === "tweet" || item.type === "instagram";
  const quote = isTweetCard(item) ? item.embedJson?.quote : undefined;

  return (
    <View style={[styles.card, item.type === "note" && styles.noteCard]}>
      {isSocial && item.author ? (
        <Text style={styles.author} numberOfLines={1}>
          {item.author}
        </Text>
      ) : null}
      {item.thumbnailUrl ? (
        <Image
          source={{ uri: resolveFileUrl(item.thumbnailUrl) }}
          style={styles.thumbnail}
          contentFit="cover"
          recyclingKey={item.id}
        />
      ) : null}
      {item.title && item.type !== "tweet" ? (
        <Text style={styles.title} numberOfLines={3}>
          {item.title}
        </Text>
      ) : null}
      {item.type === "tweet" && item.preview ? (
        <Text style={styles.tweetText}>{item.preview}</Text>
      ) : null}
      {quote ? (
        <View style={styles.quote}>
          <Text style={styles.quoteAuthor}>
            {quote.name ?? quote.handle}
            {quote.handle ? ` @${quote.handle}` : ""}
          </Text>
          {quote.text ? (
            <Text style={styles.quoteText} numberOfLines={4}>
              {quote.text}
            </Text>
          ) : null}
        </View>
      ) : null}
      {item.summary && !isSocial ? (
        <Text style={styles.summary} numberOfLines={2}>
          {item.summary}
        </Text>
      ) : null}
      {item.tags.length > 0 ? (
        <View style={styles.tagRow}>
          {item.tags.slice(0, 3).map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>#{tag}</Text>
            </View>
          ))}
        </View>
      ) : null}
      <Text style={styles.meta}>
        {[item.sourceDomain, timeAgo(item.savedAt)].filter(Boolean).join(" · ")}
      </Text>
      <Pressable
        style={styles.remove}
        onPress={() => void removeItem({ id: item.id as Id<"items"> })}
        hitSlop={12}
      >
        <Text style={styles.removeText}>✕</Text>
      </Pressable>
    </View>
  );
}

function isTweetCard(
  item: Card,
): item is Card & {
  embedJson: { quote?: { name?: string; handle?: string; text?: string } };
} {
  return item.type === "tweet" && typeof item.embedJson === "object";
}

function timeAgo(savedAt: number): string {
  const seconds = Math.floor((Date.now() - savedAt) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(savedAt).toLocaleDateString();
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e7e5e4",
    padding: 12,
    marginBottom: 12,
    gap: 8,
    flex: 1,
  },
  noteCard: { backgroundColor: "#fffbeb", borderColor: "#fde68a" },
  pending: { alignItems: "center", paddingVertical: 28 },
  pendingText: { color: "#a8a29e", fontSize: 12, marginTop: 8 },
  failedText: { color: "#78716c", fontSize: 13 },
  thumbnail: {
    width: "100%",
    height: 130,
    borderRadius: 10,
    backgroundColor: "#f5f5f4",
  },
  author: { fontSize: 13, fontWeight: "600", color: "#1c1917" },
  title: { fontSize: 15, fontWeight: "600", color: "#1c1917" },
  tweetText: { fontSize: 14, color: "#292524", lineHeight: 20 },
  summary: { fontSize: 12, fontStyle: "italic", color: "#78716c" },
  quote: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e7e5e4",
    borderRadius: 8,
    padding: 8,
  },
  quoteAuthor: { fontSize: 11, fontWeight: "600", color: "#44403c" },
  quoteText: { fontSize: 12, color: "#57534e", marginTop: 4 },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tag: {
    backgroundColor: "#f5f5f4",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  tagText: { fontSize: 10, color: "#78716c" },
  meta: { fontSize: 11, color: "#a8a29e" },
  domain: { fontSize: 11, color: "#a8a29e" },
  remove: { position: "absolute", top: 8, right: 10 },
  removeText: { color: "#d6d3d1", fontSize: 13 },
});
