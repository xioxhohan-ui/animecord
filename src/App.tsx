import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AppLayout from './components/layout/AppLayout';
import ChatPage from './pages/ChatPage';
import ServerPage from './pages/ServerPage';
import DmPage from './pages/DmPage';
import ProfilePage from './pages/ProfilePage';
import AdminPanel from './pages/AdminPanel';
import CeoDashboard from './pages/CeoDashboard';
import InvitePreviewPage from './pages/InvitePreviewPage';
import ShopPage from './pages/ShopPage';
import CeoLogs from './pages/CeoLogs';
import CeoAnalytics from './pages/CeoAnalytics';
import type { Role } from './types';

function LoadingScreen() {
  return (
    <div className="h-screen w-screen flex items-center justify-center bg-[hsl(222,47%,6%)]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center shadow-[0_0_40px_rgba(139,92,246,0.5)] animate-pulse">
          <span className="text-white text-2xl">⚡</span>
        </div>
        <p className="text-muted-foreground text-sm tracking-widest uppercase">Loading AnimeCord...</p>
      </div>
    </div>
  );
}

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: Role[] }) {
  const { isAuthenticated, isLoading, user } = useAuthStore();
  if (isLoading) return <LoadingScreen />;
  if (!isAuthenticated || !user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/home" replace />;
  return <>{children}</>;
}

function App() {
  const { fetchMe, setDeviceId, isLoading } = useAuthStore();
  useEffect(() => {
    import('./utils/fingerprint').then(m => m.getDeviceFingerprint().then(setDeviceId));
    fetchMe();
  }, []);
  if (isLoading) return <LoadingScreen />;

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/invite/:code" element={<InvitePreviewPage />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/home" replace />} />
          <Route path="home" element={<ChatPage />} />
          <Route path="server/:serverId" element={<ServerPage />} />
          <Route path="dm/:userId" element={<DmPage />} />
          <Route path="profile/:userId" element={<ProfilePage />} />
          <Route path="shop" element={<ShopPage />} />
          <Route
            path="admin"
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'CEO']}>
                <AdminPanel />
              </ProtectedRoute>
            }
          />
          <Route
            path="ceo"
            element={
              <ProtectedRoute allowedRoles={['CEO']}>
                <CeoDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="ceo/logs"
            element={
              <ProtectedRoute allowedRoles={['CEO']}>
                <CeoLogs />
              </ProtectedRoute>
            }
          />
          <Route
            path="ceo/analytics"
            element={
              <ProtectedRoute allowedRoles={['CEO']}>
                <CeoAnalytics />
              </ProtectedRoute>
            }
          />
        </Route>

        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
