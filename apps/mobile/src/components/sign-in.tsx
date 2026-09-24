import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthActions } from "@convex-dev/auth/react";
import { fonts, HIT, type Palette, radius, useStyles, useTheme } from "../lib/theme";
import { haptics } from "../lib/haptics";

export function SignIn() {
  const { signIn } = useAuthActions();
  const c = useTheme();
  const styles = useStyles(makeStyles);
  const [passphrase, setPassphrase] = useState("");
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const canSubmit = passphrase.length > 0 && !busy;

  async function handleSubmit() {
    if (!canSubmit) return;
    setBusy(true);
    setError(false);
    try {
      // A rejected passphrase resolves with signingIn: false rather than
      // throwing, so check the result too.
      const { signingIn } = await signIn("passphrase", { passphrase });
      if (!signingIn) throw new Error("Wrong passphrase");
      haptics.success();
    } catch {
      haptics.error();
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.container} behavior="padding">
        <View style={styles.hero}>
          <Text style={styles.wordmark} accessibilityRole="header">
            MindVault
          </Text>
          <Text style={styles.tagline}>Remember everything. Organize nothing.</Text>
        </View>

        <View style={styles.form}>
          <View style={[styles.field, error && styles.fieldError]}>
            <Ionicons name="lock-closed" size={17} color={c.textFaint} />
            <TextInput
              value={passphrase}
              onChangeText={(v) => {
                setPassphrase(v);
                setError(false);
              }}
              placeholder="Your passphrase"
              placeholderTextColor={c.placeholder}
              secureTextEntry={!visible}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="go"
              selectionColor={c.tint}
              style={styles.input}
              onSubmitEditing={handleSubmit}
              accessibilityLabel="Passphrase"
              accessibilityHint="The passphrase that unlocks your vault"
            />
            <Pressable
              onPress={() => setVisible((v) => !v)}
              accessibilityRole="button"
              accessibilityLabel={visible ? "Hide passphrase" : "Show passphrase"}
              style={styles.eye}
            >
              <Ionicons name={visible ? "eye-off" : "eye"} size={20} color={c.textFaint} />
            </Pressable>
          </View>
          {/* Fixed-height slot so the button doesn't jump when the error appears. */}
          <View style={styles.errorSlot} accessibilityLiveRegion="assertive">
            {error ? <Text style={styles.error}>Wrong passphrase.</Text> : null}
          </View>

          <Pressable
            style={({ pressed }) => [styles.button, !canSubmit && styles.buttonDisabled, pressed && canSubmit && styles.pressed]}
            onPress={handleSubmit}
            disabled={!canSubmit}
            accessibilityRole="button"
            accessibilityLabel="Enter your vault"
            accessibilityState={{ disabled: !canSubmit, busy }}
          >
            {busy ? <ActivityIndicator color={c.onTint} /> : <Text style={styles.buttonText}>Enter your vault</Text>}
          </Pressable>
        </View>

        <Text style={styles.footnote}>Your vault is private to you. Everything you save is searchable by meaning, not folders.</Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    container: { flex: 1, paddingHorizontal: 28, justifyContent: "center" },
    hero: { alignItems: "center", marginBottom: 40 },
    wordmark: { fontFamily: fonts.serif, fontSize: 40, lineHeight: 46, color: c.text },
    tagline: { fontFamily: fonts.serifItalic, fontSize: 18, lineHeight: 24, color: c.textFaint, textAlign: "center", marginTop: 6 },
    form: { gap: 10 },
    field: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      backgroundColor: c.surface,
      borderRadius: radius.full,
      paddingLeft: 20,
      borderWidth: 1,
      borderColor: c.borderStrong,
      minHeight: 54,
    },
    fieldError: { borderColor: c.danger },
    input: { flex: 1, fontSize: 17, color: c.text, paddingVertical: 14 },
    eye: { width: HIT + 4, height: HIT + 4, alignItems: "center", justifyContent: "center" },
    error: { color: c.danger, fontSize: 15, textAlign: "center" },
    errorSlot: { minHeight: 22, justifyContent: "center" },
    button: {
      backgroundColor: c.tint,
      borderRadius: radius.full,
      minHeight: 54,
      alignItems: "center",
      justifyContent: "center",
    },
    buttonDisabled: { opacity: 0.4 },
    pressed: { opacity: 0.8 },
    buttonText: { color: c.onTint, fontSize: 17, fontWeight: "500" },
    footnote: { fontSize: 13, lineHeight: 18, color: c.textFaint, textAlign: "center", marginTop: 36 },
  });
