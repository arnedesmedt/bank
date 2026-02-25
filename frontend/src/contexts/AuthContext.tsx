import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
    id: string; // UUID as string
    email: string;
    roles: string[];
}

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
    error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Check for existing session on mount
        const checkAuth = async () => {
            try {
                const token = localStorage.getItem('access_token');
                if (token) {
                    // Validate token with backend
                    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/me`, {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json',
                        },
                    });

                    if (response.ok) {
                        const userData = await response.json();
                        setUser(userData);
                    } else {
                        localStorage.removeItem('access_token');
                    }
                }
            } catch (err) {
                console.error('Auth check failed:', err);
                localStorage.removeItem('access_token');
            } finally {
                setIsLoading(false);
            }
        };

        checkAuth();
    }, []);

    const login = async (email: string, password: string) => {
        setError(null);
        setIsLoading(true);

        try {
            // Use OAuth2 password grant
            const formData = new URLSearchParams();
            formData.append('grant_type', 'password');
            formData.append('client_id', 'bank_app');
            formData.append('client_secret', ''); // Add your client secret
            formData.append('username', email);
            formData.append('password', password);
            formData.append('scope', 'email');

            const response = await fetch(`${import.meta.env.VITE_API_URL}/token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: formData.toString(),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || errorData.error_description || 'Login failed');
            }

            const data = await response.json();
            localStorage.setItem('access_token', data.access_token);

            // Fetch user info
            const userResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/me`, {
                headers: {
                    'Authorization': `Bearer ${data.access_token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (userResponse.ok) {
                const userData = await userResponse.json();
                setUser(userData);
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'An error occurred during login';
            setError(message);
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    const logout = () => {
        localStorage.removeItem('access_token');
        setUser(null);
        setError(null);
    };

    const value: AuthContextType = {
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        error,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

