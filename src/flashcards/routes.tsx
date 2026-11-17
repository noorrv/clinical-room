import { Navigate, Route, Routes } from 'react-router-dom';
import { FlashDashboard } from './FlashDashboard';
import { FlashSession } from './FlashSession';

/*
  The flashcard pages, in their own download (the FSRS scheduler comes with them), so the rest
  of the site doesn't carry it.
*/
export function FlashRoutes() {
  return (
    <Routes>
      <Route index element={<FlashDashboard />} />
      <Route path="session" element={<FlashSession />} />
      <Route path="*" element={<Navigate to="/flashcards" replace />} />
    </Routes>
  );
}
