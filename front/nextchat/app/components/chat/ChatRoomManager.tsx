'use client';

import { useState } from "react";
import ChatAddRoom from "./ChatAddRoom";

type ChatRoom = {
    id?: string | number ;
    name: string;
    description?: string;
    invited_usernames: string[];
    is_private?: boolean;
    member_usernames?: string[];
}

interface ChatRoomManagerProps {
    viewRoom: boolean;
    setViewRoom: (view: boolean) => void;
    chatRooms: ChatRoom[];
    user: any;
    viewRoomAddInput: boolean;
    toggleRoomAddInput: () => void;
    handleRoomCreate: (room: any) => void;
    setSelectedRoom: (room: ChatRoom) => void;
}

export default function ChatRoomManager({
    viewRoom,
    setViewRoom,
    chatRooms,
    user,
    viewRoomAddInput,
    toggleRoomAddInput,
    handleRoomCreate,
    setSelectedRoom
}: ChatRoomManagerProps) {
    const [viewRoomMenu, setViewRoomMenu] = useState(true);
    const toggleRoomMenu = () => {
        setViewRoomMenu(!viewRoomMenu);
    };
    const [roomSelected, setRoomSelected] = useState<ChatRoom | null>(null);

    function handleSetRoom(room: ChatRoom) {
        setRoomSelected(room);
        setSelectedRoom(room);
    }

    return (
        <>
        {/* Overlay modal */}
        <div className={`absolute top-0 left-0 bg-black/30 h-screen w-screen ${viewRoom ? '' : 'hidden'} transition-opacity duration-300 ease-in-out`} onClick={() => setViewRoom(false)}></div>
        <aside className={`absolute xs:w-fit xs:max-w-30 sm:w-1/4 sm:py-4 sm:px-2 md:px-4 px-0 py-2
         bg-gray-200 mr-1 rounded-xl border border-gray-300 z-10 shadow-2xl shadow-black/60
         transition-all duration-300 ease-in-out ${viewRoom ? 'opacity-100 visible' : 'opacity-0 invisible'}`}>
            
            <div className="flex flex-row h-full">
                <div className="flex-11/12 overflow-y-auto">
                    <div className="p-1 flex flex-row justify-between">
                        {
                            viewRoomMenu && (
                            
                            <span className="font-semibold">{user?.username}</span>
                                
                            
                        )}
                        <button onClick={() => setViewRoomMenu(!viewRoomMenu)} className="font-semibold px-1.5 py-0.5 rounded bg-gray-300 hover:bg-gray-400">
                            {viewRoomMenu ? '_' : '☰'}
                        </button>
                    </div>
                    <div>
                        <ul className="mt-2">
                            {chatRooms.map(room => (
                                <li key={room.id} className={`p-2 ${roomSelected?.id === room.id ? 'bg-green-200 border-green-600 hover:bg-green-300' : 'bg-white border-gray-300 hover:bg-gray-100'} border  cursor-pointer `} onClick={() => handleSetRoom(room)}>
                                    <p className={`${roomSelected?.id === room.id ? 'font-bold' : ''}`}>{room.name}</p>
                                    {viewRoomMenu && (
                                        <p className={`text-sm text-gray-500 `}>{room.member_usernames?.join(', ')}</p>
                                    )}
                                </li>
                            ))}
                        </ul>
                        <div className="flex flex-row justify-center">
                        {viewRoomMenu && (
                            <>{
                            !viewRoomAddInput && (
                                <button className="mt-4 w-fit rounded-xl bg-green-600 border border-green-800 px-2 py-1 text-white font-semibold" onClick={toggleRoomAddInput}>+Room</button>
                            )
                            }

                            {/* Room creation input can be conditionally rendered here */}
                            {viewRoomAddInput && (
                                <ChatAddRoom onCreateRoom={handleRoomCreate} onCancel={toggleRoomAddInput}/>
                            )}
                            </>
                        )}
                        </div>
                    </div>
                </div>
                {/** narrow vertical button to open and close */}
                {/*<div className="flex-1 flex flex-col justify-center items-center bg-gray-200 border border-gray-400 cursor-pointer hover:bg-gray-300">
                    <div className="h-full flex items-center justify-center cursor-pointer"
                        onClick={toggleRoomMenu}
                    >
                        {viewRoomMenu ? ' < ' : ' > '}
                    </div>
                </div>*/}
            </div>
        </aside>
        </>
    );
}