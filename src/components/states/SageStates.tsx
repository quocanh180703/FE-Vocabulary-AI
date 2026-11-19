import React, { useState } from 'react';
import { useNetwork } from '@mantine/hooks';
import { ViMascotImage } from '../ViMascotImage';
import './states.css';

/**
 * Live Offline Banner powered by @mantine/hooks useNetwork().
 * Renders automatically when the user loses connection, or when previewed in UI States Lab.
 */
export function OfflineBanner({
  forceVisible = false,
  onRetry,
}: {
  forceVisible?: boolean;
  onRetry?: () => void;
}) {
  const network = useNetwork();
  if (network.online && !forceVisible) return null;

  return (
    <div className="sage-offline-banner" role="alert" aria-live="polite">
      <div className="sage-offline-left">
        <span className="sage-offline-dot" aria-hidden="true" />
        <ViMascotImage
          pose="surprised"
          size={40}
          transparent
          framed={false}
          priority
          alt="Vi báo mất kết nối mạng"
        />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 13.5, color: 'var(--ink)' }}>
            Mất kết nối tới thư viện VocabularyAI
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>
            Các thẻ SRS đã tải vẫn giữ nguyên; kết nối lại để đồng bộ tiến độ với Vi.
          </div>
        </div>
      </div>

      <button
        type="button"
        className="btn secondary sm"
        onClick={() => {
          if (onRetry) onRetry();
          else if (typeof window !== 'undefined') window.location.reload();
        }}
      >
        Thử kết nối lại
      </button>
    </div>
  );
}

/**
 * Bespoke VocabularyAI API failure state with Vi `surprised` pose.
 */
export function ApiErrorState({
  title = 'Vi không thể tải dữ liệu lúc này',
  description = 'Kết nối tới máy chủ học tập tạm thời gián đoạn. Tiến độ đã lưu của bạn vẫn an toàn.',
  errorDetail,
  onRetry,
  compact = false,
}: {
  title?: string;
  description?: string;
  errorDetail?: string;
  onRetry?: () => void;
  compact?: boolean;
}) {
  const [showDetail, setShowDetail] = useState(false);

  return (
    <div
      className={`glass sage-state-card sage-state-card--error ${compact ? 'sage-state-card--compact' : ''}`}
      role="alert"
    >
      <ViMascotImage
        pose="surprised"
        size={compact ? 64 : 92}
        transparent
        framed={false}
        priority
        alt="Vi ngạc nhiên khi kết nối dữ liệu gặp lỗi"
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: compact ? 'flex-start' : 'center' }}>
        <h3 className="sage-state-title">{title}</h3>
        <p className="sage-state-desc">{description}</p>
        {errorDetail && showDetail && (
          <code style={{ fontSize: 11.5, color: 'var(--red-dark)', background: 'rgba(154, 75, 67, 0.08)', padding: '4px 10px', borderRadius: 8 }}>
            {errorDetail}
          </code>
        )}
        <div className="sage-state-actions">
          {onRetry && (
            <button type="button" className="btn sm" onClick={onRetry}>
              Thử lại ngay
            </button>
          )}
          {errorDetail && (
            <button
              type="button"
              className="btn ghost sm"
              onClick={() => setShowDetail((v) => !v)}
            >
              {showDetail ? 'Ẩn chi tiết' : 'Xem mã lỗi'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Bespoke VocabularyAI empty / all-done SRS state with Vi `sleep` (or `happy-wave` for fresh start).
 */
export function EmptyQueueState({
  mode = 'done',
  title,
  description,
  nextReviewLabel,
  actionLabel,
  onAction,
  compact = false,
}: {
  mode?: 'done' | 'empty';
  title?: string;
  description?: string;
  nextReviewLabel?: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
}) {
  const resolvedTitle =
    title || (mode === 'done' ? 'Hôm nay bạn đã ôn trọn hàng đợi SRS!' : 'Chưa có từ nào trong mục này');
  const resolvedDesc =
    description ||
    (mode === 'done'
      ? 'Trí nhớ cần khoảng nghỉ để củng cố. Vi sẽ nhắc bạn đúng điểm rơi vào mốc ôn tiếp theo.'
      : 'Khám phá kho 4.900+ từ Oxford A1–C1 và lưu từ đầu tiên để bắt đầu vòng lặp Học → Ôn → Nói.');

  return (
    <div
      className={`glass sage-state-card ${compact ? 'sage-state-card--compact' : ''}`}
      role="status"
    >
      <ViMascotImage
        pose={mode === 'done' ? 'sleep' : 'happy-wave'}
        size={compact ? 66 : 94}
        transparent
        framed={false}
        priority
        alt={mode === 'done' ? 'Vi nghỉ ngơi sau khi hoàn thành hàng đợi hôm nay' : 'Vi vẫy tay mời bạn bắt đầu học từ mới'}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: compact ? 'flex-start' : 'center' }}>
        <h3 className="sage-state-title">{resolvedTitle}</h3>
        <p className="sage-state-desc">{resolvedDesc}</p>
        {nextReviewLabel && <span className="sage-state-meta">{nextReviewLabel}</span>}
        {actionLabel && onAction && (
          <div className="sage-state-actions">
            <button type="button" className="btn sm" onClick={onAction}>
              {actionLabel}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Bespoke VocabularyAI 404 Not Found state with giant outlined 404 + Vi `surprised`.
 */
export function NotFoundState({
  onGoHome,
  onOpenWords,
}: {
  onGoHome?: () => void;
  onOpenWords?: () => void;
}) {
  return (
    <div className="glass sage-state-card" role="region" aria-label="Không tìm thấy trang">
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <span className="sage-state-code" aria-hidden="true">404</span>
        <ViMascotImage
          pose="surprised"
          size={86}
          transparent
          framed={false}
          priority
          alt="Vi ngạc nhiên khi không tìm thấy trang sách này"
        />
      </div>
      <h3 className="sage-state-title">Trang sách này chưa có trong thư viện</h3>
      <p className="sage-state-desc">
        Đường dẫn có thể đã cũ hoặc gõ nhầm. Quay lại hàng đợi học hôm nay hoặc tra cứu trực tiếp trong kho 4.900+ từ Oxford.
      </p>
      <div className="sage-state-actions">
        {onGoHome && (
          <button type="button" className="btn sm" onClick={onGoHome}>
            Về trang chủ
          </button>
        )}
        {onOpenWords && (
          <button type="button" className="btn secondary sm" onClick={onOpenWords}>
            Mở kho từ vựng
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Bespoke inline validation feedback for Login, Register, and OTP inputs.
 */
export function InlineFieldFeedback({
  tone = 'error',
  message,
  children,
}: {
  tone?: 'error' | 'valid' | 'hint';
  message?: string;
  children?: React.ReactNode;
}) {
  const content = children ?? message;
  if (!content) return null;

  const symbol = tone === 'error' ? '!' : tone === 'valid' ? '✓' : 'i';

  return (
    <div
      className={`sage-inline-feedback sage-inline-feedback--${tone}`}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      <span
        aria-hidden="true"
        style={{
          width: 18,
          height: 18,
          borderRadius: '50%',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 11,
          fontWeight: 800,
          flexShrink: 0,
          background:
            tone === 'error'
              ? 'rgba(154, 75, 67, 0.18)'
              : tone === 'valid'
              ? 'rgba(66, 119, 77, 0.2)'
              : 'rgba(71, 96, 63, 0.16)',
        }}
      >
        {symbol}
      </span>
      <span>{content}</span>
    </div>
  );
}

/**
 * Bespoke wrong-answer vocabulary feedback with Vi `surprised`, answer comparison, and SRS memory tip.
 */
export function WrongAnswerFeedback({
  word,
  ipa,
  selectedAnswer,
  correctAnswer,
  memoryTip,
  onContinue,
}: {
  word: string;
  ipa?: string;
  selectedAnswer: string;
  correctAnswer: string;
  memoryTip?: string;
  onContinue?: () => void;
}) {
  return (
    <div className="sage-wrong-answer" role="alert">
      <ViMascotImage
        pose="surprised"
        size={68}
        transparent
        framed={false}
        priority
        alt="Vi nhắc nhẹ đáp án đúng"
      />
      <div className="sage-wrong-answer-body">
        <div className="sage-wrong-answer-title">
          Chưa khớp cho từ “{word}” {ipa ? <span style={{ fontWeight: 500, color: 'var(--muted)' }}>{ipa}</span> : null}
        </div>
        <div className="sage-wrong-answer-compare">
          <span>Bạn chọn: <span className="sage-wrong-chip-bad">{selectedAnswer}</span></span>
          <span>Đáp án đúng: <span className="sage-wrong-chip-ok">{correctAnswer}</span></span>
        </div>
        {memoryTip && <div className="sage-wrong-answer-tip">Gợi ý từ Vi: {memoryTip}</div>}
      </div>
      {onContinue && (
        <button type="button" className="btn secondary sm" onClick={onContinue}>
          Ghi nhớ &amp; Tiếp tục
        </button>
      )}
    </div>
  );
}
