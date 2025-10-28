import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getMatchingSocket(token: string): Socket {
    // Reuse existing socket if available
    if (socket && socket.connected) {
        return socket;
    }

    const serverUrl = process.env.NEXT_PUBLIC_MATCHING_SERVICE_URL;

    // Initialize new socket connection
    socket = io(serverUrl, {
        transports: ["websocket"],
        auth: {
            token,
        },
        forceNew: false,
    });

    return socket;
}
