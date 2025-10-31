"use client";

import { use, useEffect, useState } from "react";
import { getSession, logout } from "../../../../lib/auth";
import CollabTextArea from "../../components/room/CollabTextArea";
import { Session } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useRequireAuth } from '../../../../lib/useRequireAuth';

type Props = {
    params: Promise<{ roomId: string }>;
};

export default function RoomPage({ params }: Props) {
    const ok = useRequireAuth();
    if (!ok) {
        return <div className="flex h-screen items-center justify-center">
            <span className="animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-600" />
        </div>;
    }
    const { roomId } = use(params);
    const router = useRouter();
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            const fetchedSession = await getSession();
            if (!fetchedSession) {
                throw new Error("Unable to fetch session");
            }
            setSession(fetchedSession);
            setLoading(false);
        };
        fetchData();
    }, [roomId]);

    if (loading) {
        return <div className="p-8">Loading room...</div>;
    }

    if (!session) {
        throw new Error("No session available");
    }

    const token = session.access_token;

    const handleSignOut = async () => {
        await logout();
        router.push("/login");
    };

    return (
        <main className="p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Collaboration Room</h1>
                <button
                    onClick={handleSignOut}
                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
                >
                    Sign Out (Debug)
                </button>
            </div>
            <p className="text-gray-700 mb-4">
                You are in room: <span className="font-mono">{roomId}</span>
            </p>

            <div className="grid grid-cols-2 gap-6">
                <section className="border p-4 rounded-lg">
                    <h2 className="font-semibold mb-2">Problem</h2>
                    <p className="text-sm text-gray-600">
                        Implement a function that reverses a linked list.
                    </p>
                </section>

                <CollabTextArea roomId={roomId} token={token} />
            </div>
        </main>
    );
}
