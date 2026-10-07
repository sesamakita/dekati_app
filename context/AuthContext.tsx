import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, CitizenSession, RegisterParams } from '@/services/auth';
import { Citizen, VillageProfile } from '@/store/mockData';
import { api } from '@/services/api';
import { supabase } from '@/services/supabase';
import { Config } from '@/constants/Config';

interface AuthContextType {
  user: Citizen | null;
  session: CitizenSession | null;
  villageName: string;
  villageProfile: VillageProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (identifier: string, password: string) => Promise<CitizenSession>;
  register: (params: RegisterParams) => Promise<CitizenSession>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  refreshVillageProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<CitizenSession | null>(null);
  const [user, setUser] = useState<Citizen | null>(null);
  const [villageProfile, setVillageProfile] = useState<VillageProfile | null>(null);
  const [villageName, setVillageName] = useState<string>(Config.villageName);
  const [isLoading, setIsLoading] = useState(true);

  const fetchVillageData = async () => {
    try {
      const prof = await api.getVillageProfile();
      if (prof) {
        setVillageProfile(prof);
        if (prof.name) {
          setVillageName(prof.name);
        }
      }
    } catch (e) {
      console.warn('[AuthContext] Gagal sinkron profil desa:', e);
    }
  };

  // Inisialisasi sesi login dan profil desa saat aplikasi dibuka
  useEffect(() => {
    const initSession = async () => {
      try {
        const [stored] = await Promise.all([
          auth.getStoredSession(),
          fetchVillageData(),
        ]);

        if (stored) {
          setSession(stored);
          setUser(stored.citizen);
          if (stored.citizen?.village_name) {
            setVillageName(stored.citizen.village_name);
          }
        }
      } catch (err) {
        console.warn('[AuthContext] Gagal inisialisasi sesi:', err);
      } finally {
        setIsLoading(false);
      }
    };
    initSession();

    // Listen to realtime village_profiles table changes from Supabase
    let channel: any = null;
    try {
      channel = supabase
        .channel('mobile-realtime-village-profile')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'village_profiles' },
          (payload) => {
            if (payload.new) {
              const prof = payload.new as VillageProfile;
              setVillageProfile(prof);
              if (prof.name) {
                setVillageName(prof.name);
              }
            }
          }
        )
        .subscribe();
    } catch (e) {
      console.warn('[AuthContext] Realtime channel error:', e);
    }

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const login = async (identifier: string, password: string): Promise<CitizenSession> => {
    setIsLoading(true);
    try {
      const newSession = await auth.loginCitizen(identifier, password);
      setSession(newSession);
      setUser(newSession.citizen);
      if (newSession.citizen?.village_name) {
        setVillageName(newSession.citizen.village_name);
      }
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
      if (newSession.citizen?.village_name) {
        setVillageName(newSession.citizen.village_name);
      }
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
      if (stored.citizen?.village_name) {
        setVillageName(stored.citizen.village_name);
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        villageName,
        villageProfile,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshUser,
        refreshVillageProfile: fetchVillageData,
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
