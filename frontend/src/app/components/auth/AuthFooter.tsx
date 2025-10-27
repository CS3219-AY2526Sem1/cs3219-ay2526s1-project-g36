"use client";

import { useTheme } from "../../../../context/ThemeContext";
import { useRouter } from "next/navigation";

export default function AuthFooter() {
  const { theme } = useTheme();
  const router = useRouter();

  return (
    <div className="flex justify-between text-sm mt-3">
      <button
        className="cursor-pointer transition"
        style={{ color: theme.primary }}
        onMouseEnter={(e) => (e.currentTarget.style.color = theme.accent)}
        onMouseLeave={(e) => (e.currentTarget.style.color = theme.primary)}
      >
        Forgot Password?
      </button>

      <button
        className="cursor-pointer transition"
        style={{ color: theme.primary }}
        onMouseEnter={(e) => (e.currentTarget.style.color = theme.accent)}
        onMouseLeave={(e) => (e.currentTarget.style.color = theme.primary)}
        onClick={() => router.push("/signup")}
      >
        Sign Up
      </button>
    </div>
  );
}
