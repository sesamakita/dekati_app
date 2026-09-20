// context/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, CitizenSession, RegisterParams } from '@/services/auth';
import { Citizen } from '@/store/mockData';

interface AuthContextType {
  user: Citizen | null;
  session: CitizenSession | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (identifier: string, password: string) => Promise<CitizenSession>;
  register: (params: RegisterParams) => Promise<CitizenSession>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<CitizenSession | null>(null);
  const [user, setUser] = useState<Citizen | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Inisialisasi sesi login saat aplikasi dibuka
  useEffect(() => {
    const initSession = async () => {
      try {
        const stored = await auth.getStoredSession();
        if (stored) {
          setSession(stored);
          setUser(stored.citizen);
        }
      } catch (err) {
        console.warn('[AuthContext] Gagal inisialisasi sesi:', err);
      } finally {
        setIsLoading(false);
      }
    };
    initSession();
  }, []);

  const login = async (identifier: string, password: string): Promise<CitizenSession> => {
    setIsLoading(true);
    try {
      const newSession = await auth.loginCitizen(identifier, password);
      setSession(newSession);
      setUser(newSession.citizen);
      return newSession;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (params: RegisterParams): Promise<CitizenSession> => {
    setIsLoading(true);
    try {
      const newSession = await auth.registerCitizen(params);
      setSession(newSession);
      setUser(newSession.citizen);
      return newSession;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    setIsLoading(true);
    try {
      await auth.logoutCitizen();
      setSession(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = async (): Promise<void> => {
    const stored = await auth.getStoredSession();
    if (stored) {
      setSession(stored);
      setUser(stored.citizen);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth harus digunakan di dalam komponen AuthProvider.');
  }
  return context;
};
