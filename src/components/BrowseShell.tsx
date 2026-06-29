import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import DynamicBackground from "@/components/DynamicBackground";
import QueueAwareMain from "@/components/QueueAwareMain";
import TopHeader from "@/components/TopHeader";

// Shared shell for the full-list "View all" pages (albums / artists / playlists /
// songs). Keeps the same sidebar + backdrop as the home page.
export default function BrowseShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex h-screen font-sans overflow-hidden relative gap-2"
      style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}
    >
      <DynamicBackground />
      <Sidebar />

      <QueueAwareMain className="relative z-10 flex-1 flex flex-col overflow-hidden">
        <TopHeader />

        <div className="flex-1 overflow-y-auto px-5 md:px-8 pt-6 pb-44">
          {children}
        </div>
      </QueueAwareMain>
    </div>
  );
}
