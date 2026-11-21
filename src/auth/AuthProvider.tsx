import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, supabaseConfigured } from '../lib/supabase';

/*
  Who is signed in, and what their account allows. This only decides what the site SHOWS;
  the database's Row Level Security decides what anyone can actually read or change.
*/

export type AccountStatus = 'pending' | 'approved' | 'rejected';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  email_confirmed_at: string | null;
  status: AccountStatus;
  created_at: string;
  reviewed_at: string | null;
  review_note: string | null;
  /** the student's picture: an illustrated avatar, an uploaded photo, or neither (added by migration 010) */
  avatar_kind?: 'preset' | 'upload' | null;
  avatar_preset?: string | null;
  avatar_path?: string | null;
}

interface AuthState {
  configured: boolean;
  /** true until the first session and profile check has finished */
  loading: boolean;
  session: Session | null;
  profile: Profile | null;
  isAdmin: boolean;
  /** set when the visitor arrived from a password-reset email */
  recovering: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
  clearRecovery: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

/*
  One device per account: the device that signed in last stays signed in, older ones are signed out.
  The database keeps the id of the active device (migration 015); each device keeps its own copy here.
  This is enforced by the site, not by the database. Admin accounts are exempt.
*/
const DEVICE_KEY = (uid: string) => `cr-device-${uid}`;
export const LOGIN_PENDING_KEY = 'cr-login-pending';
export const KICKED_KEY = 'cr-signed-out-elsewhere';

const newToken = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(supabaseConfigured);
  const [recovering, setRecovering] = useState(false);
  const loadedFor = useRef<string | null>(null);

  const loadAccount = useCallback(async (userId: string | null) => {
    if (!userId) {
      setProfile(null);
      setIsAdmin(false);
      loadedFor.current = null;
      return;
    }
    const [p, a] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabase.from('admins').select('user_id').eq('user_id', userId).maybeSingle(),
    ]);
    setProfile((p.data as Profile | null) ?? null);
    setIsAdmin(Boolean(a.data));
    loadedFor.current = userId;
  }, []);

  useEffect(() => {
    if (!supabaseConfigured) return;
    let alive = true;
    let first = true;

    // fires INITIAL_SESSION straight away, then on every sign-in, sign-out and token refresh
    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      if (event === 'PASSWORD_RECOVERY') setRecovering(true);
      const uid = next?.user.id ?? null;
      // a token refresh keeps the same user: no need to fetch the account again
      if (first || uid !== loadedFor.current) {
        first = false;
        // deferred: Supabase asks not to call it again from inside this callback
        setTimeout(() => {
          loadAccount(uid).finally(() => alive && setLoading(false));
        }, 0);
      }
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [loadAccount]);

  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    setSession(data.session);
    await loadAccount(data.session?.user.id ?? null);
  }, [loadAccount]);

  const signOut = useCallback(async () => {
    const uid = loadedFor.current;
    if (uid) localStorage.removeItem(DEVICE_KEY(uid));
    await supabase.auth.signOut();
    setSession(null);
    await loadAccount(null);
  }, [loadAccount]);

  // one device per account (not for admins)
  const guardUser = !loading && !isAdmin && profile ? session?.user.id ?? null : null;
  useEffect(() => {
    if (!supabaseConfigured || !guardUser) return;
    const uid = guardUser;
    let alive = true;
    let kicked = false;

    const kick = async () => {
      if (!alive || kicked) return;
      kicked = true;
      localStorage.removeItem(DEVICE_KEY(uid));
      try {
        localStorage.setItem(KICKED_KEY, '1');
      } catch {
        /* storage blocked: the sign-out still happens */
      }
      // 'local' signs out this device only: the default would also cancel the new device's session
      await supabase.auth.signOut({ scope: 'local' });
      setSession(null);
      await loadAccount(null);
    };

    const check = async () => {
      const token = localStorage.getItem(DEVICE_KEY(uid));
      if (!token) return;
      const { data, error } = await supabase.rpc('device_ok', { p_token: token });
      // a network or server error never signs anyone out
      if (!error && data === false) await kick();
    };

    const start = async () => {
      let token = localStorage.getItem(DEVICE_KEY(uid));
      const fresh = localStorage.getItem(LOGIN_PENDING_KEY) === '1';
      if (fresh || !token) {
        token = newToken();
        const { error } = await supabase.rpc('claim_device', { p_token: token });
        if (error) return; // the table is not set up yet, or offline: do nothing
        localStorage.setItem(DEVICE_KEY(uid), token);
        localStorage.removeItem(LOGIN_PENDING_KEY);
      } else {
        await check();
      }
    };

    start();
    const timer = setInterval(check, 60_000);
    const onFocus = () => document.visibilityState !== 'hidden' && check();
    document.addEventListener('visibilitychange', onFocus);
    window.addEventListener('focus', onFocus);
    const channel = supabase
      .channel(`device-${uid}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'active_sessions', filter: `user_id=eq.${uid}` }, check)
      .subscribe();

    return () => {
      alive = false;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onFocus);
      window.removeEventListener('focus', onFocus);
      supabase.removeChannel(channel);
    };
  }, [guardUser, loadAccount]);

  const value = useMemo<AuthState>(
    () => ({
      configured: supabaseConfigured,
      loading,
      session,
      profile,
      isAdmin,
      recovering,
      refresh,
      signOut,
      clearRecovery: () => setRecovering(false),
    }),
    [loading, session, profile, isAdmin, recovering, refresh, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

/** Plain-language versions of the errors Supabase Auth returns. */
export function authErrorMessage(err: { message?: string; code?: string } | null | undefined): string {
  const m = (err?.message ?? '').toLowerCase();
  const code = err?.code ?? '';
  if (code === 'email_not_confirmed' || m.includes('email not confirmed')) return 'Please confirm your email address first: open the link we sent you.';
  if (code === 'invalid_credentials' || m.includes('invalid login')) return 'That email and password don’t match an account.';
  if (code === 'user_already_exists' || m.includes('already registered')) return 'An account with this email already exists. Try signing in instead.';
  if (code === 'weak_password' || m.includes('password should')) return 'Please choose a stronger password (at least 8 characters).';
  if (code === 'over_email_send_rate_limit' || m.includes('rate limit')) return 'Too many emails were sent just now. Please wait a few minutes and try again.';
  if (m.includes('failed to fetch') || m.includes('network')) return 'We couldn’t reach the server. Check your connection and try again.';
  return err?.message || 'Something went wrong. Please try again.';
}
