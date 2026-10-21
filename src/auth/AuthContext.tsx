import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { authApi, paymentApi } from '../api';
import type { User, SubscriptionStatus } from '../api';

interface Ctx {
  user: User | null;
  subscription: SubscriptionStatus | null;
  loading: boolean;
  login: (u: User, access: string, refresh: string) => void;
  logout: () => void;
  updateUser: (u: User) => void;
  refreshSubscription: () => Promise<void>;
}
const AuthCtx = createContext<Ctx>({
  user: null,
  subscription: null,
  loading: true,
  login: () => {},
  logout: () => {},
  updateUser: () => {},
  refreshSubscription: async () => {},
});
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const raw = localStorage.getItem('vocab_user');
    const token = localStorage.getItem('vocab_access') || localStorage.getItem('access_token');
    const isValidToken = Boolean(token && token !== 'undefined' && token !== 'null');
    if (raw && raw !== 'undefined' && raw !== 'null' && isValidToken) {
      try { setUser(JSON.parse(raw)); } catch { /* ignore */ }
    } else if (!isValidToken) {
      localStorage.removeItem('vocab_access');
      localStorage.removeItem('access_token');
      localStorage.removeItem('vocab_refresh');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('vocab_user');
    }
    if (isValidToken) {
      import('../api').then(({ userApi }) => {
        userApi.me().then(({ data }) => {
          if (data) {
            setUser(data);
            localStorage.setItem('vocab_user', JSON.stringify(data));
          }
        }).catch(() => {});
      });
      refreshSubscription();
    }
    setLoading(false);
  }, []);

  const refreshSubscription = async () => {
    try {
      const res = await paymentApi.getSubscriptionStatus();
      setSubscription(res?.data || null);
    } catch {
      setSubscription(null);
    }
  };

  const login = (u: User, access: string, refresh: string) => {
    if (u) {
      localStorage.setItem('vocab_user', JSON.stringify(u));
      setUser(u);
    }
    if (access && access !== 'undefined' && access !== 'null') {
      localStorage.setItem('vocab_access', access);
      localStorage.setItem('access_token', access);
    }
    if (refresh && refresh !== 'undefined' && refresh !== 'null') {
      localStorage.setItem('vocab_refresh', refresh);
      localStorage.setItem('refresh_token', refresh);
    }
    refreshSubscription();
  };
  const logout = () => {
    authApi.logout();
    localStorage.removeItem('vocab_user');
    localStorage.removeItem('vocab_access');
    localStorage.removeItem('access_token');
    localStorage.removeItem('vocab_refresh');
    localStorage.removeItem('refresh_token');
    setUser(null);
    setSubscription(null);
    // Demo mode dùng HashRouter → redirect bằng hash để không cần SPA fallback.
    window.location.href = import.meta.env.VITE_DEMO === '1' ? '/#/login' : '/login';
  };
  const updateUser = (u: User) => {
    if (u) {
      localStorage.setItem('vocab_user', JSON.stringify(u));
      setUser(u);
    }
  };
  return (
    <AuthCtx.Provider value={{ user, subscription, loading, login, logout, updateUser, refreshSubscription }}>
      {children}
    </AuthCtx.Provider>
  );
}
