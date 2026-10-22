import { useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function PrivacyPolicy() {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Chính sách bảo mật — VocabularyAI';
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
        <h1 style={{ fontSize: '32px', fontWeight: 900, lineHeight: 1.2, margin: 0 }}>Chính sách bảo mật</h1>
        <p style={{ color: '#64748B', fontWeight: 700, fontSize: '14px', margin: '10px 0 8px' }}>
          VocabularyAI · Cập nhật lần cuối: 22/10/2026 (bản nháp)
        </p>

        <h2 style={{ fontSize: '19px', fontWeight: 900, margin: '28px 0 8px', color: '#0D47A1' }}>
          1. Dữ liệu chúng tôi thu thập
        </h2>
        <ul style={{ paddingLeft: '22px', marginTop: '6px', fontSize: '15.5px', lineHeight: 1.65, color: '#33475C' }}>
          <li style={{ margin: '4px 0' }}><b>Email đăng ký</b> — dùng để tạo tài khoản và gửi mã OTP.</li>
          <li style={{ margin: '4px 0' }}>
            <b>Dữ liệu học tập</b> — từ đã học, lịch sử và kết quả ôn tập/quiz, lịch sử luyện nói, điểm số và nhận xét của AI.
          </li>
          <li style={{ margin: '4px 0' }}>
            <b>Bản ghi âm bài nói</b> — chỉ khi bạn chủ động dùng tính năng luyện nói và bấm ghi âm.
          </li>
          <li style={{ margin: '4px 0' }}>
            <b>Thông tin giao dịch</b> — trạng thái và mã giao dịch gói Premium. Việc thanh toán do PayOS xử lý; VocabularyAI <b>không lưu số thẻ</b> hay thông tin thẻ của bạn.
          </li>
        </ul>

        <h2 style={{ fontSize: '19px', fontWeight: 900, margin: '28px 0 8px', color: '#0D47A1' }}>
          2. Mục đích sử dụng
        </h2>
        <ul style={{ paddingLeft: '22px', marginTop: '6px', fontSize: '15.5px', lineHeight: 1.65, color: '#33475C' }}>
          <li style={{ margin: '4px 0' }}>
            Vận hành các tính năng học: tính lịch ôn SRS, chấm bài nói, giải thích từ và trò chuyện với Vi.
          </li>
          <li style={{ margin: '4px 0' }}>
            Gửi mã OTP, thông báo liên quan đến tài khoản và gói Premium của bạn.
          </li>
          <li style={{ margin: '4px 0' }}>
            Cải thiện chất lượng chấm điểm và nội dung học từ dữ liệu đã ẩn danh, tổng hợp.
          </li>
        </ul>

        <h2 style={{ fontSize: '19px', fontWeight: 900, margin: '28px 0 8px', color: '#0D47A1' }}>
          3. Bên thứ ba xử lý dữ liệu
        </h2>
        <p style={{ fontSize: '15.5px', lineHeight: 1.65, color: '#33475C' }}>
          Để vận hành tính năng, một phần dữ liệu tối thiểu được gửi tới:
        </p>
        <ul style={{ paddingLeft: '22px', marginTop: '6px', fontSize: '15.5px', lineHeight: 1.65, color: '#33475C' }}>
          <li style={{ margin: '4px 0' }}><b>Google Gemini / OpenAI</b> — xử lý giải thích từ, sửa ngữ pháp, gợi ý và nội dung trò chuyện với Vi.</li>
          <li style={{ margin: '4px 0' }}><b>Whisper</b> — chuyển bản ghi âm bài nói thành văn bản để chấm điểm.</li>
          <li style={{ margin: '4px 0' }}><b>PayOS</b> — xử lý thanh toán gói Premium.</li>
        </ul>
        <p style={{ fontSize: '15.5px', lineHeight: 1.65, color: '#33475C', marginTop: '6px' }}>
          Chúng tôi không bán dữ liệu cá nhân của bạn cho bất kỳ bên nào.
        </p>

        <h2 style={{ fontSize: '19px', fontWeight: 900, margin: '28px 0 8px', color: '#0D47A1' }}>
          4. Lưu trữ và bảo mật
        </h2>
        <p style={{ fontSize: '15.5px', lineHeight: 1.65, color: '#33475C' }}>
          Dữ liệu được lưu trên hệ thống máy chủ của VocabularyAI. Chúng tôi áp dụng các biện pháp kỹ thuật và tổ chức hợp lý để bảo vệ dữ liệu khỏi truy cập trái phép. Không có hệ thống nào an toàn tuyệt đối; nếu phát hiện sự cố liên quan đến dữ liệu của bạn, chúng tôi sẽ thông báo qua email trong thời gian sớm nhất có thể.
        </p>

        <h2 style={{ fontSize: '19px', fontWeight: 900, margin: '28px 0 8px', color: '#0D47A1' }}>
          5. Quyền của bạn
        </h2>
        <ul style={{ paddingLeft: '22px', marginTop: '6px', fontSize: '15.5px', lineHeight: 1.65, color: '#33475C' }}>
          <li style={{ margin: '4px 0' }}>Xem và cập nhật thông tin tài khoản trong ứng dụng.</li>
          <li style={{ margin: '4px 0' }}>
            Yêu cầu xóa tài khoản và toàn bộ dữ liệu học tập kèm theo qua email <b>hotro@vocabularyai.com</b>. Yêu cầu được xử lý trong tối đa 30 ngày.
          </li>
          <li style={{ margin: '4px 0' }}>
            Ngừng ghi âm bất cứ lúc nào — tính năng luyện nói chỉ ghi khi bạn chủ động bấm nút ghi.
          </li>
        </ul>

        <h2 style={{ fontSize: '19px', fontWeight: 900, margin: '28px 0 8px', color: '#0D47A1' }}>
          6. Thay đổi chính sách
        </h2>
        <p style={{ fontSize: '15.5px', lineHeight: 1.65, color: '#33475C' }}>
          Chính sách này có thể được cập nhật. Phiên bản mới đăng tại trang này kèm ngày cập nhật; thay đổi quan trọng sẽ được thông báo qua email hoặc ngay trong ứng dụng.
        </p>

        <h2 style={{ fontSize: '19px', fontWeight: 900, margin: '28px 0 8px', color: '#0D47A1' }}>
          7. Liên hệ
        </h2>
        <p style={{ fontSize: '15.5px', lineHeight: 1.65, color: '#33475C' }}>
          Mọi câu hỏi về quyền riêng tư, vui lòng gửi về <b>hotro@vocabularyai.com</b>.
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
            to="/dieu-khoan"
            style={{
              fontWeight: 800,
              color: '#64748B',
              fontSize: '14px',
              textDecoration: 'none',
            }}
          >
            Xem Điều khoản sử dụng →
          </Link>
        </div>
      </div>
    </div>
  );
}
