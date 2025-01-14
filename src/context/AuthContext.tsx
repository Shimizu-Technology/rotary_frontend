// src/context/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  role?: string; // "staff", "admin", "customer", etc.
  // add other user fields if needed
}

interface AuthContextType {
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

// Create the context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount, check if there's a token AND user in localStorage
  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user'); // new line

    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }

    if (storedUser) {
      try {
        const parsedUser: AuthUser = JSON.parse(storedUser);
        setUser(parsedUser);
      } catch (err) {
        console.error('Error parsing stored user:', err);
        // If it fails to parse, clear it
        localStorage.removeItem('user');
      }
    }

    setIsLoading(false);
  }, []);

  // *** LOGIN ***
  const login = async (email: string, password: string) => {
    // Remove old token + user from localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];

    // Call your Rails API
    const resp = await axios.post('http://localhost:3000/login', { email, password });
    
    // The Rails API is expected to return { jwt: token, user: userData }
    const { jwt, user: userData } = resp.data;

    // Store token and user in localStorage
    localStorage.setItem('token', jwt);
    localStorage.setItem('user', JSON.stringify(userData));

    // Also set default Authorization header
    axios.defaults.headers.common['Authorization'] = `Bearer ${jwt}`;

    // Store user object in state
    setUser(userData);
  };

  // *** LOGOUT ***
  const logout = async () => {
    // Clear local storage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook for easy usage
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
