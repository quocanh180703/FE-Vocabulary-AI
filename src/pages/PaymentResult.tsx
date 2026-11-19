import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { paymentApi } from '../api';
import { Icon } from '../components/icons';
import { SageScene } from '../components/SageEffects';
import { ViMascotImage } from '../components/ViMascotImage';
import { MotionCard, AnimatedCounter } from '../motion';

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
    if (isSuccess && orderCode) {
      paymentApi
        .verifyPayment(orderCode)
        .catch((err) => {
          console.warn('Payment verify fallback:', err);
        })
        .finally(() => {
          refreshSubscription().finally(() => {
            timer = setTimeout(() => setLoading(false), 500);
          });
        });
    } else if (isSuccess) {
      refreshSubscription().finally(() => {
        timer = setTimeout(() => setLoading(false), 500);
      });
    } else {
      setLoading(false);
    }
    return () => clearTimeout(timer);
  }, [isSuccess, orderCode]);

  if (loading) {
    return (
      <div className="auth" style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <SageScene />
        <div className="paycard" style={{ position: 'relative', zIndex: 1, maxWidth: 420, padding: '32px 24px' }}>
          <ViMascotImage pose="thinking" size={72} priority alt="Vi đang xác thực giao dịch PayOS" />
          <h2 style={{ fontSize: 20, fontWeight: 800, marginTop: 14 }}>Đang cập nhật gói học...</h2>
          <p className="sub" style={{ marginTop: 6 }}>Hệ thống đang đồng bộ dữ liệu với cổng thanh toán PayOS.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth" style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <SageScene />
      <MotionCard className="paycard" style={{ position: 'relative', zIndex: 1 }}>
        {isSuccess ? (
          <>
            <ViMascotImage
              pose="celebrate"
              animated
              size={96}
              priority
              alt="Vi ăn mừng kích hoạt gói Premium PayOS thành công"
            />
            <div className="mt12">
              <span className="pill warn" style={{ fontSize: 13, padding: '6px 14px' }}>
                <Icon n="gem" s={14} /> Gói Premium Đã Kích Hoạt
              </span>
            </div>
            <h1 style={{ marginTop: 10 }}>Thanh toán thành công!</h1>
            <p className="sub" style={{ marginTop: 8, lineHeight: 1.6 }}>
              Chúc mừng bạn đã nâng cấp thành công gói hội viên <b style={{ color: 'var(--ink)' }}>VocabularyAI Premium</b>. Toàn bộ kho từ vựng và gia sư AI đã sẵn sàng!
            </p>

            <div style={{ textAlign: 'left', marginTop: 18 }}>
              <div className="kv">
                <span>Gói đã mua</span>
                <b>{subscription?.packageName || 'Gói Theo Tháng — Premium'}</b>
              </div>
              {orderCode && (
                <div className="kv">
                  <span>Mã giao dịch</span>
                  <b>#{orderCode}</b>
                </div>
              )}
              <div className="kv">
                <span>Cổng thanh toán</span>
                <b>PayOS Checkout (QR Ngân Hàng)</b>
              </div>
              <div className="kv">
                <span>Thời hạn còn lại</span>
                <b><AnimatedCounter value={subscription?.remainingDays ?? 30} /> ngày</b>
              </div>
            </div>

            <button
              type="button"
              className="btn block"
              style={{ marginTop: 20 }}
              onClick={() => nav('/dashboard')}
            >
              Vào học ngay
            </button>
            <div className="center" style={{ marginTop: 12 }}>
              <button
                type="button"
                className="btn ghost sm"
                onClick={() => nav('/profile')}
              >
                Xem chi tiết gói cước
              </button>
            </div>
          </>
        ) : (
          <>
            <ViMascotImage
              pose="surprised"
              size={90}
              priority
              alt="Vi thông báo giao dịch PayOS chưa hoàn tất"
            />
            <h1 style={{ marginTop: 12 }}>Thanh toán chưa hoàn tất</h1>
            <p className="sub" style={{ marginTop: 8, lineHeight: 1.6 }}>
              Giao dịch đã bị hủy hoặc hết thời gian chờ nên gói Premium <b style={{ color: 'var(--ink)' }}>chưa được kích hoạt</b>. Bạn không bị trừ tiền cho giao dịch này.
            </p>

            <button
              type="button"
              className="btn amber block"
              style={{ marginTop: 20 }}
              onClick={() => nav('/profile')}
            >
              Thử thanh toán lại
            </button>
            <div className="center" style={{ marginTop: 12 }}>
              <button
                type="button"
                className="btn ghost sm"
                onClick={() => nav('/dashboard')}
              >
                Về trang Tổng quan
              </button>
            </div>
          </>
        )}
      </MotionCard>
    </div>
  );
}
