'use client';
import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';

// WebSocket message types from Django backend
export interface WebSocketMessage {
    type: string;
    room_id?: string;
    message_id?: string;
    [key: string]: any;
}

// Event handlers type
type WebSocketEventHandler = (data: WebSocketMessage) => void;

interface WebSocketContextType {
    isConnected: boolean;
    subscribe: (roomId: string) => void;
    unsubscribe: (roomId: string) => void;
    on: (eventType: string, handler: WebSocketEventHandler) => void;
    off: (eventType: string, handler: WebSocketEventHandler) => void;
    send: (data: any) => void;
    reconnect: () => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

interface WebSocketProviderProps {
    children: React.ReactNode;
    wsUrl?: string;
}

export function WebSocketProvider({ 
    children, 
    wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost/ws/rooms/'
}: WebSocketProviderProps) {
    const { tokens } = useAuth();
    const [isConnected, setIsConnected] = useState(false);
    const wsRef = useRef<WebSocket | null>(null);
    const eventHandlersRef = useRef<Map<string, Set<WebSocketEventHandler>>>(new Map());
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
    const reconnectAttemptsRef = useRef(0);
    const maxReconnectAttempts = 5;
    const subscribedRoomsRef = useRef<Set<string>>(new Set());

    // Connect to WebSocket
    const connect = useCallback(() => {
        if (!tokens?.accessToken) {
            console.log('WebSocket: No access token available');
            return;
        }

        // Close existing connection if any
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            console.log('WebSocket: Already connected');
            return;
        }

        try {
            const url = `${wsUrl}?token=${tokens.accessToken}`;
            console.log('WebSocket: Connecting...');
            const ws = new WebSocket(url);

            ws.onopen = () => {
                console.log('WebSocket: Connected');
                setIsConnected(true);
                reconnectAttemptsRef.current = 0;

                // Resubscribe to all rooms
                subscribedRoomsRef.current.forEach(roomId => {
                    ws.send(JSON.stringify({
                        action: 'subscribe',
                        room_id: roomId
                    }));
                });
            };

            ws.onmessage = (event) => {
                try {
                    const data: WebSocketMessage = JSON.parse(event.data);
                    console.log('WebSocket: Message received', data);

                    // Trigger event handlers for this message type
                    const handlers = eventHandlersRef.current.get(data.type);
                    if (handlers) {
                        handlers.forEach(handler => handler(data));
                    }

                    // Also trigger generic 'message' handlers
                    const messageHandlers = eventHandlersRef.current.get('message');
                    if (messageHandlers) {
                        messageHandlers.forEach(handler => handler(data));
                    }
                } catch (error) {
                    console.error('WebSocket: Error parsing message', error);
                }
            };

            ws.onerror = (error) => {
                console.error('WebSocket: Error', error);
            };

            ws.onclose = (event) => {
                console.log('WebSocket: Disconnected', event.code, event.reason);
                setIsConnected(false);
                wsRef.current = null;

                // Attempt to reconnect
                if (reconnectAttemptsRef.current < maxReconnectAttempts) {
                    const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
                    console.log(`WebSocket: Reconnecting in ${delay}ms...`);
                    reconnectTimeoutRef.current = setTimeout(() => {
                        reconnectAttemptsRef.current++;
                        connect();
                    }, delay);
                } else {
                    console.error('WebSocket: Max reconnection attempts reached');
                }
            };

            wsRef.current = ws;
        } catch (error) {
            console.error('WebSocket: Connection error', error);
        }
    }, [tokens?.accessToken, wsUrl]);

    // Subscribe to a room
    const subscribe = useCallback((roomId: string) => {
        if (!roomId) return;

        subscribedRoomsRef.current.add(roomId);

        if (wsRef.current?.readyState === WebSocket.OPEN) {
            console.log(`WebSocket: Subscribing to room ${roomId}`);
            wsRef.current.send(JSON.stringify({
                action: 'subscribe',
                room_id: roomId
            }));
        }
    }, []);

    // Unsubscribe from a room
    const unsubscribe = useCallback((roomId: string) => {
        if (!roomId) return;

        subscribedRoomsRef.current.delete(roomId);

        if (wsRef.current?.readyState === WebSocket.OPEN) {
            console.log(`WebSocket: Unsubscribing from room ${roomId}`);
            wsRef.current.send(JSON.stringify({
                action: 'unsubscribe',
                room_id: roomId
            }));
        }
    }, []);

    // Add event listener
    const on = useCallback((eventType: string, handler: WebSocketEventHandler) => {
        if (!eventHandlersRef.current.has(eventType)) {
            eventHandlersRef.current.set(eventType, new Set());
        }
        eventHandlersRef.current.get(eventType)!.add(handler);
    }, []);

    // Remove event listener
    const off = useCallback((eventType: string, handler: WebSocketEventHandler) => {
        const handlers = eventHandlersRef.current.get(eventType);
        if (handlers) {
            handlers.delete(handler);
        }
    }, []);

    // Send raw data
    const send = useCallback((data: any) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(data));
        } else {
            console.warn('WebSocket: Cannot send, not connected');
        }
    }, []);

    // Manual reconnect
    const reconnect = useCallback(() => {
        console.log('WebSocket: Manual reconnect triggered');
        if (wsRef.current) {
            wsRef.current.close();
        }
        reconnectAttemptsRef.current = 0;
        connect();
    }, [connect]);

    // Connect when tokens are available
    useEffect(() => {
        if (tokens?.accessToken) {
            connect();
        }

        // Cleanup
        return () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, [tokens?.accessToken, connect]);

    const value: WebSocketContextType = {
        isConnected,
        subscribe,
        unsubscribe,
        on,
        off,
        send,
        reconnect
    };

    return (
        <WebSocketContext.Provider value={value}>
            {children}
        </WebSocketContext.Provider>
    );
}

// Hook to use WebSocket
export function useWebSocket() {
    const context = useContext(WebSocketContext);
    if (!context) {
        throw new Error('useWebSocket must be used within a WebSocketProvider');
    }
    return context;
}

// Custom hook for room-specific WebSocket events
export function useRoomWebSocket(roomId: string | null) {
    const ws = useWebSocket();
    const [newMessage, setNewMessage] = useState<WebSocketMessage | null>(null);

    useEffect(() => {
        if (!roomId) return;

        // Subscribe to room
        ws.subscribe(roomId);

        // Handle new messages
        const handleNewMessage = (data: WebSocketMessage) => {
            if (data.room_id === roomId) {
                setNewMessage(data);
            }
        };

        ws.on('new_message', handleNewMessage);

        // Cleanup
        return () => {
            ws.off('new_message', handleNewMessage);
            ws.unsubscribe(roomId);
        };
    }, [roomId, ws]);

    return { newMessage, isConnected: ws.isConnected };
}
