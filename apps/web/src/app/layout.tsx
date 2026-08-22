import type { Metadata } from "next";
import { Inter, Newsreader } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "MindVault",
  description: "Remember everything. Organize nothing.",
};

const themeInit = `try{var t=localStorage.getItem("mv-theme")||"dark";if(t==="dark")document.documentElement.classList.add("dark")}catch(e){document.documentElement.classList.add("dark")}`;

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
