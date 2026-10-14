"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';


interface User {
  id: string;
  name: string;
  email: string;
  industry: string;
}

interface AuthContextType {
  user: User | null;
  login: (token: string, userData: User) => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // When the app starts, check if the user is already logged in
    const storedToken = localStorage.getItem('timeflow_token');
    const storedUser = localStorage.getItem('timeflow_user');

    if (storedToken && storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = (token: string, userData: User) => {
    localStorage.setItem('timeflow_token', token);
    localStorage.setItem('timeflow_user', JSON.stringify(userData));
    setUser(userData);
    
    // SMART REDIRECT:
    // If the user's industry is still GENERAL (default), send them to onboarding.
    // Otherwise, send them to the dashboard.
    if (!userData.industry || userData.industry === 'GENERAL') {
      router.push('/onboarding');
    } else {
      router.push('/dashboard');
    }
  };

  const logout = () => {
    localStorage.removeItem('timeflow_token');
    localStorage.removeItem('timeflow_user');
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
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
