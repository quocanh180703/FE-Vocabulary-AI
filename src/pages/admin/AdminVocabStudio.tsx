import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  adminApi,
  type AiVocabAuditSummary,
  type AiGeneratedWordItem,
  type AiVocabTagBackfillStatus,
  TOPIC_MAP,
} from '../../api';
import { Icon } from '../../components/icons';
import { motion, AnimatePresence } from 'motion/react';

const TOPIC_OPTIONS = [
  { code: 'WORK', label: 'WORK — Công việc & Văn phòng' },
  { code: 'TRAVEL', label: 'TRAVEL — Du lịch & Di chuyển' },
  { code: 'ACADEMIC', label: 'ACADEMIC — Học thuật & Giáo dục' },
  { code: 'TECHNOLOGY', label: 'TECHNOLOGY — Công nghệ' },
  { code: 'HEALTH', label: 'HEALTH — Sức khỏe' },
  { code: 'FOOD', label: 'FOOD — Ăn uống' },
  { code: 'MONEY', label: 'MONEY — Mua sắm & Tiền bạc' },
  { code: 'FAMILY', label: 'FAMILY — Gia đình & Bạn bè' },
  { code: 'SPORTS', label: 'SPORTS — Thể thao & Giải trí' },
  { code: 'ENVIRONMENT', label: 'ENVIRONMENT — Môi trường' },
  { code: 'SOCIETY', label: 'SOCIETY — Xã hội & Pháp luật' },
  { code: 'ARTS', label: 'ARTS — Nghệ thuật & Văn hóa' },
];

interface AdminVocabStudioProps {
  onSaved?: () => void;
  onBackToWords?: () => void;
}

export function AdminVocabStudio({ onSaved, onBackToWords }: AdminVocabStudioProps) {
  // Audit state
  const [vocabAudit, setVocabAudit] = useState<AiVocabAuditSummary | null>(null);
  const [loadingAudit, setLoadingAudit] = useState(false);

  // Studio mode & missing data state
  const [studioMode, setStudioMode] = useState<'enrich' | 'create' | 'tag'>('enrich');
  const [missingType, setMissingType] = useState<'example' | 'meaning' | 'pronunciation' | 'definition'>('example');
  const [missingLimit, setMissingLimit] = useState<number>(5);
  const [missingWords, setMissingWords] = useState<any[]>([]);
  const [selectedMissingIds, setSelectedMissingIds] = useState<(string | number)[]>([]);
  const [loadingMissing, setLoadingMissing] = useState(false);

  // Create new words state
  const [customWordsInput, setCustomWordsInput] = useState('');
  const [customLevelHint, setCustomLevelHint] = useState('B2');

  // Generation & review state
  const [generatingVocab, setGeneratingVocab] = useState(false);
  const [generatedWords, setGeneratedWords] = useState<AiGeneratedWordItem[]>([]);
  const [overwriteExisting, setOverwriteExisting] = useState(true);
  const [approving, setApproving] = useState(false);
  const [approvalNotice, setApprovalNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Topic Tagging state
  const [activeTagTab, setActiveTagTab] = useState<'classify' | 'backfill' | 'queue'>('classify');
  const [tagInput, setTagInput] = useState('');
  const [classifyingTags, setClassifyingTags] = useState(false);
  const [classifiedTagItems, setClassifiedTagItems] = useState<
    Array<{ existingWordId?: string; word: string; topic?: string; confidence: number; reason?: string }>
  >([]);
  const [selectedTagIndices, setSelectedTagIndices] = useState<number[]>([]);
  const [approvingTags, setApprovingTags] = useState(false);

  // Backfill state
  const [backfillScope, setBackfillScope] = useState<'IMPORT' | 'IDS'>('IMPORT');
  const [availableSources, setAvailableSources] = useState<string[]>([]);
  const [selectedSource, setSelectedSource] = useState<string>('');
  const [selectedCreatedAfter, setSelectedCreatedAfter] = useState<string>('');
  const [targetWordIdsInput, setTargetWordIdsInput] = useState<string>('');
  const [backfillBatchSize, setBackfillBatchSize] = useState(20);
  const [backfillThreshold, setBackfillThreshold] = useState(0.8);
  const [startingBackfill, setStartingBackfill] = useState(false);
  const [backfillStatus, setBackfillStatus] = useState<AiVocabTagBackfillStatus | null>(null);

  // Custom Confirmation Modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'start' | 'cancel';
    title: string;
    message: string;
    batchSize?: number;
    threshold?: number;
  } | null>(null);

  // Queue state
  const [tagQueueItems, setTagQueueItems] = useState<any[]>([]);
  const [loadingQueue, setLoadingQueue] = useState(false);
  const [queuePage, setQueuePage] = useState(0);
  const [queueTotal, setQueueTotal] = useState(0);

  const loadVocabAuditData = async () => {
    setLoadingAudit(true);
    try {
      const res = await adminApi.aiVocabAudit();
      if (res?.data) setVocabAudit(res.data);
    } catch (err) {
      console.error('Failed to load vocab audit:', err);
    } finally {
      setLoadingAudit(false);
    }
  };

  const loadMissingWordsData = async (type: string, limit: number) => {
    setLoadingMissing(true);
    try {
      const res = await adminApi.aiVocabMissingData(type, limit);
      if (res?.data) {
        setMissingWords(res.data);
        setSelectedMissingIds(res.data.map((w: any) => w.id));
      }
    } catch (err) {
      console.error('Failed to load missing words:', err);
    } finally {
      setLoadingMissing(false);
    }
  };

  const loadTagQueueData = async (page = 0) => {
    setLoadingQueue(true);
    try {
      const res = await adminApi.aiVocabTagQueue('PENDING', page, 20);
      if (res?.data) {
        setTagQueueItems(res.data.content || []);
        setQueueTotal(res.data.totalElements || 0);
        setQueuePage(page);
      }
    } catch (err) {
      console.error('Failed to load tag queue:', err);
    } finally {
      setLoadingQueue(false);
    }
  };

  const pollBackfillStatus = async (jobId: string) => {
    try {
      const res = await adminApi.aiVocabTagBackfillStatus(jobId);
      if (res?.data) {
        setBackfillStatus(res.data);
        if (res.data.status === 'RUNNING') {
          setTimeout(() => pollBackfillStatus(jobId), 3000);
        } else {
          loadVocabAuditData();
        }
      }
    } catch (err) {
      console.error('Failed to poll backfill status:', err);
    }
  };

  const loadAvailableSources = async () => {
    try {
      const res = await adminApi.aiVocabGetSources();
      if (res?.data && Array.isArray(res.data)) {
        setAvailableSources(res.data);
        if (res.data.length > 0 && !selectedSource) {
          setSelectedSource(res.data[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load sources:', err);
    }
  };

  useEffect(() => {
    loadVocabAuditData();
    loadMissingWordsData(missingType, missingLimit);
    loadAvailableSources();
  }, []);

  useEffect(() => {
    if (studioMode === 'tag' && activeTagTab === 'queue') {
      loadTagQueueData(0);
    }
  }, [studioMode, activeTagTab]);

  const toggleSelectAllMissing = () => {
    if (selectedMissingIds.length === missingWords.length) {
      setSelectedMissingIds([]);
    } else {
      setSelectedMissingIds(missingWords.map((w) => w.id));
    }
  };

  const toggleSelectOneMissing = (id: string | number) => {
    if (selectedMissingIds.includes(id)) {
      setSelectedMissingIds(selectedMissingIds.filter((item) => item !== id));
    } else {
      setSelectedMissingIds([...selectedMissingIds, id]);
    }
  };

  const handleGenerateVocab = async () => {
    setGeneratingVocab(true);
    setApprovalNotice(null);
    try {
      if (studioMode === 'enrich') {
        const wordsToEnrich = missingWords
          .filter((w) => selectedMissingIds.includes(w.id))
          .map((w) => w.word);
        if (wordsToEnrich.length === 0) {
          alert('Vui lòng chọn ít nhất một từ vựng để làm giàu dữ liệu!');
          setGeneratingVocab(false);
          return;
        }
        const res = await adminApi.aiVocabBatchGenerate(wordsToEnrich);
        if (res?.data) {
          setGeneratedWords(res.data);
        }
      } else {
        const words = customWordsInput
          .split(/[\n,]/)
          .map((w) => w.trim())
          .filter((w) => w.length > 0);
        if (words.length === 0) {
          alert('Vui lòng nhập ít nhất một từ vựng hợp lệ!');
          setGeneratingVocab(false);
          return;
        }
        const res = await adminApi.aiVocabBatchGenerate(words, customLevelHint);
        if (res?.data) {
          setGeneratedWords(res.data);
        }
      }
    } catch (err: any) {
      console.error('Vocab generation error:', err);
      alert('Không thể kết nối đến Gemini AI. Vui lòng thử lại sau.');
    } finally {
      setGeneratingVocab(false);
    }
  };

  const handleFieldChange = (index: number, field: keyof AiGeneratedWordItem, value: any) => {
    const updated = [...generatedWords];
    updated[index] = { ...updated[index], [field]: value };
    setGeneratedWords(updated);
  };

  const handleRemoveItem = (index: number) => {
    const updated = [...generatedWords];
    updated.splice(index, 1);
    setGeneratedWords(updated);
  };

  const handleApproveAndSave = async () => {
    if (generatedWords.length === 0) return;
    setApproving(true);
    setApprovalNotice(null);
    try {
      const res = await adminApi.aiVocabApprove(generatedWords, overwriteExisting);
      if (res?.data?.success) {
        setApprovalNotice({
          type: 'success',
          message: res.data.message || `Đã lưu thành công ${res.data.savedCount} từ vựng vào hệ thống!`,
        });
        setGeneratedWords([]);
        setCustomWordsInput('');
        loadVocabAuditData();
        loadMissingWordsData(missingType, missingLimit);
        if (onSaved) onSaved();
      }
    } catch (err: any) {
      console.error('Approve vocab error:', err);
      setApprovalNotice({
        type: 'error',
        message: 'Lưu thất bại: ' + (err?.response?.data?.message || err.message || 'Lỗi không xác định'),
      });
    } finally {
      setApproving(false);
    }
  };

  // Tagging handlers
  const handleClassifyTags = async () => {
    const lemmas = tagInput
      .split(/[\n,]/)
      .map((w) => w.trim().toLowerCase())
      .filter((w) => w.length > 0);

    if (lemmas.length === 0) {
      alert('Vui lòng nhập ít nhất một từ vựng để phân loại!');
      return;
    }

    setClassifyingTags(true);
    setApprovalNotice(null);
    try {
      const res = await adminApi.aiVocabTagClassify(lemmas.slice(0, 20));
      if (res?.data) {
        setClassifiedTagItems(res.data);
        setSelectedTagIndices(res.data.map((_, i) => i));
      }
    } catch (err: any) {
      console.error('Tag classification error:', err);
      alert('Lỗi phân loại chủ đề bằng Gemini: ' + (err?.response?.data?.message || err.message));
    } finally {
      setClassifyingTags(false);
    }
  };

  const handleApproveTags = async () => {
    const itemsToSave = classifiedTagItems
      .filter((_, idx) => selectedTagIndices.includes(idx))
      .filter((item) => item.existingWordId && item.topic)
      .map((item) => ({
        wordId: item.existingWordId!,
        topic: item.topic!,
      }));

    if (itemsToSave.length === 0) {
      alert('Chưa có từ nào hợp lệ (cần có ID từ trong kho và chủ đề được chọn)!');
      return;
    }

    setApprovingTags(true);
    setApprovalNotice(null);
    try {
      const res = await adminApi.aiVocabTagApprove(itemsToSave, true);
      if (res?.data?.success) {
        setApprovalNotice({
          type: 'success',
          message: res.data.message || `Đã cập nhật chủ đề thành công cho ${itemsToSave.length} từ!`,
        });
        setClassifiedTagItems([]);
        setSelectedTagIndices([]);
        setTagInput('');
        loadVocabAuditData();
        if (onSaved) onSaved();
      }
    } catch (err: any) {
      console.error('Tag approve error:', err);
      setApprovalNotice({
        type: 'error',
        message: 'Phê duyệt thất bại: ' + (err?.response?.data?.message || err.message),
      });
    } finally {
      setApprovingTags(false);
    }
  };

  const onOpenStartBackfillModal = () => {
    let scopeDesc = '';
    if (backfillScope === 'IMPORT') {
      scopeDesc = `Đợt Import: ${selectedSource ? `Nguồn "${selectedSource}"` : 'Tất cả nguồn'} ${selectedCreatedAfter ? `(tạo sau ${selectedCreatedAfter})` : ''}`;
    } else {
      const ids = targetWordIdsInput.split(/[\n, ]+/).map((s) => s.trim()).filter(Boolean);
      if (ids.length === 0) {
        alert('Vui lòng nhập ít nhất 1 UUID từ vựng để gắn tag theo phạm vi IDS.');
        return;
      }
      scopeDesc = `Danh sách ${ids.length} từ vựng chỉ định`;
    }

    setConfirmModal({
      isOpen: true,
      type: 'start',
      title: `Bắt đầu gắn tag AI (${backfillScope === 'IMPORT' ? 'Đợt Import' : 'Từ chỉ định'})`,
      message: `Hệ thống sẽ quét có phạm vi [${scopeDesc}] và chỉ xử lý các từ còn thiếu chủ đề. Những từ chắc chắn không thuộc 12 chủ đề sẽ được lưu NULL và bỏ qua hàng chờ.`,
      batchSize: backfillBatchSize,
      threshold: backfillThreshold,
    });
  };

  const executeStartBackfill = async () => {
    setConfirmModal(null);
    setStartingBackfill(true);
    setApprovalNotice(null);
    try {
      const payload: any = {
        scope: backfillScope,
        batchSize: backfillBatchSize,
        confidenceThreshold: backfillThreshold,
      };

      if (backfillScope === 'IMPORT') {
        if (selectedSource) payload.source = selectedSource;
        if (selectedCreatedAfter) {
          payload.createdAfter = selectedCreatedAfter.includes('T') ? selectedCreatedAfter + ':00' : selectedCreatedAfter + 'T00:00:00';
        }
      } else if (backfillScope === 'IDS') {
        const ids = targetWordIdsInput.split(/[\n, ]+/).map((s) => s.trim()).filter(Boolean);
        payload.wordIds = ids;
      }

      const res = await adminApi.aiVocabTagBackfill(payload);
      if (res?.data) {
        setBackfillStatus(res.data);
        if (res.data.status === 'RUNNING') {
          setTimeout(() => pollBackfillStatus(res.data.jobId), 2500);
        }
      }
    } catch (err: any) {
      console.error('Start backfill error:', err);
      alert('Không thể khởi chạy quét nền: ' + (err?.response?.data?.message || err.message));
    } finally {
      setStartingBackfill(false);
    }
  };

  const onOpenCancelBackfillModal = () => {
    setConfirmModal({
      isOpen: true,
      type: 'cancel',
      title: 'Dừng tiến trình quét nền?',
      message: 'Bạn có chắc chắn muốn dừng tiến trình quét nền đang chạy? Các từ đã được AI gắn tag trước đó vẫn được lưu an toàn trong cơ sở dữ liệu.',
    });
  };

  const executeCancelBackfill = async () => {
    setConfirmModal(null);
    try {
      const res = await adminApi.aiVocabTagBackfillCancel();
      if (res?.data) {
        setBackfillStatus(res.data);
      }
    } catch (err: any) {
      console.error('Cancel backfill error:', err);
      alert('Không thể dừng tiến trình: ' + (err?.response?.data?.message || err.message));
    }
  };

  const handleApproveQueueItem = async (cefrWordId: string, topic: string) => {
    try {
      await adminApi.aiVocabTagApprove([{ wordId: cefrWordId, topic }], true);
      setTagQueueItems((prev) => prev.filter((item) => item.cefrWordId !== cefrWordId));
      setQueueTotal((prev) => Math.max(0, prev - 1));
      loadVocabAuditData();
    } catch (err: any) {
      alert('Lỗi phê duyệt từ hàng chờ: ' + (err?.response?.data?.message || err.message));
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Header Navigation */}
      <div className="row" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: 'var(--primary)' }}>⚡</span>
            Xưởng Từ Vựng AI (Vocab AI Studio)
          </h1>
          <div className="sub">
            Quy trình AI tự động kiểm tra chất lượng kho từ vựng CEFR, làm giàu dữ liệu và gắn tag 12 chủ đề
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          {onBackToWords && (
            <button
              type="button"
              className="btn ghost"
              onClick={onBackToWords}
              style={{ minHeight: 42, padding: '0 16px', fontSize: 13.5 }}
            >
              ← Trở về danh sách từ
            </button>
          )}
          <button
            type="button"
            className="btn ghost"
            onClick={loadVocabAuditData}
            disabled={loadingAudit}
            style={{ minHeight: 42, padding: '0 16px', fontSize: 13.5 }}
          >
            <Icon n="reload" s={15} />
            {loadingAudit ? 'Đang kiểm tra...' : 'Làm mới thống kê'}
          </button>
        </div>
      </div>

      {approvalNotice && (
        <div
          style={{
            padding: '14px 18px',
            borderRadius: 14,
            fontWeight: 700,
            fontSize: 14,
            background: approvalNotice.type === 'success' ? '#ECFDF5' : '#FEF2F2',
            color: approvalNotice.type === 'success' ? '#047857' : '#B91C1C',
            border: `1.5px solid ${approvalNotice.type === 'success' ? '#10B981' : '#EF4444'}`,
          }}
        >
          {approvalNotice.type === 'success' ? '✓ ' : '✕ '}
          {approvalNotice.message}
        </div>
      )}

      {/* KPI Cards: Health & Completeness of CEFR Dataset */}
      <div className="kpi-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        <div className="kpi">
          <div className="kic" style={{ background: 'var(--primary-bg)', color: 'var(--primary)' }}>
            <Icon n="spark" s={22} />
          </div>
          <div className="lbl">Tổng từ vựng CEFR</div>
          <div className="num">
            {vocabAudit ? vocabAudit.totalWords.toLocaleString('vi-VN') : '4.962'}
          </div>
          <div className="delta up">Kho dữ liệu chuẩn A1 - C1</div>
        </div>

        <div className="kpi">
          <div className="kic" style={{ background: 'var(--green-bg)', color: 'var(--green-dark)' }}>
            <Icon n="check" s={22} />
          </div>
          <div className="lbl">Tỉ lệ hoàn thiện dữ liệu</div>
          <div className="num">
            {vocabAudit ? `${vocabAudit.completenessRate}%` : '97.4%'}
          </div>
          <div className="delta up">Đầy đủ Nghĩa, Ví dụ, IPA, ĐN</div>
        </div>

        <div className="kpi">
          <div className="kic" style={{ background: 'var(--yellow-bg)', color: 'var(--yellow-dark)' }}>
            <Icon n="warn" s={22} />
          </div>
          <div className="lbl">Thiếu ví dụ ngữ cảnh</div>
          <div className="num">
            {vocabAudit ? vocabAudit.wordsMissingExample.toLocaleString('vi-VN') : '112'}
          </div>
          <div className="delta up">
            <button
              type="button"
              className="link"
              onClick={() => {
                setStudioMode('enrich');
                setMissingType('example');
                loadMissingWordsData('example', missingLimit);
              }}
              style={{ fontSize: 13, color: 'var(--yellow-dark)' }}
            >
              Khắc phục ngay ›
            </button>
          </div>
        </div>

        <div className="kpi">
          <div className="kic" style={{ background: 'var(--red-bg)', color: 'var(--red-dark)' }}>
            <Icon n="spark" s={22} />
          </div>
          <div className="lbl">Thiếu nghĩa / Phiên âm</div>
          <div className="num">
            {vocabAudit
              ? (vocabAudit.wordsMissingMeaning + vocabAudit.wordsMissingPronunciation).toLocaleString('vi-VN')
              : '83'}
          </div>
          <div className="delta up">
            <button
              type="button"
              className="link"
              onClick={() => {
                setStudioMode('enrich');
                setMissingType('meaning');
                loadMissingWordsData('meaning', missingLimit);
              }}
              style={{ fontSize: 13, color: 'var(--red-dark)' }}
            >
              Bổ sung ngay ›
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Studio Workspace Card */}
      <div className="card">
        <div className="row" style={{ marginBottom: 16, flexWrap: 'wrap', gap: 14, alignItems: 'center' }}>
          <div>
            <h2><span className="dot g" />Khu vực làm việc với AI</h2>
            <div className="sub">Làm giàu nội dung thiếu, tạo từ vựng mới, hoặc gắn tag 12 chủ đề cố định</div>
          </div>

          <div
            className="seg"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              background: 'var(--tint)',
              borderRadius: 999,
              padding: 4,
              flexShrink: 0,
              gap: 4,
            }}
          >
            {[
              { id: 'enrich', label: 'Cập nhật từ thiếu' },
              { id: 'create', label: 'Tạo từ mới' },
              { id: 'tag', label: 'Gắn tag chủ đề' },
            ].map((tab) => {
              const active = studioMode === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  className={active ? 'on' : ''}
                  onClick={() => setStudioMode(tab.id as any)}
                  style={{
                    flex: '1 1 0',
                    minWidth: 160,
                    height: 42,
                    border: 'none',
                    borderRadius: 999,
                    padding: '0 18px',
                    fontSize: 14,
                    fontWeight: 800,
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    background: active ? '#ffffff' : 'transparent',
                    color: active ? 'var(--ink)' : 'var(--muted)',
                    boxShadow: active ? '0 2px 8px rgba(10, 37, 64, 0.08)' : 'none',
                    transition: 'all 0.2s ease',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    lineHeight: 1,
                    textAlign: 'center',
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <AnimatePresence mode="wait">
        {/* Mode 1: Enrich Missing Words */}
        {studioMode === 'enrich' && (
          <motion.div
            key="enrich"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="toolbar" style={{ flexWrap: 'wrap', gap: 10 }}>
              <div className="chiprow">
                {[
                  { id: 'example', label: 'Thiếu ví dụ' },
                  { id: 'meaning', label: 'Thiếu nghĩa TV' },
                  { id: 'pronunciation', label: 'Thiếu IPA' },
                  { id: 'definition', label: 'Thiếu định nghĩa' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={'fchip' + (missingType === t.id ? ' on' : '')}
                    onClick={() => {
                      setMissingType(t.id as any);
                      loadMissingWordsData(t.id, missingLimit);
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="sub">Số lượng từ lấy mẫu:</span>
                <select
                  value={missingLimit}
                  onChange={(e) => {
                    const l = Number(e.target.value);
                    setMissingLimit(l);
                    loadMissingWordsData(missingType, l);
                  }}
                  className="input"
                  style={{ minHeight: 38, padding: '0 10px', fontSize: 13, width: 80 }}
                >
                  <option value={5}>5 từ</option>
                  <option value={10}>10 từ</option>
                  <option value={20}>20 từ</option>
                </select>

                <button
                  type="button"
                  className="btn"
                  onClick={handleGenerateVocab}
                  disabled={generatingVocab || selectedMissingIds.length === 0}
                  style={{ minHeight: 40, padding: '0 18px', fontSize: 13.5 }}
                >
                  <Icon n="spark" s={15} />
                  {generatingVocab ? 'Gemini đang tạo...' : `Làm giàu ${selectedMissingIds.length} từ đã chọn`}
                </button>
              </div>
            </div>

            {/* Missing Words Selection Table */}
            <div style={{ border: '1.5px solid var(--line)', borderRadius: 18, overflow: 'hidden' }}>
              <table className="atable">
                <thead>
                  <tr>
                    <th style={{ width: 44, textAlign: 'center' }}>
                      <span
                        className={'cb' + (selectedMissingIds.length === missingWords.length && missingWords.length > 0 ? ' on' : '')}
                        onClick={toggleSelectAllMissing}
                      >
                        {selectedMissingIds.length === missingWords.length && missingWords.length > 0 && <Icon n="check" s={13} />}
                      </span>
                    </th>
                    <th>Từ vựng</th>
                    <th>Loại từ</th>
                    <th>Cấp độ</th>
                    <th>Tình trạng thiếu dữ liệu</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingMissing ? (
                    <tr>
                      <td colSpan={5} style={{ padding: 30, textAlign: 'center', color: 'var(--muted)' }}>
                        Đang tải danh sách từ cần khắc phục...
                      </td>
                    </tr>
                  ) : missingWords.length > 0 ? (
                    missingWords.map((w) => {
                      const isSel = selectedMissingIds.includes(w.id);
                      return (
                        <tr key={w.id} onClick={() => toggleSelectOneMissing(w.id)} style={{ cursor: 'pointer' }}>
                          <td style={{ textAlign: 'center' }}>
                            <span className={'cb' + (isSel ? ' on' : '')}>
                              {isSel && <Icon n="check" s={13} />}
                            </span>
                          </td>
                          <td><b style={{ fontSize: 15.5 }}>{w.word}</b></td>
                          <td><span className="pill" style={{ fontSize: 11 }}>{w.partOfSpeech || 'NOUN'}</span></td>
                          <td><span className="pill level">{w.cefr || 'A1'}</span></td>
                          <td>
                            <span className="pill redsoft">
                              {missingType === 'example' && 'Chưa có câu ví dụ'}
                              {missingType === 'meaning' && 'Chưa có nghĩa tiếng Việt'}
                              {missingType === 'pronunciation' && 'Chưa có phiên âm IPA'}
                              {missingType === 'definition' && 'Chưa có định nghĩa Anh - Anh'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} style={{ padding: 30, textAlign: 'center', color: 'var(--green-dark)' }}>
                        ✓ Tuyệt vời! Không còn từ vựng nào thiếu trường dữ liệu này.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          </motion.div>
        )}

        {/* Mode 2: Create New Words Batch */}
        {studioMode === 'create' && (
          <motion.div
            key="create"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="field">
              <label>Danh sách từ vựng cần sinh (mỗi từ một dòng hoặc cách nhau bằng dấu phẩy):</label>
              <textarea
                className="input"
                rows={4}
                placeholder="ví dụ: resilient, ambiguous, paradigm, serendipity"
                value={customWordsInput}
                onChange={(e) => setCustomWordsInput(e.target.value)}
              />
            </div>

            <div className="row" style={{ flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="sub">Cấp độ CEFR mục tiêu:</span>
                <select
                  value={customLevelHint}
                  onChange={(e) => setCustomLevelHint(e.target.value)}
                  className="input"
                  style={{ minHeight: 40, padding: '0 12px', fontSize: 13.5, width: 90 }}
                >
                  <option value="A1">A1</option>
                  <option value="A2">A2</option>
                  <option value="B1">B1</option>
                  <option value="B2">B2</option>
                  <option value="C1">C1</option>
                </select>
              </div>

              <button
                type="button"
                className="btn"
                onClick={handleGenerateVocab}
                disabled={generatingVocab || !customWordsInput.trim()}
                style={{ minHeight: 44, padding: '0 24px', fontSize: 14 }}
              >
                <Icon n="spark" s={16} />
                {generatingVocab ? 'Gemini đang phân tích & sinh...' : 'Bắt đầu sinh dữ liệu'}
              </button>
            </div>
          </div>
          </motion.div>
        )}

        {/* Mode 3: Tag Classification & Backfill Pipeline */}
        {studioMode === 'tag' && (
          <motion.div
            key="tag"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Tag Sub-Tabs */}
            <div className="chiprow" style={{ borderBottom: '1.5px solid var(--line)', paddingBottom: 12 }}>
              <button
                type="button"
                className={'fchip' + (activeTagTab === 'classify' ? ' on' : '')}
                onClick={() => setActiveTagTab('classify')}
              >
                1. Gắn tag theo lô (Thủ công)
              </button>
              <button
                type="button"
                className={'fchip' + (activeTagTab === 'backfill' ? ' on' : '')}
                onClick={() => setActiveTagTab('backfill')}
              >
                2. Chạy quét nền toàn kho (Backfill)
              </button>
              <button
                type="button"
                className={'fchip' + (activeTagTab === 'queue' ? ' on' : '')}
                onClick={() => setActiveTagTab('queue')}
              >
                3. Hàng chờ duyệt tay {queueTotal > 0 && `(${queueTotal})`}
              </button>
            </div>

            {/* Sub-Tab 1: Batch Tag Classification */}
            {activeTagTab === 'classify' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="field">
                  <label>Nhập danh sách từ vựng cần phân loại (tối đa 20 từ, mỗi từ một dòng hoặc cách nhau bằng dấu phẩy):</label>
                  <textarea
                    className="input"
                    rows={3}
                    placeholder="ví dụ: office, salary, vacation, flight, doctor, infection"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                  />
                </div>

                <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                  <div className="sub">
                    Gemini sẽ phân loại dựa vào nghĩa tiếng Việt &amp; định nghĩa đang lưu trong entry.
                  </div>
                  <button
                    type="button"
                    className="btn"
                    onClick={handleClassifyTags}
                    disabled={classifyingTags || !tagInput.trim()}
                    style={{ minHeight: 42, padding: '0 20px', fontSize: 13.5 }}
                  >
                    <Icon n="spark" s={15} />
                    {classifyingTags ? 'Gemini đang phân loại...' : 'Phân loại chủ đề bằng Gemini'}
                  </button>
                </div>

                {/* Table of Classified Results */}
                {classifiedTagItems.length > 0 && (
                  <div style={{ marginTop: 10 }}>
                    <div className="row" style={{ marginBottom: 10, justifyContent: 'space-between' }}>
                      <b style={{ fontSize: 15 }}>Kết quả phân loại ({classifiedTagItems.length} từ):</b>
                      <button
                        type="button"
                        className="link"
                        onClick={() => setClassifiedTagItems([])}
                        style={{ color: 'var(--red-dark)', fontSize: 13 }}
                      >
                        Xóa bảng kết quả
                      </button>
                    </div>

                    <div style={{ border: '1.5px solid var(--line)', borderRadius: 16, overflow: 'hidden' }}>
                      <table className="atable">
                        <thead>
                          <tr>
                            <th style={{ width: 44, textAlign: 'center' }}>
                              <span
                                className={'cb' + (selectedTagIndices.length === classifiedTagItems.length ? ' on' : '')}
                                onClick={() => {
                                  if (selectedTagIndices.length === classifiedTagItems.length) {
                                    setSelectedTagIndices([]);
                                  } else {
                                    setSelectedTagIndices(classifiedTagItems.map((_, i) => i));
                                  }
                                }}
                              >
                                {selectedTagIndices.length === classifiedTagItems.length && <Icon n="check" s={13} />}
                              </span>
                            </th>
                            <th>Từ vựng</th>
                            <th style={{ width: 220 }}>Chủ đề gợi ý</th>
                            <th style={{ width: 110 }}>Độ tin cậy</th>
                            <th>Lý do phân loại của AI</th>
                          </tr>
                        </thead>
                        <tbody>
                          {classifiedTagItems.map((item, idx) => {
                            const isSel = selectedTagIndices.includes(idx);
                            const conf = item.confidence || 0;
                            const isHighConf = conf >= 0.8;
                            return (
                              <tr key={idx}>
                                <td style={{ textAlign: 'center' }}>
                                  <span
                                    className={'cb' + (isSel ? ' on' : '')}
                                    onClick={() => {
                                      if (isSel) {
                                        setSelectedTagIndices(selectedTagIndices.filter((i) => i !== idx));
                                      } else {
                                        setSelectedTagIndices([...selectedTagIndices, idx]);
                                      }
                                    }}
                                  >
                                    {isSel && <Icon n="check" s={13} />}
                                  </span>
                                </td>
                                <td>
                                  <b>{item.word}</b>
                                  {!item.existingWordId && (
                                    <span className="pill redsoft" style={{ marginLeft: 6, fontSize: 10 }}>
                                      Chưa có trong kho CEFR
                                    </span>
                                  )}
                                </td>
                                <td>
                                  <select
                                    value={item.topic || ''}
                                    onChange={(e) => {
                                      const updated = [...classifiedTagItems];
                                      updated[idx] = { ...updated[idx], topic: e.target.value };
                                      setClassifiedTagItems(updated);
                                    }}
                                    className="input"
                                    style={{ minHeight: 34, padding: '0 8px', fontSize: 13, width: '100%' }}
                                  >
                                    <option value="">-- Chưa gán chủ đề --</option>
                                    {TOPIC_OPTIONS.map((t) => (
                                      <option key={t.code} value={t.code}>
                                        {t.code} — {TOPIC_MAP[t.code]}
                                      </option>
                                    ))}
                                  </select>
                                </td>
                                <td>
                                  <span
                                    className="pill"
                                    style={{
                                      fontSize: 12,
                                      fontWeight: 800,
                                      background: isHighConf ? 'rgba(28, 140, 75, 0.12)' : 'rgba(234, 88, 12, 0.12)',
                                      color: isHighConf ? '#166534' : '#c2410c',
                                      border: `1px solid ${isHighConf ? 'rgba(28, 140, 75, 0.3)' : 'rgba(234, 88, 12, 0.3)'}`,
                                    }}
                                  >
                                    {Math.round(conf * 100)}%
                                  </span>
                                </td>
                                <td>
                                  <span className="sub" style={{ fontSize: 13 }}>
                                    {item.reason || 'N/A'}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        className="btn green"
                        onClick={handleApproveTags}
                        disabled={approvingTags || selectedTagIndices.length === 0}
                        style={{ minHeight: 44, padding: '0 24px', fontSize: 14 }}
                      >
                        <Icon n="check" s={17} />
                        {approvingTags ? 'Đang lưu vào kho từ...' : `Phê duyệt & Lưu chủ đề (${selectedTagIndices.length} từ)`}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Sub-Tab 2: Scoped Background Backfill */}
            {activeTagTab === 'backfill' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div
                  style={{
                    background: '#F0F9FF',
                    border: '1.5px solid #BAE6FD',
                    borderRadius: 16,
                    padding: '16px 20px',
                    color: '#0369A1',
                  }}
                >
                  <b style={{ fontSize: 15, display: 'block', marginBottom: 4 }}>🎯 Gắn tag có phạm vi (Scoped AI Tagging)</b>
                  <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6 }}>
                    Thay vì quét mù toàn bộ cơ sở dữ liệu, bạn có thể gắn tag chính xác theo <b>đợt Import mới</b> (theo nguồn dataset hoặc mốc ngày tạo) hoặc theo <b>danh sách từ cụ thể</b>.
                    Các từ chức năng (giới từ, liên từ...) và từ trừu tượng/chung chung sẽ tự động được <b>bỏ qua chủ đích</b> mà không làm phình hàng chờ duyệt tay.
                  </p>
                </div>

                {/* Scope Selection Segmented Switch */}
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--ink)' }}>Chọn phạm vi quét:</span>
                  <div style={{ display: 'inline-flex', background: 'var(--bg)', padding: 4, borderRadius: 999, border: '1.5px solid var(--line)' }}>
                    <button
                      type="button"
                      className={'fchip' + (backfillScope === 'IMPORT' ? ' on' : '')}
                      onClick={() => setBackfillScope('IMPORT')}
                      style={{ fontSize: 13, padding: '6px 16px', border: 'none', boxShadow: 'none' }}
                      disabled={backfillStatus?.status === 'RUNNING'}
                    >
                      📦 Theo đợt Import (Nguồn / Ngày)
                    </button>
                    <button
                      type="button"
                      className={'fchip' + (backfillScope === 'IDS' ? ' on' : '')}
                      onClick={() => setBackfillScope('IDS')}
                      style={{ fontSize: 13, padding: '6px 16px', border: 'none', boxShadow: 'none' }}
                      disabled={backfillStatus?.status === 'RUNNING'}
                    >
                      🎯 Theo danh sách từ chỉ định (Word IDs)
                    </button>
                  </div>
                </div>

                {/* Scope Inputs */}
                {backfillScope === 'IMPORT' ? (
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 16,
                      padding: '16px',
                      background: 'var(--surface)',
                      borderRadius: 14,
                      border: '1.5px solid var(--line)',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 220 }}>
                      <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, marginBottom: 6 }}>
                        Nguồn Dataset (Source):
                      </label>
                      <select
                        value={selectedSource}
                        onChange={(e) => setSelectedSource(e.target.value)}
                        className="input"
                        style={{ minHeight: 40, width: '100%', fontSize: 13 }}
                        disabled={backfillStatus?.status === 'RUNNING'}
                      >
                        <option value="">-- Tất cả nguồn dataset --</option>
                        {availableSources.map((src) => (
                          <option key={src} value={src}>
                            {src}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div style={{ flex: 1, minWidth: 220 }}>
                      <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, marginBottom: 6 }}>
                        Được tạo sau ngày (Tùy chọn):
                      </label>
                      <input
                        type="date"
                        value={selectedCreatedAfter}
                        onChange={(e) => setSelectedCreatedAfter(e.target.value)}
                        className="input"
                        style={{ minHeight: 40, width: '100%', fontSize: 13 }}
                        disabled={backfillStatus?.status === 'RUNNING'}
                      />
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                      padding: '16px',
                      background: 'var(--surface)',
                      borderRadius: 14,
                      border: '1.5px solid var(--line)',
                    }}
                  >
                    <label style={{ fontSize: 12.5, fontWeight: 700 }}>
                      Nhập danh sách UUID từ vựng (mỗi UUID một dòng hoặc cách nhau bằng dấu phẩy):
                    </label>
                    <textarea
                      rows={3}
                      value={targetWordIdsInput}
                      onChange={(e) => setTargetWordIdsInput(e.target.value)}
                      placeholder="e.g. 00092354-13f5-47aa-94c6-3312579db388, 0021b19a-9e6b-4eb8-a72a-4318ee43c081"
                      className="input"
                      style={{ fontSize: 12.5, fontFamily: 'monospace' }}
                      disabled={backfillStatus?.status === 'RUNNING'}
                    />
                    <div className="sub" style={{ fontSize: 12 }}>
                      Mẹo: Bạn có thể chọn trực tiếp từ bảng <b>Kho từ vựng</b> bằng checkbox rồi ấn <b>Gắn tag AI</b> để tự động nạp vào đây.
                    </div>
                  </div>
                )}

                {/* Batch Size & Threshold Controls */}
                <div className="row" style={{ flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className="sub">Lô quét DB:</span>
                    <select
                      value={backfillBatchSize}
                      onChange={(e) => setBackfillBatchSize(Number(e.target.value))}
                      className="input"
                      style={{ minHeight: 38, padding: '0 10px', fontSize: 13, width: 100 }}
                      disabled={backfillStatus?.status === 'RUNNING'}
                    >
                      <option value={10}>10 từ</option>
                      <option value={20}>20 từ</option>
                      <option value={50}>50 từ</option>
                      <option value={100}>100 từ</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className="sub">Ngưỡng tự động lưu:</span>
                    <select
                      value={backfillThreshold}
                      onChange={(e) => setBackfillThreshold(Number(e.target.value))}
                      className="input"
                      style={{ minHeight: 38, padding: '0 10px', fontSize: 13, width: 110 }}
                      disabled={backfillStatus?.status === 'RUNNING'}
                    >
                      <option value={0.7}>≥ 70%</option>
                      <option value={0.8}>≥ 80% (Khuyên dùng)</option>
                      <option value={0.85}>≥ 85%</option>
                      <option value={0.9}>≥ 90%</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <button
                      type="button"
                      className="btn green"
                      onClick={onOpenStartBackfillModal}
                      disabled={startingBackfill || backfillStatus?.status === 'RUNNING'}
                      style={{ minHeight: 42, padding: '0 22px', fontSize: 14 }}
                    >
                      <Icon n="spark" s={16} />
                      {backfillStatus?.status === 'RUNNING'
                        ? 'Tiến trình đang chạy...'
                        : backfillScope === 'IMPORT'
                          ? 'Bắt đầu gắn tag đợt Import'
                          : 'Bắt đầu gắn tag các từ chỉ định'}
                    </button>

                    {backfillStatus?.status === 'RUNNING' && (
                      <button
                        type="button"
                        onClick={onOpenCancelBackfillModal}
                        style={{
                          minHeight: 42,
                          padding: '0 18px',
                          fontSize: 13.5,
                          fontWeight: 700,
                          borderRadius: 999,
                          border: 'none',
                          cursor: 'pointer',
                          background: '#EF4444',
                          color: '#FFFFFF',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          boxShadow: '0 2px 8px rgba(239, 68, 68, 0.25)',
                        }}
                      >
                        <Icon n="x" s={15} />
                        Dừng tiến trình
                      </button>
                    )}
                  </div>
                </div>

                {/* Progress Card */}
                {backfillStatus && (
                  <div
                    style={{
                      border: '1.5px solid var(--line)',
                      borderRadius: 18,
                      padding: '20px',
                      background: 'var(--surface)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 14,
                    }}
                  >
                    <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                      <div>
                        <b>Trạng thái ({backfillStatus.scope || 'SCOPED'}): </b>
                        <span
                          className="pill"
                          style={{
                            fontWeight: 800,
                            background:
                              backfillStatus.status === 'RUNNING'
                                ? '#FEF3C7'
                                : backfillStatus.status === 'COMPLETED'
                                  ? '#DCFCE7'
                                  : backfillStatus.status === 'STOPPED'
                                    ? '#F3F4F6'
                                    : '#FEE2E2',
                            color:
                              backfillStatus.status === 'RUNNING'
                                ? '#B45309'
                                : backfillStatus.status === 'COMPLETED'
                                  ? '#15803D'
                                  : backfillStatus.status === 'STOPPED'
                                    ? '#4B5563'
                                    : '#DC2626',
                          }}
                        >
                          {backfillStatus.status}
                        </span>
                      </div>
                      <span className="sub">{backfillStatus.message}</span>
                    </div>

                    {/* Progress Bar */}
                    <div
                      style={{
                        height: 12,
                        background: '#E5E7EB',
                        borderRadius: 999,
                        overflow: 'hidden',
                        position: 'relative',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${backfillStatus.total > 0 ? Math.min(100, Math.round((backfillStatus.processed / backfillStatus.total) * 100)) : 0}%`,
                          background: 'linear-gradient(90deg, #10B981, #059669)',
                          transition: 'width 0.4s ease',
                          borderRadius: 999,
                        }}
                      />
                    </div>

                    {/* Statistics Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginTop: 4 }}>
                      <div style={{ padding: '10px 14px', background: 'var(--bg)', borderRadius: 12 }}>
                        <div className="sub" style={{ fontSize: 12 }}>Tổng trong phạm vi</div>
                        <b style={{ fontSize: 18 }}>{backfillStatus.total}</b>
                      </div>
                      <div style={{ padding: '10px 14px', background: 'var(--bg)', borderRadius: 12 }}>
                        <div className="sub" style={{ fontSize: 12 }}>Đã xử lý</div>
                        <b style={{ fontSize: 18 }}>{backfillStatus.processed}</b>
                      </div>
                      <div style={{ padding: '10px 14px', background: 'rgba(16, 185, 129, 0.08)', borderRadius: 12, color: '#047857' }}>
                        <div style={{ fontSize: 12 }}>Tự động lưu (≥{Math.round(backfillThreshold * 100)}%)</div>
                        <b style={{ fontSize: 18 }}>{backfillStatus.autoSaved}</b>
                      </div>
                      <div style={{ padding: '10px 14px', background: 'rgba(234, 88, 12, 0.08)', borderRadius: 12, color: '#c2410c' }}>
                        <div style={{ fontSize: 12 }}>Chờ duyệt tay</div>
                        <b style={{ fontSize: 18 }}>{backfillStatus.queued}</b>
                      </div>
                      <div style={{ padding: '10px 14px', background: 'var(--bg)', borderRadius: 12, color: 'var(--muted)' }}>
                        <div style={{ fontSize: 12 }}>Bỏ qua chủ đích</div>
                        <b style={{ fontSize: 18 }}>{backfillStatus.skippedIntentional ?? backfillStatus.skipped ?? 0}</b>
                      </div>
                      <div
                        style={{
                          padding: '10px 14px',
                          background: backfillStatus.failed > 0 ? '#FEE2E2' : 'var(--bg)',
                          borderRadius: 12,
                          color: backfillStatus.failed > 0 ? '#DC2626' : 'inherit',
                        }}
                      >
                        <div style={{ fontSize: 12 }}>Lỗi AI / Mạng</div>
                        <b style={{ fontSize: 18 }}>{backfillStatus.failed}</b>
                      </div>
                    </div>

                    {/* Last Error Notice */}
                    {backfillStatus.lastError && backfillStatus.failed > 0 && (
                      <div
                        style={{
                          background: '#FEF2F2',
                          border: '1.5px solid #FECACA',
                          borderRadius: 12,
                          padding: '10px 14px',
                          color: '#991B1B',
                          fontSize: 13,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        <span style={{ fontSize: 16 }}>⚠️</span>
                        <span>
                          <b>Lý do lỗi gần nhất:</b> {backfillStatus.lastError} (các từ lỗi này chưa được gắn tag và sẽ được thử lại khi chạy lại job)
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Sub-Tab 3: Tag Review Queue */}
            {activeTagTab === 'queue' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <div className="sub">
                    Danh sách các từ mà AI gợi ý chủ đề có độ tin cậy thấp (&lt; ngưỡng tự lưu). Admin có thể chọn chủ đề chính xác và bấm Duyệt.
                  </div>
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() => loadTagQueueData(queuePage)}
                    disabled={loadingQueue}
                    style={{ minHeight: 36, padding: '0 14px', fontSize: 13 }}
                  >
                    <Icon n="reload" s={14} />
                    {loadingQueue ? 'Đang tải...' : 'Làm mới hàng chờ'}
                  </button>
                </div>

                <div style={{ border: '1.5px solid var(--line)', borderRadius: 18, overflow: 'hidden' }}>
                  <table className="atable">
                    <thead>
                      <tr>
                        <th>Từ vựng</th>
                        <th style={{ width: 220 }}>Chủ đề gợi ý (Chỉnh sửa)</th>
                        <th style={{ width: 110 }}>Độ tin cậy</th>
                        <th>Lý do từ AI</th>
                        <th style={{ width: 100, textAlign: 'center' }}>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingQueue ? (
                        <tr>
                          <td colSpan={5} style={{ padding: 30, textAlign: 'center', color: 'var(--muted)' }}>
                            Đang tải hàng chờ duyệt...
                          </td>
                        </tr>
                      ) : tagQueueItems.length > 0 ? (
                        tagQueueItems.map((item) => (
                          <tr key={item.id}>
                            <td>
                              <b style={{ fontSize: 15 }}>{item.lemma}</b>
                            </td>
                            <td>
                              <select
                                defaultValue={item.suggestedTopic || 'WORK'}
                                id={`queue-topic-${item.id}`}
                                className="input"
                                style={{ minHeight: 34, padding: '0 8px', fontSize: 13, width: '100%' }}
                              >
                                {TOPIC_OPTIONS.map((t) => (
                                  <option key={t.code} value={t.code}>
                                    {t.code} — {TOPIC_MAP[t.code]}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td>
                              <span
                                className="pill"
                                style={{
                                  fontSize: 12,
                                  fontWeight: 800,
                                  background: 'rgba(234, 88, 12, 0.1)',
                                  color: '#c2410c',
                                }}
                              >
                                {Math.round((item.confidence || 0) * 100)}%
                              </span>
                            </td>
                            <td>
                              <span className="sub" style={{ fontSize: 13 }}>
                                {item.reason || 'N/A'}
                              </span>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <button
                                type="button"
                                className="btn green"
                                onClick={() => {
                                  const selectEl = document.getElementById(`queue-topic-${item.id}`) as HTMLSelectElement;
                                  const chosenTopic = selectEl ? selectEl.value : item.suggestedTopic;
                                  handleApproveQueueItem(item.cefrWordId, chosenTopic);
                                }}
                                style={{ minHeight: 32, padding: '0 14px', fontSize: 12.5 }}
                              >
                                Duyệt
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} style={{ padding: 30, textAlign: 'center', color: 'var(--green-dark)' }}>
                            ✓ Hàng chờ trống! Tất cả từ vựng đã được duyệt hoặc tự động gán chủ đề thành công.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
          </motion.div>
        )}
        </AnimatePresence>
      </div>

      {/* Generated Words Review & Approval Section */}
      {generatedWords.length > 0 && (
        <div className="card" style={{ padding: '20px 14px' }}>
          <div className="row" style={{ padding: '0 10px 14px', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <h2><span className="dot g" />Xem trước &amp; Duyệt dữ liệu do AI tạo ({generatedWords.length} từ)</h2>
              <div className="sub">Bạn có thể chỉnh sửa trực tiếp nội dung trước khi lưu chính thức vào cơ sở dữ liệu</div>
            </div>
            <button
              type="button"
              className="link"
              onClick={() => setGeneratedWords([])}
              style={{ color: 'var(--red-dark)', fontSize: 13.5 }}
            >
              Hủy danh sách này
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="atable">
              <thead>
                <tr>
                  <th>Từ vựng</th>
                  <th>Phiên âm IPA</th>
                  <th>Loại từ</th>
                  <th>Nghĩa tiếng Việt</th>
                  <th>Câu ví dụ &amp; Dịch nghĩa</th>
                  <th>CEFR</th>
                  <th style={{ textAlign: 'center' }}>Xóa</th>
                </tr>
              </thead>
              <tbody>
                {generatedWords.map((item, idx) => (
                  <tr key={idx}>
                    <td>
                      <input
                        className="input"
                        value={item.word}
                        onChange={(e) => handleFieldChange(idx, 'word', e.target.value)}
                        style={{ minHeight: 36, padding: '0 8px', fontSize: 14, fontWeight: 800, width: 120 }}
                      />
                    </td>
                    <td>
                      <input
                        className="input"
                        value={item.pronunciation || ''}
                        onChange={(e) => handleFieldChange(idx, 'pronunciation', e.target.value)}
                        style={{ minHeight: 36, padding: '0 8px', fontSize: 13, width: 110 }}
                      />
                    </td>
                    <td>
                      <select
                        value={item.partOfSpeech || 'NOUN'}
                        onChange={(e) => handleFieldChange(idx, 'partOfSpeech', e.target.value)}
                        className="input"
                        style={{ minHeight: 36, padding: '0 8px', fontSize: 12, width: 110 }}
                      >
                        <option value="NOUN">NOUN</option>
                        <option value="VERB">VERB</option>
                        <option value="ADJECTIVE">ADJECTIVE</option>
                        <option value="ADVERB">ADVERB</option>
                        <option value="PREPOSITION">PREPOSITION</option>
                        <option value="CONJUNCTION">CONJUNCTION</option>
                      </select>
                    </td>
                    <td>
                      <input
                        className="input"
                        value={item.meaning || ''}
                        onChange={(e) => handleFieldChange(idx, 'meaning', e.target.value)}
                        style={{ minHeight: 36, padding: '0 8px', fontSize: 13.5, width: 170 }}
                      />
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <input
                          className="input"
                          value={item.example || ''}
                          placeholder="Câu ví dụ tiếng Anh"
                          onChange={(e) => handleFieldChange(idx, 'example', e.target.value)}
                          style={{ minHeight: 34, padding: '0 8px', fontSize: 13, width: '100%', minWidth: 200 }}
                        />
                        <input
                          className="input"
                          value={item.exampleTranslation || ''}
                          placeholder="Dịch nghĩa tiếng Việt"
                          onChange={(e) => handleFieldChange(idx, 'exampleTranslation', e.target.value)}
                          style={{ minHeight: 34, padding: '0 8px', fontSize: 12.5, width: '100%', minWidth: 200 }}
                        />
                      </div>
                    </td>
                    <td>
                      <select
                        value={item.level || 'B1'}
                        onChange={(e) => handleFieldChange(idx, 'level', e.target.value)}
                        className="input"
                        style={{ minHeight: 36, padding: '0 6px', fontSize: 13, width: 70 }}
                      >
                        <option value="A1">A1</option>
                        <option value="A2">A2</option>
                        <option value="B1">B1</option>
                        <option value="B2">B2</option>
                        <option value="C1">C1</option>
                      </select>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--red)',
                          cursor: 'pointer',
                          fontSize: 16,
                        }}
                        title="Xóa dòng này"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bottom Actions */}
          <div className="row" style={{ padding: '16px 10px 0', borderTop: '1.5px dashed var(--line)', marginTop: 12, flexWrap: 'wrap', gap: 12 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, fontWeight: 700, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={overwriteExisting}
                onChange={(e) => setOverwriteExisting(e.target.checked)}
                style={{ width: 16, height: 16 }}
              />
              <span>Ghi đè nội dung nếu từ đã có trong Database</span>
            </label>

            <button
              type="button"
              className="btn green"
              onClick={handleApproveAndSave}
              disabled={approving}
              style={{ minHeight: 46, padding: '0 26px' }}
            >
              <Icon n="check" s={18} />
              {approving ? 'Đang lưu vào Database...' : `Phê duyệt & Lưu vào Database (${generatedWords.length} từ)`}
            </button>
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal */}
      {confirmModal && confirmModal.isOpen &&
        createPortal(
          <>
            <div className="scrim" onClick={() => setConfirmModal(null)} />
            <div
              className="modal"
              style={{
                maxWidth: 480,
                borderRadius: 24,
                padding: '28px 30px',
                zIndex: 100000,
                boxShadow: '0 25px 60px rgba(10, 37, 64, 0.25)',
                display: 'flex',
                flexDirection: 'column',
                gap: 20,
              }}
            >
              {/* Header with Icon and Close Button */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 16,
                      background: confirmModal.type === 'start' ? '#DCFCE7' : '#FEE2E2',
                      color: confirmModal.type === 'start' ? '#15803D' : '#DC2626',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Icon n={confirmModal.type === 'start' ? 'spark' : 'x'} s={24} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: 18, fontWeight: 900, color: 'var(--ink)', margin: 0 }}>
                      {confirmModal.title}
                    </h2>
                    <div className="sub" style={{ fontSize: 13, marginTop: 2 }}>
                      {confirmModal.type === 'start' ? 'Xác nhận thiết lập quét nền' : 'Thao tác tạm dừng an toàn'}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setConfirmModal(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: 20,
                    color: 'var(--muted)',
                    cursor: 'pointer',
                    padding: 4,
                    lineHeight: 1,
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Message Description */}
              <p style={{ margin: 0, fontSize: 14, color: 'var(--ink)', lineHeight: 1.6 }}>
                {confirmModal.message}
              </p>

              {/* Parameters Summary Card (for start action) */}
              {confirmModal.type === 'start' && (
                <div
                  style={{
                    background: 'var(--bg)',
                    border: '1.5px solid var(--line)',
                    borderRadius: 16,
                    padding: '14px 18px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5 }}>
                    <span className="sub">Kích thước lô gửi AI:</span>
                    <b style={{ color: 'var(--ink)' }}>{confirmModal.batchSize} từ / lần gọi</b>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5 }}>
                    <span className="sub">Ngưỡng tự động lưu DB:</span>
                    <b style={{ color: '#047857' }}>≥ {Math.round((confirmModal.threshold || 0.8) * 100)}% độ tin cậy</b>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5 }}>
                    <span className="sub">Độ tin cậy dưới ngưỡng:</span>
                    <b style={{ color: '#C2410C' }}>Chuyển vào Hàng chờ duyệt tay</b>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 4 }}>
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => setConfirmModal(null)}
                  style={{
                    borderRadius: 999,
                    padding: '10px 22px',
                    fontWeight: 700,
                    fontSize: 14,
                  }}
                >
                  Hủy bỏ
                </button>

                {confirmModal.type === 'start' ? (
                  <button
                    type="button"
                    className="btn green"
                    onClick={executeStartBackfill}
                    style={{
                      borderRadius: 999,
                      padding: '10px 24px',
                      fontWeight: 800,
                      fontSize: 14,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      boxShadow: '0 3px 12px rgba(16, 185, 129, 0.28)',
                    }}
                  >
                    <Icon n="spark" s={16} />
                    Bắt đầu quét ngay
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={executeCancelBackfill}
                    style={{
                      borderRadius: 999,
                      padding: '10px 24px',
                      fontWeight: 800,
                      fontSize: 14,
                      background: '#EF4444',
                      color: '#FFFFFF',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      boxShadow: '0 3px 12px rgba(239, 68, 68, 0.28)',
                    }}
                  >
                    <Icon n="x" s={15} />
                    Xác nhận dừng
                  </button>
                )}
              </div>
            </div>
          </>,
          document.body
        )}
    </div>
  );
}
