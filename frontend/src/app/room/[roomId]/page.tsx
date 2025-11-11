"use client";

import { useState, useEffect, useRef } from "react";
import { getSession, logout } from "../../../../lib/auth";
import { useRouter } from "next/navigation";
import { useRequireAuth } from "../../../../lib/useRequireAuth";
import ProblemTitle from "../../components/room/ProblemTitle";
import QuestionPanel from "../../components/room/QuestionPanel";
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
    const [problem, setProblem] = useState<{
        title: string;
        description: string;
        difficulty: string;
        acceptanceRate?: number | string;
    } | null>(null);
    const [ownUserId, setOwnUserId] = useState<string | null>(null);
    const [partnerId, setPartnerId] = useState<string | null>(null);
    const [ownName, setOwnName] = useState<string | null>(null);
    const [partnerName, setPartnerName] = useState<string | null>(null);

    // Resolve params safely
    useEffect(() => {
        (async () => {
            const resolved = await params;
            setRoomId(resolved.roomId);
            try {
                const meta = sessionStorage.getItem(
                    `roommeta:${resolved.roomId}`
                );
                if (meta) {
                    const parsed = JSON.parse(meta);
                    setPartnerId(parsed.matchedUserId || null);
                }
            } catch (e) {
                console.error("Error parsing room metadata:", e);
            }
        })();
    }, [params]);

    // Load session
    useEffect(() => {
        if (!ok) return;

        const loadSession = async () => {
            const s = await getSession();
            if (!s) throw new Error("Unable to fetch session");
            setSession(s);
            setOwnUserId(s.user.id);
            setLoading(false);
        };
        loadSession();
    }, [ok]);

    // Load selected problem from localStorage (set when user clicked Find Match)
    useEffect(() => {
        try {
            const raw =
                typeof window !== "undefined"
                    ? localStorage.getItem("currentProblem")
                    : null;
            if (raw) {
                const p = JSON.parse(raw);
                if (p && typeof p === "object") {
                    setProblem({
                        title: p.name || p.title || "Problem",
                        description: p.description || "",
                        difficulty: String(p.difficulty || "medium"),
                        acceptanceRate:
                            p.acceptanceRate ?? p.acceptance_rate ?? undefined,
                    });
                }
            }
        } catch {}
    }, []);

    // Record attempt start time when entering room
    useEffect(() => {
        try {
            if (typeof window !== "undefined") {
                const existing = localStorage.getItem("attemptStart");
                if (!existing) {
                    localStorage.setItem(
                        "attemptStart",
                        new Date().toISOString()
                    );
                }
            }
        } catch {}
    }, []);

    useEffect(() => {
        if (!partnerId || !session) return;

        const fetchOwnName = async () => {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_USER_SERVICE_URL}/profile/me`,
                {
                    headers: {
                        Authorization: `Bearer ${session?.access_token}`,
                    },
                }
            );
            if (!response.ok) {
                return;
            }
            const data = await response.json();
            setOwnName(data.profile.username || null);
        };

        const fetchPartnerName = async () => {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_USER_SERVICE_URL}/profile/username?userId=${partnerId}`,
                {
                    headers: {
                        Authorization: `Bearer ${session?.access_token}`,
                    },
                }
            );
            if (!response.ok) {
                return;
            }
            const { username } = await response.json();
            setPartnerName(username || null);
        };
        fetchPartnerName();
        fetchOwnName();
    }, [partnerId, session, ownUserId]);

    if (!roomId || !ok || !ownUserId || !ownName || !partnerName || loading) {
        return <div className="p-8">Loading room...</div>;
    }

    const token = session?.access_token;

    return (
        <main className="p-8 min-h-screen flex flex-col select-none">
            <div className="flex justify-between items-center mb-3">
                <ProblemTitle
                    title={problem?.title || "Problem"}
                    description={
                        problem?.description ||
                        "Open the question panel to view details."
                    }
                    difficulty={(problem?.difficulty ?? "medium").toString()}
                    acceptanceRate={
                        problem?.acceptanceRate !== undefined
                            ? `${problem.acceptanceRate}`
                            : "—"
                    }
                />
                <LeaveButton />
            </div>
            {/* Inline hint when no problem found */}
            {!problem && (
                <div className="mb-4 text-sm text-gray-600">
                    No question selected. If you matched from a problem card, it
                    will show here.
                </div>
            )}
            <div className="mb-4 text-sm text-gray-700 dark:text-gray-300">
                {partnerName ? (
                    <>
                        Matched with{" "}
                        <span className="text-blue-500 dark:text-blue-400 font-semibold">
                            {partnerName}
                        </span>
                    </>
                ) : partnerId ? (
                    <span className="text-gray-500 dark:text-gray-400">
                        Loading partner…
                    </span>
                ) : (
                    <span className="text-gray-500 dark:text-gray-400">
                        Matched user unknown
                    </span>
                )}
            </div>
            {token && (
                <div className="mb-6" style={{ height: "600px" }}>
                    <MonacoCollabTextArea
                        roomId={roomId}
                        token={token}
                        ownUserId={ownUserId}
                        ownName={ownName ?? "You"}
                        partnerName={partnerName ?? "Partner"}
                    />
                </div>
            )}
            \{/* Comment Panel - Kept for potential future use */}
            {/* {token && (
                <div className="grow h-full" style={{ minWidth: "250px" }}>
                    <CommentPanel roomId={roomId} token={token} />
                </div>
            )} */}
            {/* Question Panel (below editor) */}
            <div className="mb-8">
                <QuestionPanel
                    title={problem?.title}
                    description={problem?.description}
                    difficulty={problem?.difficulty}
                    acceptanceRate={
                        typeof problem?.acceptanceRate === "number"
                            ? problem?.acceptanceRate
                            : undefined
                    }
                />
            </div>
        </main>
    );
}
