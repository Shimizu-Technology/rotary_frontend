import React, { createContext, useContext, useState, useEffect } from 'react';
import type { AuthUser } from '../types';

interface AuthContextType {
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

// Mock users for testing
const MOCK_USERS = [
  {
    id: '1',
    email: 'staff@rotarysushi.com',
    password: 'staff123',
    role: 'staff',
    name: 'Chef Akira'
  },
  {
    id: '2',
    email: 'admin@rotarysushi.com',
    password: 'admin123',
    role: 'admin',
    name: 'Restaurant Manager'
  },
  {
    id: '3',
    email: 'customer@example.com',
    password: 'customer123',
    role: 'customer',
    name: 'John Customer'
  }
] as const;

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // For development, immediately set loading to false
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    const mockUser = MOCK_USERS.find(u => u.email === email && u.password === password);
    
    if (!mockUser) {
      throw new Error('Invalid credentials');
    }

    // Remove password from user data before setting in state
    const { password: _, ...userWithoutPassword } = mockUser;
    setUser(userWithoutPassword);
  };

  const logout = async () => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}