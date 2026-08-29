import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Card } from "../lib/types";
import { colors, fonts, radius } from "../lib/theme";
import { timeAgo } from "../lib/format";

const THUMB_ASPECT: Partial<Record<Card["type"], number>> = {
  youtube: 16 / 9,
  instagram: 4 / 5,
  image: 1,
  article: 16 / 9,
  link: 16 / 9,
};

export function ItemCard({
  item,
  onPress,
}: {
  item: Card;
  onPress?: (id: string) => void;
}) {
  if (item.status === "pending") {
    return (
      <View style={[styles.card, styles.pending]}>
        <View style={styles.skeletonBar} />
        <View style={[styles.skeletonBar, styles.skeletonWide]} />
        <View style={[styles.skeletonBar, styles.skeletonShort]} />
        <Text style={styles.pendingText}>saving…</Text>
      </View>
    );
  }

  if (item.status === "failed") {
    return (
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
        onPress={() => onPress?.(item.id)}
        android_ripple={{ color: colors.surfaceAlt }}
      >
        <Ionicons name="cloud-offline-outline" size={18} color={colors.textFaint} />
        <Text style={styles.failedTitle}>Couldn&apos;t save this one.</Text>
        {item.url ? (
          <Text style={styles.failedUrl} numberOfLines={2}>
            {item.url}
          </Text>
        ) : null}
      </Pressable>
    );
  }

  const isSocial = item.type === "tweet" || item.type === "instagram";
  const isTweet = item.type === "tweet";
  const quote =
    isTweet && typeof item.embedJson === "object" && item.embedJson !== null
      ? (item.embedJson as { quote?: { name?: string; handle?: string; text?: string } })
          .quote
      : undefined;
  const thumbAspect = THUMB_ASPECT[item.type] ?? 16 / 9;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        item.type === "note" && styles.noteCard,
        pressed && styles.pressed,
      ]}
      onPress={() => onPress?.(item.id)}
      android_ripple={{
        color: item.type === "note" ? "#f3e8c8" : colors.surfaceAlt,
      }}
    >
      {isSocial && item.author ? (
        <View style={styles.authorRow}>
          <Ionicons
            name={item.type === "tweet" ? "logo-twitter" : "logo-instagram"}
            size={12}
            color={colors.textFaint}
          />
          <Text style={styles.author} numberOfLines={1}>
            {item.author}
          </Text>
        </View>
      ) : null}

      {item.thumbnailUrl ? (
        <View style={[styles.thumbWrap, !isSocial && styles.thumbBleed]}>
          <Image
            source={{ uri: item.thumbnailUrl }}
            style={[styles.thumbnail, { aspectRatio: thumbAspect }]}
            contentFit="cover"
            recyclingKey={item.id}
            transition={150}
          />
          {item.type === "youtube" ? (
            <View style={styles.playOverlay}>
              <View style={styles.playCircle}>
                <Ionicons name="play" size={16} color="#fff" style={styles.playIcon} />
              </View>
            </View>
          ) : null}
        </View>
      ) : null}

      {item.title && !isTweet ? (
        <Text style={styles.title} numberOfLines={3}>
          {item.title}
        </Text>
      ) : null}

      {isTweet && item.preview ? (
        <Text style={styles.tweetText} numberOfLines={8}>
          {item.preview}
        </Text>
      ) : null}

      {!isSocial && !isTweet && !item.thumbnailUrl && item.preview ? (
        <Text style={styles.preview} numberOfLines={4}>
          {item.preview}
        </Text>
      ) : null}

      {quote ? (
        <View style={styles.quote}>
          <Text style={styles.quoteAuthor} numberOfLines={1}>
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

      {item.summary && !isSocial && item.type !== "note" ? (
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

      <Text style={styles.meta} numberOfLines={1}>
        {[item.sourceDomain ?? (item.type === "note" ? "note" : item.type === "document" ? "document" : undefined), timeAgo(item.savedAt)]
          .filter(Boolean)
          .join("  ·  ")}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: 12,
    gap: 8,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
    overflow: "hidden",
  },
  noteCard: {
    backgroundColor: colors.noteBg,
    borderColor: colors.noteBorder,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.985 }],
  },
  pending: {
    gap: 10,
    paddingVertical: 18,
  },
  skeletonBar: {
    height: 10,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
    width: "40%",
  },
  skeletonWide: { width: "90%" },
  skeletonShort: { width: "65%" },
  pendingText: {
    color: colors.textFaint,
    fontSize: 11,
    fontStyle: "italic",
    textAlign: "center",
  },
  failedTitle: { color: colors.textMuted, fontSize: 13, marginTop: 4 },
  failedUrl: { color: colors.textFaint, fontSize: 11 },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  author: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textMuted,
    flexShrink: 1,
  },
  thumbWrap: {
    marginHorizontal: -12,
    marginBottom: 2,
    position: "relative",
  },
  thumbBleed: { marginTop: -12 },
  thumbnail: {
    width: "100%",
    backgroundColor: colors.surfaceAlt,
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  playCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(12,10,9,0.62)",
    alignItems: "center",
    justifyContent: "center",
  },
  playIcon: { marginLeft: 3 },
  title: {
    fontFamily: fonts.serif,
    fontSize: 15.5,
    fontWeight: "600",
    color: colors.text,
    lineHeight: 21,
  },
  tweetText: {
    fontSize: 14,
    color: colors.textBody,
    lineHeight: 20,
  },
  preview: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 19,
  },
  summary: {
    fontSize: 12.5,
    fontStyle: "italic",
    color: colors.textFaint,
    lineHeight: 17,
  },
  quote: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: 9,
    backgroundColor: colors.bg,
  },
  quoteAuthor: { fontSize: 11, fontWeight: "600", color: colors.textBody },
  quoteText: { fontSize: 12, color: colors.textMuted, marginTop: 4, lineHeight: 17 },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tag: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.full,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  tagText: { fontSize: 10.5, color: colors.textMuted, fontWeight: "500" },
  meta: { fontSize: 11, color: colors.textFaint, marginTop: 1 },
});
