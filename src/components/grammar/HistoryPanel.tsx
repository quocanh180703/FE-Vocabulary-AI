import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { aiApi, type GrammarHistoryItem, type GrammarHistoryDetail, type GrammarResp } from '../../api';
import { MotionCard, AnimatedCounter, staggerContainer, staggerItem } from '../../motion';
import ResultPanel, { type OutlineReport, type TranslationVerdict } from './ResultPanel';

interface HistoryPanelProps {
  onReplay?: (data: {
    mode: 'FREE' | 'TOPIC' | 'TRANSLATION';
    text?: string;
    context?: any;
  }) => void;
  onGoToTopics?: () => void;
}

type FilterMode = 'ALL' | 'TOPIC' | 'TRANSLATION' | 'FREE';

function formatTimeAgo(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} giờ trước`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Hôm qua';
    if (diffDays < 30) return `${diffDays} ngày trước`;
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

export default function HistoryPanel({ onReplay, onGoToTopics }: HistoryPanelProps) {
  const [filter, setFilter] = useState<FilterMode>('ALL');
  const [page, setPage] = useState(0);
  const [pageSize] = useState(10);
  const [items, setItems] = useState<GrammarHistoryItem[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(false);

  // Detail modal state
  const [selectedItem, setSelectedItem] = useState<GrammarHistoryDetail | null>(null);

  const loadHistory = async (f: FilterMode, p: number) => {
    setLoading(true);
    try {
      const modeParam = f === 'ALL' ? undefined : f;
      const res = await aiApi.getGrammarHistory({ mode: modeParam, page: p, size: pageSize });
      if (res && res.data) {
        setItems(res.data.content || []);
        setTotalPages(res.data.totalPages || 0);
        setTotalElements(res.data.totalElements || 0);
      }
    } catch (e) {
      console.error('Failed to load grammar history', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory(filter, page);
  }, [filter, page]);

  const handleFilterChange = (newFilter: FilterMode) => {
    setFilter(newFilter);
    setPage(0);
  };

  const handleViewDetail = async (id: number) => {
    try {
      const res = await aiApi.getGrammarHistoryDetail(id);
      if (res && res.data) {
        setSelectedItem(res.data);
      }
    } catch (e) {
      console.error('Failed to get history detail', e);
    }
  };

  const handleReplayClick = (detailOrItem: { mode: string; inputText?: string; contextJson?: string; label?: string }) => {
    if (!onReplay) return;
    let context: any = null;
    try {
      if (detailOrItem.contextJson) {
        context = JSON.parse(detailOrItem.contextJson);
      }
    } catch {}

    onReplay({
      mode: detailOrItem.mode as any,
      text: detailOrItem.inputText,
      context,
    });
  };

  // Parse resultJson for detail view
  let parsedResult: GrammarResp | null = null;
  let parsedContext: any = null;
  let detailOutlineReport: OutlineReport | undefined = undefined;
  let detailVerdict: TranslationVerdict | undefined = undefined;

  if (selectedItem?.resultJson) {
    try {
      parsedResult = JSON.parse(selectedItem.resultJson);
      if (selectedItem.contextJson) {
        parsedContext = JSON.parse(selectedItem.contextJson);
      }

      if (selectedItem.mode === 'TOPIC') {
        detailOutlineReport = (parsedResult as any)?.outlineReport;
      } else if (selectedItem.mode === 'TRANSLATION') {
        detailVerdict = {
          meaningMatch: (parsedResult as any)?.meaningMatch,
          overall: (parsedResult as any)?.overall,
          isTargetWordUsed: (parsedResult as any)?.isTargetWordUsed,
          targetWord: (parsedResult as any)?.targetWord || selectedItem.label,
          feedback: (parsedResult as any)?.feedback,
        };
        detailOutlineReport = {
          targetWordCount: 1,
          usedWordCount: (parsedResult as any)?.isTargetWordUsed ? 1 : 0,
          usedWords: (parsedResult as any)?.isTargetWordUsed && selectedItem.label ? [selectedItem.label] : [],
          unusedWords: !(parsedResult as any)?.isTargetWordUsed && selectedItem.label ? [selectedItem.label] : [],
          outlineFeedback: (parsedResult as any)?.feedback,
        };
      }
    } catch (e) {
      console.error('Error parsing detail JSON', e);
    }
  }

  const getModeBadge = (mode: string) => {
    switch (mode) {
      case 'TOPIC':
        return <span className="pill level" style={{ background: '#EFF6FF', color: '#1D4ED8', borderColor: '#BFDBFE', fontWeight: 800 }}>Chủ đề</span>;
      case 'TRANSLATION':
        return <span className="pill level" style={{ background: '#F5F3FF', color: '#6D28D9', borderColor: '#DDD6FE', fontWeight: 800 }}>Luyện dịch</span>;
      default:
        return <span className="pill level" style={{ background: '#ECFDF5', color: '#047857', borderColor: '#A7F3D0', fontWeight: 800 }}>Viết tự do</span>;
    }
  };

  return (
    <div className="colstack" style={{ gap: 18 }}>
      {/* 1. Header Filter Card */}
      <MotionCard className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ fontSize: 18 }}>
              <span className="dot g" />
              Lịch sử bài luyện viết &amp; sửa ngữ pháp
            </h2>
            <div className="sub mt4">Xem lại các bài viết đã được chấm, phân tích lỗi và làm lại bất cứ lúc nào (tốn 0 quota)</div>
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)' }}>
            Tổng cộng: <b style={{ color: 'var(--ink)' }}>{totalElements}</b> bài luyện
          </div>
        </div>

        {/* Filter Chips */}
        <div className="chips mt16" style={{ gap: 8 }}>
          <button
            type="button"
            className={'chip' + (filter === 'ALL' ? ' on' : '')}
            onClick={() => handleFilterChange('ALL')}
            style={{ fontWeight: 700, padding: '7px 16px', fontSize: 13 }}
          >
            Tất cả ({filter === 'ALL' ? totalElements : '...'})
          </button>
          <button
            type="button"
            className={'chip' + (filter === 'TOPIC' ? ' on' : '')}
            onClick={() => handleFilterChange('TOPIC')}
            style={{ fontWeight: 700, padding: '7px 16px', fontSize: 13 }}
          >
            ✍️ Viết theo chủ đề
          </button>
          <button
            type="button"
            className={'chip' + (filter === 'TRANSLATION' ? ' on' : '')}
            onClick={() => handleFilterChange('TRANSLATION')}
            style={{ fontWeight: 700, padding: '7px 16px', fontSize: 13 }}
          >
            ❤️ Luyện câu theo từ
          </button>
          <button
            type="button"
            className={'chip' + (filter === 'FREE' ? ' on' : '')}
            onClick={() => handleFilterChange('FREE')}
            style={{ fontWeight: 700, padding: '7px 16px', fontSize: 13 }}
          >
            ✨ Viết tự do
          </button>
        </div>
      </MotionCard>

      {/* 2. Detail Modal Overlay if item is selected */}
      <AnimatePresence>
        {selectedItem && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(15, 23, 42, 0.55)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20,
              backdropFilter: 'blur(3px)',
            }}
            onClick={() => setSelectedItem(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: '#fff',
                borderRadius: 18,
                maxWidth: 900,
                width: '100%',
                maxHeight: '90vh',
                overflowY: 'auto',
                boxShadow: '0 20px 45px rgba(0, 0, 0, 0.25)',
                padding: '24px 28px',
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
              }}
            >
              {/* Modal Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--line)', paddingBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {getModeBadge(selectedItem.mode)}
                  <h3 style={{ fontSize: 18, margin: 0, fontWeight: 800 }}>
                    {selectedItem.mode === 'TOPIC' && `Chủ đề: ${selectedItem.label || 'Không tên'}`}
                    {selectedItem.mode === 'TRANSLATION' && `Từ mục tiêu: ${selectedItem.label || 'Luyện dịch'}`}
                    {selectedItem.mode === 'FREE' && 'Bài viết tự do'}
                  </h3>
                  <span className="sub" style={{ fontSize: 12 }}>
                    · {formatTimeAgo(selectedItem.createdAt)}
                  </span>
                </div>
                <button
                  type="button"
                  className="btn ghost sm"
                  onClick={() => setSelectedItem(null)}
                  style={{ borderRadius: 8, padding: '4px 10px' }}
                >
                  ✕ Đóng
                </button>
              </div>

              {/* Context if available */}
              {selectedItem.mode === 'TRANSLATION' && parsedContext?.viPrompt && (
                <div style={{ padding: '12px 16px', background: '#F8FAFC', borderRadius: 10, border: '1px solid var(--line)' }}>
                  <span className="sub" style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>
                    Đề bài tiếng Việt gốc:
                  </span>
                  <div style={{ fontWeight: 700, color: 'var(--ink)', marginTop: 4, fontSize: 14.5 }}>
                    {parsedContext.viPrompt}
                  </div>
                </div>
              )}

              {selectedItem.mode === 'TOPIC' && parsedContext?.suggestedWords && (
                <div style={{ padding: '12px 16px', background: '#F8FAFC', borderRadius: 10, border: '1px solid var(--line)' }}>
                  <span className="sub" style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>
                    Bộ từ gợi ý của đề:
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                    {parsedContext.suggestedWords.map((sw: string, idx: number) => (
                      <span key={idx} className="pill" style={{ background: '#E2E8F0', color: '#334155', fontWeight: 700 }}>
                        {sw}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Render Result via ResultPanel */}
              {parsedResult ? (
                <ResultPanel
                  res={parsedResult}
                  outlineReport={detailOutlineReport}
                  translationVerdict={detailVerdict}
                  extraActions={
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
                      <button
                        type="button"
                        className="btn primary"
                        onClick={() => {
                          setSelectedItem(null);
                          handleReplayClick(selectedItem);
                        }}
                        style={{ fontWeight: 800 }}
                      >
                        🔄 Làm lại bài này
                      </button>
                    </div>
                  }
                />
              ) : (
                <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--muted)' }}>
                  Không tìm thấy chi tiết kết quả đánh giá.
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. List of History Items */}
      {loading ? (
        <MotionCard className="card" style={{ padding: 40, textAlign: 'center' }}>
          <div className="sub" style={{ fontSize: 15, fontWeight: 600 }}>Đang tải lịch sử bài viết...</div>
        </MotionCard>
      ) : items.length === 0 ? (
        <MotionCard className="card" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>📝</div>
          <b style={{ fontSize: 17, color: 'var(--ink)' }}>Bạn chưa có bài luyện viết nào trong mục này</b>
          <div className="sub mt8" style={{ maxWidth: 420, margin: '8px auto 0' }}>
            Hãy bắt đầu viết bài đầu tiên theo chủ đề hoặc luyện dịch câu từ kho từ yêu thích của bạn nhé!
          </div>
          {onGoToTopics && (
            <button
              type="button"
              className="btn primary mt16"
              onClick={onGoToTopics}
              style={{ fontWeight: 800, padding: '10px 24px' }}
            >
              ✍️ Bắt đầu viết theo chủ đề
            </button>
          )}
        </MotionCard>
      ) : (
        <motion.div
          className="colstack"
          style={{ gap: 10 }}
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {items.map((item) => (
            <motion.div
              key={item.id}
              variants={staggerItem}
              className="card"
              style={{
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                cursor: 'pointer',
                transition: 'all 0.18s ease',
              }}
              onClick={() => handleViewDetail(item.id)}
            >
              {/* Left Badge */}
              <div style={{ flexShrink: 0 }}>
                {getModeBadge(item.mode)}
              </div>

              {/* Middle: Content Preview & Label */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {item.label && (
                    <b style={{ fontSize: 15, color: 'var(--ink)' }}>
                      {item.label}
                    </b>
                  )}
                  <span className="sub" style={{ fontSize: 12 }}>
                    · {formatTimeAgo(item.createdAt)}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 13.5,
                    color: 'var(--muted)',
                    marginTop: 4,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontWeight: 500,
                  }}
                >
                  "{item.preview}"
                </div>
              </div>

              {/* Right: Score & Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                <span className="pill level" style={{ fontWeight: 800, fontSize: 13 }}>
                  <AnimatedCounter value={item.score} />/100
                </span>

                <button
                  type="button"
                  className="btn ghost sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleViewDetail(item.id);
                  }}
                  style={{ fontWeight: 700, borderRadius: 8, padding: '5px 12px' }}
                >
                  Xem lại
                </button>

                <button
                  type="button"
                  className="btn sm"
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (!onReplay) return;
                    try {
                      const res = await aiApi.getGrammarHistoryDetail(item.id);
                      if (res?.data) {
                        handleReplayClick(res.data);
                      }
                    } catch {}
                  }}
                  title="Tải lại đề này để làm lại"
                  style={{ fontWeight: 800, borderRadius: 8, padding: '5px 12px' }}
                >
                  Làm lại
                </button>
              </div>
            </motion.div>
          ))}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 12 }}>
              <button
                type="button"
                className="btn ghost sm"
                disabled={page <= 0 || loading}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                style={{ fontWeight: 700 }}
              >
                ◀ Trang trước
              </button>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)' }}>
                Trang {page + 1} / {totalPages}
              </span>
              <button
                type="button"
                className="btn ghost sm"
                disabled={page >= totalPages - 1 || loading}
                onClick={() => setPage((p) => p + 1)}
                style={{ fontWeight: 700 }}
              >
                Trang sau ▶
              </button>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

