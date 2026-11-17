import { Link } from 'react-router-dom';
import './ModeSwitch.css';

/**
 * Questions or flashcards: the same questions, two ways to study them. The questions view is the
 * page itself; the flashcards link opens a session of these same cards.
 */
export function ModeSwitch({ flashcardsTo, due = 0, label }: { flashcardsTo: string; due?: number; label: string }) {
  return (
    <nav className="mode-switch" aria-label={`Study ${label} as`}>
      <span className="mode-switch__item is-here" aria-current="page">
        Questions
      </span>
      <Link className="mode-switch__item" to={flashcardsTo}>
        Flashcards
        {due > 0 && <span className="mode-switch__due">{due} due</span>}
      </Link>
    </nav>
  );
}
