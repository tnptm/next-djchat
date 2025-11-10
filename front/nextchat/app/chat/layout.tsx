'use client';

import React, { use, useContext } from 'react';
import { useAuth } from '../context/AuthContext';

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
    const {isAuthenticated} = useAuth();

    if (!isAuthenticated) {
    return (
      <div>
        <h2>You must be logged in to access the chat.</h2>
      </div>
    );
  }
  return (
    <div>
        {children}
    </div>
  );
}

/*
function ChatApp({ children }: { children: React.ReactNode }) {
  const authContext = useAuth();

  if (!authContext) {
    return <div>Loading...</div>;
  }

  const { isAuthenticated } = authContext;

  if (!isAuthenticated) {
    return <div>Please log in to access the chat.</div>;
  }

  return <div className="h-full">{children}</div>;
}  */