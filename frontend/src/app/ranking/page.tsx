"use client";

import { useEffect, useState } from "react";
import { useTheme } from "../../../context/ThemeContext";
import RankingRow from "../components/ranking/RankingRow";
import TopNavBar from "../components/navbar/TopNavBar";
import UserRank from "../components/common/UserRank";

interface User {
  username: string;
  solved: number;
  rating: number;
}

export default function RankingPage() {
  const { theme } = useTheme();
  const [users, setUsers] = useState<User[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10; // number of rows per page

  useEffect(() => {
    // Example mock data (replace with your backend fetch)
    const mockUsers = [
      { username: "Alice", solved: 120, rating: 2400 },
      { username: "Bob", solved: 98, rating: 2200 },
      { username: "Charlie", solved: 75, rating: 2000 },
      { username: "Dylan", solved: 50, rating: 1900 },
      { username: "Eve", solved: 45, rating: 1800 },
      { username: "Frank", solved: 44, rating: 1790 },
      { username: "Grace", solved: 42, rating: 1780 },
      { username: "Leo", solved: 35, rating: 1730 },
      { username: "Hank", solved: 40, rating: 1770 },
      { username: "Ivy", solved: 38, rating: 1760 },
      { username: "John", solved: 37, rating: 1750 },
      { username: "Kathy", solved: 36, rating: 1740 },
    ];
    setUsers(mockUsers);
  }, []);

  // Sort users by rating (desc) and assign ranks
  const sortedUsers = [...users].sort((a, b) => b.rating - a.rating);
  const rankedUsers = sortedUsers.map((user, index) => ({
    rank: index + 1,
    ...user,
  }));

  // Pagination logic
  const startIdx = (currentPage - 1) * pageSize;
  const paginatedUsers = rankedUsers.slice(startIdx, startIdx + pageSize);
  const totalPages = Math.ceil(rankedUsers.length / pageSize);

  const handleNext = () => {
    if (currentPage < totalPages) setCurrentPage((p) => p + 1);
  };

  const handlePrev = () => {
    if (currentPage > 1) setCurrentPage((p) => p - 1);
  };

  return (
    <div
      className="px-6 min-h-screen"
      style={{
        backgroundColor: theme.background,
        color: theme.text,
      }}
    >
      <TopNavBar />
      <div className="flex items-center justify-between mb-6">
        <h1
          className="pt-6 text-3xl font-bold"
          style={{ color: theme.accent }}
        >
          Top Peers
        </h1>
        {/* TODO Replace 5 with actual user rank logic */}
        <UserRank rank={5} /> 
      </div>


      <div
        className="rounded-lg shadow-md overflow-hidden"
        style={{
          backgroundColor: theme.card.background,
          boxShadow: theme.card.shadow,
        }}
      >
        <table className="w-full border-collapse table-fixed">
            <colgroup>
                <col style={{ width: "9%" }} />   {/* Rank */}
                <col style={{ width: "30%" }} />  {/* Username */}
                <col style={{ width: "20%" }} />  {/* Problems Solved */}
                <col style={{ width: "20%" }} />  {/* Rating */}
            </colgroup>

            <thead
                style={{
                backgroundColor: theme.surface,
                color: theme.textSecondary,
                }}
            >
                <tr>
                <th
                    className="p-3 border-b font-semibold text-center"
                    style={{ borderColor: theme.border, textAlign: "center" }}
                >
                    Rank
                </th>

                <th
                    className="p-3 border-b font-semibold text-left"
                    style={{ borderColor: theme.border, textAlign: "left" }}
                >
                    Username
                </th>

                <th
                    className="p-3 border-b font-semibold text-center"
                    style={{ borderColor: theme.border, textAlign: "center" }}
                >
                    Problems Solved
                </th>

                <th
                    className="p-3 border-b font-semibold text-right"
                    style={{ borderColor: theme.border, textAlign: "right" }}
                >
                    Rating
                </th>
                </tr>
            </thead>

            <tbody>
                {paginatedUsers.map((user) => (
                <RankingRow
                    key={user.username}
                    rank={user.rank}
                    username={user.username}
                    solved={user.solved}
                    rating={user.rating}
                />
                ))}
            </tbody>
        </table>

      </div>

      {/* Pagination Controls */}
      <div className="flex justify-center items-center mt-4 space-x-4">
        <button
          onClick={handlePrev}
          disabled={currentPage === 1}
          className="px-4 py-2 rounded-md font-medium transition"
          style={{
            backgroundColor: currentPage === 1 ? theme.border : theme.primary,
            color: currentPage === 1 ? theme.textSecondary : theme.button.text,
            cursor: currentPage === 1 ? "not-allowed" : "pointer",
          }}
        >
          Prev
        </button>

        <span style={{ color: theme.textSecondary }}>
          Page {currentPage} of {totalPages}
        </span>

        <button
          onClick={handleNext}
          disabled={currentPage === totalPages}
          className="px-4 py-2 rounded-md font-medium transition"
          style={{
            backgroundColor: currentPage === totalPages ? theme.border : theme.primary,
            color: currentPage === totalPages ? theme.textSecondary : theme.button.text,
            cursor: currentPage === totalPages ? "not-allowed" : "pointer",
          }}
        >
          Next
        </button>
      </div>
    </div>
  );
}
