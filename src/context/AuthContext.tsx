// src/context/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  role?: string;
  phone?: string; // optional if you've added a phone column to users
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loginWithJwtUser: (jwt: string, userData: AuthUser) => void; // new helper
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
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
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];

    const resp = await axios.post('http://localhost:3000/login', { email, password });
    const { jwt, user: userData } = resp.data;

    // store in localStorage
    localStorage.setItem('token', jwt);
    localStorage.setItem('user', JSON.stringify(userData));
    // set default axios header
    axios.defaults.headers.common['Authorization'] = `Bearer ${jwt}`;

    // set state
    setUser(userData);
  };

  // *** LOGOUT ***
  const logout = async () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  // *** NEW: loginWithJwtUser ***
  // Useful if the server returns { jwt, user } from /signup,
  // so we can store them in state and localStorage to auto-login.
  const loginWithJwtUser = (jwt: string, userData: AuthUser) => {
    localStorage.setItem('token', jwt);
    localStorage.setItem('user', JSON.stringify(userData));
    axios.defaults.headers.common['Authorization'] = `Bearer ${jwt}`;

    setUser(userData);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, loginWithJwtUser }}>
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
