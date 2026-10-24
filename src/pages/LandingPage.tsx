import { useEffect, useRef, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import './LandingPage.css';

import viHeroImg from '../assets/landing/vi-hero.png';
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

export default function LandingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isNavigating, setIsNavigating] = useState(false);
  const ctaLink = user ? '/dashboard' : '/login';
  const displayName = user?.fullName?.trim() || user?.username || (user?.email ? user.email.split('@')[0] : 'bạn');
  const userInitial = (displayName || 'U').charAt(0).toUpperCase();

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
      } catch (_) {}
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

  // Scroll to top handler
  useEffect(() => {
    const handleScroll = () => {
      const limit = Math.max(560, window.innerHeight * 0.9);
      setShowToTop(window.scrollY > limit);
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
    const startY = window.pageYOffset;
    if (startY === 0) return;
    const duration = Math.min(750, Math.max(350, startY * 0.3));
    const startTime = performance.now();
    const easeInOutCubic = (t: number) =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    const step = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      window.scrollTo(0, startY * (1 - easeInOutCubic(progress)));
      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };
    requestAnimationFrame(step);
  }, []);

  // Scroll-reveal IntersectionObserver
  useEffect(() => {
    const sel =
      '.landing .hero .pill, .landing .hero h1, .landing .hero .sub, .landing .hero .cta-row, .landing .hero .microproof, .landing .hero-visual, .landing .strip .cell, .landing .sec-head, .landing .head-img, .landing .step, .landing .feat > *, .landing .mini, .landing .price, .landing .faq .q, .landing .pay-note, .landing .final-in';
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
              <a href="#tinh-nang" onClick={(e) => scrollToSection(e, 'tinh-nang')}>
                Tính năng
              </a>
              <a href="#luyen-noi" onClick={(e) => scrollToSection(e, 'luyen-noi')}>
                Luyện nói
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
              <img className="img3d floaty-slow head-img" src={books3dImg} alt="Chồng sách, đồng hồ và flashcard 3D" />
            </div>
            <div className="loop">
              <div className="step">
                <span className="no">BƯỚC 1</span>
                <h3>Học từ trong ngữ cảnh</h3>
                <p>Phiên âm, nghĩa, ví dụ — và “AI giải thích” khi muốn hiểu sâu.</p>
                <div className="demo flashmini">
                  <div className="w">resilient</div>
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
                <div className="w">resilient</div>
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
                <img className="mini-img" src={quiz3dImg} alt="Cúp vàng và đồng hồ bấm giờ 3D" />
                <h3>Quiz như thi thật</h3>
                <p>Bấm giờ, nộp là có điểm. Vi chỉ ra điểm yếu và lỗi sai của bạn.</p>
              </div>
              <div className="mini card">
                <img className="mini-img" src={grammar3dImg} alt="Bút chì và dấu tick 3D" />
                <h3>Sửa ngữ pháp tức thì</h3>
                <p>Dán câu vào — nhận câu đã sửa chuẩn xác, phân tích lỗi và cách hành văn tự nhiên.</p>
              </div>
              <div className="mini card">
                <img className="mini-img" src={chat3dImg} alt="Hai bong bóng trò chuyện 3D" />
                <h3>Chat với Vi 24/7</h3>
                <p>Hỏi ngữ pháp, từ vựng, cách diễn đạt — Vi trả lời ngay lập tức.</p>
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
                  Gia hạn linh hoạt từng tháng. Hủy khi nào cũng được, dùng hết hạn đã trả.
                </p>
                <ul>
                  <li>
                    <svg className="ic" viewBox="0 0 24 24">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                    Mở khóa toàn bộ 5.000+ từ Oxford A1–C1
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
          </div>
        </section>

        {/* FAQ Section */}
        <section className="alt" id="faq" style={{ paddingTop: '56px' }}>
          <div className="wrap" style={{ maxWidth: '920px' }}>
            <div className="sec-head">
              <h2>Hỏi nhanh, đáp thẳng</h2>
            </div>
            <div className="faq">
              <div className="q">
                <h4>
                  <span style={{ color: 'var(--primary-dark)' }}>01</span>Mỗi ngày tôi phải học bao lâu?
                </h4>
                <p>15 phút mỗi ngày: ôn từ đến hạn, học từ mới, nói một chủ đề. Đều đặn quan trọng hơn học dồn.</p>
              </div>
              <div className="q">
                <h4>
                  <span style={{ color: 'var(--primary-dark)' }}>02</span>“Vi” là ai? AI đến từ đâu?
                </h4>
                <p>Trợ lý học tập thông minh của app: Gemini lo giải thích và ngữ pháp, Whisper lo nghe chép bài nói.</p>
              </div>
              <div className="q">
                <h4>
                  <span style={{ color: 'var(--primary-dark)' }}>03</span>Đăng ký có cần thẻ ngân hàng không?
                </h4>
                <p>Không. Bạn chỉ cần email và mã xác thực OTP. Mua gói Premium mới cần thanh toán qua PayOS.</p>
              </div>
              <div className="q">
                <h4>
                  <span style={{ color: 'var(--primary-dark)' }}>04</span>Mua Premium rồi, hủy thế nào?
                </h4>
                <p>Hủy bất cứ lúc nào trong mục quản lý tài khoản, vẫn dùng tiếp đến hết hạn đã trả.</p>
              </div>
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
              <a href="#tinh-nang" onClick={(e) => scrollToSection(e, 'tinh-nang')}>
                Tính năng
              </a>
              <a href="#luyen-noi" onClick={(e) => scrollToSection(e, 'luyen-noi')}>
                Luyện nói
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

      {/* Nút cuộn lên đầu trang */}
      <button
        id="toTop"
        className={showToTop ? 'show' : ''}
        type="button"
        aria-label="Cuộn lên đầu trang"
        onClick={scrollToTop}
      >
        <svg viewBox="0 0 24 24">
          <path d="M12 20V6m0 0-6 6m6-6 6 6" />
        </svg>
      </button>
    </div>
  );
}
