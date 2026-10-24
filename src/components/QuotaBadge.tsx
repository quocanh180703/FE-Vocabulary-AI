import React from 'react';
import { useUsage } from '../context/UsageContext';

interface QuotaBadgeProps {
  featureKey: 'chat' | 'speaking' | 'grammar' | 'explain' | 'roadmap';
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
        title="Tài khoản VIP - Không giới hạn tính năng AI"
      >
        <span style={{ color: '#D97706', fontSize: '11px' }}>◆</span>
        <span>VIP · Không giới hạn</span>
      </div>
    );
  }

  const featureQuota = usage?.features?.[featureKey];
  const remaining = featureQuota?.remaining ?? (featureKey === 'explain' ? 10 : featureKey === 'roadmap' ? 2 : 5);
  const limit = featureQuota?.limit ?? (featureKey === 'explain' ? 10 : featureKey === 'roadmap' ? 2 : 5);

  if (showOnlyWhenLow && remaining > 3) {
    return null;
  }

  const isExhausted = remaining <= 0;
  const isWarning = remaining === 1;

  const bg = isExhausted
    ? 'var(--red-bg, #FDE8E9)'
    : isWarning
    ? 'var(--yellow-bg, #F8F0DC)'
    : 'var(--green-bg, #E6F4EB)';
  const text = isExhausted
    ? 'var(--red-dark, #B73338)'
    : isWarning
    ? 'var(--yellow-dark, #8A6115)'
    : 'var(--green-dark, #145C32)';
  const border = isExhausted
    ? 'rgba(229, 72, 77, 0.35)'
    : isWarning
    ? 'rgba(181, 127, 31, 0.35)'
    : 'rgba(30, 126, 70, 0.25)';
  const dotColor = isExhausted
    ? 'var(--red, #E5484D)'
    : isWarning
    ? 'var(--yellow, #B57F1F)'
    : 'var(--green, #1E7E46)';

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
        color: text,
        border: `1px solid ${border}`,
        cursor: isExhausted ? 'pointer' : 'default',
        whiteSpace: 'nowrap',
        boxShadow: '0 1px 3px rgba(10, 37, 64, 0.05)',
        verticalAlign: 'middle',
        transition: 'all 0.15s ease',
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
