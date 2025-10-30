"use client";

import { useRouter } from "next/navigation";
import { useTheme } from "../../../../context/ThemeContext";

export default function NavProblems() {
  const router = useRouter();
  const { theme } = useTheme();

  return (
    <span
      onClick={() => router.push("/problems")}
      className="cursor-pointer text-xl font-bold transition"
      style={{ color: theme.text }}
      onMouseEnter={(e) => (e.currentTarget.style.color = theme.primary)}
      onMouseLeave={(e) => (e.currentTarget.style.color = theme.text)}
    >
    <span>
        Problems
    </span>
    </span>
  );
}
