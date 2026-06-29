"use client";

import React, { ReactNode } from "react";
import { usePlayer } from "@/context/PlayerContext";

// Shifts the main column to the left when the queue panel is open, so the fixed
// 300px-wide queue (see QueuePanel) sits beside the content instead of covering
// it — matching the home page behaviour (MainContentWrapper) on every page.
export default function QueueAwareMain({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const { showQueue } = usePlayer();

  return (
    <div
      className={`${className} transition-all duration-500 ease-in-out ${
        showQueue ? "md:mr-[300px]" : "mr-0"
      }`}
    >
      {children}
    </div>
  );
}
