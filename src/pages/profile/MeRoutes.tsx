import { Navigate, Route, Routes } from 'react-router-dom';
import { BookmarksPage } from './BookmarksPage';
import { ProfilePage } from './ProfilePage';
import { TrackerPage } from './TrackerPage';

/** The student's own pages under /me. */
export function MeRoutes() {
  return (
    <Routes>
      <Route index element={<ProfilePage />} />
      <Route path="bookmarks" element={<BookmarksPage />} />
      <Route path="tracker" element={<TrackerPage />} />
      <Route path="*" element={<Navigate to="/me" replace />} />
    </Routes>
  );
}
