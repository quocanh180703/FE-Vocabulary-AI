import { useState } from 'react';
import { aiApi, errMsg } from '../api';
import type { GrammarResp } from '../api';
import { useUsage } from '../context/UsageContext';
import { QuotaBadge } from '../components/QuotaBadge';
import viAvatar from '../assets/vi-3d.webp';

export default function Grammar() {
  const { decrementQuota } = useUsage();
  const [text, setText] = useState('');
  const [res, setRes] = useState<GrammarResp | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const check = async () => {
    if (text.trim().length < 3) {
      setErr('Viết vài từ đã rồi hãy kiểm tra nhé.');
      return;
    }
    setErr('');
    setBusy(true);
    setRes(null);
    try {
      const { data } = await aiApi.grammar(text);
      setRes(data);
      decrementQuota('grammar');
    } catch (e) {
      setErr(errMsg(e, 'AI đang bận, thử lại sau nhé.'));
    } finally {
      setBusy(false);
    }
  };

  const SAMPLE_SENTENCES = [
    'I goes to school yesterday.',
    "She don't like eating apple.",
    'I have buyed a new laptop last week.',
  ];

  return (
    <div className="content" style={{ maxWidth: 1180 }}>
      <div className="pagehead" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1>Kiểm tra &amp; Sửa ngữ pháp tiếng Anh</h1>
          <div className="sub">Viết hoặc dán câu tiếng Anh — Vi sửa và giải thích từng lỗi chi tiết</div>
        </div>
        <QuotaBadge featureKey="grammar" labelSuffix="lượt kiểm tra hôm nay" />
      </div>

      <div className="cols2" style={{ alignItems: 'start' }}>
        {/* Left Column: Input */}
        <div className="card">
          <h2>
            <span className="dot" />
            Câu của bạn
          </h2>

          <textarea
            className="input mt16"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Nhập hoặc dán câu tiếng Anh vào đây, ví dụ: I go to school yesterday and meet my friend..."
            style={{
              minHeight: 160,
              fontSize: 15,
              lineHeight: 1.6,
            }}
          />

          <div style={{ marginTop: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>
              💡 Thử nhanh câu mẫu:
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {SAMPLE_SENTENCES.map((s, idx) => (
                <button
                  key={idx}
                  type="button"
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
            type="button"
            className="btn block mt16"
            disabled={busy || text.trim().length < 2}
            onClick={check}
          >
            {busy ? 'Vi đang đọc và phân tích cấu trúc...' : 'Kiểm tra ngay'}
          </button>

          <div className="sub mt8" style={{ textAlign: 'center', fontSize: 12.5 }}>
            Vi dùng AI để sửa — hãy đọc kỹ phần giải thích để nhớ lâu nhé.
          </div>

          {err && <div className="error mt8">{err}</div>}
        </div>

        {/* Right Column: Output */}
        <div className="colstack">
          {!res && !busy && (
            <div className="card center" style={{ padding: '48px 24px' }}>
              <img src={viAvatar} alt="Vi" style={{ width: 72, height: 72, objectFit: 'contain' }} />
              <b style={{ fontSize: 16, color: 'var(--ink)', display: 'block', marginTop: 12 }}>
                Kết quả phân tích sẽ xuất hiện ở đây
              </b>
              <div className="sub mt8" style={{ maxWidth: 320, margin: '8px auto 0', fontSize: 13.5 }}>
                Nhập câu bất kỳ bên trái và bấm &quot;Kiểm tra ngay&quot; để nhận phân tích chi tiết từ Vi nhé!
              </div>
            </div>
          )}

          {busy && (
            <div className="card center" style={{ padding: '48px 24px' }}>
              <img
                src={viAvatar}
                alt="Vi"
                style={{ width: 64, height: 64, objectFit: 'contain', animation: 'float 2s ease-in-out infinite' }}
              />
              <div className="mt16" style={{ fontWeight: 700, color: 'var(--primary)' }}>
                Vi đang phân tích từng từ và cấu trúc ngữ pháp...
              </div>
            </div>
          )}

          {res && (
            <>
              <div className="card">
                <div className="row" style={{ alignItems: 'center' }}>
                  <h2>
                    <span className="dot g" />
                    Kết quả đánh giá
                  </h2>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span className="pill level" style={{ fontWeight: 800 }}>
                      Điểm: {res.score}/100
                    </span>
                    <span className={res.errors && res.errors.length > 0 ? 'pill redsoft' : 'pill greensoft'}>
                      {res.errors && res.errors.length > 0 ? `${res.errors.length} lỗi cần sửa` : 'Hoàn hảo'}
                    </span>
                  </div>
                </div>

                <div style={{ marginTop: 14, padding: '10px 14px', background: '#F8FAFC', borderRadius: 10, border: '1px solid var(--line)' }}>
                  <span className="sub" style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Câu gốc của bạn:
                  </span>
                  <div style={{ fontWeight: 600, color: 'var(--ink)', marginTop: 4, fontSize: 14.5 }}>
                    {res.originalText}
                  </div>
                </div>

                <div
                  className="fix mt16"
                  style={{
                    padding: '14px 16px',
                    background: 'rgba(53, 158, 125, 0.08)',
                    borderRadius: 12,
                    border: '1.5px solid rgba(53, 158, 125, 0.3)',
                  }}
                >
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#1B5E20', textTransform: 'uppercase' }}>
                    ✓ Câu đã sửa hoàn chỉnh:
                  </span>
                  <div style={{ fontWeight: 800, color: '#1B5E20', fontSize: 16.5, marginTop: 4, lineHeight: 1.5 }}>
                    {res.correctedText}
                  </div>
                </div>

                {res.errors && res.errors.length > 0 && (
                  <div className="mt16" style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                    {res.errors.map((e, idx) => (
                      <div key={idx} className="taskrow">
                        <span className="tk" style={{ color: 'var(--primary)' }}>
                          <b>{idx + 1}</b>
                        </span>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <b>{e.message}</b>
                            {e.errorType && (
                              <span className="pill" style={{ fontSize: 10, padding: '2px 6px' }}>
                                {e.errorType}
                              </span>
                            )}
                          </div>
                          <div className="sub mt8" style={{ color: 'var(--ink)', fontSize: 13 }}>
                            💡 <b>Gợi ý:</b> {e.suggestion}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="card">
                <div className="coach">
                  <img src={viAvatar} alt="Vi" />
                  <div className="bubble">
                    <b>Gợi ý của Vi:</b>{' '}
                    {res.errors && res.errors.length > 0
                      ? 'Hãy đọc to câu đã sửa 3 lần theo nhịp điệu tự nhiên — cơ miệng và não bộ sẽ ghi nhớ cấu trúc chuẩn nhanh gấp đôi so với chỉ đọc nhẩm!'
                      : 'Tuyệt vời! Câu của bạn rất chuẩn ngữ pháp và tự nhiên. Tiếp tục phát huy nhé!'}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
