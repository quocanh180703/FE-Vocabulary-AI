import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { documentApi, errMsg } from '../../api';
import type { DocumentItem, DocumentAnalysis, DocumentChatMessage, Quiz } from '../../api';
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
    // Default quiz title from doc
    const cleanName = doc.originalName.replace(/\.[^/.]+$/, '');
    setQuizTitle(`Bài tập: ${cleanName}`);

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

  const handleDeleteDoc = (docId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Bạn có chắc muốn xóa tài liệu này?')) return;
    documentApi
      .delete(docId)
      .then(() => {
        setRecentDocs((prev) => prev.filter((d) => d.id !== docId));
        if (selectedDoc?.id === docId) setSelectedDoc(null);
      })
      .catch((err) => {
        alert(errMsg(err) || 'Không thể xóa tài liệu');
      });
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
              { num: 1, label: '1. Chọn tài liệu' },
              { num: 2, label: '2. AI phân tích' },
              { num: 3, label: '3. Chat tinh chỉnh' },
              { num: 4, label: '4. Cấu hình & Tạo' },
            ].map((s) => {
              const isActive = step === s.num;
              const isPassed = typeof step === 'number' && step > s.num;
              return (
                <div
                  key={s.num}
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    padding: '6px 8px',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: isActive ? 800 : 600,
                    color: isActive ? 'var(--primary)' : isPassed ? '#10B981' : '#94A3B8',
                    background: isActive ? '#EFF6FF' : isPassed ? '#ECFDF5' : 'transparent',
                    border: isActive ? '1px solid #BFDBFE' : '1px solid transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  {isPassed && <Icon n="check" s={14} />}
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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 320, overflowY: 'auto' }}>
                      {recentDocs.map((doc) => (
                        <div
                          key={doc.id}
                          onClick={() => handleProceedToAnalyze(doc)}
                          style={{
                            padding: '12px 16px',
                            borderRadius: 12,
                            border: '1px solid #E2E8F0',
                            background: '#FFFFFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 12,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = 'var(--primary)';
                            e.currentTarget.style.background = '#F8FAFC';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = '#E2E8F0';
                            e.currentTarget.style.background = '#FFFFFF';
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                            <div
                              style={{
                                width: 36,
                                height: 36,
                                borderRadius: 8,
                                background: '#EDE9FE',
                                color: '#7C3AED',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 800,
                                fontSize: 11,
                                textTransform: 'uppercase',
                              }}
                            >
                              {doc.fileType}
                            </div>
                            <div style={{ minWidth: 0 }}>
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

                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <button
                              className="btn primary sm"
                              style={{ fontSize: 12, padding: '4px 12px' }}
                              onClick={() => handleProceedToAnalyze(doc)}
                            >
                              Chọn
                            </button>
                            <button
                              className="btn ghost sm"
                              style={{ padding: '4px 8px', color: '#EF4444', borderColor: '#FCA5A5' }}
                              onClick={(e) => handleDeleteDoc(doc.id, e)}
                              title="Xóa tài liệu"
                            >
                              <Icon n="trash" s={14} />
                            </button>
                          </div>
                        </div>
                      ))}
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
                  style={{ flex: 1, fontSize: 13.5 }}
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
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
                      Tiêu đề bài trắc nghiệm <span style={{ color: 'var(--red)' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={quizTitle}
                      onChange={(e) => setQuizTitle(e.target.value)}
                      placeholder="VD: Bài tập từ vựng công nghệ B1..."
                      style={{ width: '100%', fontSize: 14 }}
                      maxLength={150}
                      required
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
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
                      Ghi chú / Yêu cầu thêm cho AI (Tùy chọn)
                    </label>
                    <textarea
                      value={extraPrompt}
                      onChange={(e) => setExtraPrompt(e.target.value)}
                      placeholder="VD: Chú trọng các câu hỏi về collocations, từ đồng nghĩa/trái nghĩa..."
                      rows={2}
                      style={{ width: '100%', fontSize: 13.5, resize: 'vertical' }}
                      maxLength={500}
                    />
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
                <div>⏱️ <b>Thời gian làm bài:</b> {createdQuiz.timeLimit} phút</div>
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
    </div>
  );
};
