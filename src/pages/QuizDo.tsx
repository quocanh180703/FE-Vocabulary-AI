import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { quizApi, aiApi, errMsg } from '../api';
import type { QuizDetail, Attempt } from '../api';
import { Icon } from '../components/icons';

export default function QuizDo() {
  const { id } = useParams();
  const nav = useNavigate();
  const [quiz, setQuiz] = useState<QuizDetail | null>(null);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [secs, setSecs] = useState(0);
  const [hint, setHint] = useState<Record<number, string>>({});
  const [err, setErr] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const qid = Number(id);
    Promise.all([quizApi.detail(qid), quizApi.start(qid)])
      .then(([{ data: q }, { data: a }]) => {
        setQuiz(q); setAttempt(a);
        setSecs(Math.max(0, Math.floor((new Date(a.expiresAt).getTime() - Date.now()) / 1000)));
      })
      .catch((e) => setErr(errMsg(e, 'Không mở được quiz này.')));
    return () => clearInterval(timer.current);
  }, [id]);

  useEffect(() => {
    if (secs <= 0) return;
    timer.current = window.setInterval(() => setSecs((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(timer.current);
  }, [attempt]);

  const mm = String(Math.floor(secs / 60)).padStart(2, '0');
  const ss = String(secs % 60).padStart(2, '0');

  const getHint = async (qid: number) => {
    try { const { data } = await aiApi.hint(qid, 1); setHint((h) => ({ ...h, [qid]: data.hint })); }
    catch { setHint((h) => ({ ...h, [qid]: 'Loại trừ đáp án bạn chắc chắn sai trước nhé.' })); }
  };

  const submit = async () => {
    if (!attempt || submitting) return;
    const payload = Object.entries(answers).map(([questionId, answer]) => ({ questionId: Number(questionId), answer }));
    if (payload.length < (quiz?.questions.length || 0) && !confirm(`Bạn mới làm ${payload.length}/${quiz?.questions.length} câu. Nộp luôn?`)) return;
    setSubmitting(true);
    try {
      const { data } = await quizApi.submit(attempt.attemptId, payload);
      nav(`/quiz/${id}/result`, {
        state: {
          result: data,
          title: quiz?.title,
          attemptId: attempt.attemptId,
          quiz,
          userAnswers: answers,
        },
      });
    } catch (e) {
      setErr(errMsg(e, 'Nộp bài lỗi, thử lại nhé.'));
      setSubmitting(false);
    }
  };

  if (err && !quiz) return <div className="content narrow"><div className="error">{err}</div></div>;
  if (!quiz) return <div className="content"><div className="loading">Đang tải đề...</div></div>;

  return (
    <div className="content" style={{ maxWidth: 820 }}>
      {/* Top Header */}
      <div className="pagehead">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <button
            onClick={() => {
              if (confirm('Bạn có chắc muốn thoát bài thi này? Tiến trình làm bài sẽ không được lưu.')) nav('/quiz');
            }}
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
            ← Thoát bài thi
          </button>
        </div>
        <h1>Quiz: {quiz.title}</h1>
        <div className="sub">
          {quiz.questions.length} câu hỏi · đáp án được chấm và phân tích khi nộp bài
        </div>
      </div>

      {/* Flashnav with Timer matching quiz.html */}
      <div className="flashnav" style={{ marginBottom: 18 }}>
        <span className={'pill' + (secs < 180 ? ' warn' : '')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <svg viewBox="0 0 24 24" className="ic" style={{ width: 16, height: 16 }}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>
          {mm}:{ss}
        </span>
        <div className="progress">
          <i style={{ width: `${(Object.keys(answers).length / quiz.questions.length) * 100}%` }} />
        </div>
        <span className="pill">
          {Object.keys(answers).length}/{quiz.questions.length} câu
        </span>
      </div>

      {err && <div className="error">{err}</div>}

      {/* Reading Passage if available */}
      {quiz.description && (
        <div
          className="card"
          style={{
            padding: '20px 24px',
            marginBottom: 20,
            background: 'var(--surface-hover, #f8fafc)',
            border: '1px solid var(--border)',
            borderRadius: 12,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontWeight: 700,
              fontSize: 14,
              color: 'var(--primary)',
              marginBottom: 12,
            }}
          >
            <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, fill: 'currentColor' }}>
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
            </svg>
            Đoạn văn bài đọc (Reading Passage)
          </div>
          <div
            style={{
              whiteSpace: 'pre-wrap',
              lineHeight: 1.7,
              fontSize: 15,
              color: 'var(--text-main)',
              fontFamily: 'inherit',
            }}
          >
            {quiz.description}
          </div>
        </div>
      )}

      {/* Question List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {quiz.questions.map((q, qi) => (
          <div className="card" key={q.id} style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 16 }}>
              <span className="pill level" style={{ fontSize: 12 }}>
                Câu {qi + 1}
              </span>
              <h2 style={{ fontSize: 18, margin: 0, lineHeight: 1.45 }}>{q.content}</h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              {q.options.map((op, oi) => {
                const isSelected = answers[q.id] === oi;
                return (
                  <button
                    key={oi}
                    type="button"
                    className={'opt' + (isSelected ? ' sel' : '')}
                    onClick={() => setAnswers((a) => ({ ...a, [q.id]: oi }))}
                  >
                    <span className="k">{'ABCD'[oi]}</span>
                    <span style={{ flex: 1 }}>{op}</span>
                  </button>
                );
              })}
            </div>

            {hint[q.id] ? (
              <div
                style={{
                  marginTop: 14,
                  padding: '12px 16px',
                  background: 'var(--yellow-bg)',
                  border: '1px solid #FDE68A',
                  borderRadius: 12,
                  fontSize: 13.5,
                  color: '#92400E',
                  lineHeight: 1.5,
                }}
              >
                <b>💡 Gợi ý từ Vi:</b> {hint[q.id]}
              </div>
            ) : (
              <button
                type="button"
                className="link mt8"
                onClick={() => getHint(q.id)}
                style={{ fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 14 }}
              >
                <Icon n="bulb" s={15} /> Xin gợi ý từ Vi AI
              </button>
            )}
          </div>
        ))}
      </div>

      <button
        type="button"
        className="btn block mt16"
        onClick={submit}
        disabled={submitting}
        style={{
          minHeight: 52,
          fontSize: 16,
          marginTop: 22,
        }}
      >
        {submitting
          ? 'Đang chấm điểm bài thi...'
          : `Nộp bài thi (${Object.keys(answers).length}/${quiz.questions.length} câu)`}
      </button>
    </div>
  );
}
