import { lazy, Suspense, useEffect } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import type { Specialty } from '../../content';
import { useApproach } from '../../content/approaches';
import { PALETTES } from '../archive/palettes';
import { ArchiveRoom } from '../archive/shared';
import { StudySheet } from '../archive/StudySheet';
import './approach.css';

/*
  One clinical approach, read or practised. The switch at the top chooses between the written
  approach (a study sheet) and the case game; the choice is remembered for next time.
*/

const CaseGame = lazy(() => import('../game/CaseGame').then((m) => ({ default: m.CaseGame })));

type Mode = 'read' | 'practise';
const KEY = 'cr.approach.mode';

function remembered(): Mode {
  try {
    return localStorage.getItem(KEY) === 'practise' ? 'practise' : 'read';
  } catch {
    return 'read';
  }
}

const sage = PALETTES.find((p) => p.id === 'olive') ?? PALETTES[0];

export function ApproachPage({ sp }: { sp: Specialty }) {
  const { approachId = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const loaded = useApproach(sp.id, approachId);
  const a = loaded.data;
  const mode: Mode = params.get('mode') === 'practise' ? 'practise' : params.get('mode') === 'read' ? 'read' : remembered();

  useEffect(() => {
    try {
      localStorage.setItem(KEY, mode);
    } catch {
      /* private window: the choice just isn't remembered */
    }
  }, [mode]);

  const choose = (m: Mode) => {
    const next = new URLSearchParams(params);
    next.set('mode', m);
    setParams(next, { replace: true });
  };

  if (loaded.data === undefined) {
    return (
      <ArchiveRoom palette={sage}>
        <div className="da-wrap">
          <p className="ap__loading">Opening the approach…</p>
        </div>
      </ArchiveRoom>
    );
  }

  if (!a) {
    return (
      <ArchiveRoom palette={sage}>
        <div className="da-wrap">
          <div className="da-card da-missing">
            <h1 className="da-h1">{loaded.error ? 'This approach couldn’t be loaded' : 'This approach isn’t open to you'}</h1>
            <p>{loaded.error ? 'Check your connection and reload the page.' : 'It may not be published yet, or it may be for approved students only.'}</p>
            <p>
              <Link to={`/specialties/${sp.slug}?tab=approaches`}>Back to {sp.title} approaches</Link>
            </p>
          </div>
        </div>
      </ArchiveRoom>
    );
  }

  return (
    <ArchiveRoom className={`ap ap--${mode}`} palette={sage}>
      <div className="da-wrap ap__wrap">
        <nav className="da-crumbs" aria-label="Breadcrumb">
          <Link to={`/specialties/${sp.slug}?tab=approaches`}>← {sp.title} approaches</Link>
        </nav>

        <header className="ap__head">
          <div>
            <p className="da-kicker">Clinical approach · {sp.title}</p>
            <h1 className="da-h1">
              {a.title}
              {a.draft && <span className="ap__draft">Draft</span>}
            </h1>
          </div>
          <div className="ap__switch" role="radiogroup" aria-label="How to study this approach">
            {(
              [
                ['read', 'Read the approach'],
                ['practise', 'Practise a case'],
              ] as Array<[Mode, string]>
            ).map(([m, label]) => (
              <button key={m} type="button" role="radio" aria-checked={mode === m} className="ap__opt" onClick={() => choose(m)}>
                {label}
              </button>
            ))}
          </div>
        </header>

        {mode === 'read' ? (
          <article className="da-q__answer da-q__answer--sheet ap__sheet">
            <StudySheet text={a.sheet} title={a.title} />
          </article>
        ) : a.cases.length ? (
          <Suspense fallback={<p className="ap__loading">Opening the ward…</p>}>
            <CaseGame specialtyId={sp.id} caseId={a.cases[0].id} onRead={() => choose('read')} />
          </Suspense>
        ) : (
          <p className="ap__loading">No case to practise for this approach yet.</p>
        )}
      </div>
    </ArchiveRoom>
  );
}
