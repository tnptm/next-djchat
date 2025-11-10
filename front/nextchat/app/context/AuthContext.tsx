'use client';

import axios from 'axios';
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
//import axios from 'axios';

interface AuthTokens {
    accessToken: string | null;
    refreshToken: string | null;
}

interface User {
    id: number;
    username: string;
    email: string;
    // Add other user fields as needed
}

interface AuthContextType {
    isAuthenticated: boolean;
    tokens: AuthTokens;
    setTokens: (tokens: AuthTokens) => void;
    login: (accessToken: string, refreshToken: string) => void;
    logout: () => void;
    user: User | null;
    setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const router = useRouter();
    const [tokens, setTokensState] = useState<AuthTokens>({
        accessToken: null,
        refreshToken: null,
    });

    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Load tokens from localStorage on mount
    useEffect(() => {
        const accessToken = localStorage.getItem('accessToken');
        const refreshToken = localStorage.getItem('refreshToken');
        
        if (accessToken && refreshToken) {
            setTokensState({ accessToken, refreshToken });
            setIsAuthenticated(true);
        }
    }, []);

    const setTokens = (newTokens: AuthTokens) => {
        setTokensState(newTokens);
        
        if (newTokens.accessToken && newTokens.refreshToken) {
            localStorage.setItem('accessToken', newTokens.accessToken);
            localStorage.setItem('refreshToken', newTokens.refreshToken);
            setIsAuthenticated(true);
        } else {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            setIsAuthenticated(false);
        }
    };
    const [user, setUser] = useState<User | null>(null);

    const login = (accessToken: string, refreshToken: string) => {
        setTokens({ accessToken, refreshToken });
        //setUser(user);
        // fetch with axios the user information and set the user state after login
        if (accessToken) {
            // Example: fetch user info from API
            
            axios.get('http://localhost:8000/api/user/', {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            })
            .then(response => {
                setUser(response.data);
                router.push('/chat'); // Redirect to chat page after successful login
            })
            .catch(error => {
                console.error('Failed to fetch user info:', error);
            });
            
        }


    };

    const logout = () => {
        setTokens({ accessToken: null, refreshToken: null });
        setUser(null);
        router.push('/login'); // Redirect to login page after logout
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated, tokens, setTokens, login, logout, user, setUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};