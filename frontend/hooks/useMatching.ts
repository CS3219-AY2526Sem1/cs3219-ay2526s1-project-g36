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
    const socketRef = useRef<any>(null);

    useEffect(() => {
        const socket = getMatchingSocket(token);
        socketRef.current = socket;

        socket.on("connect", () => {
            setStatus((prev) => (prev === "connecting" ? "queued" : prev));
        });

        socket.on("matched", (data: matchResult) => {
            setStatus("matched");
            if (onMatched) {
                onMatched(data);
            }
            router.push(`/room/${data.roomId}`);
        });

        socket.connect();

        return () => {
            socket.off("connect");
            socket.off("matched");
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
                setStatus("queued");
            };

            if (socket.connected) {
                doEmit();
            } else {
                socket.connect();
                doEmit();
            }
        },
        [token]
    );

    useEffect(() => {
        return () => {
            const socket = socketRef.current;
            if (socket && socket.connected) {
                socket.disconnect();
            }
        };
    }, []);

    return {
        status,
        joinQueue,
    };
}
