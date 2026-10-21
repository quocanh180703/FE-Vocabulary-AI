import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { quizApi, aiApi, errMsg } from '../api';
import type { QuizDetail, Attempt } from '../api';
import { Icon } from '../components/icons';
import { motion } from 'motion/react';
import { staggerContainer, staggerItem } from '../motion';

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
      nav(`/quiz/${id}/result`, { state: { result: data, title: quiz?.title } });
    } catch (e) {
      setErr(errMsg(e, 'Nộp bài lỗi, thử lại nhé.'));
      setSubmitting(false);
    }
  };

  if (err && !quiz) return <div className="content narrow"><div className="error">{err}</div></div>;
  if (!quiz) return <div className="content"><div className="loading">Đang tải đề...</div></div>;

  return (
    <div className="content narrow">
      <div className="row" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: 14 }}>
        <div>
          <button
            onClick={() => {
              if (confirm('Bạn có chắc muốn thoát bài thi này? Tiến trình làm bài sẽ không được lưu.')) nav('/quiz');
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--muted)',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              marginBottom: 4,
            }}
          >
            ← Thoát bài thi
          </button>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: 'var(--ink)' }}>{quiz.title}</h1>
          <div className="sub" style={{ marginTop: 2 }}>
            Tổng số: <b>{quiz.questions.length}</b> câu hỏi · Đã trả lời: <b>{Object.keys(answers).length}</b>/{quiz.questions.length}
          </div>
        </div>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 18px',
            borderRadius: 99,
            background: secs < 180 ? '#FEE2E2' : '#EFF6FF',
            border: `1.5px solid ${secs < 180 ? '#FECACA' : '#BFDBFE'}`,
            color: secs < 180 ? '#DC2626' : '#2563EB',
            fontSize: 18,
            fontWeight: 900,
            fontVariantNumeric: 'tabular-nums',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <Icon n="clock" s={20} /> {mm}:{ss}
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 6 }}>
          <span>Tiến độ làm bài</span>
          <span style={{ color: 'var(--primary)', fontWeight: 800 }}>
            {Math.round((Object.keys(answers).length / quiz.questions.length) * 100)}%
          </span>
        </div>
        <div className="progress" style={{ height: 8, background: '#E2E8F0', borderRadius: 99, overflow: 'hidden' }}>
          <i
            style={{
              width: `${(Object.keys(answers).length / quiz.questions.length) * 100}%`,
              transition: 'width 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
              background: 'linear-gradient(90deg, #4F46E5 0%, #10B981 100%)',
              height: '100%',
              display: 'block',
              borderRadius: 99,
            }}
          />
        </div>
      </div>

      {err && <div className="error">{err}</div>}

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        style={{ display: 'flex', flexDirection: 'column', gap: 18, marginTop: 10 }}
      >
        {quiz.questions.map((q, qi) => (
          <motion.div
            variants={staggerItem}
            className="card"
            key={q.id}
            style={{ borderRadius: 18, padding: '24px 22px' }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
              <span className="pill" style={{ fontWeight: 800, fontSize: 12, padding: '3px 10px', background: 'rgba(79, 70, 229, 0.08)', color: 'var(--primary)' }}>
                Câu {qi + 1}
              </span>
              <b style={{ fontSize: 16.5, color: 'var(--ink)', lineHeight: 1.5 }}>{q.content}</b>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {q.options.map((op, oi) => {
                const isSelected = answers[q.id] === oi;
                return (
                  <motion.button
                    key={oi}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => setAnswers((a) => ({ ...a, [q.id]: oi }))}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      width: '100%',
                      textAlign: 'left',
                      padding: '12px 16px',
                      minHeight: 52,
                      background: isSelected ? '#EEF2FF' : '#FFFFFF',
                      border: `1.5px solid ${isSelected ? 'var(--primary)' : 'var(--line)'}`,
                      borderRadius: 12,
                      fontSize: 15,
                      fontWeight: 700,
                      color: isSelected ? 'var(--primary-dark)' : 'var(--ink)',
                      cursor: 'pointer',
                      transition: 'background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease',
                      boxShadow: isSelected ? '0 2px 8px rgba(79, 70, 229, 0.1)' : 'none',
                    }}
                  >
                    <span
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: isSelected ? 'var(--primary)' : 'var(--bg)',
                        color: isSelected ? '#FFFFFF' : 'var(--muted)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 900,
                        fontSize: 14,
                        flexShrink: 0,
                        transition: 'background 0.2s ease, color 0.2s ease',
                      }}
                    >
                      {'ABCD'[oi]}
                    </span>
                    <span style={{ flex: 1 }}>{op}</span>
                  </motion.button>
                );
              })}
            </div>

            {hint[q.id] ? (
              <div
                style={{
                  marginTop: 14,
                  padding: '10px 14px',
                  background: '#FFFBEB',
                  border: '1px solid #FDE68A',
                  borderRadius: 10,
                  fontSize: 13,
                  color: '#92400E',
                  lineHeight: 1.5,
                }}
              >
                <b>💡 Gợi ý từ Vi:</b> {hint[q.id]}
              </div>
            ) : (
              <button
                className="link mt8"
                onClick={() => getHint(q.id)}
                style={{ fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 12 }}
              >
                <Icon n="bulb" s={15} /> Xin gợi ý từ Vi AI
              </button>
            )}
          </motion.div>
        ))}
      </motion.div>

      <motion.button
        className="btn block"
        whileTap={{ scale: submitting ? 1 : 0.985 }}
        onClick={submit}
        disabled={submitting}
        style={{
          marginTop: 20,
          minHeight: 54,
          fontSize: 16,
          fontWeight: 900,
          opacity: submitting ? 0.7 : 1,
          cursor: submitting ? 'wait' : 'pointer',
        }}
      >
        <Icon n="checkc" s={20} />
        {submitting
          ? 'Đang chấm điểm bài thi...'
          : `Nộp bài thi (${Object.keys(answers).length}/${quiz.questions.length} câu)`}
      </motion.button>
    </div>
  );
}
