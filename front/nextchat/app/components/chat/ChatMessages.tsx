'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function ChatMessages({ messages }: { messages: any[];  }) {
    // auto-scroll ref
    const messagesEndRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        // Scroll to bottom when messages change
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages.length]);

    const { user } = useAuth();

    return (
        <div className="overflow-y-auto p-4 bg-stone-100 mb-4 w-full h-[500px] flex flex-col">
            {/* Chat messages will be rendered here */}
            {
                messages.map((msg, index) => {
                    const isLast = index === messages.length - 1;
                    return (
                        <div key={index} className="mb-2"
                            ref={isLast ? messagesEndRef : null}
                        >
                          <div className={`rounded px-4 py-2 text-gray-700 w-fit ${msg.sender === user?.username ? 'bg-amber-200 ml-auto' : 'bg-purple-200'}`}>
                            <div>({new Date(msg.created_at).toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit' })}) 
                                <strong> {msg.sender}</strong>: {msg.plaintext}</div>
                        
                            {msg.attachments && msg.attachments.length > 0 && (
                                <div className="mt-1">
                                    {msg.attachments.map((file: any, fileIndex: number) => (
                                        <div key={fileIndex} className="text-sm text-gray-600">
                                            <a href={file.file_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                                            {`${file.file_url ? file.file_url.split("/").pop() : 'Unnamed file'} (${(file.file_size / 1024).toFixed(2)} KB)`}
                                            </a>
                                            {file.content_type.startsWith('image/') && (
                                                <div className="mt-2">
                                                    <img
                                                        src={file.file_url}
                                                        alt=''
                                                        width={200}
                                                        height={200}
                                                        className="rounded"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                    );
                }
            )
            }
        </div>
    );
}