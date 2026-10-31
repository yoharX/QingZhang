import { useEffect } from 'react';
import { HashRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { AppProvider, useApp } from './store/AppContext';
import { AppShell } from './components/AppShell';
import { Composer } from './components/Composer';
import { Logo } from './components/Logo';
import { LoginPage } from './pages/Login';
import { HomePage } from './pages/Home';
import { TxnsPage } from './pages/Transactions';
import { InsightsPage } from './pages/Insights';
import { ProfilePage } from './pages/Profile';

function Splash() {
  return (
    <div className="splash">
      <div className="splash-mark">
        <Logo size={44} />
      </div>
      <span className="splash-name">轻帐</span>
    </div>
  );
}

function Gate() {
  const { ready, user, composerOpen, closeComposer } = useApp();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  // 退出登录时把路由拉回首页，否则重新登录会落在上次停留的页面
  useEffect(() => {
    if (ready && !user && pathname !== '/') navigate('/', { replace: true });
  }, [ready, user, pathname, navigate]);

  if (!ready) return <Splash />;
  if (!user) return <LoginPage />;

  return (
    <>
      <AppShell>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/txns" element={<TxnsPage />} />
          <Route path="/insights" element={<InsightsPage />} />
          <Route path="/me" element={<ProfilePage />} />
          <Route path="*" element={<HomePage />} />
        </Routes>
      </AppShell>
      <Composer open={composerOpen} onClose={closeComposer} />
    </>
  );
}

export default function App() {
  return (
    <AppProvider>
      <HashRouter>
        <Gate />
      </HashRouter>
    </AppProvider>
  );
}
