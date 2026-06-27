"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Primary nav links with active-page highlighting (matches what BottomNav does on
// mobile). Kept as a client component so it can read the current pathname; the
// sign-in/out control stays in the server Sidebar.
type Item = { href: string; label: string; icon: React.ReactNode };

export default function SidebarNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();

  const items: Item[] = [
    { href: "/", label: "Home", icon: <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" /> },
    {
      href: "/favorites",
      label: "Favorites",
      icon: (
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
      ),
    },
    {
      href: "/settings",
      label: "Settings",
      icon: (
        <path d="M12 15.5c-1.93 0-3.5-1.57-3.5-3.5S10.07 8.5 12 8.5s3.5 1.57 3.5 3.5S13.93 15.5 12 15.5zm7.43-2.06c.04-.31.07-.63.07-.94s-.03-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96a7.44 7.44 0 0 0-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.3-.07.63-.07.94s.03.64.07.94L2.86 14.52c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.49-.12-.61l-2.01-1.58z" />
      ),
    },
  ];

  if (isAdmin) {
    items.push({
      href: "/admin",
      label: "Admin",
      icon: <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z" />,
    });
  }

  return (
    <>
      {items.map((it) => {
        const active = it.href === "/" ? pathname === "/" : pathname.startsWith(it.href);
        const color = active ? "var(--accent)" : "var(--text-muted)";
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-current={active ? "page" : undefined}
            title={it.label}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl group transition-all hover:bg-white/5"
            style={active ? { background: "var(--bg-card)" } : undefined}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="flex-shrink-0 transition-colors group-hover:text-[var(--text-primary)]"
              style={{ color }}
            >
              {it.icon}
            </svg>
            <span
              className="text-sm font-semibold transition-colors group-hover:text-[var(--text-primary)]"
              style={{ color }}
            >
              {it.label}
            </span>
          </Link>
        );
      })}
    </>
  );
}
