import { useState } from 'react';
import { aiApi, errMsg } from '../../api';
import type { GrammarResp } from '../../api';
import { useUsage } from '../../context/UsageContext';
import { MotionCard } from '../../motion';
import viAvatar from '../../assets/vi-3d.webp';
import ResultPanel from './ResultPanel';

const SAMPLE_SENTENCES = [
  'I goes to school yesterday.',
  "She don't like eating apple.",
  'I have buyed a new laptop last week.',
];

export default function FreeCheckPanel() {
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

  return (
    <div className="cols2" style={{ alignItems: 'start' }}>
      {/* Left Column: Input */}
      <MotionCard className="card">
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
                  transition: 'all 0.15s var(--ease-gentle)',
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
      </MotionCard>

      {/* Right Column: Output */}
      <div>
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

        {res && <ResultPanel res={res} />}
      </div>
    </div>
  );
}

