"use client";

import { createContext, useCallback, useContext, useState, ReactNode } from "react";

type ToastType = "info" | "error" | "success";
type Toast = { id: number; message: string; type: ToastType };

type ToastContextType = {
  showToast: (message: string, type?: ToastType) => void;
};

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2800);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast viewport — sits above the player, centred. */}
      <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-[200] flex flex-col items-center gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className="px-4 py-2.5 rounded-xl text-sm font-semibold shadow-2xl pointer-events-auto fade-in"
            style={{
              background: "var(--bg-secondary)",
              border: `1px solid ${t.type === "error" ? "rgba(244,63,94,0.5)" : "var(--border-card)"}`,
              color: t.type === "error" ? "#fda4af" : "var(--text-primary)",
            }}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (ctx === undefined) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}
