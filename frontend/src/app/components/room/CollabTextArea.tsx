"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import * as Y from "yjs";

type RoomProps = {
    roomId: string;
    token: string;
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

export default function CollabTextArea({ roomId, token }: RoomProps) {
    const serverUrl = process.env.NEXT_PUBLIC_COLLAB_WS_URL;
    const textAreaRef = useRef<HTMLTextAreaElement | null>(null);

    const [status, setStatus] = useState<
        "disconnected" | "connecting" | "connected"
    >("disconnected");

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
        <div className="border p-4 rounded-lg">
            <h2 className="font-semibold mb-2">Editor</h2>
            <textarea
                ref={textAreaRef}
                placeholder="Write your code here..."
                className="w-full h-64 border rounded-lg p-2 font-mono"
                onInput={onInput}
                onCompositionStart={() => {
                    composingRef.current = true;
                }}
                onCompositionEnd={() => {
                    composingRef.current = false;
                    onInput();
                }}
            />
            <div className="text-xs text-gray-500 mt-2 flex justify-between">
                <span>
                    Session: <code>{roomId}</code>
                    <br />
                    Connection Status: {status}
                </span>
            </div>
        </div>
    );
}
