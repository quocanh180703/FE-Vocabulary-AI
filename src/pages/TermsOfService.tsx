import { useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function TermsOfService() {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Điều khoản sử dụng — VocabularyAI';
  }, []);

  return (
    <div style={{
      fontFamily: "'Nunito', system-ui, sans-serif",
      background: '#EAF1F8',
      color: '#0A2540',
      padding: '28px 16px 60px',
      minHeight: '100vh',
    }}>
      <div style={{
        maxWidth: '820px',
        margin: '0 auto',
        background: '#fff',
        borderRadius: '26px',
        padding: '44px 48px 50px',
        boxShadow: '0 24px 60px rgba(10,37,64,.10)',
      }}>
        <Link
          to="/landing"
          style={{
            display: 'inline-flex',
            gap: '8px',
            alignItems: 'center',
            fontWeight: 900,
            color: '#1565C0',
            fontSize: '14.5px',
            textDecoration: 'none',
            marginBottom: '26px',
            padding: '8px 16px',
            borderRadius: '999px',
            background: 'rgba(21, 101, 192, 0.08)',
            transition: 'all 0.2s ease',
          }}
        >
          ← Về trang chủ VocabularyAI
        </Link>
        <div>
          <span style={{
            display: 'inline-block',
            background: '#F8F0DC',
            color: '#8A6115',
            fontWeight: 900,
            fontSize: '12.5px',
            letterSpacing: '.05em',
            padding: '6px 12px',
            borderRadius: '999px',
            marginBottom: '16px',
          }}>
            BẢN NHÁP — ĐANG CHỜ DUYỆT, CHƯA PHẢI VĂN BẢN CHÍNH THỨC
          </span>
        </div>
        <h1 style={{ fontSize: '32px', fontWeight: 900, lineHeight: 1.2, margin: 0 }}>Điều khoản sử dụng</h1>
        <p style={{ color: '#64748B', fontWeight: 700, fontSize: '14px', margin: '10px 0 8px' }}>
          VocabularyAI · Cập nhật lần cuối: 22/10/2026 (bản nháp)
        </p>

        <h2 style={{ fontSize: '19px', fontWeight: 900, margin: '28px 0 8px', color: '#0D47A1' }}>
          1. Giới thiệu dịch vụ
        </h2>
        <p style={{ fontSize: '15.5px', lineHeight: 1.65, color: '#33475C' }}>
          VocabularyAI là ứng dụng học từ vựng tiếng Anh cùng trợ lý AI “Vi”, gồm: học từ theo cấp độ CEFR A1–C1, ôn tập lặp lại ngắt quãng (SRS), quiz luyện tập, luyện nói được chấm bằng AI và trò chuyện với Vi. Bằng việc đăng ký và sử dụng dịch vụ, bạn đồng ý với các điều khoản dưới đây.
        </p>

        <h2 style={{ fontSize: '19px', fontWeight: 900, margin: '28px 0 8px', color: '#0D47A1' }}>
          2. Tài khoản
        </h2>
        <ul style={{ paddingLeft: '22px', marginTop: '6px', fontSize: '15.5px', lineHeight: 1.65, color: '#33475C' }}>
          <li style={{ margin: '4px 0' }}>
            Đăng ký bằng địa chỉ email và mã OTP gửi về email đó. Bạn chịu trách nhiệm cung cấp email đúng và bảo vệ quyền truy cập hộp thư của mình.
          </li>
          <li style={{ margin: '4px 0' }}>Mọi hoạt động thực hiện qua tài khoản của bạn được coi là do bạn thực hiện.</li>
          <li style={{ margin: '4px 0' }}>
            Bạn phải đủ tuổi theo quy định pháp luật để tự ký kết giao dịch thanh toán trực tuyến, hoặc có sự đồng ý của cha mẹ/người giám hộ.
          </li>
        </ul>

        <h2 style={{ fontSize: '19px', fontWeight: 900, margin: '28px 0 8px', color: '#0D47A1' }}>
          3. Gói Premium và thanh toán
        </h2>
        <ul style={{ paddingLeft: '22px', marginTop: '6px', fontSize: '15.5px', lineHeight: 1.65, color: '#33475C' }}>
          <li style={{ margin: '4px 0' }}>
            Giá gói Premium: <b>99.000đ / 30 ngày</b> hoặc <b>899.000đ / 365 ngày</b>, thanh toán qua cổng PayOS.
          </li>
          <li style={{ margin: '4px 0' }}>Gói có hiệu lực ngay khi thanh toán thành công và kéo dài đến hết thời hạn đã trả.</li>
          <li style={{ margin: '4px 0' }}>
            Bạn có thể hủy gói trong mục gói cước của ứng dụng. Sau khi hủy, bạn vẫn dùng Premium đến hết thời hạn đã trả; gói không tự gia hạn tiếp sau thời điểm đó.
          </li>
        </ul>
        <div style={{
          background: '#EDF4FC',
          borderRadius: '14px',
          padding: '14px 18px',
          marginTop: '14px',
          fontSize: '14.5px',
          lineHeight: 1.6,
        }}>
          <b>Điểm cần chủ dự án xác nhận trước khi công bố:</b> chính sách hoàn tiền. Bản nháp đề xuất: không hoàn lại phần thời gian đã sử dụng của gói; trường hợp lỗi hệ thống khiến Premium không kích hoạt được, hoàn 100% qua kênh thanh toán gốc.
        </div>

        <h2 style={{ fontSize: '19px', fontWeight: 900, margin: '28px 0 8px', color: '#0D47A1' }}>
          4. Nội dung do AI tạo ra
        </h2>
        <p style={{ fontSize: '15.5px', lineHeight: 1.65, color: '#33475C' }}>
          Giải thích từ vựng, gợi ý học, sửa ngữ pháp và nhận xét bài nói do mô hình trí tuệ nhân tạo (Google Gemini và Whisper) tạo ra với mục đích hỗ trợ học tập. Kết quả AI có thể chưa hoàn toàn chính xác, không thay thế giáo trình, giáo viên hay chứng chỉ đánh giá chính thức.
        </p>

        <h2 style={{ fontSize: '19px', fontWeight: 900, margin: '28px 0 8px', color: '#0D47A1' }}>
          5. Hành vi bị nghiêm cấm
        </h2>
        <ul style={{ paddingLeft: '22px', marginTop: '6px', fontSize: '15.5px', lineHeight: 1.65, color: '#33475C' }}>
          <li style={{ margin: '4px 0' }}>Dùng dịch vụ để gửi thư rác, phá hoại hệ thống, hoặc truy cập trái phép vào tài khoản/dữ liệu của người khác.</li>
          <li style={{ margin: '4px 0' }}>Sao chép, khai thác trái phép kho dữ liệu từ vựng và nội dung của VocabularyAI cho mục đích thương mại.</li>
        </ul>
        <p style={{ fontSize: '15.5px', lineHeight: 1.65, color: '#33475C', marginTop: '6px' }}>
          Tài khoản vi phạm có thể bị tạm khóa hoặc chấm dứt mà không cần báo trước.
        </p>

        <h2 style={{ fontSize: '19px', fontWeight: 900, margin: '28px 0 8px', color: '#0D47A1' }}>
          6. Thay đổi dịch vụ và điều khoản
        </h2>
        <p style={{ fontSize: '15.5px', lineHeight: 1.65, color: '#33475C' }}>
          VocabularyAI có thể cập nhật tính năng và bản điều khoản này. Phiên bản mới được đăng tại trang này kèm ngày cập nhật; việc bạn tiếp tục sử dụng dịch vụ sau khi thay đổi đồng nghĩa với việc chấp nhận bản điều khoản mới.
        </p>

        <h2 style={{ fontSize: '19px', fontWeight: 900, margin: '28px 0 8px', color: '#0D47A1' }}>
          7. Liên hệ
        </h2>
        <p style={{ fontSize: '15.5px', lineHeight: 1.65, color: '#33475C' }}>
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
            style={{
              display: 'inline-flex',
              gap: '6px',
              alignItems: 'center',
              fontWeight: 800,
              color: '#1565C0',
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
              color: '#64748B',
              fontSize: '14px',
              textDecoration: 'none',
            }}
          >
            Xem Chính sách bảo mật →
          </Link>
        </div>
      </div>
    </div>
  );
}
