import { useNavigate } from 'react-router-dom';
import { Icon } from '../icons';
import { AnimatedSection } from '../../animations/AnimatedSection';

export function AiPoweredSection() {
  const nav = useNavigate();

  const aiFeatures = [
    {
      icon: 'spark' as const,
      iconBg: '#EEF2FF',
      iconColor: '#4F46E5',
      title: 'Giải nghĩa ngữ cảnh chuyên sâu (Gemini AI)',
      description: 'Không dừng lại ở việc tra nghĩa máy móc, AI phân tích cặn kẽ gốc từ (etymology), sắc thái biểu cảm và các cụm từ (collocations) thường gặp nhất trong văn viết và giao tiếp thực tế.',
      route: '/words',
      actionLabel: 'Thử tra cứu cùng AI',
      badge: 'Công nghệ Gemini',
    },
    {
      icon: 'msg' as const,
      iconBg: '#F5F3FF',
      iconColor: '#7C3AED',
      title: 'Trợ lý AI Tutor tương tác 24/7',
      description: 'Trò chuyện linh hoạt cùng trợ lý ảo Vi về bất kỳ điểm ngữ pháp, cách đặt câu hay phương pháp học tiếng Anh nào. Bạn nhận được câu trả lời thân thiện, dễ hiểu ngay lập tức.',
      route: '/chat',
      actionLabel: 'Trò chuyện cùng AI Tutor',
      badge: 'Phản hồi tức thì',
    },
    {
      icon: 'pen' as const,
      iconBg: '#ECFDF5',
      iconColor: '#059669',
      title: 'Kiểm tra & Sửa lỗi ngữ pháp thông minh',
      description: 'Nhập câu hoặc đoạn văn bất kỳ để AI phát hiện các lỗi sai về thì, trật tự từ, cách dùng mạo từ. Đi kèm lời giải thích vì sao sai và đề xuất câu viết tự nhiên hơn.',
      route: '/grammar',
      actionLabel: 'Thử sửa lỗi ngữ pháp',
      badge: 'Chính xác cao',
    },
    {
      icon: 'mic' as const,
      iconBg: '#FFFBEB',
      iconColor: '#D97706',
      title: 'Đánh giá phát âm & Phản xạ nói qua giọng nói',
      description: 'Công nghệ phân tích âm thanh thu trực tiếp từ micro, bóc tách phát âm và đối chiếu với giọng bản xứ chuẩn. Trả về bảng điểm chi tiết theo 4 tiêu chí quốc tế.',
      route: '/speaking',
      actionLabel: 'Thử luyện nói cùng AI',
      badge: 'Đánh giá 4 kỹ năng',
    },
  ];

  return (
    <AnimatedSection id="ai-learning" className="lp-section lp-section-alt">
      <div className="lp-container">
        <div className="lp-section-header">
          <div className="lp-section-eyebrow">
            <Icon n="spark" s={16} />
            <span>Sức mạnh trí tuệ nhân tạo</span>
          </div>
          <h2 className="lp-section-title">
            Học thông minh hơn nhờ công nghệ AI thế hệ mới
          </h2>
          <p className="lp-section-subtitle">
            VocabularyAI tích hợp các mô hình ngôn ngữ lớn và công nghệ xử lý âm thanh hiện đại, 
            đóng vai trò như một gia sư tiếng Anh bản ngữ tận tâm đồng hành cùng bạn 24/7.
          </p>
        </div>

        {/* 2x2 Feature Cards Grid */}
        <div className="lp-ai-grid">
          {aiFeatures.map((f) => (
            <div key={f.title} className="lp-ai-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div className="lp-ai-icon-box" style={{ background: f.iconBg, color: f.iconColor }}>
                  <Icon n={f.icon} s={24} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 900, background: '#FFFFFF', border: '1px solid #E2E8F0', padding: '4px 10px', borderRadius: 99, color: f.iconColor }}>
                  {f.badge}
                </span>
              </div>

              <h3 style={{ fontSize: 20, fontWeight: 900, color: 'var(--lp-text-primary)', marginBottom: 12, lineHeight: 1.35 }}>
                {f.title}
              </h3>

              <p style={{ color: 'var(--lp-text-secondary)', fontSize: 15, lineHeight: 1.6, flexGrow: 1, marginBottom: 22 }}>
                {f.description}
              </p>

              <div>
                <button
                  type="button"
                  onClick={() => nav(f.route)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    color: f.iconColor,
                    fontWeight: 800,
                    fontSize: 14.5,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <span>{f.actionLabel}</span>
                  <span style={{ fontSize: 18 }}>→</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AnimatedSection>
  );
}
