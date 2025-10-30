"use client";

import { useEffect, useState } from "react";
import { useTheme } from "../../../context/ThemeContext";

interface UserRanking {
  rank: number;
  username: string;
  solved: number;
  rating: number;
}

export default function RankingPage() {
  const { theme } = useTheme();
  const [rankings, setRankings] = useState<UserRanking[]>([]);

  // mock data for now
  useEffect(() => {
    setRankings([
      { rank: 1, username: "Alice", solved: 120, rating: 2400 },
      { rank: 2, username: "Bob", solved: 98, rating: 2200 },
      { rank: 3, username: "Charlie", solved: 75, rating: 2000 },
    ]);
  }, []);

  return (
    <div
      className="p-6 min-h-screen"
      style={{
        backgroundColor: theme.background,
        color: theme.text,
      }}
    >
      <h1
        className="text-3xl font-bold mb-6"
        style={{ color: theme.primary }}
      >
        Rankings
      </h1>

      <div
        className="rounded-lg shadow-md overflow-hidden"
        style={{
          backgroundColor: theme.card.background,
          boxShadow: theme.card.shadow,
        }}
      >
        <table className="w-full border-collapse">
          <thead
            style={{
              backgroundColor: theme.surface,
              color: theme.textSecondary,
            }}
          >
            <tr>
              <th className="p-3 text-left border-b" style={{ borderColor: theme.border }}>
                Rank
              </th>
              <th className="p-3 text-left border-b" style={{ borderColor: theme.border }}>
                Username
              </th>
              <th className="p-3 text-left border-b" style={{ borderColor: theme.border }}>
                Problems Solved
              </th>
              <th className="p-3 text-left border-b" style={{ borderColor: theme.border }}>
                Rating
              </th>
            </tr>
          </thead>
          <tbody>
            {rankings.map((user) => (
              <tr
                key={user.rank}
                className="transition"
                style={{
                  backgroundColor: theme.background,
                }}
              >
                <td className="p-3 border-b" style={{ borderColor: theme.border }}>
                  {user.rank}
                </td>
                <td className="p-3 border-b" style={{ borderColor: theme.border }}>
                  {user.username}
                </td>
                <td className="p-3 border-b" style={{ borderColor: theme.border }}>
                  {user.solved}
                </td>
                <td className="p-3 border-b" style={{ borderColor: theme.border }}>
                  {user.rating}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
