import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { StaffProfile } from '../types';
import { registerForPushNotificationsAsync } from '../lib/notifications';

const PROFILE_CACHE_KEY = '@celron_staff_profile';
const SESSION_CACHE_KEY = '@celron_user_session';

// Sample fallback profile for Ronald Tan for immediate offline or demo use
const SAMPLE_PROFILE: StaffProfile = {
  id: 'a0000000-0000-0000-0000-000000000002',
  company_id: 'c0000000-0000-0000-0000-000000000001',
  full_name: 'Ronald Tan',
  job_title: 'Marine Sales Director',
  phone: '+65 9123 4567',
  whatsapp: '+65 9123 4567',
  email: 'ronald.tan@celron.com.sg',
  photo_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
  role: 'staff',
  staff_slug: 'ronald-tan',
  active_share_link_id: 's0000000-0000-0000-0000-000000000001',
  expo_push_token: null,
};

interface AuthContextType {
  profile: StaffProfile | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  useDemoStaff: (slug?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  profile: null,
  isLoading: true,
  login: async () => ({ success: false }),
  logout: async () => {},
  refreshProfile: async () => {},
  useDemoStaff: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore cached session and profile on app start
  useEffect(() => {
    async function initAuth() {
      try {
        // First try to load cached profile from local storage for instant offline startup
        const cachedProfile = await AsyncStorage.getItem(PROFILE_CACHE_KEY);
        if (cachedProfile) {
          setProfile(JSON.parse(cachedProfile));
        }

        // If Supabase is configured, check live session
        if (isSupabaseConfigured()) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            await fetchProfile(session.user.id);
          }
        }
      } catch (err) {
        console.error('Failed to restore auth session:', err);
      } finally {
        setIsLoading(false);
      }
    }

    initAuth();
  }, []);

  async function fetchProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (!error && data) {
        setProfile(data);
        await AsyncStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(data));
        // Register push notifications
        registerForPushNotificationsAsync(userId).catch(() => {});
      }
    } catch (err) {
      console.warn('Could not fetch live profile, relying on cache:', err);
    }
  }

  const login = async (email: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);

    try {
      // 1. If Supabase configured, attempt real authentication
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: pass,
        });

        if (error) {
          setIsLoading(false);
          return { success: false, error: error.message };
        }

        if (data.user) {
          await fetchProfile(data.user.id);
          setIsLoading(false);
          return { success: true };
        }
      }

      // 2. Demo / Fallback mode: recognize sample staff accounts for easy testing
      const cleanEmail = email.trim().toLowerCase();
      let matchedProfile = { ...SAMPLE_PROFILE };

      if (cleanEmail === 'celron.simlim0305@gmail.com') {
        matchedProfile = {
          ...SAMPLE_PROFILE,
          id: 'a0000000-0000-0000-0000-000000000001',
          full_name: 'Cel-Ron Operations Admin',
          job_title: 'Head of Operations',
          email: 'celron.simlim0305@gmail.com',
          role: 'admin',
          staff_slug: 'admin',
        };
      } else if (cleanEmail === 'celine.lim@celron.com.sg') {
        matchedProfile = {
          ...SAMPLE_PROFILE,
          id: 'a0000000-0000-0000-0000-000000000003',
          full_name: 'Celine Lim',
          job_title: 'Marine Technical Specialist',
          email: 'celine.lim@celron.com.sg',
          staff_slug: 'celine-lim',
        };
      }

      setProfile(matchedProfile);
      await AsyncStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(matchedProfile));
      registerForPushNotificationsAsync(matchedProfile.id).catch(() => {});

      setIsLoading(false);
      return { success: true };
    } catch (err: unknown) {
      const error = err as Error;
      setIsLoading(false);
      return { success: false, error: error.message || 'Login failed' };
    }
  };

  const useDemoStaff = async (slug: string = 'ronald-tan') => {
    let p = { ...SAMPLE_PROFILE };
    if (slug === 'celine-lim') {
      p = {
        ...SAMPLE_PROFILE,
        id: 'a0000000-0000-0000-0000-000000000003',
        full_name: 'Celine Lim',
        job_title: 'Marine Technical Specialist',
        email: 'celine.lim@celron.com.sg',
        staff_slug: 'celine-lim',
      };
    } else if (slug === 'admin') {
      p = {
        ...SAMPLE_PROFILE,
        id: 'a0000000-0000-0000-0000-000000000001',
        full_name: 'Cel-Ron Operations Admin',
        job_title: 'Head of Operations',
        email: 'celron.simlim0305@gmail.com',
        role: 'admin',
        staff_slug: 'admin',
      };
    }

    setProfile(p);
    await AsyncStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(p));
  };

  const logout = async () => {
    try {
      if (isSupabaseConfigured()) {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.warn('Signout warning:', err);
    } finally {
      await AsyncStorage.removeItem(PROFILE_CACHE_KEY);
      await AsyncStorage.removeItem(SESSION_CACHE_KEY);
      setProfile(null);
    }
  };

  const refreshProfile = async () => {
    if (profile?.id && isSupabaseConfigured()) {
      await fetchProfile(profile.id);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        profile,
        isLoading,
        login,
        logout,
        refreshProfile,
        useDemoStaff,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
