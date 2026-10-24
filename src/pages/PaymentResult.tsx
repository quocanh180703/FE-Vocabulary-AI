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
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div className="paycard" style={{ maxWidth: '420px', padding: '36px 28px' }}>
          <div className="grading-spin" style={{ display: 'inline-flex', color: 'var(--primary)' }}>
            <Icon n="spark" s={36} />
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 900, marginTop: '16px' }}>Đang cập nhật gói học...</h2>
          <p className="sub" style={{ marginTop: '6px' }}>Hệ thống đang đồng bộ dữ liệu với cổng thanh toán PayOS.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div className="paycard">
        {isSuccess ? (
          <>
            <div className="bigcheck">
              <svg viewBox="0 0 24 24" className="ic" style={{ width: '44px', height: '44px' }}>
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>
            <div className="mt16">
              <span className="pill level" style={{ fontSize: '13.5px', padding: '7px 14px' }}>
                <Icon n="gem" s={15} /> Gói VIP Đã Kích Hoạt
              </span>
            </div>
            <h1>Thanh toán thành công!</h1>
            <p className="sub" style={{ marginTop: '10px', lineHeight: 1.65 }}>
              Chúc mừng bạn đã nâng cấp thành công gói hội viên <b style={{ color: 'var(--ink)' }}>VocabularyAI Premium</b>. Toàn bộ kho từ vựng và gia sư AI đã sẵn sàng!
            </p>

            <div style={{ textAlign: 'left', marginTop: '22px' }}>
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
                <b>{subscription?.remainingDays ? `${subscription.remainingDays} ngày` : '30 ngày'}</b>
              </div>
            </div>

            <button
              type="button"
              className="btn block"
              style={{ marginTop: '24px', minHeight: '54px' }}
              onClick={() => nav('/dashboard')}
            >
              Vào học ngay
            </button>
            <div className="center" style={{ marginTop: '14px' }}>
              <button
                type="button"
                className="link"
                onClick={() => nav('/profile')}
              >
                Xem chi tiết gói cước
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="bigcheck" style={{ background: 'var(--yellow-bg)', color: 'var(--yellow-dark)' }}>
              <svg viewBox="0 0 24 24" className="ic" style={{ width: '44px', height: '44px' }}>
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8v5" />
                <path d="M12 16.5v.5" />
              </svg>
            </div>
            <h1>Thanh toán chưa hoàn tất</h1>
            <p className="sub" style={{ marginTop: '10px', lineHeight: 1.65 }}>
              Giao dịch đã bị hủy hoặc hết thời gian chờ nên gói Premium <b style={{ color: 'var(--ink)' }}>chưa được kích hoạt</b>. Bạn không bị trừ tiền cho giao dịch này.
            </p>

            <button
              type="button"
              className="btn block"
              style={{ marginTop: '24px', minHeight: '54px' }}
              onClick={() => nav('/profile')}
            >
              Thử thanh toán lại
            </button>
            <div className="center" style={{ marginTop: '14px' }}>
              <button
                type="button"
                className="link"
                onClick={() => nav('/dashboard')}
              >
                Về trang Tổng quan
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
