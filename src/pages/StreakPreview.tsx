import { LilyPlant } from '../components/art/Lily';
import { StreakView } from '../components/Dashboard';
import { computeStreak } from '../study/streak';
import '../components/Dashboard.css';
import './board-preview.css';

/* DEVELOPMENT PREVIEW ONLY (route /_preview/streak): the lily's stages and the card in sample weeks. */

const five = ['a', 'b', 'c', 'd', 'e'];
const dayOffset = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const p = (x: number) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
const signup = new Date(Date.now() - 30 * 86_400_000).toISOString();

const SAMPLES: Array<[string, Record<string, string[]>]> = [
  ['Three days, 2 of 5 today', { [dayOffset(3)]: five, [dayOffset(2)]: five, [dayOffset(1)]: five, [dayOffset(0)]: ['a', 'b'] }],
  ['Today’s five done', { [dayOffset(2)]: five, [dayOffset(1)]: five, [dayOffset(0)]: five }],
  ['Missed yesterday (wilted)', { [dayOffset(4)]: five, [dayOffset(3)]: five, [dayOffset(2)]: [] }],
];

export function StreakPreview() {
  return (
    <main id="main" className="bp">
      <h1 className="bp-title">Study streak: lily and card</h1>
      <section className="bp-row">
        <h2 className="bp-name">Lily stages 0–5, then wilted</h2>
        <div className="bp-frames">
          {[0, 1, 2, 3, 4, 5].map((n) => (
            <div key={n} style={{ width: 110 }}>
              <LilyPlant stage={n as 0} />
            </div>
          ))}
          <div style={{ width: 110 }}>
            <LilyPlant stage={0} wilted />
          </div>
        </div>
      </section>
      <section className="bp-row">
        <h2 className="bp-name">The card</h2>
        <div className="bp-frames">
          {SAMPLES.map(([name, days]) => (
            <div key={name} style={{ width: 300 }}>
              <p className="bp-lead" style={{ margin: '0 0 8px' }}>
                {name}
              </p>
              <StreakView info={computeStreak(days, signup)} />
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
