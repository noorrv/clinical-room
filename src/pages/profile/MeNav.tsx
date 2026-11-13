import { NavLink } from 'react-router-dom';

/** The student's own pages: profile, bookmarks and tracker. */
export function MeNav() {
  return (
    <nav className="me-nav" aria-label="Your pages">
      <NavLink end to="/me">
        Profile
      </NavLink>
      <NavLink to="/me/bookmarks">Bookmarks</NavLink>
      <NavLink to="/me/tracker">Tracker</NavLink>
    </nav>
  );
}
