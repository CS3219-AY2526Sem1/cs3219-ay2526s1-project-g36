"use client";

import { useTheme } from "../../../../context/ThemeContext";

export default function FindMatchButton({ problem }) {
  const { theme } = useTheme();

  const handleFindMatch = () => {
    console.log("Finding match for:");
    console.log({
      name: problem.name,
      topic: problem.topic,
      difficulty: problem.difficulty,
    });
  };

  return (
    <button
      onClick={handleFindMatch}
      className="w-full py-2 px-4 rounded-lg font-semibold transition"
      style={{
        backgroundColor: theme.primary,
        color: theme.background,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = theme.accent)}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = theme.primary)}
    >
      Find Match
    </button>
  );
}
