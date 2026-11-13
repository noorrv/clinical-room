import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, type Profile } from '../../auth/AuthProvider';
import { AVATARS, AvatarArt } from '../../components/art/Avatars';
import { UserAvatar, usePhoto } from '../../components/UserAvatar';
import { allSpecialties, questionsOf } from '../../content';
import { supabase } from '../../lib/supabase';
import { computeStreak } from '../../study/streak';
import { localDay, record, useStudy, type StudyState } from '../../study/store';
import { ContinueStudyingCard } from '../../components/ContinueCard';
import '../auth/auth.css';
import './profile.css';

/*
  The student's own page: their name and picture, what their account is, and a summary of their
  study worked out from their saved record (only questions that are published now are counted).
  Editing goes through update_my_profile() in the database, which changes nothing but the name
  and picture; a photo is squared and shrunk in the browser, then kept in the student's own
  folder of the private avatars bucket.
*/

const STATUS_WORD: Record<Profile['status'], string> = {
  approved: 'Approved student',
  pending: 'Waiting for approval',
  rejected: 'Not approved',
};

const longDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '—';

export function ProfilePage() {
  const { profile, isAdmin, session } = useAuth();
  const st = useStudy();
  const [editing, setEditing] = useState(false);

  // counted against the questions that exist and are published now, so removed ones don't linger
  const stats = useMemo(() => {
    const keys = allSpecialties().flatMap((sp) => questionsOf(sp).map((q) => q.key));
    const recs = keys.map((k) => record(st, k));
    const streak = computeStreak(st.days, profile?.created_at ?? null);
    const weekStart = Date.now() - 6 * 864e5;
    const thisWeek = new Set(
      Object.entries(st.days)
        .filter(([d]) => new Date(`${d}T12:00`).getTime() >= weekStart - 864e5 / 2)
        .flatMap(([, ks]) => ks),
    ).size;
    return {
      total: keys.length,
      attempted: recs.filter((r) => r.status !== 'not-started').length,
      completed: recs.filter((r) => r.status === 'mastered').length,
      bookmarked: recs.filter((r) => r.bookmarked).length,
      streak: streak.current,
      best: streak.best,
      thisWeek,
    };
  }, [st, profile?.created_at]);

  if (!profile) return null;
  const first = profile.full_name.split(' ')[0];

  return (
    <div className="profile-page">
      <div className="profile container">
        <section className="profile-card" aria-labelledby="profile-name">
          <div className="profile-card__pic">
            <UserAvatar profile={profile} size={128} label={`${profile.full_name}’s picture`} />
          </div>
          <div className="profile-card__who">
            <p className="profile-card__kicker">{isAdmin ? 'Administrator' : STATUS_WORD[profile.status]}</p>
            <h1 id="profile-name" className="profile-card__name">
              <bdi>{profile.full_name}</bdi>
            </h1>
            <p className="profile-card__meta">
              {profile.email} · with us since{' '}
              {new Date(profile.created_at).toLocaleDateString(undefined, {
                month: 'long',
                year: 'numeric',
              })}
            </p>
            <button type="button" className="auth-btn profile-card__edit" onClick={() => setEditing(true)}>
              Edit profile
            </button>
          </div>
        </section>

        <section className="profile-section" aria-labelledby="profile-stats">
          <h2 id="profile-stats" className="profile-section__title">
            {first}’s study
          </h2>
          <dl className="profile-stats">
            <div>
              <dt>Questions attempted</dt>
              <dd>
                {stats.attempted}
                <span> of {stats.total}</span>
              </dd>
            </div>
            <div>
              <dt>Questions completed</dt>
              <dd>{stats.completed}</dd>
            </div>
            <div>
              <dt>Bookmarked</dt>
              <dd>{stats.bookmarked}</dd>
            </div>
            <div>
              <dt>Study streak</dt>
              <dd>
                {stats.streak}
                <span>
                  {' '}
                  {stats.streak === 1 ? 'day' : 'days'} · best {stats.best}
                </span>
              </dd>
            </div>
            <div>
              <dt>Studied in the last 7 days</dt>
              <dd>
                {stats.thisWeek}
                <span> {stats.thisWeek === 1 ? 'question' : 'questions'}</span>
              </dd>
            </div>
          </dl>
          <p className="profile-note">Attempted counts every question you’ve opened; completed counts the ones you’ve marked as reviewed.</p>
          <WeekActivity st={st} />
        </section>

        <section className="profile-continue" aria-label="Continue studying">
          <ContinueStudyingCard />
        </section>

        {/* account details are for administrators; students see only their card and study */}
        {isAdmin && (
          <section className="profile-section" aria-labelledby="profile-account">
            <h2 id="profile-account" className="profile-section__title">
              Account
            </h2>
            <dl className="profile-account">
              <div>
                <dt>Full name</dt>
                <dd>
                  <bdi>{profile.full_name}</bdi>
                </dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{profile.email}</dd>
              </div>
              <div>
                <dt>Account</dt>
                <dd>{isAdmin ? 'Administrator' : STATUS_WORD[profile.status]}</dd>
              </div>
              <div>
                <dt>Joined</dt>
                <dd>{longDate(profile.created_at)}</dd>
              </div>
              {profile.reviewed_at && (
                <div>
                  <dt>Approved</dt>
                  <dd>{longDate(profile.reviewed_at)}</dd>
                </div>
              )}
              <div>
                <dt>Last signed in</dt>
                <dd>{longDate(session?.user.last_sign_in_at ?? null)}</dd>
              </div>
            </dl>
            <p className="profile-note">
              To change your email or password, use <Link to="/forgot-password">reset your password</Link>, or ask an administrator.
            </p>
          </section>
        )}

        {editing && <EditProfile profile={profile} onClose={() => setEditing(false)} />}
      </div>
    </div>
  );
}

/* ───────────────────────── editing ───────────────────────── */

type Choice = { kind: 'preset'; id: string } | { kind: 'upload'; path: string } | { kind: 'photo'; blob: Blob; preview: string } | { kind: 'none' };

/** Squares and shrinks a photo to a 320px WebP (JPEG where WebP can't be written). */
async function preparePhoto(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 320;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, 320, 320);
  bitmap.close();
  const as = (type: string) => new Promise<Blob | null>((res) => canvas.toBlob(res, type, 0.86));
  const blob = (await as('image/webp')) ?? (await as('image/jpeg'));
  if (!blob) throw new Error('That picture could not be read.');
  return blob;
}

function friendly(message: string): string {
  if (/update_my_profile|function .* does not exist|schema cache/i.test(message)) return 'Profile editing isn’t switched on yet: the profile update needs to be installed in the database first.';
  if (/bucket not found/i.test(message)) return 'Photo uploads aren’t switched on yet: the avatars bucket needs to be created first.';
  if (/payload too large|exceeded the maximum/i.test(message)) return 'That photo is too large. Please choose a smaller one.';
  return message || 'Something went wrong. Please try again.';
}

function EditProfile({ profile, onClose }: { profile: Profile; onClose: () => void }) {
  const { refresh } = useAuth();
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const nameId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(profile.full_name);
  const [choice, setChoice] = useState<Choice>(
    profile.avatar_kind === 'upload' && profile.avatar_path
      ? { kind: 'upload', path: profile.avatar_path }
      : profile.avatar_kind === 'preset' && profile.avatar_preset
        ? { kind: 'preset', id: profile.avatar_preset }
        : { kind: 'none' },
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [nameError, setNameError] = useState('');
  const current = usePhoto(choice.kind === 'upload' ? choice.path : null);

  useEffect(() => {
    ref.current?.showModal();
  }, []);
  useEffect(() => () => (choice.kind === 'photo' ? URL.revokeObjectURL(choice.preview) : undefined), [choice]);

  const pick = async (file: File | undefined) => {
    setError('');
    if (!file) return;
    if (!/^image\/(jpeg|png|webp|heic|heif)$/.test(file.type)) {
      setError('Please choose a JPEG, PNG or WebP photo.');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setError('That photo is over 15 MB. Please choose a smaller one.');
      return;
    }
    try {
      const blob = await preparePhoto(file);
      setChoice({ kind: 'photo', blob, preview: URL.createObjectURL(blob) });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That picture could not be read.');
    }
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    if (n.length < 2 || n.length > 100) {
      setNameError('Your name must be between 2 and 100 characters.');
      return;
    }
    setNameError('');
    setBusy(true);
    setError('');
    try {
      let kind: 'preset' | 'upload' | null = null;
      let preset: string | null = null;
      let path: string | null = null;
      if (choice.kind === 'preset') {
        kind = 'preset';
        preset = choice.id;
      } else if (choice.kind === 'upload') {
        kind = 'upload';
        path = choice.path;
      } else if (choice.kind === 'photo') {
        // a fresh name each time, so no one sees an old cached copy
        path = `${profile.id}/avatar-${Date.now().toString(36)}.${choice.blob.type === 'image/webp' ? 'webp' : 'jpg'}`;
        const up = await supabase.storage.from('avatars').upload(path, choice.blob, {
          contentType: choice.blob.type,
          upsert: false,
        });
        if (up.error) throw new Error(up.error.message);
        kind = 'upload';
      }
      const { error: err } = await supabase.rpc('update_my_profile', {
        new_full_name: n,
        new_avatar_kind: kind,
        new_avatar_preset: preset,
        new_avatar_path: path,
      });
      if (err) {
        if (choice.kind === 'photo' && path) await supabase.storage.from('avatars').remove([path]);
        throw new Error(err.message);
      }
      // the previous photo is no longer used
      if (profile.avatar_kind === 'upload' && profile.avatar_path && profile.avatar_path !== path) await supabase.storage.from('avatars').remove([profile.avatar_path]);
      await refresh();
      onClose();
    } catch (e2) {
      setError(friendly(e2 instanceof Error ? e2.message : ''));
    } finally {
      setBusy(false);
    }
  };

  const shown =
    choice.kind === 'photo' ? (
      <img className="user-photo" src={choice.preview} width={96} height={96} alt="Your new photo" />
    ) : choice.kind === 'upload' && current ? (
      <img className="user-photo" src={current} width={96} height={96} alt="Your photo" />
    ) : (
      <AvatarArt id={choice.kind === 'preset' ? choice.id : null} size={96} title="Your picture" />
    );

  return (
    <dialog ref={ref} className="profile-dialog" aria-labelledby={titleId} onClose={onClose}>
      <form onSubmit={save} noValidate>
        <h2 id={titleId} className="profile-dialog__title">
          Edit profile
        </h2>

        <div className="profile-dialog__pic">
          {shown}
          <div className="profile-dialog__pic-actions">
            <button type="button" className="auth-btn auth-btn--quiet" onClick={() => fileRef.current?.click()} disabled={busy}>
              Upload a photo
            </button>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" hidden onChange={(e) => pick(e.target.files?.[0])} />
            <p className="auth-field__hint">A square from the middle of your photo is kept, made small. Only you and the administrators can see it.</p>
          </div>
        </div>

        <fieldset className="avatar-grid">
          <legend>Or choose an illustration</legend>
          {AVATARS.map((a) => (
            <label key={a.id} className={`avatar-grid__item${choice.kind === 'preset' && choice.id === a.id ? ' is-on' : ''}`}>
              <input type="radio" name="avatar" value={a.id} checked={choice.kind === 'preset' && choice.id === a.id} onChange={() => setChoice({ kind: 'preset', id: a.id })} />
              <AvatarArt id={a.id} size={60} />
              <span className="visually-hidden">{a.name}</span>
            </label>
          ))}
        </fieldset>

        <div className={`auth-field${nameError ? ' has-error' : ''}`}>
          <label htmlFor={nameId}>Full name</label>
          <input
            id={nameId}
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            autoComplete="name"
            dir="auto"
            aria-invalid={Boolean(nameError)}
            aria-describedby={nameError ? `${nameId}-e` : undefined}
          />
          {nameError && (
            <p className="auth-field__error" id={`${nameId}-e`}>
              {nameError}
            </p>
          )}
        </div>

        {error && (
          <p className="auth-message auth-message--error" role="alert">
            {error}
          </p>
        )}
        <div className="auth-actions">
          <button type="submit" className="auth-btn" disabled={busy}>
            {busy ? 'Saving…' : 'Save profile'}
          </button>
          <button type="button" className="auth-btn auth-btn--quiet" onClick={onClose} disabled={busy}>
            Cancel
          </button>
        </div>
      </form>
    </dialog>
  );
}

/* ───────────────────────── this week ───────────────────────── */

/**
 * The last seven days, one column each: questions worked on that day (the same count as the
 * streak: marked or noted, each question once) and the minutes of study sessions begun that day.
 */
function WeekActivity({ st }: { st: StudyState }) {
  const days = useMemo(() => {
    const out: Array<{ day: string; label: string; questions: number; minutes: number; today: boolean }> = [];
    const today = localDay();
    for (let i = 6; i >= 0; i--) {
      const at = new Date();
      at.setDate(at.getDate() - i);
      const day = localDay(at.getTime());
      const minutes = Math.round(
        st.sessions.filter((x) => localDay(x.startedAt) === day).reduce((m, x) => m + Math.min(x.lastAt - x.startedAt, 4 * 3600e3), 0) / 60000,
      );
      out.push({ day, label: at.toLocaleDateString(undefined, { weekday: 'short' }), questions: st.days[day]?.length ?? 0, minutes, today: day === today });
    }
    return out;
  }, [st.days, st.sessions]);
  const top = Math.max(5, ...days.map((d) => d.questions));
  const total = days.reduce((n, d) => n + d.questions, 0);
  const mins = days.reduce((n, d) => n + d.minutes, 0);

  return (
    <figure className="week">
      <figcaption className="week__title">
        This week: {total} {total === 1 ? 'question' : 'questions'}
        {mins > 0 ? ` · ${mins >= 60 ? `${Math.floor(mins / 60)} h ${mins % 60} min` : `${mins} min`} of study` : ''}
      </figcaption>
      <ol className="week__days">
        {days.map((d) => (
          <li key={d.day} className={d.today ? 'is-today' : undefined}>
            <span className="week__count">{d.questions || ''}</span>
            <span className="week__bar" aria-hidden>
              <span style={{ height: `${(d.questions / top) * 100}%` }} />
            </span>
            <span className="week__day">{d.label}</span>
            <span className="visually-hidden">
              : {d.questions} {d.questions === 1 ? 'question' : 'questions'}
              {d.minutes ? `, ${d.minutes} minutes` : ''}
            </span>
          </li>
        ))}
      </ol>
    </figure>
  );
}
