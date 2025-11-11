"use client";

import { useTheme } from "../../../../context/ThemeContext";

type Props = {
    title?: string;
    description?: string;
    difficulty?: string;
    acceptanceRate?: number;
};

export default function QuestionPanel({
    title,
    description,
    difficulty,
    acceptanceRate,
}: Props) {
    const { theme } = useTheme();

    return (
        <div
            style={{
                backgroundColor: theme.card.background,
                border: `1px solid ${theme.border}`,
                borderRadius: "8px",
                padding: "16px",
            }}
        >
            <h2
                style={{
                    fontSize: "1.25rem",
                    fontWeight: 600,
                    marginBottom: "12px",
                    color: theme.id === "dark" ? "#f3f4f6" : "#111827",
                }}
            >
                {title ?? "Question"}
            </h2>
            {difficulty && (
                <div
                    style={{
                        fontSize: "0.875rem",
                        color: theme.id === "dark" ? "#9ca3af" : "#6b7280",
                        marginBottom: "8px",
                    }}
                >
                    Difficulty: {difficulty}
                </div>
            )}
            {typeof acceptanceRate === "number" && (
                <div
                    style={{
                        fontSize: "0.875rem",
                        color: theme.id === "dark" ? "#9ca3af" : "#6b7280",
                        marginBottom: "16px",
                    }}
                >
                    Acceptance Rate: {Math.round(acceptanceRate)}%
                </div>
            )}
            <div
                style={{
                    color: theme.id === "dark" ? "#e5e7eb" : "#374151",
                    whiteSpace: "pre-wrap",
                    lineHeight: "1.6",
                }}
            >
                {description ?? "No description available."}
            </div>
        </div>
    );
}
