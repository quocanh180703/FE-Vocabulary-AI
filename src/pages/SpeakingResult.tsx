import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { speakApi, errMsg } from '../api';
import type { SessionDetail, AttemptDetail } from '../api';
import { Icon } from '../components/icons';
import viAvatar from '../assets/vi-3d.webp';

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
        <button type="button" className="btn mt16" onClick={() => nav('/speaking')}>
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
      <div className="content center" style={{ padding: 60 }}>
        <img
          src={viAvatar}
          alt="Vi"
          style={{ width: 64, height: 64, animation: 'float 2s ease-in-out infinite' }}
        />
        <div className="mt16" style={{ fontWeight: 800, color: 'var(--primary)' }}>
          Vi đang tổng hợp kết quả chấm điểm từ AI...
        </div>
      </div>
    );
  }

  const attempts: AttemptDetail[] = Array.isArray(d.attempts) && d.attempts.length > 0 ? d.attempts : [];
  const currentAttempt: AttemptDetail | null = attempts[selectedAttemptIdx] || attempts[attempts.length - 1] || null;

  const fb = currentAttempt?.feedback || d.feedback || state?.latestResult?.feedback || {};
  const scoresObj = state?.latestResult?.scores || {};

  const grammarScore = Math.round(Number(fb.grammarScore ?? scoresObj.grammarScore ?? 72));
  const vocabularyScore = Math.round(Number(fb.vocabularyScore ?? scoresObj.vocabularyScore ?? 80));
  const fluencyScore = Math.round(Number(fb.fluencyScore ?? scoresObj.fluencyScore ?? 65));
  const contentScore = Math.round(Number(fb.contentScore ?? scoresObj.contentScore ?? 78));
  const pronunciationScore = Math.round(Number(fb.pronunciationScore ?? scoresObj.pronunciationScore ?? 70));

  const overallScore = Math.round(
    Number(
      currentAttempt?.overallScore ??
        fb.overallScore ??
        scoresObj.overallScore ??
        d.overallScore ??
        Math.round((grammarScore + vocabularyScore + fluencyScore + contentScore + pronunciationScore) / 5)
    )
  );

  const transcript = currentAttempt?.transcript || state?.latestResult?.attempt?.transcript || '';
  const generalFeedback =
    fb.feedback ||
    state?.latestResult?.feedback?.feedback ||
    'Nội dung bài nói rõ ràng, từ vựng dùng tốt. Lần tới hãy ngắt theo cụm ý để câu nói tự nhiên hơn nhé!';

  const strengths = parseList(fb.strengths || state?.latestResult?.feedback?.strengths);
  const weaknesses = parseList(fb.weaknesses || state?.latestResult?.feedback?.weaknesses);
  const suggestions = parseList(fb.suggestions || state?.latestResult?.feedback?.suggestions);
  const corrections = parseCorrections(fb.corrections || state?.latestResult?.feedback?.corrections);

  // SVG circular score ring: radius=74 -> circumference = 2*pi*74 ≈ 465
  const circumference = 465;
  const strokeDashoffset = circumference - (circumference * overallScore) / 100;

  return (
    <div className="content" style={{ maxWidth: 920 }}>
      {/* Page Header */}
      <div className="pagehead">
        <h1>Kết quả luyện nói</h1>
        <div className="sub">
          Chủ đề &ldquo;{d.topic}&rdquo; · Cấp độ {d.level} · Lần thử #{currentAttempt?.attemptNumber || selectedAttemptIdx + 1}
        </div>
      </div>

      {/* Attempts selector if multiple */}
      {attempts.length > 1 && (
        <div className="chiprow">
          <span style={{ fontWeight: 800, fontSize: 13, color: 'var(--muted)', alignSelf: 'center' }}>
            Lần thử:
          </span>
          {attempts.map((a, idx) => {
            const isSelected = idx === selectedAttemptIdx;
            const sc = a.overallScore ?? a.feedback?.overallScore;
            return (
              <button
                key={a.id || idx}
                type="button"
                className={`fchip ${isSelected ? 'on' : ''}`}
                onClick={() => setSelectedAttemptIdx(idx)}
              >
                Lần #{a.attemptNumber || idx + 1}
                {sc != null && ` (${Math.round(Number(sc))}đ)`}
              </button>
            );
          })}
        </div>
      )}

      {/* Overall Score & 5 Criteria Card */}
      <div className="card" style={{ display: 'flex', gap: 30, alignItems: 'center', flexWrap: 'wrap' }}>
        <div className="scorering">
          <svg width="168" height="168" viewBox="0 0 168 168">
            <circle cx="84" cy="84" r="74" fill="none" stroke="#E7EEF6" strokeWidth="13" />
            <circle
              cx="84"
              cy="84"
              r="74"
              fill="none"
              stroke="var(--primary)"
              strokeWidth="13"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              transform="rotate(-90 84 84)"
              style={{ transition: 'stroke-dashoffset 1s ease' }}
            />
          </svg>
          <div className="sc">
            <b>{overallScore}</b>
            <span>/ 100 ĐIỂM</span>
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 280 }}>
          <div className="bar-row">
            <span className="lbl">Ngữ pháp</span>
            <div className="progress">
              <i style={{ width: `${grammarScore}%` }} />
            </div>
            <b>{grammarScore}</b>
          </div>

          <div className="bar-row">
            <span className="lbl">Từ vựng</span>
            <div className="progress">
              <i style={{ width: `${vocabularyScore}%` }} />
            </div>
            <b>{vocabularyScore}</b>
          </div>

          <div className="bar-row">
            <span className="lbl">Trôi chảy</span>
            <div className="progress">
              <i
                style={{
                  width: `${fluencyScore}%`,
                  background: fluencyScore < 70 ? 'var(--yellow)' : 'var(--primary)',
                }}
              />
            </div>
            <b>{fluencyScore}</b>
          </div>

          <div className="bar-row">
            <span className="lbl">Nội dung</span>
            <div className="progress">
              <i style={{ width: `${contentScore}%` }} />
            </div>
            <b>{contentScore}</b>
          </div>

          <div className="bar-row">
            <span className="lbl">Phát âm</span>
            <div className="progress">
              <i style={{ width: `${pronunciationScore}%` }} />
            </div>
            <b>{pronunciationScore}</b>
          </div>
        </div>
      </div>

      {/* Transcript Card */}
      <div className="card">
        <div className="row">
          <h2>
            <span className="dot" />
            Bài nói của bạn
          </h2>
          <span className="pill greensoft">Whisper nghe được</span>
        </div>
        <p
          className="mt8"
          style={{
            fontSize: 16.5,
            lineHeight: 1.65,
            fontWeight: 700,
            color: transcript ? '#33475C' : 'var(--muted)',
            fontStyle: transcript ? 'normal' : 'italic',
          }}
        >
          {transcript ? `“${transcript}”` : 'Không nhận diện được nội dung hoặc âm lượng quá nhỏ.'}
        </p>
      </div>

      {/* Vi Coach Feedback Card */}
      <div className="card">
        <div className="coach">
          <img src={viAvatar} alt="Vi" />
          <div className="bubble">
            <b>Nhận xét của Vi:</b> {generalFeedback}
          </div>
        </div>

        {/* Strengths / Weaknesses / Corrections */}
        {(strengths.length > 0 || weaknesses.length > 0 || corrections.length > 0) && (
          <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {strengths.length > 0 && (
              <div style={{ padding: '12px 16px', background: 'var(--green-bg)', borderRadius: 14 }}>
                <b style={{ color: 'var(--green-dark)', display: 'block', marginBottom: 6 }}>
                  ✓ Điểm bạn đã làm tốt:
                </b>
                <ul style={{ margin: 0, paddingLeft: 20, color: 'var(--ink)', fontSize: 14, lineHeight: 1.6 }}>
                  {strengths.map((str, i) => (
                    <li key={i}>{str}</li>
                  ))}
                </ul>
              </div>
            )}

            {weaknesses.length > 0 && (
              <div style={{ padding: '12px 16px', background: 'var(--yellow-bg)', borderRadius: 14 }}>
                <b style={{ color: 'var(--yellow-dark)', display: 'block', marginBottom: 6 }}>
                  ⚡ Cần cải thiện:
                </b>
                <ul style={{ margin: 0, paddingLeft: 20, color: 'var(--ink)', fontSize: 14, lineHeight: 1.6 }}>
                  {weaknesses.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            {corrections.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <b style={{ color: 'var(--red-dark)', fontSize: 14.5 }}>
                  Chi tiết lỗi cần sửa ({corrections.length} lỗi):
                </b>
                {corrections.map((cor, i) => (
                  <div key={i} className="taskrow" style={{ alignItems: 'flex-start' }}>
                    <span className="tk" style={{ color: 'var(--red)' }}>
                      <Icon n="x" s={16} />
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ textDecoration: 'line-through', color: 'var(--red)', fontWeight: 800 }}>
                          {cor.original}
                        </span>
                        <span>→</span>
                        <span style={{ color: 'var(--green-dark)', fontWeight: 800 }}>
                          {cor.corrected}
                        </span>
                        {cor.errorType && <span className="pill warn">{cor.errorType}</span>}
                      </div>
                      {cor.explanation && (
                        <div className="sub mt8" style={{ fontSize: 13, color: 'var(--ink)' }}>
                          {cor.explanation}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {suggestions.length > 0 && (
              <div style={{ padding: '12px 16px', background: 'var(--tint)', borderRadius: 14 }}>
                <b style={{ color: 'var(--primary-dark)', display: 'block', marginBottom: 6 }}>
                  💡 Gợi ý cho lần tới:
                </b>
                <ul style={{ margin: 0, paddingLeft: 20, color: 'var(--ink)', fontSize: 14, lineHeight: 1.6 }}>
                  {suggestions.map((sug, i) => (
                    <li key={i}>{sug}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="btn-row mt16">
          <button type="button" className="btn ghost" onClick={() => nav('/speaking')}>
            Chọn chủ đề khác
          </button>
          <button type="button" className="btn" onClick={() => nav('/speaking')}>
            Nói lại lần nữa
          </button>
        </div>
      </div>
    </div>
  );
}
