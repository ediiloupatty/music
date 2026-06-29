import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import dynamic from "next/dynamic";
import "./globals.css";
import { PlayerProvider } from "@/context/PlayerContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { ToastProvider } from "@/context/ToastContext";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

// BottomPlayer and BottomNav are client-only (audio, canvas, MediaSession).
// Loading them dynamically with ssr:false keeps them out of the SSR bundle,
// cutting the initial HTML parse cost and avoiding hydration mismatches.
const BottomPlayer = dynamic(() => import("@/components/BottomPlayer"), {
  ssr: false,
  loading: () => <div style={{ height: "72px" }} />,
});
const BottomNav = dynamic(() => import("@/components/BottomNav"), {
  ssr: false,
  loading: () => null,
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("http://localhost:3000"),
  title: "Zenify - Cloud Music",
  description: "Your personal hi-res cloud music player",
  applicationName: "Zenify",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Zenify",
  },
  icons: {
    icon: "/logo.svg",
    apple: "/logo.png",
  },
  openGraph: {
    type: "website",
    siteName: "Zenify",
    title: "Zenify - Cloud Music",
    description: "Your personal hi-res cloud music player",
  },
};

export const viewport: Viewport = {
  themeColor: "#2e3440",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // The inline dark background on <html> makes the very first painted frame dark
  // — before external CSS (and its var(--bg-base)) loads — killing the white
  // flash on cold open / reload. Hardcoded to match --bg-base (dark theme).
  return (
    <html
      lang="en"
      data-theme="dark"
      className={`${geistSans.variable} h-full antialiased`}
      style={{ backgroundColor: "#2e3440" }}
    >
      <body className="min-h-full flex flex-col" style={{ background: "var(--bg-base)", color: "var(--text-primary)" }}>
        <ThemeProvider>
          <ToastProvider>
            <PlayerProvider>
              <ServiceWorkerRegister />
              {children}
              <BottomPlayer />
              <BottomNav />
            </PlayerProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
