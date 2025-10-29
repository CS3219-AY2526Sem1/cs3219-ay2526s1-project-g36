"use client";

import { useMemo } from "react";
import { useTheme } from "../../../../context/ThemeContext";
import { useMatching } from "../../../../hooks/useMatching";

const PLACEHOLDER_USER_ID = "user-12345";
const DEV_TOKEN = "dev-test-token";

export default function FindMatchButton({ problem }) {
  const { theme } = useTheme();

  const { status, joinQueue } = useMatching({
    token: DEV_TOKEN,
    onMatched: ({ roomId, matchedUserId }) => {
      console.log(`Matched! Room ID: ${roomId}, Matched User ID: ${matchedUserId}`);
    }
  });

  const payload = useMemo(() => ({
    userId: PLACEHOLDER_USER_ID,
    difficulty: problem.difficulty.toLowerCase(),
    topics: [problem.topic],
  }), [problem]);

  const handleFindMatch = () => {
    console.log("Finding match for:");
    console.log({
      name: problem.name,
      topic: problem.topic,
      difficulty: problem.difficulty,
    });
    joinQueue(payload);
  };

  return (
    <button
      onClick={handleFindMatch}
      className="w-full py-2 px-4 rounded-lg font-semibold transition cursor-pointer"
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
