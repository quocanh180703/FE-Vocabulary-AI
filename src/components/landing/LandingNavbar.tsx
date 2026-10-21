import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { Mascot, Icon } from '../icons';

export function LandingNavbar() {
  const { user, logout, subscription } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const nav = useNavigate();
  const isVip = Boolean(subscription && subscription.status === 'ACTIVE');

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileOpen) {
        setMobileOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileOpen]);

  const scrollToSection = (id: string) => {
    setMobileOpen(false);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header
      className={`lp-navbar ${scrolled ? 'scrolled' : ''}`}
      role="banner"
      style={{
        boxShadow: scrolled ? '0 4px 20px -2px rgba(15, 23, 42, 0.08)' : 'none',
      }}
    >
      <div className="lp-container">
        <div className="lp-navbar-inner">
          {/* Brand Logo */}
          <a
            href="#hero"
            className="lp-brand"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            aria-label="Trang chủ VocabularyAI"
          >
            <Mascot s={36} />
            <span className="lp-brand-text">VocabularyAI</span>
            <span className="lp-brand-badge">EdTech</span>
          </a>

          {/* Desktop Nav Links */}
          <nav aria-label="Điều hướng chính" className="lp-desktop-nav">
            <ul className="lp-nav-links">
              <li>
                <a
                  href="#showcase"
                  className="lp-nav-link"
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToSection('showcase');
                  }}
                >
                  Tính năng
                </a>
              </li>
              <li>
                <a
                  href="#cefr-path"
                  className="lp-nav-link"
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToSection('cefr-path');
                  }}
                >
                  Lộ trình CEFR
                </a>
              </li>
              <li>
                <a
                  href="#ai-learning"
                  className="lp-nav-link"
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToSection('ai-learning');
                  }}
                >
                  Công nghệ AI
                </a>
              </li>
              <li>
                <a
                  href="#journey"
                  className="lp-nav-link"
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToSection('journey');
                  }}
                >
                  Quy trình học
                </a>
              </li>
              <li>
                <a
                  href="#pricing"
                  className="lp-nav-link"
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToSection('pricing');
                  }}
                >
                  Bảng giá
                </a>
              </li>
              <li>
                <a
                  href="#faq"
                  className="lp-nav-link"
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToSection('faq');
                  }}
                >
                  Hỏi đáp
                </a>
              </li>
            </ul>
          </nav>

          {/* Nav Actions (Auth aware) */}
          <div className="lp-nav-actions">
            {user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                <span
                  style={{
                    fontSize: 13.5,
                    fontWeight: 700,
                    color: 'var(--lp-text-secondary)',
                    whiteSpace: 'nowrap',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  Xin chào, <b>{user.fullName || user.username}</b>
                  {isVip && (
                    <span
                      className="sub-badge active-vip"
                      style={{ fontSize: 10.5, padding: '2px 7px', cursor: 'pointer' }}
                      onClick={() => nav('/profile')}
                      title={`Gói PRO: ${subscription?.packageName || 'Theo Tháng'}`}
                    >
                      <Icon n="gem" s={11} /> PRO
                    </span>
                  )}
                </span>
                <button
                  type="button"
                  className="lp-btn-primary"
                  onClick={() => nav('/')}
                  style={{ padding: '8px 16px', fontSize: 13.5, whiteSpace: 'nowrap', flexShrink: 0 }}
                >
                  <Icon n="spark" s={16} />
                  <span>Vào Dashboard</span>
                </button>
                <button
                  type="button"
                  className="lp-btn-login"
                  onClick={logout}
                  title="Đăng xuất"
                  style={{ padding: '8px 12px', flexShrink: 0 }}
                >
                  <Icon n="logout" s={17} />
                </button>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  className="lp-btn-login"
                  onClick={() => nav('/login')}
                >
                  <Icon n="user" s={17} />
                  Đăng nhập
                </button>
                <button
                  type="button"
                  className="lp-btn-primary"
                  onClick={() => nav('/login')}
                >
                  <span>Bắt đầu học</span>
                  <Icon n="send" s={16} />
                </button>
              </>
            )}

            {/* Mobile menu toggle */}
            <button
              type="button"
              className="lp-mobile-toggle"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-expanded={mobileOpen}
              aria-label={mobileOpen ? 'Đóng menu di động' : 'Mở menu di động'}
            >
              <Icon n={mobileOpen ? 'x' : 'dots'} s={24} />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="lp-mobile-drawer" style={{ display: 'block' }}>
          <div className="lp-mobile-links">
            <a
              href="#showcase"
              className="lp-mobile-link"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection('showcase');
              }}
            >
              🎯 Tính năng học tập
            </a>
            <a
              href="#cefr-path"
              className="lp-mobile-link"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection('cefr-path');
              }}
            >
              📚 Lộ trình 5 cấp độ CEFR
            </a>
            <a
              href="#ai-learning"
              className="lp-mobile-link"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection('ai-learning');
              }}
            >
              ✨ Công nghệ AI thông minh
            </a>
            <a
              href="#journey"
              className="lp-mobile-link"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection('journey');
              }}
            >
              🚀 Hành trình 5 bước học
            </a>
            <a
              href="#pricing"
              className="lp-mobile-link"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection('pricing');
              }}
            >
              💎 Gói thành viên & Bảng giá
            </a>
            <a
              href="#faq"
              className="lp-mobile-link"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection('faq');
              }}
            >
              ❓ Câu hỏi thường gặp
            </a>
          </div>

          <div style={{ display: 'flex', gap: 10, flexDirection: 'column' }}>
            {user ? (
              <>
                <button
                  type="button"
                  className="lp-btn-primary"
                  onClick={() => {
                    setMobileOpen(false);
                    nav('/');
                  }}
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  Vào Dashboard ({user.fullName || user.username})
                </button>
                <button
                  type="button"
                  className="lp-btn-login"
                  onClick={() => {
                    setMobileOpen(false);
                    logout();
                  }}
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  Đăng xuất
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="lp-btn-primary"
                  onClick={() => {
                    setMobileOpen(false);
                    nav('/login');
                  }}
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  Bắt đầu học ngay
                </button>
                <button
                  type="button"
                  className="lp-btn-login"
                  onClick={() => {
                    setMobileOpen(false);
                    nav('/login');
                  }}
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  Đăng nhập tài khoản
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
