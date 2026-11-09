import { GazetteBoard } from '../components/board/GazetteBoard';
import { PixelBoard } from '../components/board/PixelBoard';
import type { BoardData } from '../components/board/types';
import './board-preview.css';

/*
  DEVELOPMENT PREVIEW ONLY (route /_preview/board, never in the built site).
  The same placeholder items in both board styles, at the homepage slot width and wide,
  so the two can be compared side by side. Every item says "placeholder" on purpose.
*/

const day = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

const SAMPLE: BoardData = {
  notices: [
    { id: 'n1', title: 'Placeholder notice', body: 'A short announcement you write in Supabase.', date: day(0), pinned: true },
    { id: 'n2', title: 'Second placeholder notice', body: 'Notices appear newest first.', date: day(3) },
  ],
  recent: [
    { id: 'r1', kind: 'question', title: 'Placeholder station title', specialty: 'Surgery', date: day(1) },
    { id: 'r2', kind: 'doctor', title: 'Placeholder examiner', specialty: 'Medicine', date: day(2) },
    { id: 'r3', kind: 'topic', title: 'Placeholder topic', specialty: 'Paediatrics', date: day(9) },
  ],
};

export function BoardPreview() {
  return (
    <main id="main" className="bp">
      <h1 className="bp-title">Noticeboard: two styles</h1>
      <p className="bp-lead">Same placeholder content in both. Left: the width it gets on the homepage. Right: wide, as on a tablet.</p>

      <section className="bp-row" aria-label="Vintage gazette">
        <h2 className="bp-name">A · Vintage gazette</h2>
        <div className="bp-frames">
          <div className="bp-slot">
            <GazetteBoard {...SAMPLE} />
          </div>
          <div className="bp-wide">
            <GazetteBoard {...SAMPLE} />
          </div>
        </div>
      </section>

      <section className="bp-row" aria-label="Pixel art">
        <h2 className="bp-name">B · Pixel art</h2>
        <div className="bp-frames">
          <div className="bp-slot">
            <PixelBoard {...SAMPLE} />
          </div>
          <div className="bp-wide">
            <PixelBoard {...SAMPLE} />
          </div>
        </div>
      </section>
    </main>
  );
}
