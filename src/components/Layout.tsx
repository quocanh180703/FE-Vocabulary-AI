import { useEffect, useState } from 'react';
import { NavLink, useNavigate, useLocation, useOutlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { wordApi, learnApi } from '../api';
import { Icon, Mascot } from './icons';
import { NotificationBell } from './NotificationBell';
import { motion, AnimatePresence } from 'motion/react';
import { PageTransition } from '../motion';
import { ErrorBoundary } from './ErrorBoundary';
import vi3dImg from '../assets/vi-3d.webp';

interface TabItem {
  to: string;
  label: string;
  icon: 'home' | 'book' | 'bulb' | 'chart' | 'zap' | 'spark' | 'msg' | 'mic' | 'headphones' | 'user';
  end?: boolean;
}

const STUDENT_TABS: TabItem[] = [
  { to: '/dashboard', label: 'Tổng quan', icon: 'home', end: true },
  { to: '/words', label: 'Từ vựng', icon: 'book' },
  { to: '/review', label: 'Ôn tập', icon: 'bulb' },
  { to: '/roadmap', label: 'Lộ trình AI', icon: 'chart' },
  { to: '/quiz', label: 'Trắc nghiệm', icon: 'zap' },
  { to: '/grammar', label: 'Sửa ngữ pháp', icon: 'spark' },
  { to: '/chat', label: 'Trò chuyện AI', icon: 'msg' },
  { to: '/speaking', label: 'Luyện nói', icon: 'mic' },
  { to: '/listening', label: 'Luyện nghe', icon: 'headphones' },
  { to: '/profile', label: 'Cá nhân', icon: 'user' },
];

const INSTRUCTOR_TABS: TabItem[] = [
  { to: '/admin/reports', label: 'Báo cáo & Thống kê', icon: 'chart', end: true },
  { to: '/admin/words', label: 'Từ vựng & CEFR', icon: 'book' },
  { to: '/admin/quizzes', label: 'Quản lý Trắc nghiệm', icon: 'zap' },
  { to: '/admin/content-review', label: 'Duyệt nội dung', icon: 'spark' },
  { to: '/admin/users', label: 'Quản lý Học viên', icon: 'user' },
  { to: '/profile', label: 'Cá nhân', icon: 'user' },
];

export function Layout() {
  const { user, subscription, logout } = useAuth();
  const [favCount, setFavCount] = useState(0);
  const [streak, setStreak] = useState<number>(0);
  const [isNavigatingHome, setIsNavigatingHome] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('vocab_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('vocab_sidebar_collapsed', String(next));
      } catch { }
      return next;
    });
  };
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

  const handleGoHome = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (isNavigatingHome) return;
    setIsNavigatingHome(true);
    setTimeout(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      nav('/landing');
    }, 220);
  };

  useEffect(() => {
    const syncFav = (e?: Event) => {
      if (!user) {
        setFavCount(0);
        return;
      }
      const ce = e as CustomEvent;
      if (ce?.detail?.count !== undefined && typeof ce.detail.count === 'number') {
        setFavCount(ce.detail.count);
        return;
      }

      try {
        const uid = user.id || user.username;
        if (uid) {
          const cachedItems = JSON.parse(localStorage.getItem(`vocab_fav_items_${uid}`) || '[]');
          if (Array.isArray(cachedItems) && cachedItems.length > 0) {
            setFavCount(cachedItems.length);
          }
        }
      } catch { }

      wordApi.favorites(0, 100)
        .then(({ data }) => {
          const count = typeof data?.totalElements === 'number'
            ? data.totalElements
            : (Array.isArray(data?.content) ? data.content.length : 0);
          setFavCount(count);
        })
        .catch(() => { });
    };

    const syncStats = () => {
      if (!user) {
        setStreak(0);
        return;
      }
      learnApi.stats()
        .then(({ data }) => {
          if (data) {
            setStreak(data.currentStreak ?? 0);
          }
        })
        .catch(() => { });
    };

    syncFav();
    syncStats();

    window.addEventListener('vocab_favorites_changed', syncFav);
    window.addEventListener('vocab_stats_changed', syncStats);
    return () => {
      window.removeEventListener('vocab_favorites_changed', syncFav);
      window.removeEventListener('vocab_stats_changed', syncStats);
    };
  }, [user?.id]);

  return (
    <>
      <div className={'layout-route-bar' + (routeProgress || isNavigatingHome ? ' active' : '')} />
      <motion.div
        className="sheet"
        initial={{ opacity: 0, y: 12, scale: 0.995 }}
        animate={isNavigatingHome ? { opacity: 0, y: -10, scale: 0.995 } : { opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: isNavigatingHome ? 0.22 : 0.35, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Sidebar 9 mục chuẩn Soft Modern */}
        <aside className={'sidebar' + (isSidebarCollapsed ? ' collapsed' : '')}>
          <div className="sidebar-header">
            <div
              className="brand"
              onClick={() => nav(user?.role === 'INSTRUCTOR' ? '/admin/reports' : '/dashboard')}
              title="VocabularyAI - Về tổng quan"
              style={{ cursor: 'pointer' }}
            >
              <Mascot s={isSidebarCollapsed ? 34 : 36} />
              {!isSidebarCollapsed && <span className="brand-text">VocabularyAI</span>}
            </div>
          </div>

          {(user?.role === 'INSTRUCTOR' ? INSTRUCTOR_TABS : STUDENT_TABS).map((t) => (
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
              {!isSidebarCollapsed && <span className="nav-label">{t.label}</span>}
            </NavLink>
          ))}

          {user?.role === 'INSTRUCTOR' && (
            <NavLink
              to="/admin/reports"
              className="nav"
              title="Trang Giảng viên"
              style={{
                marginTop: 6,
                background: 'rgba(79, 70, 229, 0.08)',
                color: '#4F46E5',
                fontWeight: 800,
              }}
            >
              <span
                className="nic"
                style={{
                  background: '#4F46E5',
                  color: '#fff',
                }}
              >
                <Icon n="spark" s={18} />
              </span>
              {!isSidebarCollapsed && (
                <span className="nav-label">
                  Trang Giảng viên
                </span>
              )}
            </NavLink>
          )}

          {user?.role === 'ADMIN' && (
            <NavLink
              to="/admin"
              className="nav"
              title="Quản trị Admin"
              style={{
                marginTop: 6,
                background: 'rgba(21, 101, 192, 0.08)',
                color: 'var(--primary-dark)',
                fontWeight: 800,
              }}
            >
              <span
                className="nic"
                style={{
                  background: 'var(--primary)',
                  color: '#fff',
                }}
              >
                <Icon n="spark" s={18} />
              </span>
              {!isSidebarCollapsed && (
                <span className="nav-label">
                  Quản trị Admin
                </span>
              )}
            </NavLink>
          )}

          {/* Khối Mascot Vi đồng hành */}
          <div
            className="side-coach"
            style={{ marginTop: 'auto' }}
            title="Vi nhắc: duy trì streak mỗi ngày nhé!"
          >
            <img src={vi3dImg} alt="Vi Mascot" />
            {!isSidebarCollapsed && (
              <div className="side-coach-info">
                <span className="cdot"></span>
                <b>Vi nhắc:</b> duy trì streak mỗi ngày nhé!
              </div>
            )}
          </div>

          {/* Đăng xuất */}
          <button
            type="button"
            className="nav"
            onClick={logout}
            style={{ marginTop: 6 }}
            title="Đăng xuất"
          >
            <span className="nic">
              <Icon n="logout" s={18} />
            </span>
            {!isSidebarCollapsed && <span className="nav-label">Đăng xuất</span>}
          </button>
        </aside>

        {/* Main Workspace */}
        <div className="main">
          <div className="topbar">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 'auto' }}>
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
                onClick={handleGoHome}
                title="Về trang giới thiệu (Landing Page)"
              >
                <Icon n="home" s={17} />
                <span className="topbar-home-text">Trang chủ</span>
              </button>
            </div>

            <div
              className="statpill"
              title="Chuỗi ngày học liên tục (Streak)"
              onClick={() => nav('/dashboard')}
              style={{ cursor: 'pointer' }}
            >
              <span style={{ color: 'var(--yellow)', display: 'inline-flex' }}>
                <Icon n="flame" s={18} />
              </span>
              <span style={{ color: 'var(--yellow-dark)' }}>{streak}</span>
            </div>

            <NotificationBell />

            <div
              className="statpill"
              title="Từ vựng yêu thích"
              onClick={() => nav('/favorites')}
              style={{ cursor: 'pointer' }}
            >
              <span style={{ color: 'var(--red)', display: 'inline-flex' }}>
                <Icon n="heart" s={18} />
              </span>
              <span style={{ color: 'var(--red-dark)' }}>{favCount}</span>
            </div>

            {/* User Membership Status Pill */}
            {subscription?.status === 'ACTIVE' ? (
              <button
                type="button"
                className="statpill"
                onClick={() => nav('/profile')}
                style={{
                  cursor: 'pointer',
                  border: 'none',
                  background: 'var(--tint)',
                  color: 'var(--primary-dark)',
                }}
                title={`Gói thành viên: ${subscription.packageName || 'Gói Theo Tháng'} (Còn ${subscription.remainingDays ?? 0} ngày). Bấm để xem chi tiết.`}
              >
                <Icon n="gem" s={15} />
                <span style={{ fontSize: '13px', fontWeight: 900 }}>PRO</span>
              </button>
            ) : (
              <button
                type="button"
                className="statpill"
                onClick={() => nav('/profile')}
                style={{
                  cursor: 'pointer',
                  border: 'none',
                  background: '#F1F5F9',
                  color: '#475569',
                }}
                title="Bạn đang dùng gói Miễn Phí. Bấm để xem ưu đãi nâng cấp PRO!"
              >
                <Icon n="spark" s={15} />
                <span style={{ fontSize: '13px', fontWeight: 900 }}>PRO</span>
              </button>
            )}

            <div
              className="uavatar"
              onClick={() => nav('/profile')}
              style={{
                cursor: 'pointer',
                overflow: 'hidden',
                padding: 0,
              }}
              title="Hồ sơ cá nhân"
            >
              {user?.avatarUrl && !user.avatarUrl.startsWith('#') ? (
                <img
                  src={user.avatarUrl}
                  alt={user.fullName || user.username}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                (user?.fullName || user?.username || 'U')[0].toUpperCase()
              )}
            </div>
          </div>

          <div className="content">
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

        {/* Mobile Tabbar */}
        <nav className="tabbar">
          <NavLink to="/dashboard" end className={({ isActive }) => (isActive ? 'on' : '')}>
            <Icon n="home" s={20} />
            Tổng quan
          </NavLink>
          <NavLink to="/words" className={({ isActive }) => (isActive ? 'on' : '')}>
            <Icon n="book" s={20} />
            Từ vựng
          </NavLink>
          <NavLink to="/speaking" className={({ isActive }) => (isActive ? 'on' : '')}>
            <Icon n="mic" s={20} />
            Luyện nói
          </NavLink>
          <NavLink to="/profile" className={({ isActive }) => (isActive ? 'on' : '')}>
            <Icon n="user" s={20} />
            Cá nhân
          </NavLink>
        </nav>
      </motion.div>
    </>
  );
}
