import type { MetadataRoute } from "next";

// "Add to Home Screen" opens MindVault full screen, like the native app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MindVault",
    short_name: "MindVault",
    description: "Remember everything. Organize nothing.",
    start_url: "/",
    display: "standalone",
    background_color: "#0f0f13",
    theme_color: "#0f0f13",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
