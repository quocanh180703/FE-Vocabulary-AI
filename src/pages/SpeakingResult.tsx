import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { speakApi, errMsg } from '../api';
import type { SessionDetail, AttemptDetail } from '../api';
import { Mascot, Icon } from '../components/icons';

function ModernRadar({ scores }: { scores: { label: string; v: number }[] }) {
  const C = 130, R = 72;
  const pt = (i: number, v: number) => {
    const a = (Math.PI * 2 * i) / scores.length - Math.PI / 2;
    const r = (R * Math.max(8, Math.min(100, v))) / 100;
    return [C + r * Math.cos(a), C + r * Math.sin(a)];
  };

  const poly = scores.map((s, i) => pt(i, s.v).join(',')).join(' ');
  const gridLevels = [25, 50, 75, 100];

  const labelPositions = [
    { textAnchor: 'middle', dx: 0, dy: -14 }, // Top (Ngữ pháp)
    { textAnchor: 'start', dx: 14, dy: 4 },    // Right (Từ vựng)
    { textAnchor: 'middle', dx: 0, dy: 20 },  // Bottom (Trôi chảy)
    { textAnchor: 'end', dx: -14, dy: 4 },    // Left (Nội dung)
  ];

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: 280, margin: '8px auto 0' }}>
      <svg viewBox="0 0 260 260" width="100%" height="auto" style={{ display: 'block', overflow: 'visible' }}>
        <defs>
          <linearGradient id="radarFillGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2563eb" stopOpacity="0.38" />
            <stop offset="100%" stopColor="#0284c7" stopOpacity="0.18" />
          </linearGradient>
          <filter id="radarGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#1d4ed8" floodOpacity="0.25" />
          </filter>
        </defs>

        {/* Lưới đa giác đồng tâm */}
        {gridLevels.map((g, idx) => {
          const points = scores
            .map((_, i) => {
              const a = (Math.PI * 2 * i) / scores.length - Math.PI / 2;
              const r = (R * g) / 100;
              return `${C + r * Math.cos(a)},${C + r * Math.sin(a)}`;
            })
            .join(' ');
          return (
            <polygon
              key={idx}
              points={points}
              fill={idx % 2 === 0 ? 'rgba(241, 245, 249, 0.7)' : 'none'}
              stroke="#cbd5e1"
              strokeWidth={idx === 3 ? '1.5' : '1'}
              strokeDasharray={idx < 3 ? '3,3' : undefined}
            />
          );
        })}

        {/* Trục nối tâm ra 4 đỉnh */}
        {scores.map((_, i) => {
          const a = (Math.PI * 2 * i) / scores.length - Math.PI / 2;
          const x2 = C + R * Math.cos(a);
          const y2 = C + R * Math.sin(a);
          return <line key={i} x1={C} y1={C} x2={x2} y2={y2} stroke="#cbd5e1" strokeWidth="1.2" />;
        })}

        {/* Vùng diện tích điểm của học viên */}
        <polygon points={poly} fill="url(#radarFillGrad)" stroke="#2563eb" strokeWidth="2.5" filter="url(#radarGlow)" />

        {/* Các điểm mốc ở đỉnh */}
        {scores.map((s, i) => {
          const [x, y] = pt(i, s.v);
          return (
            <g key={i}>
              <circle cx={x} cy={y} r="5" fill="#2563eb" stroke="#ffffff" strokeWidth="2.5" />
            </g>
          );
        })}

        {/* Nhãn kỹ năng và điểm */}
        {scores.map((s, i) => {
          const a = (Math.PI * 2 * i) / scores.length - Math.PI / 2;
          const pos = labelPositions[i] || { textAnchor: 'middle', dx: 0, dy: 0 };
          const lx = C + R * Math.cos(a) + pos.dx;
          const ly = C + R * Math.sin(a) + pos.dy;

          return (
            <text
              key={i}
              x={lx}
              y={ly}
              textAnchor={pos.textAnchor as any}
              fontSize="12.5"
              fontWeight="800"
              fill="#334155"
            >
              {s.label}{' '}
              <tspan fill="#2563eb" fontWeight="900">
                ({s.v})
              </tspan>
            </text>
          );
        })}
      </svg>
    </div>
  );
}

function parseList(val: any): string[] {
  if (!val) return [];
  if (Array.isArray(val)) {
    return val
      .map((item) => (typeof item === 'string' ? item : item.strength || item.weakness || item.suggestion || item.text || JSON.stringify(item)))
      .filter(Boolean);
  }
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => (typeof item === 'string' ? item : item.strength || item.weakness || item.suggestion || item.text || JSON.stringify(item)))
          .filter(Boolean);
      }
    } catch {
      return val.trim() ? [val.trim()] : [];
    }
  }
  return [];
}

interface CorrectionItem {
  original?: string;
  corrected?: string;
  errorType?: string;
  explanation?: string;
}

function parseCorrections(val: any): CorrectionItem[] {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return [];
    }
  }
  return [];
}

export default function SpeakingResult() {
  const { state } = useLocation() as { state?: { sessionId: number; latestResult?: any } };
  const nav = useNavigate();
  const [d, setD] = useState<SessionDetail | null>(null);
  const [err, setErr] = useState('');
  const [selectedAttemptIdx, setSelectedAttemptIdx] = useState<number>(0);

  useEffect(() => {
    if (state?.sessionId) {
      speakApi
        .sessionDetail(state.sessionId)
        .then(({ data }) => {
          setD(data);
          if (Array.isArray(data.attempts) && data.attempts.length > 0) {
            setSelectedAttemptIdx(data.attempts.length - 1);
          }
        })
        .catch((e) => setErr(errMsg(e)));
    }
  }, [state]);

  if (!state?.sessionId) {
    return (
      <div className="content narrow center" style={{ paddingTop: 80 }}>
        <div className="sub">Chưa có phiên luyện nói nào.</div>
        <button className="btn mt16" onClick={() => nav('/speaking')}>
          Luyện nói ngay
        </button>
      </div>
    );
  }

  if (err) {
    return (
      <div className="content narrow">
        <div className="error">{err}</div>
      </div>
    );
  }

  if (!d) {
    return (
      <div className="content">
        <div className="loading">Vi đang tổng hợp kết quả chấm điểm từ AI...</div>
      </div>
    );
  }

  const attempts: AttemptDetail[] = Array.isArray(d.attempts) && d.attempts.length > 0 ? d.attempts : [];
  const currentAttempt: AttemptDetail | null = attempts[selectedAttemptIdx] || attempts[attempts.length - 1] || null;

  const fb = currentAttempt?.feedback || d.feedback || state?.latestResult?.feedback || {};
  const scoresObj = state?.latestResult?.scores || {};

  const grammarScore = Math.round(Number(fb.grammarScore ?? scoresObj.grammarScore ?? 70));
  const vocabularyScore = Math.round(Number(fb.vocabularyScore ?? scoresObj.vocabularyScore ?? 75));
  const fluencyScore = Math.round(Number(fb.fluencyScore ?? scoresObj.fluencyScore ?? 65));
  const contentScore = Math.round(Number(fb.contentScore ?? scoresObj.contentScore ?? 70));

  const overallScore = Math.round(
    Number(
      currentAttempt?.overallScore ??
      fb.overallScore ??
      scoresObj.overallScore ??
      d.overallScore ??
      Math.round((grammarScore + vocabularyScore + fluencyScore + contentScore) / 4)
    )
  );

  const scores = [
    { label: 'Ngữ pháp', v: grammarScore },
    { label: 'Từ vựng', v: vocabularyScore },
    { label: 'Trôi chảy', v: fluencyScore },
    { label: 'Nội dung', v: contentScore },
  ];

  const transcript = currentAttempt?.transcript || state?.latestResult?.attempt?.transcript || '';
  const generalFeedback =
    fb.feedback ||
    state?.latestResult?.feedback?.feedback ||
    'Bài nói đã được ghi nhận. Hãy xem chi tiết các lỗi và nhận xét bên dưới để cải thiện phản xạ nhé!';

  const strengths = parseList(fb.strengths || state?.latestResult?.feedback?.strengths);
  const weaknesses = parseList(fb.weaknesses || state?.latestResult?.feedback?.weaknesses);
  const suggestions = parseList(fb.suggestions || state?.latestResult?.feedback?.suggestions);
  const corrections = parseCorrections(fb.corrections || state?.latestResult?.feedback?.corrections);

  const getScoreBadge = (sc: number) => {
    if (sc >= 85) return { text: 'Xuất sắc 🌟', color: 'var(--green-dark)', bg: '#e6f4eb' };
    if (sc >= 70) return { text: 'Khá tốt 👍', color: 'var(--primary-dark)', bg: 'var(--tint)' };
    if (sc >= 50) return { text: 'Cần cố gắng ⚡', color: '#b45309', bg: '#fffbeb' };
    return { text: 'Cần luyện thêm ⚠️', color: '#b91c1c', bg: '#fef2f2' };
  };

  const badge = getScoreBadge(overallScore);

  return (
    <div className="content" style={{ maxWidth: 1000 }}>
      {/* Header */}
      <div className="pagehead">
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '4px 12px', background: 'rgba(79, 70, 229, 0.08)', borderRadius: 99, color: 'var(--primary)', fontSize: 13, fontWeight: 800, marginBottom: 8 }}>
          <Icon n="mic" s={14} /> AI Speech Evaluation Report
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1>Kết quả luyện nói phản xạ</h1>
            <div className="sub">
              Chủ đề: <b style={{ color: 'var(--ink)' }}>{d.topic}</b> · Trình độ: <b>{d.level}</b> · Tổng số lần thử: <b>{attempts.length || 1}</b>
            </div>
          </div>
          <button className="btn ghost" style={{ minHeight: 44, padding: '0 18px', fontSize: 14, borderRadius: 12 }} onClick={() => nav('/speaking')}>
            <Icon n="mic" s={18} />
            Luyện chủ đề khác
          </button>
        </div>
      </div>

      {/* Selector chọn lần thử nếu có nhiều lần */}
      {attempts.length > 1 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexWrap: 'wrap',
            padding: '12px 16px',
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: 14,
            boxShadow: '0 2px 6px rgba(15, 23, 42, 0.02)',
          }}
        >
          <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--muted)' }}>Lần thử:</span>
          {attempts.map((a, idx) => {
            const isSelected = idx === selectedAttemptIdx;
            const sc = a.overallScore ?? a.feedback?.overallScore;
            return (
              <button
                key={a.id || idx}
                onClick={() => setSelectedAttemptIdx(idx)}
                className={`chip ${isSelected ? 'on' : ''}`}
                style={{ cursor: 'pointer', transition: 'all 0.15s ease' }}
              >
                Lần #{a.attemptNumber || idx + 1}
                {sc != null && <span style={{ marginLeft: 6, fontWeight: 900 }}>({Math.round(Number(sc))}đ)</span>}
              </button>
            );
          })}
        </div>
      )}

      {/* KHUNG VĂN BẢN BÀI NÓI */}
      <div
        className="card"
        style={{
          background: '#ffffff',
          border: '1px solid #E2E8F0',
          borderRadius: 18,
          padding: '20px 24px',
          boxShadow: '0 4px 16px rgba(15, 23, 42, 0.03)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 900, color: 'var(--primary)', fontSize: 15, marginBottom: 12 }}>
          <Icon n="mic" s={18} />
          <span>Văn bản bài nói nhận diện qua giọng nói (Lần thử #{currentAttempt?.attemptNumber || selectedAttemptIdx + 1})</span>
        </div>

        <div
          style={{
            padding: '16px 20px',
            background: '#F8FAFC',
            borderRadius: 12,
            border: '1px solid #E2E8F0',
            fontSize: 15.5,
            lineHeight: 1.65,
            color: transcript ? 'var(--ink)' : 'var(--muted)',
            fontStyle: transcript ? 'normal' : 'italic',
            fontWeight: 500,
          }}
        >
          {transcript ? `"${transcript}"` : 'Không nhận diện được nội dung nói hoặc âm lượng micro quá nhỏ.'}
        </div>
      </div>

      {/* KHUNG BẢN ĐỒ KỸ NĂNG & CHI TIẾT ĐIỂM */}
      <div className="cols2">
        {/* Bản đồ kỹ năng (Radar Chart gọn gàng, tinh tế) */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '24px 26px', borderRadius: 20, border: '1px solid #E2E8F0', boxShadow: '0 4px 16px rgba(15, 23, 42, 0.03)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <h2 style={{ fontSize: 18, margin: 0, fontWeight: 900 }}>Bản đồ năng lực nói</h2>
              <span className="pill" style={{ fontSize: 11, background: '#EEF2FF', color: 'var(--primary)', fontWeight: 800 }}>4 Tiêu chuẩn CEFR</span>
            </div>
            <div className="sub" style={{ fontSize: 13 }}>Đánh giá toàn diện 4 tiêu chí cốt lõi</div>
            <ModernRadar scores={scores} />
          </div>

          {/* Hộp điểm tổng kết gọn gàng */}
          <div
            style={{
              marginTop: 18,
              padding: '16px 20px',
              background: 'linear-gradient(135deg, #F8FAFC 0%, #EEF2FF 100%)',
              borderRadius: 16,
              border: '1px solid #E0E7FF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                Điểm tổng Lần #{currentAttempt?.attemptNumber || selectedAttemptIdx + 1}
              </div>
              <div style={{ fontSize: 34, fontWeight: 900, color: 'var(--primary)', lineHeight: 1.1, marginTop: 4 }}>
                {overallScore}
                <span style={{ fontSize: 16, color: 'var(--muted)', fontWeight: 700 }}> / 100</span>
              </div>
            </div>
            <span
              style={{
                padding: '8px 16px',
                borderRadius: 99,
                background: badge.bg,
                color: badge.color,
                fontWeight: 900,
                fontSize: 14,
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              }}
            >
              {badge.text}
            </span>
          </div>
        </div>

        {/* Cột Chi tiết điểm & Lịch sử các lần thử */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="card" style={{ padding: '22px 24px', borderRadius: 20, border: '1px solid #E2E8F0', boxShadow: '0 4px 16px rgba(15, 23, 42, 0.03)' }}>
            <h2 style={{ fontSize: 18, marginBottom: 16, fontWeight: 900 }}>Chi tiết điểm thành phần</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {scores.map((s) => {
                const color = s.v >= 80 ? 'var(--green)' : s.v >= 65 ? 'var(--primary)' : 'var(--red)';
                return (
                  <div className="bar-row" key={s.label}>
                    <span className="lbl" style={{ fontSize: 14, fontWeight: 700 }}>{s.label}</span>
                    <div className="progress" style={{ height: 10, borderRadius: 99, background: '#F1F5F9' }}>
                      <i style={{ width: `${s.v}%`, background: color, borderRadius: 99 }} />
                    </div>
                    <b style={{ color, fontSize: 15, width: 34, textAlign: 'right', fontWeight: 900 }}>{s.v}</b>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card" style={{ padding: '22px 24px', borderRadius: 20, border: '1px solid #E2E8F0', boxShadow: '0 4px 16px rgba(15, 23, 42, 0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h2 style={{ fontSize: 18, margin: 0, fontWeight: 900 }}>Lịch sử các lần thử</h2>
              <span style={{ fontSize: 12.5, color: 'var(--muted)', fontWeight: 700 }}>{attempts.length} lần ghi âm</span>
            </div>
            <table className="data mt8">
              <thead>
                <tr>
                  <th>Lần thử</th>
                  <th>Điểm tổng</th>
                  <th style={{ textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {attempts.map((a, idx) => {
                  const sc = a.overallScore ?? a.feedback?.overallScore;
                  const isCur = idx === selectedAttemptIdx;
                  return (
                    <tr key={a.id || idx} style={{ background: isCur ? '#F5F3FF' : undefined }}>
                      <td>
                        <b style={{ color: isCur ? 'var(--primary)' : 'inherit' }}>#{a.attemptNumber || idx + 1}</b>
                        {idx === attempts.length - 1 && (
                          <span className="pill" style={{ marginLeft: 8, fontSize: 11, padding: '2px 8px', background: '#DCFCE7', color: '#166534', fontWeight: 800 }}>
                            Mới nhất
                          </span>
                        )}
                      </td>
                      <td>
                        <b style={{ color: 'var(--primary)', fontSize: 15, fontWeight: 900 }}>
                          {sc != null ? `${Math.round(Number(sc))}đ` : '—'}
                        </b>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className={`chip ${isCur ? 'on' : ''}`}
                          style={{ padding: '4px 12px', fontSize: 12, borderRadius: 99 }}
                          onClick={() => setSelectedAttemptIdx(idx)}
                        >
                          {isCur ? 'Đang xem' : 'Xem lại'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* LỜI GÓP Ý TỪ AI: ĐIỂM TỐT, ĐIỂM YẾU, SỬA LỖI */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 18, borderRadius: 20, padding: '24px 28px', border: '1px solid #E2E8F0', boxShadow: '0 4px 16px rgba(15, 23, 42, 0.03)' }}>
        {/* Nhận xét chung của Coach Vi */}
        <div className="coach" style={{ background: 'linear-gradient(135deg, #F5F3FF 0%, #EEF2FF 100%)', border: '1px solid #DDD6FE', borderRadius: 16, padding: '16px 20px' }}>
          <Mascot s={52} />
          <div className="bubble" style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12 }}>
            <b style={{ color: 'var(--primary)', fontSize: 15.5 }}>Nhận xét từ Vi: </b>
            {generalFeedback}
          </div>
        </div>

        {/* Điểm bạn đã làm tốt */}
        {strengths.length > 0 && (
          <div
            style={{
              background: '#F0FDF4',
              border: '1px solid #BBF7D0',
              borderRadius: 14,
              padding: '16px 20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 900, color: '#166534', fontSize: 15, marginBottom: 8 }}>
              <Icon n="check" s={18} />
              <span>Điểm bạn đã làm tốt:</span>
            </div>
            <ul style={{ margin: 0, paddingLeft: 20, color: '#14532d', fontSize: 14.5, lineHeight: 1.7 }}>
              {strengths.map((str, i) => (
                <li key={i}>{str}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Điểm cần lưu ý & cải thiện */}
        {weaknesses.length > 0 && (
          <div
            style={{
              background: '#FFFBEB',
              border: '1px solid #FEF3C7',
              borderRadius: 14,
              padding: '16px 20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 900, color: '#B45309', fontSize: 15, marginBottom: 8 }}>
              <Icon n="bulb" s={18} />
              <span>Điểm cần lưu ý & cải thiện:</span>
            </div>
            <ul style={{ margin: 0, paddingLeft: 20, color: '#78350F', fontSize: 14.5, lineHeight: 1.7 }}>
              {weaknesses.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Chi tiết sửa lỗi */}
        {corrections.length > 0 && (
          <div style={{ marginTop: 6 }}>
            <h3 style={{ fontSize: 16.5, fontWeight: 900, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, color: '#DC2626' }}>
              <Icon n="edit" s={18} />
              Chi tiết sửa lỗi từ AI ({corrections.length} lỗi):
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {corrections.map((cor, i) => (
                <div
                  key={i}
                  style={{
                    border: '1px solid #E2E8F0',
                    borderRadius: 12,
                    padding: '14px 18px',
                    background: '#FFFFFF',
                    boxShadow: '0 2px 8px rgba(15, 23, 42, 0.02)',
                  }}
                >
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginBottom: 6 }}>
                    {cor.errorType && (
                      <span className="pill warn" style={{ fontSize: 11, padding: '3px 10px', borderRadius: 99 }}>
                        {cor.errorType}
                      </span>
                    )}
                    <span style={{ textDecoration: 'line-through', color: '#EF4444', fontWeight: 700 }}>
                      {cor.original}
                    </span>
                    <span style={{ color: 'var(--muted)', fontWeight: 800 }}>→</span>
                    <span style={{ color: '#15803D', fontWeight: 800, background: '#DCFCE7', padding: '3px 10px', borderRadius: 6 }}>
                      {cor.corrected}
                    </span>
                  </div>
                  {cor.explanation && (
                    <div style={{ fontSize: 13.5, color: '#475569', marginTop: 6, lineHeight: 1.5 }}>
                      <b>Giải thích:</b> {cor.explanation}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Gợi ý luyện tập */}
        {suggestions.length > 0 && (
          <div style={{ marginTop: 6 }}>
            <h3 style={{ fontSize: 16.5, fontWeight: 900, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--primary)' }}>
              <Icon n="spark" s={18} />
              Gợi ý cho lần nói tiếp theo:
            </h3>
            <ul style={{ margin: 0, paddingLeft: 20, color: 'var(--ink)', fontSize: 14.5, lineHeight: 1.7 }}>
              {suggestions.map((sug, i) => (
                <li key={i}>{sug}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* CÁC NÚT THAO TÁC */}
      <div className="btn-row" style={{ marginTop: 8 }}>
        <button className="btn" onClick={() => nav('/speaking')}>
          <Icon n="mic" s={20} />
          Luyện thử lại lần #{attempts.length + 1}
        </button>
        <button className="btn ghost" onClick={() => nav('/')}>
          Về trang chủ
        </button>
      </div>
    </div>
  );
}
