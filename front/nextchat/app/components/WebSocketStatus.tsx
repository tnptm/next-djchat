'use client';
import { useWebSocket } from '../context/WebSocketContext';

/**
 * WebSocketStatus - Simple component to display WebSocket connection status
 * Add this to your layout or chat interface to show real-time connection status
 */
export default function WebSocketStatus() {
    const ws = useWebSocket();

    if (!ws.isConnected) {
        return (
            <div className="flex items-center gap-2 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg text-sm">
                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                <span className="text-yellow-800">Connecting to chat server...</span>
                <button
                    onClick={ws.reconnect}
                    className="ml-2 text-yellow-600 hover:text-yellow-800 underline"
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="flex items-center px-3 bg-green-50 border border-green-300 rounded-full text-sm">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span className="text-green-800">Connected</span>
        </div>
    );
}
