import { useId, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import './auth.css';

/** The page around every sign-in screen: a lace-edged card lying on the striped cloth. */
export function AuthShell({ title, kicker, children, wide }: { title: string; kicker?: string; children: ReactNode; wide?: boolean }) {
  return (
    <main id="main" className="auth-page">
      <section className={`auth-card${wide ? ' auth-card--wide' : ''}`} aria-labelledby="auth-title">
        {kicker && <p className="auth-kicker">{kicker}</p>}
        <h1 id="auth-title" className="auth-title">
          {title}
        </h1>
        <span className="auth-rule" aria-hidden />
        {children}
      </section>
    </main>
  );
}

/** Shown in place of sign-in screens until .env.local holds the Supabase keys. */
export function SetupNotice() {
  return (
    <AuthShell title="Accounts aren’t switched on yet" kicker="The Clinical Room">
      <p className="auth-text">
        Signing in needs the site’s Supabase project. {import.meta.env.DEV ? (
          <>
            Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to <code>.env.local</code> (see <code>.env.example</code>), then restart <code>npm run dev</code>.
          </>
        ) : (
          'Please try again a little later.'
        )}
      </p>
    </AuthShell>
  );
}

type FieldProps = InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; hint?: string };

export function Field({ label, error, hint, type = 'text', ...input }: FieldProps) {
  const id = useId();
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';
  const describedBy = [error ? `${id}-err` : '', hint ? `${id}-hint` : ''].filter(Boolean).join(' ') || undefined;
  return (
    <div className={`auth-field${error ? ' has-error' : ''}`}>
      <label htmlFor={id}>{label}</label>
      <div className="auth-field__box">
        <input id={id} type={isPassword && show ? 'text' : type} aria-invalid={Boolean(error)} aria-describedby={describedBy} {...input} />
        {isPassword && (
          <button type="button" className="auth-field__toggle" onClick={() => setShow((s) => !s)} aria-pressed={show}>
            {show ? 'Hide' : 'Show'}
          </button>
        )}
      </div>
      {hint && !error && (
        <p className="auth-field__hint" id={`${id}-hint`}>
          {hint}
        </p>
      )}
      {error && (
        <p className="auth-field__error" id={`${id}-err`}>
          {error}
        </p>
      )}
    </div>
  );
}

export function FormMessage({ tone, children }: { tone: 'error' | 'info'; children: ReactNode }) {
  return (
    <p className={`auth-message auth-message--${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      {children}
    </p>
  );
}
