import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useConvexAuth } from "@convex-dev/auth/react";
import { api } from "../../lib/backend";
import type { Id } from "../../lib/backend";
import type { Detail } from "../../lib/types";
import { colors, fonts, radius } from "../../lib/theme";
import { timeAgoLong } from "../../lib/format";

export default function ItemPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isLoading, isAuthenticated } = useConvexAuth();

  if (!id || isLoading || !isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <Center>
          <ActivityIndicator color={colors.textFaint} />
        </Center>
      </SafeAreaView>
    );
  }
  return <ItemScreen itemId={id} />;
}

function ItemScreen({ itemId }: { itemId: string }) {
  const item = useQuery(api.items.get, { id: itemId as Id<"items"> });
  const update = useMutation(api.items.update);
  const addTag = useMutation(api.items.addTag);
  const removeTag = useMutation(api.items.removeTag);
  const removeItem = useMutation(api.items.removeItem);

  const [titleDraft, setTitleDraft] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState<string | null>(null);
  const [addingTag, setAddingTag] = useState(false);
  const [tagDraft, setTagDraft] = useState("");

  if (item === undefined)
    return (
      <SafeAreaView style={styles.container}>
        <Header canShare={false} url={undefined} title={undefined} />
        <Center>
          <ActivityIndicator color={colors.textFaint} />
        </Center>
      </SafeAreaView>
    );
  if (item === null)
    return (
      <SafeAreaView style={styles.container}>
        <Header canShare={false} url={undefined} title={undefined} />
        <Center>
          <Text style={styles.emptyTitle}>This memory is gone.</Text>
        </Center>
      </SafeAreaView>
    );

  const it = item as Detail & { tags?: string[] };
  const embed =
    typeof it.embedJson === "object" && it.embedJson !== null
      ? (it.embedJson as Record<string, unknown>)
      : {};
  const isYouTube = it.type === "youtube";
  const isInstagram = it.type === "instagram";
  const isNote = it.type === "note";
  const doneLabel =
    it.type === "instagram"
      ? "I've watched this reel"
      : isYouTube
        ? "I've watched this video"
        : it.type === "article"
          ? "Mark as read"
          : "Mark as done";

  async function submitTag() {
    const name = tagDraft.trim();
    setTagDraft("");
    setAddingTag(false);
    if (name.length >= 2) {
      try {
        await addTag({ id: itemId as Id<"items">, name });
      } catch {}
    }
  }

  function saveNote() {
    if (noteDraft !== null && noteDraft !== (it.userNote ?? "")) {
      void update({
        id: itemId as Id<"items">,
        userNote: noteDraft,
      });
    }
  }

  function confirmDelete() {
    Alert.alert("Delete this memory?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void removeItem({ id: itemId as Id<"items"> }).then(() =>
            router.back(),
          );
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header url={it.url} title={it.title} canShare />

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* Media */}
        {isYouTube && typeof embed.videoId === "string" ? (
          <Pressable
            style={({ pressed }) => [styles.heroWrap, pressed && styles.pressed]}
            onPress={() => it.url && void Linking.openURL(it.url)}
          >
            {it.thumbnailUrl ? (
              <Image
                source={{ uri: it.thumbnailUrl }}
                style={[styles.heroImage, styles.heroVideo]}
                contentFit="cover"
              />
            ) : (
              <View style={[styles.heroImage, styles.heroVideo, styles.heroPlaceholder]}>
                <Ionicons name="logo-youtube" size={40} color={colors.textFaint} />
              </View>
            )}
            <View style={styles.playOverlay}>
              <View style={styles.playCircle}>
                <Ionicons
                  name="play"
                  size={22}
                  color="#fff"
                  style={styles.playIcon}
                />
              </View>
              <Text style={styles.playHint}>Watch on YouTube</Text>
            </View>
          </Pressable>
        ) : isInstagram && it.thumbnailUrl ? (
          <Pressable
            style={({ pressed }) => [styles.heroWrap, pressed && styles.pressed]}
            onPress={() => it.url && void Linking.openURL(it.url)}
          >
            <Image
              source={{ uri: it.thumbnailUrl }}
              style={[styles.heroImage, styles.heroInstagram]}
              contentFit="cover"
            />
          </Pressable>
        ) : it.thumbnailUrl && !isNote ? (
          <Image
            source={{ uri: it.thumbnailUrl }}
            style={styles.heroImage}
            contentFit="cover"
          />
        ) : isNote && it.contentText ? (
          <View style={styles.noteBody}>
            <Text style={styles.noteText}>{it.contentText}</Text>
          </View>
        ) : it.contentText ? (
          <View style={styles.reader}>
            {it.contentText.slice(0, 16000).split(/\n{2,}/).map((p, i) => (
              <Text key={i} style={styles.paragraph}>
                {p}
              </Text>
            ))}
            <OriginalLink url={it.url} />
          </View>
        ) : (
          <View style={styles.failedBox}>
            <Ionicons name="cloud-offline-outline" size={20} color={colors.textFaint} />
            <Text style={styles.failedText}>
              We couldn&apos;t extract this one.{it.url ? " You can still open the original." : ""}
            </Text>
          </View>
        )}

        {/* Editable title */}
        <TextInput
          value={titleDraft ?? it.title ?? ""}
          onChangeText={setTitleDraft}
          onBlur={() => {
            if (titleDraft !== null && titleDraft !== it.title) {
              void update({ id: itemId as Id<"items">, title: titleDraft });
            }
          }}
          placeholder="Title goes here"
          placeholderTextColor={colors.textFaint}
          style={styles.titleInput}
          multiline
        />
        <Text style={styles.metaLine}>
          {timeAgoLong(it.savedAt)}
          {it.sourceDomain ? `  ·  ${it.sourceDomain}` : ""}
        </Text>

        {/* Summary */}
        {it.summary ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{isYouTube ? "TLDW" : "TLDR"}</Text>
            <View style={styles.tldrBox}>
              <Text style={styles.tldrText}>{it.summary}</Text>
            </View>
          </View>
        ) : null}

        {/* Done toggle */}
        <Pressable
          style={({ pressed }) => [
            styles.doneButton,
            it.isDone && styles.doneButtonActive,
            pressed && styles.pressed,
          ]}
          onPress={() =>
            void update({ id: itemId as Id<"items">, isDone: !it.isDone })
          }
        >
          <Ionicons
            name={it.isDone ? "checkmark-circle" : "checkmark-circle-outline"}
            size={17}
            color={it.isDone ? colors.done : colors.textMuted}
          />
          <Text
            style={[
              styles.doneButtonText,
              it.isDone && styles.doneButtonTextActive,
            ]}
          >
            {it.isDone ? "Done" : doneLabel}
          </Text>
        </Pressable>

        {/* Tags */}
        <View style={styles.section}>
          <Text style={styles.sectionLabelCaps}>MIND TAGS</Text>
          <View style={styles.tagRow}>
            {(it.tags ?? []).map((t) => (
              <View key={t} style={styles.chip}>
                <Text style={styles.chipText}>#{t}</Text>
                <Pressable
                  onPress={() =>
                    void removeTag({ id: itemId as Id<"items">, name: t })
                  }
                  hitSlop={8}
                >
                  <Ionicons name="close" size={13} color={colors.textFaint} />
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
                placeholder="tag name…"
                placeholderTextColor={colors.textFaint}
                style={styles.tagInput}
                returnKeyType="done"
                autoCapitalize="none"
                autoCorrect={false}
              />
            ) : (
              <Pressable
                style={({ pressed }) => [
                  styles.addChip,
                  pressed && styles.pressed,
                ]}
                onPress={() => setAddingTag(true)}
              >
                <Ionicons name="add" size={13} color="#fff" />
                <Text style={styles.addChipText}>Add tag</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionLabelCaps}>MIND NOTES</Text>
          <TextInput
            value={noteDraft ?? it.userNote ?? ""}
            onChangeText={setNoteDraft}
            onBlur={saveNote}
            placeholder="Type here to add a private note… searchable too."
            placeholderTextColor={colors.textFaint}
            style={styles.noteInput}
            multiline
          />
        </View>

        {/* Delete */}
        <Pressable
          style={({ pressed }) => [
            styles.deleteButton,
            pressed && styles.pressed,
          ]}
          onPress={confirmDelete}
        >
          <Ionicons name="trash-outline" size={16} color={colors.danger} />
          <Text style={styles.deleteText}>Delete memory</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function OriginalLink({ url }: { url?: string }) {
  if (!url) return null;
  return (
    <Pressable onPress={() => void Linking.openURL(url)}>
      <Text style={styles.readMore}>Open original for the full piece ↗</Text>
    </Pressable>
  );
}

function Header({
  url,
  title,
  canShare,
}: {
  url?: string;
  title?: string;
  canShare?: boolean;
}) {
  async function share() {
    try {
      await Share.share({ message: [title, url].filter(Boolean).join("\n") });
    } catch {}
  }
  return (
    <View style={styles.headerRow}>
      <Pressable
        onPress={() => router.back()}
        hitSlop={10}
        style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}
      >
        <Ionicons name="chevron-back" size={25} color={colors.text} />
      </Pressable>
      <View style={styles.headerSpacer} />
      {url ? (
        <>
          {canShare ? (
            <Pressable
              onPress={() => void share()}
              hitSlop={10}
              style={({ pressed }) => [
                styles.headerButton,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons
                name="share-outline"
                size={21}
                color={colors.textMuted}
              />
            </Pressable>
          ) : null}
          <Pressable
            onPress={() => void Linking.openURL(url)}
            hitSlop={10}
            style={({ pressed }) => [
              styles.headerButton,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons name="open-outline" size={21} color={colors.textMuted} />
          </Pressable>
        </>
      ) : null}
    </View>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <View style={styles.center}>{children}</View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.bg,
  },
  headerButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  headerSpacer: { flex: 1 },
  scroll: { padding: 18, paddingBottom: 60, gap: 16 },
  pressed: { opacity: 0.6 },
  heroWrap: { position: "relative" },
  heroImage: {
    width: "100%",
    aspectRatio: 16 / 10,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
  },
  heroVideo: {},
  heroInstagram: { aspectRatio: 4 / 5, alignSelf: "center", maxWidth: 380 },
  heroPlaceholder: { alignItems: "center", justifyContent: "center" },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  playCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(12,10,9,0.62)",
    alignItems: "center",
    justifyContent: "center",
  },
  playIcon: { marginLeft: 3 },
  playHint: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowRadius: 4,
  },
  noteBody: {
    backgroundColor: colors.noteBg,
    borderColor: colors.noteBorder,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 18,
  },
  noteText: {
    fontFamily: fonts.serif,
    fontSize: 19,
    lineHeight: 31,
    color: colors.textBody,
  },
  reader: { gap: 14 },
  paragraph: { fontSize: 15, lineHeight: 24, color: colors.textBody },
  readMore: { color: colors.accent, fontSize: 14, fontWeight: "600" },
  failedBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 16,
    borderStyle: "dashed",
  },
  failedText: {
    flexShrink: 1,
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  titleInput: {
    fontFamily: fonts.serif,
    fontSize: 26,
    fontWeight: "700",
    color: colors.text,
    lineHeight: 34,
    padding: 0,
  },
  metaLine: { fontSize: 12.5, color: colors.textFaint, marginTop: -8 },
  section: { gap: 8, marginTop: 2 },
  sectionLabel: {
    fontFamily: fonts.serif,
    fontStyle: "italic",
    fontSize: 14,
    color: colors.textMuted,
  },
  sectionLabelCaps: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1.5,
    color: colors.textFaint,
  },
  tldrBox: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 14,
    backgroundColor: colors.surface,
  },
  tldrText: { fontSize: 14, lineHeight: 22, color: colors.textBody },
  doneButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderRadius: radius.full,
    paddingVertical: 13,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  doneButtonActive: {
    backgroundColor: colors.doneSoft,
    borderColor: "#a7f3d0",
  },
  doneButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textMuted,
  },
  doneButtonTextActive: { color: colors.done },
  tagRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingLeft: 11,
    paddingRight: 8,
    paddingVertical: 6,
    backgroundColor: colors.surface,
  },
  chipText: { fontSize: 12.5, color: colors.textMuted },
  tagInput: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.full,
    paddingHorizontal: 13,
    paddingVertical: 7,
    fontSize: 12.5,
    minWidth: 110,
    color: colors.text,
  },
  addChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.accent,
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  addChipText: { color: "#fff", fontSize: 12.5, fontWeight: "600" },
  noteInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 14,
    lineHeight: 21,
    minHeight: 96,
    textAlignVertical: "top",
    color: colors.text,
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderRadius: radius.full,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: "#fecaca",
    backgroundColor: colors.dangerSoft,
    marginTop: 8,
  },
  deleteText: { color: colors.danger, fontSize: 14, fontWeight: "600" },
  emptyTitle: {
    fontFamily: fonts.serif,
    fontSize: 22,
    fontStyle: "italic",
    color: colors.textFaint,
  },
});
