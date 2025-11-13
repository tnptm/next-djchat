'use client';

import axios from 'axios';
import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { useRouter } from 'next/navigation';


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
    // Keep a ref to the latest tokens so callbacks (like setInterval) don't close over stale values
    const tokensRef = useRef<AuthTokens>({ accessToken: null, refreshToken: null });

    // Load tokens from localStorage on mount
    useEffect(() => {
        const accessToken = localStorage.getItem('accessToken');
        const refreshToken = localStorage.getItem('refreshToken');
        
        if (accessToken && refreshToken) {
            setTokensState({ accessToken, refreshToken });
            setIsAuthenticated(true);
            login(accessToken, refreshToken);
        }
    }, []);

    const setTokens = (newTokens: AuthTokens) => {
        setTokensState(newTokens);
        // keep ref in sync
        tokensRef.current = newTokens;
        
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
            
            axios.get('/api/user/', {
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
            
        } else {
            // If no access token, ensure user is null, logout user
            setUser(null);
            logout();
        }


    };

    const logout = () => {
        setTokens({ accessToken: null, refreshToken: null });
        setUser(null);
        router.push('/login'); // Redirect to login page after logout
    };

    // Function to refresh token
    const refreshAccessToken = async () => {
        console.log('Attempting to refresh access token...');
        //console.log('Current tokens (ref):', tokensRef.current);
        try {
            // Prefer the latest tokens from the ref; fall back to localStorage
            const refreshToken = tokensRef.current?.refreshToken || localStorage.getItem('refreshToken');
            if (!refreshToken) {
                return Promise.reject('No refresh token available');
            }
            console.log('Refreshing access token...');
            const response = await axios.post('/api/token/refresh/', {
                refresh: refreshToken
            });

            const { access } = response.data;
            // update state & ref
            //login(access, refreshToken);
            setTokens({ accessToken: access, refreshToken });
            return access;
        } catch (error) {
            console.error('Failed to refresh access token:', error);
            return Promise.reject(error);
        }
    };

    // Refresh access token periodically. We read tokens from `tokensRef` inside
    // `refreshAccessToken` so this effect can safely set up a stable interval.
    useEffect(() => {
        const interval = setInterval(() => {
            refreshAccessToken().catch(() => {
                console.log('Failed to refresh access token, logging out...');
                logout();
            });
        }, 15 * 60 * 1000); // Refresh every 15 minutes

        return () => clearInterval(interval);
    }, []);

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