import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../icons';
import { AnimatedSection } from '../../animations/AnimatedSection';
import { paymentApi, type SubscriptionPackage } from '../../api';
import { useAuth } from '../../auth/AuthContext';

// Verified monthly package default matching backend database (V5__create_payment_schema.sql)
const DEFAULT_MONTHLY_PACKAGE: SubscriptionPackage = {
  id: 1,
  code: 'PREMIUM_MONTHLY',
  name: 'Gói Theo Tháng',
  price: 99000,
  durationDays: 30,
  description: 'Mở khóa toàn bộ tính năng AI và 5 cấp độ CEFR linh hoạt theo tháng',
  status: 'ACTIVE',
};

export function MembershipPlans() {
  const [monthlyPkg, setMonthlyPkg] = useState<SubscriptionPackage>(DEFAULT_MONTHLY_PACKAGE);
  const [initiatingId, setInitiatingId] = useState<number | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const { user, subscription } = useAuth();
  const nav = useNavigate();
  const isSubscribed = Boolean(subscription && subscription.status === 'ACTIVE');

  useEffect(() => {
    paymentApi
      .getPackages()
      .then((res) => {
        if (Array.isArray(res.data) && res.data.length > 0) {
          const m = res.data.find(
            (p) => p.code.includes('MONTHLY') || (p.durationDays >= 28 && p.durationDays <= 31)
          );
          if (m) setMonthlyPkg(m);
        }
      })
      .catch((err) => {
        console.warn('Backend packages fetch note (using verified schema defaults):', err);
      });
  }, []);

  const handleSelectPackage = async (pkg: SubscriptionPackage) => {
    setActionNotice(null);
    if (!user) {
      setActionNotice('Vui lòng đăng nhập tài khoản trước khi đăng ký gói thành viên.');
      setTimeout(() => nav('/login'), 1500);
      return;
    }

    setInitiatingId(pkg.id);
    try {
      const res = await paymentApi.initiate(pkg.id);
      const checkoutUrl = res?.checkoutUrl || res?.data?.checkoutUrl;
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      } else {
        setActionNotice('Đang chuyển tiếp tới cổng thanh toán PayOS...');
      }
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ||
        'Không thể khởi tạo thanh toán PayOS lúc này. Tài khoản của bạn có thể đã có gói đang hoạt động hoặc máy chủ backend đang cập nhật.';
      setActionNotice(msg);
    } finally {
      setInitiatingId(null);
    }
  };

  return (
    <AnimatedSection id="pricing" className="lp-section lp-section-alt">
      <div className="lp-container">
        <div className="lp-section-header">
          <div className="lp-section-eyebrow">
            <Icon n="gem" s={16} />
            <span>Gói thành viên & Chi phí minh bạch</span>
          </div>
          <h2 className="lp-section-title">
            Chọn gói học tập phù hợp với bạn
          </h2>
          <p className="lp-section-subtitle">
            Học tập miễn phí các chức năng cơ bản trọn đời, hoặc nâng cấp Gói Theo Tháng để mở khóa 
            toàn bộ kho từ vựng 5 cấp độ CEFR, gia sư AI Gemini và phòng luyện nói phản xạ.
          </p>
        </div>

        {actionNotice && (
          <div
            style={{
              maxWidth: 680,
              margin: '0 auto 28px',
              padding: '14px 20px',
              borderRadius: 12,
              background: '#EEF2FF',
              border: '1px solid #C7D2FE',
              color: '#3730A3',
              fontWeight: 800,
              fontSize: 14.5,
              textAlign: 'center',
            }}
          >
            {actionNotice}
          </div>
        )}

        {/* 2 Clean & Balanced Pricing Packages */}
        <div className="lp-pricing-grid">
          {/* GÓI 1: GÓI MIỄN PHÍ */}
          <div className="lp-pricing-card">
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12,
                fontWeight: 800,
                color: '#64748B',
                background: '#F1F5F9',
                padding: '4px 12px',
                borderRadius: 99,
                alignSelf: 'flex-start',
                marginBottom: 12,
              }}
            >
              Căn bản • Khởi đầu
            </div>

            <h3 style={{ fontSize: 24, fontWeight: 900, color: 'var(--lp-text-primary)' }}>
              Gói Miễn Phí
            </h3>
            <p style={{ fontSize: 14, color: 'var(--lp-text-muted)', marginTop: 4 }}>
              Dành cho người mới bắt đầu làm quen với nền tảng
            </p>

            <div className="lp-pricing-price">
              0 <span className="lp-pricing-currency">VNĐ</span>
            </div>
            <div className="lp-pricing-period">Miễn phí trọn đời</div>

            <ul className="lp-pricing-features">
              <li className="lp-pricing-feature-item">
                <span className="lp-pricing-feature-icon check">✓</span>
                <span className="lp-pricing-feature-text">
                  Tra cứu từ vựng cơ bản cấp độ <b>A1 & A2</b>
                </span>
              </li>
              <li className="lp-pricing-feature-item">
                <span className="lp-pricing-feature-icon check">✓</span>
                <span className="lp-pricing-feature-text">
                  Lưu trữ danh sách <b>từ vựng yêu thích</b>
                </span>
              </li>
              <li className="lp-pricing-feature-item">
                <span className="lp-pricing-feature-icon check">✓</span>
                <span className="lp-pricing-feature-text">
                  Ôn tập thẻ từ <b>Flashcard tiêu chuẩn</b>
                </span>
              </li>
              <li className="lp-pricing-feature-item">
                <span className="lp-pricing-feature-icon check">✓</span>
                <span className="lp-pricing-feature-text">
                  Tham gia các bài <b>Quiz trắc nghiệm mẫu</b>
                </span>
              </li>
              <li className="lp-pricing-feature-item disabled">
                <span className="lp-pricing-feature-icon cross">✗</span>
                <span className="lp-pricing-feature-text">
                  Kho từ vựng nâng cao B1, B2 và C1
                </span>
              </li>
              <li className="lp-pricing-feature-item disabled">
                <span className="lp-pricing-feature-icon cross">✗</span>
                <span className="lp-pricing-feature-text">
                  Giải nghĩa AI Gemini chuyên sâu không giới hạn
                </span>
              </li>
              <li className="lp-pricing-feature-item disabled">
                <span className="lp-pricing-feature-icon cross">✗</span>
                <span className="lp-pricing-feature-text">
                  Phòng luyện nói chấm điểm phát âm AI
                </span>
              </li>
            </ul>

            <button
              type="button"
              className="lp-btn-hero-secondary"
              onClick={() => nav(user ? '/words' : '/login')}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {isSubscribed ? 'Gói cơ bản' : user ? '✓ Đang sử dụng' : 'Bắt đầu miễn phí'}
            </button>
          </div>

          {/* GÓI 2: GÓI THEO THÁNG (FEATURED) */}
          <div className={`lp-pricing-card featured ${isSubscribed ? 'is-active-plan' : ''}`}>
            <div className="lp-pricing-badge" style={isSubscribed ? { background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)' } : {}}>
              {isSubscribed ? '✓ Gói của bạn • Đang kích hoạt' : 'Đầy đủ tính năng • Phổ biến nhất'}
            </div>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12,
                fontWeight: 900,
                color: isSubscribed ? '#059669' : '#4F46E5',
                background: isSubscribed ? '#ECFDF5' : '#EEF2FF',
                padding: '4px 12px',
                borderRadius: 99,
                alignSelf: 'flex-start',
                marginBottom: 12,
              }}
            >
              {isSubscribed ? `Còn ${subscription?.remainingDays ?? 0} ngày sử dụng` : 'Linh hoạt từng tháng'}
            </div>

            <h3 style={{ fontSize: 24, fontWeight: 900, color: 'var(--lp-text-primary)' }}>
              Gói Theo Tháng
            </h3>
            <p style={{ fontSize: 14, color: 'var(--lp-text-muted)', marginTop: 4 }}>
              Mở khóa toàn bộ sức mạnh AI và lộ trình CEFR trọn gói
            </p>

            <div className="lp-pricing-price">
              {monthlyPkg.price.toLocaleString('vi-VN')}{' '}
              <span className="lp-pricing-currency">VNĐ</span>
            </div>
            <div className="lp-pricing-period">
              {isSubscribed && subscription?.endDate
                ? `Thời hạn đến: ${new Date(subscription.endDate).toLocaleDateString('vi-VN')}`
                : 'Thời hạn 30 ngày truy cập đầy đủ'}
            </div>

            <ul className="lp-pricing-features">
              <li className="lp-pricing-feature-item">
                <span className="lp-pricing-feature-icon check">✓</span>
                <span className="lp-pricing-feature-text">
                  Mở khóa toàn bộ <b>5 cấp độ CEFR A1, A2, B1, B2, C1</b>
                </span>
              </li>
              <li className="lp-pricing-feature-item">
                <span className="lp-pricing-feature-icon check">✓</span>
                <span className="lp-pricing-feature-text">
                  Giải nghĩa ngữ cảnh chuyên sâu bằng <b>AI Gemini</b>
                </span>
              </li>
              <li className="lp-pricing-feature-item">
                <span className="lp-pricing-feature-icon check">✓</span>
                <span className="lp-pricing-feature-text">
                  Phòng <b>Luyện nói AI Voice</b> chấm điểm phát âm
                </span>
              </li>
              <li className="lp-pricing-feature-item">
                <span className="lp-pricing-feature-icon check">✓</span>
                <span className="lp-pricing-feature-text">
                  Thuật toán <b>Spaced Repetition (SRS)</b> cá nhân hóa
                </span>
              </li>
              <li className="lp-pricing-feature-item">
                <span className="lp-pricing-feature-icon check">✓</span>
                <span className="lp-pricing-feature-text">
                  Sửa lỗi ngữ pháp & câu văn tự động
                </span>
              </li>
              <li className="lp-pricing-feature-item">
                <span className="lp-pricing-feature-icon check">✓</span>
                <span className="lp-pricing-feature-text">
                  Thanh toán an toàn qua cổng <b>PayOS</b> (Mã QR tức thì)
                </span>
              </li>
            </ul>

            <button
              type="button"
              className="lp-btn-primary"
              disabled={initiatingId === monthlyPkg.id}
              onClick={() => handleSelectPackage(monthlyPkg)}
              style={{
                width: '100%',
                justifyContent: 'center',
                background: isSubscribed
                  ? 'linear-gradient(135deg, #059669 0%, #10B981 100%)'
                  : 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
              }}
            >
              {initiatingId === monthlyPkg.id ? (
                'Đang kết nối PayOS...'
              ) : isSubscribed ? (
                <>
                  <span>Gia hạn Gói Tháng</span>
                  <Icon n="gem" s={16} />
                </>
              ) : (
                <>
                  <span>Nâng cấp Gói Tháng</span>
                  <Icon n="gem" s={16} />
                </>
              )}
            </button>
          </div>
        </div>

        <div
          style={{
            textAlign: 'center',
            marginTop: 36,
            fontSize: 13.5,
            color: 'var(--lp-text-muted)',
            fontWeight: 700,
          }}
        >
          🔒 Thanh toán được bảo mật và xử lý an toàn qua cổng thanh toán PayOS trực tiếp bằng mã QR ngân hàng.
        </div>
      </div>
    </AnimatedSection>
  );
}
