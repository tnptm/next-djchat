'use client';
import {useState, useEffect, useRef} from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useWebSocket, useRoomWebSocket } from '../context/WebSocketContext';
//import ChatAddRoom from './chat/ChatAddRoom';
//import ChatFileUpload from './chat/ChatFileUpload';
import ChatMessageSender from './chat/ChatMessageSender';
import ChatMessages from './chat/ChatMessages';
import ChatRoomManager from './chat/ChatRoomManager';
import WebSocketStatus from './WebSocketStatus';

interface ChatAttachment {
    id: string;
    file_url: string;
    file_size: number;
    content_type: string;
}

export interface ChatMessage {
    id: number|string;
    plaintext: string;
    sender: string;
    created_at: string;
    room_id?: string;
    attachments?: ChatAttachment[];
}

interface ChatRoom {
    id?: string | number ;
    name: string;
    description?: string;
    invited_usernames: string[];
    is_private?: boolean;
    member_usernames?: string[];
}


export default function ChatMain() {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [viewRoomAddInput, setViewRoomAddInput] = useState(false);
    const [newRoom, setNewRoom] = useState<ChatRoom | null>(null);
    const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
    const [viewChatRoomManager, setViewChatRoomManager] = useState(true);
    
    const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
    const {tokens, user, logout} = useAuth();
    const ws = useWebSocket();




    // Use room-specific WebSocket hook
    const { newMessage, isConnected } = useRoomWebSocket(
        selectedRoom?.id ? String(selectedRoom.id) : null
    );

    useEffect(() => {
        // Load initil chat rooms (mocked here)
        function fetchChatRooms() {
            //fetch chat rooms from backend api /api/rooms
            axios.get('/api/rooms/', {
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
            axios.get(`/api/rooms/${selectedRoom.id}/messages/`, {
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
            axios.get(`/api/rooms/${selectedRoom.id}/messages/?limit=1&offset=0`, {
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



 

    const toggleRoomAddInput = () => {
        setViewRoomAddInput(!viewRoomAddInput);
    };


    function handleRoomCreate(newRoomData: ChatRoom) {
        if (newRoomData.name.trim() && !chatRooms.find(room => room.name === newRoomData.name.trim()) && newRoomData.invited_usernames.length > 0) {
            // try to create room via backend api /api/rooms
            try {
                axios.post('/api/rooms/', {
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

        }
    }

    function handleAddNewMessage(message: ChatMessage) {
        //setMessages(prevMessages => [...prevMessages, message]);
        /*let newMessage: ChatMessage = {
            id: message.id,
            plaintext: message.plaintext,
            sender: message.sender,
            created_at: message.created_at,
            room_id: message.room_id,
            
        };
        if (message.attachment && message.attachment.file_url) {
            newMessage.attachments = [newMessage?.attachment];
        }*/
        //        id: message.attachment.id,

        setMessages(prevMessages => [...prevMessages, message]);
    }

 

    return (
        <>
        <div>

        </div>
        <div className="flex flex-col h-full border border-gray-300 rounded-lg bg-white sm:pt-4 pt-2 pb-8 m-0 lg:m-4 ">
            {/*<p className="text-sm text-gray-600 mb-2 ml-3">Selected Room: <strong>{selectedRoom?.name || 'None'}</strong></p>*/}
            <div className="pl-4">
                {/* toggle aside room manager */}
                <button className={`rounded-full bg-gray-200 hover:bg-gray-300 py-1 px-2.5 mr-2 my-1 coursor-pointer`} onClick={() => setViewChatRoomManager(!viewChatRoomManager)}>☰</button>
                <span>Welcome </span>
                <span className="font-semibold text-lg text-red-500"> {user?.username} </span>
                <button className="ml-4 text-blue-500 font-semibold cursor-pointer hover:underline" onClick={logout}>
                    Log out
                </button>
                <span className={`ml-6 text-sm ${selectedRoom ? 'text-green-600' : 'text-red-600'}`} onClick={() => setViewChatRoomManager(true)}>
                    You're in the room: <strong>{selectedRoom ? selectedRoom.name : 'No room selected'}</strong>
                </span>
            </div>
            <div className="flex flex-row sm:pl-2 md:pl-4 pl-1">
                
                <ChatRoomManager
                    viewRoom={viewChatRoomManager}
                    setViewRoom={setViewChatRoomManager}
                    chatRooms={chatRooms}
                    user={user}
                    viewRoomAddInput={viewRoomAddInput}
                    toggleRoomAddInput={toggleRoomAddInput}
                    handleRoomCreate={handleRoomCreate}
                    setSelectedRoom={setSelectedRoom}
                />
                <div className=" w-full sm:pr-2 md:pr-4 pr-1">
                    
                    <ChatMessages messages={messages}/>
                    

                    {/*<div className="flex w-full justify-between">
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
                    </div>*/}
                    <div>
                        <WebSocketStatus />
                    </div>
                </div>
            </div>
            <div className="flex sm:pl-2 md:pl-4 pl-1 mt-auto">
                <div className=" w-full sm:pr-2 md:pr-4 pr-1">
                    <div>
                        <ChatMessageSender
                            roomId={selectedRoom ? String(selectedRoom.id) : ''}
                            onMessageSent={handleAddNewMessage}
                        />
                    </div>
                </div>
            </div>
        </div>
        </>
    );
}
   /*const handleSendMessage = () => {
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
            setInput('');
        }
    };*/

    //const [ showFileUpload, setShowFileUpload ] = useState(false);
    /*const handleSendFile = () => {
        // Implement file sending logic here
        //alert('File sending not implemented yet.');
        setShowFileUpload(!showFileUpload);
    };*/