"use client";

import dynamic from "next/dynamic";

// BottomPlayer and BottomNav are client-only (audio, canvas, MediaSession).
// Loading them dynamically with ssr:false in a Client Component keeps them
// out of the SSR bundle without violating Server Component dynamic import rules.
const BottomPlayer = dynamic(() => import("@/components/BottomPlayer"), {
  ssr: false,
  loading: () => <div style={{ height: "72px" }} />,
});

const BottomNav = dynamic(() => import("@/components/BottomNav"), {
  ssr: false,
  loading: () => null,
});

export default function ClientPlayerAndNav() {
  return (
    <>
      <BottomPlayer />
      <BottomNav />
    </>
  );
}
