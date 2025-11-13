'use client';
import {useState, useEffect, useRef} from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
//import { useWebSocket, useRoomWebSocket } from '../context/WebSocketContext';
//import ChatAddRoom from './chat/ChatAddRoom';
import ChatFileUpload from './ChatFileUpload';

/*interface Attachment {
    id: string;
    file_url: string;
    file_size: number;
    content_type: string;
}

interface ChatMessage {
    id?: number;
    plaintext: string;
    sender: string;
    created_at?: string;
    room_id?: string;
    attachments?: Attachment[];
    //attachment?: Attachment;
}*/
import { ChatMessage } from '../ChatMain';

/**
 * This component allows users to send messages in a chat room, including uploading files as attachments. 
 * 
 */

/*


```bash
curl -X POST http://localhost:8000/api/rooms/<room_uuid>/upload/ \
  -H "Authorization: Bearer <access_token>" \
  -F "file=@/path/to/document.pdf" \
  -F "plaintext=Check out this document"
```

Response:
```json
{
  "id": "message-uuid",
  "sender": "alice",
  "plaintext": "Check out this document",
  "attachment": {
    "id": "attachment-uuid",
    "file_url": "http://localhost:8000/media/chat_files/2025/11/09/document.pdf",
    "file_size": 102400,
    "content_type": "application/pdf"
  },
  "created_at": "2025-11-09T12:34:56Z"
}
 */

export interface ChatMessageSenderProps {
    roomId: string;
    
    onMessageSent?: (message: ChatMessage) => void;
}

export default function ChatMessageSender({ roomId, onMessageSent }: ChatMessageSenderProps) {
    const { user, tokens } = useAuth();
    const [messageText, setMessageText] = useState('');
    const [isSending, setIsSending] = useState(false);
    const messageInputRef = useRef<HTMLTextAreaElement>(null);
    const [responseMessage, setResponseMessage] = useState<ChatMessage | null>(null);
    const [message, setMessage] = useState<ChatMessage>({
        id: '',
        plaintext: '',
        sender: '',
        created_at: '',
        room_id: roomId,
        //attachments: [],
        //attachment: undefined,
    });
    const [filesToUpload, setFilesToUpload] = useState<File | null>(null);

    const handleSendMessage = () => {
        if (messageText.trim()) {
            // Send message to backend api /api/rooms/{selectedRoom.id}/messages
            if (roomId && tokens.accessToken) {
                axios.post(`/api/rooms/${roomId}/messages/`, {
                    plaintext: messageText,
                }, {
                    headers: {
                        Authorization: `Bearer ${tokens.accessToken}`,
                    },
                })
                .then(response => {
                    // Append new message to state
                    setResponseMessage(response.data);
                    setMessageText('');
                    if (onMessageSent) {
                        onMessageSent(response.data);
                    }
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

    const sendMessage = async () => {
        if (!messageText.trim() && !filesToUpload) return; // Don't send empty messages

        setIsSending(true);
        
        if (filesToUpload) {
            const formData = new FormData();
            if (!tokens.accessToken) {
                console.error('No access token available');
                setIsSending(false);
                return;
            }
            if (messageText.trim()){
                formData.append('plaintext', messageText);
            }

            formData.append('file', filesToUpload);
        
            try {
                const response = await axios.post(
                    `/api/rooms/${roomId}/upload/`,
                    formData,
                    {
                        headers: {
                            Authorization: `Bearer ${tokens.accessToken}`,
                            'Content-Type': 'multipart/form-data',
                        },
                    }
                );
                setMessageText('');
                setResponseMessage(response.data);
                if (onMessageSent) {
                    onMessageSent(response.data);
                }
            } catch (error) {
                console.error('Error sending message:', error);
            } finally {
                setIsSending(false);
                if (messageInputRef.current) {
                    messageInputRef.current.focus();
                }
            }
        }
        else {
            handleSendMessage();
            setIsSending(false);
        }
    }

    function collectFilesForMessage(file: File | null) {
        
        if (!file ) {
            setFilesToUpload(null);
            return; 
        }
        setFilesToUpload(file);
    }

    return (
        <div className="p-2 bg-white">
            <div className="flex mb-2">
            <textarea
                ref={messageInputRef}
                className="w-6/7 rounded border border-gray-300 p-2 mb-2 bg-white"
                rows={2}
                placeholder="Type your message..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                disabled={isSending}
            />
            <button
                className="ml-2 rounded bg-blue-500 px-3 py-1.5 w-1/8 text-white disabled:opacity-50"
                onClick={() => sendMessage()}
                disabled={isSending || !messageText.trim() && (!filesToUpload)}
            >
                {isSending ? 'Sending...' : 'Send'}
            </button>
            </div>
            <div className="flex flex-col justify-between">
                 <div>
                    {/*<span>{filesToUpload} file(s) selected</span>*/}
                    
                        {filesToUpload && <div className="text-sm text-gray-600">
                            {filesToUpload.name} ({(filesToUpload.size / 1024).toFixed(2)} KB)
                        </div>}
                    
                </div>
                <div>
                    <ChatFileUpload onFileUpload={collectFilesForMessage} />
                    
                </div>
       
            </div>
        </div>
    );
}