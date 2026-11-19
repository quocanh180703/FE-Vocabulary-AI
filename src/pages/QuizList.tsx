import { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { quizApi, personalizedApi, errMsg } from '../api';
import type { Quiz, QuizHistoryItem } from '../api';
import { Icon } from '../components/icons';
import { ViMascotImage } from '../components/ViMascotImage';
import { ViLoadingScreen } from '../components/states/ViLoadingScreen';
import { UiIcon } from '../components/UiIcon';
import { ScoreRing, SplitHeading } from '../components/SageEffects';
import { CreateAiQuizModal } from '../components/quiz/CreateAiQuizModal';
import { QuizDetailEditModal } from '../components/quiz/QuizDetailEditModal';
import { QuotaBadge } from '../components/QuotaBadge';
import { useAuth } from '../auth/AuthContext';
import { MotionCard, staggerContainer, staggerItem, AnimatedCounter } from '../motion';

const LEVELS = ['Tất cả', 'Đề xuất cho bạn', 'A1', 'A2', 'B1', 'B2', 'C1'];
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
  const [selectedQuizIdForDetail, setSelectedQuizIdForDetail] = useState<number | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Action confirmation modal (Gửi duyệt, Rút yêu cầu, Ẩn bài)
  interface QuizActionModalState {
    isOpen: boolean;
    type: 'publish' | 'withdraw' | 'hide';
    quizId: number;
    quizTitle: string;
  }
  const [actionModal, setActionModal] = useState<QuizActionModalState>({
    isOpen: false,
    type: 'publish',
    quizId: 0,
    quizTitle: '',
  });
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showActionFeedback = (type: 'success' | 'error', message: string) => {
    setActionFeedback({ type, message });
    setTimeout(() => {
      setActionFeedback(null);
    }, 4500);
  };

  const handleConfirmAction = async () => {
    if (!actionModal.quizId || actionSubmitting) return;
    setActionSubmitting(true);
    try {
      if (actionModal.type === 'publish') {
        await quizApi.publishRequest(actionModal.quizId);
        showActionFeedback('success', `Đã gửi yêu cầu duyệt bài tập "${actionModal.quizTitle}" tới Giảng viên thành công!`);
      } else if (actionModal.type === 'withdraw') {
        await quizApi.withdraw(actionModal.quizId);
        showActionFeedback('success', `Đã rút yêu cầu duyệt bài tập "${actionModal.quizTitle}" về riêng tư.`);
      } else if (actionModal.type === 'hide') {
        await quizApi.hide(actionModal.quizId);
        showActionFeedback('success', `Đã chuyển bài tập "${actionModal.quizTitle}" về chế độ riêng tư.`);
      }
      fetchMyQuizzes(myQuizzesPage);
      setActionModal((prev) => ({ ...prev, isOpen: false }));
    } catch (e: any) {
      showActionFeedback('error', e?.response?.data?.message || errMsg(e) || 'Có lỗi xảy ra khi thực hiện thao tác.');
    } finally {
      setActionSubmitting(false);
    }
  };

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
    if (level === 'Đề xuất cho bạn') {
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
    if (l === 'Đề xuất cho bạn') return allQuizzes.filter(isQuizRecommended).length;
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
    <div className="content">
      <div className="pagehead">
        <div>
          <div className="eyebrow">QUIZ ARENA · LUYỆN TẬP TÍNH GIỜ</div>
          <SplitHeading text="Quiz luyện tập tính giờ" />
          <p className="sub">Chọn một bài để luyện — điểm được tính và phân tích khi bạn nộp bài</p>
        </div>

        {/* Main Tab Navigation inside pagehead for crisp 100dvh fit */}
        <div className="chips">
          <button
            type="button"
            className={'chip' + (activeTab === 'quizzes' ? ' on' : '')}
            onClick={() => handleTabChange('quizzes')}
          >
            <Icon n="book" s={16} /> Bài thi
          </button>
          <button
            type="button"
            className={'chip' + (activeTab === 'my-quizzes' ? ' on' : '')}
            onClick={() => handleTabChange('my-quizzes')}
          >
            <Icon n="user" s={16} /> Bài tập của tôi
          </button>
          <button
            type="button"
            className={'chip' + (activeTab === 'history' ? ' on' : '')}
            onClick={() => handleTabChange('history')}
          >
            <Icon n="clock" s={16} /> Lịch sử làm bài
          </button>
        </div>
      </div>

      {/* ================= TAB 1: BÀI THI ================= */}
      {activeTab === 'quizzes' && (
        <div ref={listRef} className="colstack" style={{ flex: 1, minHeight: 0, gap: 10 }}>
          {weakTopics.length > 0 && (
            <div
              className="card"
              style={{
                padding: '10px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                flexWrap: 'wrap',
                flex: 'none',
              }}
            >
              <div className="row" style={{ gap: 12, flex: 1, minWidth: 240 }}>
                <ViMascotImage
                  pose="encourage"
                  size={44}
                  alt="Vi cổ vũ bạn chọn bài quiz phù hợp để luyện tập"
                />
                <div style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.45 }}>
                  <b style={{ color: 'var(--sage-dark)' }}>Gợi ý thích ứng từ Vi AI:</b> Bạn nên tập trung củng cố chủ đề{' '}
                  <b style={{ color: 'var(--sage-dark)' }}>{weakTopics.join(', ')}</b> (trình độ đề xuất: <b>{recommendedLevel}</b>).
                </div>
              </div>
              <button
                type="button"
                className="btn secondary sm"
                onClick={() => handleLevelChange('Đề xuất cho bạn')}
              >
                Lọc bài AI khuyên làm
              </button>
            </div>
          )}

          {/* Level Filter Chips */}
          <div className="chiprow" style={{ flex: 'none' }}>
            {LEVELS.map((l) => {
              const count = getTabCount(l);
              return (
                <button
                  key={l}
                  type="button"
                  className={'fchip' + (level === l ? ' on' : '')}
                  onClick={() => handleLevelChange(l)}
                >
                  {l === 'Tất cả' ? 'Tất cả trình độ' : l}
                  <span
                    style={{
                      marginLeft: 4,
                      fontSize: 11,
                      fontWeight: 800,
                      padding: '1px 6px',
                      borderRadius: 99,
                      background: level === l ? 'rgba(255,255,255,0.26)' : 'rgba(71,96,63,0.12)',
                      color: level === l ? 'var(--cream)' : 'var(--ink)',
                    }}
                  >
                    <AnimatedCounter value={count} />
                  </span>
                </button>
              );
            })}
          </div>

          {err && <div className="error">{err}</div>}

          {/* Scrollable 2-col Quiz Grid */}
          <div className="long-list" style={{ flex: 1, minHeight: 0, paddingRight: 4 }}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={`${level}-${page}`}
                className="cols2"
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
                exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }}
              >
                {paginatedQuizzes.map((qz) => {
                  const recommended = isQuizRecommended(qz);
                  const mins = qz.timeLimit > 60 ? Math.round(qz.timeLimit / 60) : qz.timeLimit;
                  return (
                    <motion.div key={qz.id} variants={staggerItem}>
                      <MotionCard style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div className="row between" style={{ alignItems: 'flex-start', gap: 10 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <b style={{ fontSize: 16.5, color: 'var(--ink)', display: 'block', lineHeight: 1.3 }}>{qz.title}</b>
                            <div className="tiny muted mt4">
                              {qz.questionCount} câu · giới hạn {mins} phút{qz.category ? ` · ${qz.category}` : ''}
                            </div>
                          </div>
                          <ScoreRing
                            value={Math.min(100, Math.max(25, (qz.questionCount || 10) * 5))}
                            label={`${qz.questionCount}c`}
                            size={52}
                          />
                        </div>

                        <div className="row between" style={{ flexWrap: 'wrap', gap: 8 }}>
                          <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                            <span className="pill level">Cấp {qz.level}</span>
                            {qz.creatorUsername ? (
                              <span className="pill" title={`Người tạo và công khai: @${qz.creatorUsername}`}>
                                <Icon n="user" s={12} /> @{qz.creatorUsername}
                              </span>
                            ) : qz.isAiGenerated ? (
                              <span className="pill">
                                <Icon n="spark" s={12} /> AI tạo
                              </span>
                            ) : null}
                            {recommended ? (
                              <span className="pill greensoft"><UiIcon name="sparkles" size={12} /> AI đề xuất</span>
                            ) : (
                              <span className="pill level">Bấm giờ {mins}p</span>
                            )}
                          </div>
                          <button
                            type="button"
                            className="btn sm"
                            onClick={() => nav(`/quiz/${qz.id}`)}
                          >
                            Bắt đầu làm
                          </button>
                        </div>
                      </MotionCard>
                    </motion.div>
                  );
                })}
              </motion.div>
            </AnimatePresence>

            {filteredQuizzes.length === 0 && !loading && !err && (
              <div className="card center" style={{ padding: '40px 20px', gap: 10 }}>
                <ViMascotImage
                  pose="encourage"
                  size={72}
                  alt="Vi cổ vũ bạn thử trình độ quiz khác"
                />
                <strong style={{ fontSize: 15 }}>
                  {level === 'Đề xuất cho bạn'
                    ? 'Không tìm thấy bài quiz nào trùng với chủ đề đề xuất hiện tại.'
                    : 'Chưa có quiz nào ở trình độ này.'}
                </strong>
              </div>
            )}
          </div>

          {/* Bottom Pagination Bar */}
          {totalPages > 1 && (
            <div className="card row between" style={{ padding: '10px 16px', flex: 'none', flexWrap: 'wrap', gap: 10 }}>
              <span className="tiny muted">
                Trang <b>{page + 1}</b> / <b>{totalPages}</b> · <b>{paginatedQuizzes.length}</b> / <b>{totalElements}</b> bài trắc nghiệm
              </span>
              <div className="row" style={{ gap: 6 }}>
                <button
                  type="button"
                  className="btn secondary sm"
                  disabled={page === 0}
                  onClick={() => changePage(Math.max(0, page - 1))}
                  title="Trang trước"
                >
                  ‹
                </button>
                {Array.from({ length: totalPages }, (_, i) => (
                  <button
                    key={i}
                    type="button"
                    className={page === i ? 'btn sm' : 'btn secondary sm'}
                    onClick={() => changePage(i)}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  type="button"
                  className="btn secondary sm"
                  disabled={page >= totalPages - 1}
                  onClick={() => changePage(Math.min(totalPages - 1, page + 1))}
                  title="Trang sau"
                >
                  ›
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= TAB: BÀI TẬP CỦA TÔI ================= */}
      {activeTab === 'my-quizzes' && (
        <div ref={listRef} className="colstack" style={{ flex: 1, minHeight: 0, gap: 10 }}>
          {/* Header Action Banner */}
          <div
            className="card row between"
            style={{ padding: '12px 18px', gap: 12, flexWrap: 'wrap', flex: 'none' }}
          >
            <div className="row" style={{ gap: 12, flex: 1, minWidth: 240 }}>
              <ViMascotImage
                pose="encourage"
                size={46}
                alt="Vi sẵn sàng biên soạn bài tập AI từ tài liệu của bạn"
              />
              <div>
                <b style={{ fontSize: 15, color: 'var(--ink)', display: 'block' }}>
                  Bài tập AI tạo từ tài liệu
                </b>
                <div className="tiny muted">
                  Tải lên PDF, DOCX, TXT để AI trích xuất từ vựng và tạo trắc nghiệm tính giờ.
                </div>
              </div>
            </div>

            <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
              <QuotaBadge featureKey="exercise_generation" labelSuffix="lượt tạo AI" />
              <button
                type="button"
                className="btn sm"
                onClick={() => setIsCreateModalOpen(true)}
              >
                <Icon n="plus" s={15} /> Tạo bài tập từ tài liệu
              </button>
            </div>
          </div>

          {actionFeedback && (
            <div className={actionFeedback.type === 'success' ? 'ok' : 'error'}>
              {actionFeedback.message}
            </div>
          )}

          {myQuizzesErr && (
            <div className="error row between">
              <span>{myQuizzesErr}</span>
              <button type="button" className="btn ghost sm" onClick={() => fetchMyQuizzes(myQuizzesPage)}>
                Thử lại
              </button>
            </div>
          )}

          <div className="long-list" style={{ flex: 1, minHeight: 0, paddingRight: 4 }}>
            {myQuizzesLoading ? (
              <ViLoadingScreen compact subtitle="Đang tải danh sách bài tập của bạn" />
            ) : myQuizzes.length === 0 && !myQuizzesErr ? (
              <div className="card center" style={{ padding: '44px 20px', gap: 12 }}>
                <ViMascotImage
                  pose="encourage"
                  size={80}
                  alt="Vi mời bạn tạo bài tập AI đầu tiên từ tài liệu"
                />
                <h3 style={{ fontSize: 18, margin: 0 }}>Bạn chưa có bài tập tự tạo nào</h3>
                <p className="sub" style={{ maxWidth: 440, margin: 0 }}>
                  Tải lên tài liệu (.pdf, .docx, .txt) để Vi AI biên soạn bài tập trắc nghiệm riêng cho bạn!
                </p>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setIsCreateModalOpen(true)}
                >
                  <Icon n="spark" s={16} /> Tạo bài tập đầu tiên
                </button>
              </div>
            ) : (
              <div className="cols2">
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
                      <MotionCard style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div className="row between" style={{ alignItems: 'flex-start' }}>
                          <b style={{ fontSize: 16.5, flex: 1, color: 'var(--ink)' }}>{qz.title}</b>
                          <span className="pill level">Cấp {qz.level}</span>
                        </div>

                        <div className="tiny muted">
                          {qz.questionCount} câu · giới hạn {mins} phút{qz.category ? ' · ' + qz.category : ''}
                        </div>

                        <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                          {qz.isAiGenerated && (
                            <span className="pill">
                              <Icon n="spark" s={12} /> Do AI tạo
                            </span>
                          )}
                          {isPublic ? (
                            <span className="pill greensoft"><UiIcon name="globe" size={12} /> Công khai</span>
                          ) : isPending ? (
                            <span className="pill warn">⏳ Chờ duyệt</span>
                          ) : isRejected ? (
                            <span
                              className="pill redsoft"
                              title={qz.reviewNote ? 'Lý do từ chối: ' + qz.reviewNote : 'Bị từ chối duyệt'}
                            >
                              <UiIcon name="warning" size={12} /> Bị từ chối
                            </span>
                          ) : (
                            <span className="pill level"><UiIcon name="lock" size={12} /> Riêng tư</span>
                          )}
                        </div>

                        {isRejected && qz.reviewNote && (
                          <div className="error" style={{ padding: '6px 10px', fontSize: 12 }}>
                            <b>Lý do:</b> {qz.reviewNote}
                          </div>
                        )}

                        <div className="row" style={{ justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
                          {isPending && (
                            <button
                              type="button"
                              className="btn secondary sm"
                              onClick={() => {
                                setActionModal({
                                  isOpen: true,
                                  type: 'withdraw',
                                  quizId: qz.id,
                                  quizTitle: qz.title,
                                });
                              }}
                            >
                              ↩️ Rút yêu cầu
                            </button>
                          )}
                          {isPublic && (
                            <button
                              type="button"
                              className="btn secondary sm"
                              onClick={() => {
                                setActionModal({
                                  isOpen: true,
                                  type: 'hide',
                                  quizId: qz.id,
                                  quizTitle: qz.title,
                                });
                              }}
                            >
                              <UiIcon name="lock" size={13} /> Ẩn bài
                            </button>
                          )}
                          {!isPending && !isPublic && (
                            <button
                              type="button"
                              className="btn secondary sm"
                              onClick={() => {
                                setActionModal({
                                  isOpen: true,
                                  type: 'publish',
                                  quizId: qz.id,
                                  quizTitle: qz.title,
                                });
                              }}
                            >
                              <UiIcon name="rocket" size={13} /> Gửi duyệt
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn ghost sm"
                            onClick={() => {
                              setSelectedQuizIdForDetail(qz.id);
                              setIsDetailModalOpen(true);
                            }}
                          >
                            <Icon n="edit" s={14} /> Chi tiết / Sửa
                          </button>
                          <button
                            type="button"
                            className="btn sm"
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
            )}
          </div>

          {myQuizzesTotalPages > 1 && (
            <div className="card row between" style={{ padding: '10px 16px', flex: 'none', flexWrap: 'wrap', gap: 10 }}>
              <span className="tiny muted">
                Trang <b>{myQuizzesPage + 1}</b> / <b>{myQuizzesTotalPages}</b> · <b>{myQuizzes.length}</b> / <b>{myQuizzesTotalElements}</b> bài tập
              </span>
              <div className="row" style={{ gap: 6 }}>
                <button
                  type="button"
                  className="btn secondary sm"
                  disabled={myQuizzesPage === 0}
                  onClick={() => {
                    const p = Math.max(0, myQuizzesPage - 1);
                    setMyQuizzesPage(p);
                    fetchMyQuizzes(p);
                  }}
                >
                  ‹
                </button>
                {Array.from({ length: myQuizzesTotalPages }, (_, i) => (
                  <button
                    key={i}
                    type="button"
                    className={myQuizzesPage === i ? 'btn sm' : 'btn secondary sm'}
                    onClick={() => {
                      setMyQuizzesPage(i);
                      fetchMyQuizzes(i);
                    }}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  type="button"
                  className="btn secondary sm"
                  disabled={myQuizzesPage >= myQuizzesTotalPages - 1}
                  onClick={() => {
                    const p = Math.min(myQuizzesTotalPages - 1, myQuizzesPage + 1);
                    setMyQuizzesPage(p);
                    fetchMyQuizzes(p);
                  }}
                >
                  ›
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= TAB: LỊCH SỬ LÀM BÀI ================= */}
      {activeTab === 'history' && (
        <div ref={listRef} className="colstack" style={{ flex: 1, minHeight: 0, gap: 10 }}>
          {historyErr && (
            <div className="error row between">
              <span>{historyErr}</span>
              <button type="button" className="btn ghost sm" onClick={() => fetchHistory(historyPage)}>
                Thử lại
              </button>
            </div>
          )}

          <div className="long-list" style={{ flex: 1, minHeight: 0, paddingRight: 4 }}>
            {historyLoading ? (
              <ViLoadingScreen compact subtitle="Đang tải lịch sử làm bài" />
            ) : historyList.length === 0 && !historyErr ? (
              <div className="card center" style={{ padding: '44px 20px', gap: 12 }}>
                <ViMascotImage
                  pose="happy-wave"
                  size={80}
                  alt="Vi chào bạn bắt đầu làm bài quiz đầu tiên"
                />
                <h3 style={{ fontSize: 18, margin: 0 }}>Bạn chưa làm bài trắc nghiệm nào</h3>
                <p className="sub" style={{ maxWidth: 440, margin: 0 }}>
                  Hãy chọn một bài thi ở tab <b>Bài thi</b> để bắt đầu luyện tập tính giờ và xem phân tích chi tiết.
                </p>
                <button
                  type="button"
                  className="btn"
                  onClick={() => handleTabChange('quizzes')}
                >
                  Về danh sách bài thi
                </button>
              </div>
            ) : (
              <div className="cols2">
                {historyList.map((item) => {
                  const pct =
                    item.totalQuestions > 0
                      ? Math.round((item.correctAnswers / item.totalQuestions) * 100)
                      : Math.round(item.score || 0);
                  const isPassed = pct >= 80;
                  const isMedium = pct >= 50;

                  return (
                    <motion.div
                      key={item.attemptId}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <MotionCard style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div className="row between" style={{ alignItems: 'flex-start', gap: 12 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <b style={{ fontSize: 16.5, display: 'block', color: 'var(--ink)', wordBreak: 'break-word' }}>
                              {item.quizTitle}
                            </b>
                            <div className="tiny muted mt4">
                              Nộp lúc: <b>{formatDateTime(item.submittedAt)}</b>
                            </div>
                          </div>
                          <ScoreRing
                            value={pct}
                            label={`${pct}%`}
                            size={56}
                            accentColor={isPassed ? 'var(--success)' : isMedium ? 'var(--sage)' : 'var(--danger)'}
                          />
                        </div>

                        <div className="row between" style={{ flexWrap: 'wrap', gap: 8 }}>
                          <div className="row" style={{ gap: 8 }}>
                            <span className={'pill ' + (isPassed ? 'greensoft' : isMedium ? 'level' : 'redsoft')}>
                              {item.correctAnswers}/{item.totalQuestions} câu
                            </span>
                            <span className="pill level">⏱️ {formatDuration(item.timeTaken)}</span>
                            <span className="pill level"><UiIcon name="target" size={12} /> {item.score}đ</span>
                          </div>
                          <div className="row" style={{ gap: 8 }}>
                            <button
                              type="button"
                              className="btn secondary sm"
                              onClick={() => nav(`/quiz/${item.quizId}/result?attemptId=${item.attemptId}`)}
                            >
                              Xem lại
                            </button>
                            <button
                              type="button"
                              className="btn sm"
                              onClick={() => nav(`/quiz/${item.quizId}`)}
                            >
                              Làm lại
                            </button>
                          </div>
                        </div>
                      </MotionCard>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {historyTotalPages > 1 && (
            <div className="card row between" style={{ padding: '10px 16px', flex: 'none', flexWrap: 'wrap', gap: 10 }}>
              <span className="tiny muted">
                Trang <b>{historyPage + 1}</b> / <b>{historyTotalPages}</b> · <b>{historyList.length}</b> / <b>{historyTotalElements}</b> bài đã làm
              </span>
              <div className="row" style={{ gap: 6 }}>
                <button
                  type="button"
                  className="btn secondary sm"
                  disabled={historyPage === 0}
                  onClick={() => changeHistoryPage(Math.max(0, historyPage - 1))}
                >
                  ‹
                </button>
                {Array.from({ length: historyTotalPages }, (_, i) => (
                  <button
                    key={i}
                    type="button"
                    className={historyPage === i ? 'btn sm' : 'btn secondary sm'}
                    onClick={() => changeHistoryPage(i)}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  type="button"
                  className="btn secondary sm"
                  disabled={historyPage >= historyTotalPages - 1}
                  onClick={() => changeHistoryPage(Math.min(historyTotalPages - 1, historyPage + 1))}
                >
                  ›
                </button>
              </div>
            </div>
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
      <QuizDetailEditModal
        quizId={selectedQuizIdForDetail}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedQuizIdForDetail(null);
        }}
        onUpdated={() => {
          fetchMyQuizzes(myQuizzesPage);
        }}
        onDeleted={() => {
          fetchMyQuizzes(0);
        }}
        onStartQuiz={(quizId) => nav('/quiz/' + quizId)}
      />

      {/* Action Confirmation Modal (Gửi duyệt, Rút yêu cầu, Ẩn bài) */}
      {actionModal.isOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget && !actionSubmitting) {
              setActionModal((prev) => ({ ...prev, isOpen: false }));
            }
          }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            backgroundColor: 'rgba(12, 20, 11, 0.56)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94 }}
            transition={{ duration: 0.2 }}
            className="card"
            style={{
              width: '100%',
              maxWidth: 460,
              padding: '24px 24px 20px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background:
                  actionModal.type === 'publish'
                    ? 'rgba(71, 96, 63, 0.14)'
                    : actionModal.type === 'withdraw'
                    ? 'var(--amber-bg)'
                    : 'rgba(71, 96, 63, 0.08)',
                color:
                  actionModal.type === 'publish'
                    ? 'var(--sage-dark)'
                    : actionModal.type === 'withdraw'
                    ? 'var(--amber-dark)'
                    : 'var(--muted)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 14,
              }}
            >
              {actionModal.type === 'publish' && <Icon n="send" s={24} />}
              {actionModal.type === 'withdraw' && <Icon n="arrowLeft" s={24} />}
              {actionModal.type === 'hide' && <Icon n="lock" s={24} />}
            </div>

            <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--ink)', margin: '0 0 8px' }}>
              {actionModal.type === 'publish' && 'Gửi bài tập cho Giảng viên duyệt'}
              {actionModal.type === 'withdraw' && 'Rút yêu cầu duyệt bài tập'}
              {actionModal.type === 'hide' && 'Chuyển bài tập về riêng tư'}
            </h3>

            <div style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.55, margin: '0 0 16px' }}>
              {actionModal.type === 'publish' && (
                <p style={{ margin: 0 }}>
                  Bạn có chắc muốn gửi đề thi <b>"{actionModal.quizTitle}"</b> cho Giảng viên duyệt để công khai cho cộng đồng?
                </p>
              )}
              {actionModal.type === 'withdraw' && (
                <p style={{ margin: 0 }}>
                  Bạn có chắc muốn rút yêu cầu duyệt đề thi <b>"{actionModal.quizTitle}"</b> về chế độ riêng tư?
                </p>
              )}
              {actionModal.type === 'hide' && (
                <p style={{ margin: 0 }}>
                  Chuyển đề thi <b>"{actionModal.quizTitle}"</b> về chế độ riêng tư (chỉ bạn thấy)? Người khác sẽ không thấy bài này trong danh sách chung nữa.
                </p>
              )}
            </div>

            <div
              style={{
                borderRadius: 12,
                padding: '12px 14px',
                fontSize: 12.5,
                lineHeight: 1.5,
                textAlign: 'left',
                marginBottom: 20,
                display: 'flex',
                gap: 10,
                alignItems: 'flex-start',
                background: actionModal.type === 'withdraw' ? 'var(--amber-bg)' : 'rgba(71, 96, 63, 0.1)',
                border: `1px solid ${actionModal.type === 'withdraw' ? 'rgba(201,134,47,0.3)' : 'rgba(71,96,63,0.22)'}`,
                color: actionModal.type === 'withdraw' ? 'var(--amber-dark)' : 'var(--ink)',
              }}
            >
              <div style={{ flexShrink: 0, marginTop: 1 }}>
                <Icon n={actionModal.type === 'publish' ? 'spark' : 'alert'} s={16} />
              </div>
              <div>
                {actionModal.type === 'publish' && (
                  <span>
                    Sau khi Giảng viên phê duyệt, bài tập sẽ xuất hiện công khai để tất cả học viên cùng luyện tập.
                  </span>
                )}
                {actionModal.type === 'withdraw' && (
                  <span>
                    Bài tập sẽ trở về trạng thái riêng tư và bạn có thể chỉnh sửa lại nội dung bất cứ lúc nào.
                  </span>
                )}
                {actionModal.type === 'hide' && (
                  <span>
                    Bài tập sẽ được ẩn khỏi danh sách chung. Bạn vẫn có thể luyện tập trong mục Bài tập của tôi.
                  </span>
                )}
              </div>
            </div>

            <div className="row" style={{ gap: 10 }}>
              <button
                type="button"
                className="btn secondary"
                style={{ flex: 1 }}
                onClick={() => setActionModal((prev) => ({ ...prev, isOpen: false }))}
                disabled={actionSubmitting}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="btn"
                style={{ flex: 1.25 }}
                onClick={handleConfirmAction}
                disabled={actionSubmitting}
              >
                {actionSubmitting ? 'Đang xử lý...' : (
                  <>
                    {actionModal.type === 'publish' && 'Xác nhận gửi duyệt'}
                    {actionModal.type === 'withdraw' && 'Rút yêu cầu'}
                    {actionModal.type === 'hide' && 'Chuyển riêng tư'}
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
