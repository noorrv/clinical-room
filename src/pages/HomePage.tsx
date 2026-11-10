import { specialties } from '../data/homepage';
import { GazetteBoard } from '../components/board/GazetteBoard';
import { useBoardData } from '../components/board/useBoardData';
import type { RecentItem } from '../components/board/types';
import { useNotifications } from '../notifications/useNotifications';
import { StreakCard } from '../components/Dashboard';
import { ContinueStudyingCard } from '../components/ContinueCard';
import { PanelVines } from '../components/art/PanelVines';
import { Hero } from '../components/Hero';
import { QuoteBand } from '../components/QuoteBand';
import { SpecialtyCard } from '../components/SpecialtyCard';
import '../App.css';

const FEED_LABEL = { 'new-topic': 'New topic', 'new-questions': 'New', updated: 'Updated' } as const;

/*
  Approved students see "Lately added" from the same grouped feed as the header bell (one line per
  topic, flagged updates). Guests can't read that feed, so they keep the open items the board loads.
*/
function Noticeboard() {
  const { data, loading } = useBoardData();
  const feed = useNotifications(null);
  const recent: RecentItem[] = feed.allowed
    ? feed.items
        .filter((i) => i.kind !== 'announcement')
        .slice(0, 5)
        .map((i) => ({
          id: i.key,
          kind: i.kind === 'new-topic' ? 'topic' : 'question',
          title: i.title,
          specialty: i.detail,
          date: i.at.toISOString(),
          href: i.href,
          label: FEED_LABEL[i.kind as keyof typeof FEED_LABEL],
        }))
    : data.recent;
  return <GazetteBoard notices={data.notices} recent={recent} loading={loading || (feed.allowed && !feed.loaded)} />;
}

export function HomePage() {
  return (
    <>
      <Hero />
      {/* one continuous striped cotton cloth from under the hero down through the still life */}
      <div className="fabric">
      <main id="main" className="panel-wrap container">
        <div className="panel">
          <PanelVines />
          <section id="specialties" aria-labelledby="specialties-title">
            <h2 id="specialties-title" className="visually-hidden">
              Specialties
            </h2>
            <ul className="spec-grid">
              {specialties.map((s) => (
                <li key={s.id}>
                  <SpecialtyCard specialty={s} />
                </li>
              ))}
            </ul>
          </section>

          <div className="dash-row" id="study-tracker">
            <Noticeboard />
            <ContinueStudyingCard />
            <StreakCard />
          </div>
        </div>
      </main>
      <QuoteBand />
      </div>
    </>
  );
}
