import axios from 'axios';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { speakApi, errMsg } from '../api';
import type { SessionDetail, AttemptDetail } from '../api';
import { Icon } from '../components/icons';
import { AnimatedProgressBar, MotionCard } from '../motion';
import { ViMascotImage } from '../components/ViMascotImage';
import { UiIcon } from '../components/UiIcon';
import { ScoreRing, SplitHeading } from '../components/SageEffects';

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
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioErr, setAudioErr] = useState('');

  useEffect(() => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setAudioErr('');
    setAudioLoading(false);
  }, [selectedAttemptIdx]);

  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const handlePlayAudio = async () => {
    if (!state?.sessionId) return;
    const attemptNum = currentAttempt?.attemptNumber || selectedAttemptIdx + 1;
    if (audioUrl) return;
    setAudioLoading(true);
    setAudioErr('');
    try {
      const blob = await speakApi.attemptAudioBlob(state.sessionId, attemptNum);
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
    } catch (e: any) {
      if (axios.isAxiosError(e)) {
        if (e.response?.status === 404) {
          setAudioErr('Bản ghi không còn tồn tại, có thể do server đã khởi động lại (file lưu ở thư mục tạm).');
        } else if (e.response?.status === 403) {
          setAudioErr('Bạn không có quyền nghe bản ghi này.');
        } else {
          setAudioErr('Không tải được bản ghi, thử lại sau.');
        }
      } else {
        setAudioErr('Không tải được bản ghi, thử lại sau.');
      }
    } finally {
      setAudioLoading(false);
    }
  };

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
      <div className="content" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div className="card stack center" style={{ maxWidth: 440, padding: '28px 32px', gap: 12 }}>
          <ViMascotImage pose="listen" size={84} alt="Vi đang chờ bản ghi âm luyện nói của bạn" />
          <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 18, color: 'var(--ink)' }}>
            Chưa có phiên luyện nói nào
          </div>
          <div className="sub">Chọn một chủ đề và thu âm 1–2 phút để Vi AI chấm 5 tiêu chí nhé.</div>
          <button type="button" className="btn" onClick={() => nav('/speaking')}>
            Luyện nói ngay
          </button>
        </div>
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
      <div className="content center">
        <ViMascotImage
          pose="thinking"
          size={76}
          alt="Vi đang tải bảng điểm chi tiết"
        />
        <div className="mt12" style={{ fontWeight: 800, color: 'var(--cream)' }}>
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

  return (
    <div className="content">
      {/* Page Header */}
      <div className="pagehead">
        <div>
          <div className="eyebrow">SPEAKING FEEDBACK · 5 CRITERIA</div>
          <SplitHeading text="Kết quả luyện nói" />
          <p className="sub">
            Chủ đề &ldquo;{d.topic}&rdquo; · Cấp độ {d.level} · Lần thử #{currentAttempt?.attemptNumber || selectedAttemptIdx + 1}
          </p>
        </div>

        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          {attempts.length > 1 && (
            <div className="chips">
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
          <button type="button" className="btn secondary sm" onClick={() => nav('/speaking')}>
            Chọn chủ đề khác
          </button>
          <button type="button" className="btn sm" onClick={() => nav('/speaking')}>
            Nói lại lần nữa
          </button>
        </div>
      </div>

      {/* Viewport-Locked 2-Column Feedback Board */}
      <div className="cols2" style={{ gridTemplateColumns: 'minmax(310px, 410px) minmax(0, 1fr)', flex: 1, minHeight: 0, alignItems: 'stretch' }}>
        {/* Left: ScoreRing + Celebrate/Listen Mascot + 5 Criteria + Coach */}
        <div className="colstack long-list" style={{ gap: 12, paddingRight: 4 }}>
          <MotionCard className="colstack" style={{ gap: 14 }}>
            <div className="row between" style={{ gap: 14 }}>
              <ScoreRing
                value={overallScore}
                label={`${overallScore}/100`}
                size={96}
                accentColor={overallScore >= 80 ? 'var(--success)' : overallScore >= 60 ? 'var(--sage)' : 'var(--amber)'}
              />
              <ViMascotImage
                pose={overallScore >= 65 ? 'celebrate' : 'listen'}
                animated={overallScore >= 75}
                size={92}
                priority
                alt={overallScore >= 65 ? 'Vi ăn mừng kết quả luyện nói của bạn' : 'Vi lắng nghe và khích lệ bạn tiếp tục luyện nói'}
              />
            </div>

            <div className="colstack" style={{ gap: 8 }}>
              <div className="bar-row">
                <span className="lbl">Ngữ pháp</span>
                <div style={{ flex: 1, margin: '0 8px' }}>
                  <AnimatedProgressBar value={grammarScore} />
                </div>
                <b>{grammarScore}</b>
              </div>
              <div className="bar-row">
                <span className="lbl">Từ vựng</span>
                <div style={{ flex: 1, margin: '0 8px' }}>
                  <AnimatedProgressBar value={vocabularyScore} />
                </div>
                <b>{vocabularyScore}</b>
              </div>
              <div className="bar-row">
                <span className="lbl">Trôi chảy</span>
                <div style={{ flex: 1, margin: '0 8px' }}>
                  <AnimatedProgressBar
                    value={fluencyScore}
                    color={fluencyScore < 70 ? 'var(--amber)' : 'var(--sage)'}
                  />
                </div>
                <b>{fluencyScore}</b>
              </div>
              <div className="bar-row">
                <span className="lbl">Nội dung</span>
                <div style={{ flex: 1, margin: '0 8px' }}>
                  <AnimatedProgressBar value={contentScore} />
                </div>
                <b>{contentScore}</b>
              </div>
              <div className="bar-row">
                <span className="lbl">Phát âm</span>
                <div style={{ flex: 1, margin: '0 8px' }}>
                  <AnimatedProgressBar value={pronunciationScore} />
                </div>
                <b>{pronunciationScore}</b>
              </div>
            </div>
          </MotionCard>

          <MotionCard>
            <div className="coach">
              <ViMascotImage
                pose="listen"
                size={48}
                alt="Vi nhận xét chi tiết bài luyện nói"
              />
              <div className="bubble" style={{ fontSize: 13.5, lineHeight: 1.5 }}>
                <b>Nhận xét của Vi:</b> {generalFeedback}
              </div>
            </div>
          </MotionCard>
        </div>

        {/* Right: Transcript + Audio Playback + Strengths/Weaknesses/Corrections */}
        <div className="colstack long-list" style={{ gap: 12, paddingRight: 4 }}>
          <MotionCard>
            <div className="row between" style={{ flexWrap: 'wrap', gap: 10 }}>
              <h2 style={{ fontSize: 16, margin: 0 }}>Bài nói của bạn</h2>
              <div className="row" style={{ gap: 8 }}>
                <span className="pill greensoft">Whisper nghe được</span>
                <button
                  type="button"
                  className="btn secondary sm"
                  onClick={handlePlayAudio}
                  disabled={audioLoading}
                >
                  <Icon n="head" s={15} />
                  {audioLoading ? 'Đang tải audio...' : audioUrl ? 'Đang mở phát' : 'Nghe lại bản ghi'}
                </button>
              </div>
            </div>

            <p
              className="mt8"
              style={{
                fontSize: 15.5,
                lineHeight: 1.6,
                fontWeight: 700,
                color: transcript ? 'var(--ink)' : 'var(--muted)',
                fontStyle: transcript ? 'normal' : 'italic',
                marginBottom: 0,
              }}
            >
              {transcript ? `“${transcript}”` : 'Không nhận diện được nội dung hoặc âm lượng quá nhỏ.'}
            </p>

            {audioUrl && (
              <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(250, 248, 241, 0.72)', borderRadius: 12, border: '1px solid var(--line)' }}>
                <div className="row between" style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--muted)', marginBottom: 6 }}>
                  <span className="row" style={{ gap: 6 }}>
                    <Icon n="vol" s={14} />
                    Bản ghi âm lần thử #{currentAttempt?.attemptNumber || selectedAttemptIdx + 1}
                  </span>
                  <button
                    type="button"
                    className="btn ghost sm"
                    onClick={() => {
                      if (audioUrl) URL.revokeObjectURL(audioUrl);
                      setAudioUrl(null);
                    }}
                  >
                    Đóng ✕
                  </button>
                </div>
                <audio controls autoPlay src={audioUrl} style={{ width: '100%', height: 38, outline: 'none' }} />
              </div>
            )}

            {audioErr && (
              <div className="error row between mt8">
                <span>{audioErr}</span>
                <button type="button" className="btn ghost sm" onClick={handlePlayAudio}>
                  Thử lại
                </button>
              </div>
            )}
          </MotionCard>

          {(strengths.length > 0 || weaknesses.length > 0 || corrections.length > 0 || suggestions.length > 0) && (
            <MotionCard className="colstack" style={{ gap: 10 }}>
              {strengths.length > 0 && (
                <div style={{ padding: '10px 14px', background: 'var(--success-bg)', borderRadius: 12 }}>
                  <b style={{ color: 'var(--green-dark)', display: 'block', marginBottom: 4, fontSize: 13.5 }}>
                    ✓ Điểm bạn đã làm tốt:
                  </b>
                  <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--ink)', fontSize: 13.5, lineHeight: 1.55 }}>
                    {strengths.map((str, i) => (
                      <li key={i}>{str}</li>
                    ))}
                  </ul>
                </div>
              )}

              {weaknesses.length > 0 && (
                <div style={{ padding: '10px 14px', background: 'var(--amber-bg)', borderRadius: 12 }}>
                  <b style={{ color: 'var(--amber-dark)', display: 'block', marginBottom: 4, fontSize: 13.5 }}>
                    <UiIcon name="zap" size={14} /> Cần cải thiện:
                  </b>
                  <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--ink)', fontSize: 13.5, lineHeight: 1.55 }}>
                    {weaknesses.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {corrections.length > 0 && (
                <div className="colstack" style={{ gap: 6 }}>
                  <b style={{ color: 'var(--red-dark)', fontSize: 13.5 }}>
                    Chi tiết lỗi cần sửa ({corrections.length} lỗi):
                  </b>
                  {corrections.map((cor, i) => (
                    <div key={i} className="taskrow" style={{ alignItems: 'flex-start' }}>
                      <span className="tk" style={{ color: 'var(--danger)' }}>
                        <Icon n="x" s={15} />
                      </span>
                      <div style={{ flex: 1, fontSize: 13.5 }}>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                          <span style={{ textDecoration: 'line-through', color: 'var(--red-dark)', fontWeight: 700 }}>{cor.original}</span>
                          <span>→</span>
                          <b style={{ color: 'var(--green-dark)' }}>{cor.corrected}</b>
                          {cor.errorType && <span className="pill warn">{cor.errorType}</span>}
                        </div>
                        {cor.explanation && <div className="tiny muted mt4">{cor.explanation}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {suggestions.length > 0 && (
                <div style={{ padding: '10px 14px', background: 'rgba(71, 96, 63, 0.1)', borderRadius: 12 }}>
                  <b style={{ color: 'var(--sage-dark)', display: 'block', marginBottom: 4, fontSize: 13.5 }}>
                    <UiIcon name="lightbulb" size={14} /> Gợi ý cho lần tới:
                  </b>
                  <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--ink)', fontSize: 13.5, lineHeight: 1.55 }}>
                    {suggestions.map((sug, i) => (
                      <li key={i}>{sug}</li>
                    ))}
                  </ul>
                </div>
              )}
            </MotionCard>
          )}
        </div>
      </div>
    </div>
  );
}
