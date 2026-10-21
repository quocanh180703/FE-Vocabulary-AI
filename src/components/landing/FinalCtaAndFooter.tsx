import { useNavigate } from 'react-router-dom';
import { Mascot, Icon } from '../icons';
import { useAuth } from '../../auth/AuthContext';

export function FinalCtaAndFooter() {
  const { user } = useAuth();
  const nav = useNavigate();

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div style={{ backgroundColor: 'var(--lp-bg)' }}>
      {/* Final CTA Banner Card */}
      <div className="lp-container">
        <div className="lp-final-cta-card">
          <div style={{ position: 'relative', zIndex: 1, maxWidth: 640, margin: '0 auto' }}>
            <span
              style={{
                display: 'inline-block',
                fontSize: 13,
                fontWeight: 900,
                textTransform: 'uppercase',
                letterSpacing: 1,
                background: 'rgba(255, 255, 255, 0.15)',
                padding: '6px 16px',
                borderRadius: 99,
                marginBottom: 18,
              }}
            >
              🚀 Bắt đầu hành trình tiếng Anh của bạn
            </span>

            <h2 style={{ fontSize: 38, fontWeight: 900, lineHeight: 1.25, marginBottom: 18 }}>
              Sẵn sàng làm chủ vốn từ vựng và tự tin giao tiếp cùng AI?
            </h2>

            <p style={{ fontSize: 16.5, color: '#E0E7FF', lineHeight: 1.6, marginBottom: 32 }}>
              Tham gia VocabularyAI ngay hôm nay để trải nghiệm lộ trình CEFR chuẩn hóa, thuật toán ôn tập 
              chống quên lãng và sự đồng hành 24/7 của trợ lý AI.
            </p>

            <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="lp-btn-primary"
                onClick={() => nav(user ? '/words' : '/login')}
                style={{
                  minHeight: 52,
                  padding: '0 32px',
                  fontSize: 16,
                  background: '#FFFFFF',
                  color: '#4F46E5',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
                }}
              >
                <span>{user ? 'Tiếp tục học ngay' : 'Đăng ký tài khoản miễn phí'}</span>
                <Icon n="send" s={16} />
              </button>

              <button
                type="button"
                className="lp-btn-hero-secondary"
                onClick={() => scrollTo('pricing')}
                style={{
                  minHeight: 52,
                  padding: '0 24px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: '#FFFFFF',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                }}
              >
                <span>Xem gói thành viên</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="lp-footer" role="contentinfo">
        <div className="lp-container">
          <div className="lp-footer-grid">
            {/* Col 1: Brand & Thesis Project Information */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <Mascot s={36} />
                <span style={{ fontSize: 22, fontWeight: 900, color: 'var(--lp-text-primary)' }}>
                  VocabularyAI
                </span>
              </div>
              <p style={{ fontSize: 14, color: 'var(--lp-text-secondary)', lineHeight: 1.6, marginBottom: 14 }}>
                Nền tảng học tiếng Anh trực tuyến thông minh tích hợp trí tuệ nhân tạo, thiết kế theo chuẩn 
                khung tham chiếu CEFR A1–C1 và thuật toán Spaced Repetition khoa học.
              </p>
              <div style={{ fontSize: 12.5, color: 'var(--lp-text-muted)', lineHeight: 1.5, background: 'var(--lp-bg-soft)', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--lp-border)' }}>
                <b>Đề tài tốt nghiệp:</b> “XÂY DỰNG WEBSITE NỀN TẢNG HỌC TIẾNG ANH THÔNG MINH TÍCH HỢP AI”
              </div>
            </div>

            {/* Col 2: Navigation Links */}
            <div>
              <h4 className="lp-footer-col-title">Trang chủ</h4>
              <ul className="lp-footer-links">
                <li>
                  <a href="#hero" className="lp-footer-link" onClick={(e) => { e.preventDefault(); scrollTo('hero'); }}>
                    Giới thiệu
                  </a>
                </li>
                <li>
                  <a href="#showcase" className="lp-footer-link" onClick={(e) => { e.preventDefault(); scrollTo('showcase'); }}>
                    Tính năng nổi bật
                  </a>
                </li>
                <li>
                  <a href="#cefr-path" className="lp-footer-link" onClick={(e) => { e.preventDefault(); scrollTo('cefr-path'); }}>
                    Lộ trình 5 cấp độ CEFR
                  </a>
                </li>
                <li>
                  <a href="#ai-learning" className="lp-footer-link" onClick={(e) => { e.preventDefault(); scrollTo('ai-learning'); }}>
                    Công nghệ AI
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="lp-footer-link" onClick={(e) => { e.preventDefault(); scrollTo('pricing'); }}>
                    Bảng giá thành viên
                  </a>
                </li>
                <li>
                  <a href="#faq" className="lp-footer-link" onClick={(e) => { e.preventDefault(); scrollTo('faq'); }}>
                    Hỏi đáp thắc mắc
                  </a>
                </li>
              </ul>
            </div>

            {/* Col 3: Student Learning Features */}
            <div>
              <h4 className="lp-footer-col-title">Chức năng học tập</h4>
              <ul className="lp-footer-links">
                <li>
                  <a href="#words" className="lp-footer-link" onClick={(e) => { e.preventDefault(); nav(user ? '/words' : '/login'); }}>
                    Kho từ vựng CEFR
                  </a>
                </li>
                <li>
                  <a href="#review" className="lp-footer-link" onClick={(e) => { e.preventDefault(); nav(user ? '/review' : '/login'); }}>
                    Flashcard Spaced Repetition
                  </a>
                </li>
                <li>
                  <a href="#quiz" className="lp-footer-link" onClick={(e) => { e.preventDefault(); nav(user ? '/quiz' : '/login'); }}>
                    Trắc nghiệm kiến thức
                  </a>
                </li>
                <li>
                  <a href="#speaking" className="lp-footer-link" onClick={(e) => { e.preventDefault(); nav(user ? '/speaking' : '/login'); }}>
                    Luyện nói phản xạ AI
                  </a>
                </li>
                <li>
                  <a href="#grammar" className="lp-footer-link" onClick={(e) => { e.preventDefault(); nav(user ? '/grammar' : '/login'); }}>
                    Sửa lỗi ngữ pháp AI
                  </a>
                </li>
                <li>
                  <a href="#chat" className="lp-footer-link" onClick={(e) => { e.preventDefault(); nav(user ? '/chat' : '/login'); }}>
                    Trò chuyện cùng AI Tutor
                  </a>
                </li>
              </ul>
            </div>

            {/* Col 4: Platform Security & Standards */}
            <div>
              <h4 className="lp-footer-col-title">Bảo mật & Chuẩn mực</h4>
              <p style={{ fontSize: 13.5, color: 'var(--lp-text-secondary)', lineHeight: 1.6, marginBottom: 12 }}>
                Cổng thanh toán tích hợp chuẩn <b>PayOS</b> bảo mật cao với chữ ký điện tử HMAC-SHA256 và mã QR chuyển khoản tự động.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12.5, color: 'var(--lp-text-muted)' }}>
                <span>• Khung tham chiếu CEFR A1 - C1</span>
                <span>• Mô hình AI Gemini & Speech Recognition</span>
                <span>• Thuật toán Spaced Repetition SuperMemo 2</span>
              </div>
            </div>
          </div>

          <div className="lp-footer-bottom">
            <div>
              © {new Date().getFullYear()} VocabularyAI. Tất cả các quyền được bảo lưu.
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              <span>Dự án đề tài tốt nghiệp Khoa Công nghệ thông tin</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
