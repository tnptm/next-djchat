'use client';
import {useState, useEffect} from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useWebSocket, useRoomWebSocket } from '../context/WebSocketContext';
import ChatAddRoom from './chat/ChatAddRoom';

interface ChatMessage {
    id: number;
    plaintext: string;
    sender: string;
    created_at: string;
}

interface ChatRoom {
    id?: string | number ;
    name: string;
    description?: string;
    invited_usernames: string[];
    is_private?: boolean;
    member_usernames?: string[];
}
/*
const messagesData: ChatMessage[] = [
    { id: 1, content: 'Hello! How can I help you today?', sender: 'System', timestamp: '2024-06-01T10:00:00Z' },
    { id: 2, content: 'What is the weather like?', sender: 'User', timestamp: '2024-06-01T10:01:00Z' },
    { id: 3, content: 'Tell me a joke!', sender: 'User', timestamp: '2024-06-01T10:02:00Z' },
    { id: 4, content: 'What is the capital of France?', sender: 'User', timestamp: '2024-06-01T10:03:00Z' },
    { id: 5, content: 'How do I make a cake?', sender: 'User', timestamp: '2024-06-01T10:04:00Z' },
]

const chatRoomsData: ChatRoom[] = [
    { id: 1, name: 'General', invitedUsernames: [] },
    { id: 2, name: 'Tech Talk', invitedUsernames: [] },
    { id: 3, name: 'Random', invitedUsernames: [] },
];
*/
export default function ChatMain({user}: {user: any}) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [viewRoomAddInput, setViewRoomAddInput] = useState(false);
    const [newRoom, setNewRoom] = useState<ChatRoom | null>(null);
    const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
    
    const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
    const {tokens} = useAuth();
    const ws = useWebSocket();
    
    // Use room-specific WebSocket hook
    const { newMessage, isConnected } = useRoomWebSocket(
        selectedRoom?.id ? String(selectedRoom.id) : null
    );

    useEffect(() => {
        // Load initil chat rooms (mocked here)
        function fetchChatRooms() {
            //fetch chat rooms from backend api /api/rooms
            axios.get('http://localhost:8000/api/rooms/', {
                headers: {
                    Authorization: `Bearer ${tokens.accessToken}`,
                },
            })
            .then(response => {
                setChatRooms(response.data);
            })
            .catch(error => {
                console.error('Error fetching chat rooms:', error);
                setChatRooms([]);
            });
        }
        fetchChatRooms();
        //
        
    }, []);

  

    useEffect(() => {
        // Load initial messages and chat rooms (mocked here)
        if (selectedRoom) {
            //fetch messages for selected room from backend api /api/rooms/{selectedRoom.id}/messages
            axios.get(`http://localhost:8000/api/rooms/${selectedRoom.id}/messages/`, {
                headers: {
                    Authorization: `Bearer ${tokens.accessToken}`,
                },
            })
            .then(response => {
                setMessages(response.data);
            })
            .catch(error => {
                console.error('Error fetching messages for room:', error);
                setMessages([]);
            });
        } else {
            setMessages([]);
        }
    }, [selectedRoom]);

    // Handle WebSocket new message notifications
    useEffect(() => {
        if (newMessage && newMessage.type === 'new_message' && selectedRoom) {
            console.log('New message notification received:', newMessage);
            
            // Fetch the new message from the API
            // In a real app, you might want to fetch just the new message
            // or append it if it's included in the WebSocket payload
            axios.get(`http://localhost:8000/api/rooms/${selectedRoom.id}/messages/?limit=1&offset=0`, {
                headers: {
                    Authorization: `Bearer ${tokens.accessToken}`,
                },
            })
            .then(response => {
                if (response.data.length > 0) {
                    const latestMessage = response.data[0];
                    // Only add if not already in messages
                    setMessages(prev => {
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
    }, [newMessage, selectedRoom, tokens.accessToken]);

    // File upload states
    /*
    const [file, setFile] = useState<File | null>(null);
    const [filePreview, setFilePreview] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
        */

    const handleSendMessage = () => {
        if (input.trim()) {
            // Send message to backend api /api/rooms/{selectedRoom.id}/messages
            if (selectedRoom) {
                axios.post(`http://localhost:8000/api/rooms/${selectedRoom.id}/messages/`, {
                    plaintext: input,
                }, {
                    headers: {
                        Authorization: `Bearer ${tokens.accessToken}`,
                    },
                })
                .then(response => {
                    // Append new message to state
                    setMessages(prevMessages => [...prevMessages, response.data]);
                    setInput('');
                })
                .catch(error => {
                    console.error('Error sending message:', error);
                });
            }
            /*setMessages(prevMessages => [
                ...prevMessages,
                {
                id: prevMessages.length + 1,
                content: input,
                sender: user?.username || 'User',
                timestamp: new Date().toISOString(),
                },
            ]);
            setInput('');*/
        }
    };

    const handleSendFile = () => {
        // Implement file sending logic here
        alert('File sending not implemented yet.');
    };

    const toggleRoomAddInput = () => {
        setViewRoomAddInput(!viewRoomAddInput);
    };


    function handleRoomCreate(newRoomData: ChatRoom) {
        if (newRoomData.name.trim() && !chatRooms.find(room => room.name === newRoomData.name.trim()) && newRoomData.invited_usernames.length > 0) {
            // try to create room via backend api /api/rooms
            try {
                axios.post('http://localhost:8000/api/rooms/', {
                    ...newRoomData
                }, {
                    headers: {
                        Authorization: `Bearer ${tokens.accessToken}`,
                    },
                })
                .then(response => {
                    // check response status is 201 (Created)
                    if (response.status !== 201) {
                        console.error('Error creating chat room:', response);
                        return;
                    }
                    // Add new room to state
                    setChatRooms(prevRooms => [...prevRooms, response.data]);
                    //setNewRoom(null);
                    setViewRoomAddInput(false);
                })
                .catch(error => {
                    console.error('Error creating chat room:', error);
                });
            } catch (error) {
                console.error('Error creating chat room:', error);
            }
        /*setChatRooms(prevRooms => [
            ...prevRooms,
            {
            id: prevRooms.length + 1,
            name: newRoomName,
            },
        ]);
        setNewRoomName('');
        setViewRoomAddInput(false);*/
        }
    }

    return (
        <div className="flex flex-col h-full border border-gray-300 rounded-lg bg-white pt-4 pb-8 m-4">
            <div className="flex flex-row gap-1 pl-4">
                <aside className="w-1/4 p-4 bg-gray-200 h-full mr-4">
                    <div>{user?.username}'s chat</div>
                    <p className="font-semibold">Chat rooms</p>
                    <p className="text-sm text-gray-600 mb-2">Selected Room: {selectedRoom?.name || 'None'}</p>
                    <ul className="mt-2">
                        {chatRooms.map(room => (
                            <li key={room.id} className="mb-2 p-2 bg-white rounded cursor-pointer hover:bg-gray-300" onClick={() => setSelectedRoom(room)}>
                                <p>{room.name}</p>
                                <p className="text-sm text-gray-500">{room.member_usernames?.join(', ')}</p>
                            </li>
                        ))}
                    </ul>
                    {
                    !viewRoomAddInput && (
                        <button className="mt-4 w-full rounded bg-blue-500 px-4 py-2 text-white" onClick={toggleRoomAddInput}>Create New Room</button>
                    )
                    }

                    {/* Room creation input can be conditionally rendered here */}
                    {viewRoomAddInput && (
                        <ChatAddRoom onCreateRoom={handleRoomCreate} />
                    )}
                </aside>
                <div className=" w-full pr-4">
                    <div className="overflow-y-auto p-4 bg-stone-100 mb-4 w-full h-[500px]">
                        {/* Chat messages will be rendered here */}
                        {
                            messages.map((msg, index) => (
                                <div key={index} className="mb-2">
                                    <div className={`flex rounded px-4 py-2 text-gray-700 w-fit ${msg.sender === user?.username ? 'bg-amber-200 ml-auto' : 'bg-purple-200'}`}>
                                        {new Date(msg.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} {msg.sender}: {msg.plaintext}
                                    </div>
                                </div>
                        ))}
                    </div>
                    {/* Chat input field will be rendered here */}
                    <div className="flex w-full justify-between">
                        <input
                            type="text"
                            placeholder="Type your message..."
                            className="w-4/5 rounded border border-gray-300 p-2"
                            value={input}                    
                            onChange={(e) => setInput(e.target.value)}
                        />
                        <button
                            onClick={handleSendFile}
                            className="ml-1 rounded bg-slate-200 px-4 py-2 text-gray-700 hover:bg-slate-300 cursor-pointer transition-colors ease-in-out duration-200"
                        >
                            Send File
                        </button>
                        <button
                            onClick={handleSendMessage}
                            className="ml-1 rounded bg-blue-400 px-4 py-2 text-white hover:bg-blue-500 cursor-pointer transition-colors ease-in-out duration-200"
                        >
                            Send
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
