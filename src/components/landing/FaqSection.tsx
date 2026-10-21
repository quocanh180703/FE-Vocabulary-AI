import { useState } from 'react';
import { Icon } from '../icons';
import { AnimatedSection } from '../../animations/AnimatedSection';

interface FaqItem {
  id: string;
  q: string;
  a: string;
}

const FAQS: FaqItem[] = [
  {
    id: 'faq-1',
    q: 'VocabularyAI là gì và phù hợp với những ai?',
    a: 'VocabularyAI là nền tảng học tiếng Anh thông minh ứng dụng trí tuệ nhân tạo. Hệ thống được xây dựng phù hợp cho mọi người học từ người mới bắt đầu (A1) đến nâng cao (C1), học sinh, sinh viên chuẩn bị thi chứng chỉ quốc tế cũng như người đi làm cần mở rộng vốn từ chuyên ngành.',
  },
  {
    id: 'faq-2',
    q: 'Khung CEFR là gì và hệ thống phân chia từ vựng như thế nào?',
    a: 'CEFR (Common European Framework of Reference for Languages) là chuẩn tham chiếu quốc tế gồm 6 cấp độ. Trong VocabularyAI, toàn bộ từ vựng được phân loại khoa học theo 5 cấp độ từ A1 (Breakthrough) đến C1 (Effective Proficiency), giúp người học chọn đúng độ khó và tiến bộ theo lộ trình rõ ràng.',
  },
  {
    id: 'faq-3',
    q: 'Thuật toán Spaced Repetition (SRS) hoạt động ra sao để chống quên lãng?',
    a: 'SRS dựa trên nghiên cứu khoa học về đường cong quên lãng của não bộ. Khi bạn học một từ mới, hệ thống sẽ lên lịch tự động nhắc ôn lại vào các thời điểm tối ưu (1 ngày, 3 ngày, 7 ngày, 14 ngày...). Những từ bạn hay quên sẽ xuất hiện dày hơn, giúp bạn tiết kiệm 50% thời gian ôn tập mà vẫn nhớ sâu sắc.',
  },
  {
    id: 'faq-4',
    q: 'AI hỗ trợ giải nghĩa từ và chấm điểm luyện nói như thế nào?',
    a: 'Nền tảng tích hợp AI thế hệ mới để giải nghĩa ngữ cảnh, đưa ra ví dụ và phân tích lỗi ngữ pháp. Đối với kỹ năng nói, bạn thu âm giọng trực tiếp qua trình duyệt, AI sẽ phân tích âm thanh và đưa ra điểm số cùng nhận xét cụ thể về phát âm, độ trôi chảy và ngữ pháp.',
  },
  {
    id: 'faq-5',
    q: 'Quy trình thanh toán gói thành viên qua PayOS diễn ra như thế nào?',
    a: 'Khi chọn nâng cấp gói thành viên (Gói Tháng hoặc Gói Năm), hệ thống tạo mã thanh toán PayOS tự động. Bạn chỉ cần quét mã QR bằng ứng dụng ngân hàng hoặc ví điện tử bất kỳ tại Việt Nam. Sau khi chuyển khoản thành công, tài khoản sẽ được nâng cấp ngay lập tức.',
  },
  {
    id: 'faq-6',
    q: 'Tôi có thể sử dụng VocabularyAI trên điện thoại di động không?',
    a: 'Hoàn toàn được! Giao diện VocabularyAI được thiết kế Responsive tối ưu cho mọi kích thước màn hình từ điện thoại thông minh (iPhone, Android), máy tính bảng đến máy tính để bàn, chạy mượt mà trực tiếp trên trình duyệt mà không cần cài đặt ứng dụng phức tạp.',
  },
];

export function FaqSection() {
  const [openId, setOpenId] = useState<string | null>('faq-1');

  const toggleFaq = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <AnimatedSection id="faq" className="lp-section">
      <div className="lp-container">
        <div className="lp-section-header">
          <div className="lp-section-eyebrow">
            <Icon n="bulb" s={16} />
            <span>Giải đáp thắc mắc</span>
          </div>
          <h2 className="lp-section-title">
            Những câu hỏi thường gặp
          </h2>
          <p className="lp-section-subtitle">
            Tất cả những gì bạn cần biết về nền tảng học tiếng Anh thông minh VocabularyAI, 
            phương pháp học tập và các gói thành viên.
          </p>
        </div>

        <div className="lp-faq-list" role="region" aria-label="Danh sách câu hỏi thường gặp">
          {FAQS.map((faq) => {
            const isOpen = openId === faq.id;
            return (
              <div
                key={faq.id}
                className={`lp-faq-item ${isOpen ? 'open' : ''}`}
              >
                <h3>
                  <button
                    type="button"
                    className="lp-faq-trigger"
                    aria-expanded={isOpen}
                    aria-controls={`${faq.id}-content`}
                    id={`${faq.id}-btn`}
                    onClick={() => toggleFaq(faq.id)}
                  >
                    <span>{faq.q}</span>
                    <span
                      style={{
                        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.25s ease',
                        color: isOpen ? 'var(--lp-primary)' : 'var(--lp-text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </span>
                  </button>
                </h3>
                {isOpen && (
                  <div
                    id={`${faq.id}-content`}
                    role="region"
                    aria-labelledby={`${faq.id}-btn`}
                    className="lp-faq-content"
                  >
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </AnimatedSection>
  );
}
