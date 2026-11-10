import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider } from './auth/AuthProvider';
import { RequireAdmin, RequireApproved } from './auth/guards';
import { SiteHeader } from './components/SiteHeader';
import { ContentGate } from './content/ContentGate';
import { AdminLayout } from './pages/admin/AdminLayout';
import { DirectoryPage } from './pages/admin/DirectoryPage';
import { OverviewPage } from './pages/admin/OverviewPage';
import { QuestionEditorPage } from './pages/admin/QuestionEditorPage';
import { QuestionsPage } from './pages/admin/QuestionsPage';
import { SpecialtiesPage } from './pages/admin/SpecialtiesPage';
import { RegistrationsPage } from './pages/admin/RegistrationsPage';
import { AccountPage, CheckEmailPage, ForgotPasswordPage, LoginPage, RegisterPage, ResetPasswordPage } from './pages/auth/AuthPages';
import { ArchiveSearch } from './pages/archive/ArchiveSearch';
import { HomePage } from './pages/HomePage';
import { SpecialtyRoutes } from './pages/specialty/SpecialtyRoutes';
import { StudySync } from './study/sync';

// development-only comparison page; dropped from the built site
const StreakPreview = import.meta.env.DEV ? lazy(() => import('./pages/StreakPreview').then((m) => ({ default: m.StreakPreview }))) : null;
const SheetPreview = import.meta.env.DEV ? lazy(() => import('./dev/SheetPreview').then((m) => ({ default: m.SheetPreview }))) : null;
const BoardPreview = import.meta.env.DEV ? lazy(() => import('./pages/BoardPreview').then((m) => ({ default: m.BoardPreview }))) : null;

/** New page: start at the top. A #hash: scroll to that section once it has rendered. */
function ScrollManager() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const id = decodeURIComponent(hash.slice(1));
      requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: 'start' }));
    } else {
      window.scrollTo(0, 0);
    }
  }, [pathname, hash]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
      <StudySync />
      <ScrollManager />
      <div id="top">
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <SiteHeader />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route
            path="/specialties/:slug/*"
            element={
              <RequireApproved>
                <ContentGate>
                  <SpecialtyRoutes />
                </ContentGate>
              </RequireApproved>
            }
          />
          <Route
            path="/archive/search"
            element={
              <RequireApproved>
                <ContentGate>
                  <main id="main">
                    <ArchiveSearch />
                  </main>
                </ContentGate>
              </RequireApproved>
            }
          />
          {SheetPreview && (
            <Route
              path="/_preview/sheet/doctors/:doctorId/topics/:topicId"
              element={
                <RequireApproved>
                  <ContentGate>
                    <Suspense fallback={null}>
                      <SheetPreview />
                    </Suspense>
                  </ContentGate>
                </RequireApproved>
              }
            />
          )}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/check-email" element={<CheckEmailPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route
            path="/admin"
            element={
              <RequireAdmin>
                <AdminLayout />
              </RequireAdmin>
            }
          >
            <Route index element={<OverviewPage />} />
            <Route path="questions" element={<QuestionsPage />} />
            <Route path="questions/new" element={<QuestionEditorPage key="new" />} />
            <Route path="questions/edit/:sp/:id" element={<QuestionEditorPage />} />
            <Route path="examiners" element={<DirectoryPage key="doctors" kind="doctors" />} />
            <Route path="topics" element={<DirectoryPage key="topics" kind="topics" />} />
            <Route path="specialties" element={<SpecialtiesPage />} />
            <Route path="registrations" element={<RegistrationsPage />} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Route>
          {StreakPreview && (
            <Route
              path="/_preview/streak"
              element={
                <Suspense fallback={null}>
                  <StreakPreview />
                </Suspense>
              }
            />
          )}
          {BoardPreview && (
            <Route
              path="/_preview/board"
              element={
                <Suspense fallback={null}>
                  <BoardPreview />
                </Suspense>
              }
            />
          )}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      </AuthProvider>
    </BrowserRouter>
  );
}
