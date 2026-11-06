import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationApi } from '../api';
import type { InAppNotification } from '../api';
import { Icon } from './icons';

function timeAgo(dateString: string): string {
  try {
    const now = new Date();
    const past = new Date(dateString);
    const diffMs = now.getTime() - past.getTime();
    if (diffMs < 0) return 'Vừa xong';
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return 'Vừa xong';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} phút trước`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour} giờ trước`;
    const diffDays = Math.floor(diffHour / 24);
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return past.toLocaleDateString('vi-VN');
  } catch {
    return '';
  }
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);
  const nav = useNavigate();

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await notificationApi.list({ page: 0, size: 8 });
      setNotifications(res.content || []);
      setUnreadCount(res.unreadCount || 0);
    } catch (err) {
      console.warn('Lỗi khi tải thông báo:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll every 45s for fresh notifications
    const timer = setInterval(fetchNotifications, 45000);
    return () => clearInterval(timer);
  }, []);

  // Close when clicked outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  const handleToggle = () => {
    const next = !open;
    setOpen(next);
    if (next) {
      fetchNotifications();
    }
  };

  const handleRead = async (item: InAppNotification) => {
    if (!item.isRead) {
      try {
        await notificationApi.read(item.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch (err) {
        console.error(err);
      }
    }
    setOpen(false);
    if (item.link) {
      nav(item.link);
    }
  };

  const handleReadAll = async () => {
    try {
      await notificationApi.readAll();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div ref={bellRef} style={{ position: 'relative' }}>
      <button
        type="button"
        className="statpill"
        onClick={handleToggle}
        title="Thông báo hệ thống"
        style={{
          cursor: 'pointer',
          position: 'relative',
          padding: '6px 10px',
          border: 'none',
          background: open ? 'var(--bg-subtle, #f1f5f9)' : 'transparent',
          borderRadius: 20,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span style={{ color: unreadCount > 0 ? 'var(--primary, #3b82f6)' : 'var(--text-muted, #64748b)' }}>
          <Icon n="bell" s={19} />
        </span>
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: -2,
              right: -2,
              background: '#ef4444',
              color: '#ffffff',
              fontSize: 10,
              fontWeight: 700,
              minWidth: 17,
              height: 17,
              borderRadius: 9,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 4px',
              border: '2px solid #ffffff',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: 340,
            maxWidth: '90vw',
            background: 'var(--bg-card, #ffffff)',
            borderRadius: 14,
            boxShadow: '0 12px 32px rgba(15, 23, 42, 0.16), 0 4px 12px rgba(15, 23, 42, 0.08)',
            border: '1px solid var(--border-color, #e2e8f0)',
            zIndex: 1000,
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderBottom: '1px solid var(--border-color, #f1f5f9)',
              background: 'var(--bg-subtle, #f8fafc)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-main, #0f172a)' }}>
                Thông báo
              </span>
              {unreadCount > 0 && (
                <span
                  style={{
                    background: 'rgba(59, 130, 246, 0.12)',
                    color: '#2563eb',
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: 10,
                  }}
                >
                  {unreadCount} mới
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleReadAll}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--primary, #2563eb)',
                  fontSize: 12,
                  cursor: 'pointer',
                  fontWeight: 600,
                  padding: 0,
                }}
              >
                Đọc tất cả
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ maxHeight: 380, overflowY: 'auto' }}>
            {loading && notifications.length === 0 ? (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                Đang tải thông báo...
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: '36px 16px', textAlign: 'center', color: '#94a3b8' }}>
                <div style={{ opacity: 0.35, marginBottom: 8, display: 'inline-block' }}>
                  <Icon n="bell" s={32} />
                </div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>Bạn chưa có thông báo nào</div>
              </div>
            ) : (
              notifications.map((n) => {
                const isApproved = n.type === 'EXERCISE_APPROVED';
                const isRejected = n.type === 'EXERCISE_REJECTED';
                const isPending = n.type === 'EXERCISE_PENDING_REVIEW';

                let iconColor = '#3b82f6';
                let iconBg = 'rgba(59, 130, 246, 0.1)';
                if (isApproved) {
                  iconColor = '#10b981';
                  iconBg = 'rgba(16, 185, 129, 0.1)';
                } else if (isRejected) {
                  iconColor = '#ef4444';
                  iconBg = 'rgba(239, 68, 68, 0.1)';
                } else if (isPending) {
                  iconColor = '#f59e0b';
                  iconBg = 'rgba(245, 158, 11, 0.1)';
                }

                return (
                  <div
                    key={n.id}
                    onClick={() => handleRead(n)}
                    style={{
                      display: 'flex',
                      gap: 12,
                      padding: '12px 14px',
                      cursor: 'pointer',
                      borderBottom: '1px solid var(--border-color, #f8fafc)',
                      background: n.isRead ? 'transparent' : 'rgba(59, 130, 246, 0.04)',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = n.isRead ? 'rgba(0,0,0,0.02)' : 'rgba(59, 130, 246, 0.08)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = n.isRead ? 'transparent' : 'rgba(59, 130, 246, 0.04)';
                    }}
                  >
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: '50%',
                        background: iconBg,
                        color: iconColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginTop: 2,
                      }}
                    >
                      <Icon n={isApproved ? 'check' : isRejected ? 'close' : isPending ? 'zap' : 'bell'} s={16} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: n.isRead ? 600 : 700,
                          color: 'var(--text-main, #0f172a)',
                          marginBottom: 3,
                          lineHeight: 1.3,
                        }}
                      >
                        {n.title}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: 'var(--text-sub, #475569)',
                          lineHeight: 1.4,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {n.content}
                      </div>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                        {timeAgo(n.createdAt)}
                      </div>
                    </div>
                    {!n.isRead && (
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: '#3b82f6',
                          flexShrink: 0,
                          marginTop: 6,
                        }}
                      />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

