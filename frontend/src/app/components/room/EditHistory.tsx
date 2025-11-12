"use client";

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useTheme } from "../../../../context/ThemeContext";

type EditHistoryRecord = {
    userId: string;
    timestamp: number;
    updateTimestamp: number;
    changes: Array<{
        type: "insert" | "delete";
        line: number;
        col: number;
        snippet: string;
    }>;
};

const formatRelativeTime = (timestamp: number): string => {
    const diff = Date.now() - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (seconds < 60) return `${seconds}s ago`;
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return new Date(timestamp).toLocaleString();
};

const resolveUsername = (
    userId: string,
    ownUserId: string,
    ownName: string,
    partnerName: string
) => {
    if (userId === ownUserId) return ownName || "You";
    return partnerName || "Partner";
};

export default function EditHistory({
    roomId,
    token,
    ownUserId,
    ownName,
    partnerName,
}: {
    roomId: string;
    token: string;
    ownUserId: string;
    ownName: string | null;
    partnerName: string | null;
}) {
    const { theme } = useTheme();
    const serverUrl = process.env.NEXT_PUBLIC_COLLAB_WS_URL!;
    const socketRef = useRef<Socket | null>(null);
    const [history, setHistory] = useState<EditHistoryRecord[]>([]);
    const [status, setStatus] = useState<
        "disconnected" | "connecting" | "connected"
    >("disconnected");
    const [revertModalOpen, setRevertModalOpen] = useState(false);
    const [selectedRevertTimestamp, setSelectedRevertTimestamp] = useState<
        number | null
    >(null);
    const [selectedRevertUpdateTimestamp, setSelectedRevertUpdateTimestamp] =
        useState<number | null>(null);

    useEffect(() => {
        setStatus("connecting");
        const socket = io(serverUrl, {
            transports: ["websocket"],
            auth: { token, sessionId: roomId },
            forceNew: true,
        });
        socketRef.current = socket;

        socket.on("connect", () => {
            setStatus("connected");
            socket.emit("collab:history:get", { limit: 50 });
        });
        socket.on("disconnect", () => setStatus("disconnected"));

        socket.on("collab:history", (history: EditHistoryRecord[]) => {
            setHistory(history);
        });

        socket.on("collab:history:new", (record: EditHistoryRecord) => {
            setHistory((prev) => [record, ...prev].slice(0, 50));
        });

        return () => {
            socket.disconnect();
            socketRef.current = null;
        };
    }, [roomId, serverUrl, token]);

    return (
        <div
            style={{
                width: "100%",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                backgroundColor: theme.card.background,
                border: `1px solid ${theme.border}`,
                borderRadius: 8,
                padding: 12,
                overflow: "hidden",
                minHeight: 0,
            }}
        >
            <h2
                style={{
                    fontWeight: 600,
                    marginBottom: 12,
                    color: theme.id === "dark" ? "#f3f4f6" : "#111827",
                    fontSize: "1rem",
                    flexShrink: 0,
                }}
            >
                Edit History
            </h2>
            <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
                {history.length === 0 ? (
                    <p
                        style={{
                            fontSize: "0.875rem",
                            color: theme.id === "dark" ? "#9ca3af" : "#6b7280",
                        }}
                    >
                        No edits yet.
                    </p>
                ) : (
                    <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                        {history.map((record, i) => (
                            <li
                                key={i}
                                style={{
                                    borderBottom: `1px solid ${theme.border}`,
                                    paddingBottom: 8,
                                    marginBottom: 8,
                                    fontSize: "0.85rem",
                                }}
                            >
                                <div
                                    style={{
                                        fontSize: "0.8rem",
                                        color:
                                            theme.id === "dark"
                                                ? "#d1d5db"
                                                : "#4b5563",
                                        marginBottom: 6,
                                    }}
                                >
                                    <strong
                                        style={{
                                            color:
                                                theme.id === "dark"
                                                    ? "#f3f4f6"
                                                    : "#111827",
                                            fontWeight: 600,
                                        }}
                                    >
                                        {resolveUsername(
                                            record.userId,
                                            ownUserId,
                                            ownName ?? "You",
                                            partnerName ?? "Partner"
                                        )}
                                    </strong>{" "}
                                    • {formatRelativeTime(record.timestamp)}
                                </div>
                                <button
                                    onClick={() => {
                                        if (status === "connected") {
                                            setSelectedRevertTimestamp(
                                                record.timestamp
                                            );
                                            setSelectedRevertUpdateTimestamp(
                                                record.updateTimestamp ??
                                                    record.timestamp
                                            );
                                            setRevertModalOpen(true);
                                        }
                                    }}
                                    disabled={status !== "connected"}
                                    style={{
                                        marginTop: 4,
                                        marginBottom: 8,
                                        padding: "5px 10px",
                                        fontSize: "0.75rem",
                                        backgroundColor:
                                            status !== "connected"
                                                ? "#9ca3af"
                                                : "#3b82f6",
                                        color: "#ffffff",
                                        border: "none",
                                        borderRadius: "6px",
                                        cursor:
                                            status !== "connected"
                                                ? "not-allowed"
                                                : "pointer",
                                        transition: "background-color 0.2s",
                                        fontWeight: 500,
                                        opacity:
                                            status !== "connected" ? 0.5 : 1,
                                    }}
                                >
                                    Revert to this version
                                </button>

                                {record.changes.map((change, j) => {
                                    const isInsert = change.type === "insert";
                                    const changeColor = isInsert
                                        ? "#22c55e"
                                        : "#ef4444";
                                    const bgColor = isInsert
                                        ? "#22c55e20"
                                        : "#ef444420";
                                    return (
                                        <div
                                            key={j}
                                            style={{
                                                marginLeft: 8,
                                                fontSize: "0.8rem",
                                                color:
                                                    theme.id === "dark"
                                                        ? "#e5e7eb"
                                                        : "#374151",
                                                marginBottom: 4,
                                            }}
                                        >
                                            <span
                                                style={{
                                                    color: changeColor,
                                                    fontWeight: 600,
                                                }}
                                            >
                                                {isInsert ? "Added" : "Removed"}
                                            </span>{" "}
                                            Line {change.line}:Column{" "}
                                            {change.col} →{" "}
                                            <code
                                                style={{
                                                    backgroundColor: bgColor,
                                                    color: changeColor,
                                                    padding: "2px 5px",
                                                    borderRadius: 4,
                                                    fontSize: "0.75rem",
                                                    fontFamily: "monospace",
                                                    border: `1px solid ${changeColor}40`,
                                                }}
                                            >
                                                {change.snippet}
                                            </code>
                                        </div>
                                    );
                                })}
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Revert modal */}
            {revertModalOpen && selectedRevertTimestamp !== null && (
                <div
                    className="fixed inset-0 flex items-center justify-center bg-black/50 z-50"
                    onClick={() => setRevertModalOpen(false)}
                >
                    <div
                        className="bg-white dark:bg-neutral-800 rounded-xl p-6 shadow-lg w-[360px] animate-fade-in"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="font-semibold text-lg mb-4 text-center">
                            Revert to this version?
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-6 text-center">
                            Are you sure you want to revert the document to the
                            version from{" "}
                            <strong>
                                {formatRelativeTime(selectedRevertTimestamp)}
                            </strong>
                            ?<br />
                            <span className="text-xs text-red-500 dark:text-red-400 mt-2 block">
                                This will affect all collaborators in the room.
                            </span>
                        </p>
                        <div className="flex justify-center gap-4">
                            <button
                                onClick={() => {
                                    socketRef.current?.emit("collab:revert", {
                                        timestamp: selectedRevertTimestamp,
                                        updateTimestamp:
                                            selectedRevertUpdateTimestamp,
                                    });
                                    setRevertModalOpen(false);
                                    setSelectedRevertTimestamp(null);
                                }}
                                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md transition cursor-pointer"
                            >
                                Yes, Revert
                            </button>
                            <button
                                onClick={() => {
                                    setRevertModalOpen(false);
                                    setSelectedRevertTimestamp(null);
                                }}
                                className="bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-900 dark:text-white px-4 py-2 rounded-md transition cursor-pointer"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
        </div>
    );
}
