import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthShell, SetupNotice } from '../pages/auth/AuthShell';
import { useAuth } from './AuthProvider';

/*
  Page guards. They keep people on the right screen; the database's Row Level Security is what
  actually stops an unapproved account from reading anything, with or without these.
*/

function Waiting() {
  return (
    <AuthShell title="One moment" kicker="The Clinical Room">
      <p className="auth-text" role="status">
        Checking your account…
      </p>
    </AuthShell>
  );
}

/** Approved students (and admins) only. */
export function RequireApproved({ children }: { children: ReactNode }) {
  const { configured, loading, session, profile, isAdmin } = useAuth();
  const loc = useLocation();
  if (!configured) return <SetupNotice />;
  if (loading) return <Waiting />;
  const next = encodeURIComponent(loc.pathname + loc.search);
  if (!session) return <Navigate to={`/login?next=${next}`} replace />;
  if (!isAdmin && profile?.status !== 'approved') return <Navigate to={`/account?next=${next}`} replace />;
  return <>{children}</>;
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
