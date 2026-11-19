import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ViLoadingScreen } from './states/ViLoadingScreen';

export function Protected() {
  const { user, loading } = useAuth();
  if (loading) return <ViLoadingScreen fullscreen />;
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}
export function Guest() {
  const { user, loading } = useAuth();
  if (loading) return <ViLoadingScreen fullscreen />;
  return user ? <Navigate to="/" replace /> : <Outlet />;
}

export function AdminGuard() {
  const { user, loading } = useAuth();
  if (loading) return <ViLoadingScreen fullscreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'INSTRUCTOR') {
    return <Navigate to="/admin/reports" replace />;
  }
  if (user.role !== 'ADMIN') {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}

export function InstructorGuard() {
  const { user, loading } = useAuth();
  if (loading) return <ViLoadingScreen fullscreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'ADMIN' && user.role !== 'INSTRUCTOR') {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}
