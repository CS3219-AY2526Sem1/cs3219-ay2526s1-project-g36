"use client";

import QuestionRow from "./QuestionRow";
import { useTheme } from "../../../../context/ThemeContext";

interface Props {
  questions: any[];
  onSelect: (q: any) => void;
  startIndex?: number;
}

export default function QuestionsTable({ questions, onSelect, startIndex = 0 }: Props) {
  const { theme } = useTheme();

  return (
    <table
      className="w-full text-left border-collapse"
      style={{
        backgroundColor: theme.surface,
        color: theme.text,
      }}
    >
      <thead>
        <tr
          style={{
            backgroundColor: theme.background,
            borderBottom: `2px solid ${theme.border}`,
          }}
        >
          {["#", "Name", "Difficulty", "Acceptance", "Data Structures", "Topic"].map(
            (header) => (
              <th
                key={header}
                className="p-3 font-semibold"
                style={{
                  color: theme.textSecondary, // dark gray for light mode, light gray for dark mode
                  borderBottom: `1px solid ${theme.border}`,
                  backgroundColor:
                    theme.id === "light"
                      ? "#F1F5F9" // soft blue-gray background to add contrast
                      : theme.surface, // keep consistent in dark mode
                }}
              >
                {header}
              </th>
            )
          )}
        </tr>
      </thead>
      <tbody>
        {questions.map((q, i) => (
          <QuestionRow key={q.id} question={q} index={i + startIndex} onSelect={onSelect} />
        ))}
      </tbody>
    </table>
  );
}
