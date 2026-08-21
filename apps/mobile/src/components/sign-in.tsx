import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  Pressable,
} from "react-native";
import { useAuthActions } from "@convex-dev/auth/react";

export function SignIn() {
  const { signIn } = useAuthActions();
  const [passphrase, setPassphrase] = useState("");
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
      <TextInput
        value={passphrase}
        onChangeText={setPassphrase}
        placeholder="Your passphrase"
        placeholderTextColor="#a8a29e"
        secureTextEntry
        autoCapitalize="none"
        autoFocus
        style={[styles.input, error && styles.inputError]}
        onSubmitEditing={handleSubmit}
      />
      {error ? <Text style={styles.error}>Wrong passphrase.</Text> : null}
      <Pressable
        style={[styles.button, (!passphrase || busy) && styles.buttonDisabled]}
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
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  wordmark: { fontSize: 34, fontWeight: "700", color: "#1c1917", letterSpacing: -0.5 },
  tagline: { fontSize: 13, fontStyle: "italic", color: "#78716c", marginTop: 8 },
  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#d6d3d1",
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 14,
    marginTop: 40,
    textAlign: "center",
    fontSize: 15,
  },
  inputError: { borderColor: "#ef4444" },
  error: { color: "#ef4444", fontSize: 13, marginTop: 10 },
  button: {
    width: "100%",
    backgroundColor: "#1c1917",
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 14,
  },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: "#fff", fontSize: 15, fontWeight: "600" },
});
