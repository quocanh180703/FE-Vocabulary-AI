import { useEffect, useState } from 'react';
import { adminApi, quizApi } from '../../api';
import type { AdminQuiz, QuizDetail } from '../../api';
import { Icon } from '../../components/icons';

const LEVELS = ['ALL', 'A1', 'A2', 'B1', 'B2', 'C1'];

export default function AdminQuizzes() {
  const [quizzes, setQuizzes] = useState<AdminQuiz[]>([]);
  const [levelFilter, setLevelFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<AdminQuiz | null>(null);
  const [managingQuiz, setManagingQuiz] = useState<AdminQuiz | null>(null);
  const [quizDetails, setQuizDetails] = useState<QuizDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);

  // Quiz Form
  const [quizForm, setQuizForm] = useState({
    title: '',
    level: 'A1',
    timeLimit: 600,
    description: '',
    status: 'PUBLISHED'
  });

  // Question Form
  const [questionForm, setQuestionForm] = useState({
    content: '',
    options: ['', '', '', ''],
    correctAnswer: 0,
    explanation: ''
  });

  const fetchQuizzes = async () => {
    setLoading(true);
    try {
      const res = await adminApi.quizzes(0, 100);
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
      status: 'PUBLISHED'
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
      status: q.status || 'PUBLISHED'
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
        setMessage({ text: `Đã tạo bài trắc nghiệm mới thành công!` });
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
        explanation: questionForm.explanation
      });
      setMessage({ text: 'Đã thêm câu hỏi mới vào bài thi!' });
      setShowAddQuestion(false);
      setQuestionForm({
        content: '',
        options: ['', '', '', ''],
        correctAnswer: 0,
        explanation: ''
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

  return (
    <div style={{ maxWidth: 1240, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: '1.9rem', fontWeight: 900, margin: 0, color: '#0F172A', letterSpacing: '-0.5px' }}>
            Quản lý Bài Trắc Nghiệm & Đề Thi
          </h1>
          <p style={{ margin: '4px 0 0 0', color: '#64748B', fontSize: '0.94rem' }}>
            Tổng số: <b style={{ color: '#0F172A' }}>{quizzes.length}</b> bài trắc nghiệm phân hóa theo các trình độ CEFR
          </p>
        </div>
        <button
          onClick={openCreate}
          style={{
            background: '#4F46E5',
            color: '#FFFFFF',
            border: 'none',
            padding: '11px 22px',
            borderRadius: 12,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)'
          }}
        >
          <Icon n="spark" s={18} />
          Tạo đề thi mới
        </button>
      </div>

      {message && (
        <div style={{
          background: message.error ? '#FEE2E2' : '#D1FAE5',
          color: message.error ? '#991B1B' : '#065F46',
          border: `1px solid ${message.error ? '#FCA5A5' : '#6EE7B7'}`,
          padding: '12px 18px',
          borderRadius: 12,
          marginBottom: 20,
          fontWeight: 600,
          fontSize: '0.92rem'
        }}>
          {message.text}
        </div>
      )}

      {/* Filter Tabs */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: 16,
        padding: '16px 20px',
        border: '1px solid #E2E8F0',
        marginBottom: 22,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 14
      }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {LEVELS.map((lvl) => (
            <button
              key={lvl}
              onClick={() => setLevelFilter(lvl)}
              style={{
                padding: '7px 16px',
                borderRadius: 10,
                border: 'none',
                background: levelFilter === lvl ? '#4F46E5' : '#F1F5F9',
                color: levelFilter === lvl ? '#FFFFFF' : '#475569',
                fontWeight: 700,
                fontSize: '0.86rem',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              {lvl === 'ALL' ? 'Tất cả cấp độ' : `Cấp độ ${lvl}`}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748B' }}>Trạng thái:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid #CBD5E1',
              fontWeight: 600,
              fontSize: '0.88rem',
              outline: 'none',
              background: '#FFFFFF'
            }}
          >
            <option value="ALL">Tất cả</option>
            <option value="PUBLISHED">Công khai (PUBLISHED)</option>
            <option value="DRAFT">Bản nháp (DRAFT)</option>
          </select>
        </div>
      </div>

      {/* Quizzes Table */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: 18,
        border: '1px solid #E2E8F0',
        overflow: 'hidden',
        boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B' }}>
                <th style={{ padding: '14px 18px' }}>Mã Đề</th>
                <th style={{ padding: '14px 18px' }}>Tiêu đề Bài thi</th>
                <th style={{ padding: '14px 18px' }}>Cấp độ</th>
                <th style={{ padding: '14px 18px' }}>Thời gian</th>
                <th style={{ padding: '14px 18px' }}>Số câu hỏi</th>
                <th style={{ padding: '14px 18px' }}>Trạng thái</th>
                <th style={{ padding: '14px 18px', textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>
                    Đang tải danh sách bài trắc nghiệm...
                  </td>
                </tr>
              ) : filteredQuizzes.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>
                    Không có đề thi nào trong danh mục này.
                  </td>
                </tr>
              ) : (
                filteredQuizzes.map((q) => (
                  <tr key={q.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '14px 18px', fontWeight: 700, color: '#64748B' }}>
                      #{q.id}
                    </td>
                    <td style={{ padding: '14px 18px', fontWeight: 700, color: '#0F172A', fontSize: '0.96rem' }}>
                      {q.title}
                      {q.description && (
                        <div style={{ fontSize: '0.8rem', fontWeight: 400, color: '#64748B', marginTop: 2 }}>
                          {q.description}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: 6,
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        color: '#FFFFFF',
                        background:
                          q.level === 'A1' ? '#10B981' :
                          q.level === 'A2' ? '#06B6D4' :
                          q.level === 'B1' ? '#3B82F6' :
                          q.level === 'B2' ? '#8B5CF6' : '#EC4899'
                      }}>
                        {q.level || 'A1'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 18px', color: '#475569', fontWeight: 600 }}>
                      {Math.round((q.timeLimit || 600) / 60)} phút
                    </td>
                    <td style={{ padding: '14px 18px', fontWeight: 700, color: '#4F46E5' }}>
                      {q.questionCount ?? 5} câu
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      <span style={{
                        padding: '3px 10px',
                        borderRadius: 20,
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        background: q.status === 'PUBLISHED' ? '#ECFDF5' : '#FEF3C7',
                        color: q.status === 'PUBLISHED' ? '#059669' : '#D97706',
                        border: `1px solid ${q.status === 'PUBLISHED' ? '#A7F3D0' : '#FDE68A'}`
                      }}>
                        {q.status}
                      </span>
                    </td>
                    <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        <button
                          onClick={() => openManageQuestions(q)}
                          style={{
                            background: '#EEF2FF',
                            border: '1px solid #C7D2FE',
                            color: '#4F46E5',
                            padding: '5px 11px',
                            borderRadius: 8,
                            fontSize: '0.82rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          Câu hỏi
                        </button>
                        <button
                          onClick={() => openEdit(q)}
                          style={{
                            background: '#F1F5F9',
                            border: '1px solid #E2E8F0',
                            color: '#334155',
                            padding: '5px 10px',
                            borderRadius: 8,
                            fontSize: '0.82rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          Sửa
                        </button>
                        <button
                          onClick={() => handleDeleteQuiz(q)}
                          style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            color: '#DC2626',
                            padding: '5px 10px',
                            borderRadius: 8,
                            fontSize: '0.82rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Quiz Modal */}
      {(showCreateModal || editingQuiz) && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 20
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: 22,
            padding: '28px 32px',
            maxWidth: 540,
            width: '100%',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 18px 0', color: '#0F172A' }}>
              {editingQuiz ? `Chỉnh sửa đề thi #${editingQuiz.id}` : 'Tạo bài trắc nghiệm mới'}
            </h2>

            <form onSubmit={handleSaveQuiz}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  Tiêu đề đề thi (*)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Luyện đề CEFR B1 - Cụm động từ cơ bản"
                  value={quizForm.title}
                  onChange={(e) => setQuizForm({ ...quizForm, title: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    Trình độ CEFR
                  </label>
                  <select
                    value={quizForm.level}
                    onChange={(e) => setQuizForm({ ...quizForm, level: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', boxSizing: 'border-box', background: '#FFFFFF' }}
                  >
                    {['A1', 'A2', 'B1', 'B2', 'C1'].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    Thời gian làm bài (Giây)
                  </label>
                  <input
                    type="number"
                    min={60}
                    step={30}
                    value={quizForm.timeLimit}
                    onChange={(e) => setQuizForm({ ...quizForm, timeLimit: Number(e.target.value) })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  Mô tả bài thi
                </label>
                <textarea
                  rows={3}
                  placeholder="Mô tả mục tiêu bài kiểm tra..."
                  value={quizForm.description}
                  onChange={(e) => setQuizForm({ ...quizForm, description: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', boxSizing: 'border-box', resize: 'vertical' }}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  Trạng thái
                </label>
                <select
                  value={quizForm.status}
                  onChange={(e) => setQuizForm({ ...quizForm, status: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', boxSizing: 'border-box', background: '#FFFFFF' }}
                >
                  <option value="PUBLISHED">Công khai (PUBLISHED)</option>
                  <option value="DRAFT">Bản nháp (DRAFT)</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => { setShowCreateModal(false); setEditingQuiz(null); }}
                  style={{
                    background: '#F1F5F9',
                    color: '#334155',
                    border: '1px solid #CBD5E1',
                    padding: '10px 18px',
                    borderRadius: 10,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    background: '#4F46E5',
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '10px 22px',
                    borderRadius: 10,
                    fontWeight: 700,
                    cursor: submitting ? 'wait' : 'pointer',
                    boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)'
                  }}
                >
                  {submitting ? 'Đang lưu...' : 'Lưu đề thi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Questions Modal */}
      {managingQuiz && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 20
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: 22,
            padding: '28px 32px',
            maxWidth: 720,
            width: '100%',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
              <div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#0F172A' }}>
                  Quản lý Câu hỏi: "{managingQuiz.title}"
                </h2>
                <span style={{ fontSize: '0.86rem', color: '#64748B' }}>
                  Cấp độ {managingQuiz.level} • {quizDetails?.questions?.length || 0} câu hỏi trong đề
                </span>
              </div>
              <button
                onClick={() => { setManagingQuiz(null); setQuizDetails(null); setShowAddQuestion(false); }}
                style={{
                  background: '#F1F5F9',
                  border: 'none',
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  cursor: 'pointer',
                  fontWeight: 800,
                  color: '#64748B'
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ fontWeight: 700, fontSize: '0.94rem', color: '#1E293B' }}>Danh sách câu hỏi</div>
              <button
                onClick={() => setShowAddQuestion(!showAddQuestion)}
                style={{
                  background: showAddQuestion ? '#F1F5F9' : '#4F46E5',
                  color: showAddQuestion ? '#334155' : '#FFFFFF',
                  border: 'none',
                  padding: '7px 14px',
                  borderRadius: 8,
                  fontWeight: 700,
                  fontSize: '0.84rem',
                  cursor: 'pointer'
                }}
              >
                {showAddQuestion ? 'Thu gọn form' : '+ Thêm câu hỏi'}
              </button>
            </div>

            {/* Add Question Form Drawer */}
            {showAddQuestion && (
              <form onSubmit={handleSaveQuestion} style={{
                background: '#F8FAFC',
                border: '1px solid #CBD5E1',
                borderRadius: 14,
                padding: '16px 20px',
                marginBottom: 16
              }}>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0F172A', marginBottom: 10 }}>
                  Thêm câu hỏi mới vào đề #{managingQuiz.id}
                </div>

                <div style={{ marginBottom: 10 }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    Nội dung câu hỏi (*)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: What is the opposite of 'generous'?"
                    value={questionForm.content}
                    onChange={(e) => setQuestionForm({ ...questionForm, content: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                  {['A', 'B', 'C', 'D'].map((lbl, idx) => (
                    <div key={lbl}>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: 2 }}>
                        Phương án {lbl}
                      </label>
                      <input
                        type="text"
                        required
                        value={questionForm.options[idx]}
                        onChange={(e) => {
                          const newOpts = [...questionForm.options];
                          newOpts[idx] = e.target.value;
                          setQuestionForm({ ...questionForm, options: newOpts });
                        }}
                        style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
                      />
                    </div>
                  ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10, marginBottom: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: 2 }}>
                      Đáp án đúng (*)
                    </label>
                    <select
                      value={questionForm.correctAnswer}
                      onChange={(e) => setQuestionForm({ ...questionForm, correctAnswer: Number(e.target.value) })}
                      style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #CBD5E1', background: '#FFFFFF' }}
                    >
                      <option value={0}>Phương án A</option>
                      <option value={1}>Phương án B</option>
                      <option value={2}>Phương án C</option>
                      <option value={3}>Phương án D</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: 2 }}>
                      Giải thích đáp án
                    </label>
                    <input
                      type="text"
                      placeholder="Giải thích tại sao chọn đáp án này..."
                      value={questionForm.explanation}
                      onChange={(e) => setQuestionForm({ ...questionForm, explanation: e.target.value })}
                      style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setShowAddQuestion(false)}
                    style={{ background: '#E2E8F0', border: 'none', padding: '6px 14px', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    style={{ background: '#10B981', color: '#FFFFFF', border: 'none', padding: '6px 16px', borderRadius: 6, fontWeight: 700, cursor: submitting ? 'wait' : 'pointer' }}
                  >
                    {submitting ? 'Đang thêm...' : 'Lưu câu hỏi'}
                  </button>
                </div>
              </form>
            )}

            {/* Questions List scrollable */}
            <div style={{ overflowY: 'auto', flex: 1, paddingRight: 4 }}>
              {detailLoading ? (
                <div style={{ textAlign: 'center', padding: 30, color: '#64748B' }}>Đang tải danh sách câu hỏi...</div>
              ) : !quizDetails?.questions || quizDetails.questions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 30, color: '#64748B' }}>
                  Chưa có câu hỏi nào trong bài này. Hãy bấm "+ Thêm câu hỏi" để bổ sung câu hỏi!
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {quizDetails.questions.map((q, idx) => (
                    <div
                      key={q.id || idx}
                      style={{
                        background: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        borderRadius: 12,
                        padding: '14px 18px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: 12
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 800, fontSize: '0.94rem', color: '#1E293B', marginBottom: 6 }}>
                          Câu {idx + 1}: {q.content}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: '0.84rem', color: '#475569' }}>
                          {q.options?.map((opt, oIdx) => (
                            <div key={oIdx} style={{ display: 'flex', gap: 6 }}>
                              <b style={{ color: '#4F46E5' }}>{['A', 'B', 'C', 'D'][oIdx]}.</b>
                              <span>{opt}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteQuestion(q.id)}
                        title="Xóa câu hỏi này"
                        style={{
                          background: 'rgba(239, 68, 68, 0.1)',
                          border: 'none',
                          color: '#DC2626',
                          padding: '4px 8px',
                          borderRadius: 6,
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        Xóa
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: 14, marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setManagingQuiz(null); setQuizDetails(null); setShowAddQuestion(false); }}
                style={{
                  background: '#F1F5F9',
                  color: '#334155',
                  border: '1px solid #CBD5E1',
                  padding: '9px 18px',
                  borderRadius: 10,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
