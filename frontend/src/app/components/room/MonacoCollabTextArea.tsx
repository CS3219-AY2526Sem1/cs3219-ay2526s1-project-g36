"use client";

import dynamic from "next/dynamic";
import * as Y from "yjs";
import { Awareness } from "y-protocols/awareness";
import { useEffect, useMemo, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import type { editor as MonacoEditorNS } from "monaco-editor";
import { useTheme } from "../../../../context/ThemeContext";

type RoomProps = {
    roomId: string;
    token: string;
    ownUserId: string;
    ownName: string;
    partnerName: string;
};

type Change = {
    type: "insert" | "delete";
    line: number;
    col: number;
    snippet: string;
};

type EditHistoryRecord = {
    userId: string;
    timestamp: number;
    changes: Change[];
};

const Editor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

const resolveUsername = (
    userId: string,
    ownUserId: string,
    ownName: string,
    partnerName: string
) => {
    if (userId === ownUserId) {
        return ownName || "You";
    }
    return partnerName || "Unknown";
};

const toUint8Array = (data: unknown): Uint8Array =>
    data instanceof Uint8Array
        ? data
        : data instanceof ArrayBuffer
          ? new Uint8Array(data)
          : ArrayBuffer.isView(data)
            ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
            : new Uint8Array();

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

export default function MonacoCollabTextArea({
    roomId,
    token,
    ownUserId,
    ownName,
    partnerName,
}: RoomProps) {
    const { theme } = useTheme();
    const serverUrl = process.env.NEXT_PUBLIC_COLLAB_WS_URL!;
    const socketRef = useRef<Socket | null>(null);

    // Monaco refs
    const editorRef = useRef<MonacoEditorNS.IStandaloneCodeEditor | null>(null);
    const monacoNSRef = useRef<typeof import("monaco-editor") | null>(null);
    const bindingMadeRef = useRef(false); // guard against double-mount in dev
    const bindingRef = useRef<any | null>(null);
    const isRevertingRef = useRef(false);

    // Yjs
    const yDoc = useMemo(() => new Y.Doc(), []);
    const yText = useMemo(() => yDoc.getText("content"), [yDoc]);
    const awareness = useMemo(() => new Awareness(yDoc), [yDoc]);

    const [status, setStatus] = useState<
        "disconnected" | "connecting" | "connected"
    >("disconnected");
    const [language, setLanguage] = useState("python");
    const [history, setHistory] = useState<EditHistoryRecord[]>([]);
    const [revertModalOpen, setRevertModalOpen] = useState(false);
    const [selectedRevertTimestamp, setSelectedRevertTimestamp] = useState<
        number | null
    >(null);

    // Socket.IO wiring
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
        socket.on("collab:state", (data: unknown) =>
            Y.applyUpdate(yDoc, toUint8Array(data))
        );
        socket.on("collab:update", (data: unknown) =>
            Y.applyUpdate(yDoc, toUint8Array(data))
        );
        socket.on("collab:language", ({ language: lang }) => {
            setLanguage((prev) => (prev === lang ? prev : lang));

            const editor = editorRef.current;
            const monacoNS = monacoNSRef.current;
            if (!editor || !monacoNS) return;

            const model = editor.getModel();
            if (model) monacoNS.editor.setModelLanguage(model, lang);
        });

        socket.on("collab:history", (history: EditHistoryRecord[]) => {
            setHistory(history);
        });

        socket.on("collab:history:new", (record: EditHistoryRecord) => {
            setHistory((prevHistory) => [record, ...prevHistory].slice(0, 50));
        });

        const onLocalUpdate = (update: Uint8Array, origin: unknown) => {
            if (origin !== bindingRef.current) {
                return;
            }
            socketRef.current?.emit("collab:update", update);
        };

        yDoc.on("update", onLocalUpdate);

        return () => {
            yDoc.off("update", onLocalUpdate);
            socket.disconnect();
            socketRef.current = null;
            yDoc.destroy();
        };
    }, [roomId, serverUrl, token, yDoc]);

    // Monaco mount
    const handleMount = async (
        editor: MonacoEditorNS.IStandaloneCodeEditor,
        monacoNS: typeof import("monaco-editor")
    ) => {
        editorRef.current = editor;
        monacoNSRef.current = monacoNS;

        // Avoid duplicate binding in dev StrictMode (Next.js mounts twice)
        if (bindingMadeRef.current) return;
        bindingMadeRef.current = true;

        const model = editor.getModel();
        if (!model) return;

        // Define Monaco theme dynamically
        monacoNS.editor.defineTheme("customTheme", {
            base: theme.id === "dark" ? "vs-dark" : "vs",
            inherit: true,
            rules: [
                {
                    token: "",
                    foreground: theme.text.replace("#", ""),
                    background: theme.surface.replace("#", ""),
                },
            ],
            colors: {
                "editor.background": theme.surface,
                "editor.foreground": theme.text,
                "editorCursor.foreground": theme.accent,
                "editorLineNumber.foreground": theme.textSecondary,
                "editorLineNumber.activeForeground": theme.accent,
                "editor.selectionBackground": "#264F78",
                "editor.inactiveSelectionBackground": "#3A3D41",
                "editorIndentGuide.background": theme.border,
                "editorIndentGuide.activeBackground": theme.accent,
                editorLineHighlightBackground:
                    theme.id === "dark" ? "#1E1E1E30" : "#EAEAEA80",
            },
        });

        monacoNS.editor.setTheme("customTheme");

        // Dynamic import to avoid "window is not defined" at module eval
        const { MonacoBinding } = await import("y-monaco");
        const binding = new MonacoBinding(
            yText,
            model,
            new Set([editor]),
            awareness
        );
        bindingRef.current = binding;

        // set initial language
        monacoNS.editor.setModelLanguage(model, language);
    };

    // Update theme dynamically
    useEffect(() => {
        const monacoNS = monacoNSRef.current;
        if (monacoNS) {
            monacoNS.editor.setTheme("customTheme");
        }
    }, [theme]);

    // Change language
    useEffect(() => {
        const editor = editorRef.current;
        const monacoNS = monacoNSRef.current;
        if (!editor || !monacoNS) return;
        const model = editor.getModel();
        if (model) monacoNS.editor.setModelLanguage(model, language);
    }, [language]);

    // Update editor read-only state based on connection status
    useEffect(() => {
        const editor = editorRef.current;
        if (!editor) return;

        // Make editor read-only when disconnected
        editor.updateOptions({
            readOnly: status !== "connected",
        });
    }, [status]);

    return (
        <div
            style={{
                height: "100%",
                width: "100%",
                backgroundColor: theme.surface,
                display: "flex",
                flexDirection: "row",
                gap: "12px",
            }}
        >
            {/* Left Side: Editor */}
            <div
                style={{
                    flex: "1",
                    display: "flex",
                    flexDirection: "column",
                    minWidth: 0,
                }}
            >
                {/* Top Bar */}
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "6px 12px",
                        backgroundColor: theme.background,
                        borderBottom: `1px solid ${theme.border}`,
                    }}
                >
                    {/* Language Selector */}
                    <select
                        value={language}
                        onChange={(e) => {
                            const lang = e.target.value;
                            // 1) optimistic UI update (prevents flicker/revert)
                            setLanguage(lang);
                            // 2) tell the server; its broadcast will keep everyone in sync
                            socketRef.current?.emit("collab:language:set", {
                                language: lang,
                            });
                        }}
                        style={{
                            backgroundColor: theme.input.background,
                            color: theme.input.text,
                            border: `1px solid ${theme.input.border}`,
                            padding: "4px 8px",
                            borderRadius: "6px",
                            fontSize: "0.9rem",
                        }}
                    >
                        <option value="python">Python</option>
                        <option value="javascript">JavaScript</option>
                        <option value="cpp">C++</option>
                        <option value="java">Java</option>
                        <option value="c">C</option>
                    </select>

                    {/* 🔌 Connection Status */}
                    <span
                        style={{
                            fontSize: "0.85rem",
                            color: theme.id === "dark" ? "#d1d5db" : "#4b5563",
                        }}
                    >
                        {status === "connected"
                            ? "🟢 Connected"
                            : status === "connecting"
                              ? "🟡 Connecting..."
                              : "🔴 Disconnected"}
                    </span>
                </div>

                {/* Monaco Editor */}
                <div style={{ flexGrow: 1, position: "relative" }}>
                    <Editor
                        height="100%"
                        language={language}
                        theme="customTheme"
                        options={{
                            automaticLayout: true,
                            minimap: { enabled: false },
                            fontSize: 14,
                            padding: { top: 10 },
                            scrollBeyondLastLine: false,
                            lineNumbers: "on",
                            smoothScrolling: true,
                            readOnly: status !== "connected",
                        }}
                        onMount={handleMount}
                    />

                    {/* Disconnection Overlay with Spinner */}
                    {status !== "connected" && (
                        <div
                            style={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                backgroundColor:
                                    theme.id === "dark"
                                        ? "rgba(0, 0, 0, 0.7)"
                                        : "rgba(255, 255, 255, 0.7)",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                zIndex: 10,
                                backdropFilter: "blur(2px)",
                            }}
                        >
                            {/* Spinner */}
                            <div
                                className="spinner"
                                style={{
                                    width: "50px",
                                    height: "50px",
                                    border:
                                        "4px solid " +
                                        (theme.id === "dark"
                                            ? "#333"
                                            : "#e5e7eb"),
                                    borderTop: "4px solid #3b82f6",
                                    borderRadius: "50%",
                                    animation: "spin 1s linear infinite",
                                }}
                            />
                            <p
                                style={{
                                    marginTop: "16px",
                                    fontSize: "1rem",
                                    fontWeight: 500,
                                    color:
                                        theme.id === "dark"
                                            ? "#f3f4f6"
                                            : "#111827",
                                }}
                            >
                                {status === "connecting"
                                    ? "Connecting to collaboration service..."
                                    : "Connection lost. Reconnecting..."}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Right Side: Edit History */}
            <div
                style={{
                    width: "280px",
                    display: "flex",
                    flexDirection: "column",
                    backgroundColor: theme.card.background,
                    border: `1px solid ${theme.border}`,
                    borderRadius: "8px",
                    padding: "12px",
                    overflow: "hidden",
                }}
            >
                <h2
                    style={{
                        fontWeight: 600,
                        marginBottom: "12px",
                        color: theme.id === "dark" ? "#f3f4f6" : "#111827",
                        fontSize: "1rem",
                        flexShrink: 0,
                    }}
                >
                    Edit History
                </h2>
                <div
                    style={{
                        flex: 1,
                        overflowY: "auto",
                        minHeight: 0,
                    }}
                >
                    {history.length === 0 ? (
                        <p
                            style={{
                                fontSize: "0.875rem",
                                color:
                                    theme.id === "dark" ? "#9ca3af" : "#6b7280",
                            }}
                        >
                            No edits yet.
                        </p>
                    ) : (
                        <ul
                            style={{ listStyle: "none", padding: 0, margin: 0 }}
                        >
                            {history.map((record, i) => (
                                <li
                                    key={i}
                                    style={{
                                        borderBottom: `1px solid ${theme.border}`,
                                        paddingBottom: "8px",
                                        marginBottom: "8px",
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
                                            marginBottom: "6px",
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
                                                ownName,
                                                partnerName
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
                                                setRevertModalOpen(true);
                                            }
                                        }}
                                        disabled={status !== "connected"}
                                        style={{
                                            marginTop: "4px",
                                            marginBottom: "8px",
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
                                                status !== "connected"
                                                    ? 0.5
                                                    : 1,
                                        }}
                                        onMouseEnter={(e) => {
                                            if (status === "connected") {
                                                e.currentTarget.style.backgroundColor =
                                                    "#2563eb";
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (status === "connected") {
                                                e.currentTarget.style.backgroundColor =
                                                    "#3b82f6";
                                            }
                                        }}
                                    >
                                        Revert to this version
                                    </button>
                                    {record.changes.map(
                                        (change: any, j: number) => {
                                            const isInsert =
                                                change.type === "insert";
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
                                                        marginLeft: "8px",
                                                        fontSize: "0.8rem",
                                                        color:
                                                            theme.id === "dark"
                                                                ? "#e5e7eb"
                                                                : "#374151",
                                                        marginBottom: "4px",
                                                    }}
                                                >
                                                    <span
                                                        style={{
                                                            color: changeColor,
                                                            fontWeight: 600,
                                                        }}
                                                    >
                                                        {isInsert
                                                            ? "Added"
                                                            : "Removed"}
                                                    </span>{" "}
                                                    Line {change.line}:Column{" "}
                                                    {change.col} →{" "}
                                                    <code
                                                        style={{
                                                            backgroundColor:
                                                                bgColor,
                                                            color: changeColor,
                                                            padding: "2px 5px",
                                                            borderRadius: "4px",
                                                            fontSize: "0.75rem",
                                                            fontFamily:
                                                                "monospace",
                                                            border: `1px solid ${changeColor}40`,
                                                        }}
                                                    >
                                                        {change.snippet}
                                                    </code>
                                                </div>
                                            );
                                        }
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            {/* Revert Confirmation Modal */}
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
                            ?
                            <br />
                            <span className="text-xs text-red-500 dark:text-red-400 mt-2 block">
                                This will affect all collaborators in the room.
                            </span>
                        </p>
                        <div className="flex justify-center gap-4">
                            <button
                                onClick={() => {
                                    socketRef.current?.emit("collab:revert", {
                                        timestamp: selectedRevertTimestamp,
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

            {/* Animations */}
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
                @keyframes spin {
                    from {
                        transform: rotate(0deg);
                    }
                    to {
                        transform: rotate(360deg);
                    }
                }
            `}</style>
        </div>
    );
}
