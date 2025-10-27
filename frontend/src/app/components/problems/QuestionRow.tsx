"use client";

import { Question } from "../../../../lib/mockApi";
import { useTheme } from "../../../../context/ThemeContext";

interface Props {
  question: Question;
  index: number;
  onSelect: (question: Question) => void;
}

export default function QuestionRow({ question, index, onSelect }: Props) {
  const { theme } = useTheme();

  return (
    <tr
      key={question.id}
      className="border-b hover:bg-opacity-10 cursor-pointer transition"
      style={{ borderColor: theme.border }}
      onClick={() => onSelect(question)}
    >
      <td className="p-3">{index + 1}</td>
      <td
        className="p-3 font-medium hover:underline"
        style={{ color: theme.primary }}
      >
        {question.name}
      </td>
      <td className="p-3 capitalize">{question.difficulty}</td>
      <td className="p-3">{question.acceptanceRate}%</td>
      <td className="p-3">
        {Array.isArray(question.dataStructures)
          ? question.dataStructures.join(", ")
          : question.dataStructures}
      </td>
      <td className="p-3">{question.topic}</td>
    </tr>
  );
}
