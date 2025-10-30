"use client";

import { use, useEffect, useState } from "react";
import { getSession } from "../../../../lib/auth";
import CollabTextArea from "../../components/room/CollabTextArea";
import { Session } from "@supabase/supabase-js";

type Props = {
    params: Promise<{ roomId: string }>;
};

export default function RoomPage({ params }: Props) {
    const { roomId } = use(params);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            const fetchedSession = await getSession();
            console.log("Session in RoomPage:", fetchedSession);
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

    return (
        <main className="p-8">
            <h1 className="text-3xl font-bold mb-6">Collaboration Room</h1>
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
