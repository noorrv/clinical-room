import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { TYPE_LABEL } from '../content';
import { maskNames } from '../content/remote';
import type { Question } from '../content/types';
import { record, study, useStudy, type FlashFilters, type FlashSession as Session } from '../study/store';
import { ArchiveRoom } from '../pages/archive/shared';
import { StudySheet } from '../pages/archive/StudySheet';
import { FinalsMark, isFinals } from '../pages/archive/FinalsMark';
import { ANSWER_ORDER, GIVEN } from '../pages/specialty/QuestionPage';
import { Ribbon } from '../pages/specialty/ui';
import { themePalette, type ApproachTheme } from '../pages/approach/palettes';
import type { Placed } from '../pages/profile/library';
import { buildQueue, deck, filtersFrom, sameFilters, splitFollowUps } from './deck';
import { preview, rate, RATE_WORD, spanWord, type Rate } from './scheduler';
import './flashcards.css';

/*
  A flashcard session: one card at a time, as a study card on parchment. The front shows the
  examiner's question; turning it over shows the full recorded answer, exactly as on the topic
  pages, with the examiner follow-ups folded away until asked for. Only a rating after the
  answer was revealed is recorded: skipping moves a card to the end and records nothing.

  The session (its cards, place, what was rated and skipped) is saved after every step, so it can
  be closed and resumed on any device.
*/

/** The flashcards' own look: parchment, muted navy ink and antique gold. */
const FLASH_THEME: ApproachTheme = {
  id: 'flashcards',
  name: 'Study cards',
  ground: '#e9e0cb',
  pattern: '#d8c9a4',
  paper: '#fbf6ea',
  ink: '#1f2a3d',
  heading: '#22344f',
  muted: '#5b6273',
  accent: '#9a7a33',
  danger: '#7d2e35',
  info: '#22344f',
  mech: '#7f5b57',
  caution: '#94600f',
  calm: '#5b6f4c',
};
export const PALETTE = themePalette(FLASH_THEME);

const LEVEL = { 1: 'Easy', 2: 'Moderate', 3: 'Difficult' } as const;
const RATE_HINT: Record<Rate, string> = { 1: 'I couldn’t remember it', 2: 'I remembered it, with a struggle', 3: 'I remembered it with some effort', 4: 'I remembered it confidently' };
const unnumbered = (title: string) => title.replace(/^\s*(?:Q\s*)?\d+\s*[.)]\s+/i, '');
const filled = (q: Question, k: keyof Question) => {
  const v = q[k];
  return Array.isArray(v) ? v.length > 0 : typeof v === 'string' ? v.trim() !== '' : false;
};
const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export function describe(f: FlashFilters, byKey: Map<string, Placed>): string {
  const parts: string[] = [];
  const any = [...byKey.values()];
  if (f.topic) parts.push(any.find((p) => `${p.sp.id}/${p.topicId}` === f.topic)?.topicName ?? 'One topic');
  else if (f.subject) parts.push(any.find((p) => p.subjectId === f.subject)?.subjectName ?? 'One subject');
  else if (f.specialty) parts.push(any.find((p) => p.sp.id === f.specialty)?.sp.title ?? 'One specialty');
  else parts.push('Every specialty');
  if (f.bookmarked) parts.push('bookmarked');
  if (f.status && f.status !== 'all') parts.push({ due: 'due', new: 'new', learning: 'learning', difficult: 'difficult', mastered: 'mastered' }[f.status]);
  return parts.join(' · ');
}

export function FlashSession() {
  const st = useStudy();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const all = useMemo(() => deck(), []);
  const byKey = useMemo(() => new Map(all.map((p) => [p.q.key, p])), [all]);
  const open = st.fcSession && !('closed' in st.fcSession) ? st.fcSession : null;
  const asked = useMemo(() => filtersFrom(params), [params]);
  const limit = Math.max(1, Math.min(200, Number(params.get('limit')) || 20));

  // a different session was asked for while one is open: let the student choose
  const conflict = Boolean(open && asked && !sameFilters(open.filters, asked) && open.rated.length < open.queue.length);

  const start = useCallback(
    (f: FlashFilters) => {
      const queue = buildQueue(all, f, st, limit);
      const s: Session = { id: uid(), filters: f, queue, pos: 0, rated: [], skipped: [], startedAt: Date.now(), at: Date.now() };
      study.saveFlashSession(s);
      // the address no longer needs to say what to start
      navigate('/flashcards/session', { replace: true });
    },
    [all, st, limit, navigate],
  );

  // asked for a session and none is open (or the open one is for the same cards): start or resume
  useEffect(() => {
    if (!asked) return;
    if (!open || open.rated.length >= open.queue.length) start(asked);
    else if (sameFilters(open.filters, asked)) navigate('/flashcards/session', { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asked]);

  if (conflict && open && asked) {
    return (
      <ArchiveRoom className="da--plain fc-room" palette={PALETTE}>
        <div className="fc-wrap">
          <div className="fc-note">
            <h1 className="fc-note__title">You have a session in progress</h1>
            <p>
              {describe(open.filters, byKey)}: {open.rated.length} of {open.queue.length} cards rated.
            </p>
            <div className="fc-note__actions">
              <button type="button" className="fc-btn fc-btn--solid" onClick={() => navigate('/flashcards/session', { replace: true })}>
                Resume that session
              </button>
              <button type="button" className="fc-btn" onClick={() => start(asked)}>
                Start {describe(asked, byKey)} instead
              </button>
            </div>
          </div>
        </div>
      </ArchiveRoom>
    );
  }

  if (!open) {
    return (
      <ArchiveRoom className="da--plain fc-room" palette={PALETTE}>
        <div className="fc-wrap">
          <div className="fc-note">
            <h1 className="fc-note__title">No session open</h1>
            <p>Start one from the flashcards page, or from any topic with its Flashcards switch.</p>
            <div className="fc-note__actions">
              <Link className="fc-btn fc-btn--solid" to="/flashcards">
                Go to flashcards
              </Link>
            </div>
          </div>
        </div>
      </ArchiveRoom>
    );
  }

  return <Deck session={open} byKey={byKey} label={describe(open.filters, byKey)} />;
}

/* ───────────────────────── the session ───────────────────────── */

function Deck({ session, byKey, label }: { session: Session; byKey: Map<string, Placed>; label: string }) {
  const st = useStudy();
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  // cards that no longer exist (unpublished since) drop out of the session quietly
  const queue = session.queue.filter((k) => byKey.has(k));
  const pos = Math.min(session.pos, queue.length);
  const key = queue[pos];
  const p = key ? byKey.get(key)! : null;
  const ratedHere = new Set(session.rated);
  const [revealed, setRevealed] = useState(false);
  const [shownAt, setShownAt] = useState(() => Date.now());
  const cardRef = useRef<HTMLDivElement>(null);

  // a new card starts face up, its question showing
  useEffect(() => {
    setRevealed(false);
    setShownAt(Date.now());
  }, [key]);

  const save = (patch: Partial<Session>) => study.saveFlashSession({ ...session, queue, ...patch });
  const go = (to: number) => save({ pos: Math.max(0, Math.min(queue.length, to)) });

  const onRate = (r: Rate) => {
    if (!key || !revealed || ratedHere.has(key)) return;
    const now = Date.now();
    const { card, log } = rate(key, st.cards?.[key], r, now, now - shownAt);
    study.rateCard(key, card, log);
    // on to the next card not yet rated in this session
    const rated = [...session.rated, key];
    let next = pos + 1;
    while (next < queue.length && rated.includes(queue[next])) next++;
    save({ rated, pos: next });
  };

  const onSkip = () => {
    if (!key) return;
    // to the back of the deck; nothing is recorded
    const rest = queue.filter((k) => k !== key);
    save({ queue: [...rest, key], skipped: session.skipped.includes(key) ? session.skipped : [...session.skipped, key], pos: Math.min(pos, rest.length) });
  };

  const close = () => {
    study.saveFlashSession(null);
    navigate('/flashcards');
  };

  // keys: space or enter turns the card, 1–4 rate, arrows move, S skips
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('input, textarea, select, [contenteditable]') || e.metaKey || e.ctrlKey || e.altKey) return;
      if ((e.key === ' ' || e.key === 'Enter') && !revealed && key && !t.closest('button, a')) {
        e.preventDefault();
        setRevealed(true);
      } else if (revealed && ['1', '2', '3', '4'].includes(e.key)) onRate(Number(e.key) as Rate);
      else if (e.key === 'ArrowRight') go(pos + 1);
      else if (e.key === 'ArrowLeft') go(pos - 1);
      else if (e.key.toLowerCase() === 's') onSkip();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const done = session.rated.filter((k) => byKey.has(k)).length;
  const finished = queue.length > 0 && (pos >= queue.length || queue.every((k) => ratedHere.has(k)));

  return (
    <ArchiveRoom className="da--plain fc-room" palette={PALETTE}>
      <div className="fc-wrap">
        <header className="fc-top">
          <Link className="fc-exit" to="/flashcards">
            ← Leave session
          </Link>
          <p className="fc-top__label">{label}</p>
          <p className="fc-top__count" aria-live="polite">
            {finished ? `All ${queue.length} done` : `Card ${pos + 1} of ${queue.length}`} · {done} rated
          </p>
          <span className="fc-progress" role="progressbar" aria-label="Cards rated" aria-valuemin={0} aria-valuemax={queue.length} aria-valuenow={done}>
            <span style={{ width: `${queue.length ? (done / queue.length) * 100 : 0}%` }} />
          </span>
        </header>

        {queue.length === 0 ? (
          <div className="fc-note">
            <h1 className="fc-note__title">No cards to study</h1>
            <p>Nothing matches this session right now. Choose other cards on the flashcards page.</p>
            <div className="fc-note__actions">
              <button type="button" className="fc-btn fc-btn--solid" onClick={close}>
                Choose other cards
              </button>
            </div>
          </div>
        ) : finished ? (
          <Summary session={session} queue={queue} onClose={close} onBack={() => go(Math.max(0, queue.findIndex((k) => !ratedHere.has(k))))} />
        ) : p ? (
          <>
            <div className="fc-stage" ref={cardRef} style={{ perspective: 1600 } as CSSProperties}>
              <AnimatePresence mode="wait" initial={false}>
                <motion.article
                  key={`${key}-${revealed ? 'back' : 'front'}`}
                  className={`fc-card${revealed ? ' fc-card--back' : ''}`}
                  initial={reduce ? { opacity: 0 } : { rotateY: revealed ? -90 : 90, opacity: 0.6 }}
                  animate={reduce ? { opacity: 1 } : { rotateY: 0, opacity: 1 }}
                  exit={reduce ? { opacity: 0 } : { rotateY: revealed ? 90 : -90, opacity: 0.6 }}
                  transition={{ duration: reduce ? 0.15 : 0.22, ease: [0.33, 1, 0.68, 1] }}
                  aria-label={revealed ? 'Answer' : 'Question'}
                >
                  <CardHead p={p} bookmarked={record(st, p.q.key).bookmarked} />
                  {revealed ? <Back p={p} /> : <Front p={p} onReveal={() => setRevealed(true)} />}
                </motion.article>
              </AnimatePresence>
            </div>

            {revealed && !ratedHere.has(p.q.key) && <Ratings cardKey={p.q.key} onRate={onRate} />}
            {ratedHere.has(p.q.key) && <p className="fc-rated">Rated in this session. Move on, or go back to the cards you skipped.</p>}

            <nav className="fc-nav" aria-label="Session">
              <button type="button" className="fc-btn" onClick={() => go(pos - 1)} disabled={pos === 0}>
                ← Previous
              </button>
              <button type="button" className="fc-btn" onClick={onSkip} disabled={ratedHere.has(p.q.key) || queue.length < 2}>
                Skip for now
              </button>
              <button type="button" className="fc-btn" onClick={() => go(pos + 1)}>
                Next →
              </button>
            </nav>
          </>
        ) : null}
      </div>
    </ArchiveRoom>
  );
}

function CardHead({ p, bookmarked }: { p: Placed; bookmarked: boolean }) {
  return (
    <div className="fc-card__head">
      <p className="fc-card__where">
        {p.sp.title}
        {p.subjectName ? ` · ${p.subjectName}` : ''} · {p.topicName}
      </p>
      <div className="fc-card__tags">
        <span className="fc-tag">{TYPE_LABEL[p.q.type]}</span>
        {p.q.difficulty && <span className={`fc-tag fc-tag--lv${p.q.difficulty}`}>{LEVEL[p.q.difficulty]} question</span>}
        <button type="button" className="fc-mark" aria-pressed={bookmarked} onClick={() => study.toggleBookmark(p.q.key)}>
          <Ribbon filled={bookmarked} /> <span className="visually-hidden">{bookmarked ? 'Remove bookmark' : 'Bookmark'}</span>
        </button>
      </div>
    </div>
  );
}

function Front({ p, onReveal }: { p: Placed; onReveal: () => void }) {
  const given = GIVEN.filter((s) => filled(p.q, s.key));
  return (
    <div className="fc-card__body">
      {isFinals(p.q) && (
        <p className="fc-card__finals">
          <FinalsMark />
        </p>
      )}
      <h1 className="fc-card__q">
        <bdi>{unnumbered(p.q.title)}</bdi>
      </h1>
      {given.map((s) => (
        <section key={s.key} className="da-q__section">
          <h2 className="da-q__h">{s.label}</h2>
          <p className="da-text">{String(p.q[s.key])}</p>
        </section>
      ))}
      <button type="button" className="fc-btn fc-btn--solid fc-reveal" onClick={onReveal}>
        Turn over for the answer
      </button>
      <p className="fc-keyhint">or press Space</p>
    </div>
  );
}

function Back({ p }: { p: Placed }) {
  const q = p.q;
  const answer = ANSWER_ORDER[q.type].filter((s) => filled(q, s.key));
  const split = useMemo(() => (q.modelAnswer ? splitFollowUps(q.modelAnswer) : { main: '', followUps: [] }), [q.modelAnswer]);
  const [showFollow, setShowFollow] = useState(false);

  return (
    <div className="fc-card__body">
      <h1 className="fc-card__q fc-card__q--small">
        <bdi>{unnumbered(q.title)}</bdi>
      </h1>
      {answer.length === 0 ? (
        <p className="da-quiet">The answer for this question hasn’t been added yet.</p>
      ) : (
        <div className="da-q__answer da-q__answer--sheet fc-answer">
          {answer.map((s) => (
            <section key={s.key} className="da-q__section">
              {!(s.key === 'modelAnswer' && answer.length === 1) && <h2 className="da-q__h">{s.label}</h2>}
              {s.key === 'modelAnswer' ? (
                split.main ? <StudySheet text={split.main} selfId={q.id} title={q.title} /> : null
              ) : Array.isArray(q[s.key]) ? (
                <ul className={`da-list${s.key === 'steps' ? ' da-list--ordered' : ''}`}>
                  {(q[s.key] as string[]).map((v, i) => (
                    <li key={i}>{v}</li>
                  ))}
                </ul>
              ) : (
                <p className="da-text">{String(q[s.key])}</p>
              )}
            </section>
          ))}
        </div>
      )}

      {split.followUps.length > 0 && (
        <div className="fc-follow">
          <button type="button" className="fc-btn" aria-expanded={showFollow} onClick={() => setShowFollow((v) => !v)}>
            {showFollow ? 'Hide' : 'Show'} the examiner’s follow-up {split.followUps.length === 1 ? 'question' : `questions (${split.followUps.length})`}
          </button>
          {showFollow && (
            <div className="da-q__answer da-q__answer--sheet fc-answer">
              <StudySheet text={split.followUps.join('\n\n')} selfId={`${q.id}-follow`} title={q.title} />
            </div>
          )}
        </div>
      )}

      {q.source && <p className="fc-source">Source: {maskNames(q.source)}</p>}
    </div>
  );
}

function Ratings({ cardKey, onRate }: { cardKey: string; onRate: (r: Rate) => void }) {
  const st = useStudy();
  const next = useMemo(() => preview(cardKey, st.cards?.[cardKey]), [cardKey, st.cards]);
  return (
    <div className="fc-rate" role="group" aria-label="How well did you remember it?">
      <p className="fc-rate__ask">How well did you remember it?</p>
      <div className="fc-rate__row">
        {([1, 2, 3, 4] as Rate[]).map((r) => (
          <button key={r} type="button" className={`fc-rate__btn fc-rate__btn--${r}`} onClick={() => onRate(r)} aria-keyshortcuts={String(r)}>
            <span className="fc-rate__word">{RATE_WORD[r]}</span>
            <span className="fc-rate__when">{spanWord(next[r])}</span>
            <span className="fc-rate__hint">{RATE_HINT[r]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Summary({ session, queue, onClose, onBack }: { session: Session; queue: string[]; onClose: () => void; onBack: () => void }) {
  const st = useStudy();
  const logs = (st.reviews ?? []).filter((r) => r.at >= session.startedAt && session.rated.includes(r.key));
  const counts = ([1, 2, 3, 4] as Rate[]).map((r) => [r, logs.filter((l) => l.rating === r).length] as const);
  const unrated = queue.filter((k) => !session.rated.includes(k)).length;
  return (
    <div className="fc-note">
      <h1 className="fc-note__title">{unrated ? 'End of the deck' : 'Session complete'}</h1>
      <p>
        {session.rated.length} {session.rated.length === 1 ? 'card' : 'cards'} rated
        {unrated ? `, ${unrated} not rated (skipped or passed over)` : ''}.
      </p>
      {logs.length > 0 && (
        <ul className="fc-tally">
          {counts.map(([r, n]) => (
            <li key={r} className={`fc-tally__item fc-rate__btn--${r}`}>
              <span>{RATE_WORD[r]}</span> <strong>{n}</strong>
            </li>
          ))}
        </ul>
      )}
      <div className="fc-note__actions">
        <button type="button" className="fc-btn fc-btn--solid" onClick={onClose}>
          Finish session
        </button>
        {unrated > 0 && (
          <button type="button" className="fc-btn" onClick={onBack}>
            Back to the cards
          </button>
        )}
      </div>
    </div>
  );
}
