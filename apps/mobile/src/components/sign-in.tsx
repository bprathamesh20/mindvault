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
import { useAuthActions } from "@convex-dev/auth/react";
import { colors, fonts, radius } from "../lib/theme";

export function SignIn() {
  const { signIn } = useAuthActions();
  const [passphrase, setPassphrase] = useState("");
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleSubmit() {
    if (!passphrase || busy) return;
    setBusy(true);
    setError(false);
    try {
      await signIn("passphrase", { passphrase });
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Text style={styles.wordmark}>MindVault</Text>
      <Text style={styles.tagline}>Remember everything. Organize nothing.</Text>
      <View style={[styles.inputWrap, error && styles.inputError]}>
        <TextInput
          value={passphrase}
          onChangeText={(v) => {
            setPassphrase(v);
            setError(false);
          }}
          placeholder="Your passphrase"
          placeholderTextColor={colors.textFaint}
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoFocus
          style={styles.input}
          onSubmitEditing={handleSubmit}
        />
        <Pressable onPress={() => setVisible((v) => !v)} hitSlop={8}>
          <Ionicons
            name={visible ? "eye-off-outline" : "eye-outline"}
            size={19}
            color={colors.textFaint}
          />
        </Pressable>
      </View>
      {error ? <Text style={styles.error}>Wrong passphrase.</Text> : null}
      <Pressable
        style={({ pressed }) => [
          styles.button,
          (!passphrase || busy) && styles.buttonDisabled,
          pressed && !(!passphrase || busy) && styles.buttonPressed,
        ]}
        onPress={handleSubmit}
        disabled={!passphrase || busy}
      >
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Enter your mind</Text>
        )}
      </Pressable>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    backgroundColor: colors.bg,
  },
  wordmark: {
    fontFamily: fonts.serif,
    fontSize: 36,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 13,
    fontStyle: "italic",
    color: colors.textMuted,
    marginTop: 10,
  },
  inputWrap: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.full,
    paddingHorizontal: 20,
    marginTop: 44,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    paddingVertical: 15,
    fontSize: 15,
    color: colors.text,
  },
  inputError: { borderColor: colors.danger },
  error: { color: colors.danger, fontSize: 13, marginTop: 12 },
  button: {
    width: "100%",
    backgroundColor: colors.inverse,
    borderRadius: radius.full,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 16,
  },
  buttonDisabled: { opacity: 0.4 },
  buttonPressed: { opacity: 0.85 },
  buttonText: { color: "#fff", fontSize: 15, fontWeight: "600" },
});
