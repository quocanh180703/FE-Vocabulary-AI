import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useUsage } from '../context/UsageContext';
import { paymentApi } from '../api';
import { Icon } from './icons';
import { modalVariants, backdropVariants } from '../motion';

export const UpgradeModal: React.FC = () => {
  const { modalState, closeUpgradeModal, isVip, isAtLeastHalfFreeUsage } = useUsage();
  const selectedPlan = 1; // Monthly only (99.000đ/tháng)
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOpen = modalState.isOpen && (isVip || isAtLeastHalfFreeUsage || Boolean(modalState.force));

  const getFeatureHeadline = () => {
    const f = (modalState.feature || '').toUpperCase();
    if (f.includes('CHAT')) return 'Bạn đã dùng hết 5 lượt Chat AI hôm nay';
    if (f.includes('SPEAK')) return 'Bạn đã dùng hết 5 lượt Luyện nói chấm điểm hôm nay';
    if (f.includes('LISTEN')) return 'Bạn đã dùng hết 5 lượt Luyện nghe hôm nay';
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
    <AnimatePresence>
      {isOpen && (
        <motion.div
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(16, 36, 24, 0.56)',
            backdropFilter: 'blur(8px)',
            padding: '16px',
          }}
          onClick={closeUpgradeModal}
        >
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
        style={{
          maxWidth: '520px',
          width: '100%',
          backgroundColor: 'var(--glass-strong)',
          backdropFilter: 'blur(26px)',
          borderRadius: '28px',
          boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden',
          border: '1px solid var(--rim)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with deep-sage Sage Thư Viện banner */}
        <div
          style={{
            background: 'linear-gradient(135deg, #1d382c 0%, #34563f 100%)',
            padding: '24px 28px',
            color: 'var(--cream)',
            position: 'relative',
          }}
        >
          <button
            onClick={closeUpgradeModal}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              background: 'rgba(250, 248, 241, 0.14)',
              border: '1px solid rgba(250, 248, 241, 0.25)',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--cream)',
              cursor: 'pointer',
              fontSize: '16px',
            }}
          >
            ✕
          </button>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '4px 12px', background: 'rgba(201, 134, 47, 0.2)', borderRadius: '999px', border: '1px solid rgba(201, 134, 47, 0.45)', marginBottom: '12px' }}>
            <span style={{ color: '#f3c683', fontSize: '13px', fontWeight: 700 }}>✦ PREMIUM</span>
          </div>

          <h3 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 6px 0', color: 'var(--cream)', lineHeight: 1.3 }}>
            {getFeatureHeadline()}
          </h3>
          <p style={{ fontSize: '13.5px', color: 'rgba(250, 248, 241, 0.85)', margin: 0, lineHeight: 1.5 }}>
            Nâng cấp gói Premium để mở khóa không giới hạn mọi tính năng AI và kho từ vựng. Lượt miễn phí mới sẽ mở lại lúc 00:00 đêm nay.
          </p>
        </div>

        {/* Plan selection - Single Monthly Plan */}
        <div style={{ padding: '24px 28px' }}>
          <div
            style={{
              padding: '18px 20px',
              borderRadius: '20px',
              border: '2px solid var(--sage)',
              backgroundColor: 'rgba(250, 248, 241, 0.85)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '18px',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--sage)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Gói Theo Tháng
                </span>
                <span
                  style={{
                    backgroundColor: 'var(--amber-bg)',
                    color: 'var(--amber-dark)',
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '999px',
                    border: '1px solid rgba(201, 134, 47, 0.35)',
                  }}
                >
                  Thanh toán PayOS
                </span>
              </div>
              <div style={{ fontSize: '13px', color: 'var(--muted)' }}>
                Mở khóa không giới hạn · Hủy khi nào cũng được
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--ink)', lineHeight: 1.1 }}>
                99.000đ
              </div>
              <div style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600 }}>/ tháng</div>
            </div>
          </div>

          {/* Premium Perks Checklist */}
          <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.58)', borderRadius: '14px', padding: '14px 16px', marginBottom: '18px', border: '1px solid var(--line)' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ink)', marginBottom: '8px' }}>
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
                <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--ink)' }}>
                  <span style={{ color: 'var(--sage)', fontWeight: 800 }}>✓</span>
                  <span>{perk}</span>
                </li>
              ))}
            </ul>
          </div>

          {error && (
            <div className="error" style={{ marginBottom: '14px' }}>
              {error}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              onClick={handlePayOS}
              disabled={loading}
              className="btn block"
              style={{ padding: '13px 20px', fontSize: '14.5px' }}
            >
              {loading ? (
                <span>Đang kết nối PayOS...</span>
              ) : (
                <>
                  <Icon n="spark" s={17} />
                  <span>Nâng cấp ngay qua PayOS</span>
                </>
              )}
            </button>

            <button
              onClick={closeUpgradeModal}
              disabled={loading}
              className="btn ghost block"
              style={{ padding: '10px 16px' }}
            >
              Để mai dùng tiếp
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
    )}
  </AnimatePresence>
  );
};
