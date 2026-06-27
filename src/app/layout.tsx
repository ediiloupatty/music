import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { PlayerProvider } from "@/context/PlayerContext";
import { ThemeProvider } from "@/context/ThemeContext";
import BottomPlayer from "@/components/BottomPlayer";
import BottomNav from "@/components/BottomNav";
import DesktopTitlebar from "@/components/DesktopTitlebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Zenify - Cloud Music",
  description: "Your personal hi-res cloud music player",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="dark"
      className={`${geistSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col" style={{ background: "var(--bg-base)", color: "var(--text-primary)" }}>
        <ThemeProvider>
          <PlayerProvider>
            <DesktopTitlebar />
            {children}
            <BottomPlayer />
            <BottomNav />
          </PlayerProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
