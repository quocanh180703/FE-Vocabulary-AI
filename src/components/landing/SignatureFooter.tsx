import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMove } from '@use-gesture/react';
import { useInterval, useReducedMotion } from '@mantine/hooks';
import { useHover } from 'usehooks-ts';
import { VI_LOGO_TRANSPARENT } from '../../constants/mascot';
import { ViMascotImage } from '../ViMascotImage';
import { BlurUpImage } from '../states/BlurUpImage';

interface FooterWord {
  word: string;
  ipa: string;
  cefr: string;
  pos: string;
  meaningVi: string;
  example: string;
}

const MOMENT_WORDS: FooterWord[] = [
  {
    word: 'ephemeral',
    ipa: '/ɪˈfem.ər.əl/',
    cefr: 'C1',
    pos: 'tính từ',
    meaningVi: 'Thoáng qua, ngắn ngủi nhưng đáng nhớ.',
    example: 'Morning mist in the library garden is brief and ephemeral.',
  },
  {
    word: 'lucid',
    ipa: '/ˈluː.sɪd/',
    cefr: 'C1',
    pos: 'tính từ',
    meaningVi: 'Sáng rõ, mạch lạc và dễ hiểu.',
    example: 'Her lucid explanation made the grammar rule click instantly.',
  },
  {
    word: 'tenacious',
    ipa: '/təˈneɪ.ʃəs/',
    cefr: 'C1',
    pos: 'tính từ',
    meaningVi: 'Bền bỉ, không dễ bỏ cuộc trước mục tiêu.',
    example: 'Tenacious learners turn ten quiet minutes a day into fluency.',
  },
  {
    word: 'nuance',
    ipa: '/ˈnjuː.ɑːns/',
    cefr: 'C1',
    pos: 'danh từ',
    meaningVi: 'Sắc thái tinh tế giữa hai từ gần nghĩa.',
    example: 'Context sentences help you feel the nuance of every verb.',
  },
  {
    word: 'serendipity',
    ipa: '/ˌser.ənˈdɪp.ə.ti/',
    cefr: 'C1',
    pos: 'danh từ',
    meaningVi: 'Cơ duyên tình cờ tìm thấy điều quý giá.',
    example: 'Reviewing old cards often brings moments of serendipity.',
  },
];

interface SignatureFooterProps {
  ctaLink: string;
  onScrollToSection: (e: React.MouseEvent<HTMLAnchorElement>, id: string) => void;
  onPrimaryNavigate: (e: React.MouseEvent) => void;
}

export function SignatureFooter({
  ctaLink,
  onScrollToSection,
  onPrimaryNavigate,
}: SignatureFooterProps) {
  const reducedMotion = useReducedMotion();
  const stripRef = useRef<HTMLDivElement>(null);
  const wordmarkRef = useRef<HTMLDivElement>(null);
  const isHoveringStrip = useHover(stripRef as React.RefObject<HTMLElement>);

  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const current = MOMENT_WORDS[idx];

  const cycle = useInterval(() => {
    setIdx((prev) => (prev + 1) % MOMENT_WORDS.length);
    setRevealed(false);
  }, 6500);

  useEffect(() => {
    if (reducedMotion || isHoveringStrip || revealed) {
      cycle.stop();
      return;
    }
    cycle.start();
    return cycle.stop;
  }, [reducedMotion, isHoveringStrip, revealed, cycle]);

  // Pointer-reactive sheen on the giant footer wordmark via @use-gesture/react useMove
  const bindWordmark = useMove(({ xy: [cx, cy] }) => {
    if (reducedMotion || !wordmarkRef.current) return;
    const rect = wordmarkRef.current.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = (((cx - rect.left) / rect.width) * 100).toFixed(1);
    const y = (((cy - rect.top) / rect.height) * 100).toFixed(1);
    wordmarkRef.current.style.setProperty('--wm-x', `${x}%`);
    wordmarkRef.current.style.setProperty('--wm-y', `${y}%`);
  });

  const handleSpeak = useCallback(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setIsSpeaking((s) => !s);
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(current.word);
      u.lang = 'en-US';
      u.rate = 0.92;
      u.onstart = () => setIsSpeaking(true);
      u.onend = () => setIsSpeaking(false);
      u.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(u);
    } catch {
      setIsSpeaking((s) => !s);
    }
  }, [current.word]);

  const handleNextWord = () => {
    setIdx((prev) => (prev + 1) % MOMENT_WORDS.length);
    setRevealed(false);
  };

  return (
    <footer className="sig-footer" aria-label="Chân trang VocabularyAI">
      {/* Subtle deep-sage architectural backdrop */}
      <div className="sig-footer-arches" aria-hidden="true">
        <span className="sig-arch a" />
        <span className="sig-arch b" />
      </div>

      <div className="landing-wrap sig-footer-wrap">
        {/* SIGNATURE VOCABULARY HOOK: Live "Từ vựng ngay lúc này" Interactive Pronunciation + Flip Strip */}
        <div ref={stripRef} className="sig-word-strip glass">
          <div className="sig-word-main">
            <button
              type="button"
              className={`sig-wave-btn ${isSpeaking ? 'is-speaking' : ''}`}
              onClick={handleSpeak}
              aria-label={`Nghe phát âm từ ${current.word}`}
              title="Chạm để nghe phát âm chuẩn"
            >
              <span className="sig-wave-bars" aria-hidden="true">
                <span style={{ height: 8, animationDelay: '0s' }} />
                <span style={{ height: 18, animationDelay: '0.1s' }} />
                <span style={{ height: 12, animationDelay: '0.2s' }} />
                <span style={{ height: 20, animationDelay: '0.3s' }} />
                <span style={{ height: 10, animationDelay: '0.4s' }} />
              </span>
            </button>

            <div className="sig-word-copy">
              <div className="sig-word-head">
                <strong className="sig-word-term">{current.word}</strong>
                <span className="sig-word-ipa">{current.ipa}</span>
                <span className="sig-word-badge">{current.cefr} · {current.pos}</span>
              </div>

              {revealed ? (
                <div className="sig-word-reveal">
                  <span className="sig-word-meaning">{current.meaningVi}</span>
                  <span className="sig-word-example">“{current.example}”</span>
                </div>
              ) : (
                <div className="sig-word-prompt">
                  Chạm để nghe phát âm hoặc lật xem nghĩa tiếng Việt ngay tại đây.
                </div>
              )}
            </div>
          </div>

          <div className="sig-word-actions">
            <button
              type="button"
              className="sig-action-btn sig-action-btn--primary"
              onClick={() => setRevealed((r) => !r)}
            >
              {revealed ? 'Ẩn nghĩa' : 'Lật xem nghĩa'}
            </button>
            <button
              type="button"
              className="sig-action-btn"
              onClick={handleNextWord}
              aria-label="Chuyển sang từ Oxford tiếp theo"
            >
              Từ khác ↻
            </button>
          </div>
        </div>

        {/* Main Footer Grid: Transparent Vi Lockup + Lesson-Start Moment + 3 Clean Sitemap Columns */}
        <div className="sig-footer-grid">
          <div className="sig-brand-col">
            <div className="sig-brand-lockup">
              <BlurUpImage
                src={VI_LOGO_TRANSPARENT.file}
                alt={VI_LOGO_TRANSPARENT.alt}
                width={42}
                height={42}
                transparent
                priority
              />
              <div className="sig-brand-name">
                Vocabulary<em>AI</em>
              </div>
            </div>

            <div className="sig-lesson-card">
              <ViMascotImage
                pose="explain"
                size={62}
                transparent
                framed={false}
                alt="Vi trong suốt mời bạn bắt đầu buổi học 5 phút"
              />
              <div className="sig-lesson-copy">
                <strong>5 phút mở đầu cùng Vi</strong>
                <Link to={ctaLink} className="sig-lesson-link" onClick={onPrimaryNavigate}>
                  Vào hàng đợi học hôm nay →
                </Link>
              </div>
            </div>
          </div>

          <nav className="sig-nav-col" aria-label="Vòng học">
            <div className="sig-col-title">Vòng học</div>
            <Link to="/dashboard">Tổng quan hôm nay</Link>
            <Link to="/words">Kho 4.900+ từ Oxford</Link>
            <Link to="/review">Ôn tập SRS</Link>
            <Link to="/speaking">Luyện nói cùng Vi</Link>
          </nav>

          <nav className="sig-nav-col" aria-label="Khám phá">
            <div className="sig-col-title">Khám phá</div>
            <a href="#loop" onClick={(e) => onScrollToSection(e, 'loop')}>Vòng lặp 3 bước</a>
            <a href="#library" onClick={(e) => onScrollToSection(e, 'library')}>Thư viện CEFR A1–C1</a>
            <a href="#pricing" onClick={(e) => onScrollToSection(e, 'pricing')}>Học phí Free &amp; Premium</a>
            <a href="#faq" onClick={(e) => onScrollToSection(e, 'faq')}>Câu hỏi thường gặp</a>
          </nav>

          <nav className="sig-nav-col" aria-label="Pháp lý">
            <div className="sig-col-title">Pháp lý</div>
            <Link to="/dieu-khoan">Điều khoản sử dụng</Link>
            <Link to="/chinh-sach-bao-mat">Chính sách bảo mật</Link>
            <Link to="/login">Đăng nhập / Tạo tài khoản</Link>
          </nav>
        </div>

        {/* Giant Outlined Interactive Wordmark */}
        <div ref={wordmarkRef} {...bindWordmark()} className="sig-wordmark" aria-hidden="true">
          VocabularyAI
        </div>

        {/* Clean Legal Bottom Line */}
        <div className="sig-legal-row">
          <span>© 2026 VocabularyAI · Sage Thư Viện</span>
          <span>Oxford 3000/5000 · SRS 1–3–7–14–30 ngày · Thanh toán PayOS</span>
        </div>
      </div>
    </footer>
  );
}
