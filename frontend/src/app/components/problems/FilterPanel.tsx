"use client";

import { useState, useMemo } from "react";
import { Question } from "../../../../lib/mockApi";
import { useTheme } from "../../../../context/ThemeContext";
import QuestionsTable from "./QuestionsTable";

interface Props {
  questions: Question[];
  onSelectProblem: (question: Question) => void;
  startIndex?: number;
}

type SortDirection = "asc" | "desc" | null;

interface SortState {
  field: "difficulty" | "acceptanceRate";
  direction: SortDirection;
}

export default function FilterPanel({ questions, onSelectProblem, startIndex = 0 }: Props) {
  const { theme } = useTheme();

  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [sorts, setSorts] = useState<SortState[]>([]);

  // Extract unique topics
  const topics = useMemo(() => {
    const unique = new Set(questions.map((q) => q.topic));
    return Array.from(unique);
  }, [questions]);

  const toggleSort = (field: "difficulty" | "acceptanceRate") => {
    setSorts((prev) => {
      const existing = prev.find((s) => s.field === field);
      let newDirection: SortDirection;

      if (!existing) newDirection = "asc";
      else if (existing.direction === "asc") newDirection = "desc";
      else if (existing.direction === "desc") newDirection = null;
      else newDirection = "asc";

      const filtered = prev.filter((s) => s.field !== field);

      return newDirection
        ? [{ field, direction: newDirection }, ...filtered]
        : filtered;
    });
  };

  const filteredAndSortedQuestions = useMemo(() => {
    let result = [...questions];

    if (selectedTopic) {
      result = result.filter((q) => q.topic === selectedTopic);
    }

    const diffOrder = ["easy", "medium", "hard"];
    [...sorts].reverse().forEach((sort) => {
      if (sort.field === "difficulty") {
        result.sort((a, b) => {
          const aIdx = diffOrder.indexOf(a.difficulty.toLowerCase());
          const bIdx = diffOrder.indexOf(b.difficulty.toLowerCase());
          return sort.direction === "asc" ? aIdx - bIdx : bIdx - aIdx;
        });
      } else if (sort.field === "acceptanceRate") {
        result.sort((a, b) =>
          sort.direction === "asc"
            ? a.acceptanceRate - b.acceptanceRate
            : b.acceptanceRate - a.acceptanceRate
        );
      }
    });

    return result;
  }, [questions, selectedTopic, sorts]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        {/* Topic dropdown */}
        <select
          value={selectedTopic || ""}
          onChange={(e) => setSelectedTopic(e.target.value || null)}
          className="rounded-lg p-2 focus:outline-none focus:ring-"
          style={{
            borderColor: theme.border,
            color: theme.text,
            cursor: "default",
          }}
        >
          <option value="">All Topics</option>
          {topics.map((topic) => (
            <option key={topic} value={topic}>
              {topic.charAt(0).toUpperCase() + topic.slice(1)}
            </option>
          ))}
        </select>

        <button
          onClick={() => toggleSort("difficulty")}
          className="px-3 py-2 rounded-lg font-medium transition"
          style={{
            backgroundColor: sorts.find((s) => s.field === "difficulty")
              ? theme.primary
              : "transparent",
            border: `1px solid ${theme.border}`,
            color: theme.text,
            cursor: "pointer",
          }}
        >
          Sort by Difficulty{" "}
          {sorts.find((s) => s.field === "difficulty")?.direction === "asc"
            ? "↑"
            : sorts.find((s) => s.field === "difficulty")?.direction === "desc"
            ? "↓"
            : ""}
        </button>

        <button
          onClick={() => toggleSort("acceptanceRate")}
          className="px-3 py-2 rounded-lg font-medium transition"
          style={{
            backgroundColor: sorts.find((s) => s.field === "acceptanceRate")
              ? theme.primary
              : "transparent",
            border: `1px solid ${theme.border}`,
            color: theme.text,
            cursor: "pointer",
          }}
        >
          Sort by Acceptance{" "}
          {sorts.find((s) => s.field === "acceptanceRate")?.direction === "asc"
            ? "↑"
            : sorts.find((s) => s.field === "acceptanceRate")?.direction ===
              "desc"
            ? "↓"
            : ""}
        </button>
      </div>

      {/* Table */}
      <QuestionsTable
        questions={filteredAndSortedQuestions}
        onSelect={onSelectProblem}
        startIndex={startIndex}
      />
    </div>
  );
}
