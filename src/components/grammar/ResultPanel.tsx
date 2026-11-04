import { useState } from 'react';
import { motion } from 'motion/react';
import type { GrammarResp } from '../../api';
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

interface ResultPanelProps {
  res: GrammarResp;
  outlineReport?: OutlineReport;
  extraActions?: React.ReactNode;
}

export default function ResultPanel({ res, outlineReport, extraActions }: ResultPanelProps) {
  const [copied, setCopied] = useState(false);

  const copyCorrected = () => {
    if (!res.correctedText) return;
    navigator.clipboard.writeText(res.correctedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const hasErrors = res.errors && res.errors.length > 0;

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
            <span className={hasErrors ? 'pill redsoft' : 'pill greensoft'} style={{ fontWeight: 700 }}>
              {hasErrors ? `${res.errors.length} lỗi cần sửa` : 'Hoàn hảo'}
            </span>
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

        {/* Original Sentence */}
        <div style={{ marginTop: 14, padding: '12px 16px', background: '#F8FAFC', borderRadius: 10, border: '1px solid var(--line)' }}>
          <span className="sub" style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Câu gốc của bạn:
          </span>
          <div style={{ fontWeight: 600, color: 'var(--ink)', marginTop: 4, fontSize: 14.5, lineHeight: 1.5 }}>
            {res.originalText}
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
              <motion.div key={idx} variants={staggerItem} className="taskrow">
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
            <b>Gợi ý của Vi:</b>{' '}
            {hasErrors
              ? 'Hãy đọc to câu đã sửa 3 lần theo nhịp điệu tự nhiên — cơ miệng và não bộ sẽ ghi nhớ cấu trúc chuẩn nhanh gấp đôi so với chỉ đọc nhẩm!'
              : 'Tuyệt vời! Câu của bạn rất chuẩn ngữ pháp và tự nhiên. Tiếp tục phát huy nhé!'}
          </div>
        </div>
      </MotionCard>

      {/* 3. Extra Actions if provided (e.g. Viết tiếp cùng chủ đề, đổi chủ đề) */}
      {extraActions}
    </div>
  );
}

