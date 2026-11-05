import type { Metadata, Viewport } from "next";
import { Inter, Newsreader } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500", "600"],
  display: "swap",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
  style: ["normal", "italic"],
  weight: ["400", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "MindVault",
  description: "Remember everything. Organize nothing.",
  // Home-screen web app on iPhone: full screen, status bar tinted by
  // theme-color (kept in step with the theme by themeInit and setTheme).
  appleWebApp: { capable: true, title: "MindVault", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Draw under the notch and home indicator; pages pad with safe-area insets.
  viewportFit: "cover",
  themeColor: "#0f0f13",
};

const themeInit = `try{var t=localStorage.getItem("mv-theme")||"dark";if(t==="dark")document.documentElement.classList.add("dark");else{var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute("content","#fafaf9")}}catch(e){document.documentElement.classList.add("dark")}`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body
        className={`${inter.variable} ${newsreader.variable} font-sans antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
