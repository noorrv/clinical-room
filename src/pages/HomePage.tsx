import { specialties } from '../data/homepage';
import { GazetteBoard } from '../components/board/GazetteBoard';
import { useBoardData } from '../components/board/useBoardData';
import { ContinueStudyingCard, ProgressCard, StreakCard, UpcomingExamsCard } from '../components/Dashboard';
import { PanelVines } from '../components/art/PanelVines';
import { Hero } from '../components/Hero';
import { QuoteBand } from '../components/QuoteBand';
import { SpecialtyCard } from '../components/SpecialtyCard';
import '../App.css';

function Noticeboard() {
  const { data, loading } = useBoardData();
  return <GazetteBoard {...data} loading={loading} />;
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

          <div className="dash-row">
            <Noticeboard />
            <ProgressCard />
            <StreakCard />
          </div>

          <div className="info-row">
            <ContinueStudyingCard />
            <UpcomingExamsCard />
          </div>
        </div>
      </main>
      <QuoteBand />
      </div>
    </>
  );
}
