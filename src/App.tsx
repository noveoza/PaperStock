import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Nav } from './components/Nav/Nav';
import { Footer } from './components/Footer/Footer';
import { Landing } from './pages/Landing';
import { Pricing } from './pages/Pricing';
import { Docs } from './pages/Docs';
import { Changelog } from './pages/Changelog';
import { AuthPage } from './pages/auth/AuthPage';
import { RequireAuth } from './app/layout/RequireAuth';
import { AppLayout } from './app/layout/AppLayout';
import { Portfolio } from './pages/app/Portfolio';
import { Markets } from './pages/app/Markets';
import { Watchlist } from './pages/app/Watchlist';
import { History } from './pages/app/History';
import { useTheme } from './styles/useTheme';

// 마케팅 Nav/Footer 가 노출되지 않을 라우트 prefix
const APP_PREFIXES = ['/app', '/login', '/signup'];

function isChromeHidden(pathname: string): boolean {
  return APP_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export default function App() {
  const { theme, toggle } = useTheme();
  const location = useLocation();
  const hideChrome = isChromeHidden(location.pathname);

  return (
    <>
      {!hideChrome && <Nav theme={theme} onToggleTheme={toggle} />}
      <Routes>
        {/* 마케팅 */}
        <Route path="/" element={<Landing />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/docs" element={<Docs />} />
        <Route path="/changelog" element={<Changelog />} />

        {/* 인증 */}
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/signup" element={<AuthPage mode="signup" />} />

        {/* 앱 (보호) */}
        <Route
          path="/app"
          element={
            <RequireAuth>
              <AppLayout />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="/app/portfolio" replace />} />
          <Route path="portfolio" element={<Portfolio />} />
          <Route path="markets" element={<Markets />} />
          <Route path="watchlist" element={<Watchlist />} />
          <Route path="history" element={<History />} />
        </Route>

        {/* 폴백 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {!hideChrome && <Footer />}
    </>
  );
}
