//import Image from "next/image";
//import ChatMain from "./components/ChatMain";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
        <h1 className="mb-10 text-4xl font-bold leading-tight tracking-tighter text-black dark:text-zinc-50 sm:text-5xl">
          Welcome to Room Chat
        </h1>
        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
         <p className="max-w-xl text-lg text-gray-600 dark:text-gray-400">
            A simple chat application built with Django and Next.js. 
            Register an account or login to start chatting in real-time with others!
          </p>
          <div className="py-2">
            <a href="/login" className="text-sm text-blue-500 hover:underline">Login</a>
          </div>
          <div className="py-2">
            <a href="/register" className="text-sm text-blue-500 hover:underline">Create Account</a>
          </div>

          <ul className="list-disc pl-5 text-gray-600 dark:text-gray-400">
            <li>Real-time messaging with WebSockets</li>
            <li>File attachments support</li>
            <li>User authentication and registration</li>
            <li>Responsive design for mobile and desktop</li>
            <li>Encrypted messages on server</li>
          </ul>

        </div>
        <div className="flex flex-col gap-4 text-base font-medium sm:flex-row">

        </div>
      </main>
    </div>
  );
}
