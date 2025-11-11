"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getMatchingSocket } from "../lib/matchingSocket";
import { useRouter } from "next/navigation";

type JoinPayload = {
    userId: string;
    difficulty: string;
    topics: string[];
};

type matchResult = {
    roomId: string;
    matchedUserId: string;
};

export function useMatching(opts: {
    token: string;
    onMatched?: (result: matchResult) => void;
}) {
    const router = useRouter();
    const { token, onMatched } = opts;

    const [status, setStatus] = useState<
        "idle" | "connecting" | "queued" | "matched"
    >("idle");
    // returned for backwards compatibility with FindMatchButton
    const [position, setPosition] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

    const socketRef = useRef<any>(null);

    useEffect(() => {
        const socket = getMatchingSocket(token);
        socketRef.current = socket;

        socket.on("connect", () => {
            // Only move state to queued if we were connecting
            setStatus((prev) => (prev === "connecting" ? "queued" : prev));
        });

        socket.on("matched", (data: matchResult) => {
            setStatus("matched");
            if (onMatched) {
                onMatched(data);
            }

            sessionStorage.setItem(
                `roommeta:${data.roomId}`,
                JSON.stringify({ matchedUserId: data.matchedUserId })
            );

            router.push(`/room/${data.roomId}`);
        });

        // optional: if server ever emits queue-snapshot or position in future, handle it here:
        socket.on("queue-snapshot", (snap: any) => {
            // no-op for now; keep for forward-compat
            // could setPosition(...) if server later emits position info
        });

        socket.connect();

        return () => {
            socket.off("connect");
            socket.off("matched");
            socket.off("queue-snapshot");
        };
    }, [token, onMatched, router]);

    const joinQueue = useCallback(
        (payload: JoinPayload) => {
            setStatus("connecting");
            const socket = socketRef.current ?? getMatchingSocket(token);
            socketRef.current = socket;

            const doEmit = () => {
                // normalize payload just in case
                const cleanPayload = {
                    userId: payload.userId,
                    difficulty: payload.difficulty.toLowerCase().trim(),
                    topics: payload.topics.map((t) => t.trim()),
                };
                socket.emit("join-queue", cleanPayload);
                console.log("Emitted join-queue with payload:", cleanPayload);
                // set queued right away to keep UI snappy (server will still emit matched later)
                setStatus("queued");
            };

            if (socket.connected) {
                doEmit();
            } else {
                socket.connect();
                // wait a short tick so socket.connect has effect; fine to emit immediately too
                doEmit();
            }
        },
        [token]
    );

    const leaveQueue = useCallback(() => {
        const socket = socketRef.current;
        if (!socket) {
            setStatus("idle");
            return;
        }

        try {
            // emit the cancel event the backend expects
            socket.emit("match:cancel");
            console.log("Emitted match:cancel");
        } catch (err) {
            console.warn("Failed to emit match:cancel", err);
        } finally {
            // set status back to idle and clear position
            setStatus("idle");
            setPosition(null);
        }
    }, []);

    useEffect(() => {
        return () => {
            const socket = socketRef.current;
            if (socket && socket.connected) {
                // also tell server we left (best-effort)
                try {
                    socket.emit("match:cancel");
                } catch {}
                socket.disconnect();
            }
        };
    }, []);

    return {
        status,
        position,
        joinQueue,
        leaveQueue,
        error,
    };
}
