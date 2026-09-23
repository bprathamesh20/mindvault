import { ConvexReactClient } from "convex/react";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { CONVEX_URL } from "../lib/convex-url";
import { storage } from "../lib/storage";
import type { ReactNode } from "react";

const convex = CONVEX_URL ? new ConvexReactClient(CONVEX_URL) : null;

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  if (!convex) {
    return <>{children}</>;
  }
  return (
    <ConvexAuthProvider client={convex} storage={storage}>
      {children}
    </ConvexAuthProvider>
  );
}
