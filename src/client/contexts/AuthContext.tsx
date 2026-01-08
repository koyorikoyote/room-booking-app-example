import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
    id: number;
    username: string;
    email: string;
    name: string;
    languagePreference: string;
    role?: {
        id: number;
        name: string;
        level: number;
    };
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (token: string, user: User) => void;
    logout: () => void;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isMounted, setIsMounted] = useState(false);

    const fetchCurrentUser = async (authToken: string): Promise<User | null> => {
        try {
            const response = await fetch('/api/auth/me', {
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success && data.data) {
                    return data.data;
                }
            }
            return null;
        } catch (error) {
            console.error('Failed to fetch user:', error);
            return null;
        }
    };

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        if (!isMounted) return;

        const initAuth = async () => {
            const storedToken = localStorage.getItem('token');
            const storedUser = localStorage.getItem('user');

            if (storedToken && storedUser) {
                try {
                    const currentUser = await fetchCurrentUser(storedToken);

                    if (currentUser) {
                        setToken(storedToken);
                        setUser(currentUser);

                        if (currentUser.languagePreference) {
                            const lang = currentUser.languagePreference.toLowerCase();
                            localStorage.setItem('language', lang);

                            if (typeof window !== 'undefined' && window.i18n) {
                                window.i18n.changeLanguage(lang);
                            }
                        }
                    } else {
                        localStorage.removeItem('token');
                        localStorage.removeItem('user');
                    }
                } catch {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                }
            }

            setIsLoading(false);
        };

        initAuth();
    }, [isMounted]);

    const login = (newToken: string, newUser: User) => {
        setToken(newToken);
        setUser(newUser);
        localStorage.setItem('token', newToken);
        localStorage.setItem('user', JSON.stringify(newUser));

        if (newUser.languagePreference) {
            const lang = newUser.languagePreference.toLowerCase();
            localStorage.setItem('language', lang);

            if (typeof window !== 'undefined' && window.i18n) {
                window.i18n.changeLanguage(lang);
            }
        }
    };

    const logout = async () => {
        if (token) {
            try {
                await fetch('/api/auth/logout', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });
            } catch (error) {
                console.error('Logout error:', error);
            }
        }

        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    };

    const refreshUser = async () => {
        if (token) {
            const currentUser = await fetchCurrentUser(token);
            if (currentUser) {
                setUser(currentUser);
                localStorage.setItem('user', JSON.stringify(currentUser));
            } else {
                logout();
            }
        }
    };

    const value: AuthContextType = {
        user,
        token,
        isAuthenticated: !!user && !!token,
        isLoading,
        login,
        logout,
        refreshUser,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
