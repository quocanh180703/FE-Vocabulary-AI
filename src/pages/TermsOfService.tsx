import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PageTransition } from '../motion';
import { SageScene } from '../components/SageEffects';

export default function TermsOfService() {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Điều khoản sử dụng — VocabularyAI';
  }, []);

  return (
    <PageTransition
      className="auth"
      style={{
        fontFamily: 'var(--font-body)',
        color: 'var(--ink)',
        padding: '28px 16px 60px',
        minHeight: '100dvh',
        alignItems: 'flex-start',
      }}
    >
      <SageScene />
      <div
        className="card glass"
        style={{
          position: 'relative',
          zIndex: 2,
          width: 'min(820px, 100%)',
          margin: '0 auto',
          background: 'var(--glass-strong)',
          borderRadius: 'var(--r-lg)',
          padding: '40px 44px 48px',
        }}
      >
        <Link
          to="/landing"
          onClick={() => window.scrollTo(0, 0)}
          style={{
            display: 'inline-flex',
            gap: '8px',
            alignItems: 'center',
            fontWeight: 700,
            color: 'var(--sage-dark)',
            fontSize: '14px',
            textDecoration: 'none',
            marginBottom: '24px',
            padding: '8px 16px',
            borderRadius: '999px',
            background: 'var(--sage-soft)',
            border: '1px solid var(--line)',
            transition: 'transform var(--dur-micro) var(--ease), background var(--dur-micro) var(--ease)',
          }}
        >
          ← Về trang chủ VocabularyAI
        </Link>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '30px', fontWeight: 700, lineHeight: 1.2, margin: 0, color: 'var(--ink)' }}>Điều khoản sử dụng</h1>
        <p style={{ color: 'var(--muted)', fontWeight: 700, fontSize: '14px', margin: '10px 0 8px' }}>
          VocabularyAI · Cập nhật lần cuối: 22/10/2026
        </p>

        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '18.5px', fontWeight: 700, margin: '26px 0 8px', color: 'var(--sage-dark)' }}>
          1. Giới thiệu dịch vụ
        </h2>
        <p style={{ fontSize: '15.5px', lineHeight: 1.65, color: 'var(--ink)' }}>
          VocabularyAI là ứng dụng học từ vựng tiếng Anh cùng trợ lý AI “Vi”, gồm: học từ theo cấp độ CEFR A1–C1, ôn tập lặp lại ngắt quãng (SRS), quiz luyện tập, luyện nói được chấm bằng AI và trò chuyện với Vi. Bằng việc đăng ký và sử dụng dịch vụ, bạn đồng ý với các điều khoản dưới đây.
        </p>

        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '18.5px', fontWeight: 700, margin: '26px 0 8px', color: 'var(--sage-dark)' }}>
          2. Tài khoản
        </h2>
        <ul style={{ paddingLeft: '22px', marginTop: '6px', fontSize: '15.5px', lineHeight: 1.65, color: 'var(--ink)' }}>
          <li style={{ margin: '4px 0' }}>
            Đăng ký bằng địa chỉ email và mã OTP gửi về email đó. Bạn chịu trách nhiệm cung cấp email đúng và bảo vệ quyền truy cập hộp thư của mình.
          </li>
          <li style={{ margin: '4px 0' }}>Mọi hoạt động thực hiện qua tài khoản của bạn được coi là do bạn thực hiện.</li>
          <li style={{ margin: '4px 0' }}>
            Bạn phải đủ tuổi theo quy định pháp luật để tự ký kết giao dịch thanh toán trực tuyến, hoặc có sự đồng ý của cha mẹ/người giám hộ.
          </li>
        </ul>

        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '18.5px', fontWeight: 700, margin: '26px 0 8px', color: 'var(--sage-dark)' }}>
          3. Gói Premium và thanh toán
        </h2>
        <ul style={{ paddingLeft: '22px', marginTop: '6px', fontSize: '15.5px', lineHeight: 1.65, color: 'var(--ink)' }}>
          <li style={{ margin: '4px 0' }}>
            Giá gói Premium: <b>99.000đ / 30 ngày</b>, thanh toán qua cổng PayOS.
          </li>
          <li style={{ margin: '4px 0' }}>Gói có hiệu lực ngay khi thanh toán thành công và kéo dài đến hết thời hạn đã trả.</li>
          <li style={{ margin: '4px 0' }}>
            Bạn có thể hủy gói trong mục gói cước của ứng dụng. Sau khi hủy, bạn vẫn dùng Premium đến hết thời hạn đã trả; gói không tự gia hạn tiếp sau thời điểm đó.
          </li>
          <li style={{ margin: '4px 0' }}>
            Chính sách hoàn tiền: Không hoàn lại phần thời gian đã sử dụng của gói; trường hợp lỗi hệ thống khiến Premium không kích hoạt được, hoàn 100% qua kênh thanh toán gốc.
          </li>
        </ul>

        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '18.5px', fontWeight: 700, margin: '26px 0 8px', color: 'var(--sage-dark)' }}>
          4. Nội dung do AI tạo ra
        </h2>
        <p style={{ fontSize: '15.5px', lineHeight: 1.65, color: 'var(--ink)' }}>
          Giải thích từ vựng, gợi ý học, sửa ngữ pháp và nhận xét bài nói do mô hình trí tuệ nhân tạo (Google Gemini và Whisper) tạo ra với mục đích hỗ trợ học tập. Kết quả AI có thể chưa hoàn toàn chính xác, không thay thế giáo trình, giáo viên hay chứng chỉ đánh giá chính thức.
        </p>

        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '18.5px', fontWeight: 700, margin: '26px 0 8px', color: 'var(--sage-dark)' }}>
          5. Hành vi bị nghiêm cấm
        </h2>
        <ul style={{ paddingLeft: '22px', marginTop: '6px', fontSize: '15.5px', lineHeight: 1.65, color: 'var(--ink)' }}>
          <li style={{ margin: '4px 0' }}>Dùng dịch vụ để gửi thư rác, phá hoại hệ thống, hoặc truy cập trái phép vào tài khoản/dữ liệu của người khác.</li>
          <li style={{ margin: '4px 0' }}>Sao chép, khai thác trái phép kho dữ liệu từ vựng và nội dung của VocabularyAI cho mục đích thương mại.</li>
        </ul>
        <p style={{ fontSize: '15.5px', lineHeight: 1.65, color: 'var(--ink)', marginTop: '6px' }}>
          Tài khoản vi phạm có thể bị tạm khóa hoặc chấm dứt mà không cần báo trước.
        </p>

        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '18.5px', fontWeight: 700, margin: '26px 0 8px', color: 'var(--sage-dark)' }}>
          6. Thay đổi dịch vụ và điều khoản
        </h2>
        <p style={{ fontSize: '15.5px', lineHeight: 1.65, color: 'var(--ink)' }}>
          VocabularyAI có thể cập nhật tính năng và bản điều khoản này. Phiên bản mới được đăng tại trang này kèm ngày cập nhật; việc bạn tiếp tục sử dụng dịch vụ sau khi thay đổi đồng nghĩa với việc chấp nhận bản điều khoản mới.
        </p>

        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '18.5px', fontWeight: 700, margin: '26px 0 8px', color: 'var(--sage-dark)' }}>
          7. Liên hệ
        </h2>
        <p style={{ fontSize: '15.5px', lineHeight: 1.65, color: 'var(--ink)' }}>
          Mọi thắc mắc về điều khoản, vui lòng gửi về <b>hotro@vocabularyai.com</b>.
        </p>

        <div style={{
          marginTop: '36px',
          paddingTop: '20px',
          borderTop: '1px solid #E2E8F0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}>
          <Link
            to="/landing"
            onClick={() => window.scrollTo(0, 0)}
            style={{
              display: 'inline-flex',
              gap: '6px',
              alignItems: 'center',
              fontWeight: 800,
              color: 'var(--sage-dark)',
              fontSize: '14.5px',
              textDecoration: 'none',
            }}
          >
            ← Về trang chủ VocabularyAI
          </Link>
          <Link
            to="/chinh-sach-bao-mat"
            style={{
              fontWeight: 800,
              color: 'var(--muted)',
              fontSize: '14px',
              textDecoration: 'none',
            }}
          >
            Xem Chính sách bảo mật →
          </Link>
        </div>
      </div>
    </PageTransition>
  );
}
