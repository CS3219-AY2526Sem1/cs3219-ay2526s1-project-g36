"use client";

import { Question } from "../../../../lib/mockApi";
import QuestionRow from "./QuestionRow";

interface Props {
  questions: Question[];
  onSelect: (question: Question) => void;
}

export default function QuestionsTable({ questions, onSelect }: Props) {
  return (
    <table className="w-full text-left border-collapse">
      <thead>
        <tr>
          <th className="p-3">#</th>
          <th className="p-3">Name</th>
          <th className="p-3">Difficulty</th>
          <th className="p-3">Acceptance</th>
          <th className="p-3">Data Structures</th>
          <th className="p-3">Topic</th>
        </tr>
      </thead>
      <tbody>
        {questions.map((q, i) => (
          <QuestionRow key={q.id} question={q} index={i} onSelect={onSelect} />
        ))}
      </tbody>
    </table>
  );
}
