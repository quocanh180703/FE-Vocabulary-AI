import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { adminExerciseReviewApi, errMsg } from '../../api';
import type { PendingQuizItem } from '../../api';
import { Icon } from '../../components/icons';

export function AdminExerciseReviewTab() {
  const [quizzes, setQuizzes] = useState<PendingQuizItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  // Review modal state
  const [activeQuizId, setActiveQuizId] = useState<number | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData] = useState<{
    quiz: PendingQuizItem;
    questions: Array<{
      id: number;
      content: string;
      options: string[];
      correctAnswer: number;
      explanation?: string;
    }>;
  } | null>(null);

  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectNote, setRejectNote] = useState('');
  const [isApproveConfirmOpen, setIsApproveConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (activeQuizId) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [activeQuizId]);
  const [actionErr, setActionErr] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  const fetchPendingQuizzes = async (pageToFetch: number = page) => {
    setLoading(true);
    setErr('');
    try {
      const res = await adminExerciseReviewApi.list({ page: pageToFetch, size: 10 });
      setQuizzes(res.content || []);
      setTotalPages(res.totalPages || 1);
      setTotalElements(res.totalElements || 0);
    } catch (e: any) {
      setErr(errMsg(e, 'Không thể tải danh sách bài tập chờ duyệt.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingQuizzes(page);
  }, [page]);

  const handleOpenReview = async (quizId: number) => {
    setActiveQuizId(quizId);
    setDetailLoading(true);
    setIsRejecting(false);
    setIsApproveConfirmOpen(false);
    setRejectNote('');
    setActionErr('');
    setActionSuccess('');
    try {
      const res = await adminExerciseReviewApi.get(quizId);
      setDetailData(res);
    } catch (e: any) {
      setActionErr(errMsg(e, 'Không thể tải chi tiết bài tập.'));
    } finally {
      setDetailLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!activeQuizId) return;
    setSubmitting(true);
    setActionErr('');
    try {
      await adminExerciseReviewApi.review(activeQuizId, { decision: 'APPROVED' });
      setActionSuccess('Bài tập đã được phê duyệt và công khai thành công!');
      setIsApproveConfirmOpen(false);
      setTimeout(() => {
        setActiveQuizId(null);
        fetchPendingQuizzes(page);
      }, 1200);
    } catch (e: any) {
      setActionErr(errMsg(e, 'Lỗi khi duyệt bài tập.'));
      setIsApproveConfirmOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeQuizId) return;
    if (!rejectNote.trim()) {
      setActionErr('Vui lòng nhập lý do từ chối để học viên biết và sửa đổi.');
      return;
    }
    setSubmitting(true);
    setActionErr('');
    try {
      await adminExerciseReviewApi.review(activeQuizId, {
        decision: 'REJECTED',
        note: rejectNote.trim(),
      });
      setActionSuccess('Đã từ chối bài tập kèm lý do thành công!');
      setTimeout(() => {
        setActiveQuizId(null);
        fetchPendingQuizzes(page);
      }, 1200);
    } catch (e: any) {
      setActionErr(errMsg(e, 'Lỗi khi từ chối bài tập.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Table Card */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--ink)' }}>
            Danh sách bài tập chờ duyệt ({totalElements} bài)
          </div>
          <button
            type="button"
            className="btn ghost sm"
            onClick={() => fetchPendingQuizzes(page)}
            disabled={loading}
          >
            <Icon n="spark" s={15} /> Làm mới
          </button>
        </div>

        {err && <div className="error" style={{ margin: 16 }}>{err}</div>}

        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--muted)' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--primary)', marginBottom: 4 }}>
              Đang tải danh sách bài tập chờ duyệt...
            </div>
          </div>
        ) : quizzes.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--muted)' }}>
            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 4 }}>
              Không có bài tập nào đang chờ duyệt
            </div>
            <div className="sub">Mọi bài tập gửi lên đã được xử lý xong!</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg-subtle, #f8fafc)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 700 }}>Tiêu đề</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 700 }}>Người tạo</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13, fontWeight: 700 }}>Trình độ</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13, fontWeight: 700 }}>Số câu hỏi</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13, fontWeight: 700 }}>Thời gian gửi</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: 13, fontWeight: 700 }}>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {quizzes.map((q) => (
                  <tr key={q.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>
                        {q.title}
                      </div>
                      <div style={{ display: 'flex', gap: 6, marginTop: 4, alignItems: 'center' }}>
                        {q.isAiGenerated && (
                          <span
                            className="pill"
                            style={{
                              background: '#F5F3FF',
                              color: '#7C3AED',
                              border: '1px solid #DDD6FE',
                              fontSize: 11,
                              fontWeight: 700,
                              padding: '2px 6px',
                            }}
                          >
                            ✨ AI tạo
                          </span>
                        )}
                        <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                          Chủ đề: {q.category}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ fontWeight: 600, color: '#2563eb' }}>
                        @{q.creatorUsername || 'học viên'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <span className={'badge-level ' + q.level.toLowerCase()} style={{ padding: '3px 8px', borderRadius: 6, fontWeight: 800, fontSize: 12 }}>
                        {q.level}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 700 }}>
                      {q.questionCount} câu
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', fontSize: 12.5, color: 'var(--muted)' }}>
                      {q.createdAt ? new Date(q.createdAt).toLocaleDateString('vi-VN') : ''}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <button
                        type="button"
                        className="btn primary sm"
                        onClick={() => handleOpenReview(q.id)}
                        style={{ fontWeight: 700 }}
                      >
                        Kiểm tra &amp; Duyệt
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ padding: '14px 20px', display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: '1px solid var(--border)' }}>
            <button
              type="button"
              className="btn ghost sm"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              Trang trước
            </button>
            <span style={{ alignSelf: 'center', fontSize: 13, fontWeight: 700 }}>
              {page + 1} / {totalPages}
            </span>
            <button
              type="button"
              className="btn ghost sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            >
              Trang sau
            </button>
          </div>
        )}
      </div>

      {/* Review Modal */}
      {activeQuizId &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 99999,
              padding: 16,
            }}
          >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 16,
              width: 760,
              maxWidth: '100%',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              overflow: 'hidden',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid #E2E8F0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: '#F8FAFC',
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#0F172A' }}>
                  Kiểm duyệt bài tập trắc nghiệm
                </h3>
                <div style={{ fontSize: 12.5, color: '#64748B', marginTop: 2 }}>
                  Tác giả: <b>@{detailData?.quiz?.creatorUsername || 'học viên'}</b> • Trình độ: <b>{detailData?.quiz?.level}</b> • Thời gian: <b>{detailData?.quiz?.timeLimit} phút</b>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveQuizId(null)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  padding: 6,
                  borderRadius: 8,
                }}
              >
                <Icon n="close" s={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
              {actionSuccess && (
                <div style={{ padding: '12px 16px', background: '#DCFCE7', color: '#15803D', borderRadius: 8, fontWeight: 700, marginBottom: 16 }}>
                  ✓ {actionSuccess}
                </div>
              )}
              {actionErr && (
                <div style={{ padding: '12px 16px', background: '#FEE2E2', color: '#B91C1C', borderRadius: 8, fontWeight: 700, marginBottom: 16 }}>
                  ⚠️ {actionErr}
                </div>
              )}

              {detailLoading ? (
                <div style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>
                  Đang tải nội dung câu hỏi...
                </div>
              ) : detailData ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div style={{ padding: '14px 16px', background: '#F1F5F9', borderRadius: 10 }}>
                    <div style={{ fontWeight: 800, fontSize: 16, color: '#0F172A', marginBottom: 4 }}>
                      {detailData.quiz.title}
                    </div>
                    {detailData.quiz.description && (
                      <div style={{ fontSize: 13.5, color: '#475569' }}>
                        {detailData.quiz.description}
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 800, color: '#334155' }}>
                      Danh sách câu hỏi & đáp án ({detailData.questions.length} câu)
                    </h4>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {detailData.questions.map((q, idx) => (
                        <div
                          key={q.id || idx}
                          style={{
                            border: '1px solid #E2E8F0',
                            borderRadius: 10,
                            padding: '14px 16px',
                            background: '#FFFFFF',
                          }}
                        >
                          <div style={{ fontWeight: 700, fontSize: 14, color: '#0F172A', marginBottom: 10 }}>
                            Câu {idx + 1}: {q.content}
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 8, marginBottom: 10 }}>
                            {q.options.map((opt, optIdx) => {
                              const isCorrect = optIdx === q.correctAnswer;
                              const charCode = String.fromCharCode(65 + optIdx);
                              return (
                                <div
                                  key={optIdx}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    padding: '8px 12px',
                                    borderRadius: 8,
                                    border: isCorrect ? '2px solid #22C55E' : '1px solid #E2E8F0',
                                    background: isCorrect ? '#F0FDF4' : '#F8FAFC',
                                    fontSize: 13,
                                    fontWeight: isCorrect ? 700 : 500,
                                    color: isCorrect ? '#15803D' : '#334155',
                                  }}
                                >
                                  <b style={{ color: isCorrect ? '#16A34A' : '#64748B' }}>{charCode}.</b>
                                  <span style={{ flex: 1 }}>{opt}</span>
                                  {isCorrect && <span style={{ fontSize: 11, fontWeight: 800 }}>✓ ĐÚNG</span>}
                                </div>
                              );
                            })}
                          </div>

                          {q.explanation && (
                            <div style={{ fontSize: 12.5, color: '#475569', background: '#F8FAFC', padding: '6px 10px', borderRadius: 6, borderLeft: '3px solid #3B82F6' }}>
                              <b>Giải thích:</b> {q.explanation}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Reject reason input section if rejecting */}
                  {isRejecting && (
                    <form onSubmit={handleReject} style={{ marginTop: 10, padding: '16px', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 10 }}>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#B91C1C', marginBottom: 6 }}>
                        Nhập lý do từ chối (bắt buộc để phản hồi cho học viên):
                      </label>
                      <textarea
                        value={rejectNote}
                        onChange={(e) => setRejectNote(e.target.value)}
                        placeholder="Ví dụ: Câu 3 đáp án chưa chính xác, phần giải thích còn sơ sài..."
                        rows={3}
                        style={{
                          width: '100%',
                          padding: 10,
                          borderRadius: 8,
                          border: '1px solid #F87171',
                          fontSize: 13,
                          outline: 'none',
                          marginBottom: 10,
                        }}
                        required
                      />
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                        <button
                          type="button"
                          className="btn ghost sm"
                          onClick={() => setIsRejecting(false)}
                          disabled={submitting}
                        >
                          Hủy bỏ
                        </button>
                        <button
                          type="submit"
                          className="btn sm"
                          disabled={submitting || !rejectNote.trim()}
                          style={{ background: '#DC2626', color: '#FFFFFF', fontWeight: 800 }}
                        >
                          {submitting ? 'Đang gửi...' : 'Xác nhận từ chối'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              ) : null}
            </div>

            {/* Modal Footer Actions */}
            <div
              style={{
                padding: '14px 20px',
                borderTop: '1px solid #E2E8F0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: '#F8FAFC',
              }}
            >
              <button
                type="button"
                className="btn ghost sm"
                onClick={() => {
                  setActiveQuizId(null);
                  setIsApproveConfirmOpen(false);
                  setIsRejecting(false);
                }}
                disabled={submitting}
              >
                Đóng
              </button>

              {!isRejecting && (
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    type="button"
                    className="btn ghost sm"
                    onClick={() => setIsRejecting(true)}
                    disabled={submitting || detailLoading}
                    style={{ borderColor: '#FCA5A5', color: '#DC2626', fontWeight: 700 }}
                  >
                    Từ chối bài tập
                  </button>
                  <button
                    type="button"
                    className="btn primary sm"
                    onClick={() => setIsApproveConfirmOpen(true)}
                    disabled={submitting || detailLoading}
                    style={{ background: '#16A34A', borderColor: '#16A34A', fontWeight: 800 }}
                  >
                    ✓ Phê duyệt & Công khai
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Confirm Approve Modal */}
      {isApproveConfirmOpen && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="approve-confirm-title"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100010,
            padding: '16px',
            animation: 'fadeIn 0.15s ease-out',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !submitting) {
              setIsApproveConfirmOpen(false);
            }
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              padding: '28px 24px 24px',
              maxWidth: '460px',
              width: '100%',
              boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(0, 0, 0, 0.05)',
              textAlign: 'center',
              position: 'relative',
            }}
          >
            {/* Close button */}
            <button
              type="button"
              onClick={() => setIsApproveConfirmOpen(false)}
              disabled={submitting}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: '#F1F5F9',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: submitting ? 'not-allowed' : 'pointer',
                color: '#64748B',
                fontSize: '15px',
                fontWeight: 700,
              }}
              aria-label="Đóng"
            >
              ✕
            </button>

            {/* Icon */}
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: '#DCFCE7',
                color: '#16A34A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                boxShadow: '0 4px 12px rgba(22, 163, 74, 0.2)',
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>

            {/* Title */}
            <h3
              id="approve-confirm-title"
              style={{
                fontSize: '19px',
                fontWeight: 800,
                color: '#0F172A',
                margin: '0 0 8px',
                lineHeight: 1.3,
              }}
            >
              Phê duyệt &amp; Công khai bài tập
            </h3>

            {/* Subtitle */}
            <p
              style={{
                fontSize: '13.5px',
                color: '#64748B',
                lineHeight: 1.5,
                margin: '0 0 18px',
              }}
            >
              Bạn có chắc chắn muốn phê duyệt đề thi này? Sau khi được phê duyệt, bài tập sẽ được xuất bản công khai cho toàn bộ học viên cùng luyện tập.
            </p>

            {/* Quiz Info Summary Box */}
            <div
              style={{
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                padding: '12px 14px',
                textAlign: 'left',
                marginBottom: '22px',
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  fontSize: '14px',
                  color: '#1E293B',
                  marginBottom: '6px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {detailData?.quiz?.title || 'Bài tập'}
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '8px',
                  fontSize: '12px',
                  color: '#64748B',
                }}
              >
                <span
                  style={{
                    background: '#EEF2FF',
                    color: '#4F46E5',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontWeight: 700,
                  }}
                >
                  Cấp {detailData?.quiz?.level || 'A1'}
                </span>
                <span>•</span>
                <span>{detailData?.questions?.length || 0} câu hỏi</span>
                <span>•</span>
                <span>
                  Tác giả: <strong style={{ color: '#0F172A' }}>@{detailData?.quiz?.creatorUsername || 'học viên'}</strong>
                </span>
              </div>
            </div>

            {/* Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setIsApproveConfirmOpen(false)}
                disabled={submitting}
                style={{
                  padding: '11px 16px',
                  borderRadius: '10px',
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  color: '#475569',
                  fontWeight: 700,
                  fontSize: '13.5px',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  transition: 'background-color 0.15s ease',
                }}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleApprove}
                disabled={submitting}
                style={{
                  padding: '11px 16px',
                  borderRadius: '10px',
                  border: 'none',
                  background: '#16A34A',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '13.5px',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 8px rgba(22, 163, 74, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                {submitting ? 'Đang xử lý...' : '✓ Xác nhận duyệt'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

