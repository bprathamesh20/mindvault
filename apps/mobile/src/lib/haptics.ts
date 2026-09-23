import { Platform } from "react-native";
import * as Haptics from "expo-haptics";

// Haptics are feedback, never function — swallow failures and skip web.
const enabled = Platform.OS !== "web";

export const haptics = {
  selection() {
    if (enabled) void Haptics.selectionAsync().catch(() => {});
  },
  light() {
    if (enabled) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  },
  medium() {
    if (enabled) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  },
  success() {
    if (enabled) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  },
  warning() {
    if (enabled) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
  },
  error() {
    if (enabled) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
  },
};
