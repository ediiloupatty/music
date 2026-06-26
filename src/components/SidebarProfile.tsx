"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function SidebarProfile({ 
  isLoggedIn, 
  name, 
  email 
}: { 
  isLoggedIn: boolean; 
  name?: string | null; 
  email?: string | null;
}) {
  const pathname = usePathname();
  const isProfile = pathname === "/profile";

  return (
    <div
      className={`transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-hidden origin-top ${
        isProfile ? "opacity-0 scale-90 h-0 mb-0 pointer-events-none" : "opacity-100 scale-100 h-[40px] mb-8"
      }`}
    >
      <Link href="/profile" className="flex items-center gap-3 px-4 group h-full">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 cursor-pointer transition-transform group-hover:scale-110"
          style={{
            background: "linear-gradient(135deg, var(--accent), #6366f1)",
            boxShadow: "0 0 14px var(--accent-glow)",
          }}
        >
          {isLoggedIn ? (
            <span className="font-bold text-white text-sm">{name?.charAt(0) || "U"}</span>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
            </svg>
          )}
          {isLoggedIn && (
            <span
              className="absolute top-0 right-0 w-2.5 h-2.5 rounded-full border-2"
              style={{ background: "var(--accent)", borderColor: "var(--bg-primary)" }}
            />
          )}
        </div>
        <div className="flex flex-col min-w-0">
          <span className="font-bold text-sm truncate" style={{ color: "var(--text-primary)" }}>
            {isLoggedIn ? (name || "User") : "Zenify"}
          </span>
          <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
            {isLoggedIn ? email?.split("@")[0] || "" : "Music for the soul"}
          </span>
        </div>
      </Link>
    </div>
  );
}
