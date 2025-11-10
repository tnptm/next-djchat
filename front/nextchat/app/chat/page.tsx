'use client';
import ChatMain from "../components/ChatMain";
import WebSocketStatus from "../components/WebSocketStatus";
import { useAuth } from "../context/AuthContext";

export default function ChatPage() {
    const {user, logout} = useAuth();
    return (
        <>
            <div>Welcome <span className="font-semibold text-lg text-red-500">{user?.username}</span> to the Chat Page!
            <button className="ml-4 text-blue-500 font-semibold cursor-pointer hover:underline" onClick={logout}>Log out</button></div>
            <div>
                <WebSocketStatus />
            </div>
            <ChatMain user={user}/>
        </>
    );
}