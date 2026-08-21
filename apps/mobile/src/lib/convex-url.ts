/**
 * Point this at your Convex deployment:
 *
 *  - Android emulator + local backend: http://10.0.2.2:3210
 *    (run `adb reverse tcp:3210 tcp:3210` to use http://127.0.0.1:3210)
 *  - Physical device + local backend: http://<your-mac-LAN-IP>:3210
 *  - Convex cloud (recommended): https://<deployment>.convex.cloud
 */
export const CONVEX_URL = process.env.EXPO_PUBLIC_CONVEX_URL ?? "";

/**
 * File storage URLs returned by the backend may reference localhost when the
 * deployment runs locally — rewrite them to whichever host the app itself
 * uses, so images load from a physical device.
 */
export function resolveFileUrl(url: string): string {
  if (!url || !CONVEX_URL) return url;
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
      const target = new URL(CONVEX_URL);
      parsed.protocol = target.protocol;
      parsed.host = target.host;
    }
    return parsed.toString();
  } catch {
    return url;
  }
}
