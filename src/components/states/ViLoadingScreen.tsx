import React from 'react';
import { ViMascotImage } from '../ViMascotImage';
import './states.css';

export interface ViLoadingScreenProps {
  /** Custom primary message (defaults to "Chờ Vi một chút nhé") */
  message?: string;
  /** Optional subtle subtitle below the primary line */
  subtitle?: string;
  /** Full viewport height centered loader (used for Suspense / Route Guards) */
  fullscreen?: boolean;
  /** Compact inline centered loader for panels/cards */
  compact?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Unified centered VocabularyAI loading experience featuring transparent Vi
 * and the brand voice "Chờ Vi một chút nhé".
 */
export function ViLoadingScreen({
  message = 'Chờ Vi một chút nhé',
  subtitle,
  fullscreen = false,
  compact = false,
  className = '',
  style,
}: ViLoadingScreenProps) {
  return (
    <div
      className={`vi-loader-stage ${fullscreen ? 'is-fullscreen' : ''} ${compact ? 'is-compact' : ''} ${className}`.trim()}
      role="status"
      aria-live="polite"
      aria-busy="true"
      style={style}
    >
      <div className="vi-loader-card glass">
        <div className="vi-loader-mascot-wrap">
          <ViMascotImage
            pose="thinking"
            size={compact ? 64 : 88}
            priority
            alt="Vi đang chuẩn bị dữ liệu cho bạn"
          />
        </div>
        <div className="vi-loader-copy">
          <p className="vi-loader-title">
            <span>{message}</span>
            <span className="vi-loader-dots" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
          </p>
          {subtitle && <p className="vi-loader-sub">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}
