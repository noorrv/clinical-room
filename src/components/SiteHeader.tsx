import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { enterGuest, leaveGuest, useGuestFlag } from '../auth/guest';
import { allSpecialties, questionPath, questionsOf, TYPE_LABEL, useContentVersion } from '../content';
import { navLinks, specialties } from '../data/homepage';
import { useNotifications } from '../notifications/useNotifications';
import { AntiqueBell, CloseLines, Garland, IvT, MenuLines, SearchGlass } from './HeaderArt';
import './SiteHeader.css';

type Panel = 'menu' | 'search' | 'alerts' | 'account' | null;

function Avatar() {
  return (
    <svg viewBox="0 0 40 40" width="40" height="40" aria-hidden>
      <circle cx="20" cy="20" r="20" fill="#e9d6b4" />
      <path d="M8 36 Q10 26 20 26 Q30 26 32 36 Z" fill="#6f1d1b" />
      <path d="M16 26 L20 31 L24 26" fill="#f4e8d0" />
      <circle cx="20" cy="17" r="7.5" fill="#d7a77e" />
      <path d="M12.4 16 Q12 8 20 8 Q28 8 27.6 16 Q25 12 20 12.6 Q15 12 12.4 16 Z" fill="#3b2416" />
    </svg>
  );
}

/** Router link for in-app addresses, plain link for anything else. */
function AppLink({ href, children, ...rest }: { href: string; children: ReactNode; onClick?: () => void; 'aria-current'?: 'page' }) {
  return href.startsWith('/') ? (
    <Link to={href} {...rest}>
      {children}
    </Link>
  ) : (
    <a href={href} {...rest}>
      {children}
    </a>
  );
}

/** Everything a visitor might look for: specialties, every question, topic and doctor, and pages. */
function useSearchIndex() {
  const version = useContentVersion();
  return useMemo(
    () => [
      ...allSpecialties().flatMap((sp) => [
        ...questionsOf(sp).map((q) => ({ title: q.title, hint: `${sp.shortName} · ${TYPE_LABEL[q.type]}`, href: questionPath(sp, q.id) })),
        ...sp.topics.map((t) => ({ title: t.name, hint: `${sp.shortName} topic`, href: `/specialties/${sp.slug}?tab=topics&open=${t.id}` })),
        ...sp.doctors.map((d) => ({ title: d.name, hint: `${sp.shortName} examiner`, href: `/specialties/${sp.slug}?tab=doctors&open=${d.id}` })),
      ]),
      ...specialties.flatMap((s) => [
        { title: s.title, hint: 'Specialty', href: s.href },
        ...s.points.map((p) => ({ title: p, hint: s.title, href: s.href })),
      ]),
      ...navLinks.map((l) => ({ title: l.label, hint: 'Page', href: l.href })),
    ],
    // rebuilt once the protected content arrives after sign-in
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version],
  );
}

export function SiteHeader() {
  const [open, setOpen] = useState<Panel>(null);
  const [query, setQuery] = useState('');
  const index = useSearchIndex();
  const { pathname } = useLocation();

  // close panels when the page changes
  useEffect(() => setOpen(null), [pathname]);
  const headerRef = useRef<HTMLElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const ids = useId().replace(/:/g, '');

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return index.filter((i) => i.title.toLowerCase().includes(q) || i.hint.toLowerCase().includes(q)).slice(0, 7);
  }, [query, index]);

  const toggle = (p: Exclude<Panel, null>) => setOpen((cur) => (cur === p ? null : p));
  const feed = useNotifications(open === 'alerts');

  // Esc and clicks outside close whichever panel is open
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(null);
    const onDown = (e: PointerEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) setOpen(null);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onDown);
    };
  }, [open]);

  useEffect(() => {
    if (open === 'search') searchInput.current?.focus();
  }, [open]);

  return (
    <header className="site-header" ref={headerRef}>
      <div className="site-header__inner container">
        <Link className="brand" to="/" aria-label="The Clinical Room, home">
          <span className="brand__word" aria-hidden>
            <IvT className="brand__t" />
            <span className="brand__rest">e Clinical Room</span>
          </span>
        </Link>

        <div className="header-actions">
          <button
            type="button"
            className="icon-btn icon-btn--search"
            aria-label="Search the guide"
            aria-expanded={open === 'search'}
            aria-controls={`${ids}-search`}
            onClick={() => toggle('search')}
          >
            <SearchGlass />
          </button>
          <span className="header-actions__rule" aria-hidden />
          <button
            type="button"
            className="icon-btn"
            aria-label={feed.unreadCount ? `Notifications, ${feed.unreadCount} unread` : 'Notifications'}
            aria-expanded={open === 'alerts'}
            aria-controls={`${ids}-alerts`}
            onClick={() => toggle('alerts')}
          >
            <AntiqueBell />
            {feed.unreadCount > 0 && <span className="icon-btn__dot" aria-hidden />}
          </button>
          <span className="header-actions__rule" aria-hidden />
          <button
            type="button"
            className="avatar-btn"
            aria-label="Your account"
            aria-expanded={open === 'account'}
            aria-controls={`${ids}-account`}
            onClick={() => toggle('account')}
          >
            <Avatar />
          </button>
          <button
            type="button"
            className="icon-btn menu-btn"
            aria-expanded={open === 'menu'}
            aria-controls="primary-nav"
            aria-label={open === 'menu' ? 'Close menu' : 'Open menu'}
            onClick={() => toggle('menu')}
          >
            {open === 'menu' ? <CloseLines /> : <MenuLines />}
          </button>
        </div>
      </div>

      {/* bottom rule with its garland */}
      <div className="site-header__rule" aria-hidden>
        <span className="site-header__spark site-header__spark--l" />
        <span className="site-header__spark site-header__spark--r" />
        <Garland className="site-header__garland" />
      </div>

      {/* main menu */}
      <nav className={`header-panel primary-nav${open === 'menu' ? ' is-open' : ''}`} id="primary-nav" aria-label="Main">
        <ul>
          {navLinks.map((l) => (
            <li key={l.label}>
              <AppLink href={l.href} aria-current={l.href === '/' && pathname === '/' ? 'page' : undefined} onClick={() => setOpen(null)}>
                {l.label}
              </AppLink>
            </li>
          ))}
          <li className="primary-nav__search">
            <button type="button" onClick={() => setOpen('search')}>
              Search the guide
            </button>
          </li>
        </ul>
      </nav>

      {/* search */}
      <div className={`header-panel search-panel${open === 'search' ? ' is-open' : ''}`} id={`${ids}-search`}>
        <form role="search" onSubmit={(e) => e.preventDefault()}>
          <label className="visually-hidden" htmlFor={`${ids}-q`}>
            Search the guide
          </label>
          <SearchGlass size={22} />
          <input
            ref={searchInput}
            id={`${ids}-q`}
            type="search"
            placeholder="Search stations, cases and topics"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
          />
        </form>
        {query.trim().length >= 2 && (
          <ul className="search-panel__results" aria-live="polite">
            {results.length ? (
              results.map((r, i) => (
                <li key={`${r.title}-${i}`}>
                  <AppLink href={r.href} onClick={() => setOpen(null)}>
                    <span>{r.title}</span>
                    <small>{r.hint}</small>
                  </AppLink>
                </li>
              ))
            ) : (
              <li className="search-panel__empty">Nothing matches “{query.trim()}” yet. Try a specialty, such as Paediatrics.</li>
            )}
          </ul>
        )}
      </div>

      {/* account */}
      <AccountPanel id={`${ids}-account`} open={open === 'account'} onDone={() => setOpen(null)} />

      {/* notifications */}
      <div
        className={`header-panel alerts-panel${open === 'alerts' ? ' is-open' : ''}`}
        id={`${ids}-alerts`}
        role="region"
        aria-label="Notifications"
      >
        <p className="alerts-panel__title">Notifications</p>
        {!feed.allowed ? (
          <p className="alerts-panel__empty">Sign in to hear when new questions and topics are added.</p>
        ) : !feed.loaded ? (
          <p className="alerts-panel__empty">Checking for news…</p>
        ) : feed.items.length ? (
          <>
            <ul className="alerts-list">
              {feed.items.map((n) => (
                <li key={n.key} className={n.unread ? 'is-unread' : undefined}>
                  <AppLink href={n.href} onClick={() => setOpen(null)}>
                    <span className={`alerts-panel__badge alerts-panel__badge--${n.kind}`}>{KIND_WORD[n.kind]}</span>
                    <span className="alerts-list__text">
                      <bdi className="alerts-list__title">{n.title}</bdi>
                      <span className="alerts-list__detail">
                        <bdi>{n.detail}</bdi> · <time dateTime={n.at.toISOString()}>{whenText(n.at)}</time>
                      </span>
                    </span>
                    {n.unread && <span className="visually-hidden">(unread)</span>}
                  </AppLink>
                </li>
              ))}
            </ul>
            {feed.unreadCount > 0 ? (
              <button type="button" className="alerts-panel__clear" onClick={feed.markAllRead}>
                Mark all as read
              </button>
            ) : (
              <p className="alerts-panel__empty alerts-panel__caught">You’re all caught up.</p>
            )}
          </>
        ) : (
          <p className="alerts-panel__empty">You’re all caught up.</p>
        )}
      </div>
    </header>
  );
}

const KIND_WORD = { 'new-topic': 'New topic', 'new-questions': 'New', updated: 'Updated', announcement: 'Notice' } as const;

/** "Today", "Yesterday", "3 days ago", then the date. */
function whenText(d: Date) {
  const days = Math.floor((new Date().setHours(0, 0, 0, 0) - new Date(d).setHours(0, 0, 0, 0)) / 864e5);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

const STATUS_WORD = { pending: 'Awaiting review', approved: 'Approved', rejected: 'Not approved' } as const;

function AccountPanel({ id, open, onDone }: { id: string; open: boolean; onDone: () => void }) {
  const { configured, session, profile, isAdmin, signOut } = useAuth();
  const guest = useGuestFlag();
  return (
    <div className={`header-panel alerts-panel account-panel${open ? ' is-open' : ''}`} id={id} role="region" aria-label="Your account">
      <p className="alerts-panel__title">Your account</p>
      {!configured ? (
        <p className="alerts-panel__empty">Accounts aren’t switched on yet.</p>
      ) : session && profile ? (
        <>
          <p className="account-panel__who">
            <strong>{profile.full_name}</strong>
            <span>{profile.email}</span>
            <span className={`account-panel__status account-panel__status--${profile.status}`}>{STATUS_WORD[profile.status]}</span>
          </p>
          <ul>
            <li>
              <Link to="/account" onClick={onDone}>
                My account
              </Link>
            </li>
            {isAdmin && (
              <li>
                <Link to="/admin" onClick={onDone}>
                  Admin dashboard
                </Link>
              </li>
            )}
          </ul>
          <button
            type="button"
            className="alerts-panel__clear"
            onClick={() => {
              onDone();
              signOut();
            }}
          >
            Sign out
          </button>
        </>
      ) : (
        <>
          {guest && <p className="account-panel__guest">You’re browsing as a guest: open pages only.</p>}
          <ul>
            <li>
              <Link to="/login" onClick={onDone}>
                Sign in
              </Link>
            </li>
            <li>
              <Link to="/register" onClick={onDone}>
                Create an account
              </Link>
            </li>
            {!guest && (
              <li>
                <Link
                  to="/#specialties"
                  onClick={() => {
                    enterGuest();
                    onDone();
                  }}
                >
                  Enter as a guest
                </Link>
              </li>
            )}
          </ul>
          {guest && (
            <button
              type="button"
              className="alerts-panel__clear"
              onClick={() => {
                leaveGuest();
                onDone();
              }}
            >
              Leave guest mode
            </button>
          )}
        </>
      )}
    </div>
  );
}
