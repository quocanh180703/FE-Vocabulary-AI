import { useEffect, useRef, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import './LandingPage.css';

import viHeroImg from '../assets/landing/vi-hero.webp';
import vi3dImg from '../assets/landing/vi-3d.webp';
import books3dImg from '../assets/landing/books-3d.webp';
import speak3dImg from '../assets/landing/speak-3d.webp';
import quiz3dImg from '../assets/landing/quiz-3d.webp';
import grammar3dImg from '../assets/landing/grammar-3d.webp';
import chat3dImg from '../assets/landing/chat-3d.webp';

const VI_MESSAGES = [
  '“resilient” nghĩa là kiên cường, dễ phục hồi. Ví dụ: “Children are remarkably resilient.”',
  'Ôn đúng lúc sắp quên nhé — lịch ôn của mình là 1 – 3 – 7 – 14 – 30 ngày, đừng để từ đến hạn chờ lâu quá!',
  'Nói 30–60 giây theo chủ đề, mình chấm 5 tiêu chí: ngữ pháp, từ vựng, trôi chảy, nội dung, phát âm.',
  'Mỗi ngày 15 phút là đủ: ôn từ đến hạn, học từ mới, rồi nói một chủ đề. Đều quan trọng hơn lâu!',
];

const FAQ_ITEMS = [
  {
    q: 'Mỗi ngày tôi phải học bao lâu để có hiệu quả?',
    a: 'Chỉ cần 15 phút mỗi ngày: mở ứng dụng ôn các từ đến hạn theo thuật toán SRS, học 5-10 từ mới, và hoàn thành 1 bài luyện nói theo chủ đề. Sự đều đặn quan trọng hơn rất nhiều so với việc học dồn 2-3 tiếng cuối tuần.',
  },
  {
    q: '“Vi” là ai? Công nghệ AI đằng sau hoạt động như thế nào?',
    a: 'Vi là trợ lý học tập AI thông minh của bạn. Hệ thống tích hợp mô hình Gemini tiên tiến để giải thích từ vựng ngữ cảnh, sửa lỗi ngữ pháp, và công nghệ Whisper của OpenAI để nhận diện giọng nói chuẩn xác 99% khi bạn luyện nói.',
  },
  {
    q: 'Đăng ký tài khoản có cần nhập thẻ tín dụng không?',
    a: 'Hoàn toàn không! Bạn chỉ cần đăng ký bằng email và mã OTP trong 1 phút là có thể trải nghiệm toàn bộ lộ trình và tính năng miễn phí vĩnh viễn. Khi muốn nâng cấp gói Premium, bạn thanh toán quét mã QR qua PayOS tiện lợi.',
  },
  {
    q: 'Mua gói Premium rồi, tôi có thể hủy bất cứ lúc nào không?',
    a: 'Có. Bạn có toàn quyền quản lý gói trong phần Thông tin tài khoản. Khi hủy, bạn vẫn được bảo lưu toàn bộ quyền lợi Premium cho đến ngày cuối cùng của chu kỳ đã thanh toán mà không phát sinh thêm bất kỳ chi phí nào.',
  },
  {
    q: 'Dữ liệu học tập và tiến độ của tôi có được lưu lại không?',
    a: 'Toàn bộ từ vựng đã học, lịch sử làm bài quiz, bản ghi âm luyện nói và điểm streak đều được đồng bộ thời gian thực lên máy chủ. Bạn có thể đăng nhập trên máy tính hay điện thoại mà không lo mất dữ liệu.',
  },
];

export default function LandingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isNavigating, setIsNavigating] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const ctaLink = user ? '/dashboard' : '/login';
  const displayName = user?.fullName?.trim() || user?.username || (user?.email ? user.email.split('@')[0] : 'bạn');
  const userInitial = (displayName || 'U').charAt(0).toUpperCase();

  const playPronunciation = useCallback((wordText: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(wordText);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      utterance.onstart = () => setIsPlayingAudio(true);
      utterance.onend = () => setIsPlayingAudio(false);
      utterance.onerror = () => setIsPlayingAudio(false);
      window.speechSynthesis.speak(utterance);
    } catch {
      setIsPlayingAudio(false);
    }
  }, []);

  const handleTransitionNavigate = (to: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    if (isNavigating) return;
    setIsNavigating(true);
    setTimeout(() => {
      window.scrollTo(0, 0);
      navigate(to);
    }, 220);
  };

  // State for Vi interactive 3D stage
  const stageRef = useRef<HTMLDivElement>(null);
  const tiltRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const [viSay, setViSay] = useState('Bấm vào mình, mình kể mẹo nhớ từ thật lâu nhé.');
  const [viWho, setViWho] = useState('Vi chào bạn!');
  const [bubblePop, setBubblePop] = useState(false);
  const [tiltJump, setTiltJump] = useState(false);
  const [, setMsgIdx] = useState(-1);
  const [showToTop, setShowToTop] = useState(false);

  // Poke function
  const poke = useCallback(() => {
    setMsgIdx((prev) => {
      const next = (prev + 1) % VI_MESSAGES.length;
      setViWho('Vi mách bạn:');
      setViSay(VI_MESSAGES[next]);
      return next;
    });

    setBubblePop(false);
    requestAnimationFrame(() => setBubblePop(true));

    setTiltJump(false);
    requestAnimationFrame(() => setTiltJump(true));
  }, []);

  // Vi Stage mouse tilt & drag rotation
  useEffect(() => {
    const stage = stageRef.current;
    const tilt = tiltRef.current;
    const img = imgRef.current;
    if (!stage || !tilt || !img) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let rx = 0;
    let ry = 0;
    let drag = 0;

    const render = () => {
      tilt.style.transform = `rotateX(${rx}deg) rotateY(${ry + drag}deg)`;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (reduced) return;
      const r = stage.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      ry = px * 20;
      rx = -py * 14;
      render();
    };

    const handleMouseLeave = () => {
      rx = 0;
      ry = 0;
      render();
    };

    stage.addEventListener('mousemove', handleMouseMove);
    stage.addEventListener('mouseleave', handleMouseLeave);

    // Pointer dragging
    let downX: number | null = null;
    let moved = false;

    const handlePointerDown = (e: PointerEvent) => {
      downX = e.clientX;
      moved = false;
      try {
        img.setPointerCapture(e.pointerId);
      } catch { }
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (downX === null || reduced) return;
      const dx = e.clientX - downX;
      if (Math.abs(dx) > 6) {
        moved = true;
        drag = Math.max(-50, Math.min(50, dx * 0.45));
        render();
      }
    };

    const handlePointerUp = () => {
      if (downX !== null && !moved) {
        poke();
      }
      downX = null;
      drag = 0;
      render();
    };

    const handlePointerCancel = () => {
      downX = null;
      drag = 0;
      render();
    };

    img.addEventListener('pointerdown', handlePointerDown);
    img.addEventListener('pointermove', handlePointerMove);
    img.addEventListener('pointerup', handlePointerUp);
    img.addEventListener('pointercancel', handlePointerCancel);

    return () => {
      stage.removeEventListener('mousemove', handleMouseMove);
      stage.removeEventListener('mouseleave', handleMouseLeave);
      img.removeEventListener('pointerdown', handlePointerDown);
      img.removeEventListener('pointermove', handlePointerMove);
      img.removeEventListener('pointerup', handlePointerUp);
      img.removeEventListener('pointercancel', handlePointerCancel);
    };
  }, [poke]);

  // Scroll to top handler: hiển thị từ trang/màn hình 2 trở đi
  useEffect(() => {
    const handleScroll = () => {
      // Khi cuộn qua màn hình đầu (Hero), bắt đầu vào trang 2 (~350px hoặc 45% chiều cao màn hình)
      const threshold = Math.min(400, Math.max(250, Math.round(window.innerHeight * 0.45)));
      const currentScroll = window.scrollY || window.pageYOffset || 0;
      setShowToTop(currentScroll > threshold);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Smooth scroll handler with cubic easing curve
  const scrollToSection = useCallback((e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (!el) return;

    // Calculate position with pleasant top padding
    const yOffset = -20;
    const targetY = Math.max(0, el.getBoundingClientRect().top + window.pageYOffset + yOffset);
    const startY = window.pageYOffset;
    const diff = targetY - startY;

    if (Math.abs(diff) < 4) return;

    // Dynamic duration based on distance (450ms - 850ms)
    const duration = Math.min(850, Math.max(450, Math.abs(diff) * 0.35));
    const startTime = performance.now();
    const easeInOutCubic = (t: number) =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    const step = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = easeInOutCubic(progress);
      window.scrollTo(0, startY + diff * ease);

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        window.history.pushState(null, '', `#${id}`);
      }
    };

    requestAnimationFrame(step);
  }, []);

  const scrollToTop = useCallback(() => {
    const startY = window.scrollY || window.pageYOffset || 0;
    if (startY === 0) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      window.scrollTo(0, 0);
      return;
    }

    const duration = Math.min(700, Math.max(300, startY * 0.25));
    const startTime = performance.now();
    const easeInOutCubic = (t: number) =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    const step = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      window.scrollTo(0, Math.round(startY * (1 - easeInOutCubic(progress))));
      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };
    requestAnimationFrame(step);
  }, []);

  // Scroll-reveal IntersectionObserver
  useEffect(() => {
    const sel =
      '.landing .hero .pill, .landing .hero h1, .landing .hero .sub, .landing .hero .cta-row, .landing .hero .microproof, .landing .hero-social-proof, .landing .hero-visual, .landing .strip .cell, .landing .sec-head, .landing .head-img, .landing .step, .landing .compare-col, .landing .feat > *, .landing .mini, .landing .testi-card, .landing .price, .landing .faq-item, .landing .pay-note, .landing .final-in';
    const els = Array.from(document.querySelectorAll<HTMLElement>(sel));

    els.forEach((el) => {
      el.classList.add(el.tagName === 'IMG' ? 'rv-img' : 'rv');
    });

    document.querySelectorAll<HTMLElement>('.landing .rv, .landing .rv-img').forEach((el) => {
      if (!els.includes(el)) els.push(el);
    });

    // Stagger delay
    const groups: { [key: string]: HTMLElement[] } = {};
    els.forEach((el) => {
      const parent = el.parentElement;
      const key = parent ? parent.className : 'root';
      if (!groups[key]) groups[key] = [];
      groups[key].push(el);
    });

    Object.keys(groups).forEach((k) => {
      groups[k].forEach((el, i) => {
        const delay = `${Math.min(i * 90, 360)}ms`;
        el.dataset.d = delay;
        el.style.transitionDelay = delay;
      });
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const target = entry.target as HTMLElement;
          if (entry.isIntersecting) {
            target.style.transitionDelay = target.dataset.d || '0ms';
            target.classList.add('in');
          } else {
            target.style.transitionDelay = '0ms';
            target.classList.remove('in');
          }
        });
      },
      { threshold: 0, rootMargin: '0px 0px -4% 0px' }
    );

    els.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <>
      <div className={'landing' + (isNavigating ? ' page-exiting' : '')}>
      <div className={'landing-route-bar' + (isNavigating ? ' active' : '')} />
      <div className="sheet">
        {/* Navigation Header */}
        <header>
          <div className="wrap nav">
            <Link className="brand" to="/landing" onClick={scrollToTop}>
              <svg viewBox="0 0 72 72" width="38" height="38" aria-hidden="true">
                <ellipse cx="36" cy="40" rx="26" ry="24" fill="#359E7D" />
                <ellipse cx="36" cy="50" rx="14" ry="11" fill="#C2E4D2" />
                <rect x="30" y="8" width="5" height="12" rx="2.5" fill="#E5484D" transform="rotate(-15 32 14)" />
                <rect x="36" y="6" width="5" height="13" rx="2.5" fill="#B57F1F" />
                <rect x="42" y="8" width="5" height="12" rx="2.5" fill="#1565C0" transform="rotate(15 44 14)" />
                <circle cx="27" cy="32" r="8" fill="#fff" />
                <circle cx="27.5" cy="33" r="3.6" fill="#0A2540" />
                <circle cx="45" cy="32" r="8" fill="#fff" />
                <circle cx="45.5" cy="33" r="3.6" fill="#0A2540" />
                <path d="M31 42 Q36 38 41 42 Q36 50 31 42" fill="#C96F2E" />
              </svg>
              VocabularyAI
            </Link>
            <nav className="navlinks">
              <a href="#cach-hoc" onClick={(e) => scrollToSection(e, 'cach-hoc')}>
                Cách học
              </a>
              <a href="#so-sanh" onClick={(e) => scrollToSection(e, 'so-sanh')}>
                So sánh
              </a>
              <a href="#tinh-nang" onClick={(e) => scrollToSection(e, 'tinh-nang')}>
                Tính năng
              </a>
              <a href="#luyen-noi" onClick={(e) => scrollToSection(e, 'luyen-noi')}>
                Luyện nói
              </a>
              <a href="#danh-gia" onClick={(e) => scrollToSection(e, 'danh-gia')}>
                Đánh giá
              </a>
              <a href="#bang-gia" onClick={(e) => scrollToSection(e, 'bang-gia')}>
                Bảng giá
              </a>
              <a href="#faq" onClick={(e) => scrollToSection(e, 'faq')}>
                Câu hỏi
              </a>
            </nav>
            <div className="navright">
              {user ? (
                <>
                  <Link
                    to="/profile"
                    className="user-greeting"
                    title="Xem thông tin cá nhân"
                    onClick={handleTransitionNavigate('/profile')}
                  >
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt={displayName} className="user-avatar-mini" />
                    ) : (
                      <span className="user-avatar-badge">{userInitial}</span>
                    )}
                    <span className="user-greeting-text">
                      Xin chào, <strong>{displayName}</strong>
                    </span>
                  </Link>
                  <Link
                    className="btn small green"
                    to="/dashboard"
                    onClick={handleTransitionNavigate('/dashboard')}
                  >
                    Vào Dashboard
                  </Link>
                </>
              ) : (
                <>
                  <a className="loginlink" href="#bang-gia" onClick={(e) => scrollToSection(e, 'bang-gia')}>
                    Học thử miễn phí
                  </a>
                  <Link
                    className="btn small green"
                    to="/login"
                    onClick={handleTransitionNavigate('/login')}
                  >
                    Đăng nhập
                  </Link>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Main Content Landmark for SEO & A11y */}
        <main id="main-content">
          {/* Hero Section with Interactive 3D Vi */}
          <div className="hero">
          <div className="wrap hero-grid">
            <div>
              <span className="pill">Học tiếng Anh cùng Vi — AI coach của bạn</span>
              <h1 style={{ marginTop: '18px' }}>
                Học 10 từ hôm nay.
                <br />
                <span className="hl">30 ngày sau vẫn nhớ.</span>
              </h1>
              <p className="sub">
                Vi ôn cùng bạn <b>đúng lúc sắp quên</b> (SRS 1–3–7–14–30 ngày), giải thích từng từ, chấm nói theo 5 tiêu chí.
              </p>
              <div className="cta-row">
                <Link
                  className="btn"
                  to={ctaLink}
                  onClick={handleTransitionNavigate(ctaLink)}
                >
                  Bắt đầu học miễn phí
                </Link>
                <a className="link-arrow" href="#luyen-noi" onClick={(e) => scrollToSection(e, 'luyen-noi')}>
                  Xem Vi chấm nói{' '}
                  <svg viewBox="0 0 24 24">
                    <path d="M4 12h15m0 0-6-6m6 6-6 6" />
                  </svg>
                </a>
              </div>
              <div className="microproof">
                <span>
                  <svg className="ic" viewBox="0 0 24 24">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                  Không cần thẻ ngân hàng
                </span>
                <span>
                  <svg className="ic" viewBox="0 0 24 24">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                  15 phút mỗi ngày là đủ
                </span>
                <span>
                  <svg className="ic" viewBox="0 0 24 24">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                  Đăng ký 1 phút bằng email
                </span>
              </div>

              {/* Hero Social Proof */}
              <div className="hero-social-proof">
                <div className="avatar-stack">
                  <span className="av av-1">L</span>
                  <span className="av av-2">M</span>
                  <span className="av av-3">H</span>
                  <span className="av av-4">T</span>
                  <span className="av av-more">+5k</span>
                </div>
                <div className="proof-text">
                  <div className="stars">
                    <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
                    <b>4.9/5</b>
                  </div>
                  <p>từ hơn <strong>5.000+</strong> người học trên toàn quốc</p>
                </div>
              </div>
            </div>

            {/* Sân khấu tương tác Vi */}
            <div className="hero-visual" id="viStage" ref={stageRef}>
              <div className="vi-stage">
                <div className={`vi-tilt ${tiltJump ? 'jump' : ''}`} id="viTilt" ref={tiltRef}>
                  <img
                    id="viImg"
                    ref={imgRef}
                    src={viHeroImg}
                    alt="Vi — mascot của VocabularyAI, bấm vào Vi để nghe mẹo học từ"
                    draggable="false"
                    fetchPriority="high"
                    decoding="async"
                  />
                </div>
                <div className="vi-shadow"></div>
                <div
                  className={`vi-bubble ${bubblePop ? 'pop' : ''}`}
                  id="viBubble"
                  onClick={poke}
                  role="button"
                  tabIndex={0}
                >
                  <b id="viWho">{viWho}</b> <span id="viSay">{viSay}</span>
                  <span className="vi-next">Bấm vào Vi ▸</span>
                </div>
                <div className="chip chip-a floaty">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#1565C0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                  </svg>
                  <div>
                    <b>Từ hôm nay: resilient</b>
                    <span>kiên cường · cấp độ C1</span>
                  </div>
                </div>
                <div className="chip chip-b floaty-slow">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#1565C0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="3" width="6" height="11" rx="3" fill="#1565C0" stroke="none" />
                    <path d="M5.5 11a6.5 6.5 0 0 0 13 0" />
                    <path d="M12 17.5V21" />
                  </svg>
                  <div>
                    <b>Nói thử một chủ đề</b>
                    <span>Vi chấm 5 tiêu chí ngay</span>
                  </div>
                </div>
              </div>
              <p className="vi-hint">Di chuột để nghiêng 3D &nbsp;·&nbsp; Kéo để xoay &nbsp;·&nbsp; Bấm vào Vi để nghe mẹo</p>
            </div>
          </div>
        </div>

        {/* Proof Strip */}
        <div className="strip">
          <div className="wrap strip-in">
            <div className="cell">
              <div className="n">4.900+</div>
              <div className="d">từ vựng Oxford 3000/5000, có phiên âm và audio</div>
            </div>
            <div className="cell">
              <div className="n">A1 – C1</div>
              <div className="d">5 cấp độ CEFR, đúng trình độ của bạn</div>
            </div>
            <div className="cell">
              <div className="n">5 tiêu chí</div>
              <div className="d">chấm bài nói: ngữ pháp, từ vựng, trôi chảy, nội dung, phát âm</div>
            </div>
            <div className="cell">
              <div className="n">24/7</div>
              <div className="d">Vi trả lời ngay, kể cả 2 giờ sáng</div>
            </div>
          </div>
        </div>

        {/* Cách học Section */}
        <section className="alt" id="cach-hoc">
          <div className="wrap">
            <div className="head-flex rv">
              <div className="sec-head">
                <h2>Một vòng học khép kín: Học → Ôn đúng lúc → Nói ra</h2>
                <p>
                  Ba bước, <b>một hàng đợi duy nhất</b> ở trang Tổng quan.
                </p>
              </div>
              <img className="img3d floaty-slow head-img" src={books3dImg} alt="Chồng sách, đồng hồ và flashcard 3D" loading="lazy" decoding="async" />
            </div>
            <div className="loop">
              <div className="step">
                <span className="no">BƯỚC 1</span>
                <h3>Học từ trong ngữ cảnh</h3>
                <p>Phiên âm, nghĩa, ví dụ — và “AI giải thích” khi muốn hiểu sâu.</p>
                <div className="demo flashmini">
                  <div className="w" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <span>resilient</span>
                    <button
                      type="button"
                      className={`speaker-btn ${isPlayingAudio ? 'playing' : ''}`}
                      onClick={() => playPronunciation('resilient')}
                      title="Nghe phát âm chuẩn (US)"
                      aria-label="Phát âm từ resilient"
                    >
                      <svg viewBox="0 0 24 24">
                        <path d="M11 5L6 9H2v6h4l5 4V5z" />
                        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                      </svg>
                    </button>
                  </div>
                  <div className="p">/rɪˈzɪliənt/ · kiên cường, dễ phục hồi</div>
                  <div className="p" style={{ fontStyle: 'italic' }}>
                    “Children are remarkably resilient.”
                  </div>
                </div>
              </div>
              <div className="step">
                <span className="no">BƯỚC 2</span>
                <h3>Ôn đúng lúc sắp quên</h3>
                <p>Đúng thì giãn lịch, sai thì ôn lại sớm. Hệ thống tự tính:</p>
                <div className="demo">
                  <div className="lbl">Khoảng cách ôn (SRS)</div>
                  <div className="srs-track">
                    <span className="hot">1 ngày</span>
                    <span>3 ngày</span>
                    <span>7 ngày</span>
                    <span>14 ngày</span>
                    <span>30 ngày</span>
                  </div>
                  <div className="minirow">
                    <Link
                      to={ctaLink}
                      className="btn"
                      style={{ background: 'var(--card)', color: 'var(--red-dark)', border: '1px solid var(--line)' }}
                    >
                      Chưa nhớ
                    </Link>
                    <Link to={ctaLink} className="btn green">
                      Đã nhớ
                    </Link>
                  </div>
                </div>
              </div>
              <div className="step">
                <span className="no">BƯỚC 3</span>
                <h3>Nói ra và được chấm</h3>
                <p>Nói 30–60 giây theo chủ đề. Vi chấm và nhận xét ngay.</p>
                <div className="demo">
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '14.5px' }}>
                    <span>Chủ đề: Công việc mơ ước</span>
                    <span className="pill level">B1</span>
                  </div>
                  <div className="bar-row">
                    <span className="lbl">Điểm nói</span>
                    <div className="progress">
                      <i style={{ width: '74%' }}></i>
                    </div>
                    <b>74</b>
                  </div>
                  <div className="bar-row">
                    <span className="lbl">Trôi chảy</span>
                    <div className="progress green">
                      <i style={{ width: '65%' }}></i>
                    </div>
                    <b>65</b>
                  </div>
                </div>
              </div>
            </div>

            <div className="marquee rv" aria-hidden="true">
              <div className="marquee-track">
                <div className="mq">
                  <span>resilient</span>
                  <i>·</i>
                  <span>achieve</span>
                  <i>·</i>
                  <span>fluent</span>
                  <i>·</i>
                  <span>curious</span>
                  <i>·</i>
                  <span>essential</span>
                  <i>·</i>
                  <span>opportunity</span>
                  <i>·</i>
                  <span>persevere</span>
                  <i>·</i>
                  <span>grateful</span>
                  <i>·</i>
                </div>
                <div className="mq">
                  <span>resilient</span>
                  <i>·</i>
                  <span>achieve</span>
                  <i>·</i>
                  <span>fluent</span>
                  <i>·</i>
                  <span>curious</span>
                  <i>·</i>
                  <span>essential</span>
                  <i>·</i>
                  <span>opportunity</span>
                  <i>·</i>
                  <span>persevere</span>
                  <i>·</i>
                  <span>grateful</span>
                  <i>·</i>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* So Sánh Section: Phương pháp học cũ vs AI Vi */}
        <section className="alt" id="so-sanh">
          <div className="wrap">
            <div className="sec-head" style={{ textAlign: 'center', margin: '0 auto 36px' }}>
              <span className="pill red">Tại sao lại hiệu quả hơn?</span>
              <h2 style={{ marginTop: '12px' }}>Cách học cũ vs Đồng hành cùng AI Vi</h2>
              <p>
                Bỏ cách học chép từ 20 lần rồi quên sạch sau 3 ngày. Chuyển sang phương pháp khoa học chuẩn Oxford.
              </p>
            </div>
            <div className="compare-grid">
              <div className="compare-col old">
                <div className="compare-head">
                  <span className="badge">Cách học truyền thống</span>
                  <h3>Học vẹt, ghi chép rời rạc</h3>
                </div>
                <ul className="compare-list">
                  <li>
                    <svg viewBox="0 0 24 24" className="ic"><path d="M18 6 6 18M6 6l12 12" /></svg>
                    <div>
                      <b>Chép từ vào sổ tay</b>
                      <span>Viết nhiều nhưng không có hệ thống nhắc lại, vài ngày sau quên sạch 80%.</span>
                    </div>
                  </li>
                  <li>
                    <svg viewBox="0 0 24 24" className="ic"><path d="M18 6 6 18M6 6l12 12" /></svg>
                    <div>
                      <b>Tra từ điển thụ động</b>
                      <span>Chỉ biết nghĩa tiếng Việt rời rạc, không biết ghép câu và dùng trong ngữ cảnh nào.</span>
                    </div>
                  </li>
                  <li>
                    <svg viewBox="0 0 24 24" className="ic"><path d="M18 6 6 18M6 6l12 12" /></svg>
                    <div>
                      <b>Học từ không dám nói</b>
                      <span>Sợ phát âm sai, không có người sửa ngữ pháp hay chấm điểm phản xạ thực tế.</span>
                    </div>
                  </li>
                  <li>
                    <svg viewBox="0 0 24 24" className="ic"><path d="M18 6 6 18M6 6l12 12" /></svg>
                    <div>
                      <b>Dễ nản và bỏ cuộc</b>
                      <span>Thiếu lộ trình cá nhân hóa, học quá tải hoặc học từ không đúng mục tiêu.</span>
                    </div>
                  </li>
                </ul>
              </div>

              <div className="compare-col new">
                <div className="compare-head">
                  <span className="badge">Học cùng VocabularyAI</span>
                  <h3>Khoa học SRS + AI Đồng hành</h3>
                </div>
                <ul className="compare-list">
                  <li>
                    <svg viewBox="0 0 24 24" className="ic"><path d="M20 6 9 17l-5-5" /></svg>
                    <div>
                      <b>Ôn đúng đường cong quên (SRS)</b>
                      <span>Tự động giãn cách 1-3-7-14-30 ngày. Chỉ ôn từ sắp quên, tiết kiệm 70% thời gian.</span>
                    </div>
                  </li>
                  <li>
                    <svg viewBox="0 0 24 24" className="ic"><path d="M20 6 9 17l-5-5" /></svg>
                    <div>
                      <b>AI Vi giải thích đa chiều</b>
                      <span>Phân tích collocations, từ đồng nghĩa/trái nghĩa và mẹo nhớ trực quan trong 2 giây.</span>
                    </div>
                  </li>
                  <li>
                    <svg viewBox="0 0 24 24" className="ic"><path d="M20 6 9 17l-5-5" /></svg>
                    <div>
                      <b>Luyện nói chấm 5 tiêu chí</b>
                      <span>Nhận diện phát âm bằng Whisper, AI phân tích ngữ pháp, từ vựng, trôi chảy tức thì.</span>
                    </div>
                  </li>
                  <li>
                    <svg viewBox="0 0 24 24" className="ic"><path d="M20 6 9 17l-5-5" /></svg>
                    <div>
                      <b>15 phút mỗi ngày, duy trì streak</b>
                      <span>Giao diện trực quan, lộ trình tinh gọn, học đâu nhớ đó không áp lực.</span>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Tính năng Section */}
        <section id="tinh-nang" style={{ paddingTop: '24px' }}>
          <div className="wrap">
            <div className="sec-head">
              <h2>Từng tính năng, nhìn tận nơi nó chạy</h2>
              <p>
                Toàn bộ là <b>dữ liệu thật</b> bạn sẽ thấy trong app.
              </p>
            </div>

            {/* Feature 1: Từ vựng + AI giải thích */}
            <div className="feat">
              <div>
                <span className="pill">Từ vựng + AI giải thích</span>
                <h3 style={{ marginTop: '14px' }}>Một từ, Vi giải thích đến nơi đến chốn</h3>
                <p className="lead">
                  Phiên âm, nghĩa, ví dụ — bấm <b>“AI giải thích”</b>, Vi kể thêm ngữ cảnh, cụm từ và mẹo nhớ lâu.
                </p>
                <div style={{ marginTop: '18px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <span className="pill">4.900+ từ Oxford</span>
                  <span className="pill level">A1 – C1</span>
                  <span className="pill">Lưu từ khó bằng nút tim</span>
                </div>
              </div>
              <div className="card wordcard">
                <span className="pill level">C1 · Tính từ</span>
                <div className="w" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <span>resilient</span>
                  <button
                    type="button"
                    className={`speaker-btn ${isPlayingAudio ? 'playing' : ''}`}
                    onClick={() => playPronunciation('resilient')}
                    title="Nghe phát âm chuẩn (US)"
                    aria-label="Phát âm từ resilient"
                  >
                    <svg viewBox="0 0 24 24">
                      <path d="M11 5L6 9H2v6h4l5 4V5z" />
                      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                    </svg>
                  </button>
                </div>
                <div className="phon">/rɪˈzɪliənt/</div>
                <div className="mean">kiên cường, dễ phục hồi</div>
                <div className="ex">“Children are remarkably resilient.”</div>
                <div style={{ borderTop: '1px dashed var(--line)', marginTop: '18px', paddingTop: '16px', textAlign: 'left' }}>
                  <div className="coach" style={{ marginTop: 0 }}>
                    <svg viewBox="0 0 72 72" width="40" height="40" style={{ flex: 'none' }}>
                      <ellipse cx="36" cy="40" rx="26" ry="24" fill="#359E7D" />
                      <ellipse cx="36" cy="50" rx="14" ry="11" fill="#C2E4D2" />
                      <rect x="30" y="8" width="5" height="12" rx="2.5" fill="#E5484D" transform="rotate(-15 32 14)" />
                      <rect x="36" y="6" width="5" height="13" rx="2.5" fill="#B57F1F" />
                      <rect x="42" y="8" width="5" height="12" rx="2.5" fill="#1565C0" transform="rotate(15 44 14)" />
                      <circle cx="27" cy="32" r="8" fill="#fff" />
                      <circle cx="27.5" cy="33" r="3.6" fill="#0A2540" />
                      <circle cx="45" cy="32" r="8" fill="#fff" />
                      <circle cx="45.5" cy="33" r="3.6" fill="#0A2540" />
                      <path d="M31 42 Q36 38 41 42 Q36 50 31 42" fill="#C96F2E" />
                    </svg>
                    <div className="bubble">
                      <b>Vi giải thích:</b> dùng cho người/vật “bật lại” sau khó khăn. Đồng nghĩa: <b>tough, adaptable</b>. Mẹo: đi với
                      “resilient to change”.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature 2: Luyện nói chấm 5 tiêu chí */}
            <div className="feat" id="luyen-noi">
              <div className="card" style={{ padding: '26px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '19px' }}>“Công việc mơ ước” · B1</h3>
                  <span className="pill">Lần thử #3</span>
                </div>
                <img
                  className="img3d floaty"
                  src={speak3dImg}
                  alt="Micro 3D với bong bóng trò chuyện"
                  loading="lazy"
                  decoding="async"
                  style={{ maxHeight: '290px', marginTop: '14px' }}
                />
                <div className="wave" style={{ marginTop: '6px' }}>
                  <i></i>
                  <i></i>
                  <i></i>
                  <i></i>
                  <i></i>
                  <i></i>
                  <i></i>
                  <i></i>
                  <i></i>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <span className="score-big">74</span>
                  <div style={{ fontWeight: 700, color: 'var(--muted)', fontSize: '14.5px' }}>
                    điểm tổng · tăng so với lần thử #1
                  </div>
                </div>
                <div style={{ marginTop: '10px' }}>
                  <div className="bar-row">
                    <span className="lbl">Ngữ pháp</span>
                    <div className="progress">
                      <i style={{ width: '72%' }}></i>
                    </div>
                    <b>72</b>
                  </div>
                  <div className="bar-row">
                    <span className="lbl">Từ vựng</span>
                    <div className="progress">
                      <i style={{ width: '80%' }}></i>
                    </div>
                    <b>80</b>
                  </div>
                  <div className="bar-row">
                    <span className="lbl">Trôi chảy</span>
                    <div className="progress">
                      <i style={{ width: '65%' }}></i>
                    </div>
                    <b>65</b>
                  </div>
                  <div className="bar-row">
                    <span className="lbl">Nội dung</span>
                    <div className="progress">
                      <i style={{ width: '78%' }}></i>
                    </div>
                    <b>78</b>
                  </div>
                  <div className="bar-row">
                    <span className="lbl">Phát âm</span>
                    <div className="progress">
                      <i style={{ width: '70%' }}></i>
                    </div>
                    <b>70</b>
                  </div>
                </div>
              </div>
              <div>
                <span className="pill red">Luyện nói · chấm bằng AI</span>
                <h3 style={{ marginTop: '14px' }}>Nói xong, biết ngay mình yếu ở đâu</h3>
                <p className="lead">
                  Ghi âm 30–60 giây. Whisper nhận diện giọng nói cực chuẩn, Vi chấm <b>5 tiêu chí</b> kèm điểm mạnh, điểm yếu.
                </p>
                <div style={{ marginTop: '18px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <span className="pill red">5 chủ đề phong phú</span>
                  <span className="pill">A1 – B2</span>
                  <span className="pill">Lưu lịch sử từng lần thử</span>
                </div>
                <div className="coach">
                  <svg viewBox="0 0 72 72" width="44" height="44" style={{ flex: 'none' }}>
                    <ellipse cx="36" cy="40" rx="26" ry="24" fill="#359E7D" />
                    <ellipse cx="36" cy="50" rx="14" ry="11" fill="#C2E4D2" />
                    <rect x="30" y="8" width="5" height="12" rx="2.5" fill="#E5484D" transform="rotate(-15 32 14)" />
                    <rect x="36" y="6" width="5" height="13" rx="2.5" fill="#B57F1F" />
                    <rect x="42" y="8" width="5" height="12" rx="2.5" fill="#1565C0" transform="rotate(15 44 14)" />
                    <circle cx="27" cy="32" r="8" fill="#fff" />
                    <circle cx="27.5" cy="33" r="3.6" fill="#0A2540" />
                    <circle cx="45" cy="32" r="8" fill="#fff" />
                    <circle cx="45.5" cy="33" r="3.6" fill="#0A2540" />
                    <path d="M31 42 Q36 38 41 42 Q36 50 31 42" fill="#C96F2E" />
                  </svg>
                  <div className="bubble">
                    <b>Mẹo của Vi:</b> nói chậm rãi, nhấn trọng âm đúng — điểm trôi chảy sẽ cao hơn nói nhanh mà vấp.
                  </div>
                </div>
              </div>
            </div>

            {/* Feature Minis */}
            <div className="minis">
              <div className="mini card">
                <img className="mini-img" src={quiz3dImg} alt="Cúp vàng và đồng hồ bấm giờ 3D" loading="lazy" decoding="async" />
                <h3>Quiz như thi thật</h3>
                <p>Bấm giờ, nộp là có điểm. Vi chỉ ra điểm yếu và lỗi sai của bạn.</p>
              </div>
              <div className="mini card">
                <img className="mini-img" src={grammar3dImg} alt="Bút chì và dấu tick 3D" loading="lazy" decoding="async" />
                <h3>Sửa ngữ pháp tức thì</h3>
                <p>Dán câu vào — nhận câu đã sửa chuẩn xác, phân tích lỗi và cách hành văn tự nhiên.</p>
              </div>
              <div className="mini card">
                <img className="mini-img" src={chat3dImg} alt="Hai bong bóng trò chuyện 3D" loading="lazy" decoding="async" />
                <h3>Chat với Vi 24/7</h3>
                <p>Hỏi ngữ pháp, từ vựng, cách diễn đạt — Vi trả lời ngay lập tức.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials / Đánh giá Section */}
        <section id="danh-gia" style={{ paddingTop: '56px' }}>
          <div className="wrap">
            <div className="sec-head" style={{ textAlign: 'center', margin: '0 auto 40px' }}>
              <span className="pill">Người học nói gì</span>
              <h2 style={{ marginTop: '12px' }}>Hơn 5.000+ học viên đã bứt phá từ vựng</h2>
              <p>
                Từ sinh viên chuẩn bị thi IELTS/TOEIC đến người đi làm cần giao tiếp công việc mỗi ngày.
              </p>
            </div>
            <div className="testi-grid">
              <div className="testi-card">
                <div className="testi-stars">★★★★★</div>
                <p className="testi-text">
                  “Trước đây mình cứ học trước quên sau, thi TOEIC mãi kẹt ở mức 550 từ vựng. Dùng thuật toán lặp lại ngắt quãng của VocabularyAI 2 tháng nay, mình nhớ được hơn 800 từ mới mà không hề thấy mệt mỏi.”
                </p>
                <div className="testi-author">
                  <div className="testi-av">M</div>
                  <div className="testi-meta">
                    <b>Minh Hoàng</b>
                    <span>Sinh viên ĐH Bách Khoa · Mục tiêu TOEIC 800</span>
                  </div>
                </div>
              </div>

              <div className="testi-card highlight">
                <div className="testi-stars">★★★★★</div>
                <p className="testi-text">
                  “Tính năng luyện nói AI chấm 5 tiêu chí thực sự đỉnh. Mình hay bị ngập ngừng khi phỏng vấn tiếng Anh, Vi chỉ ra từng lỗi ngữ pháp và từ vựng lặp lại giúp mình tự tin nói trôi chảy hơn hẳn.”
                </p>
                <div className="testi-author">
                  <div className="testi-av" style={{ background: '#2563EB' }}>T</div>
                  <div className="testi-meta">
                    <b>Thảo My</b>
                    <span>Product Designer · Cần tiếng Anh làm việc Remote</span>
                  </div>
                </div>
              </div>

              <div className="testi-card">
                <div className="testi-stars">★★★★★</div>
                <p className="testi-text">
                  “Vi giải thích từ vựng cực kỳ sâu và dễ hiểu, không khô cứng như từ điển truyền thống. Nút bấm nghe phát âm và ví dụ ngữ cảnh thực tế giúp mình áp dụng vào bài viết email công việc ngay lập tức.”
                </p>
                <div className="testi-author">
                  <div className="testi-av" style={{ background: '#B57F1F' }}>Q</div>
                  <div className="testi-meta">
                    <b>Quốc Anh</b>
                    <span>Lập trình viên Backend · Học tiếng Anh giao tiếp</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Bảng giá Section */}
        <section id="bang-gia">
          <div className="wrap">
            <div className="sec-head" style={{ margin: '0 auto', textAlign: 'center' }}>
              <h2>Giá rõ ràng, tính bằng tiền Việt</h2>
              <p>
                Miễn phí để bắt đầu. Premium rẻ hơn <b>một ly cà phê mỗi tuần</b>, thanh toán tiện lợi qua PayOS.
              </p>
            </div>

            <div className="price-grid">
              <div className="price">
                <div className="pname">Miễn phí</div>
                <div className="amount">
                  0đ<small> / mãi mãi</small>
                </div>
                <p className="note">Làm quen và xây dựng thói quen học tiếng Anh mỗi ngày.</p>
                <ul>
                  <li>
                    <svg className="ic" viewBox="0 0 24 24">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                    Kho từ Oxford căn bản A1–A2
                  </li>
                  <li>
                    <svg className="ic" viewBox="0 0 24 24">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                    Ôn tập Flashcard SRS &amp; Quiz chấm điểm
                  </li>
                  <li>
                    <svg className="ic" viewBox="0 0 24 24">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                    5 lượt/ngày: Chat Vi, Luyện nói, Sửa ngữ pháp
                  </li>
                  <li>
                    <svg className="ic" viewBox="0 0 24 24">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                    10 lượt/ngày: AI giải thích từ vựng
                  </li>
                  <li>
                    <svg className="ic" viewBox="0 0 24 24">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                    2 lượt/ngày: Lộ trình cá nhân hóa AI
                  </li>
                  <li className="off">
                    <svg className="ic" viewBox="0 0 24 24">
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                    Mở khóa kho từ nâng cao B1–C1
                  </li>
                  <li className="off">
                    <svg className="ic" viewBox="0 0 24 24">
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                    Không giới hạn lượt dùng AI
                  </li>
                </ul>
                <Link className="btn ghost" to={ctaLink} onClick={handleTransitionNavigate(ctaLink)}>
                  Tạo tài khoản miễn phí
                </Link>
              </div>

              <div className="price hot">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="pname" style={{ color: 'var(--primary-dark)' }}>
                    Premium
                  </div>
                  <span className="pill level">Phổ biến nhất</span>
                </div>
                <div className="amount">
                  99.000đ<small> / tháng</small>
                </div>
                <p className="note">
                  Gói 30 ngày linh hoạt. Gia hạn theo nhu cầu, dùng trọn vẹn đến hết hạn đã trả.
                </p>
                <ul>
                  <li>
                    <svg className="ic" viewBox="0 0 24 24">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                    Mở khóa toàn bộ 4.900+ từ Oxford A1–C1
                  </li>
                  <li>
                    <svg className="ic" viewBox="0 0 24 24">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                    Gia sư Chat AI Vi không giới hạn
                  </li>
                  <li>
                    <svg className="ic" viewBox="0 0 24 24">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                    Luyện nói chấm 5 tiêu chí AI không giới hạn
                  </li>
                  <li>
                    <svg className="ic" viewBox="0 0 24 24">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                    Sửa ngữ pháp &amp; Giải thích từ AI không giới hạn
                  </li>
                  <li>
                    <svg className="ic" viewBox="0 0 24 24">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                    Lộ trình AI cá nhân hóa theo điểm yếu không giới hạn
                  </li>
                  <li>
                    <svg className="ic" viewBox="0 0 24 24">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                    Ưu tiên tài nguyên AI tốc độ cao &amp; PayOS tức thì
                  </li>
                </ul>
                <Link className="btn" to={ctaLink} onClick={handleTransitionNavigate(ctaLink)}>
                  Dùng Premium ngay
                </Link>
              </div>
            </div>
            <p className="pay-note">Giá niêm yết chính thức · Cổng thanh toán bảo mật PayOS.</p>
            <div className="payment-badges">
              <span className="pay-badge-item">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                Bảo mật PayOS
              </span>
              <span className="pay-badge-item">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/><path d="M7 15h2"/></svg>
                VietQR / Quét mã tức thì
              </span>
              <span className="pay-badge-item">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                Kích hoạt tự động 100%
              </span>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="alt" id="faq" style={{ paddingTop: '56px' }}>
          <div className="wrap" style={{ maxWidth: '960px' }}>
            <div className="sec-head">
              <h2>Hỏi nhanh, đáp thẳng</h2>
            </div>
            <div className="faq-accordion">
              {FAQ_ITEMS.map((item, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div key={idx} className={`faq-item ${isOpen ? 'open' : ''}`}>
                    <button
                      type="button"
                      className="faq-btn"
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                      aria-expanded={isOpen}
                    >
                      <h4>
                        <span className="faq-num">0{idx + 1}</span>
                        {item.q}
                      </h4>
                      <span className="faq-chevron">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </span>
                    </button>
                    <div className="faq-answer">
                      <p>{item.a}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <div className="final">
          <div className="wrap final-in">
            <img
              className="floaty"
              src={vi3dImg}
              alt="Mascot Vi 3D"
              loading="lazy"
              decoding="async"
              style={{ width: '96px', height: '96px', objectFit: 'cover', borderRadius: '26px', border: '3px solid rgba(255,255,255,.25)' }}
            />
            <div>
              <h2>Từ đầu tiên của bạn đang chờ.</h2>
              <p>Miễn phí, 1 phút đăng ký. Học 10 từ hôm nay, 30 ngày nữa tự kiểm chứng.</p>
            </div>
            <Link className="btn white" to={ctaLink} onClick={handleTransitionNavigate(ctaLink)} style={{ minWidth: '230px' }}>
              Bắt đầu học miễn phí
            </Link>
          </div>
        </div>
        </main>

        {/* Footer */}
        <footer>
          <div className="wrap foot">
            <div>
              <div className="brand">
                <svg viewBox="0 0 72 72" width="34" height="34">
                  <ellipse cx="36" cy="40" rx="26" ry="24" fill="#359E7D" />
                  <ellipse cx="36" cy="50" rx="14" ry="11" fill="#C2E4D2" />
                  <rect x="30" y="8" width="5" height="12" rx="2.5" fill="#E5484D" transform="rotate(-15 32 14)" />
                  <rect x="36" y="6" width="5" height="13" rx="2.5" fill="#B57F1F" />
                  <rect x="42" y="8" width="5" height="12" rx="2.5" fill="#1565C0" transform="rotate(15 44 14)" />
                  <circle cx="27" cy="32" r="8" fill="#fff" />
                  <circle cx="27.5" cy="33" r="3.6" fill="#0A2540" />
                  <circle cx="45" cy="32" r="8" fill="#fff" />
                  <circle cx="45.5" cy="33" r="3.6" fill="#0A2540" />
                  <path d="M31 42 Q36 38 41 42 Q36 50 31 42" fill="#C96F2E" />
                </svg>
                VocabularyAI
              </div>
              <p style={{ marginTop: '10px', maxWidth: '250px' }}>
                Học tiếng Anh vui mỗi ngày — từ vựng, quiz, luyện nói cùng AI.
              </p>
            </div>
            <nav>
              <b>Sản phẩm</b>
              <a href="#cach-hoc" onClick={(e) => scrollToSection(e, 'cach-hoc')}>
                Cách học
              </a>
              <a href="#so-sanh" onClick={(e) => scrollToSection(e, 'so-sanh')}>
                So sánh
              </a>
              <a href="#tinh-nang" onClick={(e) => scrollToSection(e, 'tinh-nang')}>
                Tính năng
              </a>
              <a href="#luyen-noi" onClick={(e) => scrollToSection(e, 'luyen-noi')}>
                Luyện nói
              </a>
              <a href="#danh-gia" onClick={(e) => scrollToSection(e, 'danh-gia')}>
                Đánh giá
              </a>
              <a href="#bang-gia" onClick={(e) => scrollToSection(e, 'bang-gia')}>
                Bảng giá
              </a>
            </nav>
            <nav>
              <b>Bắt đầu</b>
              <Link to="/login">Đăng nhập</Link>
              <Link to="/login">Tạo tài khoản</Link>
              <a href="#faq" onClick={(e) => scrollToSection(e, 'faq')}>
                Câu hỏi thường gặp
              </a>
            </nav>
            <div className="sp">
              Mọi tính năng trên trang đều có thật trong hệ thống. Hãy bắt đầu chinh phục tiếng Anh ngay hôm nay.
            </div>
          </div>
          <div className="wrap legal">
            <span>© 2026 VocabularyAI — Học tiếng Anh mỗi ngày cùng Vi.</span>
            <div className="legal-links">
              <Link to="/dieu-khoan">Điều khoản sử dụng</Link>
              <Link to="/chinh-sach-bao-mat">Chính sách bảo mật</Link>
              <a href="mailto:hotro@vocabularyai.com">hotro@vocabularyai.com</a>
            </div>
          </div>
        </footer>
      </div>
    </div>

    {/* Nút cuộn lên đầu trang (nằm ngoài .landing để luôn cố định chuẩn trên viewport) */}
    <button
      id="toTop"
      className={showToTop && !isNavigating ? 'show' : ''}
      type="button"
      aria-label="Cuộn lên đầu trang"
      title="Cuộn lên đầu trang"
      onClick={scrollToTop}
    >
      <svg viewBox="0 0 24 24">
        <path d="M12 20V6m0 0-6 6m6-6 6 6" />
      </svg>
    </button>

    {/* Mobile Sticky Bottom CTA Bar */}
    <div className={`mobile-sticky-cta ${showToTop && !isNavigating ? 'visible' : ''}`}>
      <div className="m-cta-in">
        <div className="m-cta-text">
          <b>Học tiếng Anh cùng Vi</b>
          <span>Miễn phí · 15 phút mỗi ngày</span>
        </div>
        <Link
          className="btn green"
          to={ctaLink}
          onClick={handleTransitionNavigate(ctaLink)}
        >
          Bắt đầu ngay
        </Link>
      </div>
    </div>
  </>
);
}
