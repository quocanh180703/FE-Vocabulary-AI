import React from 'react';
import { useUsage } from '../context/UsageContext';

interface QuotaBadgeProps {
  featureKey: 'chat' | 'speaking' | 'grammar' | 'explain' | 'roadmap' | 'voice' | 'listening' | 'exercise_generation';
  labelSuffix?: string; // e.g. "lượt hôm nay", "lượt chấm hôm nay", "lượt kiểm tra hôm nay", "lượt tạo lộ trình hôm nay"
  showOnlyWhenLow?: boolean; // If true, only renders when remaining <= 3
  className?: string;
  style?: React.CSSProperties;
}

export const QuotaBadge: React.FC<QuotaBadgeProps> = ({
  featureKey,
  labelSuffix = 'lượt hôm nay',
  showOnlyWhenLow = false,
  className = '',
  style = {},
}) => {
  const { usage, isVip, openUpgradeModal } = useUsage();

  if (isVip) {
    return (
      <div
        className={`pill ${className}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '5px 12px',
          borderRadius: '999px',
          fontSize: '12.5px',
          fontWeight: 800,
          background: '#FEF3C7',
          color: '#B45309',
          border: '1px solid #FCD34D',
          boxShadow: '0 1px 3px rgba(180, 83, 9, 0.08)',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          lineHeight: 1.2,
          verticalAlign: 'middle',
          ...style,
        }}
        title="Tài khoản PRO - Không giới hạn tính năng AI"
      >
        <span style={{ color: '#D97706', fontSize: '11px' }}>◆</span>
        <span>PRO · Không giới hạn</span>
      </div>
    );
  }

  const featureQuota = usage?.features?.[featureKey];
  const remaining = featureQuota?.remaining ?? (featureKey === 'explain' || featureKey === 'voice' ? 10 : featureKey === 'roadmap' ? 2 : featureKey === 'exercise_generation' ? 3 : 5);
  const limit = featureQuota?.limit ?? (featureKey === 'explain' || featureKey === 'voice' ? 10 : featureKey === 'roadmap' ? 2 : featureKey === 'exercise_generation' ? 3 : 5);

  if (showOnlyWhenLow && remaining > 3) {
    return null;
  }

  const isExhausted = remaining <= 0;
  const isWarning = remaining === 1;

  const bg = 'rgba(250, 248, 241, 0.92)';
  const text = isExhausted
    ? '#8f2d27'
    : isWarning
    ? '#8f5c1a'
    : '#1e4d2b';
  const border = isExhausted
    ? 'rgba(154, 75, 67, 0.4)'
    : isWarning
    ? 'rgba(201, 134, 47, 0.42)'
    : 'rgba(71, 96, 63, 0.34)';
  const dotColor = isExhausted
    ? 'var(--danger)'
    : isWarning
    ? 'var(--amber)'
    : 'var(--success)';

  return (
    <div
      onClick={() => {
        if (isExhausted) {
          openUpgradeModal({ feature: featureKey });
        }
      }}
      className={`pill ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '7px',
        padding: '5px 12px',
        borderRadius: '999px',
        fontSize: '12.5px',
        fontWeight: 700,
        lineHeight: 1.2,
        background: bg,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        color: text,
        border: `1px solid ${border}`,
        cursor: isExhausted ? 'pointer' : 'default',
        whiteSpace: 'nowrap',
        boxShadow: '0 1px 3px rgba(10, 37, 64, 0.05)',
        verticalAlign: 'middle',
        transition: 'transform var(--dur-micro) var(--ease), opacity var(--dur-micro) var(--ease)',
        ...style,
      }}
      title={isExhausted ? 'Đã hết lượt - Nhấn để nâng cấp Premium' : `Còn ${remaining}/${limit} ${labelSuffix}`}
    >
      <span
        style={{
          width: '7px',
          height: '7px',
          borderRadius: '50%',
          backgroundColor: dotColor,
          display: 'inline-block',
          flexShrink: 0,
        }}
      />
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
        <span>Còn</span>
        <strong style={{ fontWeight: 800 }}>{remaining}/{limit}</strong>
        <span>{labelSuffix}</span>
      </span>
      {isExhausted && (
        <span
          style={{
            fontSize: '11px',
            textDecoration: 'underline',
            marginLeft: '4px',
            fontWeight: 800,
            color: 'var(--red-dark, #B73338)',
          }}
        >
          Nâng cấp
        </span>
      )}
    </div>
  );
};
