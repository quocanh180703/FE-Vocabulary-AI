import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Icon } from './icons';

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title?: string;
  itemName?: string;
  description?: React.ReactNode;
  warningText?: string;
  confirmText?: string;
  cancelText?: string;
  loadingText?: string;
  variant?: 'danger' | 'warning' | 'primary';
  icon?: 'trash' | 'alert';
  isLoading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Xác nhận xóa',
  itemName,
  description,
  warningText = 'Hành động này không thể hoàn tác. Dữ liệu sau khi xóa sẽ không thể phục hồi.',
  confirmText = 'Xác nhận xóa',
  cancelText = 'Hủy bỏ',
  loadingText = 'Đang xử lý...',
  variant = 'danger',
  icon = 'trash',
  isLoading = false,
}) => {
  // ESC key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  const isDanger = variant === 'danger';
  const themeColor = isDanger ? 'var(--danger)' : variant === 'warning' ? 'var(--amber)' : 'var(--sage)';
  const badgeBg = isDanger ? 'var(--danger-bg)' : variant === 'warning' ? 'var(--amber-bg)' : 'rgba(71, 96, 63, 0.14)';
  const warnBg = isDanger ? 'var(--danger-bg)' : variant === 'warning' ? 'var(--amber-bg)' : 'rgba(71, 96, 63, 0.1)';
  const warnBorder = isDanger ? 'rgba(154, 75, 67, 0.3)' : variant === 'warning' ? 'rgba(201, 134, 47, 0.35)' : 'rgba(71, 96, 63, 0.28)';
  const warnText = isDanger ? 'var(--red-dark)' : variant === 'warning' ? 'var(--amber-dark)' : 'var(--ink)';

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget && !isLoading) {
              onClose();
            }
          }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100050,
            background: 'rgba(16, 36, 24, 0.56)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 8 }}
            transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
            style={{
              background: 'var(--glass-strong)',
              backdropFilter: 'blur(26px)',
              borderRadius: 'var(--r-lg)',
              width: '100%',
              maxWidth: 440,
              padding: '24px 24px 20px',
              boxShadow: 'var(--shadow-lg)',
              border: '1px solid var(--rim)',
              textAlign: 'center',
            }}
          >
            {/* Icon Badge */}
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: badgeBg,
                color: themeColor,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}
            >
              <Icon n={icon} s={28} />
            </div>

            {/* Title */}
            <h3
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: '#0F172A',
                margin: '0 0 8px',
              }}
            >
              {title}
            </h3>

            {/* Description */}
            <div
              style={{
                fontSize: 13.5,
                color: '#475569',
                lineHeight: 1.5,
                margin: '0 0 16px',
              }}
            >
              {description ? (
                description
              ) : itemName ? (
                <p style={{ margin: 0 }}>
                  Bạn có chắc chắn muốn xóa{' '}
                  <b style={{ color: '#0F172A', wordBreak: 'break-all' }}>
                    "{itemName}"
                  </b>{' '}
                  không?
                </p>
              ) : (
                <p style={{ margin: 0 }}>Bạn có chắc chắn muốn thực hiện hành động này không?</p>
              )}
            </div>

            {/* Warning Callout */}
            {warningText && (
              <div
                style={{
                  background: warnBg,
                  border: `1px solid ${warnBorder}`,
                  borderRadius: 12,
                  padding: '10px 14px',
                  fontSize: 12.5,
                  color: warnText,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  textAlign: 'left',
                  marginBottom: 20,
                }}
              >
                <div style={{ flexShrink: 0, color: themeColor }}>
                  <Icon n="alert" s={18} />
                </div>
                <div>{warningText}</div>
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn ghost"
                onClick={onClose}
                disabled={isLoading}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  borderRadius: 12,
                  fontWeight: 700,
                  fontSize: 13.5,
                  color: '#475569',
                  borderColor: '#CBD5E1',
                }}
              >
                {cancelText}
              </button>
              <button
                type="button"
                className="btn"
                onClick={onConfirm}
                disabled={isLoading}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  borderRadius: 12,
                  fontWeight: 800,
                  fontSize: 13.5,
                  color: '#FFFFFF',
                  background: themeColor,
                  border: 'none',
                  cursor: isLoading ? 'wait' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  boxShadow: isDanger ? '0 4px 12px rgba(220, 38, 38, 0.25)' : 'none',
                }}
              >
                {isLoading ? (
                  <>
                    <div
                      className="spinner"
                      style={{
                        width: 14,
                        height: 14,
                        borderWidth: 2,
                        borderColor: '#FFFFFF',
                        borderTopColor: 'transparent',
                      }}
                    />
                    <span>{loadingText}</span>
                  </>
                ) : (
                  <>
                    <Icon n={icon} s={16} />
                    <span>{confirmText}</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};
export default ConfirmModal;

