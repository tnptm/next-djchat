'use client';
import ChatMain from "../components/ChatMain";
//import WebSocketStatus from "../components/WebSocketStatus";
import { useAuth } from "../context/AuthContext";

export default function ChatPage() {
    const {user, logout} = useAuth();
    return (
        <>

            {/*<div>
                <WebSocketStatus />
            </div>*/}
            <ChatMain />
        </>
    );
}