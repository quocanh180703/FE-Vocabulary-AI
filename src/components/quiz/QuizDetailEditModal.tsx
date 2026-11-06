import React, { useState, useEffect } from 'react';
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

  // Delete quiz
  const handleDelete = () => {
    if (!quizId || isReadOnly) return;
    if (!window.confirm(`Bạn có chắc chắn muốn xóa bài tập "${quizDetail?.title}" không? Hành động này không thể hoàn tác.`)) {
      return;
    }

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
      .finally(() => setDeleting(false));
  };

  const handlePublishRequest = async () => {
    if (!quizId) return;
    if (!window.confirm('Gửi bài tập này cho Giảng viên duyệt để công khai cho cộng đồng?')) return;
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
    }
  };

  const handleWithdraw = async () => {
    if (!quizId) return;
    if (!window.confirm('Bạn có chắc muốn rút yêu cầu duyệt bài tập này về chế độ riêng tư?')) return;
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
    }
  };

  const handleHide = async () => {
    if (!quizId) return;
    if (!window.confirm('Chuyển bài tập về chế độ riêng tư (chỉ bạn thấy)? Người khác sẽ không thấy bài này trong danh sách chung nữa.')) return;
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
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 1000,
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
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 5 }}>
                    Tiêu đề bài trắc nghiệm <span style={{ color: 'var(--red)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    disabled={isReadOnly || saving}
                    style={{ width: '100%', fontSize: 14 }}
                    maxLength={150}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 5 }}>
                      Cấp độ CEFR
                    </label>
                    <select
                      value={level}
                      onChange={(e) => setLevel(e.target.value)}
                      disabled={isReadOnly || saving}
                      style={{ width: '100%', fontSize: 13.5 }}
                    >
                      {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map((lvl) => (
                        <option key={lvl} value={lvl}>
                          Cấp {lvl}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 5 }}>
                      Thời gian làm bài (phút)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={180}
                      value={timeLimit}
                      onChange={(e) => setTimeLimit(Math.max(1, parseInt(e.target.value) || 1))}
                      disabled={isReadOnly || saving}
                      style={{ width: '100%', fontSize: 13.5 }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 5 }}>
                    Mô tả / Ghi chú (Tùy chọn)
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={isReadOnly || saving}
                    placeholder="Mô tả ngắn gọn về nội dung ôn tập..."
                    style={{ width: '100%', fontSize: 13.5 }}
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
                        style={{ width: '100%', fontSize: 13.5, resize: 'vertical' }}
                        required
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
                              border: `1px solid ${isCorrect ? '#86EFAC' : '#E2E8F0'}`,
                              borderRadius: 10,
                              padding: '6px 12px',
                            }}
                          >
                            <input
                              type="radio"
                              name={`correct-answer-${qIndex}`}
                              checked={isCorrect}
                              disabled={isReadOnly || saving}
                              onChange={() => handleCorrectAnswerChange(qIndex, optIndex)}
                              style={{ cursor: isReadOnly ? 'default' : 'pointer' }}
                              title="Đánh dấu đáp án đúng"
                            />
                            <b
                              style={{
                                width: 22,
                                height: 22,
                                borderRadius: '50%',
                                background: isCorrect ? '#15803D' : '#CBD5E1',
                                color: '#fff',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 11,
                                fontWeight: 800,
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
                                outline: 'none',
                                padding: 0,
                              }}
                              required
                            />
                            {isCorrect && (
                              <span style={{ fontSize: 12, fontWeight: 800, color: '#15803D' }}>
                                ✓ Đúng
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Explanation */}
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748B', marginBottom: 4 }}>
                        Giải thích chi tiết (hiện sau khi nộp bài):
                      </label>
                      <input
                        type="text"
                        value={q.explanation || ''}
                        onChange={(e) => handleExplanationChange(qIndex, e.target.value)}
                        disabled={isReadOnly || saving}
                        placeholder="Giải thích vì sao đáp án này đúng..."
                        style={{ width: '100%', fontSize: 13 }}
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
                      onClick={handleDelete}
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
                      onClick={handleWithdraw}
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
                      onClick={handleHide}
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
                      onClick={handlePublishRequest}
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
    </div>
  );
};

