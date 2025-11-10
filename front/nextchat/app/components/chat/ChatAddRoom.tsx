'use client';

import { useState } from 'react';

export interface NewChatRoom {
    id?: number;
    name: string;
    invited_usernames: string[];
    description?: string;
    isPrivate?: boolean;
}

export interface ChatAddRoomProps {
    onCreateRoom?: (room: NewChatRoom) => void;
}

export default function ChatAddRoom({ onCreateRoom }: ChatAddRoomProps) {
    const [newRoom, setNewRoom] = useState<NewChatRoom>({
        name: '',
        invited_usernames: [],
        description: '',
        isPrivate: false,
    });
    return (
        <div className="mt-2 p-2 border border-gray-300 rounded bg-gray-100">
            <input
                type="text"
                placeholder="Room Name"
                className="w-full rounded border border-gray-300 p-2 mb-2 bg-white"
                value={newRoom.name}
                onChange={(e) => setNewRoom({...newRoom, name: e.target.value})}
            />
            <input
                type="text"
                placeholder="Invited Usernames (comma separated)"
                className="w-full rounded border border-gray-300 p-2 mb-2 bg-white"
                value={newRoom.invited_usernames.join(', ')}
                onChange={(e) => setNewRoom({...newRoom, invited_usernames: e.target.value.split(',').map(name => name.trim())})}
            />
            <input
                type="text"
                placeholder="Description"
                className="w-full rounded border border-gray-300 p-2 mb-2 bg-white"
                value={newRoom.description}
                onChange={(e) => setNewRoom({...newRoom, description: e.target.value})}
            />
            <div className="mb-2">
                <label className="mr-2">
                    <input
                        type="checkbox"
                        checked={newRoom.isPrivate}
                        onChange={(e) => setNewRoom({...newRoom, isPrivate: e.target.checked})}

                    />
                    Private Room
                </label>
            </div>
            <button className="w-full rounded bg-green-500 px-4 py-2 text-white" onClick={() => onCreateRoom && onCreateRoom(newRoom)}>Add Room</button>
        </div>
    )
}