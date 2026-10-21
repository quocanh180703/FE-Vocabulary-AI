import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Icon } from '../icons';
import { AnimatedSection } from '../../animations/AnimatedSection';

type ShowcaseTab = 'search' | 'flashcard' | 'quiz' | 'speaking';

export function ProductShowcase() {
  const [activeTab, setActiveTab] = useState<ShowcaseTab>('search');
  const [cardFlipped, setCardFlipped] = useState(false);
  const [selectedQuizOption, setSelectedQuizOption] = useState<number | null>(null);
  const [isRecordingDemo, setIsRecordingDemo] = useState(false);
  const nav = useNavigate();

  return (
    <AnimatedSection id="showcase" className="lp-section lp-section-alt">
      <div className="lp-container">
        <div className="lp-section-header">
          <div className="lp-section-eyebrow">
            <Icon n="spark" s={16} />
            <span>Trải nghiệm học tập thực tế</span>
          </div>
          <h2 className="lp-section-title">
            Mọi công cụ bạn cần để làm chủ tiếng Anh toàn diện
          </h2>
          <p className="lp-section-subtitle">
            Khám phá 4 trụ cột học tập cốt lõi được thiết kế thông minh, kết hợp phương pháp sư phạm 
            chuẩn quốc tế và trí tuệ nhân tạo thế hệ mới.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="lp-showcase-nav" role="tablist" aria-label="Tính năng chính">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'search'}
            className={`lp-showcase-tab ${activeTab === 'search' ? 'active' : ''}`}
            onClick={() => setActiveTab('search')}
          >
            <Icon n="search" s={18} />
            <span>1. Tra cứu & AI giải nghĩa</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'flashcard'}
            className={`lp-showcase-tab ${activeTab === 'flashcard' ? 'active' : ''}`}
            onClick={() => setActiveTab('flashcard')}
          >
            <Icon n="bulb" s={18} />
            <span>2. Flashcard Spaced Repetition</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'quiz'}
            className={`lp-showcase-tab ${activeTab === 'quiz' ? 'active' : ''}`}
            onClick={() => setActiveTab('quiz')}
          >
            <Icon n="zap" s={18} />
            <span>3. Trắc nghiệm & Đánh giá</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'speaking'}
            className={`lp-showcase-tab ${activeTab === 'speaking' ? 'active' : ''}`}
            onClick={() => setActiveTab('speaking')}
          >
            <Icon n="mic" s={18} />
            <span>4. Luyện nói & Chấm điểm AI</span>
          </button>
        </div>

        {/* Dynamic Showcase Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'search' && (
            <motion.div
              key="search"
              className="lp-showcase-content"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.35 }}
            >
              <div>
                <span className="lp-word-badge" style={{ marginBottom: 12 }}>
                  Tra cứu thông minh
                </span>
                <h3 style={{ fontSize: 28, fontWeight: 900, marginBottom: 12, color: 'var(--lp-text-primary)' }}>
                  Tra cứu sâu sắc — Hiểu từ vựng tận gốc rễ
                </h3>
                <p style={{ color: 'var(--lp-text-secondary)', fontSize: 16, lineHeight: 1.6, marginBottom: 20 }}>
                  Không chỉ là từ điển dịch nghĩa thông thường. AI phân tích từ loại, phiên âm IPA chuẩn, ngữ cảnh 
                  sử dụng trong giao tiếp quốc tế và đưa ra các mẹo ghi nhớ dựa trên từ nguyên học (etymology).
                </p>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 26 }}>
                  <li style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 700, color: 'var(--lp-text-secondary)' }}>
                    <span style={{ color: 'var(--lp-success)', fontWeight: 900 }}>✓</span>
                    Phân cấp chuẩn xác theo CEFR từ A1 đến C1
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 700, color: 'var(--lp-text-secondary)' }}>
                    <span style={{ color: 'var(--lp-success)', fontWeight: 900 }}>✓</span>
                    Giải thích ngữ nghĩa chuyên sâu bằng mô hình AI Gemini
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 700, color: 'var(--lp-text-secondary)' }}>
                    <span style={{ color: 'var(--lp-success)', fontWeight: 900 }}>✓</span>
                    Ví dụ thực tế kèm audio phát âm bản xứ
                  </li>
                </ul>
                <button
                  type="button"
                  className="lp-btn-primary"
                  onClick={() => nav('/words')}
                >
                  <Icon n="book" s={18} />
                  <span>Khám phá kho từ vựng</span>
                </button>
              </div>

              {/* Interactive preview UI */}
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 18, padding: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: 12, padding: '10px 14px', marginBottom: 18 }}>
                  <Icon n="search" s={18} />
                  <span style={{ fontWeight: 800, color: '#0F172A', fontSize: 16 }}>resilient</span>
                  <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 800, background: '#EEF2FF', color: '#4F46E5', padding: '2px 8px', borderRadius: 6 }}>
                    B2
                  </span>
                </div>

                <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 14, padding: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <b style={{ fontSize: 24, color: '#0F172A' }}>Resilient</b>
                    <span style={{ fontSize: 13, color: '#64748B', fontWeight: 700 }}>Tính từ (Adj)</span>
                  </div>
                  <div style={{ fontSize: 14, color: '#64748B', fontWeight: 700, margin: '4px 0 10px' }}>
                    /rɪˈzɪl.jənt/
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#4F46E5', marginBottom: 8 }}>
                    Có khả năng phục hồi nhanh, kiên cường
                  </div>
                  <div style={{ fontSize: 13.5, fontStyle: 'italic', color: '#334155', background: '#F1F5F9', padding: '8px 12px', borderRadius: 8, borderLeft: '3px solid #4F46E5' }}>
                    &ldquo;Children are often remarkably resilient to change.&rdquo;
                  </div>
                  <div style={{ marginTop: 14, padding: 12, background: '#F5F3FF', borderRadius: 10, border: '1px solid #DDD6FE' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 900, color: '#7C3AED', textTransform: 'uppercase' }}>
                      <Icon n="spark" s={14} /> AI Contextual Tip
                    </div>
                    <div style={{ fontSize: 13, color: '#1E1B4B', fontWeight: 700, marginTop: 4 }}>
                      Từ &ldquo;resilient&rdquo; thường xuất hiện trong IELTS và bài luận học thuật khi miêu tả tinh thần vượt khó.
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'flashcard' && (
            <motion.div
              key="flashcard"
              className="lp-showcase-content"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.35 }}
            >
              <div>
                <span className="lp-word-badge" style={{ marginBottom: 12, background: '#FEF3C7', color: '#B45309' }}>
                  Khoa học ghi nhớ
                </span>
                <h3 style={{ fontSize: 28, fontWeight: 900, marginBottom: 12, color: 'var(--lp-text-primary)' }}>
                  Spaced Repetition — Đánh bại đường cong quên lãng
                </h3>
                <p style={{ color: 'var(--lp-text-secondary)', fontSize: 16, lineHeight: 1.6, marginBottom: 20 }}>
                  Dựa trên nguyên lý lặp lại ngắt quãng (SRS), hệ thống tự động tính toán thời điểm chính xác bạn 
                  sắp quên một từ để nhắc ôn lại. Giúp bạn nhớ 1,000+ từ vựng vào trí nhớ dài hạn mà không bị quá tải.
                </p>
                <div style={{ display: 'flex', gap: 14, marginBottom: 26 }}>
                  <div style={{ padding: '12px 18px', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: '#64748B' }}>CHU KỲ ÔN TẬP</div>
                    <b style={{ fontSize: 18, color: '#4F46E5' }}>1 - 3 - 7 - 14 - 30 ngày</b>
                  </div>
                  <div style={{ padding: '12px 18px', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: '#64748B' }}>HIỆU QUẢ</div>
                    <b style={{ fontSize: 18, color: '#059669' }}>Lưu giữ dài hạn</b>
                  </div>
                </div>
                <button
                  type="button"
                  className="lp-btn-primary"
                  onClick={() => nav('/review')}
                >
                  <Icon n="bulb" s={18} />
                  <span>Trải nghiệm ôn tập Flashcard</span>
                </button>
              </div>

              {/* Interactive Flashcard Preview */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div
                  onClick={() => setCardFlipped(!cardFlipped)}
                  style={{
                    width: '100%',
                    maxWidth: 380,
                    minHeight: 250,
                    background: cardFlipped ? '#EEF2FF' : '#FFFFFF',
                    border: '2px solid',
                    borderColor: cardFlipped ? '#818CF8' : '#CBD5E1',
                    borderRadius: 20,
                    padding: 28,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    boxShadow: '0 12px 28px -6px rgba(79, 70, 229, 0.12)',
                    transition: 'all 0.25s ease',
                  }}
                  title="Bấm để lật thẻ"
                >
                  {!cardFlipped ? (
                    <>
                      <span style={{ fontSize: 12, fontWeight: 900, color: '#64748B', textTransform: 'uppercase', marginBottom: 8 }}>
                        Mặt trước • Chạm để lật
                      </span>
                      <div style={{ fontSize: 34, fontWeight: 900, color: '#0F172A', marginBottom: 4 }}>
                        Ambiguous
                      </div>
                      <div style={{ fontSize: 15, color: '#64748B', fontWeight: 700, marginBottom: 12 }}>
                        /æmˈbɪɡ.ju.əs/ • C1
                      </div>
                      <div style={{ fontSize: 13.5, color: '#475569', fontStyle: 'italic' }}>
                        &ldquo;His reply was ambiguous and left everyone confused.&rdquo;
                      </div>
                    </>
                  ) : (
                    <>
                      <span style={{ fontSize: 12, fontWeight: 900, color: '#4F46E5', textTransform: 'uppercase', marginBottom: 8 }}>
                        Mặt sau • Nghĩa tiếng Việt
                      </span>
                      <div style={{ fontSize: 24, fontWeight: 900, color: '#4338CA', marginBottom: 10 }}>
                        Mơ hồ, nước đôi, khó hiểu
                      </div>
                      <div style={{ fontSize: 13.5, color: '#334155', fontWeight: 700 }}>
                        Mẹo nhớ: Tiền tố &ldquo;ambi-&rdquo; nghĩa là hai phía, nước đôi.
                      </div>
                      <span style={{ marginTop: 14, fontSize: 12, fontWeight: 800, color: '#059669', background: '#ECFDF5', padding: '4px 10px', borderRadius: 99 }}>
                        Chu kỳ tiếp theo: 7 ngày sau
                      </span>
                    </>
                  )}
                </div>
                <div style={{ marginTop: 12, fontSize: 13, color: '#64748B', fontWeight: 700 }}>
                  💡 Bấm vào thẻ để lật qua lại giữa câu hỏi và giải nghĩa
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'quiz' && (
            <motion.div
              key="quiz"
              className="lp-showcase-content"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.35 }}
            >
              <div>
                <span className="lp-word-badge" style={{ marginBottom: 12, background: '#FDF2F8', color: '#BE185D' }}>
                  Kiểm tra phản xạ
                </span>
                <h3 style={{ fontSize: 28, fontWeight: 900, marginBottom: 12, color: 'var(--lp-text-primary)' }}>
                  Quiz tương tác — Đo lường tiến độ tức thì
                </h3>
                <p style={{ color: 'var(--lp-text-secondary)', fontSize: 16, lineHeight: 1.6, marginBottom: 20 }}>
                  Hệ thống bài kiểm tra đa dạng theo từng cấp độ CEFR. Tự động tính điểm, chấm thời gian và 
                  phân tích câu sai để giúp bạn củng cố các lỗ hổng từ vựng ngay trong quá trình học.
                </p>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 26 }}>
                  <li style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 700, color: 'var(--lp-text-secondary)' }}>
                    <span style={{ color: 'var(--lp-success)', fontWeight: 900 }}>✓</span>
                    Thời gian làm bài có đồng hồ đếm ngược chân thực
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 700, color: 'var(--lp-text-secondary)' }}>
                    <span style={{ color: 'var(--lp-success)', fontWeight: 900 }}>✓</span>
                    Chấm điểm phần trăm và phản hồi AI chi tiết sau khi nộp bài
                  </li>
                </ul>
                <button
                  type="button"
                  className="lp-btn-primary"
                  onClick={() => nav('/quiz')}
                >
                  <Icon n="zap" s={18} />
                  <span>Vào phòng làm Quiz</span>
                </button>
              </div>

              {/* Interactive Quiz Mini Demo */}
              <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 18, padding: 24, boxShadow: '0 8px 24px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#4F46E5' }}>Câu hỏi thử nghiệm 1/1</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#DC2626' }}>⏱️ 00:45</span>
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', marginBottom: 16 }}>
                  Từ nào đồng nghĩa với &ldquo;Peculiar&rdquo;?
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { id: 0, text: 'A. Strange / Unusual', correct: true },
                    { id: 1, text: 'B. Common / Ordinary', correct: false },
                    { id: 2, text: 'C. Easy / Simple', correct: false },
                    { id: 3, text: 'D. Fast / Quick', correct: false },
                  ].map((opt) => {
                    const isSelected = selectedQuizOption === opt.id;
                    let bg = '#F8FAFC';
                    let borderColor = '#E2E8F0';
                    let textColor = '#0F172A';

                    if (selectedQuizOption !== null) {
                      if (opt.correct) {
                        bg = '#ECFDF5';
                        borderColor = '#10B981';
                        textColor = '#065F46';
                      } else if (isSelected && !opt.correct) {
                        bg = '#FEF2F2';
                        borderColor = '#EF4444';
                        textColor = '#991B1B';
                      }
                    }

                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setSelectedQuizOption(opt.id)}
                        style={{
                          textAlign: 'left',
                          padding: '12px 16px',
                          borderRadius: 10,
                          border: `1.5px solid ${borderColor}`,
                          background: bg,
                          color: textColor,
                          fontWeight: 700,
                          fontSize: 14.5,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <span>{opt.text}</span>
                        {selectedQuizOption !== null && opt.correct && (
                          <span style={{ fontWeight: 900, color: '#10B981' }}>✓ Đúng</span>
                        )}
                        {isSelected && !opt.correct && (
                          <span style={{ fontWeight: 900, color: '#EF4444' }}>✗ Chưa đúng</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'speaking' && (
            <motion.div
              key="speaking"
              className="lp-showcase-content"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.35 }}
            >
              <div>
                <span className="lp-word-badge" style={{ marginBottom: 12, background: '#ECFDF5', color: '#047857' }}>
                  Luyện nói AI Voice
                </span>
                <h3 style={{ fontSize: 28, fontWeight: 900, marginBottom: 12, color: 'var(--lp-text-primary)' }}>
                  Luyện nói tiếng Anh cùng AI — Tự tin giao tiếp
                </h3>
                <p style={{ color: 'var(--lp-text-secondary)', fontSize: 16, lineHeight: 1.6, marginBottom: 20 }}>
                  Thu âm giọng nói trực tiếp qua trình duyệt với định dạng âm thanh chất lượng cao. AI phân tích 
                  bài nói theo 4 tiêu chí chuẩn quốc tế: Phát âm (Pronunciation), Ngữ pháp (Grammar), Từ vựng (Vocabulary) 
                  và Độ trôi chảy (Fluency).
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 24 }}>
                  <div style={{ padding: '10px 14px', background: '#F8FAFC', borderRadius: 10, border: '1px solid #E2E8F0' }}>
                    <span style={{ fontSize: 12, color: '#64748B', fontWeight: 800 }}>PHÁT ÂM CHUẨN</span>
                    <div style={{ fontSize: 18, fontWeight: 900, color: '#059669' }}>94/100</div>
                  </div>
                  <div style={{ padding: '10px 14px', background: '#F8FAFC', borderRadius: 10, border: '1px solid #E2E8F0' }}>
                    <span style={{ fontSize: 12, color: '#64748B', fontWeight: 800 }}>ĐỘ LƯU LOÁT</span>
                    <div style={{ fontSize: 18, fontWeight: 900, color: '#4F46E5' }}>90/100</div>
                  </div>
                </div>
                <button
                  type="button"
                  className="lp-btn-primary"
                  onClick={() => nav('/speaking')}
                >
                  <Icon n="mic" s={18} />
                  <span>Vào phòng luyện nói AI</span>
                </button>
              </div>

              {/* Interactive Speaking Demo Widget */}
              <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 18, padding: 26, boxShadow: '0 8px 24px rgba(0,0,0,0.04)', textAlign: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>
                  Chủ đề: Describe a goal you achieved
                </span>

                <div style={{ margin: '20px 0' }}>
                  <button
                    type="button"
                    onClick={() => setIsRecordingDemo(!isRecordingDemo)}
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: '50%',
                      background: isRecordingDemo ? '#EF4444' : '#4F46E5',
                      border: 'none',
                      color: '#FFFFFF',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      boxShadow: isRecordingDemo ? '0 0 0 10px rgba(239, 68, 68, 0.2)' : '0 4px 14px rgba(79, 70, 229, 0.3)',
                      transition: 'all 0.2s ease',
                    }}
                    title={isRecordingDemo ? 'Bấm để dừng thu âm' : 'Bấm để bắt đầu thử thu âm'}
                  >
                    <Icon n="mic" s={32} />
                  </button>
                </div>

                <div style={{ fontSize: 14, fontWeight: 800, color: isRecordingDemo ? '#EF4444' : '#64748B' }}>
                  {isRecordingDemo ? '🔴 Đang thu âm giọng nói của bạn...' : 'Bấm vào micro để thử nghiệm thu âm'}
                </div>

                <div style={{ marginTop: 18, textAlign: 'left', background: '#F8FAFC', padding: 14, borderRadius: 12, border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: 12, fontWeight: 900, color: '#059669', marginBottom: 4 }}>
                    ✓ ĐÁNH GIÁ TỔNG QUAN
                  </div>
                  <div style={{ fontSize: 13, color: '#334155', fontWeight: 700 }}>
                    &ldquo;Âm điệu tự nhiên, từ nối phong phú (furthermore, however). Hãy chú ý âm đuôi /t/ và /d/ nhé!&rdquo;
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AnimatedSection>
  );
}
