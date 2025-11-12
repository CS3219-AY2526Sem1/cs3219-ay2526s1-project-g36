"use client";

import { useState, useEffect } from "react";
import { getSession, logout } from "../../../../lib/auth";
import { useRouter } from "next/navigation";
import { useRequireAuth } from "../../../../lib/useRequireAuth";
import ProblemTitle from "../../components/room/ProblemTitle";
import QuestionDropdown from "../../components/room/QuestionDropdown";
import MonacoCollabTextArea from "../../components/room/MonacoCollabTextArea";
import EditHistory from "../../components/room/EditHistory";
import LeaveButton from "../../components/room/LeaveButton";
import { Session } from "@supabase/supabase-js";
import { qnJson } from "../../../../lib/qn";

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
    const [canonicalQuestionId, setCanonicalQuestionId] = useState<number | null>(null);
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
                    if (parsed.questionId !== undefined && parsed.questionId !== null) {
                        const qid = Number(parsed.questionId);
                        if (!Number.isNaN(qid)) setCanonicalQuestionId(qid);
                    }
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

    // Load problem: prefer canonicalQuestionId (from matched event), else fallback to localStorage selection
    useEffect(() => {
        let cancelled = false;
        const loadFromQn = async (id: number) => {
            try {
                const doc = await qnJson<any>(`/questions/${id}`);
                if (cancelled) return;
                setProblem({
                    title: doc.title || doc.name || "Problem",
                    description: doc.description || "",
                    difficulty: String(doc.difficulty || "medium"),
                    acceptanceRate: doc.acceptance_rate ?? doc.acceptanceRate ?? undefined,
                });
            } catch (e) {
                console.warn("Failed to load canonical question; falling back to local selection.", e);
                if (!cancelled) loadFromLocal();
            }
        };
        const loadFromLocal = () => {
            try {
                const raw = typeof window !== "undefined" ? localStorage.getItem("currentProblem") : null;
                if (raw) {
                    const p = JSON.parse(raw);
                    if (p && typeof p === "object") {
                        setProblem({
                            title: p.name || p.title || "Problem",
                            description: p.description || "",
                            difficulty: String(p.difficulty || "medium"),
                            acceptanceRate: p.acceptanceRate ?? p.acceptance_rate ?? undefined,
                        });
                    }
                }
            } catch {}
        };

        if (canonicalQuestionId) {
            loadFromQn(canonicalQuestionId);
        } else {
            loadFromLocal();
        }
        return () => {
            cancelled = true;
        };
    }, [canonicalQuestionId]);

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

        const userServiceUrl = process.env.NEXT_PUBLIC_USER_SERVICE_URL;
        if (!userServiceUrl) {
            console.warn('NEXT_PUBLIC_USER_SERVICE_URL is not set. profile fetches will fail.');
            // allow rendering the room even if the user-service URL is missing
            setLoading(false);
            return;
        }

        const fetchOwnName = async () => {
            const response = await fetch(
                    `${userServiceUrl}/profile/me`,
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
                    `${userServiceUrl}/profile/username?userId=${partnerId}`,
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

    if (!roomId || !ok || !ownUserId || loading) {
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
                <div className="flex flex-row flex-grow overflow-hidden" style={{ minHeight: 0 }}>
                    {/* Left column: question card + editor */}
                    <div className="flex flex-col flex-grow overflow-hidden" style={{ minHeight: 0 }}>
                        <div style={{ zIndex: 2 }}>
                            <QuestionDropdown
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

                        <div className="flex-grow h-full overflow-hidden" style={{ minWidth: 300 }}>
                            <MonacoCollabTextArea roomId={roomId} token={token} ownUserId={ownUserId!} ownName={ownName ?? "You"} partnerName={partnerName ?? "Partner"} showHistory={false} />
                        </div>
                    </div>

                    {/* Right column: Edit history (fixed) */}
                    <div style={{ width: 340, minWidth: 280, marginLeft: 12 }}>
                        {/* Make the edit history fill the viewport height so it appears to occupy the full right side */}
                        <div style={{ position: "sticky", top: 0, alignSelf: "start", height: "100vh", overflow: "auto", boxSizing: "border-box", paddingTop: 32 }}>
                            <EditHistory roomId={roomId} token={token} ownUserId={ownUserId!} ownName={ownName} partnerName={partnerName} />
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
