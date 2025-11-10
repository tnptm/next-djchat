# WebSocket Client Usage Guide

## Overview

The WebSocket client provides a reusable, context-based solution for real-time communication in the Next.js chat application. It handles connection management, reconnection logic, room subscriptions, and event handling.

## Setup

### 1. Environment Configuration

Add the WebSocket URL to your `.env.local` file:

```bash
NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws/rooms/
```

### 2. Provider Setup

The `WebSocketProvider` is already configured in `app/layout.tsx`:

```tsx
import { AuthProvider } from "./context/AuthContext";
import { WebSocketProvider } from "./context/WebSocketContext";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <WebSocketProvider>
            {children}
          </WebSocketProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
```

## Usage

### Basic WebSocket Hook

Use `useWebSocket()` to access WebSocket functionality:

```tsx
import { useWebSocket } from '../context/WebSocketContext';

function MyComponent() {
  const ws = useWebSocket();

  useEffect(() => {
    // Subscribe to a room
    ws.subscribe('room-uuid-123');

    // Listen for events
    const handleNewMessage = (data) => {
      console.log('New message:', data);
    };

    ws.on('new_message', handleNewMessage);

    // Cleanup
    return () => {
      ws.off('new_message', handleNewMessage);
      ws.unsubscribe('room-uuid-123');
    };
  }, [ws]);

  // Check connection status
  if (!ws.isConnected) {
    return <div>Connecting to chat server...</div>;
  }

  return <div>Connected!</div>;
}
```

### Room-Specific Hook

For room-specific functionality, use `useRoomWebSocket()`:

```tsx
import { useRoomWebSocket } from '../context/WebSocketContext';

function ChatRoom({ roomId }) {
  const { newMessage, isConnected } = useRoomWebSocket(roomId);

  useEffect(() => {
    if (newMessage) {
      console.log('New message in room:', newMessage);
      // Fetch the new message or update UI
    }
  }, [newMessage]);

  return (
    <div>
      <div>Status: {isConnected ? 'Connected' : 'Disconnected'}</div>
      {/* Rest of your component */}
    </div>
  );
}
```

### Full Example: Chat Component

```tsx
'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useRoomWebSocket } from '../context/WebSocketContext';

export default function ChatRoom({ roomId }) {
  const [messages, setMessages] = useState([]);
  const { tokens } = useAuth();
  const { newMessage, isConnected } = useRoomWebSocket(roomId);

  // Load initial messages
  useEffect(() => {
    if (!roomId || !tokens.accessToken) return;

    axios.get(`http://localhost:8000/api/rooms/${roomId}/messages/`, {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
      },
    })
    .then(response => {
      setMessages(response.data);
    })
    .catch(error => {
      console.error('Error loading messages:', error);
    });
  }, [roomId, tokens.accessToken]);

  // Handle new message notifications from WebSocket
  useEffect(() => {
    if (newMessage && newMessage.type === 'new_message') {
      // Fetch the new message
      axios.get(
        `http://localhost:8000/api/rooms/${roomId}/messages/?limit=1&offset=0`,
        {
          headers: {
            Authorization: `Bearer ${tokens.accessToken}`,
          },
        }
      )
      .then(response => {
        if (response.data.length > 0) {
          const latestMessage = response.data[0];
          setMessages(prev => {
            // Avoid duplicates
            const exists = prev.some(m => m.id === latestMessage.id);
            if (!exists) {
              return [...prev, latestMessage];
            }
            return prev;
          });
        }
      })
      .catch(error => {
        console.error('Error fetching new message:', error);
      });
    }
  }, [newMessage, roomId, tokens.accessToken]);

  const sendMessage = (text) => {
    axios.post(
      `http://localhost:8000/api/rooms/${roomId}/messages/`,
      { plaintext: text },
      {
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
        },
      }
    )
    .then(response => {
      // Message will be added via WebSocket notification
      console.log('Message sent:', response.data);
    })
    .catch(error => {
      console.error('Error sending message:', error);
    });
  };

  return (
    <div>
      <div>Status: {isConnected ? '🟢 Connected' : '🔴 Disconnected'}</div>
      <div>
        {messages.map(msg => (
          <div key={msg.id}>
            <strong>{msg.sender}:</strong> {msg.plaintext}
          </div>
        ))}
      </div>
    </div>
  );
}
```

## API Reference

### `useWebSocket()`

Returns an object with:

| Property | Type | Description |
|----------|------|-------------|
| `isConnected` | `boolean` | WebSocket connection status |
| `subscribe(roomId)` | `function` | Subscribe to room updates |
| `unsubscribe(roomId)` | `function` | Unsubscribe from room updates |
| `on(eventType, handler)` | `function` | Add event listener |
| `off(eventType, handler)` | `function` | Remove event listener |
| `send(data)` | `function` | Send raw data to server |
| `reconnect()` | `function` | Manually trigger reconnection |

### `useRoomWebSocket(roomId)`

Automatically subscribes/unsubscribes to a room. Returns:

| Property | Type | Description |
|----------|------|-------------|
| `newMessage` | `WebSocketMessage \| null` | Latest message notification |
| `isConnected` | `boolean` | WebSocket connection status |

## WebSocket Message Format

Messages from the server follow this structure:

```typescript
interface WebSocketMessage {
  type: string;           // e.g., 'new_message'
  room_id?: string;       // UUID of the room
  message_id?: string;    // UUID of the message
  [key: string]: any;     // Additional properties
}
```

## Event Types

| Event Type | Description | Data |
|------------|-------------|------|
| `new_message` | New message posted to room | `{ type, room_id, message_id }` |
| `message` | Generic message event | Any WebSocket message |

## Advanced Usage

### Custom Event Handlers

```tsx
import { useWebSocket } from '../context/WebSocketContext';

function NotificationHandler() {
  const ws = useWebSocket();

  useEffect(() => {
    const handleRoomUpdate = (data) => {
      console.log('Room updated:', data);
      // Handle room updates
    };

    const handleUserStatus = (data) => {
      console.log('User status:', data);
      // Handle user online/offline status
    };

    ws.on('room_update', handleRoomUpdate);
    ws.on('user_status', handleUserStatus);

    return () => {
      ws.off('room_update', handleRoomUpdate);
      ws.off('user_status', handleUserStatus);
    };
  }, [ws]);

  return null;
}
```

### Manual Connection Control

```tsx
import { useWebSocket } from '../context/WebSocketContext';

function ConnectionStatus() {
  const ws = useWebSocket();

  return (
    <div>
      <div>Status: {ws.isConnected ? 'Connected' : 'Disconnected'}</div>
      {!ws.isConnected && (
        <button onClick={ws.reconnect}>
          Reconnect
        </button>
      )}
    </div>
  );
}
```

## Features

### ✅ Automatic Reconnection
- Exponential backoff strategy
- Max 5 reconnection attempts
- Automatic resubscription to rooms after reconnect

### ✅ Connection Management
- Automatic connection on token availability
- Clean disconnection on logout
- Connection status monitoring

### ✅ Room Subscriptions
- Subscribe to multiple rooms simultaneously
- Automatic resubscription after reconnection
- Clean unsubscription on component unmount

### ✅ Event Handling
- Type-safe event handlers
- Support for multiple handlers per event
- Easy cleanup with `off()` method

## Troubleshooting

### Connection Issues

1. **WebSocket won't connect:**
   - Verify `NEXT_PUBLIC_WS_URL` is set correctly
   - Check that backend WebSocket server is running
   - Ensure JWT token is valid

2. **Connection drops frequently:**
   - Check network stability
   - Verify backend WebSocket timeout settings
   - Review browser console for errors

3. **Messages not received:**
   - Confirm room subscription: `ws.subscribe(roomId)`
   - Check event handler is registered: `ws.on('new_message', handler)`
   - Verify message format from backend matches expected structure

### Debug Mode

Add console logging to see WebSocket activity:

```tsx
useEffect(() => {
  const handleMessage = (data) => {
    console.log('[WS] Message received:', data);
  };

  ws.on('message', handleMessage);

  return () => {
    ws.off('message', handleMessage);
  };
}, [ws]);
```

## Best Practices

1. **Always cleanup subscriptions:**
   ```tsx
   useEffect(() => {
     ws.subscribe(roomId);
     return () => ws.unsubscribe(roomId);
   }, [roomId, ws]);
   ```

2. **Remove event handlers on unmount:**
   ```tsx
   useEffect(() => {
     ws.on('event', handler);
     return () => ws.off('event', handler);
   }, [ws]);
   ```

3. **Use the room-specific hook when possible:**
   ```tsx
   // ✅ Good
   const { newMessage } = useRoomWebSocket(roomId);
   
   // ❌ Avoid manual subscription management
   const ws = useWebSocket();
   useEffect(() => {
     ws.subscribe(roomId);
     ws.on('new_message', handler);
     // ... manual cleanup
   }, []);
   ```

4. **Check connection status before critical operations:**
   ```tsx
   if (ws.isConnected) {
     // Safe to send messages or expect real-time updates
   }
   ```

## Future Enhancements

- [ ] Typing indicators
- [ ] Read receipts
- [ ] User presence (online/offline status)
- [ ] Message reactions
- [ ] File upload progress via WebSocket
- [ ] Room member updates
- [ ] Direct message notifications
