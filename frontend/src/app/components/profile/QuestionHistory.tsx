"use client";

import { useTheme } from "../../../../context/ThemeContext";

export default function QuestionHistory({ theme }: { theme: any }) {
  // plug in backend integration here
  return (
    <section className="mt-10 w-full max-w-2xl">
      <h2 className="text-2xl font-semibold mb-4" style={{ color: theme.accent }}>
        Question History
      </h2>
      <div
        className="rounded-2xl p-6 text-center"
        style={{ backgroundColor: theme.surface, color: theme.textSecondary }}
      >
        <p>Coming soon…</p>
      </div>
    </section>
  );
}
