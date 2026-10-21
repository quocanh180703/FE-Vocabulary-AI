import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { wordApi, learnApi } from '../api';
import { Icon, Mascot } from './icons';
import { AnimatePresence } from 'motion/react';
import { PageTransition } from '../motion';
import { ErrorBoundary } from './ErrorBoundary';

const TABS = [
  { to: '/dashboard', label: 'Tổng quan', icon: 'home' as const, end: true },
  { to: '/words', label: 'Từ vựng', icon: 'book' as const },
  { to: '/review', label: 'Ôn tập', icon: 'bulb' as const },
  { to: '/roadmap', label: 'Lộ trình AI', icon: 'chart' as const },
  { to: '/quiz', label: 'Trắc nghiệm', icon: 'zap' as const },
  { to: '/grammar', label: 'Sửa ngữ pháp', icon: 'spark' as const },
  { to: '/chat', label: 'Trò chuyện AI', icon: 'msg' as const },
  { to: '/speaking', label: 'Luyện nói', icon: 'mic' as const },
  { to: '/profile', label: 'Cá nhân', icon: 'user' as const },
];

export function Layout() {
  const { user, subscription, logout } = useAuth();
  const [favCount, setFavCount] = useState(0);
  const [streak, setStreak] = useState<number>(0);
  const [points, setPoints] = useState<number>(0);
  const nav = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const syncFav = () => {
      wordApi.favorites(0, 100)
        .then(({ data }) => {
          const set = new Set([...data.content.map((w) => String(w.id)), ...(data.localIds || [])]);
          setFavCount(set.size);
        })
        .catch(() => {});
    };

    const syncStats = () => {
      learnApi.stats()
        .then(({ data }) => {
          if (data) {
            setStreak(data.currentStreak ?? 0);
            setPoints(data.totalPoints ?? 0);
          }
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
  }, []);

  return (
    <div className="web">
      <aside className="sidebar">
        <div className="brand" onClick={() => nav('/dashboard')} style={{ cursor: 'pointer' }}>
          <Mascot s={38} />VocabularyAI
        </div>
        {TABS.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => 'nav' + (isActive ? ' on' : '')}>
            <Icon n={t.icon} s={22} />{t.label}
          </NavLink>
        ))}
        {user?.role === 'ADMIN' && (
          <NavLink
            to="/admin"
            className="nav"
            style={{
              marginTop: 10,
              background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.12), rgba(124, 58, 237, 0.12))',
              border: '1px solid rgba(99, 102, 241, 0.35)',
              color: '#4f46e5',
              fontWeight: 700,
              borderRadius: 12
            }}
          >
            <Icon n="spark" s={20} />Quản trị Admin
          </NavLink>
        )}
        <div className="side-coach" style={{ marginTop: 'auto' }}>
          <Mascot s={40} />
          <div><span className="dot"></span><b>Vi nhắc:</b> duy trì streak mỗi ngày nhé!</div>
        </div>
        <button className="nav" onClick={logout} style={{ marginTop: 8 }}>
          <Icon n="logout" s={22} />Đăng xuất
        </button>
      </aside>
      <div className="main">
        <div className="topbar">
          <button
            type="button"
            className="topbar-home-btn"
            onClick={() => nav('/landing')}
            title="Về trang giới thiệu (Landing Page)"
          >
            <Icon n="home" s={18} />
            <span className="topbar-home-text">Trang chủ</span>
          </button>
          <div
            className="stat"
            title="Chuỗi ngày học liên tục (Streak)"
            onClick={() => nav('/dashboard')}
            style={{ cursor: 'pointer' }}
          >
            <Icon n="flame" s={18} />
            <span style={{ color: '#B57F1F', fontWeight: 700 }}>{streak}</span>
          </div>
          <div className="stat" title="Điểm kim cương tích lũy">
            <Icon n="gem" s={18} />
            <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{points}</span>
          </div>
          <div
            className="stat"
            title="Từ vựng yêu thích"
            onClick={() => nav('/favorites')}
            style={{ cursor: 'pointer' }}
          >
            <Icon n="heart" s={18} />
            <span style={{ color: 'var(--red)' }}>{favCount}</span>
          </div>

          {/* User Membership Status Pill */}
          {subscription?.status === 'ACTIVE' ? (
            <button
              type="button"
              className="topbar-plan-pill vip"
              onClick={() => nav('/profile')}
              title={`Gói thành viên: ${subscription.packageName || 'Gói Theo Tháng'} (Còn ${subscription.remainingDays ?? 0} ngày). Bấm để xem chi tiết.`}
            >
              <Icon n="gem" s={15} />
              <span>PRO</span>
            </button>
          ) : (
            <button
              type="button"
              className="topbar-plan-pill free"
              onClick={() => nav('/profile')}
              title="Bạn đang dùng gói Miễn Phí. Bấm để xem ưu đãi nâng cấp VIP!"
            >
              <Icon n="spark" s={15} />
              <span>Nâng cấp VIP</span>
            </button>
          )}

          <div className="uavatar" onClick={() => nav('/profile')} style={{ cursor: 'pointer' }} title="Hồ sơ cá nhân">
            {(user?.username || 'U')[0].toUpperCase()}
          </div>
        </div>
        <ErrorBoundary>
          <AnimatePresence mode="wait">
            <PageTransition key={location.pathname}>
              <Outlet />
            </PageTransition>
          </AnimatePresence>
        </ErrorBoundary>
      </div>
    </div>
  );
}

