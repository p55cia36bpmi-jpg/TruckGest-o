'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut as firebaseSignOut, 
  User 
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
  role: 'admin',
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
  const [role, setRole] = useState<UserRole>('admin');
  const [currentDriver, setCurrentDriver] = useState<Driver | null>(null);
  const [loading, setLoading] = useState(true);

  // Load profile helper
  const syncDriverInfo = async (driverId?: string) => {
    if (!driverId) {
      setCurrentDriver(null);
      return;
    }
    const drivers = await getDrivers();
    const d = drivers.find((item) => item.id === driverId) || drivers[0] || null;
    setCurrentDriver(d);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        let p = await getUserProfile(firebaseUser.uid);
        if (!p) {
          const isBootstrappedAdmin = firebaseUser.email === 'p55cia36bpmi@gmail.com';
          p = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            name: firebaseUser.displayName || 'Gestor de Frota',
            role: isBootstrappedAdmin ? 'admin' : 'admin',
            createdAt: new Date().toISOString(),
          };
          await saveUserProfile(p);
        }
        setProfile(p);
        setRole(p.role);
        await syncDriverInfo(p.driverId);
      } else {
        // Check saved session in localStorage
        try {
          const savedSession = typeof window !== 'undefined' ? localStorage.getItem('truckgestao_active_user') : null;
          if (savedSession) {
            const parsed = JSON.parse(savedSession);
            if (parsed.profile) {
              setProfile(parsed.profile);
              setRole(parsed.profile.role);
              if (parsed.driver) {
                setCurrentDriver(parsed.driver);
              } else if (parsed.profile.driverId) {
                await syncDriverInfo(parsed.profile.driverId);
              }
              setLoading(false);
              return;
            }
          }
        } catch (e) {
          console.warn('Erro ao restaurar sessão:', e);
        }

        // Fallback default admin profile
        const defaultAdminProfile: UserProfile = {
          uid: 'admin-master',
          email: 'admin@truckgestao.com',
          name: 'Gestor de Frota (Administrador)',
          role: 'admin',
          password: 'admin123',
          createdAt: new Date().toISOString(),
        };
        setProfile(defaultAdminProfile);
        setRole('admin');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithCredentials = async (identifier: string, password: string): Promise<{ success: boolean; error?: string }> => {
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
      // Reset to unauthenticated/default state
      const defaultAdminProfile: UserProfile = {
        uid: 'admin-master',
        email: 'admin@truckgestao.com',
        name: 'Gestor de Frota (Administrador)',
        role: 'admin',
        password: 'admin123',
        createdAt: new Date().toISOString(),
      };
      setProfile(defaultAdminProfile);
      setRole('admin');
      setCurrentDriver(null);
    } catch (err) {
      console.error('Erro no logout:', err);
    }
  };

  const switchDemoRole = async (targetRole: UserRole, targetDriverId?: string) => {
    if (targetRole === 'admin') {
      if (profile?.role !== 'admin') {
        return;
      }
      setRole('admin');
      const adminProfile: UserProfile = {
        uid: profile?.uid || 'admin-master',
        email: profile?.email || 'admin@truckgestao.com',
        name: profile?.name || 'Gestor de Frota (Administrador)',
        role: 'admin',
        password: profile?.password || 'admin123',
        createdAt: profile?.createdAt || new Date().toISOString(),
      };
      setProfile(adminProfile);
      setCurrentDriver(null);
      if (typeof window !== 'undefined') {
        localStorage.setItem('truckgestao_active_user', JSON.stringify({ profile: adminProfile }));
      }
    } else {
      setRole('driver');
      const drivers = await getDrivers();
      const driver = targetDriverId 
        ? drivers.find((d) => d.id === targetDriverId) 
        : drivers[0];

      if (driver) {
        setCurrentDriver(driver);
        const driverProfile: UserProfile = {
          uid: `user-${driver.id}`,
          email: driver.loginEmail || `${driver.id}@truckgestao.com`,
          name: driver.name,
          role: 'driver',
          driverId: driver.id,
          password: driver.password || '123456',
          createdAt: new Date().toISOString(),
        };
        setProfile(driverProfile);
        if (typeof window !== 'undefined') {
          localStorage.setItem('truckgestao_active_user', JSON.stringify({ profile: driverProfile, driver }));
        }
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
