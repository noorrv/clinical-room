import { useEffect, useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { authErrorMessage, useAuth } from '../../auth/AuthProvider';
import { enterGuest, leaveGuest } from '../../auth/guest';
import { supabase } from '../../lib/supabase';
import { AuthShell, Field, FormMessage, SetupNotice } from './AuthShell';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MIN_PASSWORD = 8;

/** Only ever send people to a page on this site after signing in. */
function safeNext(raw: string | null): string {
  return raw && raw.startsWith('/') && !raw.startsWith('//') ? raw : '/';
}

/** "Enter as a guest": a quiet second way in, under the main form. */
function GuestEntry({ next, lead = 'Just looking?' }: { next?: string; lead?: string }) {
  const navigate = useNavigate();
  return (
    <div className="auth-guest">
      <span className="auth-guest__rule" aria-hidden />
      <p className="auth-guest__text">{lead} Browse the open pages without an account.</p>
      <button
        type="button"
        className="auth-btn auth-btn--quiet"
        onClick={() => {
          enterGuest();
          navigate(next && next !== '/' ? next : '/#specialties');
        }}
      >
        Enter as a guest
      </button>
    </div>
  );
}

const longDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });

/* ─────────────────────────────── sign in ─────────────────────────────── */

export function LoginPage() {
  const { configured } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [unconfirmed, setUnconfirmed] = useState(false);
  const [resent, setResent] = useState(false);
  const [busy, setBusy] = useState(false);
  const next = safeNext(params.get('next'));

  if (!configured) return <SetupNotice />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setUnconfirmed(false);
    if (!EMAIL_RE.test(email.trim()) || !password) {
      setError('Enter your email address and password.');
      return;
    }
    setBusy(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (err) {
      setUnconfirmed(err.code === 'email_not_confirmed' || /not confirmed/i.test(err.message));
      setError(authErrorMessage(err));
      return;
    }
    leaveGuest();
    navigate(`/account?next=${encodeURIComponent(next)}`, { replace: true });
  };

  const resend = async () => {
    const { error: err } = await supabase.auth.resend({ type: 'signup', email: email.trim(), options: { emailRedirectTo: `${location.origin}/account` } });
    if (err) setError(authErrorMessage(err));
    else setResent(true);
  };

  return (
    <AuthShell title="Sign in" kicker="Welcome back to the Clinical Room">
      <form className="auth-form" onSubmit={submit} noValidate>
        <Field label="Email address" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Field label="Password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <FormMessage tone="error">{error}</FormMessage>}
        {unconfirmed && !resent && (
          <button type="button" className="auth-link-btn" onClick={resend}>
            Send the confirmation email again
          </button>
        )}
        {resent && <FormMessage tone="info">A new confirmation link is on its way to {email.trim()}.</FormMessage>}
        <button type="submit" className="auth-btn" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <p className="auth-foot">
        <Link to="/forgot-password">Forgot your password?</Link>
        <span aria-hidden> · </span>
        New here? <Link to="/register">Create an account</Link>
      </p>
      <GuestEntry next={params.get('next') ?? undefined} />
    </AuthShell>
  );
}

/* ─────────────────────────────── register ─────────────────────────────── */

type RegErrors = Partial<Record<'name' | 'email' | 'password' | 'confirm', string>>;

export function RegisterPage() {
  const { configured, session } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState<RegErrors>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!configured) return <SetupNotice />;
  if (session) return <Navigate to="/account" replace />;

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const validate = (): RegErrors => {
    const v: RegErrors = {};
    const name = form.name.trim();
    if (name.length < 2) v.name = 'Please enter your full name.';
    else if (name.length > 100) v.name = 'Please keep your name under 100 characters.';
    if (!EMAIL_RE.test(form.email.trim())) v.email = 'Please enter a valid email address.';
    if (form.password.length < MIN_PASSWORD) v.password = `Use at least ${MIN_PASSWORD} characters.`;
    if (!form.confirm) v.confirm = 'Please type your password again.';
    else if (form.confirm !== form.password) v.confirm = 'The two passwords don’t match.';
    return v;
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const v = validate();
    setErrors(v);
    if (Object.keys(v).length) return;
    setBusy(true);
    const email = form.email.trim();
    const { data, error: err } = await supabase.auth.signUp({
      email,
      password: form.password,
      options: { data: { full_name: form.name.trim() }, emailRedirectTo: `${location.origin}/account` },
    });
    setBusy(false);
    if (err) {
      setError(authErrorMessage(err));
      return;
    }
    // With email confirmation on there is no session yet: they must open the link first.
    if (data.session) navigate('/account', { replace: true });
    else navigate('/check-email', { replace: true, state: { email } });
  };

  return (
    <AuthShell title="Create an account" kicker="Join the Clinical Room">
      <p className="auth-text">Every new account is reviewed by hand before it can open the study rooms. You’ll confirm your email first, then wait for approval.</p>
      <form className="auth-form" onSubmit={submit} noValidate>
        <Field label="Full name" autoComplete="name" value={form.name} onChange={set('name')} error={errors.name} required maxLength={100} />
        <Field label="Email address" type="email" autoComplete="email" value={form.email} onChange={set('email')} error={errors.email} required />
        <Field
          label="Password"
          type="password"
          autoComplete="new-password"
          value={form.password}
          onChange={set('password')}
          error={errors.password}
          hint={`At least ${MIN_PASSWORD} characters.`}
          required
        />
        <Field label="Confirm password" type="password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} error={errors.confirm} required />
        {error && <FormMessage tone="error">{error}</FormMessage>}
        <button type="submit" className="auth-btn" disabled={busy}>
          {busy ? 'Creating your account…' : 'Create account'}
        </button>
      </form>
      <p className="auth-foot">
        Already registered? <Link to="/login">Sign in</Link>
      </p>
      <GuestEntry />
    </AuthShell>
  );
}

/* ─────────────────────────────── check your email ─────────────────────────────── */

export function CheckEmailPage() {
  const loc = useLocation();
  const email = (loc.state as { email?: string } | null)?.email ?? '';
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const resend = async () => {
    setError('');
    const { error: err } = await supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo: `${location.origin}/account` } });
    if (err) setError(authErrorMessage(err));
    else setSent(true);
  };

  return (
    <AuthShell title="Check your email" kicker="One more step">
      <p className="auth-text">
        We’ve sent a confirmation link{email ? (
          <>
            {' '}
            to <strong>{email}</strong>
          </>
        ) : null}
        . Open it to confirm your address; your registration then goes to the administrator for review.
      </p>
      <p className="auth-text auth-text--quiet">If you already have an account with this email, sign in instead. The email can take a few minutes; check your spam folder too.</p>
      {error && <FormMessage tone="error">{error}</FormMessage>}
      {sent ? (
        <FormMessage tone="info">Sent again.</FormMessage>
      ) : (
        email && (
          <button type="button" className="auth-link-btn" onClick={resend}>
            Send the link again
          </button>
        )
      )}
      <p className="auth-foot">
        <Link to="/login">Back to sign in</Link>
      </p>
    </AuthShell>
  );
}

/* ─────────────────────────────── account status ─────────────────────────────── */

export function AccountPage() {
  const { configured, loading, session, profile, isAdmin, refresh, signOut } = useAuth();
  const [params] = useSearchParams();
  const [checking, setChecking] = useState(false);
  const [checkedAt, setCheckedAt] = useState<number | null>(null);
  const next = params.get('next');

  if (!configured) return <SetupNotice />;
  if (loading) {
    return (
      <AuthShell title="One moment" kicker="Your account">
        <p className="auth-text" role="status">
          Checking your account…
        </p>
      </AuthShell>
    );
  }
  if (!session) return <Navigate to="/login" replace />;

  const checkAgain = async () => {
    setChecking(true);
    await refresh();
    setChecking(false);
    setCheckedAt(Date.now());
  };

  if (!profile) {
    return (
      <AuthShell title="We couldn’t find your registration" kicker="Your account">
        <p className="auth-text">Your sign-in worked, but there’s no registration on file for it. Please sign out and register again, or contact the administrator.</p>
        <button type="button" className="auth-btn auth-btn--quiet" onClick={signOut}>
          Sign out
        </button>
      </AuthShell>
    );
  }

  if (profile.status === 'approved' || isAdmin) {
    if (next) return <Navigate to={safeNext(next)} replace />;
    return (
      <AuthShell title={`Welcome, ${profile.full_name.split(' ')[0]}`} kicker="Your account is approved">
        <p className="auth-text">The study rooms are open to you. Your progress, bookmarks and notes are saved to your account.</p>
        <div className="auth-actions">
          <Link className="auth-btn" to="/#specialties">
            Go to the specialties
          </Link>
          {isAdmin && (
            <Link className="auth-btn auth-btn--quiet" to="/admin">
              Open the admin area
            </Link>
          )}
        </div>
        <p className="auth-foot">
          Signed in as {profile.email} ·{' '}
          <button type="button" className="auth-link-btn" onClick={signOut}>
            Sign out
          </button>
        </p>
      </AuthShell>
    );
  }

  if (profile.status === 'rejected') {
    return (
      <AuthShell title="Registration not approved" kicker="Your account">
        <p className="auth-text">The administrator has not granted this account access to the Clinical Room.</p>
        {profile.review_note && (
          <blockquote className="auth-note">
            <span className="auth-note__label">Note from the administrator</span>
            {profile.review_note}
          </blockquote>
        )}
        <p className="auth-text auth-text--quiet">If you think this is a mistake, please contact the administrator.</p>
        <button type="button" className="auth-btn auth-btn--quiet" onClick={signOut}>
          Sign out
        </button>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Awaiting review" kicker="Your registration is in">
      <div className="auth-seal" aria-hidden>
        <span>Pending</span>
      </div>
      <p className="auth-text">
        Thank you, {profile.full_name.split(' ')[0]}. Your registration from {longDate(profile.created_at)} is waiting for the administrator to review it. Every account is checked by hand before it can open the study rooms.
      </p>
      <p className="auth-text auth-text--quiet">You don’t need to do anything else. Once you’re approved, the study rooms open the next time you visit.</p>
      <div className="auth-actions">
        <button type="button" className="auth-btn" onClick={checkAgain} disabled={checking}>
          {checking ? 'Checking…' : 'Check again'}
        </button>
        <button type="button" className="auth-btn auth-btn--quiet" onClick={signOut}>
          Sign out
        </button>
      </div>
      {checkedAt && !checking && (
        <p className="auth-text auth-text--quiet" role="status">
          Still awaiting review.
        </p>
      )}
      <GuestEntry lead="While you wait:" />
    </AuthShell>
  );
}

/* ─────────────────────────────── forgotten password ─────────────────────────────── */

export function ForgotPasswordPage() {
  const { configured } = useAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  if (!configured) return <SetupNotice />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!EMAIL_RE.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }
    setBusy(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${location.origin}/reset-password` });
    setBusy(false);
    if (err) setError(authErrorMessage(err));
    else setSent(true);
  };

  return (
    <AuthShell title="Reset your password" kicker="It happens to the best of us">
      {sent ? (
        <FormMessage tone="info">If an account exists for {email.trim()}, a link to choose a new password is on its way.</FormMessage>
      ) : (
        <form className="auth-form" onSubmit={submit} noValidate>
          <Field label="Email address" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          {error && <FormMessage tone="error">{error}</FormMessage>}
          <button type="submit" className="auth-btn" disabled={busy}>
            {busy ? 'Sending…' : 'Send reset link'}
          </button>
        </form>
      )}
      <p className="auth-foot">
        <Link to="/login">Back to sign in</Link>
      </p>
    </AuthShell>
  );
}

export function ResetPasswordPage() {
  const { configured, loading, session, clearRecovery } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => () => clearRecovery(), [clearRecovery]);

  if (!configured) return <SetupNotice />;
  if (loading) {
    return (
      <AuthShell title="One moment" kicker="Reset your password">
        <p className="auth-text" role="status">
          Opening your reset link…
        </p>
      </AuthShell>
    );
  }
  if (!session) {
    return (
      <AuthShell title="This link has expired" kicker="Reset your password">
        <p className="auth-text">Reset links work once and only for a short while. Please ask for a new one.</p>
        <Link className="auth-btn" to="/forgot-password">
          Send a new link
        </Link>
      </AuthShell>
    );
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < MIN_PASSWORD) return setError(`Use at least ${MIN_PASSWORD} characters.`);
    if (password !== confirm) return setError('The two passwords don’t match.');
    setBusy(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (err) return setError(authErrorMessage(err));
    clearRecovery();
    navigate('/account', { replace: true });
  };

  return (
    <AuthShell title="Choose a new password" kicker="Reset your password">
      <form className="auth-form" onSubmit={submit} noValidate>
        <Field label="New password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} hint={`At least ${MIN_PASSWORD} characters.`} required />
        <Field label="Confirm new password" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        {error && <FormMessage tone="error">{error}</FormMessage>}
        <button type="submit" className="auth-btn" disabled={busy}>
          {busy ? 'Saving…' : 'Save new password'}
        </button>
      </form>
    </AuthShell>
  );
}
