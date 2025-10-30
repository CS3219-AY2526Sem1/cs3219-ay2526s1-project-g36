"use client";

import Link from "next/link";
import TopNavBar from "../components/navbar/TopNavBar";
import { useState } from "react";
import FilterPanel from "../components/problems/FilterPanel";
import ProblemDetailsPanel from "../components/problems/ProblemDetailsPanel";
import mockQuestions from "../../../data/mockQuestions.json";
import { Question } from "../../../lib/mockApi";

export default function ProblemsPage() {
  const [selectedProblem, setSelectedProblem] = useState<Question | null>(null);

  return (
    <main className="relative min-h-screen flex p-6">
      <div className="flex-1">
        <h1 className="text-2xl font-bold mb-4">Problems</h1>
        <FilterPanel
          questions={mockQuestions}
          onSelectProblem={(question) => setSelectedProblem(question)}
        />
      </div>

      {selectedProblem && (
        <ProblemDetailsPanel
          problem={selectedProblem}
          onClose={() => setSelectedProblem(null)}
        />
      )}
    </main>
  );
}
