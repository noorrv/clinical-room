/*
  The study pages (specialty dashboards, doctor archives, topics, study sheets, search) in one module,
  so the homepage downloads without them. App.tsx fetches this while the homepage is idle, so the
  first click into a specialty is usually instant.
*/
export { ArchiveSearch } from './archive/ArchiveSearch';
export { SpecialtyRoutes } from './specialty/SpecialtyRoutes';
export { ProfilePage } from './profile/ProfilePage';
