import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export function Protected() {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading">Đang tải...</div>;
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}
export function Guest() {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading">Đang tải...</div>;
  return user ? <Navigate to="/" replace /> : <Outlet />;
}

export function AdminGuard() {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading">Đang tải...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'ADMIN') {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}
