import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '@/services/firebase/config';
import { loadProfile, signOut as fbSignOut } from '@/services/firebase/auth';
import { getSetting } from '@/services/firebase/data';
import type { Setting, UserProfile } from '@/types';

export type AuthStatus =
  /** Still resolving the persisted session — show a splash, not the landing page. */
  | 'loading'
  | 'signed-out'
  /** Authenticated but no `users/{uid}` document yet — needs onboarding. */
  | 'needs-onboarding'
  | 'ready';

interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  profile: UserProfile | null;
  setting: Setting | null;
  isMinder: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [setting, setSetting] = useState<Setting | null>(null);

  const hydrate = useCallback(async (nextUser: User | null) => {
    if (!nextUser) {
      setUser(null);
      setProfile(null);
      setSetting(null);
      setStatus('signed-out');
      return;
    }

    setUser(nextUser);
    try {
      const nextProfile = await loadProfile(nextUser.uid);
      if (!nextProfile) {
        setProfile(null);
        setSetting(null);
        setStatus('needs-onboarding');
        return;
      }

      setProfile(nextProfile);
      setSetting(await getSetting(nextProfile.settingId));
      setStatus('ready');
    } catch (err) {
      // Offline first load with a cold cache: keep the user signed in and let
      // the dashboard's own listeners retry rather than bouncing them out.
      console.warn('[LittleNest] Could not load profile.', err);
      setStatus('needs-onboarding');
    }
  }, []);

  useEffect(() => onAuthStateChanged(auth, (nextUser) => void hydrate(nextUser)), [hydrate]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      profile,
      setting,
      isMinder: profile?.role === 'minder',
      refresh: () => hydrate(auth.currentUser),
      signOut: async () => {
        await fbSignOut();
      },
    }),
    [status, user, profile, setting, hydrate],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
