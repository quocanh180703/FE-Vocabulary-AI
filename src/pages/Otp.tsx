import { useRef, useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { authApi, errMsg } from '../api';
import { Icon } from '../components/icons';
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

  const submit = async () => {
    const otp = digits.join('');
    if (otp.length < 6) {
      setErr('Vui lòng nhập đủ 6 số OTP nhé.');
      return;
    }
    setErr('');
    setBusy(true);
    try {
      await authApi.verifyOtp({ ...state, otp });
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

  return (
    <div className="auth" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative' }}>
      <button
        type="button"
        className="topbar-home-btn"
        onClick={() => nav('/login')}
        title="Quay lại Đăng nhập / Đăng ký"
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
        <span className="topbar-home-text">Quay lại</span>
      </button>

      <div className="otp-card">
        <img src={vi3dImg} alt="Vi Mascot" />
        <h1>Gần xong rồi — nhập mã OTP</h1>
        <p className="sub" style={{ marginTop: '8px', lineHeight: 1.6 }}>
          Mã xác thực 6 số vừa được gửi tới<br />
          <b style={{ color: 'var(--ink)' }}>{state.email}</b>
        </p>

        <div className="otp-row" style={{ margin: '26px 0 10px' }}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => { refs.current[i] = el; }}
              className={`otpbox ${d ? 'fill' : ''} ${focusedIdx === i ? 'cur' : ''}`}
              value={d}
              maxLength={1}
              inputMode="numeric"
              onFocus={() => setFocusedIdx(i)}
              onChange={(e) => setDigit(i, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Backspace' && !d && i > 0) {
                  refs.current[i - 1]?.focus();
                  setFocusedIdx(i - 1);
                }
                if (e.key === 'Enter') submit();
              }}
            />
          ))}
        </div>

        <div className="sub" style={{ fontSize: '13px' }}>
          Mã có hiệu lực trong 5 phút
        </div>

        {msg && (
          <div
            className="pill level"
            style={{ marginTop: '14px', padding: '8px 14px', borderRadius: '12px', fontSize: '13px', display: 'flex', width: '100%', justifyContent: 'center' }}
          >
            {msg}
          </div>
        )}

        {err && (
          <div
            className="pill redsoft"
            style={{ marginTop: '14px', padding: '8px 14px', borderRadius: '12px', fontSize: '13px', display: 'flex', width: '100%', justifyContent: 'center' }}
          >
            {err}
          </div>
        )}

        <button
          type="button"
          className="btn block"
          style={{ marginTop: '22px', minHeight: '54px' }}
          disabled={busy || digits.join('').length < 6}
          onClick={submit}
        >
          {busy ? 'Đang xác thực...' : 'Xác nhận'}
        </button>

        <div className="center" style={{ marginTop: '18px', fontWeight: 700, color: 'var(--muted)', fontSize: '14px' }}>
          Chưa nhận được mã?{' '}
          {countdown > 0 ? (
            <span style={{ color: 'var(--primary-dark)', fontWeight: 800 }}>
              Gửi lại sau {countdown}s
            </span>
          ) : (
            <button type="button" className="link" onClick={resend} disabled={busy}>
              Gửi lại mã
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
