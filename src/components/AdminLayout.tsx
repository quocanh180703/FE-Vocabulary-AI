import { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation, useOutlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Icon, Mascot } from './icons';
import { motion, AnimatePresence } from 'motion/react';
import { PageTransition } from '../motion';
import { ErrorBoundary } from './ErrorBoundary';

interface AdminTabItem {
  to: string;
  label: string;
  icon: 'home' | 'creditCard' | 'user' | 'book' | 'zap' | 'chart' | 'spark';
  end?: boolean;
  badge?: string;
  roles?: ('ADMIN' | 'INSTRUCTOR')[];
}

const ADMIN_TABS: AdminTabItem[] = [
  { to: '/admin', label: 'Tổng quan Hệ thống', icon: 'home', end: true, roles: ['ADMIN'] },
  { to: '/admin/orders', label: 'Đơn hàng & Gói cước', icon: 'creditCard', roles: ['ADMIN'] },
  { to: '/admin/users', label: 'Quản lý Học viên', icon: 'user', roles: ['ADMIN', 'INSTRUCTOR'] },
  { to: '/admin/words', label: 'Từ vựng & CEFR', icon: 'book', roles: ['ADMIN', 'INSTRUCTOR'] },
  { to: '/admin/quizzes', label: 'Quản lý Trắc nghiệm', icon: 'zap', roles: ['ADMIN', 'INSTRUCTOR'] },
  { to: '/admin/content-review', label: 'Duyệt nội dung', icon: 'spark', roles: ['ADMIN', 'INSTRUCTOR'] },
  { to: '/admin/reports', label: 'Báo cáo & Thống kê', icon: 'chart', roles: ['ADMIN', 'INSTRUCTOR'] },
  { to: '/admin/ai-assistant', label: 'Trợ lý AI & Giám sát', icon: 'spark', badge: 'AI', roles: ['ADMIN'] },
];

export function AdminLayout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const location = useLocation();
  const currentOutlet = useOutlet();
  const [routeProgress, setRouteProgress] = useState(false);

  useEffect(() => {
    setRouteProgress(true);
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    const timer = setTimeout(() => {
      setRouteProgress(false);
    }, 280);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('vocab_sidebar_collapsed_admin') === 'true';
    } catch {
      return false;
    }
  });

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('vocab_sidebar_collapsed_admin', String(next));
      } catch {}
      return next;
    });
  };

  const [isNavigating, setIsNavigating] = useState(false);
  const displayName = user?.fullName || user?.username || 'Administrator';
  const isInstructor = user?.role === 'INSTRUCTOR';

  const visibleTabs = ADMIN_TABS.filter(
    (t) => !t.roles || (user?.role && t.roles.includes(user.role as any))
  );

  const handleTransitionNavigate = (to: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    if (isNavigating) return;
    setIsNavigating(true);
    setTimeout(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      nav(to);
    }, 220);
  };

  return (
    <>
      <div className={'layout-route-bar' + (routeProgress || isNavigating ? ' active' : '')} />
      <motion.div
        className="sheet"
        initial={{ opacity: 0, y: 12, scale: 0.995 }}
        animate={isNavigating ? { opacity: 0, y: -10, scale: 0.995 } : { opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: isNavigating ? 0.22 : 0.35, ease: [0.16, 1, 0.3, 1] }}
      >
      {/* Sidebar Admin Portal chuẩn theo thiết kế */}
      <aside className={'sidebar' + (isSidebarCollapsed ? ' collapsed' : '')}>
        <div className="sidebar-header">
          <div
            className="brand"
            onClick={() => nav(isInstructor ? '/admin/reports' : '/admin')}
            title={isInstructor ? 'VocabularyAI Instructor' : 'VocabularyAI Admin'}
            style={{ cursor: 'pointer' }}
          >
            <Mascot s={isSidebarCollapsed ? 34 : 36} />
            {!isSidebarCollapsed && <span className="brand-text">VocabularyAI</span>}
          </div>
        </div>

        {!isSidebarCollapsed && (
          <div style={{ padding: '0 10px 10px' }}>
            <span
              className="adminbadge"
              style={{
                fontSize: '11px',
                padding: '4px 10px',
                width: '100%',
                justifyContent: 'center',
                background: isInstructor ? 'rgba(79, 70, 229, 0.12)' : undefined,
                color: isInstructor ? '#4F46E5' : undefined,
                borderColor: isInstructor ? 'rgba(79, 70, 229, 0.25)' : undefined,
              }}
            >
              {isInstructor ? 'INSTRUCTOR PORTAL · GIẢNG VIÊN' : 'ADMIN PORTAL · QUẢN TRỊ'}
            </span>
          </div>
        )}

        {visibleTabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) => 'nav' + (isActive ? ' on' : '')}
            title={t.label}
          >
            <span className="nic">
              <Icon n={t.icon} s={19} />
            </span>
            {!isSidebarCollapsed && <span style={{ flex: 1 }}>{t.label}</span>}
            {!isSidebarCollapsed && t.badge && (
              <span className="adminbadge" style={{ marginLeft: 'auto', fontSize: '10px', padding: '2px 7px' }}>
                {t.badge}
              </span>
            )}
          </NavLink>
        ))}

        <div style={{ flex: 1 }} />

        {/* Lối về trang học viên */}
        <NavLink
          to="/dashboard"
          className="nav"
          title="Quay lại giao diện học viên"
        >
          <span className="nic">
            <Icon n="home" s={18} />
          </span>
          {!isSidebarCollapsed && <span>Về trang học viên</span>}
        </NavLink>

        {/* Đăng xuất */}
        <button
          type="button"
          className="nav"
          onClick={logout}
          style={{ marginTop: 4 }}
          title="Đăng xuất"
        >
          <span className="nic">
            <Icon n="logout" s={18} />
          </span>
          {!isSidebarCollapsed && <span>Đăng xuất</span>}
        </button>
      </aside>

      {/* Main Admin Workspace */}
      <div className="main">
        <div className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              className="topbar-toggle-btn"
              onClick={toggleSidebar}
              title={isSidebarCollapsed ? 'Mở thanh bên' : 'Đóng thanh bên'}
              aria-label={isSidebarCollapsed ? 'Mở thanh bên' : 'Đóng thanh bên'}
            >
              <Icon n={isSidebarCollapsed ? 'panelLeftOpen' : 'panelLeft'} s={18} />
            </button>

            <button
              type="button"
              className="topbar-home-btn"
              onClick={handleTransitionNavigate('/landing')}
              title="Về trang giới thiệu (Landing Page)"
            >
              <Icon n="home" s={17} />
              <span className="topbar-home-text">Landing Page</span>
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 900, fontSize: '15.5px', marginRight: 'auto', marginLeft: '12px' }}>
            <span className="dot g pulse-live-dot" style={{ margin: 0 }}></span>
            <span>Hệ thống ổn định</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 900, fontSize: '14.5px', lineHeight: 1.2, color: 'var(--ink)' }}>
                {displayName}
              </div>
              <div
                className="sub"
                style={{
                  fontSize: '12.5px',
                  marginTop: '2px',
                  color: isInstructor ? '#4F46E5' : undefined,
                  fontWeight: 700,
                }}
              >
                {isInstructor ? 'Giảng viên' : 'Quản trị viên'}
              </div>
            </div>

            <div
              className="uavatar"
              onClick={() => nav('/profile')}
              style={{
                cursor: 'pointer',
                background: isInstructor ? '#4F46E5' : 'var(--primary)',
                color: '#fff',
                overflow: 'hidden',
                padding: 0,
              }}
              title={isInstructor ? 'Thông tin Giảng viên' : 'Thông tin Quản trị viên'}
            >
              {user?.avatarUrl && !user.avatarUrl.startsWith('#') ? (
                <img
                  src={user.avatarUrl}
                  alt={displayName}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                (user?.fullName || user?.username || (isInstructor ? 'I' : 'A'))[0].toUpperCase()
              )}
            </div>
          </div>
        </div>

        <div className="content" style={{ maxWidth: '1240px' }}>
          <ErrorBoundary>
            <AnimatePresence mode="wait" initial={false}>
              {currentOutlet && (
                <PageTransition key={location.pathname}>
                  {currentOutlet}
                </PageTransition>
              )}
            </AnimatePresence>
          </ErrorBoundary>
        </div>
      </div>
    </motion.div>
  </>
  );
}
