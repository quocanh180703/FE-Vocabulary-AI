import { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { quizApi, personalizedApi, errMsg } from '../api';
import type { Quiz, QuizHistoryItem } from '../api';
import { Mascot, Icon } from '../components/icons';
import { CreateAiQuizModal } from '../components/quiz/CreateAiQuizModal';
import { QuotaBadge } from '../components/QuotaBadge';
import { useAuth } from '../auth/AuthContext';
import { MotionCard, staggerContainer, staggerItem, AnimatedCounter } from '../motion';

const LEVELS = ['Tất cả', '🎯 Đề xuất cho bạn', 'A1', 'A2', 'B1', 'B2', 'C1'];
const QUIZ_PAGE_SIZE = 10;
const HISTORY_PAGE_SIZE = 6;

export default function QuizList() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const initialTab = tabParam === 'history' ? 'history' : tabParam === 'my-quizzes' ? 'my-quizzes' : 'quizzes';
  const [activeTab, setActiveTab] = useState<'quizzes' | 'my-quizzes' | 'history'>(initialTab);

  const [allQuizzes, setAllQuizzes] = useState<Quiz[]>([]);
  const [level, setLevel] = useState('Tất cả');
  const [page, setPage] = useState(0);
  const [weakTopics, setWeakTopics] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const nav = useNavigate();
  const listRef = useRef<HTMLDivElement>(null);

  // History tab states (6 bài mỗi trang)
  const [historyList, setHistoryList] = useState<QuizHistoryItem[]>([]);
  const [historyPage, setHistoryPage] = useState(0);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [historyTotalElements, setHistoryTotalElements] = useState(0);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyErr, setHistoryErr] = useState('');
  const [historyLoaded, setHistoryLoaded] = useState(false);

  // My Quizzes tab states
  const [myQuizzes, setMyQuizzes] = useState<Quiz[]>([]);
  const [myQuizzesPage, setMyQuizzesPage] = useState(0);
  const [myQuizzesTotalPages, setMyQuizzesTotalPages] = useState(1);
  const [myQuizzesTotalElements, setMyQuizzesTotalElements] = useState(0);
  const [myQuizzesLoading, setMyQuizzesLoading] = useState(false);
  const [myQuizzesErr, setMyQuizzesErr] = useState('');
  const [myQuizzesLoaded, setMyQuizzesLoaded] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

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

  const fetchHistory = (pageToFetch: number = historyPage) => {
    setHistoryLoading(true);
    setHistoryErr('');
    quizApi.history({ page: pageToFetch, size: HISTORY_PAGE_SIZE })
      .then(({ data }) => {
        const raw = Array.isArray(data?.content) ? data.content : [];
        setHistoryList(raw);
        setHistoryTotalPages(data?.totalPages || 1);
        setHistoryTotalElements(data?.totalElements || raw.length);
        setHistoryLoaded(true);
        setHistoryLoading(false);
      })
      .catch((e) => {
        setHistoryErr(errMsg(e) || 'Không thể tải lịch sử làm bài');
        setHistoryLoading(false);
      });
  };

  const fetchMyQuizzes = (pageToFetch: number = myQuizzesPage) => {
    setMyQuizzesLoading(true);
    setMyQuizzesErr('');
    quizApi.myQuizzes({ page: pageToFetch, size: QUIZ_PAGE_SIZE })
      .then(({ data }) => {
        const raw = Array.isArray(data?.content) ? data.content : [];
        setMyQuizzes(raw);
        setMyQuizzesTotalPages(data?.totalPages || 1);
        setMyQuizzesTotalElements(data?.totalElements || raw.length);
        setMyQuizzesLoaded(true);
        setMyQuizzesLoading(false);
      })
      .catch((e) => {
        setMyQuizzesErr(errMsg(e) || 'Không thể tải danh sách bài tập của bạn');
        setMyQuizzesLoading(false);
      });
  };

  // Sync tab with URL search parameter
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'history' && activeTab !== 'history') {
      setActiveTab('history');
      if (!historyLoaded) {
        fetchHistory(0);
      }
    } else if (tabParam === 'my-quizzes' && activeTab !== 'my-quizzes') {
      setActiveTab('my-quizzes');
      if (!myQuizzesLoaded) {
        fetchMyQuizzes(0);
      }
    } else if (!tabParam && activeTab !== 'quizzes') {
      setActiveTab('quizzes');
    }
  }, [searchParams]);

  // Load initial tab data
  useEffect(() => {
    if (initialTab === 'history') {
      fetchHistory(0);
    } else if (initialTab === 'my-quizzes') {
      fetchMyQuizzes(0);
    }
  }, []);

  const handleTabChange = (t: 'quizzes' | 'my-quizzes' | 'history') => {
    setActiveTab(t);
    setSearchParams(t === 'quizzes' ? {} : { tab: t });
    if (t === 'history') {
      setHistoryPage(0);
      fetchHistory(0);
    } else if (t === 'my-quizzes') {
      setMyQuizzesPage(0);
      fetchMyQuizzes(0);
    }
  };

  const changeHistoryPage = (newPage: number) => {
    if (newPage === historyPage) return;
    setHistoryPage(newPage);
    fetchHistory(newPage);
    listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

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
  const totalPages = Math.ceil(totalElements / QUIZ_PAGE_SIZE) || 1;

  useEffect(() => {
    if (page >= totalPages && totalPages > 0) {
      setPage(0);
    }
  }, [totalPages, page]);

  const paginatedQuizzes = useMemo(() => {
    const start = page * QUIZ_PAGE_SIZE;
    return filteredQuizzes.slice(start, start + QUIZ_PAGE_SIZE);
  }, [filteredQuizzes, page]);

  const getTabCount = (l: string) => {
    if (l === 'Tất cả') return allQuizzes.length;
    if (l === '🎯 Đề xuất cho bạn') return allQuizzes.filter(isQuizRecommended).length;
    return allQuizzes.filter((q) => (q.level || '').toUpperCase() === l.toUpperCase()).length;
  };

  const formatDateTime = (isoString?: string) => {
    if (!isoString) return '--';
    try {
      const d = new Date(isoString);
      return d.toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  const formatDuration = (seconds?: number) => {
    if (seconds == null || isNaN(seconds)) return '--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="content" style={{ maxWidth: 1600 }}>
      <div className="pagehead">
        <h1>Quiz luyện tập tính giờ</h1>
        <div className="sub">Chọn một bài để luyện — điểm được tính khi bạn nộp bài</div>
      </div>

      {/* Main Tab Navigation: Bài thi vs Lịch sử làm bài */}
      <div className="chips" style={{ marginBottom: 20, gap: 10 }}>
        <button
          className={'chip' + (activeTab === 'quizzes' ? ' on' : '')}
          onClick={() => handleTabChange('quizzes')}
          style={{ padding: '8px 20px', fontSize: 14, fontWeight: 700 }}
        >
          <Icon n="book" s={18} /> Bài thi
        </button>
        <button
          className={'chip' + (activeTab === 'history' ? ' on' : '')}
          onClick={() => handleTabChange('history')}
          style={{ padding: '8px 20px', fontSize: 14, fontWeight: 700 }}
        >
          <Icon n="clock" s={18} /> Lịch sử làm bài
        </button>
      </div>

      {/* ================= TAB 1: BÀI THI ================= */}
      {activeTab === 'quizzes' && (
        <>
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
                    <AnimatedCounter value={count} />
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
              style={{ gridTemplateColumns: '1fr 1fr' }}
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }}
            >
              {paginatedQuizzes.map((qz) => {
                const recommended = isQuizRecommended(qz);
                return (
                  <motion.div key={qz.id} variants={staggerItem}>
                    <MotionCard>
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
                    </MotionCard>
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

          {/* Pagination Controls */}
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
        </>
      )}

      {/* ================= TAB: BÀI TẬP CỦA TÔI ================= */}
      {activeTab === 'my-quizzes' && (
        <div ref={listRef}>
          {/* Header Action Banner */}
          <div
            className="card"
            style={{
              background: 'linear-gradient(135deg, #FAF5FF 0%, #EEF2FF 100%)',
              border: '1px solid #DDD6FE',
              padding: '18px 24px',
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              flexWrap: 'wrap',
              borderRadius: 18,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  background: 'linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(124, 58, 237, 0.25)',
                }}
              >
                <Icon n="spark" s={22} />
              </div>
              <div>
                <b style={{ fontSize: 16, color: '#1E1B4B', display: 'block' }}>
                  Bài tập AI tạo từ tài liệu
                </b>
                <div style={{ fontSize: 13, color: '#475569', marginTop: 2 }}>
                  Tải lên tài liệu PDF, DOCX, TXT để AI tự động trích xuất kiến thức và tạo bài trắc nghiệm tính giờ.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <QuotaBadge featureKey="exercise_generation" labelSuffix="lượt tạo AI" />
              <button
                className="btn primary"
                onClick={() => setIsCreateModalOpen(true)}
                style={{
                  minHeight: 40,
                  padding: '0 20px',
                  fontSize: 13.5,
                  fontWeight: 800,
                  background: 'linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%)',
                  border: 'none',
                  boxShadow: '0 4px 12px rgba(99, 102, 241, 0.28)',
                }}
              >
                <Icon n="plus" s={16} /> Tạo bài tập từ tài liệu
              </button>
            </div>
          </div>

          {myQuizzesErr && (
            <div
              style={{
                background: '#FEF2F2',
                border: '1px solid #FCA5A5',
                borderRadius: 14,
                padding: '14px 18px',
                marginBottom: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <div style={{ color: '#B91C1C', fontSize: 14, fontWeight: 600 }}>{myQuizzesErr}</div>
              <button
                className="btn ghost sm"
                onClick={() => fetchMyQuizzes(myQuizzesPage)}
                style={{ borderColor: '#FCA5A5', color: '#B91C1C' }}
              >
                Thử lại
              </button>
            </div>
          )}

          {myQuizzesLoading ? (
            <div style={{ textAlign: 'center', padding: '60px 16px' }}>
              <div className="spinner" style={{ margin: '0 auto 16px' }} />
              <div className="sub">Đang tải danh sách bài tập của bạn...</div>
            </div>
          ) : myQuizzes.length === 0 && !myQuizzesErr ? (
            <div
              className="card"
              style={{
                textAlign: 'center',
                padding: '56px 20px',
                borderRadius: 20,
                background: '#fff',
                boxShadow: 'var(--sh)',
              }}
            >
              <div style={{ marginBottom: 14 }}>
                <Mascot s={64} />
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--ink)' }}>
                Bạn chưa có bài tập tự tạo nào
              </h3>
              <p className="sub mt8" style={{ maxWidth: 460, margin: '8px auto 24px', lineHeight: 1.5 }}>
                Tải lên tài liệu (.pdf, .docx, .txt) của bài giảng hoặc giáo trình để Vi AI biên soạn bài tập trắc nghiệm riêng cho bạn!
              </p>
              <button
                className="btn primary"
                onClick={() => setIsCreateModalOpen(true)}
                style={{
                  padding: '10px 24px',
                  fontWeight: 800,
                  background: 'linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%)',
                  border: 'none',
                }}
              >
                <Icon n="spark" s={18} /> Tạo bài tập đầu tiên
              </button>
            </div>
          ) : (
            <>
              {/* Grid 2 cột */}
              <div className="cols2" style={{ gridTemplateColumns: '1fr 1fr' }}>
                {myQuizzes.map((qz) => {
                  const mins = qz.timeLimit > 60 ? Math.round(qz.timeLimit / 60) : qz.timeLimit;
                  const isPending = qz.visibility === 'PENDING';
                  const isRejected = qz.visibility === 'REJECTED';
                  const isPublic = qz.visibility === 'PUBLIC';

                  return (
                    <motion.div
                      key={qz.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <MotionCard>
                        <div className="row" style={{ alignItems: 'flex-start' }}>
                          <b style={{ fontSize: '18px', flex: 1, color: 'var(--ink)' }}>{qz.title}</b>
                          <span className="pill level">Cấp {qz.level}</span>
                        </div>

                        <div className="sub mt8">
                          {qz.questionCount} câu · giới hạn {mins} phút{qz.category ? ' · ' + qz.category : ''}
                        </div>

                        {/* Badges row */}
                        <div className="row mt12" style={{ gap: 8, flexWrap: 'wrap' }}>
                          {/* Sparkle AI Badge */}
                          <span
                            className="pill"
                            style={{
                              background: '#F3E8FF',
                              color: '#7E22CE',
                              border: '1px solid #D8B4FE',
                              fontWeight: 700,
                              fontSize: 12,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <Icon n="spark" s={13} /> Do AI tạo
                          </span>

                          {/* Visibility Badge */}
                          {isPublic ? (
                            <span
                              className="pill"
                              style={{
                                background: '#DCFCE7',
                                color: '#15803D',
                                border: '1px solid #86EFAC',
                                fontWeight: 700,
                                fontSize: 12,
                              }}
                            >
                              🌐 Công khai
                            </span>
                          ) : isPending ? (
                            <span
                              className="pill"
                              style={{
                                background: '#FEF3C7',
                                color: '#B45309',
                                border: '1px solid #FCD34D',
                                fontWeight: 700,
                                fontSize: 12,
                              }}
                            >
                              ⏳ Chờ duyệt
                            </span>
                          ) : isRejected ? (
                            <span
                              className="pill"
                              style={{
                                background: '#FEE2E2',
                                color: '#B91C1C',
                                border: '1px solid #FCA5A5',
                                fontWeight: 700,
                                fontSize: 12,
                              }}
                              title={qz.reviewNote ? 'Lý do từ chối: ' + qz.reviewNote : 'Bị từ chối duyệt'}
                            >
                              ⚠️ Bị từ chối
                            </span>
                          ) : (
                            <span
                              className="pill"
                              style={{
                                background: '#F1F5F9',
                                color: '#475569',
                                border: '1px solid #CBD5E1',
                                fontWeight: 700,
                                fontSize: 12,
                              }}
                            >
                              🔒 Riêng tư
                            </span>
                          )}
                        </div>

                        {/* Review note if rejected */}
                        {isRejected && qz.reviewNote && (
                          <div
                            style={{
                              marginTop: 10,
                              padding: '8px 12px',
                              borderRadius: 8,
                              background: '#FEF2F2',
                              border: '1px solid #FCA5A5',
                              fontSize: 12.5,
                              color: '#B91C1C',
                            }}
                          >
                            <b>Lý do:</b> {qz.reviewNote}
                          </div>
                        )}

                        <div className="row mt16" style={{ justifyContent: 'flex-end', gap: 10 }}>
                          <button
                            className="btn primary sm"
                            style={{ minHeight: 40, padding: '0 20px', fontWeight: 800 }}
                            onClick={() => nav('/quiz/' + qz.id)}
                          >
                            Bắt đầu làm
                          </button>
                        </div>
                      </MotionCard>
                    </motion.div>
                  );
                })}
              </div>

              {/* My Quizzes Pagination */}
              {myQuizzesTotalPages > 1 && (
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
                    Trang <b>{myQuizzesPage + 1}</b> / <b>{myQuizzesTotalPages}</b> · Đang hiển thị{' '}
                    <b>{myQuizzes.length}</b> / <b>{myQuizzesTotalElements}</b> bài tập
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <motion.button
                      type="button"
                      className="pagebtn"
                      disabled={myQuizzesPage === 0}
                      onClick={() => {
                        const p = Math.max(0, myQuizzesPage - 1);
                        setMyQuizzesPage(p);
                        fetchMyQuizzes(p);
                      }}
                      title="Trang trước"
                      style={{
                        opacity: myQuizzesPage === 0 ? 0.45 : 1,
                        cursor: myQuizzesPage === 0 ? 'not-allowed' : 'pointer',
                      }}
                    >
                      ‹
                    </motion.button>
                    {Array.from({ length: myQuizzesTotalPages }, (_, i) => (
                      <motion.button
                        key={i}
                        type="button"
                        className={'pagebtn' + (myQuizzesPage === i ? ' on' : '')}
                        onClick={() => {
                          setMyQuizzesPage(i);
                          fetchMyQuizzes(i);
                        }}
                        style={
                          myQuizzesPage === i
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
                      disabled={myQuizzesPage >= myQuizzesTotalPages - 1}
                      onClick={() => {
                        const p = Math.min(myQuizzesTotalPages - 1, myQuizzesPage + 1);
                        setMyQuizzesPage(p);
                        fetchMyQuizzes(p);
                      }}
                      title="Trang sau"
                      style={{
                        opacity: myQuizzesPage >= myQuizzesTotalPages - 1 ? 0.45 : 1,
                        cursor: myQuizzesPage >= myQuizzesTotalPages - 1 ? 'not-allowed' : 'pointer',
                      }}
                    >
                      ›
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </>
          )}
        </div>
      )}

      {/* ================= TAB 2: LỊCH SỬ LÀM BÀI (6 bài mỗi trang) ================= */}
      {activeTab === 'history' && (
        <div ref={listRef}>
          {historyErr && (
            <div
              style={{
                background: '#FEF2F2',
                border: '1px solid #FCA5A5',
                borderRadius: 14,
                padding: '14px 18px',
                marginBottom: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <div style={{ color: '#B91C1C', fontSize: 14, fontWeight: 600 }}>{historyErr}</div>
              <button
                className="btn ghost sm"
                onClick={() => fetchHistory(historyPage)}
                style={{ borderColor: '#FCA5A5', color: '#B91C1C' }}
              >
                Thử lại
              </button>
            </div>
          )}

          {historyLoading ? (
            <div style={{ textAlign: 'center', padding: '60px 16px' }}>
              <div className="spinner" style={{ margin: '0 auto 16px' }} />
              <div className="sub">Đang tải lịch sử làm bài...</div>
            </div>
          ) : historyList.length === 0 && !historyErr ? (
            <div
              className="card"
              style={{
                textAlign: 'center',
                padding: '56px 20px',
                borderRadius: 20,
                background: '#fff',
                boxShadow: 'var(--sh)',
              }}
            >
              <div style={{ marginBottom: 14 }}>
                <Mascot s={64} />
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--ink)' }}>
                Bạn chưa làm bài trắc nghiệm nào
              </h3>
              <p className="sub mt8" style={{ maxWidth: 460, margin: '8px auto 24px', lineHeight: 1.5 }}>
                Hãy chọn một bài thi ở tab <b>Bài thi</b> để bắt đầu luyện tập tính giờ và kiểm tra kiến thức. Toàn bộ lịch sử điểm số sẽ hiển thị tại đây!
              </p>
              <button
                className="btn primary"
                onClick={() => handleTabChange('quizzes')}
                style={{ padding: '10px 24px', fontWeight: 800 }}
              >
                Về danh sách bài thi
              </button>
            </div>
          ) : (
            <>
              {/* Grid 2 cột: hiển thị tối đa 6 bài (3 hàng) mỗi trang */}
              <div className="cols2" style={{ gridTemplateColumns: '1fr 1fr' }}>
                {historyList.map((item) => {
                  const pct =
                    item.totalQuestions > 0
                      ? Math.round((item.correctAnswers / item.totalQuestions) * 100)
                      : Math.round(item.score || 0);
                  const isPassed = pct >= 80;
                  const isMedium = pct >= 50;
                  const badgeColor = isPassed ? '#15803D' : isMedium ? 'var(--primary)' : '#DC2626';
                  const badgeBg = isPassed ? '#DCFCE7' : isMedium ? '#EFF6FF' : '#FEE2E2';

                  return (
                    <motion.div
                      key={item.attemptId}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <MotionCard>
                        <div
                          className="row"
                          style={{
                            alignItems: 'flex-start',
                            justifyContent: 'space-between',
                            gap: 12,
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <b
                              style={{
                                fontSize: '18px',
                                display: 'block',
                                color: 'var(--ink)',
                                wordBreak: 'break-word',
                              }}
                            >
                              {item.quizTitle}
                            </b>
                            <div className="sub mt4" style={{ fontSize: 13, color: '#64748B' }}>
                              Nộp lúc: <b>{formatDateTime(item.submittedAt)}</b>
                            </div>
                          </div>
                          <span
                            className="pill"
                            style={{
                              background: badgeBg,
                              color: badgeColor,
                              fontWeight: 800,
                              fontSize: 13.5,
                              padding: '5px 12px',
                              borderRadius: 99,
                              whiteSpace: 'nowrap',
                              border: `1px solid ${badgeColor}33`,
                            }}
                          >
                            {pct}% ({item.correctAnswers}/{item.totalQuestions})
                          </span>
                        </div>

                        <div
                          className="row mt12"
                          style={{
                            fontSize: 13.5,
                            color: '#475569',
                            background: '#F8FAFC',
                            padding: '8px 14px',
                            borderRadius: 10,
                          }}
                        >
                          <span>⏱️ Thời gian: <b>{formatDuration(item.timeTaken)}</b></span>
                          <span>🎯 Điểm số: <b>{item.score}đ</b></span>
                        </div>

                        <div className="row mt16" style={{ gap: 10, justifyContent: 'flex-end' }}>
                          <button
                            className="btn ghost sm"
                            style={{
                              minHeight: 38,
                              padding: '0 16px',
                              fontWeight: 700,
                              fontSize: 13.5,
                            }}
                            onClick={() => nav(`/quiz/${item.quizId}/result?attemptId=${item.attemptId}`)}
                          >
                            🔍 Xem lại
                          </button>
                          <button
                            className="btn primary sm"
                            style={{
                              minHeight: 38,
                              padding: '0 16px',
                              fontWeight: 700,
                              fontSize: 13.5,
                            }}
                            onClick={() => nav(`/quiz/${item.quizId}`)}
                          >
                            🔄 Làm lại
                          </button>
                        </div>
                      </MotionCard>
                    </motion.div>
                  );
                })}
              </div>

              {/* History Pagination: 6 bài mỗi trang */}
              {historyTotalPages > 1 && (
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
                    Trang <b>{historyPage + 1}</b> / <b>{historyTotalPages}</b> · Đang hiển thị{' '}
                    <b>{historyList.length}</b> / <b>{historyTotalElements}</b> bài đã làm
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <motion.button
                      type="button"
                      className="pagebtn"
                      disabled={historyPage === 0}
                      onClick={() => changeHistoryPage(Math.max(0, historyPage - 1))}
                      whileTap={historyPage > 0 ? { scale: 0.92 } : undefined}
                      whileHover={historyPage > 0 ? { y: -1 } : undefined}
                      title="Trang trước"
                      style={{
                        opacity: historyPage === 0 ? 0.45 : 1,
                        cursor: historyPage === 0 ? 'not-allowed' : 'pointer',
                      }}
                    >
                      ‹
                    </motion.button>
                    {Array.from({ length: historyTotalPages }, (_, i) => (
                      <motion.button
                        key={i}
                        type="button"
                        className={'pagebtn' + (historyPage === i ? ' on' : '')}
                        onClick={() => changeHistoryPage(i)}
                        whileTap={{ scale: 0.92 }}
                        whileHover={{ y: -1 }}
                        style={
                          historyPage === i
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
                      disabled={historyPage >= historyTotalPages - 1}
                      onClick={() => changeHistoryPage(Math.min(historyTotalPages - 1, historyPage + 1))}
                      whileTap={historyPage < historyTotalPages - 1 ? { scale: 0.92 } : undefined}
                      whileHover={historyPage < historyTotalPages - 1 ? { y: -1 } : undefined}
                      title="Trang sau"
                      style={{
                        opacity: historyPage >= historyTotalPages - 1 ? 0.45 : 1,
                        cursor: historyPage >= historyTotalPages - 1 ? 'not-allowed' : 'pointer',
                      }}
                    >
                      ›
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </>
          )}
        </div>
      )}
      <CreateAiQuizModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          handleTabChange('my-quizzes');
          fetchMyQuizzes(0);
        }}
        onStartQuiz={(quizId) => nav('/quiz/' + quizId)}
      />
    </div>
  );
}
