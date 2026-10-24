import { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { quizApi, aiApi } from '../api';
import type { QuizResult as R, QuizAttemptAnswerDetail, QuizDetail } from '../api';
import viAvatar from '../assets/vi-3d.webp';
import { Icon } from '../components/icons';

interface LocationState {
  result: R;
  title?: string;
  attemptId?: number;
  quiz?: QuizDetail;
  userAnswers?: Record<number, number>;
}

interface ReviewQuestionItem extends QuizAttemptAnswerDetail {
  questionNumber: number;
}

// Helper to determine if a question is answered correctly
function isQuestionCorrect(item: {
  isCorrect?: any;
  correct?: any;
  selectedAnswer?: any;
  correctAnswer?: any;
}): boolean {
  if (item.isCorrect === true || item.isCorrect === 1 || item.isCorrect === 'true') return true;
  if (item.isCorrect === false || item.isCorrect === 0 || item.isCorrect === 'false') return false;
  if (item.correct === true || item.correct === 1 || item.correct === 'true') return true;
  if (item.correct === false || item.correct === 0 || item.correct === 'false') return false;
  if (
    item.selectedAnswer !== undefined &&
    item.selectedAnswer !== null &&
    item.correctAnswer !== undefined &&
    item.correctAnswer !== null
  ) {
    return Number(item.selectedAnswer) === Number(item.correctAnswer);
  }
  return false;
}

// Inline Markdown Formatter to eliminate raw asterisks, bullets and format cleanly
function FormattedInline({ text, boldColor }: { text: string; boldColor?: string }) {
  // Strip leading bullet characters: - , * , •
  const cleanLine = text.replace(/^[-*•]\s*/, '').trim();
  const parts = [];
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(cleanLine)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={key++}>{cleanLine.slice(lastIndex, match.index)}</span>);
    }
    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(
        <strong key={key++} style={{ fontWeight: 800, color: boldColor || 'inherit' }}>
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      parts.push(
        <em key={key++} style={{ fontStyle: 'italic', fontWeight: 600 }}>
          {token.slice(1, -1)}
        </em>
      );
    } else if (token.startsWith('`') && token.endsWith('`')) {
      parts.push(
        <code
          key={key++}
          style={{
            background: 'rgba(0, 0, 0, 0.06)',
            padding: '2px 6px',
            borderRadius: 6,
            fontSize: '0.92em',
            fontFamily: 'inherit',
            fontWeight: 700,
          }}
        >
          {token.slice(1, -1)}
        </code>
      );
    }
    lastIndex = match.index + token.length;
  }
  if (lastIndex < cleanLine.length) {
    parts.push(<span key={key++}>{cleanLine.slice(lastIndex)}</span>);
  }

  return <>{parts}</>;
}

// Parse AI feedback into 3 clean, visually distinct cards
interface AiSection {
  type: 'correct' | 'wrong' | 'tip' | 'general';
  title: string;
  items: string[];
}

function parseAiSections(rawText: string): AiSection[] {
  const lines = rawText.split('\n');
  const sections: AiSection[] = [];
  let cur: AiSection | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line === '---' || line === '***') continue;

    // Detect section header: e.g. "**1. 💡 Vì sao...", "### 2. ⚠️...", "1. ...", "💡 Vì sao..."
    const isHeading =
      /(?:^(?:#{1,3}\s*)?\*{0,2}\s*[123]\.|\b[123]\.\s*[💡⚠️🎯]|^[💡⚠️🎯])/.test(line) &&
      line.length < 120;

    if (isHeading) {
      if (cur) sections.push(cur);
      let type: AiSection['type'] = 'general';
      if (/1\.|💡|đúng|chính xác|correct/i.test(line)) type = 'correct';
      else if (/2\.|⚠️|sai|chưa|lỗi|wrong|bẫy/i.test(line)) type = 'wrong';
      else if (/3\.|🎯|mẹo|ghi nhớ|công thức|tip|lưu ý/i.test(line)) type = 'tip';

      const cleanTitle = line
        .replace(/^(?:#{1,3}\s*)?\*{0,2}\s*[123]\.\s*/, '')
        .replace(/\*\*/g, '')
        .replace(/^#+\s*/, '')
        .trim();

      cur = { type, title: cleanTitle, items: [] };
    } else {
      if (!cur) {
        cur = { type: 'general', title: '💡 Phân tích câu hỏi', items: [] };
      }
      cur.items.push(line);
    }
  }
  if (cur) sections.push(cur);
  return sections;
}

// Component rendering clean, card-based AI analysis
function AiExplanationCardView({ text }: { text: string }) {
  const sections = parseAiSections(text);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 14 }}>
      {sections.map((sec, sIdx) => {
        let bg = '#F8FAFC';
        let border = '1.5px solid #E2E8F0';
        let headerColor = '#1E293B';
        let boldColor = '#0F172A';
        let bulletIcon = '•';
        let iconBg = '#E2E8F0';
        let badgeIcon = '💡';

        if (sec.type === 'correct') {
          bg = '#F0FDF4';
          border = '1.5px solid #86EFAC';
          headerColor = '#15803D';
          boldColor = '#14532D';
          bulletIcon = '✓';
          iconBg = '#DCFCE7';
          badgeIcon = '💡';
        } else if (sec.type === 'wrong') {
          bg = '#FFFBEB';
          border = '1.5px solid #FCD34D';
          headerColor = '#B45309';
          boldColor = '#78350F';
          bulletIcon = '✕';
          iconBg = '#FEF3C7';
          badgeIcon = '⚠️';
        } else if (sec.type === 'tip') {
          bg = '#F5F3FF';
          border = '1.5px solid #C4B5FD';
          headerColor = '#6D28D9';
          boldColor = '#4C1D95';
          bulletIcon = '★';
          iconBg = '#EDE9FE';
          badgeIcon = '🎯';
        }

        return (
          <div
            key={sIdx}
            style={{
              background: bg,
              border,
              borderRadius: 14,
              padding: '15px 18px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 15,
                fontWeight: 800,
                color: headerColor,
                marginBottom: sec.items.length > 0 ? 10 : 0,
              }}
            >
              <span>{badgeIcon}</span>
              <span>{sec.title}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {sec.items.map((itemLine, lIdx) => (
                <div
                  key={lIdx}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    fontSize: 14.2,
                    lineHeight: 1.65,
                    color: '#334155',
                  }}
                >
                  <span
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      background: iconBg,
                      color: headerColor,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                      fontWeight: 900,
                      flexShrink: 0,
                      marginTop: 2.5,
                    }}
                  >
                    {bulletIcon}
                  </span>
                  <div style={{ flex: 1 }}>
                    <FormattedInline text={itemLine} boldColor={boldColor} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function QuizResult() {
  const { id } = useParams();
  const { state: navState } = useLocation() as { state?: LocationState };
  const nav = useNavigate();

  // Support restoring result state on page refresh
  const [effectiveState, setEffectiveState] = useState<LocationState | undefined>(() => {
    if (navState?.result) {
      if (id) sessionStorage.setItem(`quiz_result_${id}`, JSON.stringify(navState));
      return navState;
    }
    if (id) {
      try {
        const saved = sessionStorage.getItem(`quiz_result_${id}`);
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return undefined;
  });

  const r = effectiveState?.result;

  const [attemptDetails, setAttemptDetails] = useState<ReviewQuestionItem[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [filterMode, setFilterMode] = useState<'ALL' | 'WRONG' | 'CORRECT'>('ALL');

  // AI explanation state per question: { [questionId]: { loading: boolean, text?: string, error?: string } }
  const [aiExplanations, setAiExplanations] = useState<
    Record<number, { loading: boolean; text?: string; error?: string }>
  >({});

  useEffect(() => {
    if (navState?.result) {
      setEffectiveState(navState);
      if (id) sessionStorage.setItem(`quiz_result_${id}`, JSON.stringify(navState));
    }
  }, [navState, id]);

  useEffect(() => {
    const attemptId = r?.attemptId || effectiveState?.attemptId;
    if (attemptId) {
      setLoadingDetails(true);
      quizApi
        .getAttemptDetails(attemptId)
        .then(({ data }) => {
          if (data?.answers && data.answers.length > 0) {
            const mapped: ReviewQuestionItem[] = data.answers.map((a: any, index: number) => {
              let qNum = index + 1;
              if (effectiveState?.quiz?.questions && Array.isArray(effectiveState.quiz.questions)) {
                const foundIdx = effectiveState.quiz.questions.findIndex(
                  (q: any) => Number(q.id) === Number(a.questionId)
                );
                if (foundIdx !== -1) {
                  qNum = foundIdx + 1;
                }
              }
              return {
                ...a,
                questionNumber: qNum,
                isCorrect: isQuestionCorrect(a),
              };
            });
            // Ensure sequential ordering by original exam question number
            mapped.sort((x, y) => x.questionNumber - y.questionNumber);
            setAttemptDetails(mapped);
          }
        })
        .catch((err) => {
          console.warn('Failed to fetch attempt details via API', err);
        })
        .finally(() => {
          setLoadingDetails(false);
        });
    }
  }, [r?.attemptId, effectiveState?.attemptId]);

  if (!r) {
    return (
      <div className="content" style={{ maxWidth: 860, textAlign: 'center', paddingTop: 80 }}>
        <div className="sub">Không có kết quả để hiển thị.</div>
        <button className="btn mt16" onClick={() => nav('/quiz')}>
          Về danh sách quiz
        </button>
      </div>
    );
  }

  const pct =
    r.totalQuestions > 0
      ? Math.round((r.correctAnswers / r.totalQuestions) * 100)
      : Math.round(r.score || 0);
  const strokeColor = pct >= 80 ? '#1E7E46' : pct >= 50 ? 'var(--primary)' : 'var(--red)';

  const wrongAnswers = attemptDetails.filter((a) => !a.isCorrect);
  const correctAnswers = attemptDetails.filter((a) => a.isCorrect);

  const wrongCount = attemptDetails.length > 0
    ? wrongAnswers.length
    : r.totalQuestions - r.correctAnswers;
  const correctCount = attemptDetails.length > 0
    ? correctAnswers.length
    : r.correctAnswers;

  const displayedAnswers =
    filterMode === 'WRONG'
      ? wrongAnswers
      : filterMode === 'CORRECT'
      ? correctAnswers
      : attemptDetails;

  const requestAiExplanation = async (item: ReviewQuestionItem) => {
    if (aiExplanations[item.questionId]?.loading) return;

    setAiExplanations((prev) => ({
      ...prev,
      [item.questionId]: { loading: true },
    }));

    try {
      const res = await aiApi.explainQuizQuestion({
        questionContent: item.content,
        options: item.options || [],
        selectedAnswerIndex: item.selectedAnswer,
        correctAnswerIndex: item.correctAnswer,
        presetExplanation: item.explanation,
      });

      setAiExplanations((prev) => ({
        ...prev,
        [item.questionId]: { loading: false, text: res.explanation },
      }));
    } catch {
      setAiExplanations((prev) => ({
        ...prev,
        [item.questionId]: {
          loading: false,
          error: 'Không thể kết nối đến trợ lý AI lúc này. Vui lòng tham khảo giải thích mặc định bên trên nhé.',
        },
      }));
    }
  };

  const scrollToReview = (mode: 'ALL' | 'WRONG' | 'CORRECT') => {
    setFilterMode(mode);
    setTimeout(() => {
      document.getElementById('questions-review-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  return (
    <div className="content" style={{ maxWidth: 860, paddingBottom: 60 }}>
      {/* Top Page Header */}
      <div className="pagehead">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <button
            onClick={() => nav('/quiz')}
            className="sub"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--primary)',
              fontSize: 14,
              fontWeight: 800,
              cursor: 'pointer',
              padding: 0,
            }}
          >
            ← Danh sách bài quiz
          </button>
        </div>
        <h1>Kết quả: {effectiveState?.title || 'Trắc nghiệm'}</h1>
        <div className="sub">
          {pct >= 80
            ? 'Xuất sắc! Bạn nắm rất vững kiến thức bài học.'
            : pct >= 50
            ? 'Khá tốt! Hãy ôn lại các từ chưa đúng để đạt điểm tuyệt đối nhé.'
            : 'Cần cố gắng thêm! Xem lại đáp án bên dưới nhé.'}
        </div>
      </div>

      {/* Score Summary Card */}
      <div className="card" style={{ textAlign: 'center', padding: '34px 20px', borderRadius: 20 }}>
        <div style={{ position: 'relative', width: 190, margin: '0 auto' }}>
          <svg width="190" height="190" viewBox="0 0 190 190">
            <circle cx="95" cy="95" r="80" fill="none" stroke="#E7EEF5" strokeWidth="15" />
            <circle
              cx="95"
              cy="95"
              r="80"
              fill="none"
              stroke={strokeColor}
              strokeWidth="15"
              strokeLinecap="round"
              strokeDasharray="502.6"
              strokeDashoffset={502.6 * (1 - pct / 100)}
              transform="rotate(-90 95 95)"
              style={{ transition: 'stroke-dashoffset 0.8s ease' }}
            />
          </svg>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span style={{ fontSize: 43, fontWeight: 900 }}>{pct}%</span>
            <span className="sub">
              {r.correctAnswers}/{r.totalQuestions} câu đúng
            </span>
          </div>
        </div>

        <p className="mt16" style={{ fontWeight: 800, fontSize: 17 }}>
          Bạn đã trả lời đúng <b>{r.correctAnswers}/{r.totalQuestions}</b> câu trắc nghiệm · Đạt{' '}
          <b>{r.score ?? pct} điểm</b>
        </p>

        {/* 2 Clickable Interactive Cards for "Câu làm đúng" and "Câu làm sai" */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 14,
            maxWidth: 540,
            margin: '22px auto 14px',
          }}
        >
          {/* Card Câu làm đúng */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => scrollToReview('CORRECT')}
            style={{
              cursor: 'pointer',
              padding: '16px 20px',
              borderRadius: 16,
              background: filterMode === 'CORRECT' ? '#ECFDF5' : '#F8FAFC',
              border: `2px solid ${filterMode === 'CORRECT' ? '#10B981' : '#E2E8F0'}`,
              boxShadow:
                filterMode === 'CORRECT'
                  ? '0 6px 18px rgba(16, 185, 129, 0.2)'
                  : '0 2px 8px rgba(0, 0, 0, 0.03)',
              transition: 'all 0.2s ease',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 13.5,
                  fontWeight: 800,
                  color: '#047857',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span>✅</span> Câu làm đúng
              </div>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#065F46', marginTop: 4 }}>
                {correctCount} <span style={{ fontSize: 14, fontWeight: 600 }}>câu</span>
              </div>
              <div style={{ fontSize: 12, color: '#059669', marginTop: 2, fontWeight: 700 }}>
                {filterMode === 'CORRECT' ? '● Đang hiển thị' : 'Nhấp xem danh sách →'}
              </div>
            </div>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: '#D1FAE5',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
                fontWeight: 900,
              }}
            >
              ✓
            </div>
          </div>

          {/* Card Câu làm sai */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => scrollToReview('WRONG')}
            style={{
              cursor: 'pointer',
              padding: '16px 20px',
              borderRadius: 16,
              background: filterMode === 'WRONG' ? '#FEF2F2' : '#F8FAFC',
              border: `2px solid ${filterMode === 'WRONG' ? '#EF4444' : '#E2E8F0'}`,
              boxShadow:
                filterMode === 'WRONG'
                  ? '0 6px 18px rgba(239, 68, 68, 0.2)'
                  : '0 2px 8px rgba(0, 0, 0, 0.03)',
              transition: 'all 0.2s ease',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 13.5,
                  fontWeight: 800,
                  color: '#B91C1C',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span>❌</span> Câu làm sai
              </div>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#991B1B', marginTop: 4 }}>
                {wrongCount} <span style={{ fontSize: 14, fontWeight: 600 }}>câu</span>
              </div>
              <div style={{ fontSize: 12, color: '#DC2626', marginTop: 2, fontWeight: 700 }}>
                {filterMode === 'WRONG' ? '● Đang hiển thị' : 'Nhấp xem & phân tích AI →'}
              </div>
            </div>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: '#FEE2E2',
                color: '#DC2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
                fontWeight: 900,
              }}
            >
              ✕
            </div>
          </div>
        </div>

        <div className="btn-row mt16" style={{ justifyContent: 'center', gap: 12 }}>
          <button
            className="btn ghost"
            style={{ minHeight: 48, padding: '0 24px', fontWeight: 700 }}
            onClick={() => nav('/quiz')}
          >
            Về danh sách quiz
          </button>
          <button
            className="btn"
            style={{ minHeight: 48, padding: '0 24px', fontWeight: 700 }}
            onClick={() => nav(`/quiz/${id}`)}
          >
            Làm lại bài này
          </button>
        </div>
      </div>

      {/* Vi AI Coach Feedback Box */}
      {r.feedback && (
        <div
          className="card mt16"
          style={{
            background: 'linear-gradient(135deg, #F0FDF4 0%, #E0F2FE 100%)',
            border: '1px solid #BAE6FD',
            borderRadius: 16,
            padding: '16px 20px',
          }}
        >
          <div className="coach" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <img
              src={viAvatar}
              alt="Vi"
              style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                objectFit: 'cover',
                border: '2px solid #38BDF8',
              }}
            />
            <div className="bubble" style={{ fontSize: 14.5, color: '#0F172A', lineHeight: 1.5 }}>
              <b style={{ color: 'var(--primary)' }}>Nhận xét từ Vi AI:</b> {r.feedback}
            </div>
          </div>
        </div>
      )}

      {/* Detailed Question Review & Answers Section */}
      <div id="questions-review-section" style={{ marginTop: 36 }}>
        <div style={{ marginBottom: 18 }}>
          <h2 style={{ fontSize: 20, margin: '0 0 6px 0', fontWeight: 900, color: 'var(--text-main)' }}>
            📋 Xem lại bài thi & Đáp án chi tiết
          </h2>
          <div className="sub">
            Chọn một trong các mục bên dưới để lọc chính xác các câu làm sai hoặc làm đúng.
          </div>
        </div>

        {/* High-visibility Segmented Tab Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: '#F1F5F9',
            padding: 6,
            borderRadius: 14,
            marginBottom: 20,
            flexWrap: 'wrap',
          }}
        >
          <button
            type="button"
            onClick={() => setFilterMode('ALL')}
            style={{
              flex: '1 1 140px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '10px 18px',
              borderRadius: 10,
              border: 'none',
              background: filterMode === 'ALL' ? '#FFFFFF' : 'transparent',
              color: filterMode === 'ALL' ? 'var(--primary)' : '#64748B',
              fontWeight: 800,
              fontSize: 14,
              cursor: 'pointer',
              boxShadow: filterMode === 'ALL' ? '0 2px 8px rgba(0, 0, 0, 0.08)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            📋 Tất cả câu hỏi
            <span
              style={{
                fontSize: 12,
                padding: '2px 8px',
                borderRadius: 99,
                background: filterMode === 'ALL' ? 'var(--primary)' : '#CBD5E1',
                color: filterMode === 'ALL' ? '#fff' : '#475569',
              }}
            >
              {attemptDetails.length || r.totalQuestions}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterMode('WRONG')}
            style={{
              flex: '1 1 140px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '10px 18px',
              borderRadius: 10,
              border: 'none',
              background: filterMode === 'WRONG' ? '#EF4444' : 'transparent',
              color: filterMode === 'WRONG' ? '#FFFFFF' : '#DC2626',
              fontWeight: 800,
              fontSize: 14,
              cursor: 'pointer',
              boxShadow: filterMode === 'WRONG' ? '0 4px 12px rgba(239, 68, 68, 0.25)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            ❌ Câu làm sai
            <span
              style={{
                fontSize: 12,
                padding: '2px 8px',
                borderRadius: 99,
                background: filterMode === 'WRONG' ? '#991B1B' : '#FEE2E2',
                color: filterMode === 'WRONG' ? '#FFFFFF' : '#DC2626',
              }}
            >
              {wrongCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterMode('CORRECT')}
            style={{
              flex: '1 1 140px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '10px 18px',
              borderRadius: 10,
              border: 'none',
              background: filterMode === 'CORRECT' ? '#16A34A' : 'transparent',
              color: filterMode === 'CORRECT' ? '#FFFFFF' : '#16A34A',
              fontWeight: 800,
              fontSize: 14,
              cursor: 'pointer',
              boxShadow: filterMode === 'CORRECT' ? '0 4px 12px rgba(22, 163, 74, 0.25)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            ✅ Câu làm đúng
            <span
              style={{
                fontSize: 12,
                padding: '2px 8px',
                borderRadius: 99,
                background: filterMode === 'CORRECT' ? '#14532D' : '#DCFCE7',
                color: filterMode === 'CORRECT' ? '#FFFFFF' : '#15803D',
              }}
            >
              {correctCount}
            </span>
          </button>
        </div>

        {/* Informative Banner based on Active Tab */}
        {filterMode === 'WRONG' && (
          <div
            style={{
              padding: '14px 18px',
              background: '#FEF2F2',
              border: '1.5px solid #FECACA',
              borderRadius: 12,
              marginBottom: 18,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              color: '#991B1B',
              fontSize: 14.5,
              fontWeight: 700,
            }}
          >
            <span style={{ fontSize: 18 }}>🎯</span>
            <span>
              Đang hiển thị <b>{wrongCount} câu trả lời sai</b>. Hãy đọc kỹ phần giải thích và bấm nút
              nhờ Vi AI phân tích để khắc phục lỗi triệt để nhé!
            </span>
          </div>
        )}

        {filterMode === 'CORRECT' && (
          <div
            style={{
              padding: '14px 18px',
              background: '#F0FDF4',
              border: '1.5px solid #BBF7D0',
              borderRadius: 12,
              marginBottom: 18,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              color: '#166534',
              fontSize: 14.5,
              fontWeight: 700,
            }}
          >
            <span style={{ fontSize: 18 }}>🎉</span>
            <span>
              Đang hiển thị <b>{correctCount} câu bạn đã trả lời đúng</b>. Rất xuất sắc!
            </span>
          </div>
        )}

        {loadingDetails && (
          <div className="card" style={{ padding: 24, textAlign: 'center' }}>
            <div className="loading">Đang tải chi tiết đáp án câu hỏi...</div>
          </div>
        )}

        {!loadingDetails && displayedAnswers.length === 0 && (
          <div className="card" style={{ padding: 36, textAlign: 'center', borderRadius: 16 }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>
              {filterMode === 'WRONG' ? '🎉' : '📂'}
            </div>
            <div style={{ fontWeight: 800, fontSize: 16.5, color: 'var(--text-main)' }}>
              {filterMode === 'WRONG'
                ? 'Tuyệt vời! Bạn không làm sai câu nào trong bài thi này!'
                : 'Không có câu hỏi nào trong danh mục này.'}
            </div>
            <button
              type="button"
              className="btn ghost sm mt16"
              onClick={() => setFilterMode('ALL')}
            >
              Xem lại tất cả câu hỏi
            </button>
          </div>
        )}

        {/* Question Cards List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {displayedAnswers.map((item) => {
            const isWrong = !item.isCorrect;
            const aiState = aiExplanations[item.questionId];

            return (
              <div
                key={item.questionId}
                className="card"
                style={{
                  padding: 24,
                  borderRadius: 16,
                  border: isWrong ? '1.5px solid #FCA5A5' : '1px solid #BBF7D0',
                  boxShadow: isWrong
                    ? '0 6px 18px rgba(239, 68, 68, 0.06)'
                    : '0 4px 14px rgba(34, 197, 94, 0.04)',
                }}
              >
                {/* Question Header */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    marginBottom: 14,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 900,
                        padding: '4px 12px',
                        borderRadius: 8,
                        background: isWrong ? '#FEE2E2' : '#DCFCE7',
                        color: isWrong ? '#DC2626' : '#16A34A',
                        border: `1px solid ${isWrong ? '#FCA5A5' : '#86EFAC'}`,
                      }}
                    >
                      Câu {item.questionNumber}
                    </span>
                    <span
                      style={{
                        fontSize: 12.5,
                        fontWeight: 800,
                        padding: '3px 12px',
                        borderRadius: 99,
                        background: isWrong ? '#EF4444' : '#16A34A',
                        color: '#fff',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                      }}
                    >
                      {isWrong ? '✕ Trả lời sai' : '✓ Trả lời đúng'}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <h3
                  style={{
                    fontSize: 17.5,
                    margin: '0 0 16px 0',
                    lineHeight: 1.55,
                    color: 'var(--text-main)',
                    fontWeight: 700,
                  }}
                >
                  {item.content}
                </h3>

                {/* Options Review List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {(item.options || []).map((opt, oi) => {
                    const isUserChoice = item.selectedAnswer === oi;
                    const isCorrect = item.correctAnswer === oi;

                    let bg = '#F8FAFC';
                    let borderColor = '#E2E8F0';
                    let textColor = 'var(--text-main)';
                    let badgeText = '';
                    let badgeBg = '';

                    if (isCorrect) {
                      bg = '#F0FDF4';
                      borderColor = '#22C55E';
                      textColor = '#14532D';
                      badgeText = isUserChoice ? '✓ Bạn chọn đúng' : '✓ Đáp án đúng';
                      badgeBg = '#16A34A';
                    } else if (isUserChoice) {
                      bg = '#FEF2F2';
                      borderColor = '#EF4444';
                      textColor = '#7F1D1D';
                      badgeText = '✕ Bạn đã chọn';
                      badgeBg = '#DC2626';
                    }

                    return (
                      <div
                        key={oi}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 18px',
                          borderRadius: 12,
                          background: bg,
                          border: `1.5px solid ${borderColor}`,
                          color: textColor,
                          fontSize: 15,
                          fontWeight: isCorrect || isUserChoice ? 700 : 500,
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span
                            style={{
                              width: 26,
                              height: 26,
                              borderRadius: '50%',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 12.5,
                              fontWeight: 900,
                              background: isCorrect
                                ? '#22C55E'
                                : isUserChoice
                                ? '#EF4444'
                                : '#CBD5E1',
                              color: '#fff',
                            }}
                          >
                            {'ABCD'[oi]}
                          </span>
                          <span>{opt}</span>
                        </div>

                        {badgeText && (
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 800,
                              color: '#fff',
                              background: badgeBg,
                              padding: '4px 12px',
                              borderRadius: 99,
                            }}
                          >
                            {badgeText}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Preset Explanation */}
                {item.explanation && (
                  <div
                    style={{
                      marginTop: 14,
                      padding: '13px 18px',
                      background: isWrong ? '#FFFBEB' : '#F0FDF4',
                      border: `1px solid ${isWrong ? '#FDE68A' : '#BBF7D0'}`,
                      borderRadius: 12,
                      fontSize: 14.2,
                      lineHeight: 1.6,
                      color: isWrong ? '#92400E' : '#166534',
                    }}
                  >
                    <b style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      💡 Giải thích gốc:
                    </b>{' '}
                    {item.explanation}
                  </div>
                )}

                {/* AI Explanation Area */}
                <div style={{ marginTop: 16 }}>
                  {!aiState?.text && !aiState?.loading && (
                    <button
                      type="button"
                      onClick={() => requestAiExplanation(item)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '10px 18px',
                        borderRadius: 12,
                        border: '1.5px solid var(--primary)',
                        background: isWrong ? '#EEF2FF' : '#F8FAFC',
                        color: 'var(--primary)',
                        fontWeight: 800,
                        fontSize: 13.5,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--primary)';
                        e.currentTarget.style.color = '#fff';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = isWrong ? '#EEF2FF' : '#F8FAFC';
                        e.currentTarget.style.color = 'var(--primary)';
                      }}
                    >
                      <Icon n="spark" s={16} />
                      {isWrong
                        ? '✨ Vi AI giải thích vì sao sai'
                        : '✨ Hỏi Vi AI phân tích sâu câu này'}
                    </button>
                  )}

                  {aiState?.loading && (
                    <div
                      style={{
                        padding: '16px 20px',
                        background: '#F5F3FF',
                        border: '1.5px solid #DDD6FE',
                        borderRadius: 14,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        fontSize: 14,
                        color: '#6D28D9',
                        fontWeight: 700,
                      }}
                    >
                      <div
                        style={{
                          width: 20,
                          height: 20,
                          border: '2.5px solid #DDD6FE',
                          borderTopColor: '#7C3AED',
                          borderRadius: '50%',
                          animation: 'spin 1s linear infinite',
                        }}
                      />
                      Đang nhờ Vi AI phân tích chi tiết câu hỏi và đáp án cho bạn...
                    </div>
                  )}

                  {aiState?.text && (
                    <div
                      style={{
                        background: 'linear-gradient(180deg, #FAF5FF 0%, #FFFFFF 100%)',
                        border: '1.5px solid #DDD6FE',
                        borderRadius: 16,
                        padding: '18px 20px',
                        boxShadow: '0 6px 20px rgba(124, 58, 237, 0.08)',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: 12,
                          paddingBottom: 10,
                          borderBottom: '1px solid #E2E8F0',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <img
                            src={viAvatar}
                            alt="Vi"
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: '50%',
                              objectFit: 'cover',
                              border: '1.5px solid #A855F7',
                            }}
                          />
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <b style={{ fontSize: 14.5, color: '#6D28D9' }}>
                                Trợ lý Vi AI phân tích câu hỏi
                              </b>
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: 800,
                                  color: '#7C3AED',
                                  background: '#EDE9FE',
                                  padding: '2px 8px',
                                  borderRadius: 99,
                                }}
                              >
                                ✨ AI Verified
                              </span>
                            </div>
                            <span style={{ fontSize: 12, color: '#64748B' }}>
                              Phân tích logic ngữ pháp & mẹo ghi nhớ thực chiến
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => requestAiExplanation(item)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--primary)',
                            fontSize: 12.5,
                            fontWeight: 700,
                            cursor: 'pointer',
                            padding: '4px 8px',
                            borderRadius: 6,
                          }}
                        >
                          Phân tích lại
                        </button>
                      </div>

                      {/* Render 3 clean, formatted semantic cards */}
                      <AiExplanationCardView text={aiState.text} />
                    </div>
                  )}

                  {aiState?.error && (
                    <div style={{ marginTop: 8, color: '#DC2626', fontSize: 13, fontWeight: 600 }}>
                      {aiState.error}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
