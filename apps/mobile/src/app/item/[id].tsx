import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api, type Id } from "../../lib/backend";
import type { Card, Detail } from "../../lib/types";
import { peekCardSeed } from "../../lib/card-seed";
import { optimisticPatchItem } from "../../lib/optimistic";
import { formatPrice, priceLabel, productInfo, timeAgoLong } from "../../lib/format";
import { useItemActions } from "../../lib/item-actions";
import { setVaultFilter } from "../../lib/vault-filter";
import { haptics } from "../../lib/haptics";
import { fonts, HIT, type Palette, radius, useStyles, useTheme } from "../../lib/theme";
import { useActionSheet } from "../../components/action-sheet";
import { Markdown } from "../../components/markdown";
import { EmptyState, type IconName } from "../../components/ui";

type Item = Detail & { tags?: string[] };

const KIND: Record<Card["type"], { label: string; icon: IconName }> = {
  article: { label: "Article", icon: "newspaper-outline" },
  tweet: { label: "Post", icon: "logo-x" },
  instagram: { label: "Instagram", icon: "logo-instagram" },
  youtube: { label: "YouTube", icon: "logo-youtube" },
  image: { label: "Image", icon: "image-outline" },
  note: { label: "Note", icon: "document-text-outline" },
  link: { label: "Link", icon: "link-outline" },
  document: { label: "Document", icon: "document-attach-outline" },
  github: { label: "GitHub", icon: "logo-github" },
  product: { label: "Product", icon: "pricetag-outline" },
};

const READER_PREVIEW_BLOCKS = 6;

function seedAsItem(seed: Card): Item {
  return {
    id: seed.id,
    type: seed.type,
    url: seed.url,
    title: seed.title,
    author: seed.author,
    sourceDomain: seed.sourceDomain,
    contentText: seed.preview,
    summary: seed.summary,
    thumbnailUrl: seed.thumbnailUrl,
    embedJson: seed.embedJson,
    tags: seed.tags,
    status: seed.status,
    savedAt: seed.savedAt,
  };
}

export default function ItemPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const styles = useStyles(makeStyles);
  const c = useTheme();
  if (!id) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={c.textFaint} />
      </View>
    );
  }
  return <ItemScreen itemId={id} />;
}

function ItemScreen({ itemId }: { itemId: string }) {
  const c = useTheme();
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const showSheet = useActionSheet();
  const { share, copy, openUrl, confirmDelete } = useItemActions();
  const id = itemId as Id<"items">;

  const item = useQuery(api.items.get, { id });
  const seed = peekCardSeed(itemId);

  const update = useMutation(api.items.update).withOptimisticUpdate((store, args) =>
    optimisticPatchItem(store, args.id, { title: args.title, userNote: args.userNote }),
  );
  const addTag = useMutation(api.items.addTag).withOptimisticUpdate((store, args) => {
    const current = store.getQuery(api.items.get, { id: args.id });
    const name = args.name.trim().toLowerCase().slice(0, 30);
    if (current && name && !current.tags.includes(name)) {
      optimisticPatchItem(store, args.id, { tags: [...current.tags, name] });
    }
  });
  const removeTag = useMutation(api.items.removeTag).withOptimisticUpdate((store, args) => {
    const current = store.getQuery(api.items.get, { id: args.id });
    if (current) {
      optimisticPatchItem(store, args.id, {
        tags: current.tags.filter((t) => t !== args.name.trim().toLowerCase()),
      });
    }
  });

  const [titleDraft, setTitleDraft] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState<string | null>(null);
  const [noteSaved, setNoteSaved] = useState(false);
  const [addingTag, setAddingTag] = useState(false);
  const [tagDraft, setTagDraft] = useState("");
  const [readerOpen, setReaderOpen] = useState(false);
  const [ytHiResFailed, setYtHiResFailed] = useState(false);

  // Unsaved edits are flushed when the screen goes away (swipe back).
  const drafts = useRef({ title: null as string | null, note: null as string | null });
  const saved = useRef({ title: undefined as string | undefined, note: undefined as string | undefined });
  drafts.current = { title: titleDraft, note: noteDraft };
  if (item) saved.current = { title: item.title, note: item.userNote };
  useEffect(() => {
    return () => {
      const { title, note } = drafts.current;
      const patch: { title?: string; userNote?: string } = {};
      if (title !== null && title !== (saved.current.title ?? "")) patch.title = title;
      if (note !== null && note !== (saved.current.note ?? "")) patch.userNote = note;
      if (Object.keys(patch).length > 0) void update({ id, ...patch });
    };
  }, [id, update]);

  const it: Item | undefined = item ? { ...item, status: seed?.status } : seed ? seedAsItem(seed) : undefined;

  if (item === null) {
    return (
      <View style={styles.container}>
        <NavBar insetTop={insets.top} />
        <EmptyState icon="trash-outline" title="This memory is gone" body="It may have been deleted on another device." />
      </View>
    );
  }
  if (!it) {
    return (
      <View style={styles.container}>
        <NavBar insetTop={insets.top} />
        <View style={styles.center}>
          <ActivityIndicator color={c.textFaint} />
        </View>
      </View>
    );
  }

  const embed = typeof it.embedJson === "object" && it.embedJson !== null ? (it.embedJson as Record<string, unknown>) : {};
  const kind = KIND[it.type];
  const product = it.type === "product" ? productInfo(it.embedJson) : undefined;
  const openTarget = it.url ?? it.fileUrl;
  const ytId = typeof embed.videoId === "string" ? embed.videoId : undefined;
  const filename = typeof embed.filename === "string" ? embed.filename : undefined;
  const aspect = seed?.thumbWidth && seed.thumbHeight ? Math.max(0.6, Math.min(seed.thumbWidth / seed.thumbHeight, 2)) : 16 / 10;
  const hasReader = !!it.contentText && it.type !== "note" && it.type !== "document";
  const noteValue = noteDraft ?? it.userNote ?? "";

  function saveTitle() {
    if (titleDraft !== null && titleDraft !== (it?.title ?? "")) void update({ id, title: titleDraft });
  }

  function saveNote() {
    if (noteDraft !== null && noteDraft !== (it?.userNote ?? "")) {
      void update({ id, userNote: noteDraft }).then(() => setNoteSaved(true));
    }
  }

  async function submitTag() {
    const name = tagDraft.trim();
    setTagDraft("");
    setAddingTag(false);
    if (!name) return;
    haptics.light();
    try {
      await addTag({ id, name });
    } catch {
      /* optimistic chip rolls back on its own */
    }
  }

  function showTag(tag: string) {
    setVaultFilter({ tag });
    router.navigate("/");
  }

  function more() {
    const url = it?.url;
    showSheet({
      actions: [
        ...(url
          ? [
              { label: "Copy Link", icon: "link-outline" as const, onPress: () => void copy(url) },
              { label: "Open in Browser", icon: "globe-outline" as const, onPress: () => openUrl(url) },
            ]
          : []),
        ...(it?.contentText
          ? [{ label: "Copy Text", icon: "copy-outline" as const, onPress: () => void copy(it.contentText ?? "", "Text") }]
          : []),
        { label: "Delete Memory", icon: "trash-outline", destructive: true, onPress: () => confirmDelete(itemId, () => router.back()) },
      ],
    });
  }

  const actions: { icon: IconName; label: string; onPress: () => void }[] = [];
  if (openTarget) {
    actions.push({
      icon: it.type === "youtube" ? "play" : it.type === "document" ? "document-outline" : "compass-outline",
      label: it.type === "youtube" ? "Watch" : it.type === "document" ? "View File" : "Open",
      onPress: () => openUrl(openTarget),
    });
  }
  if (it.url || it.contentText) {
    actions.push({
      icon: "share-outline",
      label: "Share",
      onPress: () => void share(it.title, it.url ?? undefined),
    });
  }
  if (it.url) actions.push({ icon: "link-outline", label: "Copy Link", onPress: () => void copy(it.url ?? "") });
  actions.push({ icon: "ellipsis-horizontal", label: "More", onPress: more });

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <NavBar insetTop={insets.top} onShare={it.url ? () => void share(it.title, it.url) : undefined} onMore={more} />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        {/* ---------- Hero ---------- */}
        {it.type === "youtube" && (ytId || it.thumbnailUrl) ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Play video"
            accessibilityHint="Opens the video on YouTube"
            onPress={() => it.url && openUrl(it.url)}
            style={({ pressed }) => [styles.heroWrap, pressed && styles.pressed]}
          >
            <Image
              source={{
                uri: ytId
                  ? ytHiResFailed
                    ? (it.thumbnailUrl ?? `https://i.ytimg.com/vi/${ytId}/mqdefault.jpg`)
                    : `https://i.ytimg.com/vi/${ytId}/maxresdefault.jpg`
                  : it.thumbnailUrl,
              }}
              style={[styles.hero, { aspectRatio: 16 / 9 }]}
              contentFit="cover"
              onError={() => setYtHiResFailed(true)}
              accessibilityIgnoresInvertColors
            />
            <View style={styles.playOverlay} pointerEvents="none">
              <View style={styles.playCircle}>
                <Ionicons name="play" size={26} color="#fff" style={styles.playIcon} />
              </View>
            </View>
          </Pressable>
        ) : it.type === "note" ? (
          <View style={styles.noteHero}>
            <Text style={styles.noteHeroText} selectable>
              {it.contentText}
            </Text>
          </View>
        ) : it.type === "document" ? (
          <View style={styles.docHero}>
            <View style={styles.docHeader}>
              <Ionicons name="document-text-outline" size={16} color={c.textFaint} />
              <Text style={styles.docName} numberOfLines={1}>
                {filename ?? "Document"}
              </Text>
            </View>
            <View style={styles.docBody}>
              {it.contentText?.trim() ? (
                <Markdown onLink={openUrl} maxBlocks={readerOpen ? undefined : READER_PREVIEW_BLOCKS}>
                  {it.contentText}
                </Markdown>
              ) : (
                <Text style={styles.muted}>No text could be extracted from this file.</Text>
              )}
            </View>
            {it.contentText?.trim() ? (
              <ShowMore open={readerOpen} onToggle={() => setReaderOpen((v) => !v)} />
            ) : null}
          </View>
        ) : it.thumbnailUrl && it.type !== "github" ? (
          <Pressable
            accessibilityRole={it.url ? "button" : "image"}
            accessibilityLabel={it.title ? `Image: ${it.title}` : "Image"}
            accessibilityHint={it.url ? "Opens the original" : undefined}
            disabled={!it.url}
            onPress={() => it.url && openUrl(it.url)}
            style={styles.heroWrap}
          >
            <Image
              source={{ uri: it.thumbnailUrl }}
              style={[styles.hero, { aspectRatio: it.type === "instagram" ? 4 / 5 : aspect }]}
              contentFit="cover"
              accessibilityIgnoresInvertColors
            />
          </Pressable>
        ) : null}

        {/* ---------- Title block ---------- */}
        <View style={styles.titleBlock}>
          <View style={styles.kindRow}>
            <Ionicons name={kind.icon} size={14} color={c.textMuted} />
            <Text style={styles.kindText} numberOfLines={1}>
              {[kind.label, it.sourceDomain].filter(Boolean).join("  ·  ")}
            </Text>
          </View>
          <TextInput
            value={titleDraft ?? it.title ?? ""}
            onChangeText={setTitleDraft}
            onBlur={saveTitle}
            placeholder="Title goes here"
            placeholderTextColor={c.placeholder}
            selectionColor={c.tint}
            style={styles.title}
            multiline
            scrollEnabled={false}
            submitBehavior="blurAndSubmit"
            returnKeyType="done"
            accessibilityLabel="Title"
            accessibilityHint="Edit to rename this memory"
          />
          <Text style={styles.meta}>
            {[it.author ? `By ${it.author.replace(/^@/, "")}` : undefined, `Saved ${timeAgoLong(it.savedAt)}`]
              .filter(Boolean)
              .join("  ·  ")}
          </Text>
          {it.status === "pending" ? (
            <View style={styles.banner} accessibilityLiveRegion="polite">
              <ActivityIndicator size="small" color={c.textMuted} />
              <Text style={styles.bannerText}>Still reading this one — summary and tags will appear shortly.</Text>
            </View>
          ) : it.status === "failed" ? (
            <View style={[styles.banner, { backgroundColor: c.dangerSoft }]}>
              <Ionicons name="warning" size={16} color={c.danger} />
              <Text style={styles.bannerText}>We couldn’t read this page. Paste the link again to retry.</Text>
            </View>
          ) : null}
        </View>

        {product ? (
          <View style={styles.priceRow} accessible accessibilityLabel={`Price ${priceLabel(product)}`}>
            <Text style={styles.price}>{priceLabel(product)}</Text>
            {product.compareAtPrice !== undefined && product.price !== undefined && product.compareAtPrice > product.price ? (
              <Text style={styles.priceWas}>{formatPrice(product.compareAtPrice, product.currency)}</Text>
            ) : null}
            {product.availability ? <Text style={styles.availability}>{product.availability}</Text> : null}
          </View>
        ) : null}

        {/* ---------- Actions ---------- */}
        <View style={styles.actions}>
          {actions.map((a) => (
            <Pressable
              key={a.label}
              accessibilityRole="button"
              accessibilityLabel={a.label}
              onPress={a.onPress}
              style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
            >
              <Ionicons name={a.icon} size={21} color={c.text} />
              <Text style={styles.actionText} numberOfLines={1}>
                {a.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* ---------- Summary ---------- */}
        {it.summary ? (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardLabel} accessibilityRole="header" accessibilityLabel="Summary">
                {it.type === "youtube" ? "TLDW" : "TLDR"}
              </Text>
            </View>
            <Text style={styles.summary} selectable>
              {it.summary}
            </Text>
          </View>
        ) : null}

        {/* ---------- Tags ---------- */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel} accessibilityRole="header">
            Vault tags
          </Text>
          <View style={styles.tags}>
            {(it.tags ?? []).map((t) => (
              <View key={t} style={styles.tag}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Tag ${t}`}
                  accessibilityHint="Shows everything with this tag"
                  onPress={() => showTag(t)}
                  style={styles.tagMain}
                >
                  <Text style={styles.tagText}>{t}</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remove tag ${t}`}
                  onPress={() => {
                    haptics.light();
                    void removeTag({ id, name: t });
                  }}
                  hitSlop={{ top: 8, bottom: 8, right: 6 }}
                  style={styles.tagRemove}
                >
                  <Ionicons name="close" size={14} color={c.textFaint} />
                </Pressable>
              </View>
            ))}
            {addingTag ? (
              <TextInput
                autoFocus
                value={tagDraft}
                onChangeText={setTagDraft}
                onSubmitEditing={() => void submitTag()}
                onBlur={() => void submitTag()}
                placeholder="New tag"
                placeholderTextColor={c.placeholder}
                selectionColor={c.tint}
                style={styles.tagInput}
                returnKeyType="done"
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={30}
                accessibilityLabel="New tag name"
              />
            ) : (
              <Pressable
                accessibilityRole="button"
                onPress={() => setAddingTag(true)}
                style={({ pressed }) => [styles.addTag, pressed && styles.pressed]}
              >
                <Ionicons name="add" size={16} color={c.onAccent} />
                <Text style={styles.addTagText}>Add tag</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* ---------- Note ---------- */}
        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionLabel} accessibilityRole="header">
              Vault notes
            </Text>
            {noteSaved && noteDraft !== null && noteDraft === (it.userNote ?? "") ? (
              <Text style={styles.savedHint} accessibilityLiveRegion="polite">
                Saved
              </Text>
            ) : null}
          </View>
          <TextInput
            value={noteValue}
            onChangeText={(v) => {
              setNoteDraft(v);
              setNoteSaved(false);
            }}
            onBlur={saveNote}
            placeholder="Type here to add a note…"
            placeholderTextColor={c.placeholder}
            selectionColor={c.tint}
            style={styles.noteInput}
            multiline
            textAlignVertical="top"
            accessibilityLabel="Your note"
          />
        </View>

        {/* ---------- Reader ---------- */}
        {hasReader ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel} accessibilityRole="header">
              {it.type === "tweet" ? "Post" : "Text"}
            </Text>
            <View style={styles.card}>
              <Markdown size="reader" onLink={openUrl} maxBlocks={readerOpen ? undefined : READER_PREVIEW_BLOCKS}>
                {(it.contentText ?? "").slice(0, readerOpen ? 40000 : 6000)}
              </Markdown>
              <ShowMore open={readerOpen} onToggle={() => setReaderOpen((v) => !v)} />
            </View>
          </View>
        ) : null}

        {/* ---------- Delete ---------- */}
        <Pressable
          accessibilityRole="button"
          onPress={() => confirmDelete(itemId, () => router.back())}
          style={({ pressed }) => [styles.delete, pressed && styles.actionPressed]}
        >
          <Text style={styles.deleteText}>Delete Memory</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function ShowMore({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const styles = useStyles(makeStyles);
  return (
    <Pressable accessibilityRole="button" onPress={onToggle} hitSlop={8} style={styles.showMore}>
      <Text style={styles.showMoreText}>{open ? "Show Less" : "Show More"}</Text>
    </Pressable>
  );
}

function NavBar({ insetTop, onShare, onMore }: { insetTop: number; onShare?: () => void; onMore?: () => void }) {
  const c = useTheme();
  const styles = useStyles(makeStyles);
  return (
    <View style={[styles.nav, { paddingTop: insetTop }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back"
        onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
        hitSlop={8}
        style={({ pressed }) => [styles.back, pressed && styles.pressed]}
      >
        <Ionicons name="chevron-back" size={26} color={c.tint} />
        <Text style={styles.backText}>Back</Text>
      </Pressable>
      <View style={styles.flex} />
      {onShare ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Share" onPress={onShare} style={({ pressed }) => [styles.navIcon, pressed && styles.pressed]}>
          <Ionicons name="share-outline" size={23} color={c.tint} />
        </Pressable>
      ) : null}
      {onMore ? (
        <Pressable accessibilityRole="button" accessibilityLabel="More actions" onPress={onMore} style={({ pressed }) => [styles.navIcon, pressed && styles.pressed]}>
          <Ionicons name="ellipsis-horizontal-circle" size={25} color={c.tint} />
        </Pressable>
      ) : null}
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    flex: { flex: 1 },
    container: { flex: 1, backgroundColor: c.bg },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    pressed: { opacity: 0.55 },
    muted: { fontSize: 15, color: c.textMuted, fontStyle: "italic" },

    nav: { flexDirection: "row", alignItems: "center", paddingHorizontal: 4, backgroundColor: c.bg },
    back: { flexDirection: "row", alignItems: "center", minHeight: HIT, paddingRight: 8 },
    backText: { fontSize: 17, color: c.tint, marginLeft: -2 },
    navIcon: { width: HIT, height: HIT, alignItems: "center", justifyContent: "center" },

    scroll: { paddingHorizontal: 16, paddingTop: 4, gap: 20 },

    heroWrap: { borderRadius: radius.lg, overflow: "hidden", backgroundColor: c.fill },
    hero: { width: "100%", backgroundColor: c.fill },
    playOverlay: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
    playCircle: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: "rgba(0,0,0,0.55)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.3)",
      alignItems: "center",
      justifyContent: "center",
    },
    playIcon: { marginLeft: 4 },

    noteHero: {
      backgroundColor: c.noteBg,
      borderColor: c.noteBorder,
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: radius.lg,
      padding: 20,
    },
    noteHeroText: { fontFamily: fonts.serif, fontSize: 24, lineHeight: 36, color: c.textBody },

    docHero: {
      backgroundColor: c.surface,
      borderRadius: radius.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      overflow: "hidden",
    },
    docHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.separator,
    },
    docName: { flex: 1, fontSize: 12, fontWeight: "500", color: c.textFaint, letterSpacing: 1.2, textTransform: "uppercase" },
    docBody: { padding: 16 },

    titleBlock: { gap: 6 },
    kindRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    kindText: { fontSize: 12, fontWeight: "500", color: c.textFaint, textTransform: "uppercase", letterSpacing: 1.5, flexShrink: 1 },
    title: { fontFamily: fonts.serif, fontSize: 30, lineHeight: 36, color: c.text, padding: 0 },
    meta: { fontSize: 15, color: c.textMuted },
    banner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginTop: 8,
      padding: 12,
      borderRadius: radius.md,
      backgroundColor: c.fill,
    },
    bannerText: { flex: 1, fontSize: 15, lineHeight: 20, color: c.text },

    priceRow: { flexDirection: "row", alignItems: "baseline", gap: 10, marginTop: -6 },
    price: { fontSize: 24, fontWeight: "700", color: c.text },
    priceWas: { fontSize: 15, color: c.textFaint, textDecorationLine: "line-through" },
    availability: { fontSize: 15, color: c.success },

    actions: { flexDirection: "row", gap: 8 },
    action: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
      minHeight: 58,
      borderRadius: radius.md,
      backgroundColor: c.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      paddingHorizontal: 4,
    },
    actionPressed: { backgroundColor: c.fillStrong },
    actionText: { fontSize: 12, fontWeight: "500", color: c.textBody },

    card: {
      backgroundColor: c.surface,
      borderRadius: radius.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      padding: 16,
      gap: 10,
    },
    cardHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
    cardLabel: { fontFamily: fonts.serifItalic, fontSize: 16, color: c.textMuted },
    summary: { fontSize: 17, lineHeight: 25, color: c.textBody },

    section: { gap: 10 },
    sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    // "VAULT TAGS" / "VAULT NOTES" — the web's small tracked caps.
    sectionLabel: { fontSize: 12, fontWeight: "500", color: c.textFaint, textTransform: "uppercase", letterSpacing: 1.8 },
    savedHint: { fontSize: 13, color: c.textFaint },

    tags: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    tag: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: c.surface,
      borderRadius: radius.full,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
    },
    tagMain: { paddingLeft: 13, paddingRight: 4, minHeight: 36, justifyContent: "center" },
    tagText: { fontSize: 15, color: c.textMuted },
    tagRemove: { width: 30, minHeight: 36, alignItems: "center", justifyContent: "center", paddingRight: 4 },
    tagInput: {
      minWidth: 120,
      minHeight: 36,
      paddingHorizontal: 13,
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: c.tint,
      fontSize: 15,
      color: c.text,
      backgroundColor: c.surface,
    },
    addTag: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      minHeight: 36,
      paddingHorizontal: 13,
      borderRadius: radius.full,
      backgroundColor: c.accent,
    },
    addTagText: { fontSize: 15, fontWeight: "500", color: c.onAccent },

    noteInput: {
      minHeight: 110,
      backgroundColor: c.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      borderRadius: radius.md,
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 14,
      fontSize: 17,
      lineHeight: 24,
      color: c.text,
    },

    showMore: { alignSelf: "flex-start", minHeight: HIT - 8, justifyContent: "center", paddingHorizontal: 16, paddingBottom: 6 },
    showMoreText: { fontSize: 17, fontWeight: "500", color: c.tint },

    delete: {
      minHeight: HIT + 6,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: c.border,
      marginTop: 8,
    },
    deleteText: { fontSize: 17, color: c.danger },
  });
