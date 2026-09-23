import { useEffect, useState } from "react";
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
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { URL_RE, useCapture } from "../lib/capture";
import { useToast } from "../components/toast";
import { fonts, HIT, type Palette, radius, useStyles, useTheme } from "../lib/theme";
import { domainOf } from "../lib/format";

/**
 * New Memory — presented as a sheet. One field takes a link or a thought;
 * documents come from the system picker.
 */
export default function CaptureScreen() {
  const router = useRouter();
  const c = useTheme();
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { saveText, pickAndSaveDocument } = useCapture();
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [clip, setClip] = useState<string | null>(null);

  const text = draft.trim();
  const isUrl = URL_RE.test(text);
  const canSave = text.length > 0 && !saving && !uploading;

  // Offer the clipboard link only when there's something link-shaped on it.
  // Reading it on iOS shows the system paste banner, so check shape first.
  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const has = Platform.OS === "ios" ? await Clipboard.hasUrlAsync() : await Clipboard.hasStringAsync();
        if (!has || !alive) return;
        if (Platform.OS === "ios") {
          setClip("");
          return;
        }
        const value = (await Clipboard.getStringAsync()).trim();
        if (alive && URL_RE.test(value)) setClip(value);
      } catch {
        /* clipboard unavailable */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const close = () => router.back();

  async function save() {
    if (!canSave) return;
    setSaving(true);
    const r = await saveText(text);
    setSaving(false);
    toast(r.message, r.ok ? "success" : "error");
    if (r.ok) close();
  }

  async function paste() {
    const value = (await Clipboard.getStringAsync()).trim();
    if (value) setDraft(value);
    setClip(null);
  }

  async function upload() {
    setUploading(true);
    const r = await pickAndSaveDocument();
    setUploading(false);
    if (!r) return;
    toast(r.message, r.ok ? "success" : "error");
    if (r.ok) close();
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: Platform.OS === "ios" ? 0 : insets.top }]}
      behavior="padding"
    >
      {Platform.OS === "ios" ? <View style={styles.grabber} accessibilityElementsHidden /> : null}
      <View style={styles.navBar}>
        <Pressable accessibilityRole="button" onPress={close} hitSlop={8} style={styles.navButton}>
          <Text style={styles.navText}>Cancel</Text>
        </Pressable>
        <Text style={styles.navTitle} accessibilityRole="header">
          New memory
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !canSave, busy: saving }}
          disabled={!canSave}
          onPress={() => void save()}
          hitSlop={8}
          style={[styles.navButton, styles.navRight]}
        >
          {saving ? (
            <ActivityIndicator color={c.tint} />
          ) : (
            <Text style={[styles.navText, styles.navDone, !canSave && styles.disabled]}>Save</Text>
          )}
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        <View style={styles.editor}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Paste a link or jot a thought…"
            placeholderTextColor={c.placeholder}
            selectionColor={c.tint}
            style={styles.input}
            multiline
            autoFocus
            textAlignVertical="top"
            accessibilityLabel="Link or note"
            accessibilityHint="Links are saved and summarized automatically. Anything else becomes a note."
          />
          <View style={styles.detect} accessibilityLiveRegion="polite">
            <Ionicons name={isUrl ? "link" : text ? "document-text-outline" : "sparkles-outline"} size={15} color={isUrl ? c.tint : c.textFaint} />
            <Text style={[styles.detectText, isUrl && { color: c.tint }]} numberOfLines={1}>
              {isUrl
                ? `Link from ${domainOf(text.startsWith("www.") ? `https://${text}` : text)}`
                : text
                  ? "Will be saved as a note"
                  : "Links get summarized and tagged for you"}
            </Text>
          </View>
        </View>

        {clip !== null && !text ? (
          <Pressable
            accessibilityRole="button"
            accessibilityHint="Pastes the link from your clipboard"
            onPress={() => void paste()}
            style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
          >
            <View style={styles.optionIcon}>
              <Ionicons name="clipboard-outline" size={18} color={c.text} />
            </View>
            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>Paste link</Text>
              <Text style={styles.optionSub} numberOfLines={1}>
                {clip ? clip : "From your clipboard"}
              </Text>
            </View>
          </Pressable>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ busy: uploading }}
          accessibilityHint="Choose a PDF, Word, slides, spreadsheet or EPUB file up to 15 MB"
          disabled={uploading}
          onPress={() => void upload()}
          style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
        >
          <View style={styles.optionIcon}>
            {uploading ? <ActivityIndicator color={c.text} size="small" /> : <Ionicons name="document-attach-outline" size={18} color={c.text} />}
          </View>
          <View style={styles.optionText}>
            <Text style={styles.optionTitle}>{uploading ? "Uploading…" : "Upload a file"}</Text>
            <Text style={styles.optionSub}>PDF, Word, slides, spreadsheets, EPUB · up to 15 MB</Text>
          </View>
          <Ionicons name="chevron-forward" size={17} color={c.borderStrong} />
        </Pressable>

        <Text style={styles.footnote}>
          Tip: share from Safari, X, Instagram or YouTube straight to MindVault — it saves without opening the app.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (c: Palette) => {
  const sheetBg = Platform.OS === "ios" ? c.surface : c.bg;
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: sheetBg },
    grabber: {
      alignSelf: "center",
      width: 36,
      height: 5,
      borderRadius: 3,
      backgroundColor: c.borderStrong,
      marginTop: 6,
    },
    navBar: { flexDirection: "row", alignItems: "center", minHeight: 52, paddingHorizontal: 8 },
    navButton: { minWidth: 72, minHeight: HIT, justifyContent: "center", paddingHorizontal: 8 },
    navRight: { alignItems: "flex-end" },
    navTitle: { flex: 1, textAlign: "center", fontFamily: fonts.serif, fontSize: 21, color: c.text },
    navText: { fontSize: 17, color: c.tint },
    navDone: { fontWeight: "600" },
    disabled: { opacity: 0.35 },
    body: { paddingHorizontal: 16, gap: 12, paddingTop: 4 },
    editor: {
      backgroundColor: Platform.OS === "ios" ? c.surfaceAlt : c.surface,
      borderRadius: radius.md,
      padding: 16,
      gap: 12,
    },
    input: { fontFamily: fonts.serif, fontSize: 21, lineHeight: 28, color: c.text, minHeight: 150, padding: 0 },
    detect: { flexDirection: "row", alignItems: "center", gap: 6 },
    detectText: { fontSize: 13, color: c.textFaint, flexShrink: 1 },
    option: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      minHeight: 64,
      paddingHorizontal: 14,
      borderRadius: radius.md,
      backgroundColor: Platform.OS === "ios" ? c.surfaceAlt : c.surface,
    },
    optionPressed: { backgroundColor: c.fillStrong },
    optionIcon: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: c.fill },
    optionText: { flex: 1, gap: 2, paddingVertical: 10 },
    optionTitle: { fontSize: 17, color: c.text, fontWeight: "500" },
    optionSub: { fontSize: 13, color: c.textMuted },
    footnote: { fontSize: 13, lineHeight: 18, color: c.textFaint, marginTop: 8, marginHorizontal: 4 },
  });
};
