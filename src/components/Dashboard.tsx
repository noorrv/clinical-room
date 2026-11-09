import { useEffect, useRef, useState } from 'react';
import {
  continueStudying,
  progressByRange,
  recentlyAdded,
  streakDays,
  upcomingExams,
  type ProgressRange,
} from '../data/homepage';
import { formatClock, spokenDuration, useStudyTimer } from '../hooks/useStudyTimer';
import { AnatomicalHeart, LanternBooks, SnowyVillage } from './art/WidgetArt';
import { ArrowRight, Calendar, ChevronDown, Document, Pause, Play, Sparkle, Stop } from './Icons';
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

export function ProgressCard() {
  const [range, setRange] = useState<ProgressRange>('week');
  const data = progressByRange[range];
  const pct = Math.round((data.done / data.goal) * 100);
  return (
    <section className="progress card-light" aria-labelledby="progress-title">
      <div className="card-head">
        <h2 id="progress-title" className="card-title">
          Your Progress
        </h2>
        <label className="select">
          <span className="visually-hidden">Time range</span>
          <select value={range} onChange={(e) => setRange(e.target.value as ProgressRange)}>
            {Object.entries(progressByRange).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
          <ChevronDown size={16} />
        </label>
      </div>
      <div className="progress__row">
        <p className="progress__pct">
          {pct}
          <span>%</span>
        </p>
        <div
          className="bar bar--lg"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          aria-label={`${data.label} study goal`}
        >
          <span style={{ width: `${pct}%` }} />
        </div>
      </div>
      <p className="progress__hours">
        {data.done} / {data.goal} hours
      </p>
      <Sparkle className="progress__spark progress__spark--a" size={22} />
      <Sparkle className="progress__spark progress__spark--b" size={12} />
    </section>
  );
}

export function StreakCard() {
  return (
    <section className="streak" aria-labelledby="streak-title">
      <div className="streak__art">
        <SnowyVillage />
      </div>
      <h2 id="streak-title" className="streak__title">
        Study Streak
      </h2>
      <p className="streak__days">
        {streakDays} <span>days</span>
      </p>
      <Calendar size={28} className="streak__icon" />
      <Sparkle className="streak__spark" size={18} />
    </section>
  );
}

export function ContinueStudyingCard() {
  const c = continueStudying;
  return (
    <section className="info card-light" aria-labelledby="continue-title">
      <div className="card-head">
        <h2 id="continue-title" className="card-title">
          Continue Studying
        </h2>
        <a className="head-link" href="#library" aria-label="See everything in progress">
          <ArrowRight size={22} />
        </a>
      </div>
      <div className="continue">
        <div className="continue__thumb">
          <AnatomicalHeart />
        </div>
        <div className="continue__body">
          <div className="continue__top">
            <div>
              <h3 className="continue__title">{c.title}</h3>
              <p className="continue__meta">{c.meta.join(' · ')}</p>
            </div>
            <a className="play-btn" href={c.href} aria-label={`Resume ${c.title}`}>
              <Play size={18} />
            </a>
          </div>
          <div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={c.total} aria-valuenow={c.done} aria-label={`${c.title} modules completed`}>
            <span style={{ width: `${(c.done / c.total) * 100}%` }} />
          </div>
          <p className="continue__count">
            {c.done} / {c.total} modules
          </p>
        </div>
      </div>
    </section>
  );
}

export function RecentlyAddedCard() {
  return (
    <section className="info card-light" aria-labelledby="recent-title">
      <div className="card-head">
        <h2 id="recent-title" className="card-title">
          Recently Added
        </h2>
        <a className="head-link" href="#library" aria-label="See all recently added">
          <ArrowRight size={22} />
        </a>
      </div>
      <ul className="doc-list">
        {recentlyAdded.map((d) => (
          <li key={d.title}>
            <a href={d.href}>
              <Document size={22} className="doc-list__icon" />
              <span className="doc-list__title">{d.title}</span>
              {d.isNew ? <span className="badge">New</span> : <ArrowRight size={18} className="doc-list__arrow" />}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function UpcomingExamsCard() {
  return (
    <section className="info card-light" aria-labelledby="exams-title">
      <div className="card-head">
        <h2 id="exams-title" className="card-title">
          Upcoming Exams
        </h2>
        <Calendar size={24} className="head-icon" />
      </div>
      <ul className="exam-list">
        {upcomingExams.map((e) => (
          <li key={e.title}>
            <span className={`exam-list__dot exam-list__dot--${e.tone}`} aria-hidden />
            <span className="exam-list__title">{e.title}</span>
            <span className="exam-list__days">{e.days} days</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
