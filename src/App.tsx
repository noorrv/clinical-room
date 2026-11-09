import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider } from './auth/AuthProvider';
import { RequireAdmin, RequireApproved } from './auth/guards';
import { SiteHeader } from './components/SiteHeader';
import { ContentGate } from './content/ContentGate';
import { AdminPage } from './pages/admin/AdminPage';
import { AccountPage, CheckEmailPage, ForgotPasswordPage, LoginPage, RegisterPage, ResetPasswordPage } from './pages/auth/AuthPages';
import { HomePage } from './pages/HomePage';
import { SpecialtyRoutes } from './pages/specialty/SpecialtyRoutes';
import { StudySync } from './study/sync';

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
                <AdminPage />
              </RequireAdmin>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      </AuthProvider>
    </BrowserRouter>
  );
}
