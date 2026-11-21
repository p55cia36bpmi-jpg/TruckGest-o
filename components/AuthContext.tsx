'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  User,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getUserProfile, saveUserProfile, getDrivers } from '@/services/firestoreService';
import { UserProfile, UserRole, Driver } from '@/types/truck-service';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  role: UserRole;
  currentDriver: Driver | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithCredentials: (identifier: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  switchDemoRole: (targetRole: UserRole, targetDriverId?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  role: 'driver',
  currentDriver: null,
  loading: true,
  signInWithGoogle: async () => {},
  signInWithCredentials: async () => ({ success: false }),
  signOut: async () => {},
  switchDemoRole: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<UserRole>('driver');
  const [currentDriver, setCurrentDriver] = useState<Driver | null>(null);
  const [loading, setLoading] = useState(true);

  const syncDriverInfo = async (driverId?: string): Promise<Driver | null> => {
    if (!driverId) {
      setCurrentDriver(null);
      return null;
    }
    const drivers = await getDrivers();
    const d = drivers.find((item) => item.id === driverId) || null;
    setCurrentDriver(d);
    return d;
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        let p = await getUserProfile(firebaseUser.uid);
        if (!p) {
          const emailLower = (firebaseUser.email || '').toLowerCase();
          const drivers = await getDrivers();
          const matchedDriver = drivers.find(
            (d) => d.loginEmail && d.loginEmail.toLowerCase() === emailLower
          );

          if (matchedDriver) {
            p = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || matchedDriver.loginEmail || '',
              name: matchedDriver.name,
              role: 'driver',
              driverId: matchedDriver.id,
              createdAt: new Date().toISOString(),
            };
          } else {
            const isBootstrappedAdmin = emailLower === 'p55cia36bpmi@gmail.com';
            p = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              name: firebaseUser.displayName || 'Usuário TruckGestão',
              role: isBootstrappedAdmin ? 'admin' : 'driver',
              createdAt: new Date().toISOString(),
            };
          }
          await saveUserProfile(p);
        }

        if (p.role === 'driver') {
          const drv = await syncDriverInfo(p.driverId);
          if (!drv || drv.active === false) {
            setProfile(null);
            setRole('driver');
            setCurrentDriver(null);
            setLoading(false);
            return;
          }
        } else {
          setCurrentDriver(null);
        }

        setProfile(p);
        setRole(p.role);
      } else {
        // Restore explicitly authenticated session from localStorage (never auto-login as admin)
        try {
          const savedSession =
            typeof window !== 'undefined' ? localStorage.getItem('truckgestao_active_user') : null;
          if (savedSession) {
            const parsed = JSON.parse(savedSession);
            if (parsed.profile) {
              const restoredProfile = parsed.profile as UserProfile;
              if (restoredProfile.role === 'driver') {
                const freshDriver = await syncDriverInfo(restoredProfile.driverId);
                if (!freshDriver || freshDriver.active === false) {
                  localStorage.removeItem('truckgestao_active_user');
                  setProfile(null);
                  setRole('driver');
                  setCurrentDriver(null);
                  setLoading(false);
                  return;
                }
                setProfile(restoredProfile);
                setRole('driver');
                setLoading(false);
                return;
              } else if (restoredProfile.role === 'admin') {
                setProfile(restoredProfile);
                setRole('admin');
                setCurrentDriver(null);
                setLoading(false);
                return;
              }
            }
          }
        } catch (e) {
          console.warn('Erro ao restaurar sessão:', e);
        }

        // No active session: keep unauthenticated so login screen is presented
        setProfile(null);
        setRole('driver');
        setCurrentDriver(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithCredentials = async (
    identifier: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    const { isSupabaseConfigured } = await import('@/lib/supabase');
    if (isSupabaseConfigured()) {
      const { authenticateUserSupabase } = await import('@/services/supabaseService');
      const supaResult = await authenticateUserSupabase(identifier, password);
      if (supaResult.success && supaResult.profile) {
        setProfile(supaResult.profile);
        setRole(supaResult.profile.role);
        setCurrentDriver(supaResult.driver || null);
        if (typeof window !== 'undefined') {
          localStorage.setItem(
            'truckgestao_active_user',
            JSON.stringify({ profile: supaResult.profile, driver: supaResult.driver })
          );
        }
        return { success: true };
      }
      if (supaResult.error && supaResult.error.includes('bloqueado')) {
        return { success: false, error: supaResult.error };
      }
    }

    const { authenticateUser } = await import('@/services/firestoreService');
    const result = await authenticateUser(identifier, password);
    if (result.success && result.profile) {
      setProfile(result.profile);
      setRole(result.profile.role);
      setCurrentDriver(result.driver || null);
      if (typeof window !== 'undefined') {
        localStorage.setItem(
          'truckgestao_active_user',
          JSON.stringify({ profile: result.profile, driver: result.driver })
        );
      }
      return { success: true };
    }
    return { success: false, error: result.error || 'Credenciais inválidas.' };
  };

  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error('Erro no login com Google:', err);
    }
  };

  const signOut = async () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('truckgestao_active_user');
      }
      await firebaseSignOut(auth);
    } catch (err) {
      console.error('Erro no logout:', err);
    } finally {
      setUser(null);
      setProfile(null);
      setRole('driver');
      setCurrentDriver(null);
    }
  };

  // Only an authenticated Administrator can toggle preview mode between Admin Dashboard and Driver Portal.
  // Drivers are strictly locked to 'driver' role and their own driverId.
  const switchDemoRole = async (targetRole: UserRole, targetDriverId?: string) => {
    if (profile?.role !== 'admin') {
      return;
    }

    if (targetRole === 'admin') {
      setRole('admin');
      setCurrentDriver(null);
    } else {
      const drivers = await getDrivers();
      const driver = targetDriverId
        ? drivers.find((d) => d.id === targetDriverId)
        : drivers[0];

      if (driver) {
        setRole('driver');
        setCurrentDriver(driver);
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role,
        currentDriver,
        loading,
        signInWithGoogle,
        signInWithCredentials,
        signOut,
        switchDemoRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
