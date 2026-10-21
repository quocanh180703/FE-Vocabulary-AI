import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Icon, Mascot } from './icons';
import { AnimatePresence } from 'motion/react';
import { PageTransition } from '../motion';
import { ErrorBoundary } from './ErrorBoundary';

const ADMIN_TABS = [
  { to: '/admin', label: 'Tổng quan Hệ thống', icon: 'home' as const, end: true },
  { to: '/admin/users', label: 'Quản lý Học viên', icon: 'user' as const },
  { to: '/admin/words', label: 'Từ vựng & CEFR', icon: 'book' as const },
  { to: '/admin/quizzes', label: 'Quản lý Trắc nghiệm', icon: 'zap' as const },
  { to: '/admin/reports', label: 'Báo cáo & Thống kê', icon: 'chart' as const },
  { to: '/admin/ai-assistant', label: 'Trợ lý AI & Giám sát', icon: 'spark' as const, badge: 'AI' },
];

export function AdminLayout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const location = useLocation();

  const currentTab = ADMIN_TABS.find((t) =>
    t.end ? location.pathname === t.to : location.pathname.startsWith(t.to)
  );

  return (
    <div className="web admin-web" style={{ background: '#F8FAFC' }}>
      {/* Modernized Dark-Indigo Sidebar */}
      <aside
        className="sidebar admin-sidebar"
        style={{
          background: 'linear-gradient(180deg, #0F172A 0%, #17183B 50%, #1E1B4B 100%)',
          borderColor: '#1E293B',
          color: '#F8FAFC',
          boxShadow: '4px 0 24px rgba(15, 23, 42, 0.2)',
          zIndex: 30,
        }}
      >
        {/* Brand Link */}
        <div
          className="brand"
          onClick={() => nav('/admin')}
          style={{
            cursor: 'pointer',
            color: '#FFFFFF',
            padding: '10px 12px 20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            marginBottom: 12,
          }}
        >
          <div style={{ position: 'relative' }}>
            <Mascot s={40} />
            <span
              style={{
                position: 'absolute',
                bottom: -2,
                right: -2,
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: '#10B981',
                border: '2px solid #0F172A',
                boxShadow: '0 0 8px #10B981',
              }}
            />
          </div>
          <div>
            <div
              style={{
                fontWeight: 900,
                fontSize: '1.15rem',
                letterSpacing: '-0.5px',
                background: 'linear-gradient(135deg, #FFFFFF 0%, #E0E7FF 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              VocabularyAI
            </div>
            <span
              style={{
                display: 'inline-block',
                fontSize: '0.65rem',
                fontWeight: 800,
                color: '#A5B4FC',
                background: 'rgba(99, 102, 241, 0.25)',
                border: '1px solid rgba(165, 180, 252, 0.3)',
                padding: '2px 8px',
                borderRadius: 20,
                textTransform: 'uppercase',
                letterSpacing: '0.6px',
                marginTop: 2,
              }}
            >
              Admin Portal
            </span>
          </div>
        </div>

        {/* Section Header */}
        <div
          style={{
            marginTop: 4,
            marginBottom: 8,
            paddingLeft: 12,
            fontSize: '0.72rem',
            fontWeight: 800,
            color: '#64748B',
            textTransform: 'uppercase',
            letterSpacing: '0.9px',
          }}
        >
          Mô-Đun Quản Trị
        </div>

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {ADMIN_TABS.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className={({ isActive }) => 'nav' + (isActive ? ' on admin-on' : '')}
              style={({ isActive }) => ({
                color: isActive ? '#FFFFFF' : '#94A3B8',
                background: isActive
                  ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.28) 0%, rgba(139, 92, 246, 0.22) 100%)'
                  : 'transparent',
                borderColor: isActive ? 'rgba(99, 102, 241, 0.6)' : 'transparent',
                boxShadow: isActive ? '0 4px 14px rgba(79, 70, 229, 0.25)' : 'none',
                fontWeight: isActive ? 800 : 700,
                position: 'relative',
                borderRadius: 12,
                padding: '11px 14px',
              })}
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span
                      style={{
                        position: 'absolute',
                        left: -12,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: 4,
                        height: 22,
                        borderRadius: '0 4px 4px 0',
                        background: '#6366F1',
                        boxShadow: '0 0 10px #6366F1',
                      }}
                    />
                  )}
                  <Icon n={t.icon} s={20} />
                  <span style={{ flex: 1 }}>{t.label}</span>
                  {('badge' in t) && t.badge && (
                    <span
                      style={{
                        fontSize: '0.65rem',
                        fontWeight: 900,
                        background: 'linear-gradient(135deg, #EC4899 0%, #8B5CF6 100%)',
                        color: '#FFFFFF',
                        padding: '1px 6px',
                        borderRadius: 6,
                        marginRight: 4,
                        letterSpacing: '0.5px',
                        boxShadow: '0 2px 8px rgba(236, 72, 153, 0.4)',
                      }}
                    >
                      {t.badge}
                    </span>
                  )}
                  {isActive && (
                    <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>›</span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>

        {/* Sidebar Footer */}
        <div
          style={{
            marginTop: 'auto',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            paddingTop: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <button
            className="nav"
            onClick={() => nav('/')}
            style={{
              width: '100%',
              background: 'rgba(30, 41, 59, 0.9)',
              color: '#38BDF8',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              fontWeight: 700,
              fontSize: '0.88rem',
              borderRadius: 12,
              justifyContent: 'center',
            }}
          >
            <Icon n="spark" s={18} />
            Về giao diện Học viên
          </button>
          <button
            className="nav"
            onClick={logout}
            style={{
              width: '100%',
              color: '#F87171',
              background: 'transparent',
              fontWeight: 700,
              borderRadius: 12,
              padding: '10px 14px',
            }}
          >
            <Icon n="logout" s={18} />
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="main admin-main" style={{ background: '#F8FAFC', minHeight: '100vh' }}>
        {/* Topbar with Glassmorphism */}
        <div
          className="topbar admin-topbar"
          style={{
            background: 'rgba(255, 255, 255, 0.92)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderColor: '#E2E8F0',
            padding: '12px 32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 20,
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
          }}
        >
          {/* Breadcrumb / Title Info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              type="button"
              className="topbar-home-btn"
              onClick={() => nav('/landing')}
              title="Về trang giới thiệu (Landing Page)"
              style={{
                marginRight: 0,
                padding: '6px 12px',
                fontSize: 13,
                borderColor: '#E2E8F0',
                background: '#FFFFFF',
              }}
            >
              <Icon n="home" s={16} />
              <span className="topbar-home-text">Landing Page</span>
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.92rem' }}>
              <span style={{ color: '#64748B', fontWeight: 600 }}>Portal Quản Trị</span>
              <span style={{ color: '#CBD5E1' }}>/</span>
              <span style={{ color: '#0F172A', fontWeight: 800 }}>
                {currentTab?.label || 'Tổng quan'}
              </span>
            </div>

            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: '#ECFDF5',
                color: '#059669',
                border: '1px solid #A7F3D0',
                padding: '4px 12px',
                borderRadius: 20,
                fontSize: '0.78rem',
                fontWeight: 700,
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: '#10B981',
                  boxShadow: '0 0 6px #10B981',
                }}
              />
              Hệ thống 200 OK • Sẵn sàng
            </span>
          </div>

          {/* Admin User Profile */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0F172A' }}>
                {user?.fullName || user?.username || 'Administrator'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, marginTop: 2 }}>
                <span
                  style={{
                    fontSize: '0.7rem',
                    color: '#4F46E5',
                    background: '#EEF2FF',
                    padding: '1px 6px',
                    borderRadius: 6,
                    fontWeight: 800,
                  }}
                >
                  ADMIN ROLE
                </span>
                <span style={{ fontSize: '0.74rem', color: '#64748B' }}>
                  {user?.email || 'admin@vocabularyai.vn'}
                </span>
              </div>
            </div>

            <div
              className="uavatar"
              style={{
                background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
                color: '#FFFFFF',
                width: 42,
                height: 42,
                borderRadius: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '1.05rem',
                boxShadow: '0 4px 14px rgba(79, 70, 229, 0.35)',
                border: '2px solid #FFFFFF',
              }}
            >
              {(user?.fullName || user?.username || 'A')[0].toUpperCase()}
            </div>
          </div>
        </div>

        {/* Content Outlet */}
        <div style={{ padding: '28px 32px' }}>
          <ErrorBoundary>
            <AnimatePresence mode="wait">
              <PageTransition key={location.pathname}>
                <Outlet />
              </PageTransition>
            </AnimatePresence>
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
}
