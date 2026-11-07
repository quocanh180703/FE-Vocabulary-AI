import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { documentApi, errMsg } from '../../api';
import type { DocumentItem, DocumentAnalysis, DocumentChatMessage, Quiz, DraftQuestion } from '../../api';
import { Icon, Mascot } from '../icons';
import { useUsage } from '../../context/UsageContext';
import { QuotaBadge } from '../QuotaBadge';

interface CreateAiQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newQuiz: Quiz) => void;
  onStartQuiz?: (quizId: number) => void;
}

type Step = 1 | 2 | 3 | 4 | 'SUCCESS';

export const CreateAiQuizModal: React.FC<CreateAiQuizModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onStartQuiz,
}) => {
  const { usage, isVip, openUpgradeModal, decrementQuota, refreshUsage } = useUsage();

  // Wizard Step
  const [step, setStep] = useState<Step>(1);

  // Step 1: Document state
  const [docTab, setDocTab] = useState<'upload' | 'library'>('upload');
  const [recentDocs, setRecentDocs] = useState<DocumentItem[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);
  const [docErr, setDocErr] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Selection & Batch Delete state
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedDocIds, setSelectedDocIds] = useState<Set<number>>(new Set());

  // Custom Delete Modal state
  interface DeleteModalState {
    isOpen: boolean;
    type: 'single' | 'batch' | 'all';
    targetDoc?: DocumentItem | null;
  }
  const [deleteModal, setDeleteModal] = useState<DeleteModalState>({
    isOpen: false,
    type: 'single',
    targetDoc: null,
  });
  const [deleting, setDeleting] = useState(false);
  const [docFeedback, setDocFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Step 2: Analysis state
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisData, setAnalysisData] = useState<DocumentAnalysis | null>(null);
  const [analysisErr, setAnalysisErr] = useState('');

  // Step 3: Chat state
  const [chatMessages, setChatMessages] = useState<DocumentChatMessage[]>([
    {
      role: 'assistant',
      content:
        'Xin chào! Tôi đã phân tích xong tài liệu của bạn. Bạn có muốn yêu cầu thêm điều gì cho bài tập không (ví dụ: tập trung vào thì quá khứ, tăng độ khó câu bẫy từ vựng, giải thích chi tiết)? Nếu không, bạn có thể bấm "Bỏ qua & Cấu hình" nhé!',
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatSending, setChatSending] = useState(false);
  const [chatErr, setChatErr] = useState('');
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const [draftQuestions, setDraftQuestions] = useState<DraftQuestion[]>([]);

  // Step 4: Quiz Config state
  const [quizTitle, setQuizTitle] = useState('');
  const [quizLevel, setQuizLevel] = useState('B1');
  const [questionCount, setQuestionCount] = useState(10);
  const [extraPrompt, setExtraPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generateErr, setGenerateErr] = useState('');
  const [createdQuiz, setCreatedQuiz] = useState<Quiz | null>(null);

  // Check quota
  const quotaRemaining = usage?.features?.exercise_generation?.remaining ?? 3;
  const isOutOfQuota = !isVip && quotaRemaining <= 0;

  // Lock body scroll when modal is open
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

  // Load user docs when modal opens
  useEffect(() => {
    if (isOpen) {
      loadRecentDocs();
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    setStep(1);
    setSelectedDoc(null);
    setDocErr('');
    setAnalysisData(null);
    setAnalysisErr('');
    setDraftQuestions([]);
    setChatMessages([
      {
        role: 'assistant',
        content:
          'Xin chào! Tôi đã đọc hiểu tài liệu của bạn. Bạn có muốn yêu cầu thêm điều gì cho đề thi (ví dụ: tập trung vào dạng từ loại, bẫy ngữ pháp, hoặc số lượng từ mới)? Nếu không, bạn có thể bấm "Bỏ qua & Cấu hình" nhé!',
      },
    ]);
    setChatInput('');
    setExtraPrompt('');
    setGenerateErr('');
    setCreatedQuiz(null);
  };

  const loadRecentDocs = () => {
    setDocsLoading(true);
    documentApi
      .list({ page: 0, size: 20 })
      .then(({ data }) => {
        setRecentDocs(data.content || []);
      })
      .catch(() => {})
      .finally(() => setDocsLoading(false));
  };

  // Drag and drop & file upload handlers
  const handleFileSelect = (file: File) => {
    setDocErr('');
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    const allowed = ['.txt', '.md', '.pdf', '.docx'];
    if (!allowed.includes(ext)) {
      setDocErr('Định dạng file không hỗ trợ. Vui lòng chọn .txt, .md, .pdf hoặc .docx');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setDocErr('Dung lượng file vượt quá giới hạn 10MB.');
      return;
    }

    setUploading(true);
    documentApi
      .upload(file)
      .then((uploaded) => {
        setSelectedDoc(uploaded);
        loadRecentDocs();
        handleProceedToAnalyze(uploaded);
      })
      .catch((e) => {
        setDocErr(errMsg(e) || 'Không thể tải file lên. Vui lòng thử lại.');
      })
      .finally(() => setUploading(false));
  };

  const handleProceedToAnalyze = (doc: DocumentItem) => {
    setSelectedDoc(doc);
    setStep(2);
    setAnalysisLoading(true);
    setAnalysisErr('');
        // Default quiz title from doc (clean up underscores and hyphens)
    const rawName = doc.originalName.replace(/\.[^/.]+$/, '');
    const cleanName = rawName.replace(/[_-]+/g, ' ').trim();
    const formattedName = cleanName ? cleanName.charAt(0).toUpperCase() + cleanName.slice(1) : 'Bài tập mới';
    setQuizTitle(`Bài tập: ${formattedName}`);

    documentApi
      .analyze(doc.id)
      .then((res) => {
        setAnalysisData(res);
        if (res.suggestedLevel) {
          setQuizLevel(res.suggestedLevel);
        }
      })
      .catch((e) => {
        setAnalysisErr(errMsg(e) || 'AI gặp trục trặc khi phân tích tài liệu. Bạn vẫn có thể tiếp tục tạo bài tập.');
      })
      .finally(() => setAnalysisLoading(false));
  };

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setDocFeedback({ type, text });
    setTimeout(() => {
      setDocFeedback(null);
    }, 3500);
  };

  const toggleSelectDoc = (docId: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedDocIds((prev) => {
      const next = new Set(prev);
      if (next.has(docId)) {
        next.delete(docId);
      } else {
        next.add(docId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedDocIds.size === recentDocs.length) {
      setSelectedDocIds(new Set());
    } else {
      setSelectedDocIds(new Set(recentDocs.map((d) => d.id)));
    }
  };

  const cancelSelectMode = () => {
    setIsSelectMode(false);
    setSelectedDocIds(new Set());
  };

  const handleRequestDeleteSingle = (doc: DocumentItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteModal({
      isOpen: true,
      type: 'single',
      targetDoc: doc,
    });
  };

  const handleRequestDeleteBatch = () => {
    if (selectedDocIds.size === 0) return;
    setDeleteModal({
      isOpen: true,
      type: 'batch',
      targetDoc: null,
    });
  };

  const handleRequestDeleteAll = () => {
    if (recentDocs.length === 0) return;
    setDeleteModal({
      isOpen: true,
      type: 'all',
      targetDoc: null,
    });
  };

  const closeDeleteModal = () => {
    if (deleting) return;
    setDeleteModal({ isOpen: false, type: 'single', targetDoc: null });
  };

  const handleConfirmDelete = async () => {
    if (deleting) return;
    setDeleting(true);

    try {
      if (deleteModal.type === 'single' && deleteModal.targetDoc) {
        const docId = deleteModal.targetDoc.id;
        const docName = deleteModal.targetDoc.originalName;
        await documentApi.delete(docId);
        setRecentDocs((prev) => prev.filter((d) => d.id !== docId));
        if (selectedDoc?.id === docId) setSelectedDoc(null);
        setSelectedDocIds((prev) => {
          const next = new Set(prev);
          next.delete(docId);
          return next;
        });
        showFeedback('success', `Đã xóa tài liệu "${docName}"`);
      } else if (deleteModal.type === 'batch') {
        const ids = Array.from(selectedDocIds);
        const results = await Promise.allSettled(ids.map((id) => documentApi.delete(id)));
        const successIds = new Set<number>();
        results.forEach((res, index) => {
          if (res.status === 'fulfilled') {
            successIds.add(ids[index]);
          }
        });
        setRecentDocs((prev) => prev.filter((d) => !successIds.has(d.id)));
        if (selectedDoc && successIds.has(selectedDoc.id)) setSelectedDoc(null);
        setSelectedDocIds(new Set());
        setIsSelectMode(false);
        showFeedback('success', `Đã xóa thành công ${successIds.size} tài liệu đã chọn`);
      } else if (deleteModal.type === 'all') {
        const allIds = recentDocs.map((d) => d.id);
        const results = await Promise.allSettled(allIds.map((id) => documentApi.delete(id)));
        const successIds = new Set<number>();
        results.forEach((res, index) => {
          if (res.status === 'fulfilled') {
            successIds.add(allIds[index]);
          }
        });
        setRecentDocs((prev) => prev.filter((d) => !successIds.has(d.id)));
        if (selectedDoc && successIds.has(selectedDoc.id)) setSelectedDoc(null);
        setSelectedDocIds(new Set());
        setIsSelectMode(false);
        showFeedback('success', `Đã xóa toàn bộ ${successIds.size} tài liệu trong thư viện`);
      }
      setDeleteModal({ isOpen: false, type: 'single', targetDoc: null });
    } catch (err) {
      showFeedback('error', errMsg(err) || 'Không thể xóa tài liệu. Vui lòng thử lại.');
    } finally {
      setDeleting(false);
    }
  };

  // Step 3 Chat handlers
  const handleSendChat = () => {
    if (!chatInput.trim() || !selectedDoc || chatSending) return;
    const userMsg: DocumentChatMessage = { role: 'user', content: chatInput.trim() };
    const newMsgs = [...chatMessages, userMsg];
    setChatMessages(newMsgs);
    setChatInput('');
    setChatSending(true);
    setChatErr('');

    // Scroll down
    setTimeout(() => {
      chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: 'smooth' });
    }, 50);

    documentApi
      .chat(selectedDoc.id, newMsgs)
      .then((res) => {
        const replyMsg: DocumentChatMessage = { role: 'assistant', content: res.reply };
        const updated = [...newMsgs, replyMsg];
        setChatMessages(updated);
        if (res.draftQuestions && res.draftQuestions.length > 0) {
          setDraftQuestions(res.draftQuestions);
        }
        // append user prompts to extraPrompt
        const promptSummary = newMsgs
          .filter((m) => m.role === 'user')
          .map((m) => m.content)
          .join('; ');
        setExtraPrompt(promptSummary);
      })
      .catch((e) => {
        setChatErr(errMsg(e) || 'AI chưa phản hồi. Vui lòng gửi lại.');
      })
      .finally(() => {
        setChatSending(false);
        setTimeout(() => {
          chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: 'smooth' });
        }, 50);
      });
  };

  const handleUseDraft = () => {
    if (draftQuestions.length === 0) return;
    setQuestionCount(draftQuestions.length);
    const draftFormatted = draftQuestions.map((q, i) =>
      `Câu ${i + 1}: ${q.content} (Đáp án: ${q.options[q.correctAnswer ?? 0] || 'A'})`
    ).join('\n');
    setExtraPrompt((prev) =>
      prev ? `${prev}\n\nƯu tiên sử dụng bản nháp sau:\n${draftFormatted}`
           : `Ưu tiên sử dụng bản nháp sau:\n${draftFormatted}`
    );
    setStep(4);
  };

  // Step 4 Quiz generation handler
  const handleGenerateQuiz = () => {
    if (!selectedDoc) return;
    if (isOutOfQuota) {
      openUpgradeModal({ feature: 'exercise_generation' });
      return;
    }
    setGenerating(true);
    setGenerateErr('');

    documentApi
      .generateQuiz(selectedDoc.id, {
        title: quizTitle.trim() || `Bài tập từ ${selectedDoc.originalName}`,
        level: quizLevel,
        questionCount,
        extraPrompt: extraPrompt.trim() || undefined,
      })
      .then((quiz) => {
        decrementQuota('exercise_generation');
        refreshUsage();
        setCreatedQuiz(quiz);
        setStep('SUCCESS');
        onSuccess(quiz);
      })
      .catch((e) => {
        setGenerateErr(errMsg(e) || 'Không thể tạo bài tập từ tài liệu. Lượt tạo của bạn đã được bảo lưu.');
      })
      .finally(() => setGenerating(false));
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
        if (e.target === e.currentTarget && !generating) onClose();
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
          maxWidth: 680,
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
        {/* Modal Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #FAF5FF 0%, #F5F3FF 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon n="spark" s={20} />
            </div>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: '#1E1B4B' }}>
                Tạo bài tập AI từ tài liệu
              </h2>
              <div style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>
                Đọc hiểu tài liệu, trích xuất từ vựng và tự động soạn câu hỏi
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <QuotaBadge featureKey="exercise_generation" labelSuffix="lượt tạo" />
            <button
              className="btn ghost sm"
              onClick={onClose}
              disabled={generating}
              style={{
                padding: '6px 10px',
                border: 'none',
                background: 'transparent',
                color: '#64748B',
                borderRadius: 8,
                cursor: 'pointer',
              }}
            >
              <Icon n="x" s={18} />
            </button>
          </div>
        </div>

        {/* Step Indicator Bar */}
        {step !== 'SUCCESS' && (
          <div
            style={{
              display: 'flex',
              padding: '12px 24px',
              background: '#F8FAFC',
              borderBottom: '1px solid #E2E8F0',
              gap: 8,
            }}
          >
            {[
              { num: 1, label: 'Chọn tài liệu' },
              { num: 2, label: 'AI phân tích' },
              { num: 3, label: 'Chat tinh chỉnh' },
              { num: 4, label: 'Cấu hình & Tạo' },
            ].map((s) => {
              const isActive = step === s.num;
              const isPassed = typeof step === 'number' && step > s.num;
              return (
                <div
                  key={s.num}
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    padding: '8px 10px',
                    borderRadius: 10,
                    fontSize: 12.5,
                    fontWeight: isActive ? 800 : 600,
                    color: isActive ? '#4F46E5' : isPassed ? '#059669' : '#64748B',
                    background: isActive ? '#EEF2FF' : isPassed ? '#ECFDF5' : '#F1F5F9',
                    border: isActive
                      ? '1.5px solid #C7D2FE'
                      : isPassed
                      ? '1.5px solid #A7F3D0'
                      : '1.5px solid transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    transition: 'all 0.2s ease',
                  }}
                >
                  <span
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      background: isActive ? '#4F46E5' : isPassed ? '#10B981' : '#CBD5E1',
                      color: '#FFFFFF',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 10.5,
                      fontWeight: 800,
                      flexShrink: 0,
                    }}
                  >
                    {isPassed ? <Icon n="check" s={11} /> : s.num}
                  </span>
                  <span>{s.label}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal Body */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {/* ================= STEP 1: CHỌN TÀI LIỆU ================= */}
          {step === 1 && (
            <div>
              <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
                <button
                  type="button"
                  className={'chip' + (docTab === 'upload' ? ' on' : '')}
                  onClick={() => setDocTab('upload')}
                  style={{ padding: '6px 16px', fontSize: 13, fontWeight: 700 }}
                >
                  <Icon n="upload" s={16} /> Tải file mới
                </button>
                <button
                  type="button"
                  className={'chip' + (docTab === 'library' ? ' on' : '')}
                  onClick={() => setDocTab('library')}
                  style={{ padding: '6px 16px', fontSize: 13, fontWeight: 700 }}
                >
                  <Icon n="book" s={16} /> Tài liệu đã lưu ({recentDocs.length})
                </button>
              </div>

              {docErr && (
                <div
                  style={{
                    background: '#FEF2F2',
                    border: '1px solid #FCA5A5',
                    color: '#B91C1C',
                    padding: '10px 14px',
                    borderRadius: 10,
                    fontSize: 13.5,
                    marginBottom: 16,
                  }}
                >
                  {docErr}
                </div>
              )}

              {docTab === 'upload' && (
                <div>
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragOver(true);
                    }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragOver(false);
                      if (e.dataTransfer.files?.[0]) {
                        handleFileSelect(e.dataTransfer.files[0]);
                      }
                    }}
                    onClick={() => !uploading && fileInputRef.current?.click()}
                    style={{
                      border: `2px dashed ${isDragOver ? 'var(--primary)' : '#CBD5E1'}`,
                      background: isDragOver ? '#EFF6FF' : '#F8FAFC',
                      borderRadius: 16,
                      padding: '36px 20px',
                      textAlign: 'center',
                      cursor: uploading ? 'wait' : 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".txt,.md,.pdf,.docx"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          handleFileSelect(e.target.files[0]);
                        }
                      }}
                    />

                    {uploading ? (
                      <div>
                        <div className="spinner" style={{ margin: '0 auto 12px' }} />
                        <b style={{ color: 'var(--primary)', fontSize: 15 }}>Đang tải lên và trích xuất tài liệu...</b>
                        <div style={{ color: '#64748B', fontSize: 13, marginTop: 4 }}>
                          Vui lòng chờ trong giây lát
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div
                          style={{
                            width: 56,
                            height: 56,
                            borderRadius: '50%',
                            background: '#EEF2FF',
                            color: 'var(--primary)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: 14,
                          }}
                        >
                          <Icon n="upload" s={28} />
                        </div>
                        <h4 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 6px', color: '#1E293B' }}>
                          Kéo thả hoặc nhấn để chọn file
                        </h4>
                        <p style={{ margin: 0, fontSize: 13, color: '#64748B' }}>
                          Hỗ trợ định dạng <b>.PDF, .DOCX, .TXT, .MD</b> (Tối đa 10MB)
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {docTab === 'library' && (
                <div>
                  {docFeedback && (
                    <div
                      style={{
                        padding: '10px 14px',
                        borderRadius: 12,
                        fontSize: 13,
                        fontWeight: 600,
                        marginBottom: 12,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        background: docFeedback.type === 'success' ? '#F0FDF4' : '#FEF2F2',
                        border: `1px solid ${docFeedback.type === 'success' ? '#BBF7D0' : '#FECDD3'}`,
                        color: docFeedback.type === 'success' ? '#15803D' : '#BE123C',
                      }}
                    >
                      <Icon n={docFeedback.type === 'success' ? 'checkc' : 'alert'} s={16} />
                      <span>{docFeedback.text}</span>
                    </div>
                  )}

                  {docsLoading ? (
                    <div style={{ textAlign: 'center', padding: '30px 0' }}>
                      <div className="spinner" style={{ margin: '0 auto 10px' }} />
                      <div className="sub">Đang tải danh sách tài liệu...</div>
                    </div>
                  ) : recentDocs.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '36px 16px', color: '#64748B' }}>
                      Chưa có tài liệu nào được lưu. Hãy chuyển sang tab <b>Tải file mới</b> để upload.
                    </div>
                  ) : (
                    <div>
                      {/* Top Action Bar: Xóa chọn lọc & Xóa tất cả */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: isSelectMode ? '8px 12px' : '4px 2px 10px 2px',
                          marginBottom: 10,
                          background: isSelectMode ? '#F8FAFC' : 'transparent',
                          borderRadius: 12,
                          border: isSelectMode ? '1px solid #E2E8F0' : 'none',
                          flexWrap: 'wrap',
                          gap: 8,
                        }}
                      >
                        {isSelectMode ? (
                          <>
                            <label
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 8,
                                fontSize: 13,
                                fontWeight: 700,
                                color: '#1E293B',
                                cursor: 'pointer',
                                userSelect: 'none',
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={selectedDocIds.size > 0 && selectedDocIds.size === recentDocs.length}
                                ref={(el) => {
                                  if (el) {
                                    el.indeterminate = selectedDocIds.size > 0 && selectedDocIds.size < recentDocs.length;
                                  }
                                }}
                                onChange={handleSelectAll}
                                style={{
                                  width: 17,
                                  height: 17,
                                  accentColor: 'var(--primary)',
                                  cursor: 'pointer',
                                }}
                              />
                              <span>
                                {selectedDocIds.size === 0
                                  ? 'Chọn tất cả'
                                  : `Đã chọn ${selectedDocIds.size}/${recentDocs.length} tài liệu`}
                              </span>
                            </label>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <button
                                type="button"
                                className="btn sm"
                                disabled={selectedDocIds.size === 0}
                                onClick={handleRequestDeleteBatch}
                                style={{
                                  background: selectedDocIds.size === 0 ? '#E2E8F0' : '#DC2626',
                                  color: selectedDocIds.size === 0 ? '#94A3B8' : '#FFFFFF',
                                  border: 'none',
                                  padding: '5px 12px',
                                  borderRadius: 8,
                                  fontSize: 12.5,
                                  fontWeight: 700,
                                  cursor: selectedDocIds.size === 0 ? 'not-allowed' : 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 5,
                                  transition: 'all 0.15s ease',
                                }}
                              >
                                <Icon n="trash" s={14} />
                                <span>Xóa đã chọn ({selectedDocIds.size})</span>
                              </button>
                              <button
                                type="button"
                                className="btn ghost sm"
                                onClick={cancelSelectMode}
                                style={{
                                  padding: '5px 10px',
                                  fontSize: 12.5,
                                  fontWeight: 600,
                                  color: '#64748B',
                                  borderColor: '#CBD5E1',
                                }}
                              >
                                Hủy
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <div
                              style={{
                                fontSize: 13,
                                color: '#64748B',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                              }}
                            >
                              <span>
                                Thư viện: <b style={{ color: '#1E293B' }}>{recentDocs.length}</b> tài liệu
                              </span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <button
                                type="button"
                                className="btn ghost sm"
                                onClick={() => setIsSelectMode(true)}
                                style={{
                                  padding: '5px 12px',
                                  fontSize: 12.5,
                                  fontWeight: 700,
                                  color: '#334155',
                                  borderColor: '#CBD5E1',
                                  background: '#FFFFFF',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  borderRadius: 8,
                                }}
                                title="Chọn nhiều tài liệu để xóa chọn lọc"
                              >
                                <Icon n="checkc" s={14} />
                                <span>Xóa chọn lọc</span>
                              </button>

                              <button
                                type="button"
                                className="btn ghost sm"
                                onClick={handleRequestDeleteAll}
                                style={{
                                  padding: '5px 12px',
                                  fontSize: 12.5,
                                  fontWeight: 700,
                                  color: '#DC2626',
                                  borderColor: '#FECDD3',
                                  background: '#FFF5F5',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 5,
                                  borderRadius: 8,
                                }}
                                title="Xóa toàn bộ tài liệu trong danh sách"
                              >
                                <Icon n="trash" s={14} />
                                <span>Xóa tất cả</span>
                              </button>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Documents list */}
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 10,
                          maxHeight: 310,
                          overflowY: 'auto',
                          paddingRight: 2,
                        }}
                      >
                        {recentDocs.map((doc) => {
                          const isSelected = selectedDocIds.has(doc.id);
                          return (
                            <div
                              key={doc.id}
                              onClick={() => {
                                if (isSelectMode) {
                                  toggleSelectDoc(doc.id);
                                } else {
                                  handleProceedToAnalyze(doc);
                                }
                              }}
                              style={{
                                padding: '12px 16px',
                                borderRadius: 14,
                                border: `1.5px solid ${
                                  isSelectMode && isSelected
                                    ? 'var(--primary)'
                                    : '#E2E8F0'
                                }`,
                                background: isSelectMode && isSelected ? '#F5F3FF' : '#FFFFFF',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 12,
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                                boxShadow: isSelectMode && isSelected ? '0 2px 8px rgba(99, 102, 241, 0.12)' : 'none',
                              }}
                              onMouseEnter={(e) => {
                                if (!isSelectMode || !isSelected) {
                                  e.currentTarget.style.borderColor = 'var(--primary)';
                                  e.currentTarget.style.background = '#F8FAFC';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isSelectMode || !isSelected) {
                                  e.currentTarget.style.borderColor = '#E2E8F0';
                                  e.currentTarget.style.background = '#FFFFFF';
                                }
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
                                {isSelectMode && (
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleSelectDoc(doc.id)}
                                    onClick={(e) => e.stopPropagation()}
                                    style={{
                                      width: 18,
                                      height: 18,
                                      accentColor: 'var(--primary)',
                                      cursor: 'pointer',
                                      flexShrink: 0,
                                    }}
                                  />
                                )}
                                <div
                                  style={{
                                    width: 38,
                                    height: 38,
                                    borderRadius: 10,
                                    background: '#EDE9FE',
                                    color: '#7C3AED',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 800,
                                    fontSize: 11,
                                    textTransform: 'uppercase',
                                    flexShrink: 0,
                                  }}
                                >
                                  {doc.fileType}
                                </div>
                                <div style={{ minWidth: 0, flex: 1 }}>
                                  <b
                                    style={{
                                      fontSize: 14,
                                      color: '#1E293B',
                                      display: 'block',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    {doc.originalName}
                                  </b>
                                  <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                                    {doc.charCount?.toLocaleString()} ký tự · {Math.round(doc.fileSize / 1024)} KB
                                  </div>
                                </div>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                {!isSelectMode ? (
                                  <>
                                    <button
                                      className="btn primary sm"
                                      style={{ fontSize: 12, padding: '5px 14px', borderRadius: 8, fontWeight: 700 }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleProceedToAnalyze(doc);
                                      }}
                                    >
                                      Chọn
                                    </button>
                                    <button
                                      className="btn ghost sm"
                                      style={{
                                        padding: '5px 9px',
                                        color: '#EF4444',
                                        borderColor: '#FCA5A5',
                                        background: '#FEF2F2',
                                        borderRadius: 8,
                                      }}
                                      onClick={(e) => handleRequestDeleteSingle(doc, e)}
                                      title="Xóa tài liệu này"
                                    >
                                      <Icon n="trash" s={14} />
                                    </button>
                                  </>
                                ) : (
                                  <span
                                    style={{
                                      fontSize: 12,
                                      fontWeight: 600,
                                      color: isSelected ? 'var(--primary)' : '#94A3B8',
                                      padding: '4px 10px',
                                      borderRadius: 6,
                                      background: isSelected ? '#EDE9FE' : '#F1F5F9',
                                    }}
                                  >
                                    {isSelected ? 'Đã chọn' : 'Chưa chọn'}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ================= STEP 2: AI ĐỌC & PHÂN TÍCH ================= */}
          {step === 2 && (
            <div>
              {analysisLoading ? (
                <div style={{ textAlign: 'center', padding: '40px 16px' }}>
                  <div style={{ marginBottom: 16 }}>
                    <Mascot s={60} />
                  </div>
                  <h3 style={{ fontSize: 17, fontWeight: 800, color: '#1E1B4B', margin: '0 0 6px' }}>
                    AI đang đọc và phân tích tài liệu...
                  </h3>
                  <p style={{ color: '#64748B', fontSize: 13.5, maxWidth: 420, margin: '0 auto' }}>
                    Vi AI đang phân tích từ vựng, ngữ pháp và gợi ý cấp độ CEFR phù hợp nhất cho bài tập của bạn.
                  </p>
                  <div className="spinner" style={{ margin: '20px auto 0' }} />
                </div>
              ) : (
                <div>
                  {analysisErr && (
                    <div
                      style={{
                        background: '#FEF2F2',
                        border: '1px solid #FCA5A5',
                        color: '#B91C1C',
                        padding: '10px 14px',
                        borderRadius: 10,
                        fontSize: 13,
                        marginBottom: 16,
                      }}
                    >
                      {analysisErr}
                    </div>
                  )}

                  {analysisData && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      {/* Summary Box */}
                      <div
                        style={{
                          background: 'linear-gradient(135deg, #FAF5FF 0%, #EEF2FF 100%)',
                          border: '1px solid #DDD6FE',
                          borderRadius: 14,
                          padding: '16px 18px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                          <Icon n="spark" s={18} />
                          <b style={{ color: '#6D28D9', fontSize: 14 }}>Tóm tắt nội dung tài liệu</b>
                        </div>
                        <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6, color: '#334155' }}>
                          {analysisData.summary}
                        </p>
                      </div>

                      {/* Level and Topics */}
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                          gap: 12,
                        }}
                      >
                        <div
                          style={{
                            background: '#F8FAFC',
                            border: '1px solid #E2E8F0',
                            borderRadius: 12,
                            padding: '12px 16px',
                          }}
                        >
                          <span style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>Cấp độ CEFR gợi ý</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                            <span
                              className="pill level"
                              style={{
                                fontSize: 15,
                                fontWeight: 800,
                                background: 'var(--primary)',
                                color: '#fff',
                                padding: '4px 14px',
                              }}
                            >
                              {analysisData.suggestedLevel || 'B1'}
                            </span>
                            <span style={{ fontSize: 12.5, color: '#475569' }}>
                              Phù hợp theo độ khó từ vựng
                            </span>
                          </div>
                        </div>

                        <div
                          style={{
                            background: '#F8FAFC',
                            border: '1px solid #E2E8F0',
                            borderRadius: 12,
                            padding: '12px 16px',
                          }}
                        >
                          <span style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>Tài liệu đang xử lý</span>
                          <div
                            style={{
                              fontSize: 13.5,
                              fontWeight: 700,
                              color: '#1E293B',
                              marginTop: 4,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {selectedDoc?.originalName}
                          </div>
                        </div>
                      </div>

                      {/* Main Topics */}
                      {analysisData.mainTopics?.length > 0 && (
                        <div>
                          <span style={{ fontSize: 12.5, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6 }}>
                            Chủ đề chính phát hiện:
                          </span>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {analysisData.mainTopics.map((topic, idx) => (
                              <span
                                key={idx}
                                style={{
                                  background: '#EFF6FF',
                                  color: '#1D4ED8',
                                  border: '1px solid #BFDBFE',
                                  borderRadius: 99,
                                  padding: '4px 10px',
                                  fontSize: 12,
                                  fontWeight: 600,
                                }}
                              >
                                {topic}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Key Vocabularies */}
                      {analysisData.keyVocabularies?.length > 0 && (
                        <div>
                          <span style={{ fontSize: 12.5, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6 }}>
                            Từ vựng tiêu biểu:
                          </span>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {analysisData.keyVocabularies.map((vocab, idx) => (
                              <span
                                key={idx}
                                style={{
                                  background: '#F1F5F9',
                                  color: '#334155',
                                  border: '1px solid #CBD5E1',
                                  borderRadius: 8,
                                  padding: '3px 8px',
                                  fontSize: 12,
                                  fontWeight: 600,
                                }}
                              >
                                {vocab}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Step 2 Action Buttons */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginTop: 24,
                      paddingTop: 16,
                      borderTop: '1px solid #E2E8F0',
                      gap: 12,
                    }}
                  >
                    <button
                      type="button"
                      className="btn ghost sm"
                      onClick={() => setStep(1)}
                      style={{ fontSize: 13 }}
                    >
                      ‹ Đổi file khác
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <button
                        type="button"
                        className="btn ghost sm"
                        onClick={() => setStep(3)}
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          borderColor: '#C7D2FE',
                          color: '#4338CA',
                        }}
                      >
                        💬 Chat tinh chỉnh (Tùy chọn)
                      </button>
                      <button
                        type="button"
                        className="btn primary sm"
                        onClick={() => setStep(4)}
                        style={{ fontSize: 13, fontWeight: 800, padding: '8px 18px' }}
                      >
                        Tiếp tục cấu hình →
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================= STEP 3: CHAT TINH CHỈNH (TÙY CHỌN) ================= */}
          {step === 3 && (
            <div>
              <div
                style={{
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: 14,
                  padding: '12px 16px',
                  marginBottom: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ fontSize: 13, color: '#475569' }}>
                  💬 <b>Bước tùy chọn:</b> Bạn có thể trò chuyện với AI để nhấn mạnh dạng bài tập muốn tạo, hoặc bỏ qua để sang bước cấu hình.
                </div>
                <button
                  type="button"
                  className="btn ghost sm"
                  onClick={() => setStep(4)}
                  style={{ fontSize: 12, fontWeight: 700 }}
                >
                  Bỏ qua →
                </button>
              </div>

              {/* Chat Box */}
              <div
                ref={chatScrollRef}
                style={{
                  height: 250,
                  overflowY: 'auto',
                  border: '1px solid #E2E8F0',
                  borderRadius: 12,
                  padding: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  background: '#FFFFFF',
                }}
              >
                {chatMessages.map((msg, idx) => {
                  const isUser = msg.role === 'user';
                  return (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        justifyContent: isUser ? 'flex-end' : 'flex-start',
                      }}
                    >
                      <div
                        style={{
                          maxWidth: '80%',
                          padding: '10px 14px',
                          borderRadius: 14,
                          fontSize: 13.5,
                          lineHeight: 1.5,
                          background: isUser ? 'var(--primary)' : '#F1F5F9',
                          color: isUser ? '#FFFFFF' : '#1E293B',
                          borderBottomRightRadius: isUser ? 2 : 14,
                          borderBottomLeftRadius: !isUser ? 2 : 14,
                        }}
                      >
                        {msg.content}
                      </div>
                    </div>
                  );
                })}

                {chatSending && (
                  <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                    <div
                      style={{
                        padding: '8px 14px',
                        borderRadius: 14,
                        background: '#F1F5F9',
                        color: '#64748B',
                        fontSize: 12.5,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <div className="spinner sm" /> AI đang suy nghĩ...
                    </div>
                  </div>
                )}
              </div>

              {chatErr && (
                <div style={{ color: '#EF4444', fontSize: 12, marginTop: 6 }}>
                  {chatErr}
                </div>
              )}

              {/* Chat input form */}
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <input
                  type="text"
                  placeholder="Nhập yêu cầu bài tập cho AI (VD: Tập trung vào ngữ pháp quá khứ)..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSendChat();
                    }
                  }}
                  disabled={chatSending}
                  style={{
                    flex: 1,
                    height: 44,
                    padding: '0 14px',
                    borderRadius: 12,
                    border: '1.5px solid #CBD5E1',
                    background: '#FFFFFF',
                    fontSize: 13.5,
                    outline: 'none',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--primary)';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.12)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#CBD5E1';
                    e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.04)';
                  }}
                />
                <button
                  type="button"
                  className="btn primary sm"
                  onClick={handleSendChat}
                  disabled={chatSending || !chatInput.trim()}
                  style={{ padding: '0 16px' }}
                >
                  Gửi
                </button>
              </div>

              {/* Draft Questions Preview */}
              {draftQuestions.length > 0 && (
                <div style={{ marginTop: 14, padding: 14, background: '#F8FAFC', borderRadius: 12, border: '1px solid #E2E8F0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                    <b style={{ fontSize: 13.5, color: '#1E293B' }}>📝 Bản nháp câu hỏi gợi ý từ AI ({draftQuestions.length} câu):</b>
                    <button
                      type="button"
                      className="btn primary sm"
                      onClick={handleUseDraft}
                      style={{ fontSize: 12.5, fontWeight: 700 }}
                    >
                      ✨ Dùng bản nháp này ({draftQuestions.length} câu)
                    </button>
                  </div>
                  <div style={{ maxHeight: 180, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {draftQuestions.map((dq, idx) => (
                      <div key={idx} style={{ padding: '8px 10px', background: '#FFFFFF', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12.5 }}>
                        <b>Câu {idx + 1}:</b> {dq.content}
                        <div style={{ color: '#059669', marginTop: 3 }}>
                          ✓ Đáp án đúng: {dq.options?.[dq.correctAnswer ?? 0] || 'Chưa rõ'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 3 Navigation */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: 20,
                  paddingTop: 14,
                  borderTop: '1px solid #E2E8F0',
                }}
              >
                <button
                  type="button"
                  className="btn ghost sm"
                  onClick={() => setStep(2)}
                  style={{ fontSize: 13 }}
                >
                  ‹ Quay lại phân tích
                </button>
                <button
                  type="button"
                  className="btn primary sm"
                  onClick={() => setStep(4)}
                  style={{ fontSize: 13, fontWeight: 800, padding: '8px 18px' }}
                >
                  Tiếp tục cấu hình →
                </button>
              </div>
            </div>
          )}

          {/* ================= STEP 4: CẤU HÌNH & TẠO BÀI TẬP ================= */}
          {step === 4 && (
            <div>
              {generating ? (
                <div style={{ textAlign: 'center', padding: '48px 16px' }}>
                  <div style={{ marginBottom: 16 }}>
                    <Mascot s={68} />
                  </div>
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--primary)', margin: '0 0 8px' }}>
                    Vi AI đang biên soạn và thẩm định câu hỏi...
                  </h3>
                  <p style={{ color: '#64748B', fontSize: 13.5, maxWidth: 440, margin: '0 auto', lineHeight: 1.5 }}>
                    Hệ thống đang trích xuất ngữ cảnh, tạo 4 lựa chọn trắc nghiệm và kích hoạt mô-đun <b>tự kiểm tra câu hỏi</b> để đảm bảo tính chính xác cao nhất.
                  </p>
                  <div className="spinner" style={{ margin: '24px auto 0' }} />
                  <div style={{ color: '#94A3B8', fontSize: 12, marginTop: 12 }}>
                    Quá trình này có thể mất từ 10 - 25 giây
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {generateErr && (
                    <div
                      style={{
                        background: '#FEF2F2',
                        border: '1px solid #FCA5A5',
                        color: '#B91C1C',
                        padding: '12px 16px',
                        borderRadius: 12,
                        fontSize: 13.5,
                      }}
                    >
                      {generateErr}
                    </div>
                  )}

                  {/* Title */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
                      <label style={{ fontSize: 13.5, fontWeight: 700, color: '#1E293B', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Icon n="pen" s={14} />
                        <span>Tiêu đề bài trắc nghiệm</span>
                        <span style={{ color: '#EF4444' }}>*</span>
                      </label>
                      <span style={{ fontSize: 12, color: '#94A3B8', fontWeight: 600 }}>
                        {quizTitle.length}/150
                      </span>
                    </div>
                    <input
                      type="text"
                      value={quizTitle}
                      onChange={(e) => setQuizTitle(e.target.value)}
                      placeholder="VD: Bài tập từ vựng công nghệ B1..."
                      maxLength={150}
                      required
                      style={{
                        width: '100%',
                        height: 46,
                        padding: '0 16px',
                        borderRadius: 12,
                        border: '1.5px solid #CBD5E1',
                        background: '#FFFFFF',
                        fontSize: 14,
                        fontWeight: 600,
                        color: '#0F172A',
                        outline: 'none',
                        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = 'var(--primary)';
                        e.currentTarget.style.boxShadow = '0 0 0 4px rgba(99, 102, 241, 0.15), 0 1px 2px rgba(0, 0, 0, 0.04)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = '#CBD5E1';
                        e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.04)';
                      }}
                    />
                  </div>

                  {/* Level Selection */}
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
                      Cấp độ CEFR
                    </label>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map((lvl) => (
                        <button
                          key={lvl}
                          type="button"
                          className={'chip' + (quizLevel === lvl ? ' on' : '')}
                          onClick={() => setQuizLevel(lvl)}
                          style={{
                            padding: '6px 16px',
                            fontWeight: 700,
                            fontSize: 13,
                          }}
                        >
                          {lvl}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Question Count Selection */}
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
                      Số lượng câu hỏi trắc nghiệm
                    </label>
                    <div style={{ display: 'flex', gap: 10 }}>
                      {[
                        { count: 5, time: 5 },
                        { count: 10, time: 10 },
                        { count: 15, time: 15 },
                        { count: 20, time: 20 },
                      ].map((item) => (
                        <button
                          key={item.count}
                          type="button"
                          className={'chip' + (questionCount === item.count ? ' on' : '')}
                          onClick={() => setQuestionCount(item.count)}
                          style={{
                            flex: 1,
                            padding: '10px 8px',
                            fontWeight: 800,
                            textAlign: 'center',
                            fontSize: 13,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 2,
                            alignItems: 'center',
                          }}
                        >
                          <span>{item.count} câu</span>
                          <span style={{ fontSize: 11, opacity: 0.8, fontWeight: 600 }}>{item.time} phút</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Extra Prompt / Notes */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
                      <label style={{ fontSize: 13.5, fontWeight: 700, color: '#1E293B', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Icon n="spark" s={14} style={{ color: '#8B5CF6' }} />
                        <span>Ghi chú / Yêu cầu thêm cho AI</span>
                        <span style={{ fontSize: 12, color: '#64748B', fontWeight: 500 }}>(Tùy chọn)</span>
                      </label>
                      <span style={{ fontSize: 12, color: '#94A3B8', fontWeight: 600 }}>
                        {extraPrompt.length}/500
                      </span>
                    </div>
                    <textarea
                      value={extraPrompt}
                      onChange={(e) => setExtraPrompt(e.target.value)}
                      placeholder="VD: Chú trọng các câu hỏi về collocations, từ đồng nghĩa/trái nghĩa, thì quá khứ..."
                      rows={3}
                      maxLength={500}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        borderRadius: 12,
                        border: '1.5px solid #CBD5E1',
                        background: '#FFFFFF',
                        fontSize: 13.5,
                        color: '#0F172A',
                        lineHeight: 1.6,
                        outline: 'none',
                        resize: 'vertical',
                        minHeight: 76,
                        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
                        fontFamily: 'inherit',
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = '#8B5CF6';
                        e.currentTarget.style.boxShadow = '0 0 0 4px rgba(139, 92, 246, 0.15), 0 1px 2px rgba(0, 0, 0, 0.04)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = '#CBD5E1';
                        e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.04)';
                      }}
                    />

                    {/* Quick Suggestion Chips */}
                    <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                      <span style={{ fontSize: 11.5, color: '#64748B', fontWeight: 600 }}>Gợi ý nhanh:</span>
                      {[
                        'Tập trung collocations & phrasal verbs',
                        'Thêm câu hỏi bẫy từ vựng',
                        'Từ đồng nghĩa & trái nghĩa',
                        'Ngữ cảnh thực tế',
                      ].map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => {
                            setExtraPrompt((prev) => {
                              const trimmed = prev.trim();
                              if (!trimmed) return tag;
                              if (trimmed.includes(tag)) return prev;
                              return `${trimmed}; ${tag}`;
                            });
                          }}
                          style={{
                            border: '1px solid #E2E8F0',
                            background: '#F8FAFC',
                            borderRadius: 20,
                            padding: '3px 10px',
                            fontSize: 11.5,
                            fontWeight: 600,
                            color: '#475569',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#EEF2FF';
                            e.currentTarget.style.borderColor = '#C7D2FE';
                            e.currentTarget.style.color = '#4338CA';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#F8FAFC';
                            e.currentTarget.style.borderColor = '#E2E8F0';
                            e.currentTarget.style.color = '#475569';
                          }}
                        >
                          + {tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Quota Notice Box */}
                  <div
                    style={{
                      background: isOutOfQuota ? '#FEF2F2' : '#F0FDF4',
                      border: `1px solid ${isOutOfQuota ? '#FCA5A5' : '#BBF7D0'}`,
                      borderRadius: 12,
                      padding: '12px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                    }}
                  >
                    <div style={{ fontSize: 13, color: isOutOfQuota ? '#B91C1C' : '#166534' }}>
                      {isVip ? (
                        <span>✨ <b>Tài khoản PRO:</b> Bạn có thể tạo bài tập AI không giới hạn lượt.</span>
                      ) : isOutOfQuota ? (
                        <span>⚠️ Bạn đã hết 3 lượt tạo bài tập AI miễn phí hôm nay.</span>
                      ) : (
                        <span>
                          ⚡ Thao tác tạo bài tập sẽ trừ <b>1 lượt</b> tạo AI (còn <b>{quotaRemaining}/3</b> lượt hôm nay).
                        </span>
                      )}
                    </div>
                    {isOutOfQuota && (
                      <button
                        type="button"
                        className="btn primary sm"
                        onClick={() => openUpgradeModal({ feature: 'exercise_generation' })}
                        style={{ fontSize: 12, padding: '4px 12px' }}
                      >
                        Nâng cấp PRO
                      </button>
                    )}
                  </div>

                  {/* Step 4 Actions */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginTop: 10,
                      paddingTop: 16,
                      borderTop: '1px solid #E2E8F0',
                    }}
                  >
                    <button
                      type="button"
                      className="btn ghost sm"
                      onClick={() => setStep(2)}
                      style={{ fontSize: 13 }}
                    >
                      ‹ Quay lại
                    </button>

                    <button
                      type="button"
                      className="btn primary"
                      disabled={isOutOfQuota || !quizTitle.trim()}
                      onClick={handleGenerateQuiz}
                      style={{
                        padding: '10px 24px',
                        fontWeight: 800,
                        fontSize: 14,
                        background: 'linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%)',
                        border: 'none',
                      }}
                    >
                      <Icon n="spark" s={18} /> Tạo bài tập ngay
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================= STEP SUCCESS: TẠO THÀNH CÔNG ================= */}
          {step === 'SUCCESS' && createdQuiz && (
            <div style={{ textAlign: 'center', padding: '32px 16px' }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  background: '#DCFCE7',
                  color: '#15803D',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 16,
                }}
              >
                <Icon n="check" s={32} />
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 800, color: '#166534', margin: '0 0 6px' }}>
                Tạo bài tập thành công!
              </h3>
              <p style={{ color: '#475569', fontSize: 14, maxWidth: 440, margin: '0 auto 20px', lineHeight: 1.5 }}>
                Đề thi <b>"{createdQuiz.title}"</b> ({createdQuiz.questionCount} câu · Cấp {createdQuiz.level}) đã sẵn sàng trong mục <b>Bài tập của tôi</b>.
              </p>

              <div
                style={{
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: 14,
                  padding: '14px 20px',
                  maxWidth: 380,
                  margin: '0 auto 24px',
                  textAlign: 'left',
                  fontSize: 13.5,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                <div>🔒 <b>Trạng thái:</b> Riêng tư (chỉ mình bạn thấy)</div>
                <div>✨ <b>Nguồn gốc:</b> Do AI tạo từ tài liệu</div>
                <div>⏱️ <b>Thời gian làm bài:</b> {createdQuiz.timeLimit > 60 ? Math.round(createdQuiz.timeLimit / 60) : (createdQuiz.timeLimit || 10)} phút</div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
                <button
                  type="button"
                  className="btn ghost"
                  onClick={onClose}
                  style={{ padding: '10px 22px', fontWeight: 700 }}
                >
                  Xem danh sách bài tập
                </button>
                <button
                  type="button"
                  className="btn primary"
                  onClick={() => {
                    onClose();
                    if (onStartQuiz) {
                      onStartQuiz(createdQuiz.id);
                    }
                  }}
                  style={{ padding: '10px 24px', fontWeight: 800 }}
                >
                  Bắt đầu làm bài ngay →
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* ================= MODAL XÁC NHẬN XÓA TÀI LIỆU ================= */}
      {deleteModal.isOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget && !deleting) closeDeleteModal();
          }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100020,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            style={{
              background: '#FFFFFF',
              borderRadius: 20,
              width: '100%',
              maxWidth: 440,
              padding: '24px 24px 20px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #F1F5F9',
              textAlign: 'center',
            }}
          >
            {/* Danger Icon Badge */}
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: '#FEE2E2',
                color: '#DC2626',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}
            >
              <Icon n="trash" s={28} />
            </div>

            {/* Title */}
            <h3
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: '#0F172A',
                margin: '0 0 8px',
              }}
            >
              {deleteModal.type === 'single' && 'Xác nhận xóa tài liệu'}
              {deleteModal.type === 'batch' && `Xóa ${selectedDocIds.size} tài liệu đã chọn`}
              {deleteModal.type === 'all' && 'Xóa tất cả tài liệu'}
            </h3>

            {/* Description */}
            <div style={{ fontSize: 13.5, color: '#475569', lineHeight: 1.5, margin: '0 0 16px' }}>
              {deleteModal.type === 'single' && (
                <p style={{ margin: 0 }}>
                  Bạn có chắc chắn muốn xóa tài liệu{' '}
                  <b style={{ color: '#0F172A', wordBreak: 'break-all' }}>
                    "{deleteModal.targetDoc?.originalName}"
                  </b>
                  ?
                </p>
              )}
              {deleteModal.type === 'batch' && (
                <p style={{ margin: 0 }}>
                  Bạn có chắc chắn muốn xóa vĩnh viễn{' '}
                  <b style={{ color: '#DC2626' }}>{selectedDocIds.size} tài liệu</b> đã được chọn?
                </p>
              )}
              {deleteModal.type === 'all' && (
                <p style={{ margin: 0 }}>
                  Bạn có chắc chắn muốn xóa toàn bộ{' '}
                  <b style={{ color: '#DC2626' }}>{recentDocs.length} tài liệu</b> trong thư viện? Thao tác này sẽ làm trống danh sách tài liệu đã lưu của bạn.
                </p>
              )}
            </div>

            {/* Warning Callout */}
            <div
              style={{
                background: '#FEF2F2',
                border: '1px solid #FECDD3',
                borderRadius: 12,
                padding: '10px 14px',
                fontSize: 12.5,
                color: '#991B1B',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                textAlign: 'left',
                marginBottom: 20,
              }}
            >
              <div style={{ flexShrink: 0, color: '#DC2626' }}>
                <Icon n="alert" s={18} />
              </div>
              <div>
                Hành động này <b>không thể hoàn tác</b>. Tài liệu sau khi xóa sẽ không thể phục hồi.
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn ghost"
                onClick={closeDeleteModal}
                disabled={deleting}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  borderRadius: 12,
                  fontWeight: 700,
                  fontSize: 13.5,
                  color: '#475569',
                  borderColor: '#CBD5E1',
                }}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="btn"
                onClick={handleConfirmDelete}
                disabled={deleting}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  borderRadius: 12,
                  fontWeight: 800,
                  fontSize: 13.5,
                  color: '#FFFFFF',
                  background: '#DC2626',
                  border: 'none',
                  cursor: deleting ? 'wait' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  boxShadow: '0 4px 12px rgba(220, 38, 38, 0.25)',
                }}
              >
                {deleting ? (
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
                    <span>Đang xóa...</span>
                  </>
                ) : (
                  <>
                    <Icon n="trash" s={16} />
                    <span>
                      {deleteModal.type === 'single' && 'Xác nhận xóa'}
                      {deleteModal.type === 'batch' && `Xóa ${selectedDocIds.size} file`}
                      {deleteModal.type === 'all' && 'Xóa tất cả'}
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
