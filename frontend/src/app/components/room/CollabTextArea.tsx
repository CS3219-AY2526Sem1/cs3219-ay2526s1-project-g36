// legacy code for collaborative text area using Yjs and Socket.io, functionality should be transferred to hooks/useCollaborativeDoc.ts

"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import * as Y from "yjs";

type RoomProps = {
    roomId: string;
    token: string;
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

const toUint8Array = (data: unknown): Uint8Array => {
    return data instanceof Uint8Array
        ? data
        : data instanceof ArrayBuffer
          ? new Uint8Array(data)
          : ArrayBuffer.isView(data)
            ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
            : new Uint8Array();
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

export default function CollabTextArea({ roomId, token }: RoomProps) {
    const serverUrl = process.env.NEXT_PUBLIC_COLLAB_WS_URL;
    const textAreaRef = useRef<HTMLTextAreaElement | null>(null);

    const [status, setStatus] = useState<
        "disconnected" | "connecting" | "connected"
    >("disconnected");
    const [history, setHistory] = useState<EditHistoryRecord[]>([]);

    // Initialize Yjs Document and Text Type
    const yDoc = useMemo(() => new Y.Doc(), []);
    const yText = useMemo(() => yDoc.getText("content"), [yDoc]);

    // Refs to manage state without causing re-renders
    const isApplyingRemoteUpdate = useRef(false);
    const isRenderingFromYDoc = useRef(false);
    const composingRef = useRef(false);
    const socketRef = useRef<Socket | null>(null);

    useEffect(() => {
        // Get current text content
        const onYTextUpdate = () => {
            if (!textAreaRef.current) return;
            if (isRenderingFromYDoc.current) return;

            const textContent = textAreaRef.current;
            const selectionStart = textContent.selectionStart;
            const selectionEnd = textContent.selectionEnd;

            isRenderingFromYDoc.current = true;
            textContent.value = yText.toString();
            isRenderingFromYDoc.current = false;

            // Restore cursor position
            try {
                textContent.setSelectionRange(selectionStart, selectionEnd);
            } catch (error) {
                console.error("Error restoring cursor position:", error);
            }
        };

        // Emit local changes to server
        const onYDocUpdate = (update: Uint8Array) => {
            const socket = socketRef.current;
            if (!socket) return;
            if (isApplyingRemoteUpdate.current) return;

            socket.emit("collab:update", update);
        };

        // Observe local Y.Text changes to update the textarea
        yText.observe(onYTextUpdate);
        // Observe Y.Doc updates to send to server
        yDoc.on("update", onYDocUpdate);

        // Initialize textarea value
        if (textAreaRef.current) {
            textAreaRef.current.value = yText.toString();
        }

        return () => {
            yText.unobserve(onYTextUpdate);
            yDoc.off("update", onYDocUpdate);
        };
    }, [yDoc, yText]);

    useEffect(() => {
        setStatus("connecting");

        const socket = io(serverUrl, {
            transports: ["websocket"],
            auth: {
                token,
                sessionId: roomId,
            },
            forceNew: true,
        });

        socketRef.current = socket;

        socket.on("connect", () => {
            setStatus("connected");

            // Ask backend for last 50 edits
            socket.emit("collab:history:get", { limit: 50 });
        });

        socket.on("disconnect", () => {
            setStatus("disconnected");
        });

        socket.on("collab:state", (data: unknown) => {
            const update = toUint8Array(data);
            isApplyingRemoteUpdate.current = true;
            try {
                Y.applyUpdate(yDoc, update);
            } catch (error) {
                console.error("Error applying initial document state:", error);
            } finally {
                isApplyingRemoteUpdate.current = false;
            }
        });

        socket.on("collab:update", (data: unknown) => {
            const update = toUint8Array(data);
            isApplyingRemoteUpdate.current = true;
            try {
                Y.applyUpdate(yDoc, update);
            } catch (error) {
                console.error("Error applying remote update:", error);
            } finally {
                isApplyingRemoteUpdate.current = false;
            }
        });

        socket.on("collab:history", (history: EditHistoryRecord[]) => {
            setHistory(history);
        });

        socket.on("collab:history:new", (record: EditHistoryRecord) => {
            setHistory((prevHistory) => [record, ...prevHistory].slice(0, 50));
        });

        socket.on("collab:error", (error: { ok: boolean; message: string }) => {
            console.error("Collaboration error:", error.message);
        });

        return () => {
            socket.disconnect();
            socketRef.current = null;
            yDoc.destroy();
        };
    }, [roomId, serverUrl, token, yDoc]);

    const onInput = () => {
        if (!textAreaRef.current) return;
        if (isRenderingFromYDoc.current || composingRef.current) return;

        const text = textAreaRef.current.value;
        const currentText = yText.toString();

        if (text === currentText) return;

        yDoc.transact(() => {
            yText.delete(0, currentText.length);
            if (text.length) {
                yText.insert(0, text);
            }
        });
    };

    return (
        <div className="flex flex-col gap-6 h-full min-h-0">
            <div className="border p-4 rounded-lg flex flex-col min-h-0 flex-1">
                <h2 className="font-semibold mb-2 flex-shrink-0">Editor</h2>
                <textarea
                    ref={textAreaRef}
                    placeholder="Write your code here..."
                    className="w-full flex-1 min-h-0 border rounded-lg p-2 font-mono resize-none"
                    onInput={onInput}
                    onCompositionStart={() => {
                        composingRef.current = true;
                    }}
                    onCompositionEnd={() => {
                        composingRef.current = false;
                        onInput();
                    }}
                />
                <div className="text-xs text-gray-500 mt-2 flex justify-between flex-shrink-0">
                    <span>
                        Session: <code>{roomId}</code>
                        <br />
                        Connection Status: {status}
                    </span>
                </div>
            </div>

            <div className="border p-4 rounded-lg flex flex-col overflow-hidden min-h-0 flex-1">
                <h2 className="font-semibold mb-2 flex-shrink-0">
                    Edit History
                </h2>
                <div className="flex-1 overflow-y-auto min-h-0">
                    {history.length === 0 ? (
                        <p className="text-sm text-gray-500">No edits yet.</p>
                    ) : (
                        <ul className="text-sm space-y-2">
                            {history.map((record, i) => (
                                <li key={i} className="border-b pb-1">
                                    <div className="text-xs text-gray-500">
                                        <strong>{record.userId}</strong> •{" "}
                                        {formatRelativeTime(record.timestamp)}
                                    </div>
                                    {record.changes.map(
                                        (change: any, j: number) => (
                                            <div key={j} className="ml-2">
                                                {change.type === "insert"
                                                    ? "➕"
                                                    : "➖"}{" "}
                                                L{change.line}:C{change.col} →{" "}
                                                <code>{change.snippet}</code>
                                            </div>
                                        )
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}
