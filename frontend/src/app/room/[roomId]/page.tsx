"use client";

import { useState, useEffect, useRef } from "react";
import { getSession, logout } from "../../../../lib/auth";
import { useRouter } from "next/navigation";
import { useRequireAuth } from "../../../../lib/useRequireAuth";
import ProblemTitle from "../../components/room/ProblemTitle";
import CodeEditorPanel from "../../components/room/CodeEditorPanel";
import CommentPanel from "../../components/room/CommentPanel";
import MonacoCollabTextArea from "../../components/room/MonacoCollabTextArea";
import LeaveButton from "../../components/room/LeaveButton";
import { Session } from "@supabase/supabase-js";

type Props = {
    params: Promise<{ roomId: string }>;
};

export default function RoomPage({ params }: Props) {
    const [roomId, setRoomId] = useState<string | null>(null);
    const ok = useRequireAuth();
    const router = useRouter();
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [dividerX, setDividerX] = useState(60); // %
    const isDragging = useRef(false);

    // Resolve params safely
    useEffect(() => {
        (async () => {
            const resolved = await params;
            setRoomId(resolved.roomId);
        })();
    }, [params]);

    // Load session
    useEffect(() => {
        if (!ok) return;

        const loadSession = async () => {
            const s = await getSession();
            if (!s) throw new Error("Unable to fetch session");
            setSession(s);
            setLoading(false);
        };
        loadSession();
    }, [ok]);

    // Divider drag logic
    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        isDragging.current = true;
        document.body.style.cursor = "col-resize";
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging.current) return;
        const container = document.getElementById("resizable-container");
        if (!container) return;
        const rect = container.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        const newWidthPercent = Math.min(
            80,
            Math.max(30, (offsetX / rect.width) * 100)
        );
        setDividerX(newWidthPercent);
    };

    const handleMouseUp = () => {
        isDragging.current = false;
        document.body.style.cursor = "default";
    };

    useEffect(() => {
        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);
        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };
    }, []);

    if (!roomId || !ok || loading)
        return <div className="p-8">Loading room...</div>;

    const token = session?.access_token;

    return (
        <main className="p-8 h-screen flex flex-col overflow-hidden select-none">
            <div className="flex justify-between items-center mb-6">
                {/* TODO: Problem metadata display */}
                <ProblemTitle
                    title="Reverse Linked List"
                    description="Implement a function that reverses a linked list."
                    difficulty="Medium"
                    acceptanceRate="62%"
                />
                {/* TODO: Replace 'questionId' with actual question/problem ID from context or props */}
                {token && <LeaveButton questionId={roomId} token={token} />}
            </div>

            {token && (
                <div
                    id="resizable-container"
                    className="flex flex-row flex-grow overflow-hidden relative"
                    style={{ minHeight: 0 }}
                >
                    {/* Code Editor Panel */}
                    <div
                        className="h-full"
                        style={{
                            width: `${dividerX}%`,
                            minWidth: "300px",
                            transition: isDragging.current
                                ? "none"
                                : "width 0.1s ease-out",
                        }}
                    >
                        <MonacoCollabTextArea roomId={roomId} token={token} />
                    </div>

                    {/* Divider */}
                    <div
                        onMouseDown={handleMouseDown}
                        className="cursor-col-resize hover:bg-accent transition-colors"
                        style={{
                            width: "6px",
                            backgroundColor: "rgba(150, 150, 150, 0.3)",
                            cursor: "col-resize",
                            zIndex: 10,
                        }}
                    ></div>

                    {/* Comment Panel */}
                    {/* <div
                        className="grow h-full"
                        style={{
                            width: `${100 - dividerX}%`,
                            minWidth: "250px",
                            maxHeight: "400px",
                        }}
                    >
                        <CommentPanel roomId={roomId} token={token} />
                    </div> */}
                </div>
            )}
        </main>
    );
}
