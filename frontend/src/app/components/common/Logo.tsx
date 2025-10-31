"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "../../../../context/ThemeContext";

export default function Logo() {
  const router = useRouter();
  const { theme } = useTheme();

  return (
    <div
      className="flex items-center space-x-2 cursor-pointer select-none"
      onClick={() => router.push("/")}
    >
      <img src="/vercel.svg" alt="App Logo" className="h-8 w-8" />
      <span
        className="text-xl font-bold transition"
      >
        PeerPrep
      </span>
    </div>
  );
}
