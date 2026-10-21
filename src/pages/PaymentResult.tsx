import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Icon } from '../components/icons';

export default function PaymentResult() {
  const [searchParams] = useSearchParams();
  const nav = useNavigate();
  const location = useLocation();
  const { subscription, refreshSubscription } = useAuth();
  const [loading, setLoading] = useState(true);

  const orderCode = searchParams.get('orderCode') || searchParams.get('orderId');
  const statusParam = searchParams.get('status');
  const cancelParam = searchParams.get('cancel');
  const codeParam = searchParams.get('code');

  const isSuccess =
    location.pathname.includes('/success') ||
    statusParam === 'PAID' ||
    (codeParam === '00' && cancelParam !== 'true');

  useEffect(() => {
    let timer: any;
    if (isSuccess) {
      // Refresh user subscription status from backend
      refreshSubscription().finally(() => {
        timer = setTimeout(() => setLoading(false), 500);
      });
    } else {
      setLoading(false);
    }
    return () => clearTimeout(timer);
  }, [isSuccess]);

  if (loading) {
    return (
      <div className="content narrow" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="sub-badge active-vip" style={{ animation: 'pulse-glow 1.5s infinite', padding: '8px 20px', fontSize: 14 }}>
            <Icon n="spark" s={16} /> Đang cập nhật trạng thái gói học tập...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="content narrow" style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: 580,
          textAlign: 'center',
          padding: '40px 32px',
          boxShadow: '0 20px 50px rgba(15, 23, 42, 0.08)',
          borderRadius: 24,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {isSuccess ? (
          <>
            {/* Top decorative gradient bar */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 6,
                background: 'linear-gradient(90deg, #10B981 0%, #6366F1 50%, #A855F7 100%)',
              }}
            />

            <div style={{ margin: '0 auto 16px', display: 'inline-flex' }}>
              <div
                style={{
                  width: 76,
                  height: 76,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #DCFCE7 0%, #BBF7D0 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 8px 24px rgba(34, 197, 94, 0.25)',
                  color: '#15803D',
                }}
              >
                <Icon n="check" s={38} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <span className="sub-badge active-vip" style={{ marginBottom: 12, fontSize: 13, padding: '5px 14px' }}>
                <Icon n="gem" s={14} /> Gói VIP Đã Kích Hoạt
              </span>
            </div>

            <h1 style={{ fontSize: 26, fontWeight: 900, margin: '8px 0', color: 'var(--ink)' }}>
              Thanh toán thành công!
            </h1>
            <p className="sub" style={{ fontSize: 15, maxWidth: 460, margin: '0 auto 24px', lineHeight: 1.6 }}>
              Chúc mừng bạn đã nâng cấp thành công gói hội viên <b>VocabAI Premium</b>. Toàn bộ kho từ vựng và gia sư AI Gemini đã sẵn sàng!
            </p>

            {/* Order & Subscription Details Card */}
            <div
              style={{
                background: 'linear-gradient(180deg, #F8FAFC 0%, #F1F5F9 100%)',
                border: '1.5px solid #E2E8F0',
                borderRadius: 16,
                padding: '20px',
                textAlign: 'left',
                margin: '0 auto 28px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #E2E8F0' }}>
                <span className="sub" style={{ fontSize: 13.5 }}>Gói đã đăng ký:</span>
                <b style={{ color: '#6B21A8' }}>{subscription?.packageName || 'Gói Theo Tháng (30 ngày)'}</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #E2E8F0' }}>
                <span className="sub" style={{ fontSize: 13.5 }}>Trạng thái kích hoạt:</span>
                <b style={{ color: '#15803D', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span className="dot g" /> Đang hoạt động
                </b>
              </div>
              {orderCode && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #E2E8F0' }}>
                  <span className="sub" style={{ fontSize: 13.5 }}>Mã giao dịch PayOS:</span>
                  <b style={{ fontFamily: 'monospace', color: 'var(--ink)' }}>#{orderCode}</b>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                <span className="sub" style={{ fontSize: 13.5 }}>Cổng thanh toán:</span>
                <b style={{ color: '#2563EB' }}>PayOS Checkout (QR Ngân Hàng)</b>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn ghost"
                style={{ minHeight: 46, padding: '0 22px', fontSize: 14.5 }}
                onClick={() => nav('/profile')}
              >
                <Icon n="user" s={18} />
                Xem hồ sơ cá nhân
              </button>
              <button
                type="button"
                className="btn"
                style={{
                  minHeight: 46,
                  padding: '0 28px',
                  fontSize: 15,
                  background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
                  boxShadow: '0 4px 16px rgba(124, 58, 237, 0.35)',
                }}
                onClick={() => nav('/dashboard')}
              >
                <Icon n="spark" s={18} />
                Bắt đầu học ngay
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Top red bar for cancel */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 6,
                background: 'linear-gradient(90deg, #F59E0B 0%, #EF4444 100%)',
              }}
            />

            <div style={{ margin: '0 auto 16px', display: 'inline-flex' }}>
              <div
                style={{
                  width: 76,
                  height: 76,
                  borderRadius: '50%',
                  background: '#FEF2F2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 8px 24px rgba(239, 68, 68, 0.2)',
                  color: '#DC2626',
                }}
              >
                <Icon n="x" s={38} />
              </div>
            </div>

            <h1 style={{ fontSize: 26, fontWeight: 900, margin: '8px 0', color: 'var(--ink)' }}>
              Đơn thanh toán chưa hoàn tất
            </h1>
            <p className="sub" style={{ fontSize: 15, maxWidth: 460, margin: '0 auto 24px', lineHeight: 1.6 }}>
              Giao dịch thanh toán qua cổng PayOS đã bị dừng lại hoặc chưa hoàn thành. Tài khoản của bạn hiện vẫn ở gói Miễn Phí.
            </p>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn ghost"
                style={{ minHeight: 46, padding: '0 20px', fontSize: 14.5 }}
                onClick={() => nav('/dashboard')}
              >
                <Icon n="home" s={18} />
                Về trang chủ
              </button>
              <button
                type="button"
                className="btn"
                style={{ minHeight: 46, padding: '0 24px', fontSize: 15 }}
                onClick={() => nav('/profile')}
              >
                <Icon n="gem" s={18} />
                Xem gói & Thử lại
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
