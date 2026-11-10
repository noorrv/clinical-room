import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { useStudy } from '../study/store';
import { computeStreak, type DayState, type StreakInfo } from '../study/streak';
import { LilyPlant, MiniLily } from './art/Lily';
import {
} from '../data/homepage';
import { formatClock, spokenDuration, useStudyTimer } from '../hooks/useStudyTimer';
import { LanternBooks } from './art/WidgetArt';
import { Pause, Play, Sparkle, Stop } from './Icons';
import './Dashboard.css';

/* Gilt corner flourish for the burgundy card */
function Flourish({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 60 60" aria-hidden>
      <path d="M4 56 V22 Q4 4 22 4 H56" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <path d="M10 56 V26 Q10 10 26 10 H56" fill="none" stroke="currentColor" strokeWidth="0.8" opacity="0.6" />
      <path d="M16 16 q8 -2 10 6 q-8 2 -10 -6z M16 16 q-2 8 6 10 q2 -8 -6 -10z" fill="currentColor" opacity="0.8" />
    </svg>
  );
}

export function StudyTrackerCard() {
  const { status, elapsed, start, pause, resume, stop } = useStudyTimer();
  const [hh, mm, ss] = formatClock(elapsed);
  const [announcement, setAnnouncement] = useState('');
  const lastStatus = useRef(status);

  useEffect(() => {
    if (lastStatus.current === status) return;
    const prev = lastStatus.current;
    lastStatus.current = status;
    if (status === 'running') setAnnouncement(prev === 'paused' ? 'Timer resumed.' : 'Timer started.');
    else if (status === 'paused') setAnnouncement(`Timer paused at ${spokenDuration(elapsed)}.`);
    else setAnnouncement('Timer stopped and reset.');
    // elapsed intentionally read at the moment of the status change only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const statusLine =
    status === 'running' ? 'Studying — keep going' : status === 'paused' ? 'Paused' : 'Ready when you are';

  return (
    <section className="tracker card-dark" id="study-tracker" aria-labelledby="tracker-title" data-status={status}>
      <Flourish className="tracker__flourish tracker__flourish--tl" />
      <Flourish className="tracker__flourish tracker__flourish--br" />
      <div className="tracker__art">
        <LanternBooks />
      </div>
      <div className="tracker__main">
        <h2 id="tracker-title" className="tracker__title">
          Study Tracker
        </h2>
        <p className="tracker__clock" role="timer" aria-label={`Elapsed study time: ${spokenDuration(elapsed)}`}>
          <span>{hh}</span>
          <span className="tracker__colon" aria-hidden>
            :
          </span>
          <span>{mm}</span>
          <span className="tracker__colon" aria-hidden>
            :
          </span>
          <span>{ss}</span>
        </p>
        <p className="tracker__status">{statusLine}</p>
        <div className="tracker__controls">
          {status === 'running' ? (
            <button type="button" className="ring-btn" onClick={pause} aria-label="Pause timer">
              <Pause size={22} />
            </button>
          ) : (
            <button
              type="button"
              className="ring-btn ring-btn--primary"
              onClick={status === 'paused' ? resume : start}
              aria-label={status === 'paused' ? 'Resume timer' : 'Start timer'}
            >
              <Play size={22} />
            </button>
          )}
          <button type="button" className="ring-btn" onClick={stop} disabled={status === 'idle'} aria-label="Stop and reset timer">
            <Stop size={20} />
          </button>
        </div>
        <p className="visually-hidden" aria-live="polite">
          {announcement}
        </p>
      </div>
      <Sparkle className="tracker__spark" size={22} />
    </section>
  );
}


const DAY_WORD: Record<DayState, string> = {
  met: 'goal met',
  forgiven: 'missed, forgiven',
  missed: 'missed',
  today: 'today, in progress',
  future: 'still to come',
  before: 'before you joined',
};

/** The streak: days in a row with 5 questions studied, and a lily that grows with today's work. */
export function StreakCard() {
  const { session, profile, isAdmin } = useAuth();
  const st = useStudy();
  const approved = Boolean(session) && (isAdmin || profile?.status === 'approved');
  const info = useMemo(() => computeStreak(st.days, profile?.created_at ?? null), [st.days, profile?.created_at]);

  if (!approved) {
    return (
      <section className="streak streak--invite" aria-labelledby="streak-title">
        <div className="streak__plant" aria-hidden>
          <LilyPlant stage={0} />
        </div>
        <div className="streak__text">
          <h2 id="streak-title" className="streak__title">
            Study streak
          </h2>
          <p className="streak__invite">Study five questions a day and watch a lily grow.</p>
          <Link className="streak__link" to={session ? '/account' : '/register'}>
            {session ? 'See your account' : 'Start your streak'}
          </Link>
        </div>
      </section>
    );
  }

  return <StreakView info={info} />;
}

/** The streak card's face, given the numbers (also used by the dev preview). */
export function StreakView({ info }: { info: StreakInfo }) {
  const stage = Math.min(info.today, 5) as 0 | 1 | 2 | 3 | 4 | 5;
  const wilted = info.today === 0 && info.yesterday === 'missed';
  const done = info.today >= info.goal;

  return (
    <section className="streak" aria-labelledby="streak-title">
      <div className="streak__plant" aria-hidden>
        <LilyPlant stage={stage} wilted={wilted} />
      </div>
      <div className="streak__text">
        <h2 id="streak-title" className="streak__title">
          Study streak
        </h2>
        <p className="streak__days">
          {info.current} <span>{info.current === 1 ? 'day' : 'days'}</span>
        </p>
        <p className="streak__today">
          <span className="streak__pips" aria-hidden>
            {Array.from({ length: info.goal }, (_, i) => (
              <i key={i} className={i < info.today ? 'is-on' : undefined} />
            ))}
          </span>
          {done ? 'Today’s five are done' : `${info.today} of ${info.goal} today`}
        </p>
        <p className="streak__best">Best: {info.best} {info.best === 1 ? 'day' : 'days'}</p>
      </div>
      <ol className="streak__week" aria-label="This week">
        {info.week.map((d) => (
          <li key={d.day} aria-label={`${new Date(d.day + 'T12:00').toLocaleDateString(undefined, { weekday: 'long' })}: ${DAY_WORD[d.state]}`}>
            <MiniLily state={d.state} />
            <span aria-hidden>{d.label}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

