import { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { quizApi, aiApi } from '../api';
import type { QuizResult as R, QuizAttemptAnswerDetail, QuizDetail } from '../api';
import { Icon } from '../components/icons';
import { ViMascotImage } from '../components/ViMascotImage';
import { ViLoadingScreen } from '../components/states/ViLoadingScreen';
import { UiIcon } from '../components/UiIcon';
import { ScoreRing, SplitHeading } from '../components/SageEffects';
import { MotionCard, AnimatedCounter } from '../motion';

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
      /(?:^(?:#{1,3}\s*)?\*{0,2}\s*[123]\.|\b[123]\.\s*(?:💡|⚠️|🎯)|^(?:💡|⚠️|🎯))/u.test(line) &&
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
          bg = 'rgba(71, 96, 63, 0.1)';
          border = '1.5px solid rgba(71, 96, 63, 0.28)';
          headerColor = 'var(--sage-dark)';
          boldColor = 'var(--ink)';
          bulletIcon = '★';
          iconBg = 'rgba(71, 96, 63, 0.18)';
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
  const [searchParams] = useSearchParams();
  const nav = useNavigate();

  const queryAttemptId = searchParams.get('attemptId')
    ? Number(searchParams.get('attemptId'))
    : undefined;

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

  const [syntheticResult, setSyntheticResult] = useState<R | undefined>(undefined);
  const [attemptQuizTitle, setAttemptQuizTitle] = useState<string>('');

  const r = effectiveState?.result || syntheticResult;

  const [attemptDetails, setAttemptDetails] = useState<ReviewQuestionItem[]>([]);
  const [loadingDetails, setLoadingDetails] = useState<boolean>(() => {
    return Boolean(queryAttemptId && !navState?.result);
  });
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
    const attemptId = queryAttemptId || r?.attemptId || effectiveState?.attemptId;
    if (attemptId) {
      setLoadingDetails(true);
      quizApi
        .getAttemptDetails(attemptId)
        .then(({ data }) => {
          if (data?.attempt) {
            if (data.attempt.quizTitle) {
              setAttemptQuizTitle(data.attempt.quizTitle);
            }
            if (!effectiveState?.result) {
              const syn: R = {
                attemptId: data.attempt.id,
                score: Math.round(Number(data.attempt.score ?? 0)),
                totalQuestions: data.attempt.totalQuestions || (data.answers ? data.answers.length : 0),
                correctAnswers: data.attempt.correctAnswers || 0,
                feedback: '',
              };
              setSyntheticResult(syn);
            }
          }
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
  }, [queryAttemptId, r?.attemptId, effectiveState?.attemptId]);

  if (loadingDetails && !r) {
    return (
      <div className="content" style={{ maxWidth: 860 }}>
        <ViLoadingScreen subtitle="Đang tải chi tiết bài làm" />
      </div>
    );
  }

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
    <div className="content">
      {/* Top Page Header */}
      <div className="pagehead">
        <div>
          <div className="eyebrow">QUIZ RESULT · TỔNG KẾT</div>
          <SplitHeading text={`Kết quả: ${effectiveState?.title || attemptQuizTitle || 'Trắc nghiệm'}`} />
          <p className="sub">
            {pct >= 80
              ? 'Xuất sắc! Bạn nắm rất vững kiến thức bài học.'
              : pct >= 50
              ? 'Khá tốt! Hãy ôn lại các từ chưa đúng để đạt điểm tuyệt đối nhé.'
              : 'Cần cố gắng thêm! Xem lại đáp án bên dưới nhé.'}
          </p>
        </div>

        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => nav('/quiz?tab=history')}
            className="btn secondary sm"
          >
            ← Quay lại lịch sử làm bài
          </button>
          <button
            type="button"
            className="btn ghost sm"
            onClick={() => nav('/quiz')}
          >
            Về danh sách quiz
          </button>
          <button
            type="button"
            className="btn sm"
            onClick={() => nav(`/quiz/${id}`)}
          >
            <UiIcon name="refresh" size={14} /> Làm lại bài thi này
          </button>
        </div>
      </div>

      {/* Viewport-Locked 2-Column Layout */}
      <div className="cols2" style={{ gridTemplateColumns: 'minmax(290px, 370px) minmax(0, 1fr)', flex: 1, minHeight: 0, alignItems: 'stretch' }}>
        {/* Left Summary & Coach Panel */}
        <div className="colstack long-list" style={{ paddingRight: 4 }}>
          <MotionCard className="center" style={{ gap: 12 }}>
            <div className="row" style={{ justifyContent: 'center', gap: 16 }}>
              <ScoreRing
                value={pct}
                label={`${pct}%`}
                size={96}
                accentColor={pct >= 80 ? 'var(--success)' : pct >= 50 ? 'var(--sage)' : 'var(--danger)'}
              />
              <ViMascotImage
                pose={pct >= 50 ? 'celebrate' : 'encourage'}
                animated={pct >= 80}
                size={92}
                priority
                alt={pct >= 50 ? 'Vi ăn mừng kết quả bài thi trắc nghiệm của bạn' : 'Vi động viên bạn tiếp tục ôn luyện'}
              />
            </div>

            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)' }}>
              Đúng <b><AnimatedCounter value={r.correctAnswers} />/{r.totalQuestions}</b> câu · Đạt{' '}
              <b><AnimatedCounter value={r.score ?? pct} /> điểm</b>
            </div>

            {/* Interactive Correct / Wrong Filter Tiles */}
            <div className="cols2" style={{ width: '100%', gap: 10 }}>
              <div
                role="button"
                tabIndex={0}
                onClick={() => scrollToReview('CORRECT')}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') scrollToReview('CORRECT'); }}
                style={{
                  cursor: 'pointer',
                  padding: '12px 14px',
                  borderRadius: 14,
                  background: filterMode === 'CORRECT' ? 'var(--success-bg)' : 'rgba(255,255,255,0.68)',
                  border: `1.5px solid ${filterMode === 'CORRECT' ? 'var(--success)' : 'var(--line)'}`,
                  textAlign: 'left',
                  transition: 'border-color var(--dur-micro) var(--ease), background-color var(--dur-micro) var(--ease)',
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--green-dark)', display: 'inline-flex', alignItems: 'center', gap: 5 }}><UiIcon name="check-circle" size={13} /> Làm đúng</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--ink)', marginTop: 2 }}>
                  <AnimatedCounter value={correctCount} /> <small style={{ fontSize: 12 }}>câu</small>
                </div>
              </div>

              <div
                role="button"
                tabIndex={0}
                onClick={() => scrollToReview('WRONG')}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') scrollToReview('WRONG'); }}
                style={{
                  cursor: 'pointer',
                  padding: '12px 14px',
                  borderRadius: 14,
                  background: filterMode === 'WRONG' ? 'var(--danger-bg)' : 'rgba(255,255,255,0.68)',
                  border: `1.5px solid ${filterMode === 'WRONG' ? 'var(--danger)' : 'var(--line)'}`,
                  textAlign: 'left',
                  transition: 'border-color var(--dur-micro) var(--ease), background-color var(--dur-micro) var(--ease)',
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--red-dark)' }}>✕ Làm sai</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--ink)', marginTop: 2 }}>
                  <AnimatedCounter value={wrongCount} /> <small style={{ fontSize: 12 }}>câu</small>
                </div>
              </div>
            </div>
          </MotionCard>

          {r.feedback && (
            <MotionCard>
              <div className="coach">
                <ViMascotImage
                  pose={pct >= 50 ? 'explain' : 'encourage'}
                  size={48}
                  alt="Vi nhận xét tổng kết bài làm quiz"
                />
                <div className="bubble" style={{ fontSize: 13.5, lineHeight: 1.5 }}>
                  <b>Nhận xét từ Vi AI:</b> {r.feedback}
                </div>
              </div>
            </MotionCard>
          )}
        </div>

        {/* Right Detailed Question Review Column */}
        <section className="card colstack" style={{ gap: 12 }}>
          <div className="row between" style={{ flexWrap: 'wrap', gap: 10, flex: 'none' }}>
            <div>
              <h2 style={{ fontSize: 17, margin: 0, display: 'inline-flex', alignItems: 'center', gap: 6 }}><UiIcon name="clipboard" size={17} /> Đáp án &amp; Phân tích chi tiết</h2>
              <p className="tiny muted" style={{ margin: '2px 0 0' }}>
                Lọc theo trạng thái hoặc nhờ Vi AI giải thích câu chưa rõ
              </p>
            </div>
            <div className="chips">
              <button
                type="button"
                className={'chip' + (filterMode === 'ALL' ? ' on' : '')}
                onClick={() => setFilterMode('ALL')}
              >
                Tất cả ({attemptDetails.length || r.totalQuestions})
              </button>
              <button
                type="button"
                className={'chip' + (filterMode === 'WRONG' ? ' on' : '')}
                onClick={() => setFilterMode('WRONG')}
              >
                Sai ({wrongCount})
              </button>
              <button
                type="button"
                className={'chip' + (filterMode === 'CORRECT' ? ' on' : '')}
                onClick={() => setFilterMode('CORRECT')}
              >
                Đúng ({correctCount})
              </button>
            </div>
          </div>

          <div id="questions-review-section" className="long-list colstack" style={{ flex: 1, minHeight: 0, gap: 12, paddingRight: 4 }}>
            {loadingDetails && (
              <ViLoadingScreen compact subtitle="Đang tải chi tiết đáp án câu hỏi" />
            )}

            {!loadingDetails && displayedAnswers.length === 0 && (
              <div className="center" style={{ padding: 32, gap: 10 }}>
                <ViMascotImage
                  pose={filterMode === 'WRONG' ? 'celebrate' : 'sleep'}
                  size={72}
                  alt={filterMode === 'WRONG' ? 'Vi chúc mừng không có câu sai' : 'Không có câu hỏi nào'}
                />
                <strong style={{ fontSize: 15 }}>
                  {filterMode === 'WRONG'
                    ? 'Tuyệt vời! Bạn không làm sai câu nào trong bài thi này!'
                    : 'Không có câu hỏi nào trong danh mục này.'}
                </strong>
                <button
                  type="button"
                  className="btn secondary sm"
                  onClick={() => setFilterMode('ALL')}
                >
                  Xem lại tất cả câu hỏi
                </button>
              </div>
            )}

            {displayedAnswers.map((item) => {
              const isWrong = !item.isCorrect;
              const aiState = aiExplanations[item.questionId];

              return (
                <div
                  key={item.questionId}
                  style={{
                    padding: 16,
                    borderRadius: 14,
                    background: 'rgba(255, 255, 255, 0.72)',
                    border: isWrong ? '1.5px solid rgba(154, 75, 67, 0.36)' : '1px solid rgba(66, 119, 77, 0.28)',
                  }}
                >
                  <div className="row between" style={{ marginBottom: 10, gap: 10 }}>
                    <div className="row" style={{ gap: 8 }}>
                      <span className="pill level">Câu {item.questionNumber}</span>
                      <span className={'pill ' + (isWrong ? 'redsoft' : 'greensoft')}>
                        {isWrong ? '✕ Trả lời sai' : '✓ Trả lời đúng'}
                      </span>
                    </div>
                  </div>

                  <h3 style={{ fontSize: 15.5, margin: '0 0 12px 0', lineHeight: 1.45, color: 'var(--ink)' }}>
                    {item.content}
                  </h3>

                  <div className="colstack" style={{ gap: 8 }}>
                    {(item.options || []).map((opt, oi) => {
                      const isUserChoice = item.selectedAnswer === oi;
                      const isCorrect = item.correctAnswer === oi;
                      const cls =
                        'option ' +
                        (isCorrect ? 'correct' : isUserChoice ? 'wrong' : '');

                      return (
                        <div key={oi} className={cls} style={{ justifyContent: 'space-between', cursor: 'default' }}>
                          <div className="row" style={{ gap: 10 }}>
                            <span className="letter">{'ABCD'[oi]}</span>
                            <span style={{ fontSize: 13.5 }}>{opt}</span>
                          </div>
                          {isCorrect && (
                            <span className="pill greensoft">
                              {isUserChoice ? '✓ Bạn chọn đúng' : '✓ Đáp án đúng'}
                            </span>
                          )}
                          {!isCorrect && isUserChoice && (
                            <span className="pill redsoft">✕ Bạn đã chọn</span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {item.explanation && (
                    <div
                      style={{
                        marginTop: 10,
                        padding: '10px 14px',
                        background: isWrong ? 'var(--amber-bg)' : 'var(--success-bg)',
                        border: `1px solid ${isWrong ? 'rgba(201,134,47,0.32)' : 'rgba(66,119,77,0.28)'}`,
                        borderRadius: 10,
                        fontSize: 13,
                        lineHeight: 1.5,
                        color: 'var(--ink)',
                      }}
                    >
                      <b><UiIcon name="lightbulb" size={13} /> Giải thích gốc:</b> {item.explanation}
                    </div>
                  )}

                  {/* AI Explanation Area */}
                  <div style={{ marginTop: 12 }}>
                    {!aiState?.text && !aiState?.loading && (
                      <button
                        type="button"
                        className="btn secondary sm"
                        onClick={() => requestAiExplanation(item)}
                      >
                        <Icon n="spark" s={14} />
                        {isWrong
                          ? 'Vi AI giải thích vì sao sai'
                          : 'Hỏi Vi AI phân tích sâu câu này'}
                      </button>
                    )}

                    {aiState?.loading && (
                      <div className="coach" style={{ marginTop: 8 }}>
                        <ViMascotImage
                          pose="thinking"
                          size={38}
                          alt="Vi đang suy nghĩ phân tích câu hỏi"
                        />
                        <div className="bubble" style={{ fontSize: 13, fontWeight: 600 }}>
                          Đang nhờ Vi AI phân tích chi tiết câu hỏi và đáp án cho bạn...
                        </div>
                      </div>
                    )}

                    {aiState?.text && (
                      <div
                        style={{
                          marginTop: 8,
                          background: 'rgba(250, 248, 241, 0.88)',
                          border: '1px solid var(--line)',
                          borderRadius: 14,
                          padding: '14px 16px',
                        }}
                      >
                        <div className="row between" style={{ marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid var(--line)' }}>
                          <div className="row" style={{ gap: 10 }}>
                            <ViMascotImage
                              pose={isWrong ? 'surprised' : 'explain'}
                              size={36}
                              alt={isWrong ? 'Vi phân tích nguyên nhân chọn sai' : 'Vi giải thích chi tiết câu hỏi'}
                            />
                            <div>
                              <b style={{ fontSize: 13.5, color: 'var(--sage-dark)' }}>
                                Trợ lý Vi AI phân tích câu hỏi
                              </b>
                              <div className="tiny muted">Phân tích logic ngữ pháp &amp; mẹo ghi nhớ</div>
                            </div>
                          </div>
                          <button
                            type="button"
                            className="btn ghost sm"
                            onClick={() => requestAiExplanation(item)}
                          >
                            Phân tích lại
                          </button>
                        </div>
                        <AiExplanationCardView text={aiState.text} />
                      </div>
                    )}

                    {aiState?.error && (
                      <div className="error" style={{ marginTop: 8 }}>
                        {aiState.error}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
