import { useCallback, useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  Keyboard,
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
import * as Clipboard from "expo-clipboard";
import { useAction } from "convex/react";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useReducedMotion } from "react-native-reanimated";
import { api } from "../../lib/backend";
import type { Card } from "../../lib/types";
import { ASK_MODELS, modelName, setPrefs, usePrefs } from "../../lib/prefs";
import { pendingAskStore } from "../../lib/vault-filter";
import { useOpenItem } from "../../components/card-feed";
import { useActionSheet } from "../../components/action-sheet";
import { useToast } from "../../components/toast";
import { Markdown } from "../../components/markdown";
import { IconButton } from "../../components/ui";
import { useOpenUrl } from "../../lib/item-actions";
import { haptics } from "../../lib/haptics";
import { fonts, HIT, type Palette, radius, useStyles, useTheme } from "../../lib/theme";

type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
  sources?: Card[];
  error?: boolean;
};

const SUGGESTIONS = [
  { icon: "calendar-outline" as const, text: "What did I save this week?" },
  { icon: "newspaper-outline" as const, text: "Summarize my recent articles" },
  { icon: "logo-x" as const, text: "Any posts about design?" },
  { icon: "bulb-outline" as const, text: "What have I noted about Convex?" },
];

let nextId = 0;
const newId = () => `m${++nextId}`;

export default function AskScreen() {
  const c = useTheme();
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const reduceMotion = useReducedMotion();
  const askVault = useAction(api.ask.askVault);
  const { askModel } = usePrefs();
  const showSheet = useActionSheet();
  const toast = useToast();
  const openItem = useOpenItem();
  const openUrl = useOpenUrl();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [typing, setTyping] = useState<{ id: string; shown: number } | null>(null);
  const [keyboardUp, setKeyboardUp] = useState(false);
  const seq = useRef(0);
  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow", () => setKeyboardUp(true));
    const hide = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide", () => setKeyboardUp(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  // Reveal answers a few words at a time so they read like they're being
  // written. Reduce Motion shows them whole.
  useEffect(() => {
    if (!typing) return;
    const msg = messages.find((m) => m.id === typing.id);
    if (!msg || typing.shown >= msg.text.length) {
      setTyping(null);
      return;
    }
    const t = setTimeout(() => {
      const next = msg.text.indexOf(" ", typing.shown + 18);
      setTyping({ id: typing.id, shown: next === -1 ? msg.text.length : next });
    }, 24);
    return () => clearTimeout(t);
  }, [typing, messages]);

  const send = useCallback(
    async (raw: string) => {
      const q = raw.trim();
      if (!q || busy) return;
      haptics.light();
      const history = messages
        .filter((m) => !m.error)
        .map((m) => ({ role: m.role, content: m.text }));
      const userMsg: Message = { id: newId(), role: "user", text: q };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setBusy(true);
      const mine = ++seq.current;
      try {
        const r = await askVault({ q, model: askModel, history });
        if (mine !== seq.current) return;
        const reply: Message = { id: newId(), role: "assistant", text: r.answer, sources: r.sources as Card[] };
        setMessages((prev) => [...prev, reply]);
        if (!reduceMotion) setTyping({ id: reply.id, shown: 0 });
        AccessibilityInfo.announceForAccessibility("Answer ready");
      } catch {
        if (mine !== seq.current) return;
        setMessages((prev) => [
          ...prev,
          { id: newId(), role: "assistant", text: "Couldn’t reach your vault. Check your connection and try again.", error: true },
        ]);
        haptics.error();
      } finally {
        if (mine === seq.current) setBusy(false);
      }
    },
    [busy, messages, askVault, askModel, reduceMotion],
  );

  // A question handed over from Search.
  useFocusEffect(
    useCallback(() => {
      const q = pendingAskStore.get();
      if (q) {
        pendingAskStore.set(null);
        void send(q);
      }
    }, [send]),
  );

  function stop() {
    seq.current += 1;
    setBusy(false);
    haptics.light();
  }

  function reset() {
    seq.current += 1;
    setBusy(false);
    setTyping(null);
    setMessages([]);
    setInput("");
  }

  function pickModel() {
    showSheet({
      title: "Answer with",
      actions: ASK_MODELS.map((m) => ({
        label: m.name,
        selected: m.id === askModel,
        onPress: () => setPrefs({ askModel: m.id }),
      })),
    });
  }

  function retry(errorId: string) {
    const idx = messages.findIndex((m) => m.id === errorId);
    const question = [...messages.slice(0, idx)].reverse().find((m) => m.role === "user");
    if (!question) return;
    setMessages((prev) => prev.filter((m) => m.id !== errorId && m.id !== question.id));
    void send(question.text);
  }

  const canSend = input.trim().length > 0 && !busy;
  const composerBottom = keyboardUp ? 8 : Platform.OS === "ios" ? tabBarHeight + 8 : 10;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[styles.nav, { paddingTop: insets.top }]}>
        <View style={styles.navSide} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Ask. Model: ${modelName(askModel)}`}
          accessibilityHint="Changes the model that writes answers"
          onPress={pickModel}
          style={({ pressed }) => [styles.navCenter, pressed && styles.pressed]}
        >
          <Text style={styles.navTitle}>ask my vault</Text>
          <View style={styles.modelRow}>
            <Text style={styles.modelText}>{modelName(askModel)}</Text>
            <Ionicons name="chevron-down" size={12} color={c.textMuted} />
          </View>
        </Pressable>
        <View style={[styles.navSide, styles.navRight]}>
          <IconButton icon="create-outline" label="New conversation" disabled={messages.length === 0} onPress={reset} />
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.flex}
        contentContainerStyle={[styles.thread, messages.length === 0 && styles.threadEmpty]}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: !reduceMotion })}
      >
        {messages.length === 0 ? (
          <View style={styles.welcome}>
            <Ionicons name="sparkles" size={34} color={c.placeholder} style={styles.welcomeMark} />
            <Text style={styles.welcomeTitle} accessibilityRole="header">
              Ask your vault
            </Text>
            <Text style={styles.welcomeBody}>
              Answers come from what you’ve saved — articles, posts, notes and documents — with the sources attached.
            </Text>
            <View style={styles.suggestions}>
              {SUGGESTIONS.map((s) => (
                <Pressable
                  key={s.text}
                  accessibilityRole="button"
                  accessibilityHint="Asks this question"
                  onPress={() => void send(s.text)}
                  style={({ pressed }) => [styles.suggestion, pressed && styles.suggestionPressed]}
                >
                  <Ionicons name={s.icon} size={18} color={c.textMuted} />
                  <Text style={styles.suggestionText}>{s.text}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : (
          messages.map((m) =>
            m.role === "user" ? (
              <View key={m.id} style={styles.userRow}>
                <View style={styles.userBubble} accessible accessibilityLabel={`You asked: ${m.text}`}>
                  <Text style={styles.userText} selectable>
                    {m.text}
                  </Text>
                </View>
              </View>
            ) : (
              <View key={m.id} style={styles.answer}>
                {m.sources && m.sources.length > 0 ? (
                  <Sources cards={m.sources} onOpen={openItem} />
                ) : null}
                {m.error ? (
                  <View style={styles.errorBox}>
                    <Ionicons name="alert-circle" size={18} color={c.danger} />
                    <Text style={styles.errorText}>{m.text}</Text>
                    <Pressable accessibilityRole="button" onPress={() => retry(m.id)} hitSlop={8}>
                      <Text style={styles.retry}>Retry</Text>
                    </Pressable>
                  </View>
                ) : (
                  <>
                    <Markdown onLink={openUrl}>
                      {typing?.id === m.id ? m.text.slice(0, typing.shown) : m.text}
                    </Markdown>
                    {typing?.id !== m.id ? (
                      <View style={styles.answerActions}>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Copy answer"
                          onPress={() => {
                            void Clipboard.setStringAsync(m.text).then(() => toast("Answer copied"));
                          }}
                          style={({ pressed }) => [styles.answerAction, pressed && styles.pressed]}
                        >
                          <Ionicons name="copy-outline" size={17} color={c.textMuted} />
                        </Pressable>
                      </View>
                    ) : null}
                  </>
                )}
              </View>
            ),
          )
        )}
        {busy ? (
          <View style={styles.thinking} accessibilityLiveRegion="polite" accessibilityLabel="Searching your vault">
            <ActivityIndicator size="small" color={c.tint} />
            <Text style={styles.thinkingText}>Searching your vault…</Text>
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.composerWrap, { paddingBottom: composerBottom }]}>
        <View style={styles.composer}>
          <TextInput
            ref={inputRef}
            value={input}
            onChangeText={setInput}
            placeholder="Ask my vault…"
            placeholderTextColor={c.placeholder}
            selectionColor={c.tint}
            multiline
            style={styles.input}
            accessibilityLabel="Question"
            submitBehavior="submit"
            returnKeyType="send"
            onSubmitEditing={() => void send(input)}
          />
          {busy ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Stop" onPress={stop} style={styles.sendButton}>
              <View style={[styles.sendCircle, { backgroundColor: c.inverse }]}>
                <View style={[styles.stopSquare, { backgroundColor: c.inverseText }]} />
              </View>
            </Pressable>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Send"
              accessibilityState={{ disabled: !canSend }}
              disabled={!canSend}
              onPress={() => void send(input)}
              style={styles.sendButton}
            >
              <View style={[styles.sendCircle, { backgroundColor: canSend ? c.tint : c.fillStrong }]}>
                <Ionicons name="arrow-up" size={19} color={canSend ? c.onTint : c.textFaint} />
              </View>
            </Pressable>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function Sources({ cards, onOpen }: { cards: Card[]; onOpen: (c: Card) => void }) {
  const c = useTheme();
  const styles = useStyles(makeStyles);
  return (
    <View>
      <Text style={styles.sourcesLabel}>
        From {cards.length} {cards.length === 1 ? "memory" : "memories"}
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sourcesRow}>
        {cards.map((card) => (
          <Pressable
            key={card.id}
            accessibilityRole="button"
            accessibilityLabel={`Source: ${card.title ?? card.sourceDomain ?? card.type}`}
            onPress={() => onOpen(card)}
            style={({ pressed }) => [styles.source, pressed && styles.pressed]}
          >
            {card.thumbnailUrl ? (
              <Image source={{ uri: card.thumbnailUrl }} style={styles.sourceThumb} contentFit="cover" />
            ) : (
              <View style={[styles.sourceThumb, styles.sourceThumbEmpty]}>
                <Ionicons name={card.type === "note" ? "document-text-outline" : "bookmark-outline"} size={16} color={c.textFaint} />
              </View>
            )}
            <View style={styles.sourceText}>
              <Text style={styles.sourceTitle} numberOfLines={2}>
                {card.title ?? card.preview ?? "Untitled"}
              </Text>
              {card.sourceDomain ? (
                <Text style={styles.sourceDomain} numberOfLines={1}>
                  {card.sourceDomain}
                </Text>
              ) : null}
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    flex: { flex: 1 },
    container: { flex: 1, backgroundColor: c.bg },
    pressed: { opacity: 0.55 },
    nav: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 6,
      paddingBottom: 4,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.separator,
      backgroundColor: c.bg,
    },
    navSide: { width: 60 },
    navRight: { alignItems: "flex-end" },
    navCenter: { flex: 1, alignItems: "center", minHeight: HIT, justifyContent: "center" },
    navTitle: { fontFamily: fonts.serifItalic, fontSize: 21, color: c.text },
    modelRow: { flexDirection: "row", alignItems: "center", gap: 3 },
    modelText: { fontSize: 12, color: c.textMuted },

    thread: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16, gap: 20 },
    threadEmpty: { flexGrow: 1, justifyContent: "center" },

    welcome: { alignItems: "center", paddingHorizontal: 8 },
    welcomeMark: { marginBottom: 14 },
    welcomeTitle: { fontFamily: fonts.serifItalic, fontSize: 30, lineHeight: 36, color: c.text, textAlign: "center" },
    welcomeBody: { fontSize: 16, lineHeight: 22, color: c.textMuted, textAlign: "center", marginTop: 8, maxWidth: 340 },
    suggestions: { alignSelf: "stretch", gap: 8, marginTop: 28 },
    suggestion: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      minHeight: HIT + 8,
      paddingHorizontal: 16,
      borderRadius: radius.full,
      backgroundColor: c.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
    },
    suggestionPressed: { backgroundColor: c.fillStrong },
    suggestionText: { flex: 1, fontSize: 16, color: c.textBody },

    userRow: { flexDirection: "row", justifyContent: "flex-end", paddingLeft: 48 },
    userBubble: { backgroundColor: c.tint, borderRadius: 20, borderBottomRightRadius: 6, paddingHorizontal: 15, paddingVertical: 10 },
    userText: { fontSize: 17, lineHeight: 23, color: c.onTint },

    answer: { gap: 12 },
    answerActions: { flexDirection: "row", gap: 4, marginLeft: -10 },
    answerAction: { width: HIT, height: HIT - 8, alignItems: "center", justifyContent: "center" },
    sourcesLabel: { fontSize: 13, fontWeight: "600", color: c.textMuted, marginBottom: 8 },
    sourcesRow: { gap: 8, paddingRight: 16 },
    source: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      width: 220,
      padding: 8,
      borderRadius: radius.md,
      backgroundColor: c.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
    },
    sourceThumb: { width: 44, height: 44, borderRadius: 8, backgroundColor: c.fill },
    sourceThumbEmpty: { alignItems: "center", justifyContent: "center" },
    sourceText: { flex: 1, gap: 2 },
    sourceTitle: { fontSize: 14, fontWeight: "600", lineHeight: 18, color: c.text },
    sourceDomain: { fontSize: 12, color: c.textFaint },

    errorBox: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: radius.md, backgroundColor: c.dangerSoft },
    errorText: { flex: 1, fontSize: 15, lineHeight: 20, color: c.text },
    retry: { fontSize: 15, fontWeight: "600", color: c.tint },

    thinking: { flexDirection: "row", alignItems: "center", gap: 10 },
    thinkingText: { fontSize: 15, color: c.textMuted, fontStyle: "italic" },

    composerWrap: {
      paddingHorizontal: 12,
      paddingTop: 8,
      backgroundColor: c.bg,
    },
    composer: {
      flexDirection: "row",
      alignItems: "flex-end",
      backgroundColor: c.surface,
      borderRadius: 22,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      paddingLeft: 16,
      paddingRight: 4,
      minHeight: HIT,
    },
    input: { flex: 1, fontSize: 17, lineHeight: 22, color: c.text, paddingTop: 11, paddingBottom: 11, maxHeight: 140 },
    sendButton: { width: HIT, height: HIT, alignItems: "center", justifyContent: "center" },
    sendCircle: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
    stopSquare: { width: 11, height: 11, borderRadius: 2 },
  });
