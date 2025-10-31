"use client";

import Link from "next/link";
import TopNavBar from "../components/navbar/TopNavBar";
import { useState } from "react";
import FilterPanel from "../components/problems/FilterPanel";
import ProblemDetailsPanel from "../components/problems/ProblemDetailsPanel";
import mockQuestions from "../../../data/mockQuestions.json";
import { Question } from "../../../lib/mockApi";
import { useRequireAuth } from '../../../lib/useRequireAuth';


export default function ProblemsPage() {
  const ok = useRequireAuth();
  const [selectedProblem, setSelectedProblem] = useState<Question | null>(null);
  if (!ok) {
     return <div className="flex h-screen items-center justify-center">
              <span className="animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-600" />
            </div>;
  }


  return (
    <main className="relative min-h-screen flex p-6">
      <div className="flex-1">
        <TopNavBar />
        <div className="my-4">
          <h1 className="text-2xl font-bold mb-4">Problems</h1>
        </div>
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
