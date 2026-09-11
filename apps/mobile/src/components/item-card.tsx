import { memo, type ComponentProps, type ReactNode } from "react";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Card } from "../lib/types";
import { colors, fonts, radius } from "../lib/theme";
import { timeAgo, domainOf } from "../lib/format";

/* ------------------------------------------------------------------ */
/* Badge specs — one per card type, mirrors apps/web ItemCard          */
/* ------------------------------------------------------------------ */

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
const PENDING: BadgeSpec = { label: "Saving…", icon: "sync-outline", bg: colors.surfaceAlt, fg: colors.textMuted };
const FAILED: BadgeSpec = { label: "Couldn't save", icon: "warning", bg: "#f59e0b" };
const IG_GRADIENT = ["#f9ce34", "#ee2a7b", "#6228d7"] as const;

function instagramSpec(item: Card): BadgeSpec {
  return {
    label: embedString(item.embedJson, "kind") === "reel" ? "Reel" : "Post",
    icon: "logo-instagram",
    bg: "#ee2a7b",
    gradient: IG_GRADIENT,
  };
}

function documentSpec(item: Card): BadgeSpec {
  const format = (embedString(item.embedJson, "format") ?? item.sourceDomain ?? "file").toLowerCase();
  if (format === "pdf") return { label: "PDF", icon: "document-text", bg: "#ef4444" };
  if (format === "xlsx" || format === "csv") return { label: format.toUpperCase(), icon: "grid-outline", bg: "#059669" };
  if (format === "pptx") return { label: "Slides", icon: "easel-outline", bg: "#f97316" };
  return { label: format.toUpperCase(), icon: "document-text", bg: "#3b82f6" };
}

const COVER_TONE: Record<string, readonly [string, string, string]> = {
  pdf: ["#3b2f7a", "#1f1a3f", "#0e0d1c"],
  docx: ["#1e3a8a", "#172554", "#0b1024"],
  xlsx: ["#065f46", "#064e3b", "#0a1f1a"],
  csv: ["#065f46", "#064e3b", "#0a1f1a"],
  pptx: ["#9a3412", "#5a1d0a", "#1f0d06"],
};
const COVER_DEFAULT = ["#334155", "#1e293b", "#0b1220"] as const;

/* ------------------------------------------------------------------ */
/* Shared pieces                                                       */
/* ------------------------------------------------------------------ */

function Chip({ spec, size = 24 }: { spec: BadgeSpec; size?: number }) {
  const iconSize = Math.round(size * 0.54);
  const style = { width: size, height: size, borderRadius: Math.round(size * 0.3) };
  if (spec.gradient) {
    return (
      <LinearGradient colors={spec.gradient} start={{ x: 0, y: 1 }} end={{ x: 1, y: 0 }} style={[styles.chip, style]}>
        <Ionicons name={spec.icon} size={iconSize} color="#fff" />
      </LinearGradient>
    );
  }
  return (
    <View style={[styles.chip, style, { backgroundColor: spec.bg }]}>
      <Ionicons name={spec.icon} size={iconSize} color={spec.fg ?? "#fff"} />
    </View>
  );
}

function Badge({ spec, overlay }: { spec: BadgeSpec; overlay?: boolean }) {
  if (overlay) {
    return (
      <View style={styles.overlayBadge}>
        <Chip spec={spec} size={20} />
        <Text style={styles.overlayBadgeText}>{spec.label}</Text>
      </View>
    );
  }
  return (
    <View style={styles.badge}>
      <Chip spec={spec} />
      <Text style={styles.badgeText}>{spec.label}</Text>
    </View>
  );
}

function Kebab({ overlay }: { overlay?: boolean }) {
  return (
    <View style={overlay ? styles.kebabOverlay : styles.kebab}>
      <Ionicons name="ellipsis-horizontal" size={15} color={overlay ? "#fff" : colors.textFaint} />
    </View>
  );
}

function Header({ spec }: { spec: BadgeSpec }) {
  return (
    <View style={styles.header}>
      <Badge spec={spec} />
      <Kebab />
    </View>
  );
}

function Tags({ tags }: { tags: string[] }) {
  if (tags.length === 0) return null;
  return (
    <View style={styles.tagRow}>
      {tags.slice(0, 3).map((tag) => (
        <View key={tag} style={styles.tag}>
          <Text style={styles.tagText}>#{tag}</Text>
        </View>
      ))}
    </View>
  );
}

function Footer({ left, savedAt }: { left?: string; savedAt: number }) {
  return (
    <View style={styles.footer}>
      <Text style={[styles.meta, styles.footerLeft]} numberOfLines={1}>
        {left ?? ""}
      </Text>
      <Text style={styles.meta}>Saved {timeAgo(savedAt)}</Text>
    </View>
  );
}

function Media({
  item,
  spec,
  play,
  cornerLabel,
}: {
  item: Card;
  spec: BadgeSpec;
  play?: boolean;
  cornerLabel?: string;
}) {
  const aspect =
    item.thumbWidth && item.thumbHeight ? item.thumbWidth / item.thumbHeight : 16 / 10;
  return (
    <View style={styles.media}>
      <Image
        source={{ uri: item.thumbnailUrl }}
        style={[styles.mediaImage, { aspectRatio: Math.max(0.8, Math.min(aspect, 2)) }]}
        contentFit="cover"
        recyclingKey={item.id}
        cachePolicy="memory-disk"
        transition={0}
      />
      {/* Bleed the bottom of the image into the card surface. */}
      <LinearGradient
        pointerEvents="none"
        colors={["rgba(255,255,255,0)", "rgba(255,255,255,0.72)", colors.surface]}
        locations={[0, 0.55, 1]}
        style={styles.mediaFade}
      />
      <LinearGradient
        pointerEvents="none"
        colors={["rgba(0,0,0,0.35)", "rgba(0,0,0,0)"]}
        style={styles.mediaVignette}
      />
      {play ? (
        <View pointerEvents="none" style={styles.playOverlay}>
          <View style={styles.playCircle}>
            <Ionicons name="play" size={18} color="#fff" style={styles.playIcon} />
          </View>
        </View>
      ) : null}
      <View style={styles.mediaBadge}>
        <Badge spec={spec} overlay />
      </View>
      {cornerLabel ? <Text style={styles.cornerLabel}>{cornerLabel}</Text> : null}
      <View style={styles.mediaKebab}>
        <Kebab overlay />
      </View>
    </View>
  );
}

const AVATAR_HUES: readonly (readonly [string, string])[] = [
  ["#8b5cf6", "#d946ef"],
  ["#0ea5e9", "#6366f1"],
  ["#10b981", "#14b8a6"],
  ["#f59e0b", "#f97316"],
  ["#f43f5e", "#ec4899"],
  ["#06b6d4", "#3b82f6"],
];

function Avatar({ seed, size = 32 }: { seed: string; size?: number }) {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const grad = AVATAR_HUES[h % AVATAR_HUES.length];
  return (
    <LinearGradient
      colors={grad}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}
    >
      <Text style={[styles.avatarText, { fontSize: Math.round(size * 0.42) }]}>
        {(seed.slice(0, 1) || "?").toUpperCase()}
      </Text>
    </LinearGradient>
  );
}

function Shell({
  item,
  onPress,
  style,
  children,
}: {
  item: Card;
  onPress?: (item: Card) => void;
  style?: object;
  children: ReactNode;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.card, style, pressed && styles.pressed]}
      onPress={() => onPress?.(item)}
      android_ripple={{ color: colors.surfaceAlt }}
    >
      {children}
    </Pressable>
  );
}

/* ------------------------------------------------------------------ */
/* The card                                                            */
/* ------------------------------------------------------------------ */

export const ItemCard = memo(function ItemCard({
  item,
  onPress,
}: {
  item: Card;
  onPress?: (item: Card) => void;
}) {
  if (item.status === "pending") {
    return (
      <Shell item={item} onPress={onPress}>
        <Header spec={PENDING} />
        <View style={styles.body}>
          <View style={[styles.skeletonBar, { width: "75%", height: 12 }]} />
          <View style={[styles.skeletonBar, { width: "100%" }]} />
          <View style={[styles.skeletonBar, { width: "85%" }]} />
          <View style={styles.tagRow}>
            <View style={[styles.skeletonBar, { width: 52, height: 20, borderRadius: radius.full }]} />
            <View style={[styles.skeletonBar, { width: 64, height: 20, borderRadius: radius.full }]} />
          </View>
          {item.url ? (
            <Text style={styles.meta} numberOfLines={1}>
              {domainOf(item.url)}
            </Text>
          ) : null}
        </View>
      </Shell>
    );
  }

  if (item.status === "failed") {
    return (
      <Shell item={item} onPress={onPress} style={styles.failedCard}>
        <Header spec={FAILED} />
        <View style={styles.body}>
          <Text style={styles.title} numberOfLines={2}>
            {item.title ?? item.url ?? "Unknown item"}
          </Text>
          {item.title && item.url ? (
            <Text style={styles.bodyText} numberOfLines={1}>
              {item.url}
            </Text>
          ) : null}
          <Footer left={item.sourceDomain} savedAt={item.savedAt} />
        </View>
      </Shell>
    );
  }

  switch (item.type) {
    case "tweet":
      return <TweetCard item={item} onPress={onPress} />;
    case "instagram":
      return (
        <MediaCard
          item={item}
          onPress={onPress}
          spec={instagramSpec(item)}
          play={embedString(item.embedJson, "kind") === "reel"}
        />
      );
    case "youtube":
      return (
        <MediaCard
          item={item}
          onPress={onPress}
          spec={{ ...YOUTUBE, label: embedString(item.embedJson, "kind") === "short" ? "Short" : "YouTube" }}
          play
          showAuthor
        />
      );
    case "image":
      return <ImageCard item={item} onPress={onPress} />;
    case "note":
      return <NoteCard item={item} onPress={onPress} />;
    case "link":
      return <LinkCard item={item} onPress={onPress} />;
    case "document":
      return <DocumentCard item={item} onPress={onPress} />;
    case "article":
    default:
      return <ArticleCard item={item} onPress={onPress} />;
  }
});

type Props = { item: Card; onPress?: (item: Card) => void };

function ArticleCard({ item, onPress }: Props) {
  const description = item.summary ?? item.preview;
  const siteName = embedString(item.embedJson, "siteName");
  return (
    <Shell item={item} onPress={onPress}>
      {item.thumbnailUrl ? (
        <Media item={item} spec={ARTICLE} cornerLabel={readTime(item)} />
      ) : (
        <Header spec={ARTICLE} />
      )}
      <View style={[styles.body, item.thumbnailUrl && styles.bodyTight]}>
        {item.title ? (
          <Text style={styles.title} numberOfLines={2}>
            {item.title}
          </Text>
        ) : null}
        {description ? (
          <Text style={styles.bodyText} numberOfLines={3}>
            {description}
          </Text>
        ) : null}
        <Tags tags={item.tags} />
        <Footer left={siteName ?? item.sourceDomain} savedAt={item.savedAt} />
      </View>
    </Shell>
  );
}

function TweetCard({ item, onPress }: Props) {
  const handle = (embedString(item.embedJson, "handle") ?? item.author ?? "").replace(/^@/, "");
  const likes = embedNumber(item.embedJson, "likes");
  const retweets = embedNumber(item.embedJson, "retweets");
  const mediaType = embedString(item.embedJson, "mediaType");
  const quote = tweetQuote(item);
  const text = item.preview ?? item.title;
  const aspect =
    item.thumbWidth && item.thumbHeight ? item.thumbWidth / item.thumbHeight : 16 / 10;
  return (
    <Shell item={item} onPress={onPress}>
      <View style={styles.tweetHeader}>
        <Avatar seed={handle || "x"} />
        <View style={styles.tweetIdentity}>
          <View style={styles.tweetNameRow}>
            <Text style={styles.tweetName} numberOfLines={1}>
              {displayName(handle)}
            </Text>
            <Ionicons name="logo-x" size={10} color={colors.textFaint} />
          </View>
          <Text style={styles.meta} numberOfLines={1}>
            @{handle}
          </Text>
        </View>
        <Text style={styles.meta}>{timeAgo(item.savedAt)}</Text>
      </View>
      <View style={styles.body}>
        {text ? (
          <Text style={styles.tweetText} numberOfLines={6}>
            {text}
          </Text>
        ) : null}
        {item.thumbnailUrl ? (
          <View style={styles.inset}>
            <Image
              source={{ uri: item.thumbnailUrl }}
              style={[styles.mediaImage, { aspectRatio: Math.max(0.8, Math.min(aspect, 2)) }]}
              contentFit="cover"
              recyclingKey={item.id}
              cachePolicy="memory-disk"
              transition={0}
            />
            {mediaType === "video" || mediaType === "gif" ? (
              <View pointerEvents="none" style={styles.playOverlay}>
                <View style={styles.playCircle}>
                  <Ionicons name="play" size={16} color="#fff" style={styles.playIcon} />
                </View>
              </View>
            ) : null}
          </View>
        ) : null}
        {quote ? (
          <View style={styles.quote}>
            <View style={styles.tweetNameRow}>
              <Text style={styles.quoteAuthor} numberOfLines={1}>
                {quote.name ?? quote.handle}
              </Text>
              {quote.handle ? (
                <Text style={styles.meta} numberOfLines={1}>
                  @{quote.handle}
                </Text>
              ) : null}
            </View>
            {quote.text ? (
              <Text style={styles.quoteText} numberOfLines={3}>
                {quote.text}
              </Text>
            ) : null}
          </View>
        ) : null}
        {likes !== undefined || retweets !== undefined ? (
          <View style={styles.engagement}>
            {retweets !== undefined ? (
              <View style={styles.engagementItem}>
                <Ionicons name="repeat-outline" size={15} color={colors.textFaint} />
                <Text style={styles.engagementText}>{compact(retweets)}</Text>
              </View>
            ) : null}
            {likes !== undefined ? (
              <View style={styles.engagementItem}>
                <Ionicons name="heart-outline" size={14} color={colors.textFaint} />
                <Text style={styles.engagementText}>{compact(likes)}</Text>
              </View>
            ) : null}
          </View>
        ) : null}
        <View style={styles.tagsAndKebab}>
          <View style={styles.footerLeft}>
            <Tags tags={item.tags} />
          </View>
          <Kebab />
        </View>
      </View>
    </Shell>
  );
}

function MediaCard({
  item,
  onPress,
  spec,
  play,
  showAuthor,
}: Props & { spec: BadgeSpec; play?: boolean; showAuthor?: boolean }) {
  const author = item.author?.replace(/^@/, "");
  return (
    <Shell item={item} onPress={onPress}>
      {item.thumbnailUrl ? <Media item={item} spec={spec} play={play} /> : <Header spec={spec} />}
      <View style={[styles.body, item.thumbnailUrl && styles.bodyTight]}>
        {item.title ? (
          <Text style={styles.title} numberOfLines={2}>
            {item.title}
          </Text>
        ) : null}
        {author ? (
          showAuthor ? (
            <View style={styles.authorRow}>
              <Avatar seed={author} size={18} />
              <Text style={styles.authorText} numberOfLines={1}>
                {author}
              </Text>
            </View>
          ) : (
            <Text style={styles.meta} numberOfLines={1}>
              @{author}
            </Text>
          )
        ) : null}
        {!item.title && item.preview ? (
          <Text style={styles.bodyText} numberOfLines={3}>
            {item.preview}
          </Text>
        ) : null}
        <Tags tags={item.tags} />
        <Footer left={item.sourceDomain} savedAt={item.savedAt} />
      </View>
    </Shell>
  );
}

function ImageCard({ item, onPress }: Props) {
  const caption = item.summary ?? item.preview;
  return (
    <Shell item={item} onPress={onPress}>
      {item.thumbnailUrl ? <Media item={item} spec={IMAGE} /> : <Header spec={IMAGE} />}
      <View style={[styles.body, item.thumbnailUrl && styles.bodyTight]}>
        {item.title ? (
          <Text style={styles.title} numberOfLines={2}>
            {item.title}
          </Text>
        ) : null}
        {caption ? (
          <Text style={styles.bodyText} numberOfLines={2}>
            {caption}
          </Text>
        ) : null}
        <Tags tags={item.tags} />
        <Footer left={item.sourceDomain} savedAt={item.savedAt} />
      </View>
    </Shell>
  );
}

const BULLET_RE = /^([-*•]|\d+[.)])\s+/;

function NoteCard({ item, onPress }: Props) {
  const body = item.preview?.trim() ?? "";
  const lines = body.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const bullets = lines.filter((l) => BULLET_RE.test(l));
  const asList = lines.length >= 2 && bullets.length >= Math.ceil(lines.length / 2);
  const title = item.title ?? (asList ? undefined : lines[0]);
  const rest = !item.title && !asList ? lines.slice(1).join(" ") : asList ? undefined : body;
  return (
    <Shell item={item} onPress={onPress} style={styles.noteCard}>
      <LinearGradient
        pointerEvents="none"
        colors={["#eef2ff", "#f5f3ff", colors.surface]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Header spec={NOTE} />
      <View style={styles.body}>
        {title ? (
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
        ) : null}
        {asList ? (
          <View style={styles.bulletList}>
            {lines.slice(0, 6).map((l, i) => (
              <View key={i} style={styles.bulletRow}>
                <View style={styles.bulletDot} />
                <Text style={styles.noteText} numberOfLines={1}>
                  {l.replace(BULLET_RE, "")}
                </Text>
              </View>
            ))}
          </View>
        ) : rest ? (
          <Text style={styles.noteText} numberOfLines={5}>
            {rest}
          </Text>
        ) : null}
        <Tags tags={item.tags} />
        <Footer savedAt={item.savedAt} />
      </View>
    </Shell>
  );
}

function LinkCard({ item, onPress }: Props) {
  const description = item.summary ?? item.preview;
  return (
    <Shell item={item} onPress={onPress}>
      <Header spec={LINK} />
      <View style={styles.body}>
        {item.title ? (
          <Text style={styles.title} numberOfLines={2}>
            {item.title}
          </Text>
        ) : null}
        {description ? (
          <Text style={styles.bodyText} numberOfLines={2}>
            {description}
          </Text>
        ) : null}
        {item.thumbnailUrl ? (
          <View style={styles.inset}>
            <Image
              source={{ uri: item.thumbnailUrl }}
              style={styles.linkThumb}
              contentFit="cover"
              recyclingKey={item.id}
              cachePolicy="memory-disk"
              transition={0}
            />
          </View>
        ) : null}
        <Tags tags={item.tags} />
        <Footer left={item.sourceDomain} savedAt={item.savedAt} />
      </View>
    </Shell>
  );
}

function DocumentCard({ item, onPress }: Props) {
  const spec = documentSpec(item);
  const filename = embedString(item.embedJson, "filename");
  const title = item.title ?? filename?.replace(/\.[a-z0-9]+$/i, "");
  const pages = embedNumber(item.embedJson, "pages");
  const meta = [
    pluralize(pages, "page"),
    formatBytes(embedNumber(item.embedJson, "bytes")),
    !pages ? pluralize(embedNumber(item.embedJson, "words"), "word") : undefined,
    timeAgo(item.savedAt),
  ].filter(Boolean);
  return (
    <Shell item={item} onPress={onPress}>
      <Header spec={spec} />
      <DocumentCover item={item} spec={spec} />
      <View style={styles.body}>
        {title ? (
          <Text style={styles.docTitle} numberOfLines={2}>
            {title}
          </Text>
        ) : null}
        <Text style={styles.meta} numberOfLines={1}>
          {meta.join("  ·  ")}
        </Text>
        <Tags tags={item.tags} />
      </View>
    </Shell>
  );
}

function DocumentCover({ item, spec }: { item: Card; spec: BadgeSpec }) {
  const format = (embedString(item.embedJson, "format") ?? item.sourceDomain ?? "").toLowerCase();
  const tone = COVER_TONE[format] ?? COVER_DEFAULT;
  const { heading, kicker } = coverText(item);
  return (
    <View style={styles.coverWrap}>
      <View style={styles.coverStack}>
        <View style={[styles.coverSheet, styles.coverSheetBack]} />
        <View style={[styles.coverSheet, styles.coverSheetMid]} />
        <View style={styles.coverTop}>
          {item.thumbnailUrl ? (
            <Image
              source={{ uri: item.thumbnailUrl }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              contentPosition="top"
              recyclingKey={item.id}
              cachePolicy="memory-disk"
              transition={0}
            />
          ) : (
            <LinearGradient colors={tone} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.coverGradient}>
              <View style={styles.coverGlow} />
              <Text style={styles.coverFormat}>{spec.label}</Text>
              <View style={styles.coverTextBlock}>
                <Text style={styles.coverHeading} numberOfLines={3}>
                  {heading}
                </Text>
                {kicker ? (
                  <Text style={styles.coverKicker} numberOfLines={2}>
                    {kicker}
                  </Text>
                ) : null}
              </View>
            </LinearGradient>
          )}
        </View>
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function coverText(item: Card): { heading: string; kicker?: string } {
  const md = item.preview ?? "";
  const lines = md.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const firstHeading = lines.find((l) => /^#{1,3}\s+\S/.test(l))?.replace(/^#+\s+/, "");
  const heading = item.title ?? firstHeading ?? embedString(item.embedJson, "filename") ?? "Document";
  const para = lines.find((l) => !/^#/.test(l) && !/^[-*>|]/.test(l) && l !== heading && l.length > 20);
  const kicker = item.summary ?? para;
  return { heading, kicker: kicker ? kicker.slice(0, 90).toUpperCase() : undefined };
}

function displayName(handle: string): string {
  if (!handle) return "Post";
  return handle
    .replace(/[_.]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1).replace(/\.0$/, "")}K`;
  return String(n);
}

function readTime(item: Card): string | undefined {
  const words = embedNumber(item.embedJson, "wordCount");
  if (!words) return undefined;
  return `${Math.max(1, Math.round(words / 220))} min read`;
}

function pluralize(n: number | undefined, unit: string): string | undefined {
  if (!n) return undefined;
  return `${n.toLocaleString()} ${unit}${n === 1 ? "" : "s"}`;
}

function formatBytes(n: number | undefined): string | undefined {
  if (!n) return undefined;
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  if (n >= 1024) return `${Math.round(n / 1024)} KB`;
  return `${n} B`;
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

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
    overflow: "hidden",
  },
  pressed: { opacity: 0.9, transform: [{ scale: 0.985 }] },
  noteCard: { borderColor: colors.noteBorder },
  failedCard: { borderStyle: "dashed", borderWidth: 1 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingTop: 11,
  },
  badge: { flexDirection: "row", alignItems: "center", gap: 7, flexShrink: 1 },
  badgeText: { fontSize: 12, fontWeight: "500", color: colors.textMuted },
  chip: { alignItems: "center", justifyContent: "center" },
  overlayBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: radius.full,
    paddingLeft: 3,
    paddingRight: 9,
    paddingVertical: 3,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.06)",
  },
  overlayBadgeText: { fontSize: 11, fontWeight: "600", color: colors.text },
  kebab: { width: 26, height: 26, alignItems: "center", justifyContent: "center", marginRight: -6 },
  kebabOverlay: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },

  body: { paddingHorizontal: 12, paddingBottom: 12, paddingTop: 9, gap: 6 },
  bodyTight: { paddingTop: 4 },
  title: { fontSize: 14.5, fontWeight: "600", color: colors.text, lineHeight: 19.5, letterSpacing: -0.1 },
  bodyText: { fontSize: 12.5, color: colors.textMuted, lineHeight: 18 },
  meta: { fontSize: 11, color: colors.textFaint },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 4 },
  footerLeft: { flexShrink: 1 },

  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginTop: 4 },
  tag: { backgroundColor: colors.surfaceAlt, borderRadius: radius.full, paddingHorizontal: 9, paddingVertical: 4 },
  tagText: { fontSize: 10.5, color: colors.textBody, fontWeight: "500" },

  media: { position: "relative", marginBottom: -2 },
  mediaImage: { width: "100%", backgroundColor: colors.surfaceAlt },
  mediaFade: { position: "absolute", left: 0, right: 0, bottom: 0, height: "46%" },
  mediaVignette: { position: "absolute", left: 0, right: 0, top: 0, height: 56 },
  mediaBadge: { position: "absolute", left: 12, bottom: 6 },
  mediaKebab: { position: "absolute", right: 8, top: 8 },
  cornerLabel: {
    position: "absolute",
    right: 12,
    bottom: 10,
    fontSize: 11,
    fontWeight: "500",
    color: colors.textBody,
  },
  playOverlay: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  playCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  playIcon: { marginLeft: 3 },
  inset: { borderRadius: 12, overflow: "hidden", borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, marginTop: 2 },
  linkThumb: { width: "100%", height: 96, backgroundColor: colors.surfaceAlt },

  tweetHeader: { flexDirection: "row", alignItems: "center", gap: 9, paddingHorizontal: 12, paddingTop: 11 },
  tweetIdentity: { flex: 1, minWidth: 0 },
  tweetNameRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  tweetName: { fontSize: 13, fontWeight: "600", color: colors.text, flexShrink: 1 },
  tweetText: { fontSize: 14, color: colors.textBody, lineHeight: 20 },
  avatar: { alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontWeight: "600" },
  quote: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 10,
    backgroundColor: colors.bg,
    gap: 3,
  },
  quoteAuthor: { fontSize: 12, fontWeight: "600", color: colors.text, flexShrink: 1 },
  quoteText: { fontSize: 12, color: colors.textMuted, lineHeight: 17 },
  engagement: { flexDirection: "row", gap: 16, marginTop: 2 },
  engagementItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  engagementText: { fontSize: 12, color: colors.textFaint },
  tagsAndKebab: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 6 },

  authorRow: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 2 },
  authorText: { fontSize: 12.5, color: colors.textMuted, flexShrink: 1 },

  bulletList: { gap: 3, marginTop: 2 },
  bulletRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  bulletDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "#a78bfa" },
  noteText: { fontSize: 13, color: colors.textBody, lineHeight: 19, flexShrink: 1 },

  docTitle: { fontFamily: fonts.serif, fontSize: 18, color: colors.text, lineHeight: 23 },
  coverWrap: { paddingHorizontal: 12, paddingTop: 10 },
  coverStack: { aspectRatio: 4 / 3, position: "relative" },
  coverSheet: { position: "absolute", top: 0, bottom: 0, borderRadius: 8, backgroundColor: colors.borderStrong },
  coverSheetBack: { left: 12, right: 12, transform: [{ translateX: 5 }, { translateY: 12 }, { rotate: "2.5deg" }], opacity: 0.7 },
  coverSheetMid: { left: 6, right: 6, transform: [{ translateX: 2 }, { translateY: 6 }, { rotate: "-1deg" }], backgroundColor: colors.border },
  coverTop: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.12)",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  coverGradient: { flex: 1, padding: 12, justifyContent: "flex-end" },
  coverGlow: {
    position: "absolute",
    right: -40,
    top: -60,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  coverFormat: {
    position: "absolute",
    left: 12,
    top: 10,
    fontSize: 8.5,
    fontWeight: "600",
    letterSpacing: 2,
    color: "rgba(255,255,255,0.45)",
  },
  coverTextBlock: { gap: 6 },
  coverHeading: { fontFamily: fonts.serif, fontSize: 17, lineHeight: 20, color: "#fff" },
  coverKicker: { fontSize: 8, letterSpacing: 1.4, lineHeight: 12, color: "rgba(255,255,255,0.6)", fontWeight: "500" },

  skeletonBar: { height: 10, borderRadius: radius.sm, backgroundColor: colors.surfaceAlt },
});
