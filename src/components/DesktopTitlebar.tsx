"use client";

import { useEffect, useState } from "react";

// A custom window title bar shown ONLY inside the Zenify desktop shell (where
// the native OS title bar is removed). In a normal browser this renders nothing.
//
// The desktop's init-script sets window.__ZENIFY_DESKTOP__ and binds the win*
// controls. We reserve 32px at the top (padding the body + shrinking h-screen
// layouts) so the frameless content never hides behind the bar.
const BAR = 32;

function call(name: string) {
  const fn = (window as unknown as Record<string, unknown>)[name];
  if (typeof fn === "function") (fn as () => void)();
}

export default function DesktopTitlebar() {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !(window as { __ZENIFY_DESKTOP__?: boolean }).__ZENIFY_DESKTOP__) {
      return;
    }
    setIsDesktop(true);

    document.documentElement.classList.add("zenify-desktop");
    const style = document.createElement("style");
    style.id = "zenify-desktop-chrome";
    style.textContent = `
      html.zenify-desktop body { padding-top: ${BAR}px; }
      html.zenify-desktop .h-screen { height: calc(100vh - ${BAR}px) !important; }
    `;
    document.head.appendChild(style);
    return () => {
      style.remove();
      document.documentElement.classList.remove("zenify-desktop");
    };
  }, []);

  if (!isDesktop) return null;

  const btn =
    "h-full w-[46px] flex items-center justify-center transition-colors hover:bg-white/10";

  return (
    <div
      onMouseDown={() => call("winDragStart")}
      onDoubleClick={() => call("winToggleMaximize")}
      className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-between select-none"
      style={{
        height: BAR,
        background: "var(--bg-base)",
        borderBottom: "1px solid var(--border-subtle)",
        color: "var(--text-muted)",
      }}
    >
      {/* drag region + brand */}
      <div className="flex items-center gap-2 px-3 h-full pointer-events-none">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <rect x="2.5" y="8" width="2.6" height="8" rx="1.3" />
          <rect x="6.6" y="5.5" width="2.6" height="13" rx="1.3" />
          <rect x="10.7" y="3.5" width="2.6" height="17" rx="1.3" />
          <rect x="14.8" y="6.5" width="2.6" height="11" rx="1.3" />
          <rect x="18.9" y="8.5" width="2.6" height="7" rx="1.3" />
        </svg>
        <span className="text-xs font-semibold tracking-wide">Zenify</span>
      </div>

      {/* window controls — stop drag from starting when clicking a button */}
      <div className="flex items-center h-full" onMouseDown={(e) => e.stopPropagation()}>
        <button aria-label="Minimize" className={btn} onClick={() => call("winMinimize")}>
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.2">
            <line x1="1" y1="6" x2="10" y2="6" />
          </svg>
        </button>
        <button aria-label="Maximize" className={btn} onClick={() => call("winToggleMaximize")}>
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.2">
            <rect x="1.2" y="1.2" width="8.6" height="8.6" rx="1" />
          </svg>
        </button>
        <button
          aria-label="Close"
          className="h-full w-[46px] flex items-center justify-center transition-colors hover:bg-red-600 hover:text-white"
          onClick={() => call("winClose")}
        >
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.2">
            <line x1="1.5" y1="1.5" x2="9.5" y2="9.5" />
            <line x1="9.5" y1="1.5" x2="1.5" y2="9.5" />
          </svg>
        </button>
      </div>
    </div>
  );
}
