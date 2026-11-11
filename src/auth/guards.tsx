import type { ReactNode } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { AuthShell, SetupNotice } from '../pages/auth/AuthShell';
import { useAuth } from './AuthProvider';
import { useGuestFlag } from './guest';

/*
  Page guards. They keep people on the right screen; the database's Row Level Security is what
  actually stops an unapproved account from reading anything, with or without these.
*/

/** The parchment "one moment" card shown while an account or a page is loading. */
export function Waiting() {
  return (
    <AuthShell title="One moment" kicker="The Clinical Room">
      <p className="auth-text" role="status">
        Checking your account…
      </p>
    </AuthShell>
  );
}

/** A slim ribbon over the study pages while browsing as a guest. */
function GuestRibbon() {
  const loc = useLocation();
  const next = encodeURIComponent(loc.pathname + loc.search);
  return (
    <div className="guest-ribbon" role="note">
      <p className="guest-ribbon__text">
        <strong>Browsing as a guest.</strong> You’re seeing the open pages only, and your progress stays on this device.
      </p>
      <p className="guest-ribbon__links">
        <Link to="/register">Create an account</Link>
        <span aria-hidden> · </span>
        <Link to={`/login?next=${next}`}>Sign in</Link>
      </p>
    </div>
  );
}

/** Approved students and admins; guests too, who only receive open (public) content. */
export function RequireApproved({ children }: { children: ReactNode }) {
  const { configured, loading, session, profile, isAdmin } = useAuth();
  const guest = useGuestFlag();
  const loc = useLocation();
  if (!configured) return <SetupNotice />;
  if (loading) return <Waiting />;
  const full = Boolean(session) && (isAdmin || profile?.status === 'approved');
  if (full) return <>{children}</>;
  if (guest) {
    return (
      <>
        <GuestRibbon />
        {children}
      </>
    );
  }
  const next = encodeURIComponent(loc.pathname + loc.search);
  if (!session) return <Navigate to={`/login?next=${next}`} replace />;
  return <Navigate to={`/account?next=${next}`} replace />;
}

/** The administrator only. */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { configured, loading, session, isAdmin } = useAuth();
  const loc = useLocation();
  if (!configured) return <SetupNotice />;
  if (loading) return <Waiting />;
  if (!session) return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname)}`} replace />;
  if (!isAdmin) return <Navigate to="/account" replace />;
  return <>{children}</>;
}
