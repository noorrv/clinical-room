import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AuthShell } from './auth/AuthShell';

/*
  The two pages nobody should usually see, dressed in the site's own parchment card: an address
  that doesn't exist, and a page that failed while drawing. Both keep the header and offer a way on.
*/

export function NotFoundPage() {
  const { pathname } = useLocation();
  return (
    <AuthShell title="This page isn’t in the library" kicker="Page not found">
      <p className="auth-text">
        There’s nothing at <code>{pathname}</code>. It may have moved, or the address may be mistyped.
      </p>
      <div className="auth-actions">
        <Link className="auth-btn" to="/">
          Go to the homepage
        </Link>
        <Link className="auth-btn auth-btn--quiet" to="/#specialties">
          Browse the specialties
        </Link>
      </div>
    </AuthShell>
  );
}

interface BoundaryProps {
  children: ReactNode;
  /** changes on every page change, so moving to another page clears the error */
  resetKey: string;
}

class ErrorBoundary extends Component<BoundaryProps, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // kept in the console for whoever investigates; students see the calm page below
    console.error('A page failed to render:', error, info.componentStack);
  }

  componentDidUpdate(prev: BoundaryProps) {
    if (this.state.failed && prev.resetKey !== this.props.resetKey) this.setState({ failed: false });
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <AuthShell title="This page couldn’t be shown" kicker="Something went wrong">
        <p className="auth-text">Your progress and notes are safe. Try the page again, or head back to the homepage.</p>
        <div className="auth-actions">
          <button type="button" className="auth-btn" onClick={() => this.setState({ failed: false })}>
            Try again
          </button>
          <a className="auth-btn auth-btn--quiet" href="/">
            Go to the homepage
          </a>
        </div>
      </AuthShell>
    );
  }
}

/** Catches a failure in any page so the rest of the site (header, navigation) keeps working. */
export function PageBoundary({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return <ErrorBoundary resetKey={pathname}>{children}</ErrorBoundary>;
}
