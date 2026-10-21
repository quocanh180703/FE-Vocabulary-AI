import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { useAuth } from '../../auth/AuthContext';
import { Icon } from '../icons';
import { fadeInUp, heroIllustrationVariant } from '../../animations/variants';

export function HeroSection() {
  const { user } = useAuth();
  const nav = useNavigate();
  const shouldReduceMotion = useReducedMotion();
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const handlePlayAudio = () => {
    setIsPlayingAudio(true);
    // Use speech synthesis for natural pronunciation
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance('Persevere');
      utterance.lang = 'en-US';
      utterance.rate = 0.85;
      utterance.onend = () => setIsPlayingAudio(false);
      utterance.onerror = () => setIsPlayingAudio(false);
      window.speechSynthesis.speak(utterance);
    } else {
      setTimeout(() => setIsPlayingAudio(false), 800);
    }
  };

  const handleStartLearning = () => {
    if (user) {
      nav('/words');
    } else {
      nav('/login');
    }
  };

  const scrollToFeatures = () => {
    const el = document.getElementById('showcase');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section id="hero" className="lp-hero-section" aria-label="Giới thiệu nền tảng">
      <div className="lp-container">
        <div className="lp-hero-grid">
          {/* Left Column: Headline & Action */}
          <motion.div
            initial={shouldReduceMotion ? false : 'hidden'}
            animate="visible"
            variants={fadeInUp}
          >
            <div className="lp-hero-badge">
              <span className="dot" style={{ width: 8, height: 8 }} />
              <span>AI-Powered English Learning • CEFR A1–C1</span>
            </div>

            <h1 className="lp-hero-title">
              Học tiếng Anh thông minh hơn cùng <span className="lp-hero-title-highlight">AI</span>
            </h1>

            <p className="lp-hero-desc">
              Chinh phục vốn từ vựng chuẩn khung tham chiếu Châu Âu (CEFR), ghi nhớ dài hạn qua thuật toán 
              Spaced Repetition khoa học và rèn luyện phản xạ phát âm tự tin cùng AI Tutor 24/7.
            </p>

            <div className="lp-hero-ctas">
              <button
                type="button"
                className="lp-btn-hero-primary"
                onClick={handleStartLearning}
              >
                <span>{user ? 'Tiếp tục học ngay' : 'Bắt đầu học miễn phí'}</span>
                <Icon n="send" s={18} />
              </button>

              <button
                type="button"
                className="lp-btn-hero-secondary"
                onClick={scrollToFeatures}
              >
                <Icon n="spark" s={18} />
                <span>Khám phá tính năng</span>
              </button>
            </div>

            <div className="lp-hero-trust">
              <div className="lp-hero-trust-item">
                <span className="lp-trust-check">✓</span>
                <span>Hệ thống từ vựng phân loại theo chuẩn quốc tế <b>CEFR A1, A2, B1, B2, C1</b></span>
              </div>
              <div className="lp-hero-trust-item">
                <span className="lp-trust-check">✓</span>
                <span>Công nghệ AI giải nghĩa chuyên sâu, sửa lỗi ngữ pháp & chấm điểm phát âm</span>
              </div>
              <div className="lp-hero-trust-item">
                <span className="lp-trust-check">✓</span>
                <span>Ôn tập ngắt quãng Spaced Repetition thông minh chống quên lãng</span>
              </div>
            </div>
          </motion.div>

          {/* Right Column: Realistic Product UI Composition */}
          <motion.div
            className="lp-hero-preview"
            initial={shouldReduceMotion ? false : 'hidden'}
            animate="visible"
            variants={heroIllustrationVariant}
          >
            {/* Ambient halo behind preview card */}
            <div
              style={{
                position: 'absolute',
                top: '15%',
                left: '15%',
                right: '15%',
                bottom: '15%',
                background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.25) 0%, rgba(139, 92, 246, 0.25) 100%)',
                filter: 'blur(45px)',
                zIndex: 0,
                borderRadius: '50%',
              }}
            />

            {/* Main Word Card Preview */}
            <div className="lp-preview-card-main" style={{ position: 'relative', zIndex: 1 }}>
              <div className="lp-card-header">
                <span className="lp-word-badge">
                  <span className="dot g" style={{ width: 6, height: 6 }} />
                  B2 • Upper-Intermediate
                </span>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    color: '#64748B',
                    textTransform: 'uppercase',
                    letterSpacing: 0.6,
                  }}
                >
                  Động từ (Verb)
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
                <h2 className="lp-word-title">Persevere</h2>
                <button
                  type="button"
                  className="lp-audio-btn"
                  onClick={handlePlayAudio}
                  title="Nghe phát âm chuẩn"
                  aria-label="Phát âm từ Persevere"
                >
                  <Icon n={isPlayingAudio ? 'vol' : 'vol'} s={16} />
                </button>
              </div>

              <div className="lp-word-phonetic">
                <span>/ˌpɜːsɪˈvɪər/</span>
                <span style={{ fontSize: 13, color: '#10B981', fontWeight: 800 }}>• Giọng chuẩn bản xứ</span>
              </div>

              <div className="lp-word-meaning">
                Kiên trì, bền chí theo đuổi mục tiêu
              </div>

              <div className="lp-word-example">
                &ldquo;If you persevere with your daily English practice, you will make remarkable progress.&rdquo;
              </div>

              {/* Progress bar inside card */}
              <div style={{ marginTop: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 800, marginBottom: 6 }}>
                  <span style={{ color: '#64748B' }}>Độ nhớ từ vựng (SRS Spaced Repetition)</span>
                  <span style={{ color: '#4F46E5' }}>88% • Ghi nhớ vững chắc</span>
                </div>
                <div className="progress green" style={{ height: 8 }}>
                  <i style={{ width: '88%' }} />
                </div>
              </div>
            </div>

            {/* Floating AI Explanation Widget */}
            <motion.div
              className="lp-floating-ai"
              animate={
                shouldReduceMotion
                  ? {}
                  : {
                      y: [-4, 4, -4],
                      transition: { duration: 4.5, repeat: Infinity, ease: 'easeInOut' },
                    }
              }
              style={{ zIndex: 2 }}
            >
              <div className="lp-floating-icon">
                <Icon n="spark" s={20} />
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 900, color: '#7C3AED', textTransform: 'uppercase' }}>
                  AI Tutor Explanation
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1E293B', marginTop: 2, lineHeight: 1.4 }}>
                  Gốc từ Latin &ldquo;perseverare&rdquo;. Nhấn mạnh sự bền bỉ bất chấp khó khăn.
                </div>
              </div>
            </motion.div>

            {/* Floating Speaking Feedback Widget */}
            <motion.div
              className="lp-floating-speaking"
              animate={
                shouldReduceMotion
                  ? {}
                  : {
                      y: [4, -4, 4],
                      transition: { duration: 5, repeat: Infinity, ease: 'easeInOut' },
                    }
              }
              style={{ zIndex: 2 }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Icon n="mic" s={20} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 900, color: '#059669', textTransform: 'uppercase' }}>
                    Chấm điểm phát âm AI
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 900, color: '#0F172A', background: '#ECFDF5', padding: '1px 6px', borderRadius: 4 }}>
                    94/100
                  </span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', marginTop: 2 }}>
                  Phát âm chuẩn xác, trọng âm âm tiết 3 rất tự nhiên!
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
