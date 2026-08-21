import { ConvexReactClient } from "convex/react";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import * as SecureStore from "expo-secure-store";
import { CONVEX_URL } from "../lib/convex-url";
import type { ReactNode } from "react";

const convex = new ConvexReactClient(CONVEX_URL);

const secureStorage = {
  getItem: SecureStore.getItemAsync,
  setItem: SecureStore.setItemAsync,
  removeItem: SecureStore.deleteItemAsync,
};

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  if (!CONVEX_URL) {
    return <>{children}</>;
  }
  return (
    <ConvexAuthProvider client={convex} storage={secureStorage}>
      {children}
    </ConvexAuthProvider>
  );
}
