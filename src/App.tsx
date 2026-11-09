import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { SiteHeader } from './components/SiteHeader';
import { HomePage } from './pages/HomePage';
import { SpecialtyRoutes } from './pages/specialty/SpecialtyRoutes';

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
      <ScrollManager />
      <div id="top">
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <SiteHeader />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/specialties/:slug/*" element={<SpecialtyRoutes />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
