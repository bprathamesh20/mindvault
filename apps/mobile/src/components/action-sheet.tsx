import { type ComponentProps, createContext, type ReactNode, useCallback, useContext, useMemo, useState } from "react";
import { ActionSheetIOS, Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HIT, type Palette, radius, useStyles, useTheme } from "../lib/theme";
import { haptics } from "../lib/haptics";

export type SheetAction = {
  label: string;
  icon?: ComponentProps<typeof Ionicons>["name"];
  destructive?: boolean;
  /** Shows a check mark — for pickers built on the sheet. */
  selected?: boolean;
  onPress: () => void;
};

export type SheetRequest = {
  title?: string;
  message?: string;
  actions: SheetAction[];
};

const SheetContext = createContext<(req: SheetRequest) => void>(() => {});

export function useActionSheet() {
  return useContext(SheetContext);
}

/**
 * iOS gets the real UIAlertController action sheet. Android and web get a
 * bottom sheet drawn to the same shape: grouped actions, separate Cancel.
 */
export function ActionSheetProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<SheetRequest | null>(null);
  const c = useTheme();

  const show = useCallback(
    (req: SheetRequest) => {
      if (Platform.OS === "ios") {
        const labels = req.actions.map((a) => (a.selected ? `✓ ${a.label}` : a.label));
        const destructiveButtonIndex = req.actions
          .map((a, i) => (a.destructive ? i : -1))
          .filter((i) => i >= 0);
        ActionSheetIOS.showActionSheetWithOptions(
          {
            title: req.title,
            message: req.message,
            options: [...labels, "Cancel"],
            cancelButtonIndex: labels.length,
            destructiveButtonIndex,
            tintColor: c.tint,
            userInterfaceStyle: c.scheme,
          },
          (index) => {
            if (index < req.actions.length) req.actions[index].onPress();
          },
        );
        return;
      }
      setRequest(req);
    },
    [c],
  );

  const value = useMemo(() => show, [show]);

  return (
    <SheetContext.Provider value={value}>
      {children}
      <FallbackSheet request={request} onClose={() => setRequest(null)} />
    </SheetContext.Provider>
  );
}

function FallbackSheet({ request, onClose }: { request: SheetRequest | null; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const styles = useStyles(makeStyles);
  const c = useTheme();

  return (
    <Modal visible={request !== null} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Dismiss" accessibilityRole="button" />
      <View style={[styles.container, { paddingBottom: insets.bottom + 10 }]} pointerEvents="box-none">
        <View style={styles.group} accessibilityViewIsModal>
          {request?.title || request?.message ? (
            <View style={styles.header}>
              {request.title ? (
                <Text style={styles.title} accessibilityRole="header">
                  {request.title}
                </Text>
              ) : null}
              {request.message ? <Text style={styles.message}>{request.message}</Text> : null}
            </View>
          ) : null}
          {request?.actions.map((a, i) => (
            <Pressable
              key={a.label}
              accessibilityRole="button"
              accessibilityState={a.selected ? { selected: true } : undefined}
              style={({ pressed }) => [styles.row, i > 0 || request.title ? styles.rowDivider : null, pressed && styles.pressed]}
              onPress={() => {
                haptics.selection();
                onClose();
                a.onPress();
              }}
            >
              {a.icon ? <Ionicons name={a.icon} size={20} color={a.destructive ? c.danger : c.tint} /> : null}
              <Text style={[styles.rowText, a.destructive && { color: c.danger }]}>{a.label}</Text>
              {a.selected ? <Ionicons name="checkmark" size={20} color={c.tint} /> : null}
            </Pressable>
          ))}
        </View>
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [styles.group, styles.row, styles.cancel, pressed && styles.pressed]}
          onPress={onClose}
        >
          <Text style={[styles.rowText, styles.cancelText]}>Cancel</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: c.overlay },
    container: { flex: 1, justifyContent: "flex-end", paddingHorizontal: 10, gap: 8 },
    group: { backgroundColor: c.elevated, borderRadius: radius.md, overflow: "hidden" },
    header: { paddingHorizontal: 16, paddingVertical: 14, alignItems: "center", gap: 3 },
    title: { fontSize: 13, fontWeight: "600", color: c.textMuted, textAlign: "center" },
    message: { fontSize: 13, color: c.textMuted, textAlign: "center" },
    row: {
      minHeight: HIT + 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      paddingHorizontal: 18,
    },
    rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.separator },
    rowText: { fontSize: 18, color: c.tint },
    pressed: { backgroundColor: c.fill },
    cancel: { marginBottom: 0 },
    cancelText: { fontWeight: "600" },
  });
