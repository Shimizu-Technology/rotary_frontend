import React, { createContext, useContext, useState, useEffect } from 'react';
import { loginUser } from '../services/api';  // We'll call loginUser from api.ts
import { apiClient } from '../services/api';   // We might import it if we want to set defaults, or not needed
                                               // if the interceptor is handling everything
export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  role?: string;
  phone?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loginWithJwtUser: (jwt: string, userData: AuthUser) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // On mount, check localStorage for an existing token & user
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    // If a token exists, the apiClient interceptor will pick it up from localStorage
    // so we don't necessarily have to do apiClient.defaults.headers.common.
    // But you can do it if you like:
    // if (token) {
    //   apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    // }

    if (storedUser) {
      try {
        const parsedUser: AuthUser = JSON.parse(storedUser);
        setUser(parsedUser);
      } catch (err) {
        console.error('Error parsing stored user:', err);
        localStorage.removeItem('user');
      }
    }

    setIsLoading(false);
  }, []);

  // *** LOGIN (traditional) ***
  const login = async (email: string, password: string) => {
    // Clear any old tokens first
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // if we used apiClient.defaults, remove that too
    // delete apiClient.defaults.headers.common['Authorization'];

    // Hit our loginUser from the API
    const { jwt, user: userData } = await loginUser(email, password);

    // store in localStorage
    localStorage.setItem('token', jwt);
    localStorage.setItem('user', JSON.stringify(userData));

    // If you wanted to also set apiClient.defaults (not strictly needed with the interceptor):
    // apiClient.defaults.headers.common['Authorization'] = `Bearer ${jwt}`;

    setUser(userData);
  };

  // *** LOGOUT ***
  const logout = async () => {
    // Optionally call an API endpoint for logout if you have one
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // delete apiClient.defaults.headers.common['Authorization'];

    setUser(null);
  };

  // *** NEW: loginWithJwtUser ***
  const loginWithJwtUser = (jwt: string, userData: AuthUser) => {
    localStorage.setItem('token', jwt);
    localStorage.setItem('user', JSON.stringify(userData));

    // Optionally do:
    // apiClient.defaults.headers.common['Authorization'] = `Bearer ${jwt}`;

    setUser(userData);
  };

  return (
    <AuthContext.Provider
      value={{ user, isLoading, login, logout, loginWithJwtUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
