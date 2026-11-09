import { useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { useGuestBrowsing } from '../auth/guest';
import { AuthShell } from '../pages/auth/AuthShell';
import { contentLoadedFor, setRemoteContent } from './index';
import { fetchContent } from './remote';

/** Loads the protected content once per signed-in account before the study pages render. */
export function ContentGate({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const guest = useGuestBrowsing();
  // guests get open rows only, so their copy is kept apart from any account's
  const uid = guest ? 'guest' : (session?.user.id ?? null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>(contentLoadedFor() === uid ? 'ready' : 'loading');
  const [message, setMessage] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (contentLoadedFor() === uid) {
      setState('ready');
      return;
    }
    let alive = true;
    setState('loading');
    fetchContent()
      .then((data) => {
        if (!alive) return;
        setRemoteContent(data, uid);
        setState('ready');
      })
      .catch((e: Error) => {
        if (!alive) return;
        setMessage(e.message);
        setState('error');
      });
    return () => {
      alive = false;
    };
  }, [uid, attempt]);

  if (state === 'ready') return <>{children}</>;
  if (state === 'error') {
    return (
      <AuthShell title="The library couldn’t be opened" kicker="The Clinical Room">
        <p className="auth-text">Something went wrong while fetching the study material. Please check your connection and try again.</p>
        {import.meta.env.DEV && <p className="auth-text auth-text--quiet">{message}</p>}
        <button type="button" className="auth-btn" onClick={() => setAttempt((n) => n + 1)}>
          Try again
        </button>
      </AuthShell>
    );
  }
  return (
    <AuthShell title="Opening the library" kicker="The Clinical Room">
      <p className="auth-text" role="status">
        Fetching your study material…
      </p>
    </AuthShell>
  );
}
