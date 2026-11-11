import type { CSSProperties } from 'react';
import { Navigate, NavLink, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { allSpecialties, questionsOf, specialtyBySlug, type Specialty } from '../../content';
import { record, useStudy } from '../../study/store';
import { ApproachPage } from '../approach/ApproachPage';
import { NotFoundPage } from '../SystemPages';
import { TopicPage } from '../archive/TopicPage';
import { DashboardHome } from './DashboardHome';
import { MockOsce } from './MockOsce';
import { QuestionPage } from './QuestionPage';
import { StudyView, type ViewMode } from './StudyViews';
import './specialty.css';

/*
  One route tree for every specialty. /specialties/:slug picks the specialty from the registry and
  every page below it (dashboard, question, sidebar views, Mock OSCE) is the same component fed
  that specialty's data.
*/

const VIEWS: Array<{ path: ViewMode; label: string }> = [
  { path: 'continue', label: 'Continue studying' },
  { path: 'tracker', label: 'My tracker' },
  { path: 'bookmarks', label: 'Bookmarks' },
  { path: 'weak', label: 'Weak areas' },
  { path: 'notes', label: 'My notes' },
  { path: 'revision', label: 'Revision queue' },
];

function Sidebar({ sp }: { sp: Specialty }) {
  const st = useStudy();
  const keys = questionsOf(sp).map((q) => q.key);
  const count = {
    bookmarks: keys.filter((k) => record(st, k).bookmarked).length,
    notes: keys.filter((k) => record(st, k).note.trim()).length,
    revision: keys.filter((k) => record(st, k).status === 'needs-revision').length,
    recent: st.recent.filter((r) => r.key.startsWith(`${sp.id}/`)).length,
  } as Partial<Record<ViewMode, number>>;
  const base = `/specialties/${sp.slug}`;

  return (
    <nav className="index" aria-label={`${sp.title} study index`}>
      <p className="index__head">
        <span className="index__vol">Vol. {sp.volume}</span> Study index
      </p>
      <ul className="index__list">
        <li>
          <NavLink end to={base}>
            Overview
          </NavLink>
        </li>
        {VIEWS.map((v) => (
          <li key={v.path}>
            <NavLink to={`${base}/${v.path}`}>
              {v.label}
              {count[v.path] ? <span className="index__count">{count[v.path]}</span> : null}
            </NavLink>
          </li>
        ))}
        <li>
          <NavLink to={`${base}/mock`}>Mock OSCE</NavLink>
        </li>
        <li>
          <NavLink to={`${base}/recent`}>
            Recently viewed
            {count.recent ? <span className="index__count">{count.recent}</span> : null}
          </NavLink>
        </li>
      </ul>

      <p className="index__head index__head--sub">The library</p>
      <ul className="index__list index__list--vols">
        {allSpecialties().map((o) => (
          <li key={o.id}>
            <NavLink to={`/specialties/${o.slug}`} className={o.id === sp.id ? 'is-here' : undefined} style={{ '--vol-accent': o.ink } as CSSProperties}>
              <span className="index__volnum">{o.volume}</span>
              {o.title}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function SpecialtyRoutes() {
  const { slug } = useParams();
  const sp = specialtyBySlug(slug);
  if (!sp) return <NotFoundPage />;

  return (
    <Routes>
      {/* topics fill the page in their own illustrated style, without the study index */}
      <Route path="topics/:topicId" element={<main id="main"><TopicPage sp={sp} /></main>} />
      {/* the old doctor addresses still work: they lead to the same topic, or to the subject board */}
      <Route path="doctors/:doctorId/topics/:topicId" element={<OldTopicLink sp={sp} />} />
      <Route path="doctors/:doctorId" element={<Navigate to={`/specialties/${sp.slug}?tab=subjects`} replace />} />
      <Route path="approaches/:approachId" element={<main id="main"><ApproachPage sp={sp} /></main>} />
      <Route path="*" element={<StudyLayout sp={sp} />} />
    </Routes>
  );
}

/** /doctors/:doctorId/topics/:topicId → /topics/:topicId, keeping a search highlight and a #q- jump. */
function OldTopicLink({ sp }: { sp: Specialty }) {
  const { topicId = '' } = useParams();
  const { search, hash } = useLocation();
  return <Navigate to={`/specialties/${sp.slug}/topics/${topicId}${search}${hash}`} replace />;
}

function StudyLayout({ sp }: { sp: Specialty }) {
  return (
    <div className="archive" style={{ '--accent': sp.accent, '--accent-soft': sp.accentSoft, '--on-accent': sp.onAccent, '--accent-ink': sp.ink } as CSSProperties} data-specialty={sp.id}>
      <div className="archive__grid container">
        <Sidebar sp={sp} />
        <main id="main" className="archive__main">
          <Routes>
            <Route index element={<DashboardHome sp={sp} />} />
            <Route path="questions/:qid" element={<QuestionPage sp={sp} />} />
            <Route path="mock" element={<MockOsce sp={sp} />} />
            {(['continue', 'tracker', 'bookmarks', 'weak', 'notes', 'revision', 'recent'] as ViewMode[]).map((m) => (
              <Route key={m} path={m} element={<StudyView sp={sp} mode={m} />} />
            ))}
            <Route path="*" element={<Navigate to={`/specialties/${sp.slug}`} replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
