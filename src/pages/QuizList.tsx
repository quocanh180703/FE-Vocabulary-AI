import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { quizApi, personalizedApi, errMsg } from '../api';
import type { Quiz } from '../api';
import { Icon, Mascot } from '../components/icons';
import { useAuth } from '../auth/AuthContext';

const LEVELS = ['Tất cả', '🎯 Đề xuất cho bạn', 'A1', 'A2', 'B1', 'B2', 'C1'];

export default function QuizList() {
  const { user } = useAuth();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [level, setLevel] = useState('Tất cả');
  const [weakTopics, setWeakTopics] = useState<string[]>([]);

  // Storage key for roadmap data
  const storageKey = `vocab_ai_roadmap_${user?.id || user?.username || 'default'}`;
  const getInitialLevel = () => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.profile?.currentLevel) return parsed.profile.currentLevel;
      }
    } catch {}
    return 'B1';
  };

  const [recommendedLevel, setRecommendedLevel] = useState<string>(getInitialLevel);
  const [err, setErr] = useState('');
  const nav = useNavigate();

  useEffect(() => {
    personalizedApi.weakTopics()
      .then(({ data }) => {
        if (Array.isArray(data) && data.length > 0) setWeakTopics(data);
      })
      .catch(() => {});

    personalizedApi.level()
      .then(({ data }) => {
        if (data) setRecommendedLevel(data);
      })
      .catch(() => {});

    const onRoadmapAnalyzed = (e: any) => {
      const lvl = e?.detail?.currentLevel;
      if (lvl) setRecommendedLevel(lvl);
    };
    window.addEventListener('vocab_roadmap_analyzed', onRoadmapAnalyzed);
    return () => window.removeEventListener('vocab_roadmap_analyzed', onRoadmapAnalyzed);
  }, [storageKey]);

  useEffect(() => {
    const isRecommendedFilter = level === '🎯 Đề xuất cho bạn';
    quizApi.list({
      page: 0,
      size: 50,
      level: (!isRecommendedFilter && level !== 'Tất cả') ? level : undefined,
    })
      .then(({ data }) => {
        let list = data.content;
        if (isRecommendedFilter) {
          list = list.filter((q: Quiz) => isQuizRecommended(q));
        }
        setQuizzes(list);
      })
      .catch((e) => setErr(errMsg(e)));
  }, [level, weakTopics, recommendedLevel]);

  const isQuizRecommended = (qz: Quiz) => {
    const titleLower = (qz.title || '').toLowerCase();
    const catLower = (qz.category || '').toLowerCase();
    const matchesWeakTopic = weakTopics.some((w) => {
      const wl = w.toLowerCase();
      return titleLower.includes(wl) || catLower.includes(wl);
    });
    const matchesLevel = qz.level === recommendedLevel;
    return matchesWeakTopic || matchesLevel;
  };

  return (
    <div className="content">
      <div className="pagehead">
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '4px 12px', background: 'rgba(79, 70, 229, 0.08)', borderRadius: 99, color: 'var(--primary)', fontSize: 13, fontWeight: 800, marginBottom: 8 }}>
          <Icon n="zap" s={14} /> Kiểm tra & Đánh giá năng lực
        </div>
        <h1>Quiz luyện tập tính giờ</h1>
        <div className="sub">Đề thi bấm giờ chuẩn CEFR — Chọn đáp án chính xác và nhận phản hồi chi tiết từ hệ thống</div>
      </div>

      {weakTopics.length > 0 && (
        <div
          className="card"
          style={{
            background: 'linear-gradient(135deg, #F5F3FF 0%, #EEF2FF 100%)',
            border: '1px solid #DDD6FE',
            padding: '16px 22px',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
            borderRadius: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Mascot s={40} />
            <div style={{ fontSize: 13.5, color: '#1E1B4B', lineHeight: 1.5 }}>
              <b style={{ color: 'var(--primary)' }}>Gợi ý thích ứng từ Vi AI:</b> Bạn nên tập trung củng cố chủ đề{' '}
              <b style={{ color: 'var(--primary)' }}>{weakTopics.join(', ')}</b> (trình độ đề xuất: <b>{recommendedLevel}</b>). Hãy ưu tiên các bài có nhãn ✨ để tăng tốc cải thiện nhé!
            </div>
          </div>
          <button
            className="btn ghost sm"
            onClick={() => setLevel('🎯 Đề xuất cho bạn')}
            style={{ borderColor: '#C7D2FE', color: 'var(--primary)', background: '#FFFFFF', minHeight: 38, fontSize: 13.5, fontWeight: 800 }}
          >
            Lọc bài AI khuyên làm
          </button>
        </div>
      )}

      <div className="chips" style={{ marginBottom: 20 }}>
        {LEVELS.map((l) => (
          <button key={l} className={'chip' + (level === l ? ' on' : '')} onClick={() => setLevel(l)}>
            {l}
          </button>
        ))}
      </div>

      {err && <div className="error">{err}</div>}

      <div className="cols3">
        {quizzes.map((qz) => {
          const recommended = isQuizRecommended(qz);
          return (
            <div
              className="card"
              key={qz.id}
              style={{
                position: 'relative',
                borderRadius: 18,
                padding: '24px 22px',
                border: recommended ? '2px solid var(--primary)' : '1px solid var(--line)',
                boxShadow: recommended ? '0 8px 24px rgba(79, 70, 229, 0.12)' : 'var(--shadow-sm)',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              {recommended && (
                <div
                  style={{
                    position: 'absolute',
                    top: -11,
                    right: 18,
                    background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
                    color: '#fff',
                    fontSize: 11.5,
                    fontWeight: 800,
                    padding: '3px 12px',
                    borderRadius: 99,
                    boxShadow: '0 4px 10px rgba(79, 70, 229, 0.25)',
                  }}
                >
                  ✨ AI đề xuất
                </div>
              )}

              <div>
                <div className="row">
                  <span className="pill level" style={{ fontWeight: 800, fontSize: 12 }}>
                    Cấp độ {qz.level}
                  </span>
                  <span className="sub" style={{ fontSize: 13, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <Icon n="clock" s={15} /> {qz.timeLimit} phút
                  </span>
                </div>
                <h2 className="mt8" style={{ fontSize: 18, fontWeight: 900, color: 'var(--ink)' }}>{qz.title}</h2>
                <div className="sub mt8" style={{ fontSize: 13.5, color: 'var(--muted)' }}>
                  {qz.questionCount} câu hỏi trắc nghiệm{qz.category ? ` · ${qz.category}` : ''}
                </div>
              </div>

              <button className="btn block mt16" onClick={() => nav(`/quiz/${qz.id}`)}>
                Bắt đầu làm bài →
              </button>
            </div>
          );
        })}
      </div>

      {quizzes.length === 0 && !err && (
        <div className="empty">
          {level === '🎯 Đề xuất cho bạn'
            ? 'Không tìm thấy bài quiz nào trùng với chủ đề đề xuất hiện tại.'
            : 'Chưa có quiz nào ở trình độ này.'}
        </div>
      )}
    </div>
  );
}

