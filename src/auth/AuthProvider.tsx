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
    await supabase.auth.signOut();
    setSession(null);
    await loadAccount(null);
  }, [loadAccount]);

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
