import { Link } from 'react-router-dom';
import type { Specialty } from '../data/homepage';
import { SpecialtyArt } from './art/SpecialtyArt';
import { ArrowRight } from './Icons';
import './SpecialtyCard.css';

export function SpecialtyCard({ specialty }: { specialty: Specialty }) {
  return (
    <Link className="spec-card" to={specialty.href} id={`card-${specialty.id}`}>
      <div className="spec-card__window">
        <div className="spec-card__art">
          <div className="spec-card__art-inner">
            <SpecialtyArt id={specialty.id} />
          </div>
          <span className="spec-card__shimmer" aria-hidden />
        </div>
      </div>
      <div className="spec-card__body">
        <h3 className="spec-card__title">{specialty.title}</h3>
        <ul className="spec-card__points">
          {specialty.points.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
        <span className="spec-card__explore">
          Explore {specialty.shortName}
          <ArrowRight size={18} />
        </span>
      </div>
    </Link>
  );
}
