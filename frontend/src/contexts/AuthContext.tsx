import React, { createContext, useState, useEffect, useContext, useCallback, ReactNode } from 'react';
import axios from 'axios';
import type { User } from '../types';

export interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (username: string, password: string, email: string) => Promise<User>;
  logout: () => Promise<void>;
  updateProfile: (plexUrl: string | null, plexToken: string | null) => Promise<User>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const api = axios.create({
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' }
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<User>('/api/auth/profile')
      .then(res => setUser(res.data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post<User>('/api/auth/login', { email, password });
    setUser(res.data);
    return res.data;
  }, []);

  const register = useCallback(async (username: string, password: string, email: string) => {
    const res = await api.post<User>('/api/auth/register', { username, password, email });
    setUser(res.data);
    return res.data;
  }, []);

  const logout = useCallback(async () => {
    await api.post('/api/auth/logout');
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (plexUrl: string | null, plexToken: string | null) => {
    const res = await api.put<User>('/api/auth/profile', { plexUrl, plexToken });
    setUser(res.data);
    return res.data;
  }, []);

  const value: AuthContextValue = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    updateProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
