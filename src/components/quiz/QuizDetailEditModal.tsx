import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { quizApi, errMsg } from '../../api';
import type { QuizDetail, Question } from '../../api';
import { Icon } from '../icons';

interface QuizDetailEditModalProps {
  quizId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
  onDeleted: () => void;
  onStartQuiz: (id: number) => void;
}

export const QuizDetailEditModal: React.FC<QuizDetailEditModalProps> = ({
  quizId,
  isOpen,
  onClose,
  onUpdated,
  onDeleted,
  onStartQuiz,
}) => {
  const [loading, setLoading] = useState(false);
  const [quizDetail, setQuizDetail] = useState<QuizDetail | null>(null);
  const [err, setErr] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Editable Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [level, setLevel] = useState('B1');
  const [timeLimit, setTimeLimit] = useState(15);
  const [questions, setQuestions] = useState<Question[]>([]);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'delete' | 'publish' | 'withdraw' | 'hide';
  }>({
    isOpen: false,
    type: 'publish',
  });

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && quizId) {
      loadDetail(quizId);
    } else {
      setQuizDetail(null);
      setErr('');
      setSuccessMsg('');
    }
  }, [isOpen, quizId]);

  const loadDetail = (id: number) => {
    setLoading(true);
    setErr('');
    setSuccessMsg('');
    quizApi
      .getMyQuizDetail(id)
      .then(({ data }) => {
        setQuizDetail(data);
        setTitle(data.title || '');
        setDescription(data.description || '');
        setLevel(data.level || 'B1');
        const mins = data.timeLimit > 60 ? Math.round(data.timeLimit / 60) : data.timeLimit || 15;
        setTimeLimit(mins);
        setQuestions(
          (data.questions || []).map((q) => ({
            ...q,
            options: q.options?.length >= 4 ? q.options : [...(q.options || []), '', '', '', ''].slice(0, 4),
            correctAnswer: q.correctAnswer ?? 0,
            explanation: q.explanation || '',
          }))
        );
      })
      .catch((e) => {
        setErr(errMsg(e) || 'Không thể tải chi tiết bài tập');
      })
      .finally(() => setLoading(false));
  };

  const isPending = quizDetail?.visibility === 'PENDING';
  const isPublic = quizDetail?.visibility === 'PUBLIC';
  const isRejected = quizDetail?.visibility === 'REJECTED';
  const isReadOnly = isPending || isPublic;

  // Question editing handlers
  const handleQuestionContentChange = (index: number, val: string) => {
    const updated = [...questions];
    updated[index].content = val;
    setQuestions(updated);
  };

  const handleOptionChange = (qIndex: number, optIndex: number, val: string) => {
    const updated = [...questions];
    const opts = [...updated[qIndex].options];
    opts[optIndex] = val;
    updated[qIndex].options = opts;
    setQuestions(updated);
  };

  const handleCorrectAnswerChange = (qIndex: number, optIndex: number) => {
    const updated = [...questions];
    updated[qIndex].correctAnswer = optIndex;
    setQuestions(updated);
  };

  const handleExplanationChange = (qIndex: number, val: string) => {
    const updated = [...questions];
    updated[qIndex].explanation = val;
    setQuestions(updated);
  };

  const handleAddQuestion = () => {
    setQuestions([
      ...questions,
      {
        id: 0,
        content: '',
        options: ['', '', '', ''],
        correctAnswer: 0,
        explanation: '',
      },
    ]);
  };

  const handleRemoveQuestion = (index: number) => {
    if (questions.length <= 1) {
      alert('Bài tập cần có ít nhất 1 câu hỏi.');
      return;
    }
    setQuestions(questions.filter((_, idx) => idx !== index));
  };

  // Submit update
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quizId || isReadOnly) return;

    if (!title.trim()) {
      setErr('Tiêu đề không được để trống');
      return;
    }

    for (let i = 0; i < questions.length; i++) {
      if (!questions[i].content.trim()) {
        setErr(`Câu hỏi số ${i + 1} chưa có nội dung.`);
        return;
      }
      for (let j = 0; j < 4; j++) {
        if (!questions[i].options[j]?.trim()) {
          setErr(`Câu hỏi ${i + 1} đang thiếu phương án ${String.fromCharCode(65 + j)}.`);
          return;
        }
      }
    }

    setSaving(true);
    setErr('');
    setSuccessMsg('');

    quizApi
      .updateMyQuiz(quizId, {
        title: title.trim(),
        description: description.trim() || undefined,
        level,
        timeLimit: timeLimit * 60, // in seconds
        questions: questions.map((q) => ({
          content: q.content.trim(),
          options: q.options.map((o) => o.trim()),
          correctAnswer: q.correctAnswer ?? 0,
          explanation: q.explanation?.trim() || undefined,
        })),
      })
      .then(() => {
        setSuccessMsg('Đã lưu thay đổi bài tập thành công!');
        onUpdated();
        setTimeout(() => {
          onClose();
        }, 800);
      })
      .catch((e) => {
        setErr(errMsg(e) || 'Không thể lưu thay đổi');
      })
      .finally(() => setSaving(false));
  };

  const handleOpenActionConfirm = (type: 'delete' | 'publish' | 'withdraw' | 'hide') => {
    setConfirmModal({ isOpen: true, type });
  };

  const handleExecuteAction = async () => {
    if (!quizId) return;
    if (confirmModal.type === 'delete') {
      setDeleting(true);
      setErr('');
      quizApi
        .deleteMyQuiz(quizId)
        .then(() => {
          onDeleted();
          onClose();
        })
        .catch((e) => {
          setErr(errMsg(e) || 'Không thể xóa bài tập');
        })
        .finally(() => {
          setDeleting(false);
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        });
    } else if (confirmModal.type === 'publish') {
      try {
        setActionLoading(true);
        await quizApi.publishRequest(quizId);
        setSuccessMsg('Đã gửi yêu cầu duyệt bài tập tới Giảng viên thành công!');
        loadDetail(quizId);
        onUpdated();
      } catch (e: any) {
        setErr(errMsg(e) || 'Không thể gửi yêu cầu duyệt');
      } finally {
        setActionLoading(false);
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      }
    } else if (confirmModal.type === 'withdraw') {
      try {
        setActionLoading(true);
        await quizApi.withdraw(quizId);
        setSuccessMsg('Đã rút yêu cầu duyệt bài tập thành công!');
        loadDetail(quizId);
        onUpdated();
      } catch (e: any) {
        setErr(errMsg(e) || 'Không thể rút yêu cầu');
      } finally {
        setActionLoading(false);
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      }
    } else if (confirmModal.type === 'hide') {
      try {
        setActionLoading(true);
        await quizApi.hide(quizId);
        setSuccessMsg('Đã chuyển bài tập về chế độ riêng tư!');
        loadDetail(quizId);
        onUpdated();
      } catch (e: any) {
        setErr(errMsg(e) || 'Không thể chuyển chế độ riêng tư');
      } finally {
        setActionLoading(false);
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      }
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        overflowY: 'auto',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving && !deleting) onClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.2 }}
        className="card"
        style={{
          width: '100%',
          maxWidth: 780,
          background: '#FFFFFF',
          borderRadius: 22,
          boxShadow: '0 20px 45px rgba(15, 23, 42, 0.18)',
          padding: 0,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '92vh',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: '#EEF2FF',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon n="edit" s={20} />
            </div>
            <div>
              <h2 style={{ fontSize: 17, fontWeight: 800, margin: 0, color: '#1E293B' }}>
                {isReadOnly ? 'Chi tiết bài tập' : 'Chỉnh sửa bài tập'}
              </h2>
              <div style={{ fontSize: 12.5, color: '#64748B', marginTop: 2 }}>
                Xem và cập nhật nội dung câu hỏi, đáp án đúng và thời gian làm bài
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Sparkle AI Badge */}
            {quizDetail?.isAiGenerated && (
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
            )}

            {/* Visibility Badge */}
            {isPublic ? (
              <span className="pill" style={{ background: '#DCFCE7', color: '#15803D', border: '1px solid #86EFAC' }}>
                🌐 Công khai
              </span>
            ) : isPending ? (
              <span className="pill" style={{ background: '#FEF3C7', color: '#B45309', border: '1px solid #FCD34D' }}>
                ⏳ Chờ duyệt
              </span>
            ) : isRejected ? (
              <span className="pill" style={{ background: '#FEE2E2', color: '#B91C1C', border: '1px solid #FCA5A5' }}>
                ⚠️ Bị từ chối
              </span>
            ) : (
              <span className="pill" style={{ background: '#F1F5F9', color: '#475569', border: '1px solid #CBD5E1' }}>
                🔒 Riêng tư
              </span>
            )}

            <button
              className="btn ghost sm"
              onClick={onClose}
              disabled={saving || deleting}
              style={{
                padding: '6px 10px',
                border: 'none',
                background: 'transparent',
                color: '#64748B',
                cursor: 'pointer',
              }}
            >
              <Icon n="x" s={18} />
            </button>
          </div>
        </div>

        {/* Status Notices */}
        {isPending && (
          <div
            style={{
              padding: '10px 24px',
              background: '#FFFBEB',
              borderBottom: '1px solid #FDE68A',
              color: '#B45309',
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span>⏳</span>
            <span>
              Bài tập đang trong hàng chờ duyệt của Giảng viên (Instructor). Bạn không thể chỉnh sửa hoặc xóa bài lúc này.
            </span>
          </div>
        )}

        {isPublic && (
          <div
            style={{
              padding: '10px 24px',
              background: '#F0FDF4',
              borderBottom: '1px solid #BBF7D0',
              color: '#15803D',
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span>🌐</span>
            <span>
              Bài tập đã được duyệt công khai trên hệ thống cho tất cả học viên. Để chỉnh sửa câu hỏi, vui lòng ẩn bài về riêng tư trước.
            </span>
          </div>
        )}

        {isRejected && quizDetail?.reviewNote && (
          <div
            style={{
              padding: '12px 24px',
              background: '#FEF2F2',
              borderBottom: '1px solid #FCA5A5',
              color: '#B91C1C',
              fontSize: 13,
            }}
          >
            <b>Lý do từ chối từ Giảng viên:</b> {quizDetail.reviewNote}
          </div>
        )}

        {/* Modal Body */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <div className="spinner" style={{ margin: '0 auto 12px' }} />
              <div className="sub">Đang tải thông tin bài tập...</div>
            </div>
          ) : (
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {err && (
                <div
                  style={{
                    background: '#FEF2F2',
                    border: '1px solid #FCA5A5',
                    color: '#B91C1C',
                    padding: '10px 14px',
                    borderRadius: 10,
                    fontSize: 13,
                  }}
                >
                  {err}
                </div>
              )}

              {successMsg && (
                <div
                  style={{
                    background: '#F0FDF4',
                    border: '1px solid #86EFAC',
                    color: '#15803D',
                    padding: '10px 14px',
                    borderRadius: 10,
                    fontSize: 13,
                  }}
                >
                  {successMsg}
                </div>
              )}

              {/* General Metadata */}
              <div
                style={{
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: 14,
                  padding: '16px 18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 14,
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <label style={{ fontSize: 13.5, fontWeight: 700, color: '#1E293B', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Icon n="pen" s={14} />
                      <span>Tiêu đề bài trắc nghiệm</span>
                      <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <span style={{ fontSize: 12, color: '#94A3B8', fontWeight: 600 }}>{title.length}/150</span>
                  </div>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    disabled={isReadOnly || saving}
                    placeholder="VD: Bài tập từ vựng Sport..."
                    maxLength={150}
                    required
                    style={{
                      width: '100%',
                      height: 44,
                      padding: '0 16px',
                      borderRadius: 12,
                      border: '1.5px solid #CBD5E1',
                      background: isReadOnly ? '#F1F5F9' : '#FFFFFF',
                      fontSize: 14,
                      fontWeight: 600,
                      color: '#0F172A',
                      outline: 'none',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
                    }}
                    onFocus={(e) => {
                      if (!isReadOnly) {
                        e.currentTarget.style.borderColor = 'var(--primary)';
                        e.currentTarget.style.boxShadow = '0 0 0 3.5px rgba(99, 102, 241, 0.15)';
                      }
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#CBD5E1';
                      e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.04)';
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#1E293B', marginBottom: 6 }}>
                      Cấp độ CEFR
                    </label>
                    <select
                      value={level}
                      onChange={(e) => setLevel(e.target.value)}
                      disabled={isReadOnly || saving}
                      style={{
                        width: '100%',
                        height: 44,
                        padding: '0 14px',
                        borderRadius: 12,
                        border: '1.5px solid #CBD5E1',
                        background: isReadOnly ? '#F1F5F9' : '#FFFFFF',
                        fontSize: 13.5,
                        fontWeight: 600,
                        color: '#0F172A',
                        outline: 'none',
                        cursor: isReadOnly ? 'default' : 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
                      }}
                      onFocus={(e) => {
                        if (!isReadOnly) {
                          e.currentTarget.style.borderColor = 'var(--primary)';
                          e.currentTarget.style.boxShadow = '0 0 0 3.5px rgba(99, 102, 241, 0.15)';
                        }
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = '#CBD5E1';
                        e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.04)';
                      }}
                    >
                      {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map((lvl) => (
                        <option key={lvl} value={lvl}>
                          Cấp {lvl}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#1E293B', marginBottom: 6 }}>
                      Thời gian làm bài (phút)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={180}
                      value={timeLimit}
                      onChange={(e) => setTimeLimit(Math.max(1, parseInt(e.target.value) || 1))}
                      disabled={isReadOnly || saving}
                      style={{
                        width: '100%',
                        height: 44,
                        padding: '0 16px',
                        borderRadius: 12,
                        border: '1.5px solid #CBD5E1',
                        background: isReadOnly ? '#F1F5F9' : '#FFFFFF',
                        fontSize: 13.5,
                        fontWeight: 600,
                        color: '#0F172A',
                        outline: 'none',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
                      }}
                      onFocus={(e) => {
                        if (!isReadOnly) {
                          e.currentTarget.style.borderColor = 'var(--primary)';
                          e.currentTarget.style.boxShadow = '0 0 0 3.5px rgba(99, 102, 241, 0.15)';
                        }
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = '#CBD5E1';
                        e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.04)';
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <label style={{ fontSize: 13, fontWeight: 700, color: '#1E293B' }}>
                      Mô tả / Ghi chú <span style={{ color: '#64748B', fontWeight: 500 }}>(Tùy chọn)</span>
                    </label>
                    <span style={{ fontSize: 12, color: '#94A3B8', fontWeight: 600 }}>{description.length}/300</span>
                  </div>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={isReadOnly || saving}
                    placeholder="Mô tả ngắn gọn về nội dung ôn tập..."
                    maxLength={300}
                    style={{
                      width: '100%',
                      height: 44,
                      padding: '0 16px',
                      borderRadius: 12,
                      border: '1.5px solid #CBD5E1',
                      background: isReadOnly ? '#F1F5F9' : '#FFFFFF',
                      fontSize: 13.5,
                      color: '#0F172A',
                      outline: 'none',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
                    }}
                    onFocus={(e) => {
                      if (!isReadOnly) {
                        e.currentTarget.style.borderColor = 'var(--primary)';
                        e.currentTarget.style.boxShadow = '0 0 0 3.5px rgba(99, 102, 241, 0.15)';
                      }
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#CBD5E1';
                      e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.04)';
                    }}
                  />
                </div>
              </div>

              {/* Questions List Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                <b style={{ fontSize: 16, color: '#1E293B' }}>
                  Danh sách câu hỏi ({questions.length} câu)
                </b>
                {!isReadOnly && (
                  <button
                    type="button"
                    className="btn ghost sm"
                    onClick={handleAddQuestion}
                    style={{ fontSize: 12.5, fontWeight: 700, borderColor: '#C7D2FE', color: 'var(--primary)' }}
                  >
                    <Icon n="plus" s={14} /> Thêm câu hỏi
                  </button>
                )}
              </div>

              {/* Questions Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {questions.map((q, qIndex) => (
                  <div
                    key={qIndex}
                    style={{
                      border: '1px solid #E2E8F0',
                      borderRadius: 14,
                      padding: '16px 18px',
                      background: '#FFFFFF',
                      boxShadow: '0 2px 6px rgba(15, 23, 42, 0.04)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 800,
                          color: 'var(--primary)',
                          background: '#EEF2FF',
                          padding: '3px 10px',
                          borderRadius: 8,
                        }}
                      >
                        Câu {qIndex + 1}
                      </span>
                      {!isReadOnly && (
                        <button
                          type="button"
                          className="btn ghost sm"
                          onClick={() => handleRemoveQuestion(qIndex)}
                          style={{
                            padding: '4px 8px',
                            color: '#EF4444',
                            borderColor: '#FCA5A5',
                            fontSize: 12,
                          }}
                          title="Xóa câu hỏi này"
                        >
                          <Icon n="trash" s={14} /> Xóa câu
                        </button>
                      )}
                    </div>

                    {/* Question Content */}
                    <div style={{ marginBottom: 12 }}>
                      <textarea
                        value={q.content}
                        onChange={(e) => handleQuestionContentChange(qIndex, e.target.value)}
                        disabled={isReadOnly || saving}
                        rows={2}
                        placeholder="Nội dung câu hỏi..."
                        required
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          borderRadius: 12,
                          border: '1.5px solid #CBD5E1',
                          background: isReadOnly ? '#F8FAFC' : '#FFFFFF',
                          fontSize: 13.5,
                          color: '#0F172A',
                          lineHeight: 1.5,
                          outline: 'none',
                          resize: 'vertical',
                          minHeight: 64,
                          transition: 'all 0.2s ease',
                          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
                          fontFamily: 'inherit',
                        }}
                        onFocus={(e) => {
                          if (!isReadOnly) {
                            e.currentTarget.style.borderColor = 'var(--primary)';
                            e.currentTarget.style.boxShadow = '0 0 0 3.5px rgba(99, 102, 241, 0.15)';
                          }
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = '#CBD5E1';
                          e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.04)';
                        }}
                      />
                    </div>

                    {/* Options (A, B, C, D) with Radio for Correct Answer */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#64748B' }}>
                        Các phương án trả lời (chọn nút tròn để đánh dấu đáp án đúng):
                      </span>
                      {q.options.map((opt, optIndex) => {
                        const isCorrect = q.correctAnswer === optIndex;
                        const charCode = String.fromCharCode(65 + optIndex);
                        return (
                          <div
                            key={optIndex}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 10,
                              background: isCorrect ? '#F0FDF4' : '#F8FAFC',
                              border: `1.5px solid ${isCorrect ? '#86EFAC' : '#E2E8F0'}`,
                              borderRadius: 12,
                              padding: '8px 14px',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <input
                              type="radio"
                              name={`correct-answer-${qIndex}`}
                              checked={isCorrect}
                              disabled={isReadOnly || saving}
                              onChange={() => handleCorrectAnswerChange(qIndex, optIndex)}
                              style={{ cursor: isReadOnly ? 'default' : 'pointer', accentColor: '#16A34A', width: 16, height: 16 }}
                              title="Đánh dấu đáp án đúng"
                            />
                            <b
                              style={{
                                width: 24,
                                height: 24,
                                borderRadius: '50%',
                                background: isCorrect ? '#16A34A' : '#CBD5E1',
                                color: '#fff',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 12,
                                fontWeight: 800,
                                flexShrink: 0,
                              }}
                            >
                              {charCode}
                            </b>
                            <input
                              type="text"
                              value={opt}
                              onChange={(e) => handleOptionChange(qIndex, optIndex, e.target.value)}
                              disabled={isReadOnly || saving}
                              placeholder={`Phương án ${charCode}...`}
                              style={{
                                flex: 1,
                                border: 'none',
                                background: 'transparent',
                                fontSize: 13.5,
                                fontWeight: 500,
                                color: '#1E293B',
                                outline: 'none',
                                padding: 0,
                              }}
                              required
                            />
                            {isCorrect && (
                              <span style={{ fontSize: 12, fontWeight: 800, color: '#16A34A', display: 'flex', alignItems: 'center', gap: 3 }}>
                                <Icon n="check" s={14} /> Đúng
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Explanation */}
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748B', marginBottom: 5 }}>
                        Giải thích chi tiết (hiện sau khi nộp bài):
                      </label>
                      <input
                        type="text"
                        value={q.explanation || ''}
                        onChange={(e) => handleExplanationChange(qIndex, e.target.value)}
                        disabled={isReadOnly || saving}
                        placeholder="Giải thích vì sao đáp án này đúng..."
                        style={{
                          width: '100%',
                          height: 42,
                          padding: '0 14px',
                          borderRadius: 10,
                          border: '1.5px solid #CBD5E1',
                          background: isReadOnly ? '#F8FAFC' : '#FFFFFF',
                          fontSize: 13,
                          color: '#0F172A',
                          outline: 'none',
                          transition: 'all 0.2s ease',
                          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
                        }}
                        onFocus={(e) => {
                          if (!isReadOnly) {
                            e.currentTarget.style.borderColor = 'var(--primary)';
                            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.12)';
                          }
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = '#CBD5E1';
                          e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.04)';
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Action Buttons Footer */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: 10,
                  paddingTop: 16,
                  borderTop: '1px solid #E2E8F0',
                  flexWrap: 'wrap',
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  {!isReadOnly && (
                    <button
                      type="button"
                      className="btn ghost sm"
                      onClick={() => handleOpenActionConfirm('delete')}
                      disabled={deleting || saving || actionLoading}
                      style={{
                        borderColor: '#FCA5A5',
                        color: '#DC2626',
                        fontWeight: 700,
                      }}
                    >
                      <Icon n="trash" s={14} /> {deleting ? 'Đang xóa...' : 'Xóa bài'}
                    </button>
                  )}
                  {isPending && (
                    <button
                      type="button"
                      className="btn ghost sm"
                      onClick={() => handleOpenActionConfirm('withdraw')}
                      disabled={actionLoading}
                      style={{
                        borderColor: '#FCD34D',
                        color: '#B45309',
                        background: '#FFFBEB',
                        fontWeight: 700,
                      }}
                    >
                      {actionLoading ? 'Đang xử lý...' : '↩️ Rút yêu cầu duyệt'}
                    </button>
                  )}
                  {isPublic && (
                    <button
                      type="button"
                      className="btn ghost sm"
                      onClick={() => handleOpenActionConfirm('hide')}
                      disabled={actionLoading}
                      style={{
                        borderColor: '#CBD5E1',
                        color: '#475569',
                        fontWeight: 700,
                      }}
                    >
                      {actionLoading ? 'Đang xử lý...' : '🔒 Chuyển về riêng tư'}
                    </button>
                  )}
                  {!isPending && !isPublic && (
                    <button
                      type="button"
                      className="btn ghost sm"
                      onClick={() => handleOpenActionConfirm('publish')}
                      disabled={actionLoading || saving}
                      style={{
                        borderColor: '#A5B4FC',
                        color: '#4F46E5',
                        background: '#EEF2FF',
                        fontWeight: 700,
                      }}
                    >
                      {actionLoading ? 'Đang xử lý...' : '🚀 Gửi duyệt công khai'}
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() => {
                      onClose();
                      if (quizId) onStartQuiz(quizId);
                    }}
                    style={{ fontWeight: 700, fontSize: 13.5 }}
                  >
                    Bắt đầu làm bài
                  </button>

                  {!isReadOnly && (
                    <button
                      type="submit"
                      className="btn primary"
                      disabled={saving || deleting}
                      style={{
                        padding: '10px 22px',
                        fontWeight: 800,
                        fontSize: 13.5,
                      }}
                    >
                      {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                    </button>
                  )}
                </div>
              </div>
            </form>
          )}
        </div>
      </motion.div>

      {/* Confirmation Modal for Actions (Gửi duyệt, Rút, Ẩn, Xóa) */}
      {confirmModal.isOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget && !actionLoading && !deleting) {
              setConfirmModal((prev) => ({ ...prev, isOpen: false }));
            }
          }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100010,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(5px)',
            WebkitBackdropFilter: 'blur(5px)',
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
            style={{
              background: '#FFFFFF',
              borderRadius: 20,
              width: '100%',
              maxWidth: 460,
              padding: '24px 24px 20px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #F1F5F9',
              textAlign: 'center',
            }}
          >
            {/* Header Icon */}
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background:
                  confirmModal.type === 'delete'
                    ? '#FEE2E2'
                    : confirmModal.type === 'publish'
                    ? '#EEF2FF'
                    : confirmModal.type === 'withdraw'
                    ? '#FFFBEB'
                    : '#F1F5F9',
                color:
                  confirmModal.type === 'delete'
                    ? '#DC2626'
                    : confirmModal.type === 'publish'
                    ? '#4F46E5'
                    : confirmModal.type === 'withdraw'
                    ? '#D97706'
                    : '#475569',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}
            >
              {confirmModal.type === 'delete' && <Icon n="trash" s={26} />}
              {confirmModal.type === 'publish' && <Icon n="send" s={26} />}
              {confirmModal.type === 'withdraw' && <Icon n="arrowLeft" s={24} />}
              {confirmModal.type === 'hide' && <Icon n="lock" s={24} />}
            </div>

            {/* Title */}
            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', margin: '0 0 8px' }}>
              {confirmModal.type === 'delete' && 'Xác nhận xóa bài tập'}
              {confirmModal.type === 'publish' && 'Gửi bài tập cho Giảng viên duyệt'}
              {confirmModal.type === 'withdraw' && 'Rút yêu cầu duyệt bài tập'}
              {confirmModal.type === 'hide' && 'Chuyển bài tập về riêng tư'}
            </h3>

            {/* Content text */}
            <div style={{ fontSize: 14, color: '#475569', lineHeight: 1.55, margin: '0 0 16px' }}>
              {confirmModal.type === 'delete' && (
                <p style={{ margin: 0 }}>
                  Bạn có chắc chắn muốn xóa bài tập <b style={{ color: '#0F172A' }}>"{quizDetail?.title}"</b> không?
                </p>
              )}
              {confirmModal.type === 'publish' && (
                <p style={{ margin: 0 }}>
                  Gửi đề thi <b style={{ color: '#0F172A' }}>"{quizDetail?.title}"</b> cho Giảng viên duyệt để công khai cho cộng đồng học viên?
                </p>
              )}
              {confirmModal.type === 'withdraw' && (
                <p style={{ margin: 0 }}>
                  Rút yêu cầu duyệt đề thi <b style={{ color: '#0F172A' }}>"{quizDetail?.title}"</b> về chế độ riêng tư?
                </p>
              )}
              {confirmModal.type === 'hide' && (
                <p style={{ margin: 0 }}>
                  Chuyển đề thi <b style={{ color: '#0F172A' }}>"{quizDetail?.title}"</b> về chế độ riêng tư (chỉ bạn thấy)?
                </p>
              )}
            </div>

            {/* Helpful Notice Card */}
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
                background:
                  confirmModal.type === 'delete'
                    ? '#FEF2F2'
                    : confirmModal.type === 'publish'
                    ? '#F5F3FF'
                    : confirmModal.type === 'withdraw'
                    ? '#FFFBEB'
                    : '#F8FAFC',
                border: `1px solid ${
                  confirmModal.type === 'delete'
                    ? '#FCA5A5'
                    : confirmModal.type === 'publish'
                    ? '#DDD6FE'
                    : confirmModal.type === 'withdraw'
                    ? '#FDE68A'
                    : '#E2E8F0'
                }`,
                color:
                  confirmModal.type === 'delete'
                    ? '#991B1B'
                    : confirmModal.type === 'publish'
                    ? '#6D28D9'
                    : confirmModal.type === 'withdraw'
                    ? '#B45309'
                    : '#475569',
              }}
            >
              <div style={{ flexShrink: 0, marginTop: 1 }}>
                <Icon n={confirmModal.type === 'delete' ? 'alert' : confirmModal.type === 'publish' ? 'spark' : 'alert'} s={16} />
              </div>
              <div>
                {confirmModal.type === 'delete' && (
                  <span>
                    Hành động này <b>không thể hoàn tác</b>. Toàn bộ câu hỏi và lịch sử làm bài liên quan sẽ bị xóa vĩnh viễn.
                  </span>
                )}
                {confirmModal.type === 'publish' && (
                  <span>
                    Sau khi được duyệt, đề thi sẽ xuất hiện công khai trên hệ thống. Trong thời gian chờ duyệt, bạn tạm thời không thể sửa đề thi.
                  </span>
                )}
                {confirmModal.type === 'withdraw' && (
                  <span>
                    Đề thi sẽ trở về trạng thái riêng tư để bạn có thể tiếp tục chỉnh sửa nội dung câu hỏi.
                  </span>
                )}
                {confirmModal.type === 'hide' && (
                  <span>
                    Đề thi sẽ không còn hiển thị cho các học viên khác. Bạn vẫn có thể luyện tập bình thường.
                  </span>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn ghost"
                onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                disabled={actionLoading || deleting}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  borderRadius: 12,
                  fontWeight: 700,
                  fontSize: 13.5,
                  borderColor: '#CBD5E1',
                  color: '#475569',
                }}
              >
                Hủy bỏ
              </button>

              <button
                type="button"
                className="btn"
                onClick={handleExecuteAction}
                disabled={actionLoading || deleting}
                style={{
                  flex: 1.25,
                  padding: '10px 16px',
                  borderRadius: 12,
                  fontWeight: 800,
                  fontSize: 13.5,
                  color: '#FFFFFF',
                  background:
                    confirmModal.type === 'delete'
                      ? '#DC2626'
                      : confirmModal.type === 'publish'
                      ? 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)'
                      : confirmModal.type === 'withdraw'
                      ? '#D97706'
                      : '#475569',
                  border: 'none',
                  cursor: actionLoading || deleting ? 'wait' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  boxShadow:
                    confirmModal.type === 'delete'
                      ? '0 4px 14px rgba(220, 38, 38, 0.3)'
                      : confirmModal.type === 'publish'
                      ? '0 4px 14px rgba(79, 70, 229, 0.3)'
                      : '0 4px 12px rgba(0, 0, 0, 0.12)',
                }}
              >
                {actionLoading || deleting ? (
                  <>
                    <div
                      className="spinner"
                      style={{
                        width: 14,
                        height: 14,
                        borderWidth: 2,
                        borderColor: '#FFFFFF',
                        borderTopColor: 'transparent',
                      }}
                    />
                    <span>Đang xử lý...</span>
                  </>
                ) : (
                  <>
                    {confirmModal.type === 'delete' && <Icon n="trash" s={15} />}
                    {confirmModal.type === 'publish' && <Icon n="send" s={15} />}
                    <span>
                      {confirmModal.type === 'delete' && 'Xác nhận xóa'}
                      {confirmModal.type === 'publish' && 'Xác nhận gửi duyệt'}
                      {confirmModal.type === 'withdraw' && 'Rút yêu cầu'}
                      {confirmModal.type === 'hide' && 'Chuyển riêng tư'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>,
    document.body
  );
};

