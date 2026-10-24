import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { authApi, errMsg } from '../api';
import { useAuth } from '../auth/AuthContext';
import { Mascot, Icon } from '../components/icons';
import { motion, AnimatePresence } from 'motion/react';
import viHeroImg from '../assets/vi-hero.png';

type AuthMode = 'login' | 'register' | 'forgot';

export default function Login() {
  const { state } = useLocation() as { state?: { registered?: boolean } };
  const [mode, setMode] = useState<AuthMode>('login');

  // Login & Register state
  const [id, setId] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [pw, setPw] = useState('');

  // Forgot Password state
  const [forgotStep, setForgotStep] = useState<1 | 2 | 3>(1);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotResetToken, setForgotResetToken] = useState('');
  const [forgotVerificationToken, setForgotVerificationToken] = useState('');
  const [forgotNewPw, setForgotNewPw] = useState('');
  const [forgotConfirmPw, setForgotConfirmPw] = useState('');
  const [forgotMsg, setForgotMsg] = useState('');

  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();
  const { login } = useAuth();
  const [isNavigating, setIsNavigating] = useState(false);

  const handleGoHome = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (isNavigating) return;
    setIsNavigating(true);
    setTimeout(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      nav('/landing');
    }, 220);
  };

  const submit = async () => {
    setErr('');
    setBusy(true);
    try {
      if (mode === 'login') {
        const { data } = await authApi.login({ emailOrUsername: id, password: pw });
        const access = data.accessToken || data.access_token || '';
        const refresh = data.refreshToken || data.refresh_token || '';
        login(data.user, access, refresh);
        nav('/dashboard');
      } else if (mode === 'register') {
        await authApi.validate({ email, username, fullName, password: pw });
        nav('/otp', { state: { email, username, fullName, password: pw } });
      }
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  // Forgot password flow handlers
  const handleForgotSendOtp = async () => {
    if (!forgotEmail.trim()) {
      setErr('Vui lòng nhập địa chỉ email tài khoản của bạn');
      return;
    }
    setErr('');
    setBusy(true);
    try {
      const { data } = await authApi.forgotPasswordSendOtp({ email: forgotEmail.trim() });
      setForgotResetToken(data.resetToken || '');
      setForgotStep(2);
      setForgotMsg(`Mã OTP 6 chữ số đã được gửi đến email ${forgotEmail.trim()}`);
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const handleForgotVerifyOtp = async () => {
    const otpClean = forgotOtp.trim();
    if (!otpClean || otpClean.length !== 6) {
      setErr('Vui lòng nhập đúng 6 chữ số mã OTP');
      return;
    }
    setErr('');
    setBusy(true);
    try {
      const { data } = await authApi.forgotPasswordVerifyOtp({
        email: forgotEmail.trim(),
        otp: otpClean,
        resetToken: forgotResetToken,
      });
      setForgotVerificationToken(data.verificationToken || '');
      setForgotStep(3);
      setForgotMsg('Xác thực OTP thành công! Mời bạn đặt mật khẩu mới.');
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const handleForgotResetPassword = async () => {
    if (!forgotNewPw) {
      setErr('Vui lòng nhập mật khẩu mới');
      return;
    }
    if (forgotNewPw.length < 8) {
      setErr('Mật khẩu mới phải có tối thiểu 8 ký tự');
      return;
    }
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/;
    if (!regex.test(forgotNewPw)) {
      setErr('Mật khẩu phải chứa ít nhất 1 chữ hoa, 1 chữ thường, 1 số và 1 ký tự đặc biệt (@$!%*?&)');
      return;
    }
    if (forgotNewPw !== forgotConfirmPw) {
      setErr('Mật khẩu xác nhận không khớp');
      return;
    }

    setErr('');
    setBusy(true);
    try {
      const { data } = await authApi.forgotPasswordReset({
        email: forgotEmail.trim(),
        verificationToken: forgotVerificationToken,
        newPassword: forgotNewPw,
      });
      const access = data.accessToken || data.access_token || '';
      const refresh = data.refreshToken || data.refresh_token || '';
      login(data.user, access, refresh);
      nav('/dashboard');
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className={'layout-route-bar' + (isNavigating ? ' active' : '')} />
      <motion.div
        className="auth"
        initial={{ opacity: 0, y: 14, scale: 0.995 }}
        animate={isNavigating ? { opacity: 0, y: -10, scale: 0.995 } : { opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: isNavigating ? 0.22 : 0.35, ease: [0.16, 1, 0.3, 1] }}
        style={{ position: 'relative' }}
      >
        <button
          type="button"
          className="topbar-home-btn"
          onClick={handleGoHome}
          title="Về trang giới thiệu (Landing Page)"
          style={{
            position: 'absolute',
            top: 22,
            left: 22,
            zIndex: 50,
            background: 'rgba(255, 255, 255, 0.92)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <Icon n="home" s={16} />
          <span className="topbar-home-text">Trang chủ</span>
        </button>

        <div className="auth-sheet">
          <div className="auth-left">
            <div className="brand" onClick={handleGoHome} style={{ cursor: 'pointer' }}>
              <Mascot s={36} />
              VocabularyAI
            </div>
            <img className="hero" src={viHeroImg} alt="Vi — trợ lý học tiếng Anh" />
            <h1>Học vui mỗi ngày cùng Vi</h1>
            <p>Từ vựng, quiz và luyện nói cùng AI — dành cho mọi lứa tuổi, từ 5 đến 70!</p>
            <div className="auth-pills">
              <span className="pill">
                <Icon n="book" s={15} />
                4.900+ từ vựng
              </span>
              <span className="pill">
                <Icon n="spark" s={15} />
                AI 24/7
              </span>
              <span className="pill">
                <Icon n="mic" s={15} />
                Luyện nói
              </span>
            </div>
          </div>

          <div className="auth-right">
            <motion.div layout className="auth-card" transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}>
              <div style={{ minHeight: '68px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={mode}
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <h1>
                      {mode === 'login'
                        ? 'Chào mừng trở lại!'
                        : mode === 'register'
                        ? 'Tạo tài khoản'
                        : 'Khôi phục mật khẩu'}
                    </h1>
                    <div className="sub">
                      {mode === 'login'
                        ? 'Đăng nhập để tiếp tục hành trình học tiếng Anh'
                        : mode === 'register'
                        ? 'Miễn phí — chỉ mất 1 phút để bắt đầu'
                        : forgotStep === 1
                        ? 'Nhập email để nhận mã OTP xác thực'
                        : forgotStep === 2
                        ? 'Nhập mã 6 chữ số vừa nhận qua email'
                        : 'Thiết lập mật khẩu mới cho tài khoản'}
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Segmented control hoặc Nút quay lại */}
              {mode === 'forgot' ? (
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '-2px' }}>
                  <button
                    type="button"
                    className="link"
                    onClick={() => {
                      setMode('login');
                      setErr('');
                      setForgotMsg('');
                      setForgotStep(1);
                    }}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '14.5px' }}
                  >
                    ← Quay lại Đăng nhập
                  </button>
                </div>
              ) : (
                <div className="seg">
                  <button
                    type="button"
                    className={mode === 'login' ? 'on' : ''}
                    onClick={() => {
                      setMode('login');
                      setErr('');
                    }}
                  >
                    {mode === 'login' && (
                      <motion.div
                        layoutId="active-tab-pill"
                        className="seg-indicator"
                        transition={{ type: 'spring', stiffness: 480, damping: 36 }}
                      />
                    )}
                    <span style={{ position: 'relative', zIndex: 1, color: mode === 'login' ? 'var(--ink)' : 'var(--muted)', transition: 'color 0.2s ease' }}>
                      Đăng nhập
                    </span>
                  </button>
                  <button
                    type="button"
                    className={mode === 'register' ? 'on' : ''}
                    onClick={() => {
                      setMode('register');
                      setErr('');
                    }}
                  >
                    {mode === 'register' && (
                      <motion.div
                        layoutId="active-tab-pill"
                        className="seg-indicator"
                        transition={{ type: 'spring', stiffness: 480, damping: 36 }}
                      />
                    )}
                    <span style={{ position: 'relative', zIndex: 1, color: mode === 'register' ? 'var(--ink)' : 'var(--muted)', transition: 'color 0.2s ease' }}>
                      Đăng ký
                    </span>
                  </button>
                </div>
              )}

              {/* Form Content với chuyển động mượt mà */}
              <AnimatePresence mode="wait" initial={false}>
                {mode === 'login' && (
                  <motion.div
                    key="login"
                    initial={{ opacity: 0, x: -22, filter: 'blur(4px)' }}
                    animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, x: 22, filter: 'blur(4px)' }}
                    transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                    style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}
                  >
                    <div className="field">
                      <label>Email hoặc tên đăng nhập</label>
                      <input
                        className="input"
                        value={id}
                        onChange={(e) => setId(e.target.value)}
                        placeholder="minh.nguyen"
                        disabled={busy}
                        autoComplete="username"
                      />
                    </div>
                    <div className="field">
                      <label>Mật khẩu</label>
                      <input
                        className="input"
                        type="password"
                        value={pw}
                        onChange={(e) => setPw(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && submit()}
                        placeholder="••••••••••"
                        disabled={busy}
                        autoComplete="current-password"
                      />
                    </div>

                    <button
                      type="button"
                      className="btn block"
                      style={{ minHeight: '54px', marginTop: '6px' }}
                      disabled={busy}
                      onClick={submit}
                    >
                      {busy ? 'Đang xử lý...' : 'Đăng nhập'}
                    </button>

                    <div className="center">
                      <button
                        type="button"
                        className="link"
                        onClick={() => {
                          setMode('forgot');
                          setForgotStep(1);
                          setErr('');
                          setForgotMsg('');
                          if (id.includes('@')) {
                            setForgotEmail(id);
                          }
                        }}
                      >
                        Quên mật khẩu?
                      </button>
                    </div>
                  </motion.div>
                )}

                {mode === 'register' && (
                  <motion.div
                    key="register"
                    initial={{ opacity: 0, x: 22, filter: 'blur(4px)' }}
                    animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, x: -22, filter: 'blur(4px)' }}
                    transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                    style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}
                  >
                    <div className="field">
                      <label>Họ tên</label>
                      <input
                        className="input"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Nguyễn Văn Minh"
                        disabled={busy}
                      />
                    </div>
                    <div className="field">
                      <label>Email</label>
                      <input
                        className="input"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="minh@email.com"
                        disabled={busy}
                      />
                    </div>
                    <div className="field">
                      <label>Tên đăng nhập</label>
                      <input
                        className="input"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="minh.nguyen"
                        disabled={busy}
                      />
                    </div>
                    <div className="field">
                      <label>Mật khẩu</label>
                      <input
                        className="input"
                        type="password"
                        value={pw}
                        onChange={(e) => setPw(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && submit()}
                        placeholder="Tối thiểu 8 ký tự"
                        disabled={busy}
                      />
                    </div>

                    <button
                      type="button"
                      className="btn block"
                      style={{ minHeight: '54px', marginTop: '6px' }}
                      disabled={busy}
                      onClick={submit}
                    >
                      {busy ? 'Đang gửi mã...' : 'Gửi mã OTP'}
                    </button>

                    <div className="center sub" style={{ fontSize: '13px' }}>
                      Mã OTP sẽ được gửi về email để xác thực tài khoản.
                    </div>
                  </motion.div>
                )}

                {mode === 'forgot' && (
                  <motion.div
                    key={`forgot-step-${forgotStep}`}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                    style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}
                  >
                    {forgotStep === 1 && (
                      <>
                        <div className="field">
                          <label>Email đăng ký</label>
                          <input
                            className="input"
                            type="email"
                            value={forgotEmail}
                            onChange={(e) => setForgotEmail(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleForgotSendOtp()}
                            placeholder="minh@email.com"
                            disabled={busy}
                            autoFocus
                          />
                        </div>
                        <button
                          type="button"
                          className="btn block"
                          style={{ minHeight: '54px', marginTop: '6px' }}
                          disabled={busy}
                          onClick={handleForgotSendOtp}
                        >
                          {busy ? 'Đang gửi mã...' : 'Gửi mã OTP qua email'}
                        </button>
                      </>
                    )}

                    {forgotStep === 2 && (
                      <>
                        <div className="field">
                          <label>Mã OTP (6 chữ số)</label>
                          <input
                            className="input"
                            type="text"
                            maxLength={6}
                            value={forgotOtp}
                            onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, ''))}
                            onKeyDown={(e) => e.key === 'Enter' && handleForgotVerifyOtp()}
                            placeholder="123456"
                            disabled={busy}
                            style={{ textAlign: 'center', letterSpacing: '6px', fontSize: '20px', fontWeight: 900 }}
                            autoFocus
                          />
                        </div>
                        <button
                          type="button"
                          className="btn block"
                          style={{ minHeight: '54px', marginTop: '6px' }}
                          disabled={busy}
                          onClick={handleForgotVerifyOtp}
                        >
                          {busy ? 'Đang xác minh...' : 'Xác minh mã OTP'}
                        </button>
                        <div className="center">
                          <button
                            type="button"
                            className="link"
                            style={{ fontSize: '13.5px' }}
                            onClick={() => {
                              setForgotStep(1);
                              setErr('');
                              setForgotMsg('');
                            }}
                          >
                            Đổi email khác hoặc gửi lại mã
                          </button>
                        </div>
                      </>
                    )}

                    {forgotStep === 3 && (
                      <>
                        <div className="field">
                          <label>Mật khẩu mới</label>
                          <input
                            className="input"
                            type="password"
                            value={forgotNewPw}
                            onChange={(e) => setForgotNewPw(e.target.value)}
                            placeholder="••••••••••"
                            disabled={busy}
                            autoFocus
                          />
                        </div>
                        <div className="field">
                          <label>Xác nhận mật khẩu mới</label>
                          <input
                            className="input"
                            type="password"
                            value={forgotConfirmPw}
                            onChange={(e) => setForgotConfirmPw(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleForgotResetPassword()}
                            placeholder="••••••••••"
                            disabled={busy}
                          />
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: '1.45' }}>
                          💡 Mật khẩu tối thiểu 8 ký tự, bao gồm ít nhất 1 chữ hoa, 1 chữ thường, 1 số và 1 ký tự đặc biệt (@$!%*?&).
                        </div>
                        <button
                          type="button"
                          className="btn block"
                          style={{ minHeight: '54px', marginTop: '6px' }}
                          disabled={busy}
                          onClick={handleForgotResetPassword}
                        >
                          {busy ? 'Đang xử lý...' : 'Đổi mật khẩu & Đăng nhập ngay'}
                        </button>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Thông báo tin nhắn / lỗi */}
              {forgotMsg && (
                <div
                  className="pill level"
                  style={{ padding: '10px 14px', borderRadius: '14px', fontSize: '13.5px', display: 'flex', width: '100%', justifyContent: 'center' }}
                >
                  {forgotMsg}
                </div>
              )}

              {state?.registered && !err && mode !== 'forgot' && (
                <div
                  className="pill level"
                  style={{ padding: '10px 14px', borderRadius: '14px', fontSize: '13.5px', display: 'flex', width: '100%', justifyContent: 'center' }}
                >
                  Tạo tài khoản xong rồi — đăng nhập để bắt đầu nhé! 🎉
                </div>
              )}

              {err && (
                <div
                  className="pill redsoft"
                  style={{ padding: '10px 14px', borderRadius: '14px', fontSize: '13.5px', display: 'flex', width: '100%', justifyContent: 'center' }}
                >
                  {err}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </motion.div>
    </>
  );
}
