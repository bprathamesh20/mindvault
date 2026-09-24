import { memo, type ComponentProps, type ReactNode } from "react";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import type { Card } from "../lib/types";
import { fonts, type Palette, radius, useStyles, useTheme } from "../lib/theme";
import { timeAgo, domainOf, formatPrice, priceLabel, productInfo, type ProductInfo } from "../lib/format";

/**
 * Pinterest-style cards: the picture does the talking. Each card is a
 * rounded tile (thumbnail, or a designed stand-in when there isn't one)
 * with a small type tag on it, and at most a two-line heading below.
 */

type IconName = ComponentProps<typeof Ionicons>["name"];
type BadgeSpec = {
  label: string;
  icon: IconName;
  bg: string;
  fg?: string;
  gradient?: readonly [string, string, ...string[]];
};

const ARTICLE: BadgeSpec = { label: "Article", icon: "newspaper", bg: "#6366f1" };
const YOUTUBE: BadgeSpec = { label: "YouTube", icon: "logo-youtube", bg: "#ff0033" };
const IMAGE: BadgeSpec = { label: "Image", icon: "image", bg: "#10b981" };
const NOTE: BadgeSpec = { label: "Note", icon: "document-text", bg: "#8b5cf6" };
const LINK: BadgeSpec = { label: "Link", icon: "link", bg: "#0ea5e9" };
const PRODUCT: BadgeSpec = { label: "Product", icon: "pricetag", bg: "#059669" };
const TWEET: BadgeSpec = { label: "Post", icon: "logo-x", bg: "#000000" };
const GITHUB: BadgeSpec = { label: "GitHub", icon: "logo-github", bg: "#24292f" };
const PENDING: BadgeSpec = { label: "Saving…", icon: "sync-outline", bg: "rgba(120,113,108,0.35)" };
const FAILED: BadgeSpec = { label: "Couldn't save", icon: "warning", bg: "#f59e0b" };
const IG_GRADIENT = ["#f9ce34", "#ee2a7b", "#6228d7"] as const;

function specFor(item: Card): BadgeSpec {
  if (item.status === "pending") return PENDING;
  if (item.status === "failed") return FAILED;
  switch (item.type) {
    case "instagram":
      return {
        label: embedString(item.embedJson, "kind") === "reel" ? "Reel" : "Post",
        icon: "logo-instagram",
        bg: "#ee2a7b",
        gradient: IG_GRADIENT,
      };
    case "youtube":
      return { ...YOUTUBE, label: embedString(item.embedJson, "kind") === "short" ? "Short" : "YouTube" };
    case "document": {
      const format = (embedString(item.embedJson, "format") ?? item.sourceDomain ?? "file").toLowerCase();
      if (format === "pdf") return { label: "PDF", icon: "document-text", bg: "#ef4444" };
      if (format === "xlsx" || format === "csv") return { label: format.toUpperCase(), icon: "grid-outline", bg: "#059669" };
      if (format === "pptx") return { label: "Slides", icon: "easel-outline", bg: "#f97316" };
      return { label: format.toUpperCase(), icon: "document-text", bg: "#3b82f6" };
    }
    case "tweet":
      return TWEET;
    case "note":
      return NOTE;
    case "image":
      return IMAGE;
    case "link":
      return LINK;
    case "github":
      return GITHUB;
    case "product":
      return PRODUCT;
    default:
      return ARTICLE;
  }
}

const COVER_TONE: Record<string, readonly [string, string, string]> = {
  pdf: ["#3b2f7a", "#1f1a3f", "#0e0d1c"],
  docx: ["#1e3a8a", "#172554", "#0b1024"],
  xlsx: ["#065f46", "#064e3b", "#0a1f1a"],
  csv: ["#065f46", "#064e3b", "#0a1f1a"],
  pptx: ["#9a3412", "#5a1d0a", "#1f0d06"],
};
const COVER_DEFAULT = ["#334155", "#1e293b", "#0b1220"] as const;

const HUES: readonly (readonly [string, string])[] = [
  ["#8b5cf6", "#d946ef"],
  ["#0ea5e9", "#6366f1"],
  ["#10b981", "#14b8a6"],
  ["#f59e0b", "#f97316"],
  ["#f43f5e", "#ec4899"],
  ["#06b6d4", "#3b82f6"],
];

function hueFor(seed: string) {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return HUES[h % HUES.length];
}

/* ------------------------------------------------------------------ */
/* Pieces                                                              */
/* ------------------------------------------------------------------ */

function Tag({ spec, onDark }: { spec: BadgeSpec; onDark?: boolean }) {
  const styles = useStyles(makeStyles);
  const chip = spec.gradient ? (
    <LinearGradient colors={spec.gradient} start={{ x: 0, y: 1 }} end={{ x: 1, y: 0 }} style={styles.tagChip}>
      <Ionicons name={spec.icon} size={11} color="#fff" />
    </LinearGradient>
  ) : (
    <View style={[styles.tagChip, { backgroundColor: spec.bg }]}>
      <Ionicons name={spec.icon} size={11} color={spec.fg ?? "#fff"} />
    </View>
  );
  return (
    <View style={[styles.tag, onDark === false && styles.tagOnLight]}>
      {chip}
      <Text style={[styles.tagText, onDark === false && styles.tagTextOnLight]} numberOfLines={1}>
        {spec.label}
      </Text>
    </View>
  );
}

function Avatar({ seed, size = 22 }: { seed: string; size?: number }) {
  const styles = useStyles(makeStyles);
  return (
    <LinearGradient
      colors={hueFor(seed)}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}
    >
      <Text style={[styles.avatarText, { fontSize: Math.round(size * 0.46) }]}>{(seed.slice(0, 1) || "?").toUpperCase()}</Text>
    </LinearGradient>
  );
}

/** Portrait-leaning, like Pinterest — but never a sliver or a banner. */
function imageAspect(item: Card): number {
  if (item.thumbWidth && item.thumbHeight) {
    return Math.max(0.66, Math.min(item.thumbWidth / item.thumbHeight, 1.5));
  }
  if (item.type === "youtube") return embedString(item.embedJson, "kind") === "short" ? 9 / 16 : 16 / 9;
  if (item.type === "instagram") return 4 / 5;
  return 1;
}

/* ------------------------------------------------------------------ */
/* Tiles                                                               */
/* ------------------------------------------------------------------ */

function ImageTile({ item, spec, price }: { item: Card; spec: BadgeSpec; price?: ProductInfo }) {
  const styles = useStyles(makeStyles);
  const video =
    item.type === "youtube" ||
    (item.type === "instagram" && embedString(item.embedJson, "kind") === "reel") ||
    (item.type === "tweet" && ["video", "gif"].includes(embedString(item.embedJson, "mediaType") ?? ""));
  return (
    <View style={styles.tile}>
      <Image
        source={{ uri: item.thumbnailUrl }}
        style={[styles.image, { aspectRatio: imageAspect(item) }]}
        contentFit="cover"
        recyclingKey={item.id}
        cachePolicy="memory-disk"
        transition={120}
      />
      {/* A soft floor so the tag reads on bright photos. */}
      <LinearGradient pointerEvents="none" colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.32)"]} style={styles.floor} />
      {video ? (
        <View pointerEvents="none" style={styles.center}>
          <View style={styles.play}>
            <Ionicons name="play" size={16} color="#fff" style={styles.playIcon} />
          </View>
        </View>
      ) : null}
      {price ? (
        <View style={styles.price}>
          {price.compareAtPrice !== undefined && price.price !== undefined && price.compareAtPrice > price.price ? (
            <Text style={styles.priceWas}>{formatPrice(price.compareAtPrice, price.currency)}</Text>
          ) : null}
          <Text style={styles.priceText}>{priceLabel(price)}</Text>
        </View>
      ) : null}
      <View style={styles.tagSlot}>
        <Tag spec={spec} />
      </View>
    </View>
  );
}

const BULLET_RE = /^([-*•]|\d+[.)])\s+/;

function NoteTile({ item, spec }: { item: Card; spec: BadgeSpec }) {
  const styles = useStyles(makeStyles);
  const c = useTheme();
  const body = (item.preview ?? "")
    .split(/\r?\n/)
    .map((l) => l.trim().replace(BULLET_RE, "• "))
    .filter(Boolean)
    .join("\n");
  return (
    <LinearGradient colors={c.noteGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.tile, styles.textTile, styles.noteTile]}>
      <Tag spec={spec} onDark={false} />
      <Text style={styles.noteText} numberOfLines={7}>
        {body || item.title || "Empty note"}
      </Text>
    </LinearGradient>
  );
}

function TweetTile({ item, spec }: { item: Card; spec: BadgeSpec }) {
  const styles = useStyles(makeStyles);
  const handle = (embedString(item.embedJson, "handle") ?? item.author ?? "").replace(/^@/, "");
  return (
    <View style={[styles.tile, styles.textTile, styles.plainTile]}>
      <View style={styles.tweetHead}>
        <Avatar seed={handle || "x"} />
        <Text style={styles.handle} numberOfLines={1}>
          @{handle || "post"}
        </Text>
        <Ionicons name="logo-x" size={12} color={styles.handle.color} />
      </View>
      <Text style={styles.tweetText} numberOfLines={7}>
        {item.preview ?? item.title}
      </Text>
    </View>
  );
}

/** Articles, links and products that came without a picture. */
function CoverTile({ item, spec, price }: { item: Card; spec: BadgeSpec; price?: ProductInfo }) {
  const styles = useStyles(makeStyles);
  const domain = item.sourceDomain ?? (item.url ? domainOf(item.url) : spec.label);
  return (
    <LinearGradient colors={hueFor(domain)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.tile, styles.coverTile]}>
      <Text style={styles.coverLetter}>{domain.slice(0, 1).toUpperCase()}</Text>
      <Text style={styles.coverDomain} numberOfLines={1}>
        {price ? priceLabel(price) : domain}
      </Text>
      <View style={styles.tagSlot}>
        <Tag spec={spec} />
      </View>
    </LinearGradient>
  );
}

function DocumentTile({ item, spec }: { item: Card; spec: BadgeSpec }) {
  const styles = useStyles(makeStyles);
  const format = (embedString(item.embedJson, "format") ?? item.sourceDomain ?? "").toLowerCase();
  const tone = COVER_TONE[format] ?? COVER_DEFAULT;
  const { heading } = coverText(item);
  return (
    <View style={[styles.tile, styles.docTile]}>
      <View style={styles.docStack}>
        <View style={[styles.docSheet, styles.docSheetBack]} />
        <View style={[styles.docSheet, styles.docSheetMid]} />
        <View style={styles.docTop}>
          {item.thumbnailUrl ? (
            <Image
              source={{ uri: item.thumbnailUrl }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              contentPosition="top"
              recyclingKey={item.id}
              cachePolicy="memory-disk"
            />
          ) : (
            <LinearGradient colors={tone} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.docCover}>
              <Text style={styles.docHeading} numberOfLines={4}>
                {heading}
              </Text>
            </LinearGradient>
          )}
        </View>
      </View>
      <View style={styles.tagSlot}>
        <Tag spec={spec} />
      </View>
    </View>
  );
}

function GitHubTile({ item, spec }: { item: Card; spec: BadgeSpec }) {
  const styles = useStyles(makeStyles);
  const e = item.embedJson;
  const owner = embedString(e, "owner") ?? item.author?.replace(/^@/, "") ?? "";
  const repo = embedString(e, "repo");
  const stars = embedNumber(e, "stars");
  const language = embedString(e, "language");
  return (
    <View style={[styles.tile, styles.textTile, styles.githubTile]}>
      <View style={styles.tweetHead}>
        {item.thumbnailUrl ? (
          <Image source={{ uri: item.thumbnailUrl }} style={styles.ghAvatar} contentFit="cover" recyclingKey={item.id} />
        ) : (
          <Avatar seed={owner || "gh"} />
        )}
        <Text style={styles.ghOwner} numberOfLines={1}>
          {owner}
        </Text>
      </View>
      <Text style={styles.ghRepo} numberOfLines={2}>
        {repo ?? item.title ?? "GitHub"}
      </Text>
      <View style={styles.ghMeta}>
        {stars !== undefined ? (
          <View style={styles.ghMetaItem}>
            <Ionicons name="star" size={12} color="rgba(255,255,255,0.7)" />
            <Text style={styles.ghMetaText}>{compact(stars)}</Text>
          </View>
        ) : null}
        {language ? <Text style={styles.ghMetaText}>{language}</Text> : null}
        <View style={styles.flex} />
        <Ionicons name={spec.icon} size={16} color="rgba(255,255,255,0.8)" />
      </View>
    </View>
  );
}

function PendingTile({ item, spec }: { item: Card; spec: BadgeSpec }) {
  const styles = useStyles(makeStyles);
  const c = useTheme();
  return (
    <View style={[styles.tile, styles.statusTile]}>
      <Ionicons name={item.status === "failed" ? "cloud-offline-outline" : "hourglass-outline"} size={26} color={c.textFaint} />
      <Text style={styles.statusText} numberOfLines={1}>
        {item.url ? domainOf(item.url) : "Memory"}
      </Text>
      <View style={styles.tagSlot}>
        <Tag spec={spec} />
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* The card                                                            */
/* ------------------------------------------------------------------ */

export const ItemCard = memo(function ItemCard({
  item,
  onPress,
  onLongPress,
}: {
  item: Card;
  onPress?: (item: Card) => void;
  onLongPress?: (item: Card) => void;
}) {
  const styles = useStyles(makeStyles);
  const spec = specFor(item);
  const price = item.type === "product" ? productInfo(item.embedJson) : undefined;

  let tile: ReactNode;
  // Text-led tiles already show their words; a heading below would repeat.
  let showHeading = true;
  if (item.status !== "ready") {
    tile = <PendingTile item={item} spec={spec} />;
  } else if (item.type === "note") {
    tile = <NoteTile item={item} spec={spec} />;
    showHeading = !!item.title && !(item.preview ?? "").startsWith(item.title);
  } else if (item.type === "document") {
    tile = <DocumentTile item={item} spec={spec} />;
    // Without a rendered page the cover already carries the title.
    showHeading = !!item.thumbnailUrl;
  } else if (item.type === "github") {
    tile = <GitHubTile item={item} spec={spec} />;
    showHeading = false;
  } else if (item.thumbnailUrl) {
    tile = <ImageTile item={item} spec={spec} price={price} />;
    showHeading = item.type !== "tweet" || !!item.preview;
  } else if (item.type === "tweet") {
    tile = <TweetTile item={item} spec={spec} />;
    showHeading = false;
  } else {
    tile = <CoverTile item={item} spec={spec} price={price} />;
  }

  const heading =
    item.type === "tweet"
      ? (item.preview ?? item.title)
      : item.type === "document"
        ? (item.title ?? embedString(item.embedJson, "filename")?.replace(/\.[a-z0-9]+$/i, ""))
        : (item.title ?? item.preview ?? (item.url ? domainOf(item.url) : undefined));

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={() => onPress?.(item)}
      onLongPress={onLongPress ? () => onLongPress(item) : undefined}
      delayLongPress={320}
      accessibilityRole="button"
      accessibilityLabel={cardLabel(item)}
      accessibilityHint={onLongPress ? "Opens the memory. Long press for more actions." : "Opens the memory."}
      accessibilityActions={onLongPress ? [{ name: "longpress", label: "More actions" }] : undefined}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === "longpress") onLongPress?.(item);
      }}
    >
      {/* One spoken label for the whole card; the rest is decoration. */}
      <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        {tile}
        {showHeading && heading ? (
          <Text style={styles.heading} numberOfLines={2}>
            {heading}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
});

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const TYPE_NAMES: Record<Card["type"], string> = {
  article: "Article",
  tweet: "Post on X",
  instagram: "Instagram post",
  youtube: "YouTube video",
  image: "Image",
  note: "Note",
  link: "Link",
  document: "Document",
  github: "GitHub",
  product: "Product",
};

/** What VoiceOver reads for a card: kind, title, source, price, age. */
function cardLabel(item: Card): string {
  if (item.status === "pending") return `Saving ${item.url ? domainOf(item.url) : "memory"}`;
  const title = item.title ?? item.preview?.slice(0, 120) ?? item.url ?? "Untitled";
  const price = item.type === "product" ? productInfo(item.embedJson) : undefined;
  return [
    item.status === "failed" ? "Couldn't save" : TYPE_NAMES[item.type],
    title,
    item.author ? `by ${item.author.replace(/^@/, "")}` : undefined,
    item.sourceDomain,
    price ? priceLabel(price) : undefined,
    `saved ${timeAgo(item.savedAt)}`,
  ]
    .filter(Boolean)
    .join(", ");
}

function coverText(item: Card): { heading: string; kicker?: string } {
  const md = item.preview ?? "";
  const lines = md.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const firstHeading = lines.find((l) => /^#{1,3}\s+\S/.test(l))?.replace(/^#+\s+/, "");
  const heading = item.title ?? firstHeading ?? embedString(item.embedJson, "filename") ?? "Document";
  const para = lines.find((l) => !/^#/.test(l) && !/^[-*>|]/.test(l) && l !== heading && l.length > 20);
  const kicker = item.summary ?? para;
  return { heading, kicker: kicker ? kicker.slice(0, 90).toUpperCase() : undefined };
}


function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1).replace(/\.0$/, "")}K`;
  return String(n);
}




function embedString(embedJson: unknown, key: string): string | undefined {
  if (embedJson && typeof embedJson === "object" && key in embedJson) {
    const v = (embedJson as Record<string, unknown>)[key];
    return typeof v === "string" ? v : undefined;
  }
  return undefined;
}

function embedNumber(embedJson: unknown, key: string): number | undefined {
  if (embedJson && typeof embedJson === "object" && key in embedJson) {
    const v = (embedJson as Record<string, unknown>)[key];
    return typeof v === "number" ? v : undefined;
  }
  return undefined;
}

function tweetQuote(item: Card): { name?: string; handle?: string; text?: string } | undefined {
  if (item.type !== "tweet" || !item.embedJson || typeof item.embedJson !== "object") return undefined;
  const q = (item.embedJson as { quote?: unknown }).quote;
  if (!q || typeof q !== "object") return undefined;
  const { name, handle, text } = q as { name?: unknown; handle?: unknown; text?: unknown };
  return {
    name: typeof name === "string" ? name : undefined,
    handle: typeof handle === "string" ? handle : undefined,
    text: typeof text === "string" ? text : undefined,
  };
}

/* ------------------------------------------------------------------ */
/* Styles                                                              */
/* ------------------------------------------------------------------ */

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    flex: { flex: 1 },
    card: {},
    pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
    heading: {
      fontSize: 14,
      lineHeight: 19,
      fontWeight: "500",
      color: c.text,
      marginTop: 7,
      marginHorizontal: 4,
    },

    tile: {
      borderRadius: radius.lg,
      overflow: "hidden",
      backgroundColor: c.fill,
    },
    image: { width: "100%", backgroundColor: c.fill },
    floor: { position: "absolute", left: 0, right: 0, bottom: 0, height: 56 },
    center: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
    play: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: "rgba(0,0,0,0.45)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.3)",
      alignItems: "center",
      justifyContent: "center",
    },
    playIcon: { marginLeft: 3 },

    tagSlot: { position: "absolute", left: 8, bottom: 8, right: 8, flexDirection: "row" },
    tag: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      maxWidth: "100%",
      paddingLeft: 3,
      paddingRight: 8,
      paddingVertical: 3,
      borderRadius: radius.full,
      backgroundColor: "rgba(0,0,0,0.45)",
    },
    tagOnLight: { alignSelf: "flex-start", backgroundColor: c.scheme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.8)" },
    tagChip: { width: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center" },
    tagText: { fontSize: 11.5, fontWeight: "600", color: "#fff", flexShrink: 1 },
    tagTextOnLight: { color: c.textBody },

    price: {
      position: "absolute",
      right: 8,
      top: 8,
      flexDirection: "row",
      alignItems: "baseline",
      gap: 5,
      borderRadius: radius.full,
      backgroundColor: "rgba(12,10,9,0.8)",
      paddingHorizontal: 9,
      paddingVertical: 5,
    },
    priceText: { fontSize: 13, fontWeight: "700", color: "#fff" },
    priceWas: { fontSize: 10.5, color: "rgba(255,255,255,0.55)", textDecorationLine: "line-through" },

    textTile: { padding: 12, gap: 10 },
    plainTile: {
      backgroundColor: c.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.cardBorder,
    },
    noteTile: { borderWidth: StyleSheet.hairlineWidth, borderColor: c.noteBorder, minHeight: 120 },
    noteText: { fontFamily: fonts.serif, fontSize: 17, lineHeight: 23, color: c.textBody },

    tweetHead: { flexDirection: "row", alignItems: "center", gap: 7 },
    handle: { flex: 1, fontSize: 12.5, color: c.textFaint },
    tweetText: { fontSize: 14.5, lineHeight: 20, color: c.textBody },
    avatar: { alignItems: "center", justifyContent: "center" },
    avatarText: { color: "#fff", fontWeight: "600" },

    coverTile: { aspectRatio: 1, padding: 14, justifyContent: "center" },
    coverLetter: { fontFamily: fonts.serifItalic, fontSize: 64, lineHeight: 70, color: "rgba(255,255,255,0.92)" },
    coverDomain: { fontSize: 13, fontWeight: "600", color: "rgba(255,255,255,0.85)", marginBottom: 24 },

    docTile: { padding: 14, paddingBottom: 40 },
    docStack: { aspectRatio: 3 / 4, marginHorizontal: 6 },
    docSheet: { position: "absolute", top: 0, bottom: 0, borderRadius: 6, backgroundColor: c.borderStrong },
    docSheetBack: { left: 10, right: 10, transform: [{ translateX: 4 }, { translateY: 10 }, { rotate: "2.5deg" }], opacity: 0.7 },
    docSheetMid: { left: 5, right: 5, transform: [{ translateX: 2 }, { translateY: 5 }, { rotate: "-1deg" }], backgroundColor: c.border },
    docTop: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: 6,
      overflow: "hidden",
      shadowColor: "#000",
      shadowOpacity: 0.25,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 3,
    },
    docCover: { flex: 1, padding: 12, justifyContent: "flex-end" },
    docHeading: { fontFamily: fonts.serif, fontSize: 17, lineHeight: 21, color: "#fff" },

    githubTile: { backgroundColor: "#24292f", minHeight: 130 },
    ghAvatar: { width: 22, height: 22, borderRadius: 6 },
    ghOwner: { flex: 1, fontSize: 12.5, color: "rgba(255,255,255,0.7)" },
    ghRepo: {
      fontFamily: Platform.select({ ios: "Menlo", default: "monospace" }),
      fontSize: 15,
      lineHeight: 20,
      fontWeight: "600",
      color: "#fff",
    },
    ghMeta: { flexDirection: "row", alignItems: "center", gap: 10 },
    ghMetaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
    ghMetaText: { fontSize: 12, color: "rgba(255,255,255,0.7)" },

    statusTile: { aspectRatio: 1, alignItems: "center", justifyContent: "center", gap: 8, paddingBottom: 24 },
    statusText: { fontSize: 13, color: c.textFaint, maxWidth: "80%" },
  });
