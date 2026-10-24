import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import { paymentApi } from '../api';
import type { SubscriptionUsageResponse } from '../api';
import { useAuth } from '../auth/AuthContext';

export interface ModalOptions {
  isOpen: boolean;
  feature?: string;
  message?: string;
  code?: string;
  force?: boolean;
}

interface UsageContextType {
  usage: SubscriptionUsageResponse | null;
  isVip: boolean;
  isAtLeastHalfFreeUsage: boolean;
  loading: boolean;
  modalState: ModalOptions;
  refreshUsage: () => Promise<void>;
  decrementQuota: (featureKey: 'chat' | 'speaking' | 'grammar' | 'explain' | 'roadmap') => void;
  openUpgradeModal: (options?: Partial<ModalOptions> & { force?: boolean }) => void;
  closeUpgradeModal: () => void;
}

const defaultUsage: SubscriptionUsageResponse = {
  isVip: false,
  isFreeUsageAtLeastHalf: false,
  resetAt: '',
  features: {
    chat: { limit: 5, used: 0, remaining: 5 },
    speaking: { limit: 5, used: 0, remaining: 5 },
    grammar: { limit: 5, used: 0, remaining: 5 },
    explain: { limit: 10, used: 0, remaining: 10 },
    roadmap: { limit: 2, used: 0, remaining: 2 },
  },
};

const UsageContext = createContext<UsageContextType>({
  usage: defaultUsage,
  isVip: false,
  isAtLeastHalfFreeUsage: false,
  loading: false,
  modalState: { isOpen: false },
  refreshUsage: async () => {},
  decrementQuota: () => {},
  openUpgradeModal: () => {},
  closeUpgradeModal: () => {},
});

export const useUsage = () => useContext(UsageContext);

export function UsageProvider({ children }: { children: ReactNode }) {
  const { user, subscription } = useAuth();
  const [usage, setUsage] = useState<SubscriptionUsageResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [modalState, setModalState] = useState<ModalOptions>({ isOpen: false });

  const isVip = Boolean(
    usage?.isVip ||
    user?.role === 'ADMIN' ||
    subscription?.status === 'ACTIVE'
  );

  const isAtLeastHalfFreeUsage = useMemo(() => {
    if (isVip) return false;
    if (usage?.isFreeUsageAtLeastHalf != null) {
      return Boolean(usage.isFreeUsageAtLeastHalf);
    }
    if (!usage?.features) return false;
    const features = usage.features;
    let totalUsed = 0;
    let totalLimit = 0;
    for (const key of ['chat', 'speaking', 'grammar', 'explain', 'roadmap'] as const) {
      const item = features[key];
      if (!item) continue;
      const limit = item.limit ?? 0;
      const used = item.used ?? 0;
      if (limit > 0) {
        totalLimit += limit;
        totalUsed += used;
        if (used >= Math.ceil(limit * 0.5)) {
          return true;
        }
      }
    }
    return totalLimit > 0 && totalUsed >= Math.ceil(totalLimit * 0.5);
  }, [isVip, usage]);

  const refreshUsage = useCallback(async () => {
    if (!user) {
      setUsage(defaultUsage);
      return;
    }
    try {
      setLoading(true);
      const data = await paymentApi.getUsage();
      if (data) {
        setUsage(data);
      }
    } catch {
      // Fallback: if not loaded, use defaults with role check
      if (user?.role === 'ADMIN' || subscription?.status === 'ACTIVE') {
        setUsage({
          isVip: true,
          isFreeUsageAtLeastHalf: false,
          resetAt: '',
          features: {
            chat: { limit: null, used: 0, remaining: null },
            speaking: { limit: null, used: 0, remaining: null },
            grammar: { limit: null, used: 0, remaining: null },
            explain: { limit: null, used: 0, remaining: null },
            roadmap: { limit: null, used: 0, remaining: null },
          },
        });
      }
    } finally {
      setLoading(false);
    }
  }, [user, subscription]);

  useEffect(() => {
    refreshUsage();
  }, [refreshUsage]);

  // Listen to axios 429 quota events
  useEffect(() => {
    const handleOpenModal = (e: Event) => {
      const customEvent = e as CustomEvent;
      const detail = customEvent.detail || {};
      setModalState({
        isOpen: true,
        feature: detail.data?.feature || detail.feature,
        message: detail.message,
        code: detail.code || 'QUOTA_EXCEEDED',
        force: true,
      });
      // Also refresh usage in background to sync accurate counts
      refreshUsage();
    };

    window.addEventListener('open-upgrade-modal', handleOpenModal);
    return () => {
      window.removeEventListener('open-upgrade-modal', handleOpenModal);
    };
  }, [refreshUsage]);

  // Optimistic client-side quota decrement
  const decrementQuota = useCallback((featureKey: 'chat' | 'speaking' | 'grammar' | 'explain' | 'roadmap') => {
    setUsage((prev) => {
      if (!prev || prev.isVip) return prev;
      const current = prev.features?.[featureKey];
      if (!current || current.remaining == null || current.remaining <= 0) return prev;

      return {
        ...prev,
        features: {
          ...prev.features,
          [featureKey]: {
            ...current,
            used: current.used + 1,
            remaining: Math.max(0, current.remaining - 1),
          },
        },
      };
    });
  }, []);

  const openUpgradeModal = useCallback(
    (options?: Partial<ModalOptions> & { force?: boolean }) => {
      // Free users only see modal if they have used >= 50% of the free package (unless forced or VIP)
      if (!isVip && !isAtLeastHalfFreeUsage && !options?.force) {
        return;
      }
      setModalState({
        isOpen: true,
        feature: options?.feature,
        message: options?.message,
        code: options?.code || 'QUOTA_EXCEEDED',
        force: options?.force,
      });
    },
    [isVip, isAtLeastHalfFreeUsage]
  );

  const closeUpgradeModal = useCallback(() => {
    setModalState({ isOpen: false });
  }, []);

  return (
    <UsageContext.Provider
      value={{
        usage: usage || defaultUsage,
        isVip,
        isAtLeastHalfFreeUsage,
        loading,
        modalState,
        refreshUsage,
        decrementQuota,
        openUpgradeModal,
        closeUpgradeModal,
      }}
    >
      {children}
    </UsageContext.Provider>
  );
}
