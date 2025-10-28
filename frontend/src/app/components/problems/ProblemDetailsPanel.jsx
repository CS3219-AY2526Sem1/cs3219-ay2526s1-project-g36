"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "../../../../context/ThemeContext";
import FindMatchButton from "./FindMatchButton";

export default function ProblemDetailsPanel({ problem, onClose }) {
  const { theme } = useTheme();

  useEffect(() => {
    if (problem) console.log("Loaded ProblemDetailsPanel for:", problem.name);
  }, [problem]);

  return (
    <AnimatePresence>
      {problem && (
        <motion.aside
          key="problem-panel"
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "tween", duration: 0.35, ease: "easeInOut" }}
          className="fixed top-0 right-0 w-full sm:w-1/2 lg:w-1/3 h-full shadow-xl border-l p-6 overflow-y-auto z-50"
          style={{
            backgroundColor: theme.background,
            borderColor: theme.border,
            color: theme.text,
          }}
        >
          <div className="flex justify-between items-center mb-4">
            <h2
              className="text-xl font-semibold"
              style={{ color: theme.primary }}
            >
              {problem.name}
            </h2>
            <button
              onClick={onClose}
              className="text-2xl font-bold transition"
              style={{ color: theme.text }}
              onMouseEnter={(e) => (e.currentTarget.style.color = theme.accent)}
              onMouseLeave={(e) => (e.currentTarget.style.color = theme.text)}
            >
              &times;
            </button>
          </div>

          <div className="space-y-3">
            <p>
              <strong style={{ color: theme.secondary }}>Difficulty:</strong>{" "}
              {problem.difficulty}
            </p>
            <p>
              <strong style={{ color: theme.secondary }}>Acceptance Rate:</strong>{" "}
              {problem.acceptanceRate}%
            </p>
            <p>
              <strong style={{ color: theme.secondary }}>Data Structure:</strong>{" "}
              {problem.topic}
            </p>

            <hr
              className="my-3"
              style={{ borderColor: theme.border, opacity: 0.5 }}
            />

            <div>
              <h3
                className="font-medium mb-2"
                style={{ color: theme.secondary }}
              >
                Description
              </h3>
              <p className="whitespace-pre-wrap">{problem.description}</p>
            </div>

            <div className="mt-6">
              <FindMatchButton problem={problem} />
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
