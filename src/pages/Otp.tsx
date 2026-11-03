import { useRef, useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { authApi, errMsg } from '../api';
import { Icon } from '../components/icons';
import { PageTransition } from '../motion';
import vi3dImg from '../assets/vi-3d.webp';

export default function Otp() {
  const { state } = useLocation() as { state?: { email: string; username: string; fullName: string; password: string } };
  const nav = useNavigate();
  const [digits, setDigits] = useState<string[]>(Array(6).fill(''));
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [focusedIdx, setFocusedIdx] = useState(0);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!state?.email) {
      nav('/login', { replace: true });
      return;
    }
    refs.current[0]?.focus();

    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [state, nav]);

  if (!state?.email) return null;

  const setDigit = (i: number, v: string) => {
    v = v.replace(/\D/g, '').slice(-1);
    const d = [...digits];
    d[i] = v;
    setDigits(d);
    if (v && i < 5) {
      refs.current[i + 1]?.focus();
      setFocusedIdx(i + 1);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const d = [...digits];
    for (let i = 0; i < 6; i++) {
      d[i] = pasted[i] || '';
    }
    setDigits(d);
    const nextIdx = Math.min(pasted.length, 5);
    refs.current[nextIdx]?.focus();
    setFocusedIdx(nextIdx);
  };

  const submit = async () => {
    const otp = digits.join('');
    if (otp.length < 6) {
      setErr('Vui lòng nhập đủ 6 chữ số mã OTP nhé.');
      return;
    }
    setErr('');
    setMsg('');
    setBusy(true);
    try {
      await authApi.verifyOtp({ email: state.email, otp });
      nav('/login', { state: { registered: true }, replace: true });
    } catch (e) {
      setErr(errMsg(e, 'Mã OTP chưa chính xác hoặc đã hết hạn, vui lòng thử lại.'));
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    if (countdown > 0 || busy) return;
    setBusy(true);
    setErr('');
    setMsg('');

    // Xóa mã OTP cũ trong 6 ô và đưa con trỏ về ô đầu tiên
    setDigits(Array(6).fill(''));
    setFocusedIdx(0);
    refs.current[0]?.focus();

    try {
      await authApi.validate({
        email: state.email,
        username: state.username,
        fullName: state.fullName,
        password: state.password,
      });
      setCountdown(60);
      setMsg('Đã gửi lại mã OTP mới về email của bạn!');
    } catch (e) {
      setErr(errMsg(e, 'Không thể gửi lại mã, vui lòng thử lại sau.'));
    } finally {
      setBusy(false);
    }
  };

  const isComplete = digits.join('').length === 6;

  return (
    <PageTransition
      className="auth"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        position: 'relative',
        background: 'radial-gradient(ellipse 90% 80% at 50% -10%, #E8F2FD 0%, var(--bg) 70%)',
      }}
    >
      <button
        type="button"
        className="topbar-home-btn"
        onClick={() => nav('/login')}
        title="Quay lại Đăng nhập / Đăng ký"
        style={{
          position: 'absolute',
          top: 24,
          left: 24,
          zIndex: 50,
          background: 'rgba(255, 255, 255, 0.92)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <Icon n="arrow-left" s={16} />
        <span className="topbar-home-text">Quay lại</span>
      </button>

      <div className="otp-card">
        <img src={vi3dImg} alt="Vi Mascot" className="otp-mascot" />
        <h1>Gần xong rồi — nhập mã OTP</h1>
        <p className="sub">
          Mã xác thực 6 số vừa được gửi tới
          <br />
          <span className="email-badge">{state.email}</span>
        </p>

        <div className="otp-row" style={{ margin: '24px 0 12px' }}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => { refs.current[i] = el; }}
              className={`otpbox ${d ? 'fill' : ''} ${focusedIdx === i ? 'cur' : ''}`}
              value={d}
              maxLength={1}
              inputMode="numeric"
              autoComplete="one-time-code"
              onFocus={() => setFocusedIdx(i)}
              onChange={(e) => setDigit(i, e.target.value)}
              onPaste={handlePaste}
              onKeyDown={(e) => {
                if (e.key === 'Backspace') {
                  if (!d && i > 0) {
                    refs.current[i - 1]?.focus();
                    setFocusedIdx(i - 1);
                  } else if (d) {
                    const copy = [...digits];
                    copy[i] = '';
                    setDigits(copy);
                  }
                } else if (e.key === 'ArrowLeft' && i > 0) {
                  refs.current[i - 1]?.focus();
                  setFocusedIdx(i - 1);
                } else if (e.key === 'ArrowRight' && i < 5) {
                  refs.current[i + 1]?.focus();
                  setFocusedIdx(i + 1);
                } else if (e.key === 'Enter' && isComplete) {
                  submit();
                }
              }}
            />
          ))}
        </div>

        <div className="otp-expiry-tag">
          <Icon n="clock" s={14} />
          <span>Mã có hiệu lực trong 5 phút</span>
        </div>

        {msg && !err && (
          <div
            className="pill level"
            style={{
              marginTop: '16px',
              padding: '10px 16px',
              borderRadius: '12px',
              fontSize: '13.5px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              background: 'var(--green-bg)',
              color: 'var(--green-dark)',
              border: '1px solid rgba(30, 126, 70, 0.2)',
              width: '100%',
            }}
          >
            <Icon n="check" s={16} />
            <span>{msg}</span>
          </div>
        )}

        {err && (
          <div
            className="pill redsoft"
            style={{
              marginTop: '16px',
              padding: '10px 16px',
              borderRadius: '12px',
              fontSize: '13.5px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              background: 'var(--red-bg)',
              color: 'var(--red-dark)',
              border: '1px solid rgba(229, 72, 77, 0.25)',
              width: '100%',
            }}
          >
            <Icon n="alert" s={16} />
            <span>{err}</span>
          </div>
        )}

        <button
          type="button"
          className="btn block"
          style={{
            marginTop: '22px',
            minHeight: '52px',
            fontSize: '16px',
            fontWeight: 800,
            borderRadius: '14px',
            background: isComplete && !busy ? 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)' : undefined,
            boxShadow: isComplete && !busy ? '0 8px 22px rgba(21, 101, 192, 0.28)' : undefined,
          }}
          disabled={busy || !isComplete}
          onClick={submit}
        >
          {busy ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <Icon n="loader" s={16} className="spin" />
              Đang xác thực...
            </span>
          ) : (
            'Xác nhận'
          )}
        </button>

        <div
          className="center"
          style={{
            marginTop: '18px',
            fontWeight: 700,
            color: 'var(--muted)',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          <span>Chưa nhận được mã?</span>
          {countdown > 0 ? (
            <span style={{ color: 'var(--primary-dark)', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
              Gửi lại sau {countdown}s
            </span>
          ) : (
            <button
              type="button"
              className="link"
              onClick={resend}
              disabled={busy}
              style={{
                fontWeight: 800,
                color: 'var(--primary)',
                cursor: 'pointer',
                background: 'none',
                border: 'none',
                padding: 0,
                textDecoration: 'underline',
              }}
            >
              Gửi lại mã
            </button>
          )}
        </div>
      </div>
    </PageTransition>
  );
}

