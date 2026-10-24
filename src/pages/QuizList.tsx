import { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { quizApi, personalizedApi, errMsg } from '../api';
import type { Quiz } from '../api';
import { Mascot } from '../components/icons';
import { useAuth } from '../auth/AuthContext';

const LEVELS = ['Tất cả', '🎯 Đề xuất cho bạn', 'A1', 'A2', 'B1', 'B2', 'C1'];
const PAGE_SIZE = 10;

export default function QuizList() {
  const { user } = useAuth();
  const [allQuizzes, setAllQuizzes] = useState<Quiz[]>([]);
  const [level, setLevel] = useState('Tất cả');
  const [page, setPage] = useState(0);
  const [weakTopics, setWeakTopics] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const nav = useNavigate();
  const listRef = useRef<HTMLDivElement>(null);

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
    setLoading(true);
    quizApi.list({
      page: 0,
      size: 500,
    })
      .then(({ data }) => {
        setAllQuizzes(data.content || []);
        setLoading(false);
      })
      .catch((e) => {
        setErr(errMsg(e));
        setLoading(false);
      });
  }, []);

  const isQuizRecommended = (qz: Quiz) => {
    const titleLower = (qz.title || '').toLowerCase();
    const catLower = (qz.category || '').toLowerCase();
    const matchesWeakTopic = weakTopics.some((w) => {
      const wl = w.toLowerCase();
      return titleLower.includes(wl) || catLower.includes(wl);
    });
    const matchesLevel = (qz.level || '').toUpperCase() === (recommendedLevel || '').toUpperCase();
    return matchesWeakTopic || matchesLevel;
  };

  const handleLevelChange = (newLvl: string) => {
    if (newLvl === level) return;
    setLevel(newLvl);
    setPage(0);
  };

  const changePage = (newPage: number) => {
    if (newPage === page) return;
    setPage(newPage);
    listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const filteredQuizzes = useMemo(() => {
    if (level === '🎯 Đề xuất cho bạn') {
      return allQuizzes.filter((q) => isQuizRecommended(q));
    }
    if (level !== 'Tất cả') {
      const targetLvl = level.toUpperCase();
      return allQuizzes.filter((q) => (q.level || '').toUpperCase() === targetLvl);
    }
    return allQuizzes;
  }, [allQuizzes, level, weakTopics, recommendedLevel]);

  const totalElements = filteredQuizzes.length;
  const totalPages = Math.ceil(totalElements / PAGE_SIZE) || 1;

  useEffect(() => {
    if (page >= totalPages && totalPages > 0) {
      setPage(0);
    }
  }, [totalPages, page]);

  const paginatedQuizzes = useMemo(() => {
    const start = page * PAGE_SIZE;
    return filteredQuizzes.slice(start, start + PAGE_SIZE);
  }, [filteredQuizzes, page]);

  const getTabCount = (l: string) => {
    if (l === 'Tất cả') return allQuizzes.length;
    if (l === '🎯 Đề xuất cho bạn') return allQuizzes.filter(isQuizRecommended).length;
    return allQuizzes.filter((q) => (q.level || '').toUpperCase() === l.toUpperCase()).length;
  };

  return (
    <div className="content" style={{ maxWidth: 1180 }}>
      <div className="pagehead">
        <h1>Quiz luyện tập tính giờ</h1>
        <div className="sub">Chọn một bài để luyện — điểm được tính khi bạn nộp bài</div>
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
            onClick={() => handleLevelChange('🎯 Đề xuất cho bạn')}
            style={{ borderColor: '#C7D2FE', color: 'var(--primary)', background: '#FFFFFF', minHeight: 38, fontSize: 13.5, fontWeight: 800 }}
          >
            Lọc bài AI khuyên làm
          </button>
        </div>
      )}

      {/* Chiprow matching quiz-list.html */}
      <div ref={listRef} className="chiprow" style={{ marginBottom: 16 }}>
        {LEVELS.map((l) => {
          const count = getTabCount(l);
          return (
            <button
              key={l}
              className={'fchip' + (level === l ? ' on' : '')}
              onClick={() => handleLevelChange(l)}
            >
              {l === 'Tất cả' ? 'Tất cả trình độ' : l}
              <span
                style={{
                  marginLeft: 6,
                  fontSize: 11,
                  fontWeight: 800,
                  padding: '1px 7px',
                  borderRadius: 99,
                  background: level === l ? 'rgba(255,255,255,0.28)' : 'rgba(10,37,64,0.08)',
                  color: level === l ? '#fff' : 'var(--ink)',
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {err && <div className="error">{err}</div>}

      {/* Grid 2 cols with smooth page switch animation */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={`${level}-${page}`}
          className="cols2"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        >
          {paginatedQuizzes.map((qz, idx) => {
            const recommended = isQuizRecommended(qz);
            return (
              <motion.div
                className="card"
                key={qz.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.2,
                  delay: Math.min(idx * 0.025, 0.18),
                  ease: [0.16, 1, 0.3, 1],
                }}
                whileHover={{
                  y: -3,
                  boxShadow: '0 12px 28px rgba(10, 37, 64, 0.08)',
                  transition: { duration: 0.18 },
                }}
              >
                <div className="row">
                  <b style={{ fontSize: '18.5px' }}>{qz.title}</b>
                  <span className="pill level">Cấp {qz.level}</span>
                </div>
                {(() => {
                  const mins = qz.timeLimit > 60 ? Math.round(qz.timeLimit / 60) : qz.timeLimit;
                  return (
                    <>
                      <div className="sub mt8">
                        {qz.questionCount} câu · giới hạn {mins} phút{qz.category ? ` · ${qz.category}` : ''}
                      </div>
                      <div className="row mt16">
                        {recommended ? (
                          <span className="pill" style={{ background: 'var(--primary)', color: '#fff' }}>✨ AI đề xuất</span>
                        ) : (
                          <span className="pill level">Bấm giờ {mins}p</span>
                        )}
                        <button
                          className="btn"
                          style={{ minHeight: 46, padding: '0 22px' }}
                          onClick={() => nav(`/quiz/${qz.id}`)}
                        >
                          Bắt đầu làm
                        </button>
                      </div>
                    </>
                  );
                })()}
              </motion.div>
            );
          })}
        </motion.div>
      </AnimatePresence>

      {filteredQuizzes.length === 0 && !loading && !err && (
        <div className="empty" style={{ textAlign: 'center', padding: '48px 16px' }}>
          {level === '🎯 Đề xuất cho bạn'
            ? 'Không tìm thấy bài quiz nào trùng với chủ đề đề xuất hiện tại.'
            : 'Chưa có quiz nào ở trình độ này.'}
        </div>
      )}

      {/* Pagination Controls - chỉ hiển thị 10 bài rồi sang trang */}
      {totalPages > 1 && (
        <motion.div
          className="row"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          style={{
            marginTop: 28,
            padding: '16px 22px',
            background: '#fff',
            borderRadius: 18,
            boxShadow: 'var(--sh)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <span className="sub" style={{ fontSize: 14 }}>
            Trang <b>{page + 1}</b> / <b>{totalPages}</b> · Đang hiển thị{' '}
            <b>{paginatedQuizzes.length}</b> / <b>{totalElements}</b> bài trắc nghiệm
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <motion.button
              type="button"
              className="pagebtn"
              disabled={page === 0}
              onClick={() => changePage(Math.max(0, page - 1))}
              whileTap={page > 0 ? { scale: 0.92 } : undefined}
              whileHover={page > 0 ? { y: -1 } : undefined}
              title="Trang trước"
              style={{ opacity: page === 0 ? 0.45 : 1, cursor: page === 0 ? 'not-allowed' : 'pointer' }}
            >
              ‹
            </motion.button>
            {Array.from({ length: totalPages }, (_, i) => (
              <motion.button
                key={i}
                type="button"
                className={'pagebtn' + (page === i ? ' on' : '')}
                onClick={() => changePage(i)}
                whileTap={{ scale: 0.92 }}
                whileHover={{ y: -1 }}
                style={
                  page === i
                    ? {
                        background: 'var(--primary)',
                        color: '#fff',
                        boxShadow: '0 4px 14px rgba(21, 101, 192, 0.32)',
                        transform: 'scale(1.04)',
                      }
                    : {}
                }
              >
                {i + 1}
              </motion.button>
            ))}
            <motion.button
              type="button"
              className="pagebtn"
              disabled={page >= totalPages - 1}
              onClick={() => changePage(Math.min(totalPages - 1, page + 1))}
              whileTap={page < totalPages - 1 ? { scale: 0.92 } : undefined}
              whileHover={page < totalPages - 1 ? { y: -1 } : undefined}
              title="Trang sau"
              style={{
                opacity: page >= totalPages - 1 ? 0.45 : 1,
                cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer',
              }}
            >
              ›
            </motion.button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
