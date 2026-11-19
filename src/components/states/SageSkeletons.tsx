import { ViMascotImage } from '../ViMascotImage';
import './states.css';

/**
 * Glass skeleton mirroring the exact anatomy of a VocabularyAI SRS Flashcard.
 */
export function FlashcardSkeleton({ message = 'Vi đang chuẩn bị bộ thẻ SRS cho bạn…' }: { message?: string }) {
  return (
    <div className="glass sage-skel-flashcard" role="status" aria-busy="true" aria-label={message}>
      <div className="sage-skel-fc-top">
        <div style={{ display: 'flex', gap: 8 }}>
          <span className="sage-skel-pill" style={{ width: 42, height: 24 }} />
          <span className="sage-skel-pill" style={{ width: 96, height: 24 }} />
        </div>
        <div className="sage-skel-thinking-row">
          <ViMascotImage pose="thinking" size={26} transparent framed={false} priority alt="Vi đang phân tích bộ thẻ từ" />
          <span>{message}</span>
        </div>
      </div>

      <div className="sage-skel-fc-center">
        <div className="sage-skel-bar" style={{ width: '54%', maxWidth: 260, height: 42 }} />
        <div className="sage-skel-bar" style={{ width: '34%', maxWidth: 160, height: 18 }} />
        <div className="sage-skel-bar" style={{ width: '68%', maxWidth: 340, height: 14, marginTop: 6 }} />
      </div>

      <div className="sage-skel-fc-actions">
        <span className="sage-skel-pill" style={{ height: 40 }} />
        <span className="sage-skel-pill" style={{ height: 40 }} />
        <span className="sage-skel-pill" style={{ height: 40 }} />
      </div>
    </div>
  );
}

/**
 * Glass skeleton mirroring the exact anatomy of a VocabularyAI Word library card/row.
 */
export function WordRowSkeleton({ count = 4 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="glass sage-skel-word-row"
          role="status"
          aria-busy="true"
          aria-label="Đang tải danh sách từ vựng"
        >
          <div className="sage-skel-word-top">
            <div style={{ display: 'flex', gap: 6 }}>
              <span className="sage-skel-pill" style={{ width: 38, height: 22 }} />
              <span className="sage-skel-pill" style={{ width: 64, height: 22 }} />
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <span className="sage-skel-circle" style={{ width: 28, height: 28 }} />
              <span className="sage-skel-circle" style={{ width: 28, height: 28 }} />
            </div>
          </div>
          <div className="sage-skel-bar" style={{ width: idx % 2 === 0 ? '48%' : '58%', height: 24, marginTop: 4 }} />
          <div className="sage-skel-bar" style={{ width: '32%', height: 14 }} />
          <div className="sage-skel-bar" style={{ width: '82%', height: 15, marginTop: 2 }} />
          <div className="sage-skel-pill" style={{ width: 92, height: 28, marginTop: 6 }} />
        </div>
      ))}
    </>
  );
}

/**
 * Glass skeleton mirroring the exact anatomy of a VocabularyAI Dashboard Stat / KPI card.
 */
export function StatCardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="glass sage-skel-stat-card"
          role="status"
          aria-busy="true"
          aria-label="Đang tải thống kê học tập"
        >
          <div className="sage-skel-bar" style={{ width: '52%', height: 11 }} />
          <div className="sage-skel-bar" style={{ width: '40%', height: 32 }} />
          <div className="sage-skel-bar" style={{ width: '66%', height: 12 }} />
        </div>
      ))}
    </>
  );
}
