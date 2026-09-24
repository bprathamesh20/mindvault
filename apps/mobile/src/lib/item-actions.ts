import { useCallback } from "react";
import { Alert, Platform, Share } from "react-native";
import * as Clipboard from "expo-clipboard";
import * as WebBrowser from "expo-web-browser";
import { useMutation } from "convex/react";
import { api, type Id } from "./backend";
import { optimisticRemoveItem } from "./optimistic";
import { useTheme } from "./theme";
import { haptics } from "./haptics";
import { useToast } from "../components/toast";

/**
 * Opens a page in the in-app browser (SFSafariViewController / Custom Tabs)
 * so the person never loses their place in the vault.
 */
export function useOpenUrl() {
  const c = useTheme();
  return useCallback(
    (url: string) => {
      void WebBrowser.openBrowserAsync(url, {
        controlsColor: c.tint,
        toolbarColor: c.scheme === "dark" ? "#1C1C1E" : "#FFFFFF",
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
        dismissButtonStyle: "close",
        readerMode: false,
      }).catch(() => {});
    },
    [c],
  );
}

export function useItemActions() {
  const toast = useToast();
  const openUrl = useOpenUrl();
  const removeItem = useMutation(api.items.removeItem).withOptimisticUpdate(
    (localStore, args) => optimisticRemoveItem(localStore, args.id),
  );

  const share = useCallback(async (title?: string, url?: string) => {
    try {
      await Share.share(
        Platform.OS === "ios" && url
          ? { url, message: title }
          : { message: [title, url].filter(Boolean).join("\n") },
      );
    } catch {
      /* dismissed */
    }
  }, []);

  const copy = useCallback(
    async (text: string, what = "Link") => {
      await Clipboard.setStringAsync(text);
      toast(`${what} copied`);
    },
    [toast],
  );

  /** Confirms first; resolves true once the memory is gone. */
  const confirmDelete = useCallback(
    (id: string, onDeleted?: () => void) => {
      haptics.warning();
      const run = () => {
        void removeItem({ id: id as Id<"items"> })
          .then(() => {
            toast("Memory deleted");
            onDeleted?.();
          })
          .catch(() => toast("Couldn't delete that", "error"));
      };
      if (Platform.OS === "web") {
        // RN-web has no Alert; the browser confirm is the closest thing.
        if (globalThis.confirm?.("Delete this memory? This can't be undone.")) run();
        return;
      }
      Alert.alert("Delete this memory?", "It will be removed from your vault. This can't be undone.", [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: run },
      ]);
    },
    [removeItem, toast],
  );

  return { share, copy, openUrl, confirmDelete };
}
