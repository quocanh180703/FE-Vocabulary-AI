import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { NavLink, useNavigate, useLocation, useOutlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { wordApi, learnApi } from '../api';
import { Icon } from './icons';
import { NotificationBell } from './NotificationBell';
import { motion, AnimatePresence } from 'motion/react';
import { PageTransition } from '../motion';
import { ErrorBoundary } from './ErrorBoundary';
import { SageScene } from './SageEffects';
import { ViMascotImage } from './ViMascotImage';
import { VI_APP_ICON, VI_LOGO_TRANSPARENT } from '../constants/mascot';
import { BlurUpImage } from './states/BlurUpImage';
import { OfflineBanner } from './states/SageStates';
import { attachSagePointerEffects } from '../utils/interactiveEffects';

interface TabItem {
  to: string;
  label: string;
  icon: 'home' | 'book' | 'bulb' | 'chart' | 'zap' | 'spark' | 'msg' | 'mic' | 'headphones' | 'user';
  end?: boolean;
}

const STUDENT_TABS: TabItem[] = [
  { to: '/dashboard', label: 'Tổng quan', icon: 'home', end: true },
  { to: '/words', label: 'Từ vựng', icon: 'book' },
  { to: '/review', label: 'Ôn tập SRS', icon: 'bulb' },
  { to: '/roadmap', label: 'Lộ trình AI', icon: 'chart' },
  { to: '/quiz', label: 'Làm Quiz', icon: 'zap' },
  { to: '/grammar', label: 'Ngữ pháp', icon: 'spark' },
  { to: '/chat', label: 'Chat với Vi', icon: 'msg' },
  { to: '/speaking', label: 'Luyện nói', icon: 'mic' },
  { to: '/listening', label: 'Luyện nghe', icon: 'headphones' },
  { to: '/favorites', label: 'Từ đã lưu', icon: 'book' },
  { to: '/profile', label: 'Hồ sơ', icon: 'user' },
];

const INSTRUCTOR_TABS: TabItem[] = [
  { to: '/admin/reports', label: 'Báo cáo & Thống kê', icon: 'chart', end: true },
  { to: '/admin/words', label: 'Từ vựng & CEFR', icon: 'book' },
  { to: '/admin/quizzes', label: 'Quản lý Trắc nghiệm', icon: 'zap' },
  { to: '/admin/content-review', label: 'Duyệt nội dung', icon: 'spark' },
  { to: '/admin/users', label: 'Quản lý Học viên', icon: 'user' },
  { to: '/profile', label: 'Hồ sơ', icon: 'user' },
];

const ROUTE_TITLES: Array<[string, string]> = [
  ['/dashboard', 'Tổng quan'],
  ['/words/', 'Chi tiết từ'],
  ['/words', 'Từ vựng'],
  ['/review', 'Ôn tập SRS'],
  ['/roadmap', 'Lộ trình AI'],
  ['/quiz/', 'Làm Quiz'],
  ['/quiz', 'Danh sách Quiz'],
  ['/grammar', 'Ngữ pháp'],
  ['/chat', 'Chat với Vi'],
  ['/speaking/result', 'Kết quả nói'],
  ['/speaking', 'Luyện nói'],
  ['/listening', 'Luyện nghe'],
  ['/favorites', 'Từ đã lưu'],
  ['/profile', 'Hồ sơ'],
  ['/payment/', 'Thanh toán'],
];

function getRouteTitle(pathname: string): string {
  for (const [prefix, title] of ROUTE_TITLES) {
    if (pathname.startsWith(prefix)) return title;
  }
  return 'Không gian học';
}

export function Layout() {
  const { user, subscription, logout } = useAuth();
  const [favCount, setFavCount] = useState(0);
  const [streak, setStreak] = useState<number>(0);
  const [isNavigatingHome, setIsNavigatingHome] = useState(false);
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('vocab_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const navListRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('vocab_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  const nav = useNavigate();
  const location = useLocation();
  const currentOutlet = useOutlet();
  const [routeProgress, setRouteProgress] = useState(false);

  // Lock document scroll in logged-in App Shell & attach pointer glint/tilt
  useEffect(() => {
    document.body.classList.add('sage-app-mode');
    const detach = attachSagePointerEffects();
    return () => {
      detach();
      document.body.classList.remove('sage-app-mode');
    };
  }, []);

  // Glass skeleton shimmer on route switches (respecting reduced motion)
  useEffect(() => {
    setRouteProgress(true);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduce) setShowSkeleton(true);
    const barTimer = window.setTimeout(() => setRouteProgress(false), 260);
    const skelTimer = window.setTimeout(() => setShowSkeleton(false), 210);
    return () => {
      window.clearTimeout(barTimer);
      window.clearTimeout(skelTimer);
    };
  }, [location.pathname]);

  // Sliding glass pill indicator tracking active nav item
  const updateNavIndicator = () => {
    const container = navListRef.current;
    const indicator = indicatorRef.current;
    if (!container || !indicator) return;
    const activeEl = container.querySelector<HTMLElement>('a.nav.on');
    if (activeEl) {
      indicator.style.opacity = '1';
      indicator.style.transform = `translateY(${activeEl.offsetTop}px)`;
      indicator.style.height = `${activeEl.offsetHeight}px`;
    } else {
      indicator.style.opacity = '0';
    }
  };

  useLayoutEffect(() => {
    updateNavIndicator();
  }, [location.pathname, isSidebarCollapsed, user?.role]);

  useEffect(() => {
    window.addEventListener('resize', updateNavIndicator);
    return () => window.removeEventListener('resize', updateNavIndicator);
  }, []);

  const handleGoHome = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (isNavigatingHome) return;
    setIsNavigatingHome(true);
    window.setTimeout(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      nav('/landing');
    }, 180);
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
      } catch {}

      wordApi
        .favorites(0, 100)
        .then(({ data }) => {
          const count =
            typeof data?.totalElements === 'number'
              ? data.totalElements
              : Array.isArray(data?.content)
              ? data.content.length
              : 0;
          setFavCount(count);
        })
        .catch(() => {});
    };

    const syncStats = () => {
      if (!user) {
        setStreak(0);
        return;
      }
      learnApi
        .stats()
        .then(({ data }) => {
          if (data) setStreak(data.currentStreak ?? 0);
        })
        .catch(() => {});
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

  const tabs = user?.role === 'INSTRUCTOR' ? INSTRUCTOR_TABS : STUDENT_TABS;
  const pageTitle = getRouteTitle(location.pathname);

  return (
    <>
      <SageScene />
      <div className={'layout-route-bar' + (routeProgress || isNavigatingHome ? ' active' : '')} />

      <motion.div
        className={`sheet shell ${isSidebarCollapsed ? 'is-collapsed' : ''}`}
        initial={{ opacity: 0, y: 10 }}
        animate={isNavigatingHome ? { opacity: 0, y: -8 } : { opacity: 1, y: 0 }}
        transition={{ duration: isNavigatingHome ? 0.18 : 0.34, ease: [0.23, 1, 0.32, 1] }}
      >
        {/* Fixed Glass Sidebar */}
        <aside className={'sidebar glass' + (isSidebarCollapsed ? ' collapsed' : '')}>
          <div className="sidebar-header">
            <div
              className="brand"
              onClick={() => nav(user?.role === 'INSTRUCTOR' ? '/admin/reports' : '/dashboard')}
              title="VocabularyAI - Về tổng quan"
              style={{ cursor: 'pointer' }}
            >
              <BlurUpImage
                src={VI_LOGO_TRANSPARENT.file}
                alt={VI_LOGO_TRANSPARENT.alt}
                width={34}
                height={34}
                transparent
                priority
              />
              {!isSidebarCollapsed && <span className="brand-text">VocabularyAI</span>}
            </div>
          </div>

          {!isSidebarCollapsed && <div className="nav-section-label">KHÔNG GIAN HỌC</div>}

          <div className="nav-list" ref={navListRef}>
            <div className="nav-indicator" ref={indicatorRef} aria-hidden="true" />
            {tabs.map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
                end={t.end}
                className={({ isActive }) => 'nav' + (isActive ? ' on' : '')}
                title={t.label}
              >
                <span className="nic">
                  <Icon n={t.icon} s={18} />
                </span>
                {!isSidebarCollapsed && <span className="nav-label">{t.label}</span>}
              </NavLink>
            ))}

            {user?.role === 'ADMIN' && (
              <NavLink to="/admin" className="nav" title="Quản trị Admin">
                <span className="nic">
                  <Icon n="spark" s={18} />
                </span>
                {!isSidebarCollapsed && <span className="nav-label">Quản trị Admin</span>}
              </NavLink>
            )}
          </div>

          {/* Vi Companion */}
          <div className="side-coach" title="Vi nhắc: học đều mỗi ngày cùng bạn!">
            <ViMascotImage
              pose="happy-wave"
              size={38}
              priority
              alt="Vi mascot đồng hành bên thanh điều hướng"
            />
            {!isSidebarCollapsed && (
              <div className="side-coach-info">
                <span className="cdot" />
                <b>Học cùng Vi</b>
                <div className="tiny muted">15 phút mỗi ngày</div>
              </div>
            )}
          </div>

          <button
            type="button"
            className="nav"
            onClick={logout}
            title="Đăng xuất"
            style={{ flex: 'none' }}
          >
            <span className="nic">
              <Icon n="logout" s={17} />
            </span>
            {!isSidebarCollapsed && <span className="nav-label">Đăng xuất</span>}
          </button>
        </aside>

        {/* Main Workspace */}
        <div className="main">
          <header className="topbar glass">
            <div className="topbar-left">
              <button
                type="button"
                className="topbar-toggle-btn"
                onClick={toggleSidebar}
                title={isSidebarCollapsed ? 'Mở thanh bên' : 'Đóng thanh bên'}
                aria-label={isSidebarCollapsed ? 'Mở thanh bên' : 'Đóng thanh bên'}
              >
                <Icon n={isSidebarCollapsed ? 'panelLeftOpen' : 'panelLeft'} s={17} />
              </button>

              <button
                type="button"
                className="topbar-home-btn"
                onClick={handleGoHome}
                title="Về trang giới thiệu (Landing Page)"
              >
                <Icon n="home" s={16} />
                <span className="topbar-home-text">Trang chủ</span>
              </button>

              <span className="topbar-crumb">
                VocabularyAI / <strong>{pageTitle}</strong>
              </span>
            </div>

            <div className="topbar-right">
              <div
                className="statpill streak"
                title="Chuỗi ngày học liên tục (Streak)"
                onClick={() => nav('/dashboard')}
                style={{ cursor: 'pointer' }}
              >
                <Icon n="flame" s={16} />
                <span>{streak} ngày</span>
              </div>

              <NotificationBell />

              <div
                className="statpill"
                title="Từ vựng yêu thích"
                onClick={() => nav('/favorites')}
                style={{ cursor: 'pointer' }}
              >
                <span style={{ color: 'var(--danger)', display: 'inline-flex' }}>
                  <Icon n="heart" s={16} />
                </span>
                <span>{favCount}</span>
              </div>

              <button
                type="button"
                className={`statpill ${subscription?.status === 'ACTIVE' ? 'premium' : ''}`}
                onClick={() => nav('/profile')}
                title={
                  subscription?.status === 'ACTIVE'
                    ? `Gói thành viên: ${subscription.packageName || 'Premium'} (Còn ${subscription.remainingDays ?? 0} ngày)`
                    : 'Xem gói Premium 99.000đ/tháng'
                }
              >
                <Icon n={subscription?.status === 'ACTIVE' ? 'gem' : 'spark'} s={14} />
                <span>{subscription?.status === 'ACTIVE' ? '✦ PREMIUM' : 'PRO'}</span>
              </button>

              <button
                type="button"
                className="uavatar"
                onClick={() => nav('/profile')}
                title="Hồ sơ cá nhân"
                aria-label="Hồ sơ cá nhân"
              >
                {user?.avatarUrl && !user.avatarUrl.startsWith('#') ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.fullName || user.username}
                    width={34}
                    height={34}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <img
                    src={VI_APP_ICON.file}
                    alt={user?.fullName || user?.username || VI_APP_ICON.alt}
                    width={34}
                    height={34}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                )}
              </button>
            </div>
          </header>

          <OfflineBanner />

          <div className="app-pages">
            <div
              className={`glass-skeleton-overlay ${showSkeleton ? 'visible' : ''}`}
              aria-hidden="true"
            >
              <span />
              <span />
              <span />
            </div>

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

        {/* Mobile Bottom Navigation */}
        <nav className="tabbar bottom-nav glass" aria-label="Điều hướng di động">
          <NavLink to="/dashboard" end className={({ isActive }) => (isActive ? 'on' : '')}>
            <Icon n="home" s={18} />
            <span>Tổng quan</span>
          </NavLink>
          <NavLink to="/words" className={({ isActive }) => (isActive ? 'on' : '')}>
            <Icon n="book" s={18} />
            <span>Từ vựng</span>
          </NavLink>
          <NavLink to="/review" className={({ isActive }) => (isActive ? 'on' : '')}>
            <Icon n="bulb" s={18} />
            <span>Ôn tập</span>
          </NavLink>
          <NavLink to="/speaking" className={({ isActive }) => (isActive ? 'on' : '')}>
            <Icon n="mic" s={18} />
            <span>Luyện nói</span>
          </NavLink>
          <NavLink to="/profile" className={({ isActive }) => (isActive ? 'on' : '')}>
            <Icon n="user" s={18} />
            <span>Hồ sơ</span>
          </NavLink>
        </nav>
      </motion.div>
    </>
  );
}
