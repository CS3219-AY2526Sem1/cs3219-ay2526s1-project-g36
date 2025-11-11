"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { qnJson } from "../../../../lib/qn";

export default function LeaveButton() {
  const [step, setStep] = useState<"none" | "confirm" | "completed">("none");
  const router = useRouter();

  const handleCompletion = async (completed: boolean) => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('currentProblem') : null;
      const startedAt = typeof window !== 'undefined' ? localStorage.getItem('attemptStart') : null;
      const question = raw ? JSON.parse(raw) : null;
      const questionId = question?.id ?? question?.question_id ?? null;

      if (questionId != null) {
        await qnJson('/attempts', {
          method: 'POST',
          body: JSON.stringify({
            question_id: questionId,
            status: completed ? 'completed' : 'left',
            started_at: startedAt || new Date().toISOString(),
            submitted_at: new Date().toISOString(),
            question,
          }),
        });
      }
    } catch (e) {
      // swallow errors to avoid blocking navigation
      // console.error('Failed to record attempt', e);
    } finally {
      try {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('attemptStart');
        }
      } catch {}
      router.push("/problems");
    }
  };

  return (
    <>
      <button
        onClick={() => setStep("confirm")}
        className="bg-red-500 hover:bg-red-600 text-white font-semibold px-4 py-2 rounded-lg transition cursor-pointer"
      >
        Leave Room
      </button>

      {/* First modal — confirm leaving */}
      {step === "confirm" && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black/50 z-50"
          onClick={() => setStep("none")}
        >
          <div
            className="bg-white dark:bg-neutral-800 rounded-xl p-6 shadow-lg w-[320px] animate-fade-in"
            onClick={(e) => e.stopPropagation()} // prevent click-through
          >
            <h3 className="font-semibold text-lg mb-4 text-center">Leave the room?</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-6 text-center">
              Are you sure you want to leave this room?
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => setStep("completed")}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md transition cursor-pointer"
              >
                Yes
              </button>
              <button
                onClick={() => setStep("none")}
                className="bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-900 dark:text-white px-4 py-2 rounded-md transition cursor-pointer"
              >
                No
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Second modal — problem completion prompt */}
      {step === "completed" && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black/50 z-50"
          onClick={() => setStep("none")}
        >
          <div
            className="bg-white dark:bg-neutral-800 rounded-xl p-6 shadow-lg w-[340px] animate-fade-in"
            onClick={(e) => e.stopPropagation()} // prevent click-through
          >
            <h3 className="font-semibold text-lg mb-4 text-center">
              Did you successfully complete the problem?
            </h3>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => handleCompletion(true)}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md transition cursor-pointer"
              >
                Yes
              </button>
              <button
                onClick={() => handleCompletion(false)}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md transition cursor-pointer"
              >
                No
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Simple fade animation */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-fade-in {
          animation: fadeIn 0.15s ease-out;
        }
      `}</style>
    </>
  );
}
