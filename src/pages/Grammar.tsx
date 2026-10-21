import { useState } from 'react';
import { aiApi, errMsg } from '../api';
import type { GrammarResp } from '../api';
import { Icon, Mascot } from '../components/icons';

export default function Grammar() {
  const [text, setText] = useState('');
  const [res, setRes] = useState<GrammarResp | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const check = async () => {
    if (text.trim().length < 3) { setErr('Viết vài từ đã rồi hãy kiểm tra nhé.'); return; }
    setErr(''); setBusy(true); setRes(null);
    try { const { data } = await aiApi.grammar(text); setRes(data); }
    catch (e) { setErr(errMsg(e, 'AI đang bận, thử lại sau nhé.')); }
    finally { setBusy(false); }
  };

  const SAMPLE_SENTENCES = [
    'I goes to school yesterday.',
    "She don't like eating apple.",
    'I have buyed a new laptop last week.',
  ];

  return (
    <div className="content">
      <div className="pagehead">
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '4px 12px', background: 'rgba(79, 70, 229, 0.08)', borderRadius: 99, color: 'var(--primary)', fontSize: 13, fontWeight: 800, marginBottom: 8 }}>
          <Icon n="spark" s={14} /> AI Grammar & Writing Assistant
        </div>
        <h1>Kiểm tra & Sửa ngữ pháp tiếng Anh</h1>
        <div className="sub">Nhập đoạn văn hoặc câu tiếng Anh của bạn để Vi AI phân tích lỗi sai và đề xuất câu viết chuẩn tự nhiên</div>
      </div>

      <div className="cols2" style={{ gap: 24, alignItems: 'start' }}>
        {/* Left Column: Input */}
        <div className="card" style={{ borderRadius: 18, padding: '24px 22px' }}>
          <div className="field">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label>Đoạn văn hoặc câu cần kiểm tra</label>
              <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 700 }}>
                {text.length} ký tự
              </span>
            </div>
            <textarea
              className="input"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Nhập hoặc dán câu tiếng Anh vào đây, ví dụ: I go to cinema with my friends yesterday..."
              style={{
                borderRadius: 12,
                minHeight: 160,
                fontSize: 15,
                lineHeight: 1.6,
                padding: '14px 16px',
                border: '1.5px solid var(--line)',
              }}
            />
          </div>

          <div style={{ marginTop: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>
              💡 Thử nhanh câu mẫu:
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {SAMPLE_SENTENCES.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => setText(s)}
                  style={{
                    background: '#F8FAFC',
                    border: '1px solid var(--line)',
                    borderRadius: 99,
                    padding: '4px 12px',
                    fontSize: 12,
                    fontWeight: 700,
                    color: 'var(--muted)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--primary)')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--line)')}
                >
                  "{s}"
                </button>
              ))}
            </div>
          </div>

          <button
            className="btn block mt16"
            disabled={busy || text.trim().length < 2}
            onClick={check}
            style={{ minHeight: 50, fontSize: 15 }}
          >
            <Icon n="spark" s={20} />
            {busy ? 'Vi đang đọc và phân tích cấu trúc...' : 'Kiểm tra ngữ pháp ngay'}
          </button>

          {err && <div className="error mt8">{err}</div>}
        </div>

        {/* Right Column: Output */}
        <div>
          {!res && !busy && (
            <div className="card center" style={{ padding: '60px 24px', borderRadius: 18 }}>
              <Mascot s={64} />
              <b style={{ fontSize: 16, color: 'var(--ink)', display: 'block', marginTop: 12 }}>
                Kết quả phân tích sẽ xuất hiện ở đây
              </b>
              <div className="sub mt8" style={{ maxWidth: 320, margin: '8px auto 0', fontSize: 13.5 }}>
                Nhập câu bất kỳ bên trái và bấm "Kiểm tra ngữ pháp ngay" để nhận phản hồi từ Vi AI nhé!
              </div>
            </div>
          )}

          {busy && (
            <div className="card center" style={{ padding: '60px 24px', borderRadius: 18 }}>
              <div className="loading" style={{ padding: 20 }}>
                <Icon n="spark" s={24} /> Vi AI đang phân tích từng từ và cấu trúc ngữ pháp...
              </div>
            </div>
          )}

          {res && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Score & Correction */}
              <div className="card" style={{ borderRadius: 18, padding: '24px 22px' }}>
                <div className="row" style={{ alignItems: 'center' }}>
                  <h2 style={{ fontSize: 19, fontWeight: 900 }}>Kết quả đánh giá</h2>
                  <span
                    className="pill level"
                    style={{
                      fontSize: 14,
                      fontWeight: 900,
                      padding: '4px 14px',
                      background: res.score >= 80 ? '#DCFCE7' : res.score >= 50 ? '#FEF3C7' : '#FEE2E2',
                      color: res.score >= 80 ? '#15803D' : res.score >= 50 ? '#B45309' : '#DC2626',
                    }}
                  >
                    Điểm số: {res.score}/100
                  </span>
                </div>

                <div style={{ marginTop: 14, padding: '10px 14px', background: '#F8FAFC', borderRadius: 10, border: '1px solid var(--line)' }}>
                  <span className="sub" style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--muted)' }}>
                    Câu gốc của bạn:
                  </span>
                  <div style={{ fontWeight: 700, color: 'var(--ink)', marginTop: 4, fontSize: 15 }}>
                    {res.originalText}
                  </div>
                </div>

                <div
                  style={{
                    marginTop: 12,
                    padding: '14px 16px',
                    background: 'linear-gradient(135deg, #ECFDF5 0%, #F0FDF4 100%)',
                    borderRadius: 12,
                    border: '1.5px solid #A7F3D0',
                  }}
                >
                  <span style={{ fontSize: 11.5, fontWeight: 800, color: '#047857', background: '#D1FAE5', padding: '2px 8px', borderRadius: 6, textTransform: 'uppercase' }}>
                    ✓ Câu đã sửa hoàn chỉnh:
                  </span>
                  <div style={{ fontWeight: 900, color: '#065F46', fontSize: 17, marginTop: 6, lineHeight: 1.4 }}>
                    {res.correctedText}
                  </div>
                </div>
              </div>

              {/* Errors Breakdown */}
              {res.errors && res.errors.length > 0 && (
                <div className="card" style={{ borderRadius: 18, padding: '22px' }}>
                  <h2 style={{ fontSize: 17, fontWeight: 900, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="dot r" />
                    Phát hiện {res.errors.length} lỗi cần lưu ý:
                  </h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
                    {res.errors.map((e, i) => (
                      <div
                        key={i}
                        style={{
                          padding: '12px 14px',
                          background: '#FFF5F5',
                          border: '1px solid #FECACA',
                          borderRadius: 12,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span className="pill" style={{ background: '#FEE2E2', color: '#DC2626', fontSize: 11.5, fontWeight: 800, padding: '2px 8px' }}>
                            {e.errorType}
                          </span>
                          <b style={{ color: '#991B1B', fontSize: 14 }}>{e.message}</b>
                        </div>
                        <div style={{ marginTop: 6, fontSize: 13, color: '#7F1D1D', fontWeight: 600 }}>
                          💡 <b>Gợi ý sửa:</b> {e.suggestion}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Coach Tip */}
              <div
                className="card"
                style={{
                  background: 'linear-gradient(135deg, #F5F3FF 0%, #EEF2FF 100%)',
                  border: '1px solid #DDD6FE',
                  borderRadius: 16,
                  padding: '16px 20px',
                }}
              >
                <div className="coach">
                  <Mascot s={46} />
                  <div className="bubble" style={{ background: '#FFFFFF', borderColor: '#C7D2FE' }}>
                    <b>Mẹo của Vi AI:</b> Hãy đọc to câu đã sửa 3 lần theo nhịp điệu tự nhiên — cơ miệng và não bộ sẽ ghi nhớ cấu trúc chuẩn nhanh gấp đôi so với chỉ đọc nhẩm!
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
