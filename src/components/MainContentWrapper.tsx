"use client";

import React, { ReactNode } from "react";
import { usePlayer } from "@/context/PlayerContext";

export default function MainContentWrapper({ children }: { children: ReactNode }) {
  const { showQueue } = usePlayer();

  return (
    <div
      className={`flex-1 overflow-y-auto px-4 md:px-8 pb-48 transition-all duration-500 ease-in-out ${
        showQueue ? "md:mr-[300px]" : "mr-0"
      }`}
    >
      {children}
    </div>
  );
}
