import { type ComponentProps, createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, Animated, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useReducedMotion } from "react-native-reanimated";
import { type Palette, radius, useStyles, useTheme } from "../lib/theme";
import { haptics } from "../lib/haptics";

type Tone = "success" | "error" | "info";
type ToastState = { id: number; message: string; tone: Tone };
type ShowToast = (message: string, tone?: Tone) => void;

const ToastContext = createContext<ShowToast>(() => {});

export function useToast(): ShowToast {
  return useContext(ToastContext);
}

const ICON: Record<Tone, ComponentProps<typeof Ionicons>["name"]> = {
  success: "checkmark-circle",
  error: "alert-circle",
  info: "information-circle",
};

/**
 * A single HUD capsule near the top of the screen — the way iOS confirms
 * AirDrop, copy and save. Announced to VoiceOver / TalkBack as it appears.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seq = useRef(0);

  const show = useCallback<ShowToast>((message, tone = "success") => {
    if (tone === "success") haptics.success();
    else if (tone === "error") haptics.error();
    AccessibilityInfo.announceForAccessibility(message);
    seq.current += 1;
    setToast({ id: seq.current, message, tone });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const value = useMemo(() => show, [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? <Hud key={toast.id} toast={toast} /> : null}
    </ToastContext.Provider>
  );
}

function Hud({ toast }: { toast: ToastState }) {
  const insets = useSafeAreaInsets();
  const c = useTheme();
  const styles = useStyles(makeStyles);
  const progress = useRef(new Animated.Value(0)).current;

  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const anim = reduceMotion
      ? Animated.timing(progress, { toValue: 1, duration: 160, useNativeDriver: true })
      : Animated.spring(progress, { toValue: 1, useNativeDriver: true, damping: 18, stiffness: 220, mass: 0.8 });
    anim.start();
  }, [progress, reduceMotion]);

  // The web toast: a solid stone capsule. Errors keep a red icon.
  const color = toast.tone === "error" ? c.danger : c.inverseText;

  return (
    <View pointerEvents="none" style={[styles.wrap, { top: insets.top + 8 }]}>
      <Animated.View
        accessibilityLiveRegion="polite"
        style={[
          styles.hud,
          {
            opacity: progress,
            transform: [
              // Reduce Motion: fade in place instead of dropping in.
              { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [reduceMotion ? 0 : -24, 0] }) },
              { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [reduceMotion ? 1 : 0.94, 1] }) },
            ],
          },
        ]}
      >
        <Ionicons name={ICON[toast.tone]} size={20} color={color} />
        <Text style={styles.text} numberOfLines={2}>
          {toast.message}
        </Text>
      </Animated.View>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    wrap: { position: "absolute", left: 0, right: 0, alignItems: "center", zIndex: 100 },
    hud: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      maxWidth: "88%",
      backgroundColor: c.inverse,
      borderRadius: radius.full,
      paddingLeft: 14,
      paddingRight: 18,
      paddingVertical: 11,
      shadowColor: c.shadow,
      shadowOpacity: c.scheme === "dark" ? 0.5 : 0.14,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 8 },
      elevation: 10,
    },
    text: { color: c.inverseText, fontSize: 15, fontWeight: "500", flexShrink: 1 },
  });
