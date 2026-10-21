import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { authApi, errMsg } from '../api';
import { useAuth } from '../auth/AuthContext';
import { Mascot, Icon } from '../components/icons';

export default function Login() {
  const { state } = useLocation() as { state?: { registered?: boolean } };
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [id, setId] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();
  const { login } = useAuth();

  const submit = async () => {
    setErr(''); setBusy(true);
    try {
      if (mode === 'login') {
        const { data } = await authApi.login({ emailOrUsername: id, password: pw });
        const access = data.accessToken || data.access_token || '';
        const refresh = data.refreshToken || data.refresh_token || '';
        login(data.user, access, refresh);
        nav('/');
      } else {
        await authApi.validate({ email, username, fullName, password: pw });
        nav('/otp', { state: { email, username, fullName, password: pw } });
      }
    } catch (e) { setErr(errMsg(e)); }
    finally { setBusy(false); }
  };

  return (
    <div className="auth-wrap" style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => nav('/landing')}
        title="Về trang giới thiệu (Landing Page)"
        style={{
          position: 'absolute',
          top: 18,
          left: 18,
          zIndex: 50,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '7px 14px',
          borderRadius: 99,
          background: 'rgba(255, 255, 255, 0.92)',
          backdropFilter: 'blur(8px)',
          border: '1px solid #E2E8F0',
          color: '#334155',
          fontSize: 13,
          fontWeight: 700,
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
          transition: 'all 0.18s ease',
        }}
      >
        <Icon n="home" s={16} />
        <span>Trang chủ</span>
      </button>
      <div className="auth-left">
        <Mascot s={120} />
        <h1>VocabularyAI</h1>
        <p>Học tiếng Anh vui mỗi ngày — từ vựng, quiz, luyện nói cùng AI.<br />Dành cho mọi lứa tuổi, từ 5 đến 70!</p>
        <div style={{ display: 'flex', gap: 12 }}>
          <span className="pill"><Icon n="book" s={16} />2000+ từ vựng</span>
          <span className="pill"><Icon n="spark" s={16} />AI 24/7</span>
          <span className="pill"><Icon n="mic" s={16} />Luyện nói</span>
        </div>
      </div>
      <div className="auth-right">
        <div className="auth-card">
          <h1>{mode === 'login' ? 'Chào mừng trở lại!' : 'Tạo tài khoản'}</h1>
          <div className="sub">{mode === 'login' ? 'Đăng nhập để tiếp tục hành trình' : 'Miễn phí — mất 1 phút thôi'}</div>
          <div className="seg">
            <button className={mode === 'login' ? 'on' : ''} onClick={() => setMode('login')}>Đăng nhập</button>
            <button className={mode === 'register' ? 'on' : ''} onClick={() => setMode('register')}>Đăng ký</button>
          </div>
          {mode === 'login' ? (
            <>
              <div className="field"><label>Email hoặc tên đăng nhập</label>
                <input className="input" value={id} onChange={(e) => setId(e.target.value)} placeholder="minh.nguyen" /></div>
              <div className="field"><label>Mật khẩu</label>
                <input className="input" type="password" value={pw} onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} /></div>
            </>
          ) : (
            <>
              <div className="field"><label>Họ tên</label>
                <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nguyễn Văn Minh" /></div>
              <div className="field"><label>Email</label>
                <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="minh@email.com" /></div>
              <div className="field"><label>Tên đăng nhập</label>
                <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="minh.nguyen" /></div>
              <div className="field"><label>Mật khẩu</label>
                <input className="input" type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Tối thiểu 8 ký tự" /></div>
            </>
          )}
          {state?.registered && !err && <div className="ok">Tạo tài khoản xong rồi — đăng nhập để bắt đầu nhé! 🎉</div>}
          {err && <div className="error">{err}</div>}
          <button className="btn block" disabled={busy} onClick={submit}>
            {busy ? 'Đang xử lý...' : mode === 'login' ? 'Đăng nhập' : 'Gửi mã OTP'}
          </button>
          {mode === 'login' && <div className="center"><button className="link">Quên mật khẩu?</button></div>}
        </div>
      </div>
    </div>
  );
}
