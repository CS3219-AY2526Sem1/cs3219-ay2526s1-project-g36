"use client";

import { useTheme } from "../../../../context/ThemeContext";
import { signInWithProvider } from "../../../../lib/auth";

export default function SocialLogin() {
  const { theme } = useTheme();

  return (
    <div className="text-center mt-6">
      <p className="mb-2" style={{ color: theme.textSecondary }}>
        or sign in with
      </p>
      <div className="flex justify-center gap-6">
        <i
          className="fa-brands fa-google text-2xl cursor-pointer transition"
          style={{ color: theme.text }}
          onMouseEnter={(e) => (e.currentTarget.style.color = theme.primary)}
          onMouseLeave={(e) => (e.currentTarget.style.color = theme.text)}
          onClick={() => signInWithProvider("google")}
        />
        <i
          className="fa-brands fa-github text-2xl cursor-pointer transition"
          style={{ color: theme.text }}
          onMouseEnter={(e) => (e.currentTarget.style.color = theme.primary)}
          onMouseLeave={(e) => (e.currentTarget.style.color = theme.text)}
          onClick={() => signInWithProvider("github")}
        />
      </div>
    </div>
  );
}
