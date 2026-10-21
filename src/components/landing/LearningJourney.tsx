import { Icon } from '../icons';
import { AnimatedSection } from '../../animations/AnimatedSection';

export function LearningJourney() {
  const steps = [
    {
      num: 1,
      title: 'Tra cứu & Tiếp nạp',
      desc: 'Tìm kiếm từ mới qua thanh tìm kiếm thông minh hoặc theo từng chủ đề cấp độ CEFR.',
      icon: 'search' as const,
    },
    {
      num: 2,
      title: 'Khám phá ngữ cảnh',
      desc: 'Đọc phân tích ngữ nghĩa, nghe phát âm bản xứ và xem các ví dụ trực quan sinh động.',
      icon: 'spark' as const,
    },
    {
      num: 3,
      title: 'Ôn tập Flashcard',
      desc: 'Thuật toán SRS tự động sắp lịch nhắc lại đúng thời điểm để khắc sâu vào trí nhớ dài hạn.',
      icon: 'bulb' as const,
    },
    {
      num: 4,
      title: 'Kiểm tra Quiz',
      desc: 'Thực hành các câu hỏi trắc nghiệm bấm giờ để kiểm tra độ nhạy bén và độ chính xác.',
      icon: 'zap' as const,
    },
    {
      num: 5,
      title: 'Luyện nói thực hành',
      desc: 'Thu âm bài nói với chủ đề thực tế và nhận phản hồi chi tiết về phát âm, độ trôi chảy.',
      icon: 'mic' as const,
    },
  ];

  return (
    <AnimatedSection id="journey" className="lp-section">
      <div className="lp-container">
        <div className="lp-section-header">
          <div className="lp-section-eyebrow">
            <Icon n="chart" s={16} />
            <span>Phương pháp khoa học</span>
          </div>
          <h2 className="lp-section-title">
            Hành trình 5 bước chinh phục từ vựng bền vững
          </h2>
          <p className="lp-section-subtitle">
            Quy trình khép kín từ nhận diện, thấu hiểu, ghi nhớ ngắt quãng đến ứng dụng thực tế vào giao tiếp 
            giúp bạn biến từ vựng thụ động thành vốn từ chủ động.
          </p>
        </div>

        {/* 5-Step Connected Flow */}
        <div className="lp-journey-steps">
          {steps.map((st) => (
            <div key={st.num} className="lp-journey-step">
              <div className="lp-step-num">{st.num}</div>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: 'var(--lp-bg-soft)',
                  color: 'var(--lp-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 14px',
                }}
              >
                <Icon n={st.icon} s={22} />
              </div>
              <h4 style={{ fontSize: 17, fontWeight: 900, color: 'var(--lp-text-primary)', marginBottom: 8 }}>
                {st.title}
              </h4>
              <p style={{ fontSize: 13.5, color: 'var(--lp-text-secondary)', lineHeight: 1.55 }}>
                {st.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </AnimatedSection>
  );
}
