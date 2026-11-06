import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { adminApi, quizApi } from '../../api';
import type { AdminQuiz, QuizDetail } from '../../api';
import { useAuth } from '../../auth/AuthContext';
import { Icon } from '../../components/icons';
import { MotionCard, AnimatedCounter, staggerContainer, staggerItem } from '../../motion';

const LEVELS = ['ALL', 'A1', 'A2', 'B1', 'B2', 'C1'];
const PAGE_SIZE = 10;

function generatePageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i);
  }
  if (current <= 3) {
    return [0, 1, 2, 3, 4, '...', total - 1];
  }
  if (current >= total - 4) {
    return [0, '...', total - 5, total - 4, total - 3, total - 2, total - 1];
  }
  return [0, '...', current - 1, current, current + 1, '...', total - 1];
}

export default function AdminQuizzes() {
  const { user } = useAuth();
  const isInstructor = user?.role === 'INSTRUCTOR';
  const [quizzes, setQuizzes] = useState<AdminQuiz[]>([]);
  const [levelFilter, setLevelFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<AdminQuiz | null>(null);
  const [managingQuiz, setManagingQuiz] = useState<AdminQuiz | null>(null);
  const [quizDetails, setQuizDetails] = useState<QuizDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => {
    if (showCreateModal || editingQuiz || managingQuiz) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showCreateModal, editingQuiz, managingQuiz]);

  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);

  // Quiz Form
  const [quizForm, setQuizForm] = useState({
    title: '',
    level: 'A1',
    timeLimit: 600,
    description: '',
    status: 'PUBLISHED',
  });

  // Question Form
  const [questionForm, setQuestionForm] = useState({
    content: '',
    options: ['', '', '', ''],
    correctAnswer: 0,
    explanation: '',
  });

  const fetchQuizzes = async () => {
    setLoading(true);
    try {
      const res = await adminApi.quizzes(0, 1000);
      if (res.data) {
        setQuizzes(res.data.content || []);
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const openCreate = () => {
    setQuizForm({
      title: '',
      level: 'A1',
      timeLimit: 600,
      description: '',
      status: 'PUBLISHED',
    });
    setShowCreateModal(true);
  };

  const openEdit = (q: AdminQuiz) => {
    setEditingQuiz(q);
    setQuizForm({
      title: q.title,
      level: q.level || 'A1',
      timeLimit: q.timeLimit || 600,
      description: q.description || '',
      status: q.status || 'PUBLISHED',
    });
  };

  const handleSaveQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quizForm.title.trim()) {
      alert('Vui lòng nhập tiêu đề bài thi');
      return;
    }
    setSubmitting(true);
    try {
      if (editingQuiz) {
        await adminApi.updateQuiz(editingQuiz.id, quizForm, quizForm.status);
        setMessage({ text: `Đã cập nhật bài trắc nghiệm #${editingQuiz.id}!` });
        setEditingQuiz(null);
      } else {
        await adminApi.createQuiz(quizForm);
        setMessage({ text: 'Đã tạo bài trắc nghiệm mới thành công!' });
        setShowCreateModal(false);
      }
      await fetchQuizzes();
      setTimeout(() => setMessage(null), 4000);
    } catch (e: any) {
      alert('Lỗi lưu bài trắc nghiệm: ' + (e?.message || 'Lỗi server'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteQuiz = async (q: AdminQuiz) => {
    if (!confirm(`Bạn có chắc muốn xóa đề thi "${q.title}" và toàn bộ câu hỏi liên quan?`)) return;
    try {
      await adminApi.deleteQuiz(q.id);
      setMessage({ text: `Đã xóa bài trắc nghiệm "${q.title}"!` });
      await fetchQuizzes();
      setTimeout(() => setMessage(null), 4000);
    } catch (e: any) {
      alert('Lỗi khi xóa bài: ' + (e?.message || 'Không thể xóa'));
    }
  };

  const openManageQuestions = async (q: AdminQuiz) => {
    setManagingQuiz(q);
    setDetailLoading(true);
    try {
      const res = await quizApi.detail(q.id);
      if (res.data) {
        setQuizDetails(res.data);
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!managingQuiz) return;
    if (!questionForm.content.trim()) {
      alert('Vui lòng nhập nội dung câu hỏi');
      return;
    }
    if (questionForm.options.some((opt) => !opt.trim())) {
      alert('Vui lòng nhập đầy đủ cả 4 phương án A, B, C, D');
      return;
    }
    setSubmitting(true);
    try {
      await adminApi.createQuestion({
        quizId: managingQuiz.id,
        content: questionForm.content,
        options: questionForm.options,
        correctAnswer: questionForm.correctAnswer,
        explanation: questionForm.explanation,
      });
      setMessage({ text: 'Đã thêm câu hỏi mới vào bài thi!' });
      setShowAddQuestion(false);
      setQuestionForm({
        content: '',
        options: ['', '', '', ''],
        correctAnswer: 0,
        explanation: '',
      });
      await openManageQuestions(managingQuiz);
      await fetchQuizzes();
    } catch (e: any) {
      alert('Lỗi khi thêm câu hỏi: ' + (e?.message || 'Lỗi server'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteQuestion = async (questionId: number) => {
    if (!confirm('Bạn có chắc muốn xóa câu hỏi này?')) return;
    try {
      await adminApi.deleteQuestion(questionId);
      if (managingQuiz) {
        await openManageQuestions(managingQuiz);
      }
      await fetchQuizzes();
    } catch (e: any) {
      alert('Lỗi khi xóa câu hỏi: ' + (e?.message || 'Lỗi server'));
    }
  };

  const filteredQuizzes = quizzes.filter((q) => {
    if (levelFilter !== 'ALL' && q.level !== levelFilter) return false;
    if (statusFilter !== 'ALL' && q.status !== statusFilter) return false;
    return true;
  });

  const totalItems = filteredQuizzes.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const paginatedQuizzes = filteredQuizzes.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Header */}
      <div className="pagehead" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1>Quản lý Trắc nghiệm</h1>
          <div className="sub">
            <AnimatedCounter value={totalItems} /> bài trắc nghiệm {levelFilter !== 'ALL' ? `(Cấp độ ${levelFilter})` : 'theo chủ đề & cấp độ'} · 10 bài / trang · quản lý từng câu hỏi trong bài
          </div>
        </div>
        {!isInstructor && (
          <button
            type="button"
            className="btn"
            onClick={openCreate}
          >
            <Icon n="plus" s={18} />
            Tạo quiz mới
          </button>
        )}
      </div>

      {message && (
        <div className={message.error ? 'error' : 'ok'}>
          {message.text}
        </div>
      )}

      {/* Chiprow Filters */}
      <div className="chiprow">
        {LEVELS.map((lvl) => (
          <button
            key={lvl}
            type="button"
            className={'fchip' + (levelFilter === lvl ? ' on' : '')}
            onClick={() => {
              setLevelFilter(lvl);
              setPage(0);
            }}
          >
            {lvl === 'ALL' ? 'Tất cả cấp độ' : lvl}
          </button>
        ))}
        <span style={{ borderRight: '1.5px solid var(--line)', margin: '0 4px', height: 24, alignSelf: 'center' }} />
        {['ALL', 'PUBLISHED', 'DRAFT'].map((st) => (
          <button
            key={st}
            type="button"
            className={'fchip' + (statusFilter === st ? ' on' : '')}
            onClick={() => {
              setStatusFilter(st);
              setPage(0);
            }}
          >
            {st === 'ALL' ? 'Mọi trạng thái' : st === 'PUBLISHED' ? 'Đang mở' : 'Bản nháp'}
          </button>
        ))}
      </div>

      {/* Quizzes Grid */}
      {loading ? (
        <div className="card center" style={{ padding: 48, color: 'var(--muted)' }}>
          Đang tải danh sách bài trắc nghiệm...
        </div>
      ) : paginatedQuizzes.length === 0 ? (
        <div className="card center" style={{ padding: 48, color: 'var(--muted)' }}>
          Không có bài trắc nghiệm nào phù hợp.
        </div>
      ) : (
        <>
          <motion.div
            className="cols2"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {paginatedQuizzes.map((q) => {
              const isPub = q.status === 'PUBLISHED';
              return (
                <MotionCard key={q.id} className="card" variants={staggerItem}>
                  <div className="row" style={{ alignItems: 'flex-start' }}>
                    <b style={{ fontSize: 17.5, color: 'var(--ink)' }}>{q.title}</b>
                    <span className={isPub ? 'pill greensoft' : 'pill warn'}>
                      {isPub ? 'Đang mở' : 'Bản nháp'}
                    </span>
                  </div>

                  <div className="mt8" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <span className="pill level">Cấp {q.level || 'A1'}</span>
                    <span className="pill"><AnimatedCounter value={q.questionCount ?? 10} /> câu hỏi</span>
                    <span className="pill">{Math.round((q.timeLimit || 600) / 60)} phút</span>
                  </div>

                  {q.description && (
                    <div className="sub mt8" style={{ fontSize: 13, lineHeight: 1.5 }}>
                      {q.description}
                    </div>
                  )}

                  <div className="btn-row mt16">
                    <button
                      type="button"
                      className="btn ghost"
                      style={{ flex: 1, minHeight: 42 }}
                      onClick={() => openManageQuestions(q)}
                    >
                      Quản lý câu hỏi
                    </button>
                    {!isInstructor && (
                      <>
                        <button
                          type="button"
                          className="btn ghost"
                          style={{ minHeight: 42, padding: '0 16px' }}
                          onClick={() => openEdit(q)}
                        >
                          Sửa
                        </button>
                        <button
                          type="button"
                          className="btn ghost"
                          style={{ minHeight: 42, padding: '0 14px', color: 'var(--red-dark)', borderColor: 'rgba(229,72,77,0.3)' }}
                          onClick={() => handleDeleteQuiz(q)}
                        >
                          Xóa
                        </button>
                      </>
                    )}
                  </div>
                </MotionCard>
              );
            })}
          </motion.div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="row" style={{ alignItems: 'center', justifyContent: 'space-between', marginTop: 12, padding: '8px 2px', flexWrap: 'wrap', gap: 12 }}>
              <span className="sub" style={{ fontSize: 13.5 }}>
                Hiển thị <b>{safePage * PAGE_SIZE + 1}–{Math.min((safePage + 1) * PAGE_SIZE, totalItems)}</b> trong tổng số <b>{totalItems}</b> bài trắc nghiệm · Trang <b>{safePage + 1}</b> / <b>{totalPages}</b>
              </span>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <button
                  type="button"
                  className="pagebtn"
                  disabled={safePage === 0}
                  onClick={() => {
                    setPage((p) => Math.max(0, p - 1));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  style={{ opacity: safePage === 0 ? 0.35 : 1, cursor: safePage === 0 ? 'not-allowed' : 'pointer' }}
                  title="Trang trước"
                >
                  ‹
                </button>
                {generatePageNumbers(safePage, totalPages).map((pItem, idx) => {
                  if (pItem === '...') {
                    return (
                      <span key={`ellipsis-${idx}`} style={{ padding: '0 4px', color: 'var(--muted)', fontWeight: 700 }}>
                        ...
                      </span>
                    );
                  }
                  const pNum = pItem as number;
                  return (
                    <button
                      key={pNum}
                      type="button"
                      className={'pagebtn' + (safePage === pNum ? ' on' : '')}
                      onClick={() => {
                        setPage(pNum);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                    >
                      {pNum + 1}
                    </button>
                  );
                })}
                <button
                  type="button"
                  className="pagebtn"
                  disabled={safePage >= totalPages - 1}
                  onClick={() => {
                    setPage((p) => Math.min(totalPages - 1, p + 1));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  style={{ opacity: safePage >= totalPages - 1 ? 0.35 : 1, cursor: safePage >= totalPages - 1 ? 'not-allowed' : 'pointer' }}
                  title="Trang sau"
                >
                  ›
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Create / Edit Quiz Modal */}
      {(showCreateModal || editingQuiz) &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 99999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 16,
            }}
          >
            <div
              className="scrim"
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 1,
                background: 'rgba(10, 37, 64, 0.55)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
              }}
              onClick={() => { setShowCreateModal(false); setEditingQuiz(null); }}
            />
            <div
              className="modal"
              style={{
                position: 'relative',
                top: 'auto',
                left: 'auto',
                transform: 'none',
                maxWidth: 540,
                width: '100%',
                zIndex: 2,
                margin: 0,
                borderRadius: 24,
                boxShadow: '0 25px 70px rgba(10, 37, 64, 0.35)',
                background: '#ffffff',
                padding: '28px 30px',
                maxHeight: '90vh',
                overflowY: 'auto',
              }}
              onClick={(e) => e.stopPropagation()}
            >
            <div className="row" style={{ alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 20 }}>
                {editingQuiz ? `Chỉnh sửa Quiz #${editingQuiz.id}` : 'Tạo bài trắc nghiệm mới'}
              </h2>
              <button
                type="button"
                className="btn ghost sm"
                onClick={() => { setShowCreateModal(false); setEditingQuiz(null); }}
                style={{ padding: '4px 8px' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveQuiz} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="field">
                <label>Tiêu đề bài trắc nghiệm (*)</label>
                <input
                  className="input"
                  value={quizForm.title}
                  onChange={(e) => setQuizForm({ ...quizForm, title: e.target.value })}
                  placeholder="e.g. Từ vựng Business Căn bản"
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="field">
                  <label>Cấp độ CEFR</label>
                  <select
                    className="input"
                    value={quizForm.level}
                    onChange={(e) => setQuizForm({ ...quizForm, level: e.target.value })}
                  >
                    <option value="A1">A1 - Sơ cấp căn bản</option>
                    <option value="A2">A2 - Sơ cấp</option>
                    <option value="B1">B1 - Trung cấp</option>
                    <option value="B2">B2 - Trung cấp cao</option>
                    <option value="C1">C1 - Cao cấp</option>
                  </select>
                </div>

                <div className="field">
                  <label>Thời gian làm bài (giây)</label>
                  <input
                    type="number"
                    className="input"
                    value={quizForm.timeLimit}
                    onChange={(e) => setQuizForm({ ...quizForm, timeLimit: Number(e.target.value) })}
                    min={60}
                    step={30}
                  />
                </div>
              </div>

              <div className="field">
                <label>Trạng thái phát hành</label>
                <select
                  className="input"
                  value={quizForm.status}
                  onChange={(e) => setQuizForm({ ...quizForm, status: e.target.value })}
                >
                  <option value="PUBLISHED">Mở cho học viên (PUBLISHED)</option>
                  <option value="DRAFT">Lưu bản nháp (DRAFT)</option>
                </select>
              </div>

              <div className="field">
                <label>Mô tả ngắn</label>
                <textarea
                  className="input"
                  value={quizForm.description}
                  onChange={(e) => setQuizForm({ ...quizForm, description: e.target.value })}
                  placeholder="e.g. Bài tập kiểm tra nhanh 10 từ vựng chủ đề công sở..."
                  style={{ minHeight: 70 }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => { setShowCreateModal(false); setEditingQuiz(null); }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn"
                  disabled={submitting}
                >
                  {submitting ? 'Đang lưu...' : editingQuiz ? 'Cập nhật đề' : 'Tạo bài thi'}
                </button>
              </div>
            </form>
          </div>
          </div>,
          document.body
        )}

      {/* Manage Questions Modal / Drawer */}
      {managingQuiz &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 99999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 16,
            }}
          >
            <div
              className="scrim"
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 1,
                background: 'rgba(10, 37, 64, 0.55)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
              }}
              onClick={() => { setManagingQuiz(null); setQuizDetails(null); setShowAddQuestion(false); }}
            />
            <div
              className="modal"
              style={{
                position: 'relative',
                top: 'auto',
                left: 'auto',
                transform: 'none',
                maxWidth: 680,
                width: '100%',
                zIndex: 2,
                margin: 0,
                borderRadius: 24,
                boxShadow: '0 25px 70px rgba(10, 37, 64, 0.35)',
                background: '#ffffff',
                padding: '28px 30px',
                maxHeight: '85vh',
                overflowY: 'auto',
              }}
              onClick={(e) => e.stopPropagation()}
            >
            <div className="row" style={{ alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: 20 }}>
                  Quản lý câu hỏi: &ldquo;{managingQuiz.title}&rdquo;
                </h2>
                <div className="sub mt8">
                  Cấp {managingQuiz.level} · {quizDetails?.questions?.length || 0} câu hỏi trong bài
                </div>
              </div>
              <button
                type="button"
                className="btn ghost sm"
                onClick={() => { setManagingQuiz(null); setQuizDetails(null); setShowAddQuestion(false); }}
                style={{ padding: '4px 8px' }}
              >
                ✕
              </button>
            </div>

            {/* Questions list */}
            {detailLoading ? (
              <div className="center" style={{ padding: 30, color: 'var(--muted)' }}>
                Đang tải danh sách câu hỏi...
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {quizDetails?.questions && quizDetails.questions.length > 0 ? (
                  quizDetails.questions.map((q, idx) => (
                    <div
                      key={q.id || idx}
                      style={{
                        padding: '14px 16px',
                        background: '#F8FAFC',
                        borderRadius: 14,
                        border: '1px solid var(--line)',
                      }}
                    >
                      <div className="row" style={{ alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                          <b>Câu {idx + 1}: {q.content}</b>
                        </div>
                        <button
                          type="button"
                          className="link"
                          style={{ color: 'var(--red-dark)', fontSize: 13 }}
                          onClick={() => handleDeleteQuestion(q.id)}
                        >
                          Xóa
                        </button>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 8 }}>
                        {q.options?.map((opt: string, oIdx: number) => {
                          const isRight = oIdx === q.correctAnswer;
                          return (
                            <div
                              key={oIdx}
                              style={{
                                fontSize: 13,
                                padding: '4px 8px',
                                borderRadius: 8,
                                background: isRight ? 'var(--green-bg)' : '#fff',
                                color: isRight ? 'var(--green-dark)' : 'var(--ink)',
                                fontWeight: isRight ? 800 : 600,
                                border: '1px solid var(--line)',
                              }}
                            >
                              {String.fromCharCode(65 + oIdx)}. {opt} {isRight && '✓'}
                            </div>
                          );
                        })}
                      </div>

                      {q.explanation && (
                        <div className="sub mt8" style={{ fontSize: 12 }}>
                          💡 Giải thích: {q.explanation}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="center" style={{ padding: 24, color: 'var(--muted)', fontSize: 14 }}>
                    Chưa có câu hỏi nào trong đề thi này. Hãy thêm câu hỏi đầu tiên!
                  </div>
                )}
              </div>
            )}

            {/* Add Question Form inline toggle */}
            {!showAddQuestion ? (
              <div className="mt16">
                <button
                  type="button"
                  className="btn block"
                  onClick={() => setShowAddQuestion(true)}
                >
                  <Icon n="plus" s={18} /> Thêm câu hỏi vào đề
                </button>
              </div>
            ) : (
              <form onSubmit={handleSaveQuestion} style={{ marginTop: 18, borderTop: '1.5px dashed var(--line)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <b style={{ fontSize: 16 }}>Thêm câu hỏi mới</b>

                <div className="field">
                  <label>Nội dung câu hỏi (*)</label>
                  <input
                    className="input"
                    value={questionForm.content}
                    onChange={(e) => setQuestionForm({ ...questionForm, content: e.target.value })}
                    placeholder="e.g. What is the synonym of 'resilient'?"
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {['A', 'B', 'C', 'D'].map((letter, idx) => (
                    <div key={letter} className="field">
                      <label>Phương án {letter} (*)</label>
                      <input
                        className="input"
                        value={questionForm.options[idx]}
                        onChange={(e) => {
                          const next = [...questionForm.options];
                          next[idx] = e.target.value;
                          setQuestionForm({ ...questionForm, options: next });
                        }}
                        placeholder={`Phương án ${letter}`}
                        required
                      />
                    </div>
                  ))}
                </div>

                <div className="field">
                  <label>Đáp án đúng</label>
                  <select
                    className="input"
                    value={questionForm.correctAnswer}
                    onChange={(e) => setQuestionForm({ ...questionForm, correctAnswer: Number(e.target.value) })}
                  >
                    <option value={0}>Phương án A là đúng</option>
                    <option value={1}>Phương án B là đúng</option>
                    <option value={2}>Phương án C là đúng</option>
                    <option value={3}>Phương án D là đúng</option>
                  </select>
                </div>

                <div className="field">
                  <label>Giải thích đáp án</label>
                  <input
                    className="input"
                    value={questionForm.explanation}
                    onChange={(e) => setQuestionForm({ ...questionForm, explanation: e.target.value })}
                    placeholder="e.g. 'Strong' hoặc 'Tough' có nghĩa tương tự 'Resilient'..."
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <button
                    type="button"
                    className="btn ghost sm"
                    onClick={() => setShowAddQuestion(false)}
                  >
                    Hủy thêm
                  </button>
                  <button
                    type="submit"
                    className="btn sm"
                    disabled={submitting}
                  >
                    {submitting ? 'Đang lưu...' : 'Lưu câu hỏi'}
                  </button>
                </div>
              </form>
            )}
          </div>
          </div>,
          document.body
        )}
    </div>
  );
}
