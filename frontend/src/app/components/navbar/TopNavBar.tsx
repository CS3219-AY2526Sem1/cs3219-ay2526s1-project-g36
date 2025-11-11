"use client";

import Logo from "../common/Logo";
import NavProblems from "./NavProblems";
import NavRanking from "./NavRanking";
import RightActions from "./RightActions";
import NavHistory from "./NavHistory";
import { useTheme } from "../../../../context/ThemeContext";

export default function TopNavBar() {
  const { theme } = useTheme();

  return (
    <header
      className="w-full border-b p-4 flex items-center justify-between"
      style={{
        borderColor: theme.border,
        backgroundColor: theme.surface,
      }}
    >
      <div className="flex items-center gap-8">
        <Logo />
        <nav className="flex gap-6">
          <NavProblems />
          <NavRanking />
          <NavHistory />
        </nav>
      </div>
      <RightActions />
    </header>
  );
}
