import React, { useState } from 'react';
import { useUsage } from '../context/UsageContext';
import { paymentApi } from '../api';
import { Icon } from './icons';

export const UpgradeModal: React.FC = () => {
  const { modalState, closeUpgradeModal, isVip, isAtLeastHalfFreeUsage } = useUsage();
  const selectedPlan = 1; // Monthly only (99.000đ/tháng)
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!modalState.isOpen) return null;
  // Bảng này chỉ xuất hiện khi người dùng gói miễn phí sử dụng được 50% của gói miễn phí mới hiện
  if (!isVip && !isAtLeastHalfFreeUsage && !modalState.force) return null;

  const getFeatureHeadline = () => {
    const f = (modalState.feature || '').toUpperCase();
    if (f.includes('CHAT')) return 'Bạn đã dùng hết 5 lượt Chat AI hôm nay';
    if (f.includes('SPEAK')) return 'Bạn đã dùng hết 5 lượt Luyện nói chấm điểm hôm nay';
    if (f.includes('GRAMMAR')) return 'Bạn đã dùng hết 5 lượt Sửa ngữ pháp hôm nay';
    if (f.includes('EXPLAIN') || f.includes('WORD')) return 'Bạn đã dùng hết 10 lượt AI giải thích hôm nay';
    if (f.includes('ROADMAP') || f.includes('PLAN')) return 'Bạn đã dùng hết 2 lượt Tạo lộ trình hôm nay';
    if (f.includes('CEFR') || f.includes('B1') || f.includes('C1')) return 'Kho từ vựng B1–C1 dành riêng cho Premium';
    return modalState.message || 'Bạn đã đạt giới hạn gói Miễn phí hôm nay';
  };

  const handlePayOS = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await paymentApi.initiate(selectedPlan);
      const checkoutUrl = res?.checkoutUrl || res?.data?.checkoutUrl;
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      } else {
        setError('Không nhận được link thanh toán. Vui lòng thử lại!');
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Không thể tạo đơn thanh toán lúc này. Thử lại sau nhé!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(6px)',
        padding: '16px',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={closeUpgradeModal}
    >
      <div
        style={{
          maxWidth: '520px',
          width: '100%',
          backgroundColor: '#ffffff',
          borderRadius: '20px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with vibrant gold gradient banner */}
        <div
          style={{
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            padding: '24px 28px',
            color: '#ffffff',
            position: 'relative',
          }}
        >
          <button
            onClick={closeUpgradeModal}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#94a3b8',
              cursor: 'pointer',
              fontSize: '18px',
            }}
          >
            ✕
          </button>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '4px 12px', background: 'rgba(245, 158, 11, 0.2)', borderRadius: '999px', border: '1px solid rgba(245, 158, 11, 0.4)', marginBottom: '12px' }}>
            <span style={{ color: '#fbbf24', fontSize: '14px', fontWeight: 700 }}>★ PREMIUM PASS</span>
          </div>

          <h3 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 6px 0', color: '#f8fafc', lineHeight: 1.3 }}>
            {getFeatureHeadline()}
          </h3>
          <p style={{ fontSize: '14px', color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
            Nâng cấp gói Premium để mở khóa không giới hạn mọi tính năng AI và kho từ vựng. Lượt miễn phí mới sẽ mở lại lúc 00:00 đêm nay.
          </p>
        </div>

        {/* Plan selection - Single Monthly Plan */}
        <div style={{ padding: '24px 28px' }}>
          <div
            style={{
              padding: '18px 20px',
              borderRadius: '16px',
              border: '2px solid #3b82f6',
              backgroundColor: '#eff6ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px',
              boxShadow: '0 4px 14px rgba(59, 130, 246, 0.12)',
            }}
          >
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Gói Theo Tháng
                </span>
                <span
                  style={{
                    backgroundColor: '#dbeafe',
                    color: '#1e40af',
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '999px',
                    border: '1px solid #bfdbfe',
                  }}
                >
                  Gói chuẩn VIP
                </span>
              </div>
              <div style={{ fontSize: '13px', color: '#475569' }}>
                Mở khóa không giới hạn · Hủy khi nào cũng được
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '22px', fontWeight: 900, color: '#0f172a', lineHeight: 1.1 }}>
                99.000đ
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>/ tháng</div>
            </div>
          </div>

          {/* Premium Perks Checklist */}
          <div style={{ backgroundColor: '#f8fafc', borderRadius: '12px', padding: '14px 16px', marginBottom: '20px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
              Quyền lợi mở khóa ngay lập tức:
            </div>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {[
                'Không giới hạn Chat AI Gia sư 24/7',
                'Không giới hạn Luyện nói & Chấm phát âm chuyên sâu',
                'Không giới hạn Sửa ngữ pháp & Gợi ý viết câu',
                'Mở khóa toàn bộ 4.900+ từ vựng chuẩn Oxford CEFR A1–C1',
                'Lộ trình học AI cá nhân hóa & dự đoán tiến độ tự động',
              ].map((perk, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#475569' }}>
                  <span style={{ color: '#10b981', fontWeight: 700 }}>✓</span>
                  <span>{perk}</span>
                </li>
              ))}
            </ul>
          </div>

          {error && (
            <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: '#fef2f2', color: '#b91c1c', fontSize: '13px', marginBottom: '16px' }}>
              {error}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              onClick={handlePayOS}
              disabled={loading}
              style={{
                width: '100%',
                padding: '14px 20px',
                borderRadius: '12px',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                border: 'none',
                fontWeight: 700,
                fontSize: '15px',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              {loading ? (
                <span>Đang kết nối PayOS...</span>
              ) : (
                <>
                  <Icon n="spark" s={18} />
                  <span>Nâng cấp ngay qua PayOS</span>
                </>
              )}
            </button>

            <button
              onClick={closeUpgradeModal}
              disabled={loading}
              style={{
                width: '100%',
                padding: '10px 16px',
                borderRadius: '10px',
                backgroundColor: 'transparent',
                color: '#64748b',
                border: 'none',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              Để mai dùng tiếp
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
