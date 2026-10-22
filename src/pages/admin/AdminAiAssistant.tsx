import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  adminApi,
  type AiAnalyticsSummary,
  type AiRequestLogItem,
  type AiVocabAuditSummary,
  type AiGeneratedWordItem,
  type AdminCopilotChatResponse,
} from '../../api';
import { Icon } from '../../components/icons';
import { staggerContainer, staggerItem, messageBubbleVariant } from '../../motion';

type MainTab = 'optimizer' | 'copilot' | 'vocab-studio';

export interface CopilotMessage {
  sender: 'user' | 'ai';
  text: string;
  time: string;
  widgetType?: 'cost_summary' | 'vocab_audit' | 'revenue_summary' | 'sla_status' | 'none';
  widgetData?: Record<string, any>;
  suggestedActions?: string[];
}

export default function AdminAiAssistant() {
  const [activeTab, setActiveTab] = useState<MainTab>('optimizer');
  const [timeRange, setTimeRange] = useState<string>('7d');
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<AiAnalyticsSummary | null>(null);

  // Logs state
  const [logs, setLogs] = useState<AiRequestLogItem[]>([]);
  const [logsPage, setLogsPage] = useState(0);
  const [logsTotalPages, setLogsTotalPages] = useState(1);
  const [selectedFeatureFilter, setSelectedFeatureFilter] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('');
  const [loadingLogs, setLoadingLogs] = useState(false);

  // ==================== Phase 3: Admin Copilot State ====================
  const [copilotInput, setCopilotInput] = useState('');
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [copilotHistory, setCopilotHistory] = useState<CopilotMessage[]>([
    {
      sender: 'ai',
      text: 'Xin chào Quản trị viên! Tôi là **Trợ lý Quản trị VocabAI (Admin Copilot)**.\n\nTôi có thể hỗ trợ bạn phân tích chi phí AI, kiểm định chất lượng kho từ vựng, theo dõi tình hình học viên và giám sát SLA hệ thống theo thời gian thực.',
      time: 'Vừa xong',
      suggestedActions: [
        'Phân tích tình hình chi phí AI tuần này',
        'Kiểm tra kho từ vựng có bao nhiêu từ thiếu ví dụ',
        'Tình hình người dùng và doanh thu hiện tại',
        'Báo cáo hiệu suất và độ trễ SLA hệ thống',
      ],
    },
  ]);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // ==================== Phase 2: AI Vocabulary Studio State ====================
  const [vocabAudit, setVocabAudit] = useState<AiVocabAuditSummary | null>(null);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [studioMode, setStudioMode] = useState<'enrich' | 'create'>('enrich');
  const [missingType, setMissingType] = useState<'example' | 'meaning' | 'pronunciation' | 'definition'>('example');
  const [missingLimit, setMissingLimit] = useState<number>(5);
  const [missingWords, setMissingWords] = useState<any[]>([]);
  const [selectedMissingIds, setSelectedMissingIds] = useState<(string | number)[]>([]);
  const [loadingMissing, setLoadingMissing] = useState(false);
  const [customWordsInput, setCustomWordsInput] = useState('');
  const [customLevelHint, setCustomLevelHint] = useState('B2');
  const [generatingVocab, setGeneratingVocab] = useState(false);
  const [generatedWords, setGeneratedWords] = useState<AiGeneratedWordItem[]>([]);
  const [overwriteExisting, setOverwriteExisting] = useState(true);
  const [approving, setApproving] = useState(false);
  const [approvalNotice, setApprovalNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadSummaryData = async (range: string) => {
    setLoading(true);
    try {
      const res = await adminApi.aiAnalyticsSummary(range);
      if (res?.data) {
        setSummary(res.data);
      }
    } catch (err) {
      console.error('Failed to load AI analytics summary:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadLogsData = async (range: string, feat: string, status: string, page: number) => {
    setLoadingLogs(true);
    try {
      const res = await adminApi.aiRequestLogs(range, feat, status, page, 10);
      const data = res?.data;
      if (data) {
        setLogs(data.content || []);
        setLogsTotalPages(data.totalPages || 1);
      }
    } catch (err) {
      console.error('Failed to load AI logs:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    loadSummaryData(timeRange);
    loadLogsData(timeRange, selectedFeatureFilter, selectedStatusFilter, logsPage);
  }, [timeRange]);

  const handleFilterLogs = (feat: string, status: string) => {
    setSelectedFeatureFilter(feat);
    setSelectedStatusFilter(status);
    setLogsPage(0);
    loadLogsData(timeRange, feat, status, 0);
  };

  // ==================== Phase 2: AI Vocabulary Studio Handlers ====================
  const loadVocabAuditData = async () => {
    setLoadingAudit(true);
    try {
      const res = await adminApi.aiVocabAudit();
      if (res?.data) {
        setVocabAudit(res.data);
      }
    } catch (err) {
      console.error('Failed to load vocabulary audit:', err);
    } finally {
      setLoadingAudit(false);
    }
  };

  const loadMissingWordsData = async (type = missingType, limit = missingLimit) => {
    setLoadingMissing(true);
    try {
      const res = await adminApi.aiVocabMissingData(type, limit);
      const data = res?.data || [];
      setMissingWords(data);
      setSelectedMissingIds(data.map((w: any) => w.id));
    } catch (err) {
      console.error('Failed to load missing words:', err);
    } finally {
      setLoadingMissing(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'vocab-studio') {
      if (!vocabAudit) {
        loadVocabAuditData();
      }
      if (missingWords.length === 0) {
        loadMissingWordsData(missingType, missingLimit);
      }
    }
  }, [activeTab]);

  const handleSelectAllMissing = (checked: boolean) => {
    if (checked) {
      setSelectedMissingIds(missingWords.map((w) => w.id));
    } else {
      setSelectedMissingIds([]);
    }
  };

  const handleToggleMissingId = (id: string | number) => {
    setSelectedMissingIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBatchGenerateFromMissing = async () => {
    const chosen = missingWords.filter((w) => selectedMissingIds.includes(w.id));
    if (chosen.length === 0) return;
    setGeneratingVocab(true);
    setApprovalNotice(null);
    try {
      const wordsToFetch = chosen.map((w) => w.word);
      const res = await adminApi.aiVocabBatchGenerate(wordsToFetch, chosen[0]?.level || 'B2');
      const items: AiGeneratedWordItem[] = res?.data || [];
      const enriched = items.map((item, idx) => {
        const match = chosen.find((c) => c.word.toLowerCase() === item.word.toLowerCase()) || chosen[idx];
        return {
          ...item,
          existingWordId: match?.id || null,
        };
      });
      setGeneratedWords(enriched);
    } catch (err: any) {
      console.error('Batch generation failed:', err);
      setApprovalNotice({ type: 'error', message: 'Lỗi khi sinh nội dung bằng AI. Vui lòng thử lại.' });
    } finally {
      setGeneratingVocab(false);
    }
  };

  const handleBatchGenerateCustom = async () => {
    const words = customWordsInput
      .split(/[\n,;]+/)
      .map((w) => w.trim())
      .filter(Boolean);
    if (words.length === 0) return;
    setGeneratingVocab(true);
    setApprovalNotice(null);
    try {
      const res = await adminApi.aiVocabBatchGenerate(words.slice(0, 10), customLevelHint);
      setGeneratedWords(res?.data || []);
    } catch (err: any) {
      console.error('Batch generate custom words failed:', err);
      setApprovalNotice({ type: 'error', message: 'Lỗi khi sinh nội dung bằng AI. Vui lòng thử lại.' });
    } finally {
      setGeneratingVocab(false);
    }
  };

  const handleUpdateGeneratedWord = (index: number, field: keyof AiGeneratedWordItem, value: any) => {
    setGeneratedWords((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleRemoveGeneratedWord = (index: number) => {
    setGeneratedWords((prev) => prev.filter((_, i) => i !== index));
  };

  const handleApproveAndSave = async () => {
    if (generatedWords.length === 0) return;
    setApproving(true);
    setApprovalNotice(null);
    try {
      const res = await adminApi.aiVocabApprove(generatedWords, overwriteExisting);
      const data = res?.data;
      setApprovalNotice({
        type: 'success',
        message: data?.message || `Đã phê duyệt và lưu thành công ${data?.savedCount || generatedWords.length} từ vào cơ sở dữ liệu!`,
      });
      setGeneratedWords([]);
      loadVocabAuditData();
      loadMissingWordsData(missingType, missingLimit);
    } catch (err: any) {
      console.error('Failed to approve words:', err);
      setApprovalNotice({ type: 'error', message: 'Không thể lưu từ vào cơ sở dữ liệu. Vui lòng kiểm tra lại quyền hạn.' });
    } finally {
      setApproving(false);
    }
  };

  const handleSendCopilot = async (customText?: string) => {
    const q = (typeof customText === 'string' ? customText : copilotInput).trim();
    if (!q || copilotLoading) return;
    setCopilotInput('');

    const now = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const userMsg: CopilotMessage = { sender: 'user', text: q, time: now };

    setCopilotHistory((prev) => [...prev, userMsg]);
    setCopilotLoading(true);

    try {
      const historyPayload = copilotHistory.slice(-6).map((m) => ({
        sender: m.sender,
        text: m.text,
      }));

      const res = await adminApi.copilotChat(q, historyPayload);
      const data: AdminCopilotChatResponse | undefined = res?.data;
      const aiTime = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

      const aiMsg: CopilotMessage = {
        sender: 'ai',
        text: data?.reply || 'Tôi đã xử lý yêu cầu của bạn.',
        time: aiTime,
        widgetType: data?.widgetType || 'none',
        widgetData: data?.widgetData,
        suggestedActions: data?.suggestedActions || [],
      };

      setCopilotHistory((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error('Failed to get Copilot response:', err);
      const aiTime = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      setCopilotHistory((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: 'Xin lỗi Quản trị viên, đã xảy ra sự cố kết nối tới dịch vụ AI Copilot. Vui lòng thử lại sau ít giây.',
          time: aiTime,
        },
      ]);
    } finally {
      setCopilotLoading(false);
      setTimeout(() => {
        chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  const handleClearCopilotChat = () => {
    setCopilotHistory([
      {
        sender: 'ai',
        text: 'Lịch sử hội thoại đã được làm mới. Tôi sẵn sàng giải đáp các thắc mắc quản trị tiếp theo của bạn!',
        time: 'Vừa xong',
        suggestedActions: [
          'Phân tích tình hình chi phí AI tuần này',
          'Kiểm tra kho từ vựng có bao nhiêu từ thiếu ví dụ',
          'Tình hình người dùng và doanh thu hiện tại',
        ],
      },
    ]);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      style={{ maxWidth: 1240, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}
    >
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontSize: '1.9rem', fontWeight: 900, margin: 0, color: '#0F172A', letterSpacing: '-0.5px' }}>
              Trợ Lý AI & Giám Sát Chi Phí
            </h1>
            <span
              className="soft-glow-badge"
              style={{
                fontSize: '0.72rem',
                fontWeight: 900,
                background: 'linear-gradient(135deg, #6366F1 0%, #A855F7 100%)',
                color: '#FFFFFF',
                padding: '3px 10px',
                borderRadius: 99,
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
                display: 'inline-block',
              }}
            >
              Gemini Pro Ops
            </span>
          </div>
          <p style={{ margin: '6px 0 0', color: '#64748B', fontSize: '0.94rem' }}>
            Theo dõi lượng token tiêu thụ, chi phí API thực tế, thời gian phản hồi SLA và quản trị thông minh bằng AI.
          </p>
        </div>

        {/* Global Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              padding: '6px 14px',
              borderRadius: 12,
              fontSize: '0.85rem',
              fontWeight: 700,
              color: '#334155',
            }}
          >
            <span
              className="pulse-live-dot"
              style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', display: 'inline-block' }}
            />
            <span>Model: <b>{summary?.activeModel || 'gemini-2.5-flash'}</b></span>
          </div>

          <div style={{ display: 'flex', background: '#F1F5F9', padding: 4, borderRadius: 12, border: '1px solid #E2E8F0' }}>
            {[
              { id: '24h', label: '24 Giờ' },
              { id: '7d', label: '7 Ngày' },
              { id: '30d', label: '30 Ngày' },
              { id: 'all', label: 'Tất cả' },
            ].map((r) => (
              <motion.button
                key={r.id}
                type="button"
                whileTap={{ scale: 0.95 }}
                onClick={() => setTimeRange(r.id)}
                style={{
                  border: 'none',
                  background: timeRange === r.id ? '#FFFFFF' : 'transparent',
                  color: timeRange === r.id ? '#4338CA' : '#64748B',
                  fontWeight: timeRange === r.id ? 800 : 600,
                  fontSize: '0.82rem',
                  padding: '6px 14px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  boxShadow: timeRange === r.id ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                {r.label}
              </motion.button>
            ))}
          </div>

          <motion.button
            type="button"
            whileHover={{ y: -1, boxShadow: '0 3px 10px rgba(0,0,0,0.08)' }}
            whileTap={{ scale: 0.96 }}
            onClick={() => {
              loadSummaryData(timeRange);
              loadLogsData(timeRange, selectedFeatureFilter, selectedStatusFilter, logsPage);
            }}
            disabled={loading}
            style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              padding: '8px 14px',
              borderRadius: 12,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              color: '#475569',
              fontWeight: 700,
              fontSize: '0.85rem',
            }}
            title="Làm mới dữ liệu"
          >
            <Icon n="spark" s={16} />
            <span>{loading ? 'Đang tải...' : 'Làm mới'}</span>
          </motion.button>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '2px solid #E2E8F0', paddingBottom: 2 }}>
        <motion.button
          type="button"
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setActiveTab('optimizer')}
          style={{
            border: 'none',
            background: 'transparent',
            padding: '10px 18px',
            fontSize: '0.94rem',
            fontWeight: activeTab === 'optimizer' ? 800 : 600,
            color: activeTab === 'optimizer' ? '#4F46E5' : '#64748B',
            borderBottom: activeTab === 'optimizer' ? '3px solid #4F46E5' : '3px solid transparent',
            marginBottom: -2,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            transition: 'color 0.15s ease, border-color 0.15s ease',
          }}
        >
          <Icon n="chart" s={18} />
          <span>Giám Sát & Tối Ưu Chi Phí (Cost Optimizer)</span>
        </motion.button>

        <motion.button
          type="button"
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setActiveTab('copilot')}
          style={{
            border: 'none',
            background: 'transparent',
            padding: '10px 18px',
            fontSize: '0.94rem',
            fontWeight: activeTab === 'copilot' ? 800 : 600,
            color: activeTab === 'copilot' ? '#4F46E5' : '#64748B',
            borderBottom: activeTab === 'copilot' ? '3px solid #4F46E5' : '3px solid transparent',
            marginBottom: -2,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            transition: 'color 0.15s ease, border-color 0.15s ease',
          }}
        >
          <Icon n="msg" s={18} />
          <span>Trợ Lý Quản Trị (Admin Copilot)</span>
          <span style={{ fontSize: '0.65rem', background: '#EEF2FF', color: '#4F46E5', padding: '2px 6px', borderRadius: 6, fontWeight: 800 }}></span>
        </motion.button>

        <motion.button
          type="button"
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setActiveTab('vocab-studio')}
          style={{
            border: 'none',
            background: 'transparent',
            padding: '10px 18px',
            fontSize: '0.94rem',
            fontWeight: activeTab === 'vocab-studio' ? 800 : 600,
            color: activeTab === 'vocab-studio' ? '#4F46E5' : '#64748B',
            borderBottom: activeTab === 'vocab-studio' ? '3px solid #4F46E5' : '3px solid transparent',
            marginBottom: -2,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            transition: 'color 0.15s ease, border-color 0.15s ease',
          }}
        >
          <Icon n="book" s={18} />
          <span>Xưởng Từ Vựng AI (Vocabulary Studio)</span>
          <span style={{ fontSize: '0.65rem', background: '#FDF2F8', color: '#DB2777', padding: '2px 6px', borderRadius: 6, fontWeight: 800 }}></span>
        </motion.button>
      </div>

      {/* Main Tab Content with AnimatePresence */}
      <AnimatePresence mode="wait">
        {activeTab === 'optimizer' && (
          <motion.div
            key="optimizer"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            style={{ display: 'flex', flexDirection: 'column', gap: 24 }}
          >
            {/* 4 Metric Cards */}
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 18 }}
            >
              {/* Card 1: Total Calls */}
              <motion.div
                variants={staggerItem}
                whileHover={{ y: -3, transition: { duration: 0.2 } }}
                style={{
                  background: '#FFFFFF',
                  borderRadius: 18,
                  padding: '22px 24px',
                  border: '1.5px solid #E2E8F0',
                  boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
                  position: 'relative',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748B' }}>Tổng lượt gọi AI</span>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4F46E5' }}>
                    <Icon n="zap" s={20} />
                  </div>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: '#0F172A', marginTop: 10 }}>
                  {summary ? summary.totalRequests.toLocaleString('vi-VN') : '...'}
                  <span style={{ fontSize: '0.9rem', color: '#64748B', fontWeight: 600, marginLeft: 6 }}>requests</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: '0.82rem' }}>
                  <span style={{ color: '#10B981', fontWeight: 800 }}>{summary?.successRate || 100}% thành công</span>
                  <span style={{ color: '#94A3B8' }}>•</span>
                  <span style={{ color: summary?.errorCount ? '#EF4444' : '#64748B' }}>{summary?.errorCount || 0} lỗi</span>
                </div>
              </motion.div>

              {/* Card 2: Total Tokens */}
              <motion.div
                variants={staggerItem}
                whileHover={{ y: -3, transition: { duration: 0.2 } }}
                style={{
                  background: '#FFFFFF',
                  borderRadius: 18,
                  padding: '22px 24px',
                  border: '1.5px solid #E2E8F0',
                  boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748B' }}>Lượng Token Tiêu Thụ</span>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: '#FAF5FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9333EA' }}>
                    <Icon n="spark" s={20} />
                  </div>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: '#0F172A', marginTop: 10 }}>
                  {summary ? summary.totalTokens.toLocaleString('vi-VN') : '...'}
                  <span style={{ fontSize: '0.9rem', color: '#64748B', fontWeight: 600, marginLeft: 6 }}>tokens</span>
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: '0.82rem', color: '#64748B' }}>
                  <span>In: <b>{summary ? summary.promptTokens.toLocaleString('vi-VN') : 0}</b></span>
                  <span>•</span>
                  <span>Out: <b>{summary ? summary.completionTokens.toLocaleString('vi-VN') : 0}</b></span>
                </div>
              </motion.div>

              {/* Card 3: Estimated Cost */}
              <motion.div
                variants={staggerItem}
                whileHover={{ y: -3, transition: { duration: 0.2 } }}
                style={{
                  background: '#FFFFFF',
                  borderRadius: 18,
                  padding: '22px 24px',
                  border: '1.5px solid #E2E8F0',
                  boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748B' }}>Chi Phí Ước Tính</span>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669' }}>
                    <Icon n="gem" s={20} />
                  </div>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: '#059669', marginTop: 10 }}>
                  ${summary ? Number(summary.estimatedCostUsd).toFixed(5) : '0.00000'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: '0.82rem', color: '#64748B' }}>
                  <span>Quy đổi: <b>~{summary ? summary.estimatedCostVnd.toLocaleString('vi-VN') : 0} VNĐ</b></span>
                  <span style={{ color: '#10B981', fontWeight: 700 }}>(Free Tier safe)</span>
                </div>
              </motion.div>

              {/* Card 4: SLA Latency */}
              <motion.div
                variants={staggerItem}
                whileHover={{ y: -3, transition: { duration: 0.2 } }}
                style={{
                  background: '#FFFFFF',
                  borderRadius: 18,
                  padding: '22px 24px',
                  border: '1.5px solid #E2E8F0',
                  boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748B' }}>Độ Trễ Phản Hồi TB</span>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: '#FFFBEB', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D97706' }}>
                    <Icon n="clock" s={20} />
                  </div>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: '#0F172A', marginTop: 10 }}>
                  {summary ? (summary.averageLatencyMs / 1000).toFixed(2) : '0.00'}
                  <span style={{ fontSize: '0.9rem', color: '#64748B', fontWeight: 600, marginLeft: 6 }}>giây / req</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: '0.82rem' }}>
                  <span style={{ color: (summary?.averageLatencyMs || 0) < 2000 ? '#10B981' : '#F59E0B', fontWeight: 800 }}>
                    {(summary?.averageLatencyMs || 0) < 2000 ? '✓ SLA đạt chuẩn (<2s)' : '⚠️ Cần tối ưu prompt'}
                  </span>
                </div>
              </motion.div>
            </motion.div>

            {/* 2 Middle Columns: Daily Trend Chart & Feature Distribution */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: 20 }}>
              {/* Column 1: Daily Trend */}
              <div
                style={{
                  background: '#FFFFFF',
                  borderRadius: 20,
                  padding: '24px',
                  border: '1.5px solid #E2E8F0',
                  boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#0F172A' }}>
                      Xu Hướng Gọi AI & Tiêu Thụ Token
                    </h3>
                    <span style={{ fontSize: '0.82rem', color: '#64748B' }}>Theo dõi phân bổ số lượng request theo từng ngày</span>
                  </div>
                  <span style={{ fontSize: '0.78rem', background: '#F1F5F9', color: '#475569', padding: '4px 10px', borderRadius: 8, fontWeight: 700 }}>
                    Biểu đồ trực quan
                  </span>
                </div>

                {/* Bar Chart Visualization */}
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, height: 180, paddingTop: 20, borderBottom: '1px solid #E2E8F0' }}>
                  {summary?.dailyTrend && summary.dailyTrend.length > 0 ? (
                    summary.dailyTrend.map((d, dIdx) => {
                      const maxRequests = Math.max(...summary.dailyTrend.map((item) => item.requests), 1);
                      const heightPercent = Math.max((d.requests / maxRequests) * 100, 12);
                      return (
                        <div key={d.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                          <div
                            style={{
                              fontSize: '0.75rem',
                              fontWeight: 800,
                              color: '#4F46E5',
                              marginBottom: 4,
                            }}
                          >
                            {d.requests}
                          </div>
                          <motion.div
                            initial={{ height: 0, opacity: 0.3 }}
                            animate={{ height: `${heightPercent}%`, opacity: 1 }}
                            transition={{ duration: 0.55, delay: dIdx * 0.06, ease: [0.16, 1, 0.3, 1] }}
                            style={{
                              width: '80%',
                              background: 'linear-gradient(180deg, #6366F1 0%, #4338CA 100%)',
                              borderRadius: '6px 6px 0 0',
                            }}
                            title={`${d.date}: ${d.requests} lượt (${d.tokens.toLocaleString()} tokens)`}
                          />
                          <span style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: 6, whiteSpace: 'nowrap' }}>
                            {d.date.substring(5)}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <div style={{ width: '100%', textAlign: 'center', color: '#94A3B8', padding: '40px 0' }}>
                      Chưa có đủ dữ liệu theo ngày trong khoảng thời gian này
                    </div>
                  )}
                </div>
              </div>

              {/* Column 2: Feature Breakdown */}
              <div
                style={{
                  background: '#FFFFFF',
                  borderRadius: 20,
                  padding: '24px',
                  border: '1.5px solid #E2E8F0',
                  boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#0F172A' }}>
                      Phân Bổ Lượng Dùng Theo Chức Năng
                    </h3>
                    <span style={{ fontSize: '0.82rem', color: '#64748B' }}>Tỷ lệ request và mức tiêu tốn tài nguyên</span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {summary?.featureBreakdown && summary.featureBreakdown.length > 0 ? (
                    summary.featureBreakdown.map((f, idx) => {
                      const colors = ['#6366F1', '#EC4899', '#10B981', '#F59E0B', '#8B5CF6'];
                      const color = colors[idx % colors.length];
                      return (
                        <div key={f.feature}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, fontSize: '0.86rem' }}>
                            <span style={{ fontWeight: 700, color: '#1E293B' }}>{f.displayName}</span>
                            <span style={{ fontWeight: 800, color }}>
                              {f.requestCount} lượt ({f.percentage}%) • {f.totalTokens.toLocaleString()} tokens
                            </span>
                          </div>
                          <div style={{ height: 8, background: '#F1F5F9', borderRadius: 99, overflow: 'hidden' }}>
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(f.percentage, 100)}%` }}
                              transition={{ duration: 0.65, delay: 0.15 + idx * 0.08, ease: [0.16, 1, 0.3, 1] }}
                              style={{
                                height: '100%',
                                background: color,
                                borderRadius: 99,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div style={{ textAlign: 'center', color: '#94A3B8', padding: '30px 0' }}>
                      Chưa có dữ liệu phân bổ tính năng
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Actionable AI Optimization Tips & Warnings */}
            <div
              style={{
                background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 100%)',
                borderRadius: 20,
                padding: '24px 28px',
                color: '#FFFFFF',
                boxShadow: '0 10px 28px rgba(49, 46, 129, 0.25)',
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon n="spark" s={20} />
                </div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>
                  Đề Xuất Tối Ưu Chi Phí & Hiệu Suất (AI Optimizer Recommendations)
                </h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
                {summary?.optimizationTips?.map((tip, idx) => (
                  <motion.div
                    key={idx}
                    whileHover={{ x: 4, backgroundColor: 'rgba(255, 255, 255, 0.14)', transition: { duration: 0.15 } }}
                    style={{
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: 12,
                      padding: '12px 16px',
                      fontSize: '0.88rem',
                      lineHeight: 1.5,
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 10,
                      cursor: 'default',
                    }}
                  >
                    <span style={{ color: '#A5B4FC', fontWeight: 900 }}>•</span>
                    <span>{tip}</span>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Detailed Request Logs Table */}
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: 20,
                padding: '24px',
                border: '1.5px solid #E2E8F0',
                boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14, marginBottom: 18 }}>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#0F172A' }}>
                    Nhật Ký Yêu Cầu AI Gần Nhất (Request Audit Trail)
                  </h3>
                  <span style={{ fontSize: '0.84rem', color: '#64748B' }}>Ghi nhận chi tiết token, độ trễ và trạng thái thực thi từng request</span>
                </div>

                {/* Table Filters */}
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <select
                    value={selectedFeatureFilter}
                    onChange={(e) => handleFilterLogs(e.target.value, selectedStatusFilter)}
                    style={{
                      padding: '7px 12px',
                      borderRadius: 10,
                      border: '1px solid #CBD5E1',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      color: '#334155',
                      outline: 'none',
                    }}
                  >
                    <option value="">Tất cả tính năng</option>
                    <option value="AI_TUTOR_CHAT">Trò chuyện AI Tutor</option>
                    <option value="GRAMMAR_CHECK">Kiểm tra ngữ pháp</option>
                    <option value="VOCAB_EXPLAIN">Giải nghĩa từ vựng</option>
                    <option value="SPEAKING_FEEDBACK">Chấm điểm phát âm</option>
                  </select>

                  <select
                    value={selectedStatusFilter}
                    onChange={(e) => handleFilterLogs(selectedFeatureFilter, e.target.value)}
                    style={{
                      padding: '7px 12px',
                      borderRadius: 10,
                      border: '1px solid #CBD5E1',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      color: '#334155',
                      outline: 'none',
                    }}
                  >
                    <option value="">Tất cả trạng thái</option>
                    <option value="SUCCESS">Thành công (SUCCESS)</option>
                    <option value="FAILED">Thất bại (FAILED)</option>
                    <option value="FALLBACK">Chế độ Fallback</option>
                  </select>
                </div>
              </div>

              {/* Table */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #F1F5F9', color: '#64748B', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                      <th style={{ padding: '10px 12px' }}>Thời gian</th>
                      <th style={{ padding: '10px 12px' }}>Người dùng</th>
                      <th style={{ padding: '10px 12px' }}>Tính năng</th>
                      <th style={{ padding: '10px 12px' }}>Model</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right' }}>Token (In/Out)</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right' }}>Tổng Token</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right' }}>Độ trễ (ms)</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center' }}>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingLogs ? (
                      <tr>
                        <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: '#64748B' }}>
                          Đang tải nhật ký gọi AI...
                        </td>
                      </tr>
                    ) : logs.length > 0 ? (
                      logs.map((log) => (
                        <tr key={log.id} style={{ borderBottom: '1px solid #F8FAFC' }}>
                          <td style={{ padding: '12px', color: '#64748B', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                            {new Date(log.createdAt).toLocaleString('vi-VN')}
                          </td>
                          <td style={{ padding: '12px', fontWeight: 700, color: '#1E293B' }}>
                            {log.username}
                          </td>
                          <td style={{ padding: '12px' }}>
                            <span style={{ background: '#EEF2FF', color: '#4338CA', padding: '3px 8px', borderRadius: 6, fontSize: '0.8rem', fontWeight: 700 }}>
                              {log.feature}
                            </span>
                          </td>
                          <td style={{ padding: '12px', color: '#64748B', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                            {log.model}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right', color: '#64748B' }}>
                            {log.promptTokens} / {log.completionTokens}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right', fontWeight: 800, color: '#0F172A' }}>
                            {log.totalTokens.toLocaleString()}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right', color: log.latencyMs > 2500 ? '#D97706' : '#10B981', fontWeight: 700 }}>
                            {log.latencyMs}ms
                          </td>
                          <td style={{ padding: '12px', textAlign: 'center' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '3px 10px',
                                borderRadius: 99,
                                fontSize: '0.75rem',
                                fontWeight: 800,
                                background: log.status === 'SUCCESS' ? '#DCFCE7' : '#FEE2E2',
                                color: log.status === 'SUCCESS' ? '#15803D' : '#B91C1C',
                              }}
                            >
                              {log.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: '#94A3B8' }}>
                          Không có bản ghi yêu cầu nào phù hợp với bộ lọc
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {logsTotalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
                  <button
                    type="button"
                    disabled={logsPage <= 0}
                    onClick={() => {
                      const p = Math.max(0, logsPage - 1);
                      setLogsPage(p);
                      loadLogsData(timeRange, selectedFeatureFilter, selectedStatusFilter, p);
                    }}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 8,
                      border: '1px solid #CBD5E1',
                      background: '#FFFFFF',
                      cursor: logsPage <= 0 ? 'not-allowed' : 'pointer',
                      opacity: logsPage <= 0 ? 0.5 : 1,
                      fontSize: '0.82rem',
                      fontWeight: 700,
                    }}
                  >
                    ‹ Trang trước
                  </button>
                  <span style={{ display: 'flex', alignItems: 'center', padding: '0 8px', fontSize: '0.85rem', color: '#64748B' }}>
                    Trang {logsPage + 1} / {logsTotalPages}
                  </span>
                  <button
                    type="button"
                    disabled={logsPage >= logsTotalPages - 1}
                    onClick={() => {
                      const p = logsPage + 1;
                      setLogsPage(p);
                      loadLogsData(timeRange, selectedFeatureFilter, selectedStatusFilter, p);
                    }}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 8,
                      border: '1px solid #CBD5E1',
                      background: '#FFFFFF',
                      cursor: logsPage >= logsTotalPages - 1 ? 'not-allowed' : 'pointer',
                      opacity: logsPage >= logsTotalPages - 1 ? 0.5 : 1,
                      fontSize: '0.82rem',
                      fontWeight: 700,
                    }}
                  >
                    Trang sau ›
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ============================================================
          TAB 2: ADMIN COPILOT WORKSPACE (PHASE 3 IMPLEMENTATION)
          ============================================================ */}
        {activeTab === 'copilot' && (
          <motion.div
            key="copilot"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
          >
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: 20,
                padding: '24px 28px',
                border: '1.5px solid #E2E8F0',
                boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
                minHeight: 560,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              {/* Copilot Header */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 12,
                  paddingBottom: 16,
                  borderBottom: '1px solid #E2E8F0',
                  marginBottom: 16,
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 900, margin: 0, color: '#0F172A' }}>
                      Trợ Lý Quản Trị & Vận Hành Thông Minh (Admin Copilot)
                    </h3>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        background: '#ECFDF5',
                        color: '#059669',
                        border: '1px solid #A7F3D0',
                        padding: '2px 8px',
                        borderRadius: 99,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                      }}
                    >
                      <span
                        className="pulse-live-dot"
                        style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', display: 'inline-block' }}
                      />
                      Safe Tool Calling Active
                    </span>
                  </div>
                  <p style={{ margin: '4px 0 0', color: '#64748B', fontSize: '0.88rem' }}>
                    Truy vấn số liệu hệ thống, phân tích chi phí AI và kiểm tra kho từ vựng bằng tiếng Việt tự nhiên.
                  </p>
                </div>

                <motion.button
                  type="button"
                  whileHover={{ y: -1, background: '#F1F5F9' }}
                  whileTap={{ scale: 0.96 }}
                  onClick={handleClearCopilotChat}
                  style={{
                    background: '#F8FAFC',
                    border: '1px solid #CBD5E1',
                    padding: '6px 14px',
                    borderRadius: 10,
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    color: '#64748B',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Icon n="spark" s={16} />
                  <span>Làm mới hội thoại</span>
                </motion.button>
              </div>

              {/* Top Quick Prompt Chips */}
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>
                  Gợi ý câu lệnh mẫu cho Quản trị viên (click để gửi ngay):
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
                  {[
                    { label: '📊 Phân tích tình hình chi phí AI tuần này', query: 'Phân tích tình hình chi phí AI tuần này' },
                    { label: '📚 Kiểm tra từ vựng có bao nhiêu từ thiếu ví dụ', query: 'Kiểm tra kho từ vựng có bao nhiêu từ thiếu ví dụ' },
                    { label: '👥 Tình hình người dùng và doanh thu hiện tại', query: 'Tình hình người dùng và doanh thu hiện tại' },
                    { label: '⚡ Báo cáo hiệu suất SLA và độ trễ hệ thống', query: 'Báo cáo hiệu suất và độ trễ SLA hệ thống' },
                  ].map((chip) => (
                    <motion.button
                      key={chip.label}
                      type="button"
                      disabled={copilotLoading}
                      onClick={() => handleSendCopilot(chip.query)}
                      whileHover={{ scale: 1.03, y: -1 }}
                      whileTap={{ scale: 0.96 }}
                      style={{
                        background: '#F1F5F9',
                        border: '1px solid #CBD5E1',
                        borderRadius: 20,
                        padding: '6px 14px',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        color: '#334155',
                        cursor: copilotLoading ? 'not-allowed' : 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {chip.label}
                    </motion.button>
                  ))}
                </div>

                {/* Chat Message Stream */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxHeight: 460, minHeight: 340, overflowY: 'auto', paddingRight: 8 }}>
                  {copilotHistory.map((msg, i) => (
                    <motion.div
                      key={i}
                      variants={messageBubbleVariant}
                      initial="hidden"
                      animate="visible"
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                      }}
                    >
                      <motion.div
                        whileHover={{ y: -1, transition: { duration: 0.15 } }}
                        style={{
                          maxWidth: '86%',
                          borderRadius: msg.sender === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                          padding: '16px 20px',
                          fontSize: '0.92rem',
                          lineHeight: 1.6,
                          background: msg.sender === 'user' ? 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)' : '#FFFFFF',
                          color: msg.sender === 'user' ? '#FFFFFF' : '#1E293B',
                          border: msg.sender === 'user' ? 'none' : '1.5px solid #E2E8F0',
                          boxShadow: '0 3px 12px rgba(15, 23, 42, 0.05)',
                        }}
                      >
                        {/* Message Content */}
                        {msg.sender === 'user' ? (
                          <div style={{ fontWeight: 600 }}>{msg.text}</div>
                        ) : (
                          <div>
                            {/* Markdown formatted text */}
                            <div>
                              {msg.text.split('\n').map((line, lIdx) => {
                                const trimmed = line.trim();
                                if (!trimmed) return <div key={lIdx} style={{ height: 6 }} />;
                                if (trimmed.startsWith('### ')) {
                                  return (
                                    <div key={lIdx} style={{ fontSize: '1.05rem', fontWeight: 900, color: '#312E81', margin: '8px 0 6px', letterSpacing: '-0.3px' }}>
                                      {trimmed.replace('### ', '')}
                                    </div>
                                  );
                                }
                                if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                                  const bulletContent = trimmed.substring(2);
                                  return (
                                    <div key={lIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, margin: '4px 0', lineHeight: 1.55 }}>
                                      <span style={{ color: '#6366F1', fontWeight: 900, fontSize: '1rem', lineHeight: 1.2 }}>•</span>
                                      <span
                                        dangerouslySetInnerHTML={{
                                          __html: bulletContent
                                            .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #0F172A; font-weight: 800;">$1</strong>')
                                            .replace(/`([^`]+)`/g, '<code style="background: #F1F5F9; color: #4338CA; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 0.85em;">$1</code>'),
                                        }}
                                      />
                                    </div>
                                  );
                                }
                                return (
                                  <div
                                    key={lIdx}
                                    style={{ margin: '4px 0', lineHeight: 1.55 }}
                                    dangerouslySetInnerHTML={{
                                      __html: line
                                        .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #0F172A; font-weight: 800;">$1</strong>')
                                        .replace(/`([^`]+)`/g, '<code style="background: #F1F5F9; color: #4338CA; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 0.85em;">$1</code>'),
                                    }}
                                  />
                                );
                              })}
                            </div>

                            {/* Embedded Visual Widget */}
                            {msg.widgetType && msg.widgetType !== 'none' && msg.widgetData && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.98, y: 6 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                                style={{ marginTop: 14 }}
                              >
                                {/* Widget 1: Cost Summary */}
                                {msg.widgetType === 'cost_summary' && (
                                  <div style={{ padding: '14px 16px', background: '#F8FAFC', borderRadius: 14, border: '1.5px solid #E2E8F0' }}>
                                    <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>
                                      📊 Thẻ Trực Quan Số Liệu AI
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
                                      <div style={{ background: '#FFFFFF', padding: '10px 12px', borderRadius: 10, border: '1px solid #E2E8F0' }}>
                                        <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>Lượt gọi API</div>
                                        <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0F172A', marginTop: 2 }}>
                                          {Number(msg.widgetData.totalRequests || 0).toLocaleString('vi-VN')}
                                        </div>
                                      </div>
                                      <div style={{ background: '#FFFFFF', padding: '10px 12px', borderRadius: 10, border: '1px solid #E2E8F0' }}>
                                        <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>Tổng Token</div>
                                        <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#6366F1', marginTop: 2 }}>
                                          {Number(msg.widgetData.totalTokens || 0).toLocaleString('vi-VN')}
                                        </div>
                                      </div>
                                      <div style={{ background: '#FFFFFF', padding: '10px 12px', borderRadius: 10, border: '1px solid #E2E8F0' }}>
                                        <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>Chi phí ước tính</div>
                                        <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#059669', marginTop: 2 }}>
                                          ~{Number(msg.widgetData.costVnd || 0).toLocaleString('vi-VN')} đ
                                        </div>
                                      </div>
                                      <div style={{ background: '#FFFFFF', padding: '10px 12px', borderRadius: 10, border: '1px solid #E2E8F0' }}>
                                        <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>Độ trễ / SLA</div>
                                        <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0F172A', marginTop: 2 }}>
                                          {((Number(msg.widgetData.avgLatencyMs) || 1200) / 1000).toFixed(2)}s
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Widget 2: Vocab Audit */}
                                {msg.widgetType === 'vocab_audit' && (
                                  <div style={{ padding: '14px 16px', background: '#F8FAFC', borderRadius: 14, border: '1.5px solid #E2E8F0' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                      <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                        📚 Thẻ Kiểm Định Kho Từ Vựng
                                      </span>
                                      <span style={{ fontSize: '0.75rem', fontWeight: 800, background: '#ECFDF5', color: '#059669', padding: '2px 8px', borderRadius: 6 }}>
                                        Hoàn thiện {msg.widgetData.completenessRate || 98.9}%
                                      </span>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
                                      <div style={{ background: '#FFFFFF', padding: '10px 12px', borderRadius: 10, border: '1px solid #E2E8F0' }}>
                                        <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>Tổng số từ</div>
                                        <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0F172A', marginTop: 2 }}>
                                          {Number(msg.widgetData.totalWords || 0).toLocaleString('vi-VN')}
                                        </div>
                                      </div>
                                      <div style={{ background: '#FFFFFF', padding: '10px 12px', borderRadius: 10, border: '1px solid #E2E8F0' }}>
                                        <div style={{ fontSize: '0.72rem', color: '#D97706', fontWeight: 700 }}>Thiếu câu ví dụ</div>
                                        <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#D97706', marginTop: 2 }}>
                                          {Number(msg.widgetData.wordsMissingExample || 0).toLocaleString('vi-VN')} từ
                                        </div>
                                      </div>
                                      <div style={{ background: '#FFFFFF', padding: '10px 12px', borderRadius: 10, border: '1px solid #E2E8F0' }}>
                                        <div style={{ fontSize: '0.72rem', color: '#DB2777', fontWeight: 700 }}>Thiếu nghĩa VN</div>
                                        <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#DB2777', marginTop: 2 }}>
                                          {Number(msg.widgetData.wordsMissingMeaning || 0).toLocaleString('vi-VN')} từ
                                        </div>
                                      </div>
                                    </div>
                                    <motion.button
                                      type="button"
                                      whileHover={{ scale: 1.01 }}
                                      whileTap={{ scale: 0.98 }}
                                      onClick={() => setActiveTab('vocab-studio')}
                                      style={{
                                        marginTop: 10,
                                        width: '100%',
                                        padding: '8px 14px',
                                        background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
                                        color: '#FFFFFF',
                                        border: 'none',
                                        borderRadius: 8,
                                        fontSize: '0.82rem',
                                        fontWeight: 800,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 6,
                                      }}
                                    >
                                      <Icon n="book" s={16} />
                                      <span>Chuyển sang Xưởng Từ Vựng AI để sinh nội dung thiếu</span>
                                    </motion.button>
                                  </div>
                                )}

                                {/* Widget 3: Revenue Summary */}
                                {msg.widgetType === 'revenue_summary' && (
                                  <div style={{ padding: '14px 16px', background: '#F8FAFC', borderRadius: 14, border: '1.5px solid #E2E8F0' }}>
                                    <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>
                                      👥 Thẻ Học Viên & Doanh Thu Tích Lũy
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
                                      <div style={{ background: '#FFFFFF', padding: '10px 12px', borderRadius: 10, border: '1px solid #E2E8F0' }}>
                                        <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>Tổng học viên</div>
                                        <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0F172A', marginTop: 2 }}>
                                          {Number(msg.widgetData.totalUsers || 0).toLocaleString('vi-VN')}
                                        </div>
                                      </div>
                                      <div style={{ background: '#FFFFFF', padding: '10px 12px', borderRadius: 10, border: '1px solid #E2E8F0' }}>
                                        <div style={{ fontSize: '0.72rem', color: '#4F46E5', fontWeight: 700 }}>Gói Premium</div>
                                        <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#4F46E5', marginTop: 2 }}>
                                          {Number(msg.widgetData.activeSubscriptions || 0).toLocaleString('vi-VN')}
                                        </div>
                                      </div>
                                      <div style={{ background: '#FFFFFF', padding: '10px 12px', borderRadius: 10, border: '1px solid #E2E8F0' }}>
                                        <div style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 700 }}>Tổng doanh thu</div>
                                        <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#059669', marginTop: 2 }}>
                                          {Number(msg.widgetData.totalRevenue || 0).toLocaleString('vi-VN')} đ
                                        </div>
                                      </div>
                                      <div style={{ background: '#FFFFFF', padding: '10px 12px', borderRadius: 10, border: '1px solid #E2E8F0' }}>
                                        <div style={{ fontSize: '0.72rem', color: '#D97706', fontWeight: 700 }}>Phiên học hôm nay</div>
                                        <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#D97706', marginTop: 2 }}>
                                          {Number(msg.widgetData.activeLearningSessionsToday || 0).toLocaleString('vi-VN')}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Widget 4: SLA Status */}
                                {msg.widgetType === 'sla_status' && (
                                  <div style={{ padding: '14px 16px', background: '#F8FAFC', borderRadius: 14, border: '1.5px solid #E2E8F0' }}>
                                    <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>
                                      ⚡ Thẻ Trạng Thái Hiệu Suất SLA
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
                                      <div style={{ background: '#FFFFFF', padding: '10px 12px', borderRadius: 10, border: '1px solid #E2E8F0' }}>
                                        <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>Độ trễ trung bình</div>
                                        <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#059669', marginTop: 2 }}>
                                          {((Number(msg.widgetData.avgLatencyMs) || 1200) / 1000).toFixed(2)}s
                                        </div>
                                      </div>
                                      <div style={{ background: '#FFFFFF', padding: '10px 12px', borderRadius: 10, border: '1px solid #E2E8F0' }}>
                                        <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>Tỷ lệ thành công</div>
                                        <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#10B981', marginTop: 2 }}>
                                          {msg.widgetData.successRate || 99.3}%
                                        </div>
                                      </div>
                                      <div style={{ background: '#FFFFFF', padding: '10px 12px', borderRadius: 10, border: '1px solid #E2E8F0' }}>
                                        <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>Số lỗi ghi nhận</div>
                                        <div style={{ fontSize: '1.15rem', fontWeight: 900, color: Number(msg.widgetData.errorCount) > 0 ? '#EF4444' : '#10B981', marginTop: 2 }}>
                                          {msg.widgetData.errorCount || 0}
                                        </div>
                                      </div>
                                      <div style={{ background: '#FFFFFF', padding: '10px 12px', borderRadius: 10, border: '1px solid #E2E8F0' }}>
                                        <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>Mô hình vận hành</div>
                                        <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#4F46E5', marginTop: 4 }}>
                                          {msg.widgetData.activeModel || 'gemini-2.5-flash'}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </motion.div>
                            )}

                            {/* Suggested Action Chips */}
                            {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12, paddingTop: 10, borderTop: '1px dashed #E2E8F0' }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', alignSelf: 'center' }}>
                                  Gợi ý câu hỏi tiếp:
                                </span>
                                {msg.suggestedActions.map((action, aIdx) => (
                                  <motion.button
                                    key={aIdx}
                                    type="button"
                                    disabled={copilotLoading}
                                    onClick={() => handleSendCopilot(action)}
                                    whileHover={{ scale: 1.04, y: -1 }}
                                    whileTap={{ scale: 0.96 }}
                                    style={{
                                      background: '#EEF2FF',
                                      border: '1px solid #C7D2FE',
                                      borderRadius: 14,
                                      padding: '3px 10px',
                                      fontSize: '0.76rem',
                                      fontWeight: 700,
                                      color: '#4338CA',
                                      cursor: copilotLoading ? 'not-allowed' : 'pointer',
                                      transition: 'all 0.15s ease',
                                    }}
                                  >
                                    💬 {action}
                                  </motion.button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </motion.div>
                      <span style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: 4, padding: '0 4px' }}>
                        {msg.time}
                      </span>
                    </motion.div>
                  ))}

                  {/* Loading state indicator with soft dots wave */}
                  {copilotLoading && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      style={{ display: 'flex', alignItems: 'center', gap: 10 }}
                    >
                      <div style={{ width: 34, height: 34, borderRadius: 10, background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4F46E5' }}>
                        <Icon n="spark" s={18} />
                      </div>
                      <div
                        style={{
                          background: '#FFFFFF',
                          border: '1.5px solid #E2E8F0',
                          padding: '12px 18px',
                          borderRadius: '16px 16px 16px 4px',
                          fontSize: '0.86rem',
                          color: '#475569',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span className="copilot-dot" />
                          <span className="copilot-dot" />
                          <span className="copilot-dot" />
                        </div>
                        <span style={{ fontWeight: 600 }}>Trợ lý đang phân tích dữ liệu hệ thống và suy nghĩ câu trả lời...</span>
                      </div>
                    </motion.div>
                  )}

                  <div ref={chatBottomRef} />
                </div>
              </div>

              {/* Input Bar */}
              <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: 16, marginTop: 16 }}>
                <div style={{ display: 'flex', gap: 10 }}>
                  <input
                    type="text"
                    value={copilotInput}
                    disabled={copilotLoading}
                    onChange={(e) => setCopilotInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSendCopilot();
                    }}
                    placeholder="Nhập câu hỏi hoặc yêu cầu phân tích dữ liệu bằng tiếng Việt (Enter để gửi)..."
                    style={{
                      flex: 1,
                      padding: '12px 18px',
                      borderRadius: 12,
                      border: '1.5px solid #CBD5E1',
                      fontSize: '0.94rem',
                      outline: 'none',
                      background: copilotLoading ? '#F8FAFC' : '#FFFFFF',
                    }}
                  />
                  <motion.button
                    type="button"
                    onClick={() => handleSendCopilot()}
                    disabled={!copilotInput.trim() || copilotLoading}
                    whileHover={!copilotInput.trim() || copilotLoading ? {} : { scale: 1.02 }}
                    whileTap={!copilotInput.trim() || copilotLoading ? {} : { scale: 0.98 }}
                    style={{
                      padding: '0 24px',
                      background: !copilotInput.trim() || copilotLoading ? '#94A3B8' : 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: 12,
                      fontWeight: 800,
                      fontSize: '0.94rem',
                      cursor: !copilotInput.trim() || copilotLoading ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      boxShadow: !copilotInput.trim() || copilotLoading ? 'none' : '0 4px 14px rgba(79, 70, 229, 0.3)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <Icon n="send" s={16} />
                    <span>{copilotLoading ? 'Đang gửi...' : 'Gửi lệnh'}</span>
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ============================================================
          TAB 3: VOCABULARY STUDIO (PHASE 2 IMPLEMENTATION)
          ============================================================ */}
        {activeTab === 'vocab-studio' && (
          <motion.div
            key="vocab-studio"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            style={{ display: 'flex', flexDirection: 'column', gap: 24 }}
          >
            {/* Top Notice Banner with AnimatePresence */}
            <AnimatePresence>
              {approvalNotice && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 20px',
                    borderRadius: 14,
                    background: approvalNotice.type === 'success' ? '#ECFDF5' : '#FEF2F2',
                    border: `1.5px solid ${approvalNotice.type === 'success' ? '#A7F3D0' : '#FECACA'}`,
                    color: approvalNotice.type === 'success' ? '#065F46' : '#991B1B',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Icon n={approvalNotice.type === 'success' ? 'checkc' : 'x'} s={20} />
                    <span style={{ fontSize: '0.92rem', fontWeight: 700 }}>{approvalNotice.message}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setApprovalNotice(null)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'inherit',
                      padding: 4,
                      display: 'flex',
                    }}
                    title="Đóng thông báo"
                  >
                    <Icon n="x" s={16} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 1. Quality Audit Dashboard (4 Cards) */}
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 18 }}
            >
              {/* Card 1: Completeness Rate */}
              <motion.div
                variants={staggerItem}
                whileHover={{ y: -3, transition: { duration: 0.2 } }}
                style={{
                  background: '#FFFFFF',
                  borderRadius: 18,
                  padding: '22px 24px',
                  border: '1.5px solid #E2E8F0',
                  boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748B' }}>Tỷ Lệ Hoàn Thiện Dữ Liệu</span>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669' }}>
                    <Icon n="checkc" s={20} />
                  </div>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: '#059669', marginTop: 10 }}>
                  {vocabAudit ? `${vocabAudit.completenessRate}%` : '98.9%'}
                </div>
                {/* Progress bar */}
                <div style={{ width: '100%', height: 7, background: '#E2E8F0', borderRadius: 99, marginTop: 10, overflow: 'hidden' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${vocabAudit?.completenessRate || 98.9}%` }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    style={{
                      height: '100%',
                      background: 'linear-gradient(90deg, #10B981 0%, #059669 100%)',
                      borderRadius: 99,
                    }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, fontSize: '0.8rem', color: '#64748B' }}>
                  <span>Chuẩn từ điển CEFR</span>
                  <span style={{ color: '#10B981', fontWeight: 800 }}>Chất lượng cao</span>
                </div>
              </motion.div>

              {/* Card 2: Total Words */}
              <motion.div
                variants={staggerItem}
                whileHover={{ y: -3, transition: { duration: 0.2 } }}
                style={{
                  background: '#FFFFFF',
                  borderRadius: 18,
                  padding: '22px 24px',
                  border: '1.5px solid #E2E8F0',
                  boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748B' }}>Tổng Kho Từ Vựng</span>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4F46E5' }}>
                    <Icon n="book" s={20} />
                  </div>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: '#0F172A', marginTop: 10 }}>
                  {vocabAudit ? vocabAudit.totalWords.toLocaleString('vi-VN') : '4,962'}
                  <span style={{ fontSize: '0.9rem', color: '#64748B', fontWeight: 600, marginLeft: 6 }}>từ</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: '0.82rem', color: '#64748B' }}>
                  <span>Cơ sở dữ liệu hệ thống</span>
                  <span style={{ color: '#94A3B8' }}>•</span>
                  <button
                    type="button"
                    onClick={() => {
                      loadVocabAuditData();
                      loadMissingWordsData(missingType, missingLimit);
                    }}
                    disabled={loadingAudit}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#4F46E5',
                      fontWeight: 700,
                      cursor: 'pointer',
                      padding: 0,
                      fontSize: '0.82rem',
                    }}
                  >
                    {loadingAudit ? 'Đang quét...' : 'Quét lại'}
                  </button>
                </div>
              </motion.div>

              {/* Card 3: Missing Examples */}
              <motion.div
                variants={staggerItem}
                whileHover={{ y: -3, transition: { duration: 0.2 } }}
                style={{
                  background: '#FFFFFF',
                  borderRadius: 18,
                  padding: '22px 24px',
                  border: '1.5px solid #E2E8F0',
                  boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748B' }}>Thiếu Ví Dụ Ngữ Cảnh</span>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: '#FFFBEB', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D97706' }}>
                    <Icon n="bulb" s={20} />
                  </div>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: '#D97706', marginTop: 10 }}>
                  {vocabAudit ? vocabAudit.wordsMissingExample.toLocaleString('vi-VN') : '112'}
                  <span style={{ fontSize: '0.9rem', color: '#64748B', fontWeight: 600, marginLeft: 6 }}>từ</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, fontSize: '0.82rem' }}>
                  <span style={{ color: '#64748B' }}>Cần câu ví dụ song ngữ</span>
                  <button
                    type="button"
                    onClick={() => {
                      setStudioMode('enrich');
                      setMissingType('example');
                      loadMissingWordsData('example', missingLimit);
                    }}
                    style={{
                      background: '#FEF3C7',
                      border: 'none',
                      color: '#B45309',
                      fontWeight: 800,
                      fontSize: '0.78rem',
                      padding: '3px 8px',
                      borderRadius: 6,
                      cursor: 'pointer',
                    }}
                  >
                    Sửa ngay ›
                  </button>
                </div>
              </motion.div>

              {/* Card 4: Missing Meanings & IPA */}
              <motion.div
                variants={staggerItem}
                whileHover={{ y: -3, transition: { duration: 0.2 } }}
                style={{
                  background: '#FFFFFF',
                  borderRadius: 18,
                  padding: '22px 24px',
                  border: '1.5px solid #E2E8F0',
                  boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748B' }}>Thiếu Nghĩa / Phiên Âm</span>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: '#FDF2F8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#DB2777' }}>
                    <Icon n="spark" s={20} />
                  </div>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: '#DB2777', marginTop: 10 }}>
                  {vocabAudit
                    ? (vocabAudit.wordsMissingMeaning + vocabAudit.wordsMissingPronunciation).toLocaleString('vi-VN')
                    : '83'}
                  <span style={{ fontSize: '0.9rem', color: '#64748B', fontWeight: 600, marginLeft: 6 }}>mục</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, fontSize: '0.82rem' }}>
                  <span style={{ color: '#64748B' }}>
                    {vocabAudit?.wordsMissingMeaning ?? 0} nghĩa, {vocabAudit?.wordsMissingPronunciation ?? 0} IPA
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setStudioMode('enrich');
                      setMissingType('meaning');
                      loadMissingWordsData('meaning', missingLimit);
                    }}
                    style={{
                      background: '#FCE7F3',
                      border: 'none',
                      color: '#BE185D',
                      fontWeight: 800,
                      fontSize: '0.78rem',
                      padding: '3px 8px',
                      borderRadius: 6,
                      cursor: 'pointer',
                    }}
                  >
                    Khắc phục ›
                  </button>
                </div>
              </motion.div>
            </motion.div>

            {/* 2. Interactive Studio Workspace Card */}
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: 20,
                padding: '26px 28px',
                border: '1.5px solid #E2E8F0',
                boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
              }}
            >
              {/* Studio Header & Mode Switcher */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 16,
                  paddingBottom: 20,
                  borderBottom: '1px solid #E2E8F0',
                  marginBottom: 22,
                }}
              >
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 900, margin: 0, color: '#0F172A' }}>
                    Khu Vực Sinh Nội Dung Từ Vựng Bằng AI
                  </h3>
                  <p style={{ margin: '4px 0 0', color: '#64748B', fontSize: '0.88rem' }}>
                    Tự động làm giàu các từ còn thiếu câu ví dụ / nghĩa tiếng Việt hoặc tạo bộ từ vựng mới theo chuẩn CEFR.
                  </p>
                </div>

                {/* Mode Toggle Pills */}
                <div style={{ display: 'flex', background: '#F1F5F9', padding: 4, borderRadius: 12, border: '1px solid #E2E8F0' }}>
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.96 }}
                    onClick={() => setStudioMode('enrich')}
                    style={{
                      border: 'none',
                      background: studioMode === 'enrich' ? '#FFFFFF' : 'transparent',
                      color: studioMode === 'enrich' ? '#4F46E5' : '#64748B',
                      fontWeight: studioMode === 'enrich' ? 800 : 600,
                      fontSize: '0.86rem',
                      padding: '8px 16px',
                      borderRadius: 9,
                      cursor: 'pointer',
                      boxShadow: studioMode === 'enrich' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <Icon n="bulb" s={16} />
                    <span>Làm Giàu Từ Còn Thiếu (Enrich)</span>
                  </motion.button>
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.96 }}
                    onClick={() => setStudioMode('create')}
                    style={{
                      border: 'none',
                      background: studioMode === 'create' ? '#FFFFFF' : 'transparent',
                      color: studioMode === 'create' ? '#4F46E5' : '#64748B',
                      fontWeight: studioMode === 'create' ? 800 : 600,
                      fontSize: '0.86rem',
                      padding: '8px 16px',
                      borderRadius: 9,
                      cursor: 'pointer',
                      boxShadow: studioMode === 'create' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <Icon n="spark" s={16} />
                    <span>Tạo Từ Vựng Mới Hàng Loạt (Bulk)</span>
                  </motion.button>
                </div>
              </div>

              {/* Mode A: Enrich Missing Words */}
              {studioMode === 'enrich' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  {/* Filter and Option Bar */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#475569' }}>Lọc danh mục thiếu:</span>
                      {[
                        { id: 'example', label: 'Thiếu câu ví dụ' },
                        { id: 'meaning', label: 'Thiếu nghĩa tiếng Việt' },
                        { id: 'pronunciation', label: 'Thiếu phiên âm IPA' },
                        { id: 'definition', label: 'Thiếu định nghĩa Anh-Anh' },
                      ].map((cat) => (
                        <motion.button
                          key={cat.id}
                          type="button"
                          whileHover={{ y: -1 }}
                          whileTap={{ scale: 0.96 }}
                          onClick={() => {
                            const nextCat = cat.id as any;
                            setMissingType(nextCat);
                            loadMissingWordsData(nextCat, missingLimit);
                          }}
                          style={{
                            background: missingType === cat.id ? '#EEF2FF' : '#F8FAFC',
                            border: `1.5px solid ${missingType === cat.id ? '#6366F1' : '#E2E8F0'}`,
                            color: missingType === cat.id ? '#4338CA' : '#475569',
                            padding: '6px 12px',
                            borderRadius: 10,
                            fontSize: '0.82rem',
                            fontWeight: missingType === cat.id ? 800 : 600,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {cat.label}
                        </motion.button>
                      ))}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: '0.82rem', color: '#64748B' }}>Số lượng:</span>
                      <select
                        value={missingLimit}
                        onChange={(e) => {
                          const lim = Number(e.target.value);
                          setMissingLimit(lim);
                          loadMissingWordsData(missingType, lim);
                        }}
                        style={{
                          padding: '6px 10px',
                          borderRadius: 8,
                          border: '1px solid #CBD5E1',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          background: '#FFFFFF',
                          cursor: 'pointer',
                        }}
                      >
                        <option value={5}>5 từ</option>
                        <option value={10}>10 từ</option>
                        <option value={15}>15 từ</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => loadMissingWordsData(missingType, missingLimit)}
                        disabled={loadingMissing}
                        style={{
                          background: '#FFFFFF',
                          border: '1px solid #CBD5E1',
                          padding: '6px 12px',
                          borderRadius: 8,
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          color: '#475569',
                          cursor: 'pointer',
                        }}
                      >
                        {loadingMissing ? 'Đang tải...' : 'Làm mới'}
                      </button>
                    </div>
                  </div>

                  {/* Missing Words Table List */}
                  <div style={{ border: '1.5px solid #E2E8F0', borderRadius: 14, overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                      <thead>
                        <tr style={{ background: '#F8FAFC', borderBottom: '1.5px solid #E2E8F0' }}>
                          <th style={{ padding: '12px 16px', width: 44 }}>
                            <input
                              type="checkbox"
                              checked={missingWords.length > 0 && selectedMissingIds.length === missingWords.length}
                              onChange={(e) => handleSelectAllMissing(e.target.checked)}
                              style={{ cursor: 'pointer', width: 16, height: 16 }}
                            />
                          </th>
                          <th style={{ padding: '12px 16px', fontWeight: 800, color: '#475569' }}>Từ Vựng</th>
                          <th style={{ padding: '12px 16px', fontWeight: 800, color: '#475569' }}>Cấp Độ</th>
                          <th style={{ padding: '12px 16px', fontWeight: 800, color: '#475569' }}>Nghĩa Tiếng Việt Hiện Tại</th>
                          <th style={{ padding: '12px 16px', fontWeight: 800, color: '#475569' }}>Dữ Liệu Còn Thiếu</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loadingMissing ? (
                          <tr>
                            <td colSpan={5} style={{ textAlign: 'center', padding: '36px', color: '#64748B' }}>
                              Đang quét cơ sở dữ liệu các từ thiếu thông tin...
                            </td>
                          </tr>
                        ) : missingWords.length === 0 ? (
                          <tr>
                            <td colSpan={5} style={{ textAlign: 'center', padding: '36px', color: '#10B981', fontWeight: 700 }}>
                              🎉 Tuyệt vời! Không có từ nào bị thiếu trường này trong giới hạn truy vấn.
                            </td>
                          </tr>
                        ) : (
                          missingWords.map((w) => {
                            const isChecked = selectedMissingIds.includes(w.id);
                            return (
                              <tr
                                key={w.id}
                                style={{
                                  borderBottom: '1px solid #F1F5F9',
                                  background: isChecked ? '#F8FAFC' : '#FFFFFF',
                                  transition: 'background 0.15s ease',
                                }}
                              >
                                <td style={{ padding: '12px 16px' }}>
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => handleToggleMissingId(w.id)}
                                    style={{ cursor: 'pointer', width: 16, height: 16 }}
                                  />
                                </td>
                                <td style={{ padding: '12px 16px', fontWeight: 800, color: '#0F172A' }}>
                                  <span>{w.word}</span>
                                  {w.pronunciation && (
                                    <span style={{ marginLeft: 8, fontSize: '0.8rem', color: '#64748B', fontWeight: 500 }}>
                                      {w.pronunciation}
                                    </span>
                                  )}
                                </td>
                                <td style={{ padding: '12px 16px' }}>
                                  <span
                                    style={{
                                      fontSize: '0.74rem',
                                      fontWeight: 900,
                                      background: '#EEF2FF',
                                      color: '#4F46E5',
                                      padding: '3px 8px',
                                      borderRadius: 6,
                                    }}
                                  >
                                    {w.level || 'B2'}
                                  </span>
                                </td>
                                <td style={{ padding: '12px 16px', color: w.meaning ? '#334155' : '#94A3B8' }}>
                                  {w.meaning || '— Chưa có —'}
                                </td>
                                <td style={{ padding: '12px 16px' }}>
                                  <span
                                    style={{
                                      fontSize: '0.74rem',
                                      fontWeight: 800,
                                      background: '#FEF3C7',
                                      color: '#92400E',
                                      padding: '3px 8px',
                                      borderRadius: 6,
                                    }}
                                  >
                                    Thiếu {missingType === 'example' ? 'câu ví dụ' : missingType === 'meaning' ? 'nghĩa VN' : missingType === 'pronunciation' ? 'phiên âm IPA' : 'định nghĩa Anh-Anh'}
                                  </span>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Batch Enrich Action CTA */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                    <span style={{ fontSize: '0.85rem', color: '#64748B' }}>
                      Đã chọn <b>{selectedMissingIds.length}</b> / {missingWords.length} từ
                    </span>

                    <motion.button
                      type="button"
                      onClick={handleBatchGenerateFromMissing}
                      disabled={selectedMissingIds.length === 0 || generatingVocab}
                      whileHover={selectedMissingIds.length === 0 || generatingVocab ? {} : { scale: 1.02 }}
                      whileTap={selectedMissingIds.length === 0 || generatingVocab ? {} : { scale: 0.98 }}
                      style={{
                        padding: '11px 22px',
                        borderRadius: 12,
                        background: selectedMissingIds.length === 0 ? '#94A3B8' : 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
                        color: '#FFFFFF',
                        border: 'none',
                        fontWeight: 800,
                        fontSize: '0.92rem',
                        cursor: selectedMissingIds.length === 0 || generatingVocab ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        boxShadow: selectedMissingIds.length === 0 ? 'none' : '0 4px 14px rgba(79, 70, 229, 0.3)',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <Icon n="spark" s={18} />
                      <span>
                        {generatingVocab
                          ? 'AI đang sinh nội dung...'
                          : `Sinh dữ liệu AI cho (${selectedMissingIds.length}) từ đã chọn`}
                      </span>
                    </motion.button>
                  </div>
                </div>
              )}

              {/* Mode B: Bulk Generate New Words */}
              {studioMode === 'create' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <label style={{ fontSize: '0.88rem', fontWeight: 800, color: '#334155' }}>
                        Nhập danh sách từ tiếng Anh (phân cách bằng dấu phẩy hoặc xuống dòng):
                      </label>
                      <span style={{ fontSize: '0.8rem', color: '#64748B' }}>Tối đa 10 từ / lượt</span>
                    </div>
                    <textarea
                      rows={3}
                      value={customWordsInput}
                      onChange={(e) => setCustomWordsInput(e.target.value)}
                      placeholder="Ví dụ: serendipity, quintessential, resilient, pragmatic, ephemeral, ubiquitous..."
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        borderRadius: 12,
                        border: '1.5px solid #CBD5E1',
                        fontSize: '0.94rem',
                        fontFamily: 'inherit',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  {/* Quick Preset Chips */}
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748B', marginBottom: 8 }}>
                      Bộ từ mẫu gợi ý (click để điền nhanh):
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {[
                        { label: '🌟 Từ vựng IELTS 7.5+', words: 'ubiquitous, serendipity, pragmatic, ephemeral' },
                        { label: '💼 Business & Workplace', words: 'negotiate, leverage, stakeholder, benchmark' },
                        { label: '🤖 AI & Công nghệ', words: 'algorithm, automation, synthesis, heuristic' },
                        { label: '💬 Đời sống & Tính cách', words: 'resilient, articulate, meticulous, versatile' },
                      ].map((p) => (
                        <motion.button
                          key={p.label}
                          type="button"
                          whileHover={{ scale: 1.04, y: -1 }}
                          whileTap={{ scale: 0.96 }}
                          onClick={() => setCustomWordsInput(p.words)}
                          style={{
                            background: '#F1F5F9',
                            border: '1px solid #CBD5E1',
                            padding: '5px 12px',
                            borderRadius: 20,
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            color: '#334155',
                            cursor: 'pointer',
                          }}
                        >
                          {p.label}
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* CEFR Level Selection & CTA */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#334155' }}>Gợi ý Cấp độ CEFR:</span>
                      {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map((lvl) => (
                        <motion.button
                          key={lvl}
                          type="button"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setCustomLevelHint(lvl)}
                          style={{
                            border: `1.5px solid ${customLevelHint === lvl ? '#4F46E5' : '#CBD5E1'}`,
                            background: customLevelHint === lvl ? '#4F46E5' : '#FFFFFF',
                            color: customLevelHint === lvl ? '#FFFFFF' : '#334155',
                            fontWeight: 800,
                            fontSize: '0.82rem',
                            padding: '5px 12px',
                            borderRadius: 8,
                            cursor: 'pointer',
                          }}
                        >
                          {lvl}
                        </motion.button>
                      ))}
                    </div>

                    <motion.button
                      type="button"
                      onClick={handleBatchGenerateCustom}
                      disabled={!customWordsInput.trim() || generatingVocab}
                      whileHover={!customWordsInput.trim() || generatingVocab ? {} : { scale: 1.02 }}
                      whileTap={!customWordsInput.trim() || generatingVocab ? {} : { scale: 0.98 }}
                      style={{
                        padding: '11px 24px',
                        borderRadius: 12,
                        background: !customWordsInput.trim() ? '#94A3B8' : 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
                        color: '#FFFFFF',
                        border: 'none',
                        fontWeight: 800,
                        fontSize: '0.92rem',
                        cursor: !customWordsInput.trim() || generatingVocab ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        boxShadow: !customWordsInput.trim() ? 'none' : '0 4px 14px rgba(79, 70, 229, 0.3)',
                      }}
                    >
                      <Icon n="spark" s={18} />
                      <span>{generatingVocab ? 'Gemini đang phân tích và sinh từ điển...' : 'Sinh Từ Điển Song Ngữ Bằng Gemini'}</span>
                    </motion.button>
                  </div>
                </div>
              )}
            </div>

            {/* 3. Diff Preview & Inline Editing Table (Review & Approval Flow) */}
            <AnimatePresence>
              {generatedWords.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 14, scale: 0.98 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  style={{
                    background: '#FFFFFF',
                    borderRadius: 20,
                    padding: '26px 28px',
                    border: '1.5px solid #6366F1',
                    boxShadow: '0 8px 30px rgba(99, 102, 241, 0.12)',
                  }}
                >
                  {/* Header Preview Bar */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 900, margin: 0, color: '#0F172A' }}>
                          Bảng Xem Trước & Phê Duyệt ({generatedWords.length} từ vựng)
                        </h3>
                        <span style={{ fontSize: '0.72rem', background: '#ECFDF5', color: '#059669', padding: '3px 8px', borderRadius: 99, fontWeight: 800, border: '1px solid #A7F3D0' }}>
                          ⚡ AI Generated
                        </span>
                      </div>
                      <p style={{ margin: '4px 0 0', color: '#64748B', fontSize: '0.88rem' }}>
                        Kiểm tra và chỉnh sửa trực tiếp phiên âm, từ loại, nghĩa tiếng Việt hoặc câu ví dụ trước khi lưu chính thức vào cơ sở dữ liệu.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setGeneratedWords([])}
                      style={{
                        background: '#F1F5F9',
                        border: '1px solid #CBD5E1',
                        padding: '6px 14px',
                        borderRadius: 8,
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        color: '#64748B',
                        cursor: 'pointer',
                      }}
                    >
                      Xóa danh sách nháp
                    </button>
                  </div>

                  {/* Editable Preview Table */}
                  <div style={{ border: '1.5px solid #E2E8F0', borderRadius: 14, overflowX: 'auto', marginBottom: 20 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 980 }}>
                      <thead>
                        <tr style={{ background: '#F8FAFC', borderBottom: '1.5px solid #CBD5E1', fontSize: '0.84rem' }}>
                          <th style={{ padding: '12px 14px', width: 110, fontWeight: 800, color: '#475569' }}>Loại & Từ Vựng</th>
                          <th style={{ padding: '12px 14px', width: 140, fontWeight: 800, color: '#475569' }}>Phiên Âm & Từ Loại</th>
                          <th style={{ padding: '12px 14px', width: 220, fontWeight: 800, color: '#475569' }}>Nghĩa Tiếng Việt & Định Nghĩa</th>
                          <th style={{ padding: '12px 14px', fontWeight: 800, color: '#475569' }}>Câu Ví Dụ & Bản Dịch</th>
                          <th style={{ padding: '12px 14px', width: 90, fontWeight: 800, color: '#475569' }}>Cấp Độ</th>
                          <th style={{ padding: '12px 14px', width: 50, textAlign: 'center', fontWeight: 800, color: '#475569' }}>Xóa</th>
                        </tr>
                      </thead>
                      <tbody>
                        {generatedWords.map((item, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9', verticalAlign: 'top', background: idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA' }}>
                            {/* Word & Status */}
                            <td style={{ padding: '12px 14px' }}>
                              <span
                                style={{
                                  fontSize: '0.68rem',
                                  fontWeight: 900,
                                  background: item.existingWordId ? '#FAF5FF' : '#ECFDF5',
                                  color: item.existingWordId ? '#9333EA' : '#059669',
                                  border: `1px solid ${item.existingWordId ? '#E9D5FF' : '#A7F3D0'}`,
                                  padding: '2px 6px',
                                  borderRadius: 4,
                                  display: 'inline-block',
                                  marginBottom: 4,
                                }}
                              >
                                {item.existingWordId ? `CẬP NHẬT #${item.existingWordId}` : 'TỪ MỚI'}
                              </span>
                              <div style={{ fontWeight: 900, fontSize: '1rem', color: '#0F172A' }}>{item.word}</div>
                            </td>

                            {/* Pronunciation & POS */}
                            <td style={{ padding: '12px 14px' }}>
                              <input
                                type="text"
                                value={item.pronunciation || ''}
                                onChange={(e) => handleUpdateGeneratedWord(idx, 'pronunciation', e.target.value)}
                                placeholder="IPA (ví dụ /rɪˈzɪl.jənt/)"
                                style={{
                                  width: '100%',
                                  padding: '6px 8px',
                                  borderRadius: 6,
                                  border: '1px solid #CBD5E1',
                                  fontSize: '0.82rem',
                                  fontFamily: 'monospace',
                                  marginBottom: 6,
                                  boxSizing: 'border-box',
                                }}
                              />
                              <select
                                value={item.partOfSpeech || 'NOUN'}
                                onChange={(e) => handleUpdateGeneratedWord(idx, 'partOfSpeech', e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '5px 8px',
                                  borderRadius: 6,
                                  border: '1px solid #CBD5E1',
                                  fontSize: '0.8rem',
                                  fontWeight: 700,
                                  background: '#FFFFFF',
                                  cursor: 'pointer',
                                  boxSizing: 'border-box',
                                }}
                              >
                                <option value="NOUN">NOUN (Danh từ)</option>
                                <option value="VERB">VERB (Động từ)</option>
                                <option value="ADJECTIVE">ADJECTIVE (Tính từ)</option>
                                <option value="ADVERB">ADVERB (Phó từ)</option>
                                <option value="IDIOM">IDIOM (Thành ngữ)</option>
                                <option value="PHRASAL_VERB">PHRASAL_VERB (Cụm ĐT)</option>
                              </select>
                            </td>

                            {/* Vietnamese Meaning & Definition */}
                            <td style={{ padding: '12px 14px' }}>
                              <input
                                type="text"
                                value={item.meaning || ''}
                                onChange={(e) => handleUpdateGeneratedWord(idx, 'meaning', e.target.value)}
                                placeholder="Nghĩa tiếng Việt chuẩn..."
                                style={{
                                  width: '100%',
                                  padding: '6px 8px',
                                  borderRadius: 6,
                                  border: '1px solid #CBD5E1',
                                  fontSize: '0.85rem',
                                  fontWeight: 700,
                                  color: '#1E293B',
                                  marginBottom: 6,
                                  boxSizing: 'border-box',
                                }}
                              />
                              <textarea
                                rows={2}
                                value={item.definition || ''}
                                onChange={(e) => handleUpdateGeneratedWord(idx, 'definition', e.target.value)}
                                placeholder="English dictionary definition..."
                                style={{
                                  width: '100%',
                                  padding: '6px 8px',
                                  borderRadius: 6,
                                  border: '1px solid #E2E8F0',
                                  fontSize: '0.8rem',
                                  color: '#64748B',
                                  boxSizing: 'border-box',
                                  fontFamily: 'inherit',
                                }}
                              />
                            </td>

                            {/* Example & Translation */}
                            <td style={{ padding: '12px 14px' }}>
                              <textarea
                                rows={2}
                                value={item.example || ''}
                                onChange={(e) => handleUpdateGeneratedWord(idx, 'example', e.target.value)}
                                placeholder="English sentence example illustrating natural context..."
                                style={{
                                  width: '100%',
                                  padding: '6px 8px',
                                  borderRadius: 6,
                                  border: '1px solid #CBD5E1',
                                  fontSize: '0.84rem',
                                  fontFamily: 'inherit',
                                  marginBottom: 6,
                                  boxSizing: 'border-box',
                                }}
                              />
                              <input
                                type="text"
                                value={item.exampleTranslation || ''}
                                onChange={(e) => handleUpdateGeneratedWord(idx, 'exampleTranslation', e.target.value)}
                                placeholder="Bản dịch tiếng Việt của câu ví dụ..."
                                style={{
                                  width: '100%',
                                  padding: '6px 8px',
                                  borderRadius: 6,
                                  border: '1px solid #E2E8F0',
                                  fontSize: '0.82rem',
                                  color: '#475569',
                                  fontStyle: 'italic',
                                  boxSizing: 'border-box',
                                }}
                              />
                            </td>

                            {/* Level */}
                            <td style={{ padding: '12px 14px' }}>
                              <select
                                value={item.level || 'B2'}
                                onChange={(e) => handleUpdateGeneratedWord(idx, 'level', e.target.value)}
                                style={{
                                  padding: '5px 8px',
                                  borderRadius: 6,
                                  border: '1px solid #CBD5E1',
                                  fontSize: '0.8rem',
                                  fontWeight: 800,
                                  color: '#4F46E5',
                                  background: '#EEF2FF',
                                  cursor: 'pointer',
                                }}
                              >
                                <option value="A1">A1</option>
                                <option value="A2">A2</option>
                                <option value="B1">B1</option>
                                <option value="B2">B2</option>
                                <option value="C1">C1</option>
                                <option value="C2">C2</option>
                              </select>
                            </td>

                            {/* Delete Action */}
                            <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                              <button
                                type="button"
                                onClick={() => handleRemoveGeneratedWord(idx)}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: '#EF4444',
                                  cursor: 'pointer',
                                  padding: 6,
                                  borderRadius: 6,
                                  display: 'inline-flex',
                                }}
                                title="Xóa từ này khỏi danh sách duyệt"
                              >
                                <Icon n="trash" s={18} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Bottom Approval Action Bar */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 16,
                      paddingTop: 12,
                      borderTop: '1px solid #E2E8F0',
                    }}
                  >
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.88rem', fontWeight: 700, color: '#334155', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={overwriteExisting}
                        onChange={(e) => setOverwriteExisting(e.target.checked)}
                        style={{ width: 17, height: 17, cursor: 'pointer' }}
                      />
                      <span>Cho phép ghi đè nội dung nếu từ đã có trong Database (Khuyến nghị bật để enrich dữ liệu cũ)</span>
                    </label>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <motion.button
                        type="button"
                        whileHover={{ y: -1 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setGeneratedWords([])}
                        style={{
                          background: '#FFFFFF',
                          border: '1.5px solid #CBD5E1',
                          padding: '11px 20px',
                          borderRadius: 12,
                          fontWeight: 700,
                          fontSize: '0.92rem',
                          color: '#64748B',
                          cursor: 'pointer',
                        }}
                      >
                        Hủy bỏ
                      </motion.button>

                      <motion.button
                        type="button"
                        onClick={handleApproveAndSave}
                        disabled={approving}
                        whileHover={approving ? {} : { scale: 1.02 }}
                        whileTap={approving ? {} : { scale: 0.98 }}
                        style={{
                          padding: '11px 26px',
                          borderRadius: 12,
                          background: approving ? '#94A3B8' : 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                          color: '#FFFFFF',
                          border: 'none',
                          fontWeight: 800,
                          fontSize: '0.94rem',
                          cursor: approving ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          boxShadow: approving ? 'none' : '0 4px 14px rgba(16, 185, 129, 0.35)',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <Icon n="check" s={18} />
                        <span>{approving ? 'Đang lưu vào Database...' : `Phê duyệt & Lưu vào Database (${generatedWords.length} từ)`}</span>
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
