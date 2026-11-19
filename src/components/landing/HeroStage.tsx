import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useGesture } from '@use-gesture/react';
import { useInterval, useReducedMotion } from '@mantine/hooks';
import { useMediaQuery } from 'usehooks-ts';
import { ViMascotImage } from '../ViMascotImage';

export interface HeroWord {
  word: string;
  ipa: string;
  pos: string;
  cefr: string;
  srsMilestone: string;
  meaningVi: string;
  example: string;
  exampleVi: string;
  quizPrompt: string;
  quizCorrect: string;
  quizDistractor: string;
}

export const HERO_WORDS: HeroWord[] = [
  {
    word: 'serendipity',
    ipa: '/ˌser.ənˈdɪp.ə.ti/',
    pos: 'danh từ',
    cefr: 'Oxford 5000 · C1',
    srsMilestone: 'Mốc 7 ngày',
    meaningVi: 'Cơ duyên tình cờ tìm thấy điều quý giá khi không chủ đích kiếm tìm.',
    example: 'Meeting my mentor at that small bookshop was pure serendipity.',
    exampleVi: 'Gặp người cố vấn tại hiệu sách nhỏ đó là một cơ duyên tình cờ.',
    quizPrompt: 'Nghĩa đúng của “serendipity”?',
    quizCorrect: 'Cơ duyên tình cờ',
    quizDistractor: 'Sự lặp lại đều đặn',
  },
  {
    word: 'resilient',
    ipa: '/rɪˈzɪl.jənt/',
    pos: 'tính từ',
    cefr: 'Oxford 3000 · B2',
    srsMilestone: 'Mốc 3 ngày',
    meaningVi: 'Kiên cường, có khả năng phục hồi nhanh sau thử thách.',
    example: 'She remained resilient throughout the toughest months of building her startup.',
    exampleVi: 'Cô ấy vẫn kiên cường trong những tháng khó khăn nhất khi khởi nghiệp.',
    quizPrompt: 'Nghĩa đúng của “resilient”?',
    quizCorrect: 'Kiên cường, mau phục hồi',
    quizDistractor: 'Do dự, chần chừ',
  },
  {
    word: 'eloquent',
    ipa: '/ˈel.ə.kwənt/',
    pos: 'tính từ',
    cefr: 'Oxford 5000 · C1',
    srsMilestone: 'Mốc 14 ngày',
    meaningVi: 'Hùng biện, diễn đạt trôi chảy và giàu sức thuyết phục.',
    example: 'Her eloquent presentation convinced the entire committee.',
    exampleVi: 'Bài thuyết trình đầy sức thuyết phục của cô ấy đã chinh phục cả hội đồng.',
    quizPrompt: 'Nghĩa đúng của “eloquent”?',
    quizCorrect: 'Hùng biện, lưu loát',
    quizDistractor: 'Kín đáo, ít nói',
  },
  {
    word: 'articulate',
    ipa: '/ɑːˈtɪk.jə.leɪt/',
    pos: 'động từ',
    cefr: 'Oxford 5000 · C1',
    srsMilestone: 'Mốc 30 ngày',
    meaningVi: 'Diễn đạt rõ ràng, mạch lạc từng ý tưởng phức tạp.',
    example: 'He can articulate complex ideas in simple, natural English.',
    exampleVi: 'Anh ấy có thể diễn đạt các ý tưởng phức tạp bằng tiếng Anh tự nhiên.',
    quizPrompt: 'Nghĩa đúng của “articulate”?',
    quizCorrect: 'Diễn đạt mạch lạc',
    quizDistractor: 'Ghi chép ngắn gọn',
  },
];

const CYCLE_MS = 4000;
const TICK_MS = 80;

interface HeroStageProps {
  heroStageRef: React.RefObject<HTMLElement | null>;
  mistLayerRef: React.RefObject<HTMLDivElement | null>;
  scrollFlipDeg: number;
  ctaLink: string;
  onPrimaryNavigate: (e: React.MouseEvent) => void;
}

export function HeroStage({
  heroStageRef,
  mistLayerRef,
  scrollFlipDeg,
  ctaLink,
  onPrimaryNavigate,
}: HeroStageProps) {
  const reducedMotion = useReducedMotion();
  const isMobile = useMediaQuery('(max-width: 900px)');

  const [wordIdx, setWordIdx] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [manualFlipped, setManualFlipped] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isCardPaused, setIsCardPaused] = useState(false);
  const [quizPicked, setQuizPicked] = useState<'correct' | 'wrong' | null>('correct');
  const [viBounce, setViBounce] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);
  const dragConsumedRef = useRef(false);

  const activeWord = HERO_WORDS[wordIdx];

  // Smooth SRS countdown ring & 4-second Oxford word cycle via @mantine/hooks useInterval
  const ticker = useInterval(() => {
    setElapsedMs((prev) => {
      const next = prev + TICK_MS;
      if (next >= CYCLE_MS) {
        setWordIdx((i) => (i + 1) % HERO_WORDS.length);
        setQuizPicked('correct');
        return 0;
      }
      return next;
    });
  }, TICK_MS);

  useEffect(() => {
    if (reducedMotion || isCardPaused) {
      ticker.stop();
      return;
    }
    ticker.start();
    return ticker.stop;
  }, [reducedMotion, isCardPaused, ticker]);

  // Trigger subtle Vi reaction when flipping or switching words
  const triggerViReaction = useCallback(() => {
    if (reducedMotion) return;
    setViBounce(true);
    window.setTimeout(() => setViBounce(false), 380);
  }, [reducedMotion]);

  // @use-gesture/react: drag-to-flip/swipe + <= 5deg pointer tilt + cursor specular glint
  const bindCardGesture = useGesture(
    {
      onMove: ({ xy: [cx, cy] }) => {
        if (isMobile || reducedMotion || !cardRef.current) return;
        const rect = cardRef.current.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const px = Math.max(0, Math.min(1, (cx - rect.left) / rect.width));
        const py = Math.max(0, Math.min(1, (cy - rect.top) / rect.height));
        const rx = (0.5 - py) * 10; // max +/- 5 deg
        const ry = (px - 0.5) * 10; // max +/- 5 deg
        cardRef.current.style.setProperty('--tilt-x', `${Math.max(-5, Math.min(5, rx)).toFixed(2)}deg`);
        cardRef.current.style.setProperty('--tilt-y', `${Math.max(-5, Math.min(5, ry)).toFixed(2)}deg`);
        cardRef.current.style.setProperty('--glint-x', `${(px * 100).toFixed(1)}%`);
        cardRef.current.style.setProperty('--glint-y', `${(py * 100).toFixed(1)}%`);
        cardRef.current.style.setProperty('--glint-alpha', '0.96');
      },
      onHover: ({ hovering }) => {
        setIsCardPaused(Boolean(hovering));
        if (!hovering && cardRef.current) {
          cardRef.current.style.setProperty('--tilt-x', '0deg');
          cardRef.current.style.setProperty('--tilt-y', '0deg');
          cardRef.current.style.setProperty('--glint-alpha', '0.62');
        }
      },
      onDrag: ({ movement: [mx], last, tap }) => {
        if (tap) return;
        if (last && Math.abs(mx) > 36) {
          dragConsumedRef.current = true;
          if (mx < -36) {
            setWordIdx((i) => (i + 1) % HERO_WORDS.length);
            setElapsedMs(0);
          } else {
            setManualFlipped((f) => !f);
          }
          triggerViReaction();
          window.setTimeout(() => {
            dragConsumedRef.current = false;
          }, 120);
        }
      },
    },
    {
      drag: { filterTaps: true, axis: 'x' },
    }
  );

  const handlePronounce = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      triggerViReaction();
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        setIsSpeaking((s) => !s);
        return;
      }
      try {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(activeWord.word);
        u.lang = 'en-US';
        u.rate = 0.92;
        u.onstart = () => setIsSpeaking(true);
        u.onend = () => setIsSpeaking(false);
        u.onerror = () => setIsSpeaking(false);
        window.speechSynthesis.speak(u);
      } catch {
        setIsSpeaking((s) => !s);
      }
    },
    [activeWord.word, triggerViReaction]
  );

  const totalFlipDeg = reducedMotion
    ? manualFlipped
      ? 180
      : 0
    : manualFlipped
    ? Math.max(180, scrollFlipDeg + 180)
    : scrollFlipDeg;

  const srsProgress = reducedMotion ? 0.72 : elapsedMs / CYCLE_MS;
  const ringR = 13;
  const ringC = 2 * Math.PI * ringR;
  const ringOffset = ringC * (1 - srsProgress);

  return (
    <section id="hero" ref={heroStageRef} className="hero-stage">
      <div className="hero-scene-bg scene-depth" aria-hidden="true">
        <div className="hero-arch a" />
        <div className="hero-arch b" />
        <div className="hero-arch c" />
        <div ref={mistLayerRef} className="hero-mist-layer">
          <div className="hero-mist m1" />
          <div className="hero-mist m2" />
          <div className="hero-mist m3" />
        </div>
      </div>

      {/* Giant Outlined Ghost Word synced to cycling Oxford word */}
      <div className="hero-ghost-word" aria-hidden="true">
        {activeWord.word}
      </div>

      <div className="landing-wrap hero-grid">
        {/* Left: Asymmetric Editorial Headline — ZERO eyebrow, ONE short supporting line, ONE CTA */}
        <div className="hero-copy">
          <h1 className="hero-headline">
            <span className="hero-line-mask">
              <span className="hero-line-inner" style={{ '--line-i': 0 } as React.CSSProperties}>
                Nhớ từ đúng lúc.
              </span>
            </span>
            <span className="hero-line-mask">
              <span className="hero-line-inner" style={{ '--line-i': 1 } as React.CSSProperties}>
                Nói <em className="hero-serif-word">chuẩn</em> tự nhiên.
              </span>
            </span>
          </h1>

          <p className="hero-sub">
            Học từ trong ngữ cảnh, ôn SRS đúng điểm rơi và luyện nói cùng trợ lý AI “Vi”.
          </p>

          <div className="hero-cta-row">
            <Link
              to={ctaLink}
              id="primary-cta-main"
              className="hero-primary-cta"
              onClick={onPrimaryNavigate}
            >
              <span>Bắt đầu học miễn phí</span>
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
            <span className="hero-cta-note">Free 0đ · Premium 99.000đ/tháng</span>
          </div>
        </div>

        {/* Right: Interactive Glass Flashcard + Live Speaking Waveform + Interactive Quiz + Transparent Vi */}
        <div className="hero-card-stage">
          {/* Satellite 1: Live Speaking Card with Animated Acoustic Waveform */}
          <button
            type="button"
            className={`hero-satellite hero-satellite-score glass ${isSpeaking ? 'is-live' : ''}`}
            onClick={handlePronounce}
            aria-label={`Nghe phát âm mẫu từ ${activeWord.word} với điểm luyện nói 94`}
          >
            <div className="hero-sat-top">
              <span className="hero-sat-value">94</span>
              <span className="hero-sat-unit">/100</span>
              <div className="hero-live-wave" aria-hidden="true">
                {[12, 22, 16, 26, 18, 24, 14].map((h, i) => (
                  <span
                    key={i}
                    className="hero-live-wave-bar"
                    style={{
                      height: `${h}px`,
                      animationDelay: `${i * 0.11}s`,
                    }}
                  />
                ))}
              </div>
            </div>
            <div className="hero-sat-sub">Whisper + Vi AI · 5 tiêu chí</div>
          </button>

          {/* Satellite 2: Interactive Mini Quiz Card */}
          <div className="hero-satellite hero-satellite-quiz glass" role="group" aria-label="Kiểm tra nhanh từ vựng">
            <div className="hero-sat-quiz-q">{activeWord.quizPrompt}</div>
            <div className="hero-sat-quiz-opts">
              <button
                type="button"
                className={`hero-sat-opt ${quizPicked === 'correct' ? 'is-correct' : ''}`}
                onClick={() => {
                  setQuizPicked('correct');
                  triggerViReaction();
                }}
              >
                <span>✓</span>
                <span>{activeWord.quizCorrect}</span>
              </button>
              <button
                type="button"
                className={`hero-sat-opt ${quizPicked === 'wrong' ? 'is-wrong' : ''}`}
                onClick={() => setQuizPicked('wrong')}
              >
                <span>{activeWord.quizDistractor}</span>
              </button>
            </div>
          </div>

          {/* Giant 6-Layer Glass Flashcard driven by @use-gesture/react */}
          <div className="hero-flip-perspective">
            <div
              ref={cardRef}
              {...bindCardGesture()}
              className="hero-glass-flashcard"
              role="button"
              tabIndex={0}
              aria-label={`Thẻ từ ${activeWord.word} — nhấn, kéo ngang hoặc cuộn để lật xem nghĩa`}
              style={{ '--scroll-flip': `${totalFlipDeg}deg`, touchAction: 'pan-y' } as React.CSSProperties}
              onClick={() => {
                if (dragConsumedRef.current) return;
                setManualFlipped((f) => !f);
                triggerViReaction();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setManualFlipped((f) => !f);
                  triggerViReaction();
                }
              }}
            >
              {/* Front Face */}
              <div className="hero-card-face glass">
                <div className="hero-card-top">
                  <span className="hero-card-cefr">{activeWord.cefr}</span>
                  {/* Live SRS Countdown Ring */}
                  <span className="hero-srs-ring-badge" title="Chu kỳ ôn lặp giãn cách SRS 1–3–7–14–30 ngày">
                    <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">
                      <circle cx="16" cy="16" r={ringR} className="hero-srs-track" />
                      <circle
                        cx="16"
                        cy="16"
                        r={ringR}
                        className="hero-srs-arc"
                        style={{
                          strokeDasharray: ringC.toFixed(2),
                          strokeDashoffset: ringOffset.toFixed(2),
                        }}
                      />
                    </svg>
                    <span>{activeWord.srsMilestone}</span>
                  </span>
                </div>

                <div>
                  <h2 className="hero-word-title">{activeWord.word}</h2>
                  <p className="hero-word-ipa">
                    {activeWord.ipa} · {activeWord.pos}
                  </p>
                  <p className="hero-word-meaning">“{activeWord.meaningVi}”</p>
                </div>

                <div>
                  <div className="hero-card-dots" style={{ marginBottom: 12 }}>
                    {HERO_WORDS.map((item, idx) => (
                      <button
                        key={item.word}
                        type="button"
                        aria-label={`Xem từ ${item.word}`}
                        className={`hero-card-dot ${idx === wordIdx ? 'active' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setWordIdx(idx);
                          setElapsedMs(0);
                          setQuizPicked('correct');
                          triggerViReaction();
                        }}
                      />
                    ))}
                    <span className="hero-drag-hint">Kéo hoặc chạm để lật</span>
                  </div>

                  <div className={`hero-voice-bar ${isSpeaking ? 'is-speaking' : ''}`}>
                    <button type="button" className="hero-mic-btn" onClick={handlePronounce}>
                      <span className="hero-voice-dot" aria-hidden="true" />
                      <span>{isSpeaking ? 'Vi đang đọc...' : 'Nghe phát âm'}</span>
                    </button>

                    <div className="hero-wave-bars" aria-hidden="true">
                      <span className="hero-wave-bar" style={{ height: 8, animationDelay: '0s' }} />
                      <span className="hero-wave-bar" style={{ height: 15, animationDelay: '0.12s' }} />
                      <span className="hero-wave-bar" style={{ height: 11, animationDelay: '0.24s' }} />
                      <span className="hero-wave-bar" style={{ height: 16, animationDelay: '0.36s' }} />
                      <span className="hero-wave-bar" style={{ height: 9, animationDelay: '0.48s' }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Back Face (Revealed on 50vh Scroll Scrub, Click, or Drag) */}
              <div className="hero-card-face hero-card-face--back glass">
                <div className="hero-card-top">
                  <span className="hero-card-cefr">{activeWord.word} · {activeWord.ipa}</span>
                  <span className="hero-card-srs">SRS 1–3–7–14–30</span>
                </div>

                <div>
                  <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', margin: '0 0 10px' }}>
                    {activeWord.meaningVi}
                  </p>
                  <div className="hero-example-box">
                    <p style={{ margin: '0 0 6px', fontFamily: 'var(--font-editorial)', fontStyle: 'italic', fontSize: 15.5, color: 'var(--ink)' }}>
                      “{activeWord.example}”
                    </p>
                    <p style={{ margin: 0, fontSize: 12.5, color: 'var(--muted)' }}>
                      {activeWord.exampleVi}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: 'var(--sage-dark)', fontWeight: 600, paddingRight: 86 }}>
                  <span>Chạm để xoay lại mặt trước</span>
                  <span style={{ color: 'var(--amber-dark)' }}>1–3–7–14–30 ngày</span>
                </div>
              </div>
            </div>

            {/* Transparent Vi standing directly on the flashcard's edge (NO box/frame, melts into scene) */}
            <div className={`hero-vi-perched ${viBounce ? 'is-reacting' : ''}`} aria-hidden="true">
              <ViMascotImage
                pose="happy-wave"
                size={112}
                transparent
                framed={false}
                priority
                alt="Vi mascot trong suốt đứng cạnh thẻ từ vựng trên sân khấu thư viện kính"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Editorial Stats Row */}
      <div className="landing-wrap">
        <div className="hero-editorial-stats">
          <div className="hero-stat-item">
            <strong>4.900+ từ Oxford 3000/5000</strong>
            <span>Từ vựng chọn lọc kèm IPA &amp; ví dụ thực tế</span>
          </div>
          <div className="hero-stat-item">
            <strong>CEFR A1 – C1</strong>
            <span>Xếp lớp thông minh sau bài Placement Test</span>
          </div>
          <div className="hero-stat-item">
            <strong>SRS 1–3–7–14–30 ngày</strong>
            <span>Nhắc ôn đúng điểm rơi trước khi quên</span>
          </div>
        </div>
      </div>
    </section>
  );
}
