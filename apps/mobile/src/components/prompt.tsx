import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from "react";
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { HIT, type Palette, radius, useStyles, useTheme } from "../lib/theme";

type PromptRequest = {
  title: string;
  message?: string;
  placeholder?: string;
  confirmLabel?: string;
  onSubmit: (value: string) => void;
};

const PromptContext = createContext<(req: PromptRequest) => void>(() => {});

export function usePrompt() {
  return useContext(PromptContext);
}

/**
 * A one-field text prompt. iOS uses the system alert with a text field;
 * elsewhere a dialog drawn to the same proportions.
 */
export function PromptProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<PromptRequest | null>(null);

  const show = useCallback((req: PromptRequest) => {
    if (Platform.OS === "ios") {
      Alert.prompt(
        req.title,
        req.message,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: req.confirmLabel ?? "Save",
            isPreferred: true,
            onPress: (value?: string) => {
              const v = value?.trim();
              if (v) req.onSubmit(v);
            },
          },
        ],
        "plain-text",
        "",
        "default",
      );
      return;
    }
    setRequest(req);
  }, []);

  const value = useMemo(() => show, [show]);

  return (
    <PromptContext.Provider value={value}>
      {children}
      {request ? <PromptDialog request={request} onClose={() => setRequest(null)} /> : null}
    </PromptContext.Provider>
  );
}

function PromptDialog({ request, onClose }: { request: PromptRequest; onClose: () => void }) {
  const c = useTheme();
  const styles = useStyles(makeStyles);
  const [value, setValue] = useState("");
  const submit = () => {
    const v = value.trim();
    if (!v) return;
    onClose();
    request.onSubmit(v);
  };
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView style={styles.backdrop} behavior="padding">
        <View style={styles.dialog} accessibilityViewIsModal>
          <Text style={styles.title} accessibilityRole="header">
            {request.title}
          </Text>
          {request.message ? <Text style={styles.message}>{request.message}</Text> : null}
          <TextInput
            autoFocus
            value={value}
            onChangeText={setValue}
            placeholder={request.placeholder}
            placeholderTextColor={c.placeholder}
            selectionColor={c.tint}
            onSubmitEditing={submit}
            returnKeyType="done"
            style={styles.input}
            accessibilityLabel={request.placeholder ?? request.title}
            maxLength={40}
          />
          <View style={styles.actions}>
            <Pressable accessibilityRole="button" onPress={onClose} style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
              <Text style={styles.actionText}>Cancel</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: !value.trim() }}
              disabled={!value.trim()}
              onPress={submit}
              style={({ pressed }) => [styles.action, styles.actionDivider, pressed && styles.pressed]}
            >
              <Text style={[styles.actionText, styles.actionPrimary, !value.trim() && styles.disabled]}>
                {request.confirmLabel ?? "Save"}
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: c.overlay, alignItems: "center", justifyContent: "center", padding: 32 },
    dialog: { width: "100%", maxWidth: 320, backgroundColor: c.elevated, borderRadius: radius.md, overflow: "hidden" },
    title: { fontSize: 17, fontWeight: "600", color: c.text, textAlign: "center", marginTop: 20, marginHorizontal: 16 },
    message: { fontSize: 13, color: c.textMuted, textAlign: "center", marginTop: 4, marginHorizontal: 16 },
    input: {
      margin: 16,
      marginTop: 14,
      paddingHorizontal: 10,
      paddingVertical: 9,
      fontSize: 15,
      color: c.text,
      backgroundColor: c.fill,
      borderRadius: 8,
    },
    actions: { flexDirection: "row", borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.separator },
    action: { flex: 1, minHeight: HIT, alignItems: "center", justifyContent: "center" },
    actionDivider: { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: c.separator },
    actionText: { fontSize: 17, color: c.tint },
    actionPrimary: { fontWeight: "600" },
    disabled: { opacity: 0.35 },
    pressed: { backgroundColor: c.fill },
  });
