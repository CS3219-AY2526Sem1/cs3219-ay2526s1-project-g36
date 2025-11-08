"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Accept questionId and token as props
interface LeaveButtonProps {
  questionId: string;
  token: string;
}

export default function LeaveButton({ questionId, token }: LeaveButtonProps) {
  const [step, setStep] = useState<"none" | "confirm" | "completed">("none");
  const router = useRouter();

  // Call backend to mark question as completed if user says Yes
  const handleLeave = async (completed = false) => {
    if (completed && questionId && token) {
      try {
        await fetch("http://localhost:4001/questions/complete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ questionId }),
        });
      } catch (e) {
        console.error("Failed to mark question as completed:", e);
      }
    }
    router.push("/problems");
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
                onClick={() => handleLeave(true)}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md transition cursor-pointer"
              >
                Yes
              </button>
              <button
                onClick={() => handleLeave(false)}
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
