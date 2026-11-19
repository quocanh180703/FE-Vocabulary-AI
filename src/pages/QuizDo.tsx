import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { quizApi, aiApi, errMsg } from '../api';
import type { QuizDetail, Attempt } from '../api';
import { Icon } from '../components/icons';
import { ViMascotImage } from '../components/ViMascotImage';
import { ViLoadingScreen } from '../components/states/ViLoadingScreen';
import { UiIcon } from '../components/UiIcon';
import { SplitHeading } from '../components/SageEffects';
import { AnimatedProgressBar, AnimatedCounter, MotionCard, staggerContainer, staggerItem } from '../motion';

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
  if (!quiz) return <div className="content"><ViLoadingScreen subtitle="Đang tải đề trắc nghiệm" /></div>;

  return (
    <div className="content narrow">
      {/* Top Header */}
      <div className="pagehead">
        <div>
          <div className="eyebrow">QUIZ · THỬ THÁCH TÍNH GIỜ</div>
          <SplitHeading text={`Quiz: ${quiz.title}`} />
          <p className="sub">
            {quiz.questions.length} câu hỏi · đáp án được chấm và phân tích khi nộp bài
          </p>
        </div>
        <div className="row" style={{ gap: 10 }}>
          <ViMascotImage
            pose="encourage"
            size={44}
            alt="Vi cổ vũ bạn tập trung hoàn thành bài quiz"
          />
          <button
            type="button"
            onClick={() => {
              if (confirm('Bạn có chắc muốn thoát bài thi này? Tiến trình làm bài sẽ không được lưu.')) nav('/quiz');
            }}
            className="btn secondary sm"
          >
            ← Thoát bài thi
          </button>
        </div>
      </div>

      {/* Flashnav with Timer */}
      <div className="card" style={{ padding: '12px 18px', flex: 'none' }}>
        <div className="row" style={{ gap: 12 }}>
          <span className={'pill' + (secs < 180 ? ' warn' : ' greensoft')} style={{ flexShrink: 0 }}>
            <Icon n="clock" s={14} />
            {mm}:{ss}
          </span>
          <div style={{ flex: 1, minWidth: 100 }}>
            <AnimatedProgressBar value={(Object.keys(answers).length / quiz.questions.length) * 100} />
          </div>
          <span className="pill level" style={{ flexShrink: 0 }}>
            <AnimatedCounter value={Object.keys(answers).length} />/{quiz.questions.length} câu
          </span>
        </div>
      </div>

      {err && <div className="error">{err}</div>}

      {/* Scrollable Quiz Body */}
      <div className="long-list" style={{ flex: 1, minHeight: 0, paddingRight: 4, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Reading Passage if available */}
        {quiz.description && (
          <MotionCard>
            <div className="row" style={{ gap: 8, marginBottom: 10, color: 'var(--sage-dark)', fontWeight: 800, fontSize: 13.5 }}>
              <Icon n="book" s={16} />
              Đoạn văn bài đọc (Reading Passage)
            </div>
            <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.68, fontSize: 14.5, color: 'var(--ink)' }}>
              {quiz.description}
            </div>
          </MotionCard>
        )}

        {/* Question List */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="colstack"
          style={{ gap: 16 }}
        >
          {quiz.questions.map((q, qi) => (
            <motion.div key={q.id} variants={staggerItem}>
              <MotionCard>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 14 }}>
                  <span className="pill level" style={{ fontSize: 12 }}>
                    Câu {qi + 1}
                  </span>
                  <h2 style={{ fontSize: 17.5, margin: 0, lineHeight: 1.45 }}>{q.content}</h2>
                </div>

                <div className="colstack" style={{ gap: 10 }}>
                  {q.options.map((op, oi) => {
                    const isSelected = answers[q.id] === oi;
                    return (
                      <button
                        key={oi}
                        type="button"
                        className={'option' + (isSelected ? ' selected' : '')}
                        onClick={() => setAnswers((a) => ({ ...a, [q.id]: oi }))}
                      >
                        <span className="letter">{'ABCD'[oi]}</span>
                        <span style={{ flex: 1 }}>{op}</span>
                      </button>
                    );
                  })}
                </div>

                {hint[q.id] ? (
                  <div className="coach" style={{ marginTop: 14 }}>
                    <ViMascotImage
                      pose="thinking"
                      size={36}
                      alt="Vi suy nghĩ và gợi ý đáp án cho câu hỏi"
                    />
                    <div className="bubble" style={{ fontSize: 13.5 }}>
                      <b><UiIcon name="lightbulb" size={14} /> Gợi ý từ Vi:</b> {hint[q.id]}
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="btn ghost sm"
                    onClick={() => getHint(q.id)}
                    style={{ marginTop: 12 }}
                  >
                    <Icon n="bulb" s={15} /> Xin gợi ý từ Vi AI
                  </button>
                )}
              </MotionCard>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Pinned Submit Bar */}
      <div className="card" style={{ padding: '12px 18px', flex: 'none' }}>
        <div className="row between" style={{ flexWrap: 'wrap', gap: 10 }}>
          <span className="tiny muted">
            Đã trả lời <b>{Object.keys(answers).length}/{quiz.questions.length}</b> câu · Thời gian còn lại {mm}:{ss}
          </span>
          <button
            type="button"
            className="btn"
            onClick={submit}
            disabled={submitting}
          >
            {submitting
              ? 'Đang chấm điểm bài thi...'
              : `Nộp bài thi (${Object.keys(answers).length}/${quiz.questions.length} câu)`}
          </button>
        </div>
      </div>
    </div>
  );
}
