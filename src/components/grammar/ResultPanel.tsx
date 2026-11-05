import { useState } from 'react';
import { motion } from 'motion/react';
import type { GrammarResp, GrammarErr } from '../../api';
import { MotionCard, AnimatedCounter, staggerContainer, staggerItem } from '../../motion';
import viAvatar from '../../assets/vi-3d.webp';

export interface OutlineReport {
  targetWordCount?: number;
  usedWordCount?: number;
  usedWords?: string[];
  unusedWords?: string[];
  usedStructures?: string[];
  unusedStructures?: string[];
  outlineFeedback?: string;
}

export interface TranslationVerdict {
  meaningMatch?: 'MATCH' | 'PARTIAL' | 'MISMATCH';
  overall?: 'PASS' | 'FAIL';
  isTargetWordUsed?: boolean;
  targetWord?: string;
  feedback?: string;
}

interface ResultPanelProps {
  res: GrammarResp;
  outlineReport?: OutlineReport;
  translationVerdict?: TranslationVerdict;
  extraActions?: React.ReactNode;
}

function renderHighlightedSentence(text: string, errors: GrammarErr[], activeIdx: number | null) {
  if (!text) return null;
  if (!errors || errors.length === 0) return text;

  // Filter errors with valid character offsets
  const validErrors = errors
    .map((e, originalIndex) => ({ ...e, originalIndex }))
    .filter(
      (e) =>
        typeof e.startOffset === 'number' &&
        typeof e.endOffset === 'number' &&
        e.startOffset >= 0 &&
        e.endOffset <= text.length &&
        e.startOffset < e.endOffset
    )
    .sort((a, b) => a.startOffset! - b.startOffset!);

  if (validErrors.length === 0) return text;

  const nodes: React.ReactNode[] = [];
  let cursor = 0;

  validErrors.forEach((err, idx) => {
    const start = Math.max(cursor, err.startOffset!);
    const end = Math.max(start, err.endOffset!);

    if (start > cursor) {
      nodes.push(text.substring(cursor, start));
    }

    if (end > start) {
      const isSelected = activeIdx === err.originalIndex;
      nodes.push(
        <mark
          key={`err-${idx}`}
          title={`${err.message || 'Lỗi ngữ pháp'}${err.suggestion ? ` 👉 Gợi ý: ${err.suggestion}` : ''}`}
          style={{
            background: isSelected ? '#FCA5A5' : '#FEE2E2',
            color: '#991B1B',
            fontWeight: 700,
            padding: '2px 5px',
            borderRadius: 4,
            borderBottom: isSelected ? '2.5px solid #DC2626' : '2px solid #EF4444',
            cursor: 'pointer',
            transition: 'background 0.2s',
          }}
        >
          {text.substring(start, end)}
        </mark>
      );
      cursor = end;
    }
  });

  if (cursor < text.length) {
    nodes.push(text.substring(cursor));
  }

  return nodes;
}

export default function ResultPanel({ res, outlineReport, translationVerdict, extraActions }: ResultPanelProps) {
  const [copied, setCopied] = useState(false);
  const [activeErrorIdx, setActiveErrorIdx] = useState<number | null>(null);

  const copyCorrected = () => {
    if (!res.correctedText) return;
    navigator.clipboard.writeText(res.correctedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const hasErrors = res.errors && res.errors.length > 0;

  // Header Status Badge:
  let statusBadge = (
    <span className={hasErrors ? 'pill redsoft' : 'pill greensoft'} style={{ fontWeight: 700 }}>
      {hasErrors ? `${res.errors.length} lỗi cần sửa` : 'Hoàn hảo'}
    </span>
  );

  if (translationVerdict) {
    const isFail = translationVerdict.overall === 'FAIL';
    const isMismatch = translationVerdict.meaningMatch === 'MISMATCH';
    const isWordMissing = translationVerdict.isTargetWordUsed === false;

    if (isFail) {
      if (isMismatch) {
        statusBadge = (
          <span className="pill redsoft" style={{ fontWeight: 800, background: '#FEE2E2', color: '#DC2626', border: '1px solid #FCA5A5' }}>
            ✕ Chưa đạt — Sai nghĩa
          </span>
        );
      } else if (isWordMissing) {
        statusBadge = (
          <span className="pill warn" style={{ fontWeight: 800 }}>
            ⚠ Chưa đạt — Thiếu từ mục tiêu
          </span>
        );
      } else {
        statusBadge = (
          <span className="pill redsoft" style={{ fontWeight: 800 }}>
            ✕ Chưa đạt
          </span>
        );
      }
    } else if (translationVerdict.meaningMatch === 'PARTIAL') {
      statusBadge = (
        <span className="pill warn" style={{ fontWeight: 800 }}>
          ⚠ Tạm đạt — Cần chỉnh nghĩa
        </span>
      );
    } else {
      if (hasErrors) {
        statusBadge = (
          <span className="pill warn" style={{ fontWeight: 800 }}>
            ✓ Đạt nghĩa · {res.errors.length} lỗi nhỏ
          </span>
        );
      } else {
        statusBadge = (
          <span className="pill greensoft" style={{ fontWeight: 800 }}>
            ✓ Hoàn hảo — Đạt
          </span>
        );
      }
    }
  }

  // Coach Vi Feedback:
  let coachFeedback = hasErrors
    ? 'Hãy đọc to câu đã sửa 3 lần theo nhịp điệu tự nhiên — cơ miệng và não bộ sẽ ghi nhớ cấu trúc chuẩn nhanh gấp đôi so với chỉ đọc nhẩm!'
    : 'Tuyệt vời! Câu của bạn rất chuẩn ngữ pháp và tự nhiên. Tiếp tục phát huy nhé!';

  if (translationVerdict) {
    if (translationVerdict.feedback) {
      coachFeedback = translationVerdict.feedback;
    } else if (translationVerdict.overall === 'FAIL') {
      coachFeedback = 'Bản dịch chưa sát nghĩa câu tiếng Việt gốc hoặc chưa dùng từ mục tiêu. Hãy xem câu gợi ý chuẩn bên trên và thử lại nhé!';
    } else {
      coachFeedback = 'Xuất sắc! Bạn đã truyền tải chuẩn xác nghĩa tiếng Việt và vận dụng rất tốt từ mục tiêu.';
    }
  }

  return (
    <div className="colstack" style={{ gap: 16 }}>
      {/* 1. Score & Overview Card */}
      <MotionCard className="card">
        <div className="row" style={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <h2>
            <span className="dot g" />
            Kết quả đánh giá
          </h2>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span className="pill level" style={{ fontWeight: 800 }}>
              Điểm: <AnimatedCounter value={res.score} />/100
            </span>
            {statusBadge}
          </div>
        </div>

        {/* Outline Report Section (nếu có - dùng cho tab Viết theo chủ đề) */}
        {outlineReport && (
          <div
            style={{
              marginTop: 14,
              padding: '12px 16px',
              borderRadius: 12,
              background: 'linear-gradient(135deg, #F0FDF4 0%, #ECFDF5 100%)',
              border: '1.5px solid #A7F3D0',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#065F46' }}>
                📋 Khớp dàn ý: {outlineReport.usedWordCount || 0}/{outlineReport.targetWordCount || 5} từ gợi ý
              </span>
              {outlineReport.usedWordCount === outlineReport.targetWordCount && (
                <span className="pill" style={{ background: '#10B981', color: '#fff', fontSize: 11, fontWeight: 800 }}>
                  ✓ Đạt 100% từ gợi ý
                </span>
              )}
            </div>

            {/* Chips used / unused words */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
              {outlineReport.usedWords?.map((w, i) => (
                <span
                  key={i}
                  className="pill"
                  style={{
                    background: '#DCFCE7',
                    color: '#15803D',
                    fontWeight: 700,
                    fontSize: 12,
                    border: '1px solid #86EFAC',
                  }}
                >
                  ✓ {w}
                </span>
              ))}
              {outlineReport.unusedWords?.map((w, i) => (
                <span
                  key={i}
                  className="pill"
                  style={{
                    background: '#F1F5F9',
                    color: '#64748B',
                    fontWeight: 600,
                    fontSize: 12,
                    border: '1px solid #CBD5E1',
                    textDecoration: 'line-through',
                  }}
                  title="Chưa sử dụng trong bài viết"
                >
                  {w}
                </span>
              ))}
            </div>

            {/* Structures report */}
            {outlineReport.usedStructures && outlineReport.usedStructures.length > 0 && (
              <div style={{ marginTop: 10, fontSize: 12.5, color: '#047857' }}>
                🎯 <b>Cấu trúc đã áp dụng:</b> {outlineReport.usedStructures.join(', ')}
              </div>
            )}

            {outlineReport.outlineFeedback && (
              <div style={{ marginTop: 6, fontSize: 13, color: '#065F46', fontStyle: 'italic' }}>
                {outlineReport.outlineFeedback}
              </div>
            )}
          </div>
        )}

        {/* Original Sentence with Safe Error Highlighting */}
        <div style={{ marginTop: 14, padding: '12px 16px', background: '#F8FAFC', borderRadius: 10, border: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="sub" style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Câu gốc của bạn:
            </span>
            {hasErrors && (
              <span className="sub" style={{ fontSize: 11, color: '#94A3B8' }}>
                (Vùng tô sáng là vị trí phát hiện lỗi)
              </span>
            )}
          </div>
          <div style={{ fontWeight: 600, color: 'var(--ink)', marginTop: 4, fontSize: 14.5, lineHeight: 1.6 }}>
            {renderHighlightedSentence(res.originalText, res.errors, activeErrorIdx)}
          </div>
        </div>

        {/* Corrected Sentence */}
        <div
          className="fix mt16"
          style={{
            padding: '14px 18px',
            background: 'rgba(53, 158, 125, 0.08)',
            borderRadius: 12,
            border: '1.5px solid rgba(53, 158, 125, 0.3)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#1B5E20', textTransform: 'uppercase' }}>
              ✓ Câu đã sửa hoàn chỉnh:
            </span>
            <div style={{ fontWeight: 800, color: '#1B5E20', fontSize: 16.5, marginTop: 4, lineHeight: 1.5 }}>
              {res.correctedText}
            </div>
          </div>
          <button
            type="button"
            className="btn ghost sm"
            onClick={copyCorrected}
            style={{
              padding: '6px 12px',
              fontSize: 12,
              fontWeight: 700,
              color: '#1B5E20',
              borderColor: '#86EFAC',
              background: '#fff',
              flexShrink: 0,
            }}
          >
            {copied ? '✓ Đã chép' : '📋 Sao chép'}
          </button>
        </div>

        {/* Detailed Errors List */}
        {hasErrors && (
          <motion.div
            className="mt16"
            style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {res.errors.map((e, idx) => (
              <motion.div
                key={idx}
                variants={staggerItem}
                className="taskrow"
                onClick={() => setActiveErrorIdx(idx === activeErrorIdx ? null : idx)}
                style={{
                  cursor: 'pointer',
                  borderRadius: 10,
                  transition: 'all 0.15s ease',
                  border: idx === activeErrorIdx ? '1.5px solid #EF4444' : undefined,
                  background: idx === activeErrorIdx ? '#FEF2F2' : undefined,
                }}
              >
                <span className="tk" style={{ color: 'var(--primary)', fontWeight: 800 }}>
                  <b>{idx + 1}</b>
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <b style={{ fontSize: 14, color: 'var(--ink)' }}>{e.message}</b>
                    {e.errorType && (
                      <span className="pill" style={{ fontSize: 10, padding: '2px 7px', fontWeight: 800 }}>
                        {e.errorType}
                      </span>
                    )}
                  </div>
                  <div className="sub mt8" style={{ color: 'var(--ink)', fontSize: 13, lineHeight: 1.5 }}>
                    💡 <b>Gợi ý:</b> {e.suggestion}
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </MotionCard>

      {/* 2. Coach Vi's Advice */}
      <MotionCard className="card">
        <div className="coach">
          <img src={viAvatar} alt="Vi" style={{ width: 48, height: 48, objectFit: 'contain' }} />
          <div className="bubble" style={{ fontSize: 13.5, lineHeight: 1.5 }}>
            <b>Gợi ý của Vi:</b> {coachFeedback}
          </div>
        </div>
      </MotionCard>

      {/* 3. Extra Actions if provided (e.g. Viết tiếp cùng chủ đề, đổi chủ đề) */}
      {extraActions}
    </div>
  );
}
