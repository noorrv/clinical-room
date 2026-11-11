import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider } from './auth/AuthProvider';
import { RequireAdmin, RequireApproved, Waiting } from './auth/guards';
import { SiteHeader } from './components/SiteHeader';
import { ContentGate } from './content/ContentGate';
import { AccountPage, CheckEmailPage, ForgotPasswordPage, LoginPage, RegisterPage, ResetPasswordPage } from './pages/auth/AuthPages';
import { HomePage } from './pages/HomePage';
import { NotFoundPage, PageBoundary } from './pages/SystemPages';
import { StudySync } from './study/sync';

// the study pages are their own download too, fetched in the background once the first page is up
const studyModule = () => import('./pages/studyRoutes');
const SpecialtyRoutes = lazy(() => studyModule().then((m) => ({ default: m.SpecialtyRoutes })));
const ArchiveSearch = lazy(() => studyModule().then((m) => ({ default: m.ArchiveSearch })));

/** Fetch the study pages while the browser is idle, so the first click into them doesn't wait. */
function PrefetchStudyPages() {
  useEffect(() => {
    const start = () => void studyModule().catch(() => undefined);
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(start, { timeout: 4000 });
      return () => window.cancelIdleCallback(id);
    }
    const t = window.setTimeout(start, 1500);
    return () => window.clearTimeout(t);
  }, []);
  return null;
}

// the admin dashboard is its own download, fetched the first time an admin opens it
const adminModule = () => import('./pages/admin/routes');
const AdminLayout = lazy(() => adminModule().then((m) => ({ default: m.AdminLayout })));
const OverviewPage = lazy(() => adminModule().then((m) => ({ default: m.OverviewPage })));
const QuestionsPage = lazy(() => adminModule().then((m) => ({ default: m.QuestionsPage })));
const QuestionEditorPage = lazy(() => adminModule().then((m) => ({ default: m.QuestionEditorPage })));
const DirectoryPage = lazy(() => adminModule().then((m) => ({ default: m.DirectoryPage })));
const SpecialtiesPage = lazy(() => adminModule().then((m) => ({ default: m.SpecialtiesPage })));
const RegistrationsPage = lazy(() => adminModule().then((m) => ({ default: m.RegistrationsPage })));

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
      <PrefetchStudyPages />
      <div id="top">
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <SiteHeader />
        <PageBoundary>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route
            path="/specialties/:slug/*"
            element={
              <RequireApproved>
                <ContentGate>
                  <Suspense fallback={<Waiting />}>
                    <SpecialtyRoutes />
                  </Suspense>
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
                    <Suspense fallback={<Waiting />}>
                      <ArchiveSearch />
                    </Suspense>
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
                <Suspense fallback={<Waiting />}>
                  <AdminLayout />
                </Suspense>
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
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        </PageBoundary>
      </div>
      </AuthProvider>
    </BrowserRouter>
  );
}
