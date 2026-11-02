import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { adminApi } from '../../api';
import type {
  AdminPaymentItem,
  AdminPaymentDetail,
  AdminPackageItem,
  AdminPackageStats,
} from '../../api';
import { Icon } from '../../components/icons';
import AutocompleteSearch from '../../components/AutocompleteSearch';
import {
  MotionCard,
  AnimatedCounter,
  modalVariants,
  backdropVariants,
  staggerContainer,
  staggerItem,
  pageVariants,
} from '../../motion';

const ORDER_STATUS_FILTERS = [
  { id: 'ALL', label: 'Tất cả trạng thái' },
  { id: 'SUCCESS', label: 'Thành công' },
  { id: 'PENDING', label: 'Đang chờ' },
  { id: 'CANCELLED', label: 'Đã hủy' },
  { id: 'FAILED', label: 'Thất bại' },
];

const PACKAGE_STATUS_FILTERS = [
  { id: 'ALL', label: 'Tất cả' },
  { id: 'ACTIVE', label: 'Đang mở bán' },
  { id: 'INACTIVE', label: 'Tạm ngưng' },
  { id: 'ARCHIVED', label: 'Đã lưu trữ' },
];

export default function AdminOrders() {
  const [activeTab, setActiveTab] = useState<'orders' | 'packages'>('orders');

  // Orders state
  const [payments, setPayments] = useState<AdminPaymentItem[]>([]);
  const [orderTotalElements, setOrderTotalElements] = useState(0);
  const [orderTotalPages, setOrderTotalPages] = useState(1);
  const [orderPage, setOrderPage] = useState(0);
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatus, setOrderStatus] = useState('ALL');
  const [orderLoading, setOrderLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState<AdminPaymentDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Packages state
  const [packages, setPackages] = useState<AdminPackageItem[]>([]);
  const [packageStats, setPackageStats] = useState<AdminPackageStats | null>(null);
  const [packageLoading, setPackageLoading] = useState(true);
  const [packageStatus, setPackageStatus] = useState('ALL');
  const [packageSearch, setPackageSearch] = useState('');

  // Package Form Modal state
  const [editingPackage, setEditingPackage] = useState<AdminPackageItem | null>(null);
  const [isPackageModalOpen, setIsPackageModalOpen] = useState(false);
  const [pkgFormCode, setPkgFormCode] = useState('');
  const [pkgFormName, setPkgFormName] = useState('');
  const [pkgFormPrice, setPkgFormPrice] = useState<number>(99000);
  const [pkgFormDays, setPkgFormDays] = useState<number>(30);
  const [pkgFormStatus, setPkgFormStatus] = useState<'ACTIVE' | 'INACTIVE' | 'ARCHIVED'>('ACTIVE');
  const [pkgFormDesc, setPkgFormDesc] = useState('');
  const [pkgSubmitting, setPkgSubmitting] = useState(false);

  // Notifications
  const [actionMsg, setActionMsg] = useState<{ text: string; error?: boolean } | null>(null);

  const showToast = (text: string, error = false) => {
    setActionMsg({ text, error });
    setTimeout(() => setActionMsg(null), 4500);
  };

  // Fetch Orders / Payments
  const fetchOrders = async (query?: string) => {
    setOrderLoading(true);
    try {
      const q = typeof query === 'string' ? query : orderSearch;
      const res = await adminApi.payments(orderPage, 15, orderStatus, q);
      if (res.data) {
        setPayments(res.data.content || []);
        setOrderTotalElements(res.data.totalElements || 0);
        setOrderTotalPages(res.data.totalPages || 1);
      }
    } catch (e: any) {
      console.error(e);
      showToast('Lỗi tải danh sách đơn hàng: ' + (e?.message || 'Lỗi server'), true);
    } finally {
      setOrderLoading(false);
    }
  };

  // Fetch Packages
  const fetchPackages = async (query?: string) => {
    setPackageLoading(true);
    try {
      const q = typeof query === 'string' ? query : packageSearch;
      const [listRes, statsRes] = await Promise.allSettled([
        adminApi.packages(0, 50, packageStatus, q),
        adminApi.packageStats(),
      ]);

      if (listRes.status === 'fulfilled' && listRes.value.data) {
        setPackages(listRes.value.data.content || []);
      }
      if (statsRes.status === 'fulfilled' && statsRes.value.data) {
        setPackageStats(statsRes.value.data);
      }
    } catch (e: any) {
      console.error(e);
      showToast('Lỗi tải danh sách gói cước: ' + (e?.message || 'Lỗi server'), true);
    } finally {
      setPackageLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'orders') {
      fetchOrders();
    } else {
      fetchPackages();
    }
  }, [activeTab, orderPage, orderStatus, packageStatus]);

  // Order Details Modal
  const viewOrderDetail = async (paymentId: number) => {
    setDetailLoading(true);
    try {
      const res = await adminApi.paymentDetail(paymentId);
      if (res.data) {
        setSelectedPayment(res.data);
      }
    } catch (e: any) {
      showToast('Không thể tải chi tiết thanh toán: ' + (e?.message || 'Lỗi kết nối'), true);
    } finally {
      setDetailLoading(false);
    }
  };

  // Package Modal Open (Create or Edit)
  const openCreatePackageModal = () => {
    setEditingPackage(null);
    setPkgFormCode('');
    setPkgFormName('');
    setPkgFormPrice(99000);
    setPkgFormDays(30);
    setPkgFormStatus('ACTIVE');
    setPkgFormDesc('');
    setIsPackageModalOpen(true);
  };

  const openEditPackageModal = (pkg: AdminPackageItem) => {
    setEditingPackage(pkg);
    setPkgFormCode(pkg.code);
    setPkgFormName(pkg.name);
    setPkgFormPrice(pkg.price);
    setPkgFormDays(pkg.durationDays);
    setPkgFormStatus(pkg.status);
    setPkgFormDesc(pkg.description || '');
    setIsPackageModalOpen(true);
  };

  // Submit Package Form
  const handleSavePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pkgFormName.trim()) {
      showToast('Tên gói cước không được để trống!', true);
      return;
    }
    if (pkgFormPrice <= 0) {
      showToast('Giá tiền gói cước phải lớn hơn 0!', true);
      return;
    }
    if (pkgFormDays <= 0) {
      showToast('Thời hạn sử dụng phải từ 1 ngày trở lên!', true);
      return;
    }

    setPkgSubmitting(true);
    try {
      if (editingPackage) {
        await adminApi.updatePackage(editingPackage.id, {
          name: pkgFormName.trim(),
          price: pkgFormPrice,
          durationDays: pkgFormDays,
          status: pkgFormStatus,
          description: pkgFormDesc.trim(),
        });
        showToast(`Cập nhật gói "${pkgFormName}" thành công!`);
      } else {
        if (!pkgFormCode.trim()) {
          showToast('Mã code gói cước không được để trống!', true);
          setPkgSubmitting(false);
          return;
        }
        await adminApi.createPackage({
          code: pkgFormCode.trim().toUpperCase(),
          name: pkgFormName.trim(),
          price: pkgFormPrice,
          durationDays: pkgFormDays,
          status: pkgFormStatus,
          description: pkgFormDesc.trim(),
        });
        showToast(`Tạo mới gói cước "${pkgFormName}" thành công!`);
      }

      setIsPackageModalOpen(false);
      await fetchPackages();
    } catch (e: any) {
      showToast('Lỗi lưu gói cước: ' + (e?.response?.data?.message || e?.message || 'Không thể thực hiện'), true);
    } finally {
      setPkgSubmitting(false);
    }
  };

  // Toggle Package Active/Inactive Status
  const handleTogglePackageStatus = async (pkg: AdminPackageItem) => {
    const nextStatus = pkg.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const actionLabel = nextStatus === 'ACTIVE' ? 'mở bán lại' : 'tạm ngưng mở bán';
    if (!confirm(`Bạn có chắc muốn ${actionLabel} gói "${pkg.name}"?`)) return;

    try {
      await adminApi.updatePackage(pkg.id, { status: nextStatus });
      showToast(`Đã ${actionLabel} gói cước thành công!`);
      await fetchPackages();
    } catch (e: any) {
      showToast('Không thể đổi trạng thái gói: ' + (e?.message || 'Lỗi server'), true);
    }
  };

  // Format Helpers
  const formatVnd = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  // Custom autocomplete suggestions for Orders
  const orderSuggestions = payments.slice(0, 15).map((p) => ({
    id: p.paymentId,
    title: p.orderCode || `Đơn #${p.paymentId}`,
    subtitle: `${p.userEmail || p.userFullName || 'Khách vãng lai'} · ${formatVnd(p.amount)}`,
    badge: p.status === 'SUCCESS' ? 'Thành công' : p.status === 'PENDING' ? 'Chờ GD' : p.status === 'CANCELLED' ? 'Đã hủy' : 'Thất bại',
    raw: p,
  }));

  // Custom autocomplete suggestions for Packages
  const packageSuggestions = packages.map((pkg) => ({
    id: pkg.id,
    title: pkg.name,
    subtitle: `${pkg.code} · ${formatVnd(pkg.price)} · ${pkg.durationDays} ngày`,
    badge: pkg.status === 'ACTIVE' ? 'Đang mở bán' : pkg.status === 'INACTIVE' ? 'Tạm ngưng' : 'Lưu trữ',
    raw: pkg,
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Page Header */}
      <div className="pagehead" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14 }}>
        <div>
          <h1>Đơn hàng &amp; Gói cước</h1>
          <div className="sub">
            Tra cứu dòng tiền, đơn thanh toán PayOS / VietQR và quản lý cấu hình các gói dịch vụ
          </div>
        </div>

        {/* Gliding Tab Switcher with spring layoutId */}
        <div
          style={{
            display: 'inline-flex',
            background: 'rgba(10, 37, 64, 0.05)',
            padding: 4,
            borderRadius: 14,
            border: '1px solid var(--line-soft)',
            gap: 4,
          }}
        >
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setActiveTab('orders')}
            style={{
              position: 'relative',
              borderRadius: 10,
              minHeight: 38,
              padding: '0 18px',
              fontWeight: 800,
              fontSize: '13.5px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: activeTab === 'orders' ? '#fff' : 'var(--muted)',
              transition: 'color 0.2s ease',
            }}
          >
            {activeTab === 'orders' && (
              <motion.div
                layoutId="active-order-pill"
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'var(--primary)',
                  borderRadius: 10,
                  zIndex: 0,
                  boxShadow: '0 4px 14px rgba(21, 101, 192, 0.25)',
                }}
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
            <span style={{ position: 'relative', zIndex: 1, display: 'inline-flex', alignItems: 'center', gap: 7 }}>
              <Icon n="creditCard" s={16} />
              Đơn hàng &amp; Giao dịch (<AnimatedCounter value={orderTotalElements} />)
            </span>
          </motion.button>

          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setActiveTab('packages')}
            style={{
              position: 'relative',
              borderRadius: 10,
              minHeight: 38,
              padding: '0 18px',
              fontWeight: 800,
              fontSize: '13.5px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: activeTab === 'packages' ? '#fff' : 'var(--muted)',
              transition: 'color 0.2s ease',
            }}
          >
            {activeTab === 'packages' && (
              <motion.div
                layoutId="active-order-pill"
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'var(--primary)',
                  borderRadius: 10,
                  zIndex: 0,
                  boxShadow: '0 4px 14px rgba(21, 101, 192, 0.25)',
                }}
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
            <span style={{ position: 'relative', zIndex: 1, display: 'inline-flex', alignItems: 'center', gap: 7 }}>
              <Icon n="gem" s={16} />
              Gói cước dịch vụ ({packages.length})
            </span>
          </motion.button>
        </div>
      </div>

      {actionMsg && (
        <div className={actionMsg.error ? 'error' : 'ok'}>
          {actionMsg.text}
        </div>
      )}

      {/* Smooth Tab Content Transition */}
      <AnimatePresence mode="wait">
        {activeTab === 'orders' ? (
          <motion.div
            key="tab-orders"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            style={{ display: 'flex', flexDirection: 'column', gap: 18 }}
          >
            {/* KPI Row */}
            <motion.div
              className="kpi-row"
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
            >
              <motion.div variants={staggerItem} className="kpi">
                <div className="kic" style={{ background: 'var(--tint)', color: 'var(--primary)' }}>
                  <Icon n="creditCard" s={22} />
                </div>
                <div className="lbl">Tổng số giao dịch</div>
                <div className="num">
                  <AnimatedCounter value={orderTotalElements} />
                </div>
                <div className="delta" style={{ color: 'var(--muted)', fontSize: '12.5px', marginTop: 4 }}>
                  Giao dịch qua PayOS · VietQR
                </div>
              </motion.div>

              <motion.div variants={staggerItem} className="kpi">
                <div className="kic" style={{ background: '#DCFCE7', color: '#15803D' }}>
                  <Icon n="check" s={22} />
                </div>
                <div className="lbl" style={{ color: '#15803D' }}>Đơn thành công</div>
                <div className="num" style={{ color: '#15803D' }}>
                  <AnimatedCounter value={payments.filter((p) => p.status === 'SUCCESS').length} />
                </div>
                <div className="delta up">Tài khoản PRO đã kích hoạt</div>
              </motion.div>

              <motion.div variants={staggerItem} className="kpi">
                <div className="kic" style={{ background: 'var(--tint)', color: 'var(--primary-dark)' }}>
                  <Icon n="zap" s={22} />
                </div>
                <div className="lbl">Cổng thanh toán</div>
                <div className="num" style={{ fontSize: '20px', marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>PayOS</span>
                  <span className="pill greensoft" style={{ fontSize: '11px', padding: '2px 8px' }}>Tự động 100%</span>
                </div>
                <div className="delta" style={{ color: 'var(--muted)', fontSize: '12.5px', marginTop: 4 }}>
                  Webhook xác thực bảo mật
                </div>
              </motion.div>
            </motion.div>

            {/* Orders Search & Filter Toolbar */}
            <div className="toolbar">
              <div style={{ flex: 1, minWidth: 260 }}>
                <AutocompleteSearch
                  value={orderSearch}
                  onChange={setOrderSearch}
                  onSearch={(q) => {
                    setOrderPage(0);
                    fetchOrders(q);
                  }}
                  placeholder="Tìm theo mã đơn (ORD_...), mã GD PayOS, email..."
                  type="custom"
                  customItems={orderSuggestions}
                  showButton={true}
                  buttonText="Tìm kiếm"
                  limit={6}
                  inputStyle={{ minHeight: 46 }}
                />
              </div>

              {/* Status Chips */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                {ORDER_STATUS_FILTERS.map((f) => {
                  const isActive = orderStatus === f.id;
                  return (
                    <motion.button
                      key={f.id}
                      type="button"
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.96 }}
                      className={'fchip' + (isActive ? ' on' : '')}
                      onClick={() => {
                        setOrderStatus(f.id);
                        setOrderPage(0);
                      }}
                      style={{
                        position: 'relative',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        transition: 'border-color 0.2s ease, color 0.2s ease',
                      }}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="active-order-status-chip"
                          style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'var(--primary)',
                            borderRadius: 999,
                            zIndex: 0,
                          }}
                          transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                        />
                      )}
                      <span style={{ position: 'relative', zIndex: 1, color: isActive ? '#fff' : 'inherit' }}>
                        {f.label}
                      </span>
                    </motion.button>
                  );
                })}

                <motion.button
                  type="button"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.96 }}
                  className="btn small ghost"
                  onClick={() => fetchOrders()}
                  title="Làm mới danh sách"
                  style={{ minHeight: 46, borderRadius: 999, padding: '0 16px' }}
                >
                  <Icon n="zap" s={15} /> Làm mới
                </motion.button>
              </div>
            </div>

            {/* Orders Table */}
            <MotionCard className="card" style={{ padding: '20px 16px' }}>
              <table className="atable">
                <thead>
                  <tr>
                    <th>Mã đơn hàng</th>
                    <th>Mã GD PayOS</th>
                    <th>Học viên</th>
                    <th>Gói cước</th>
                    <th>Số tiền</th>
                    <th>Trạng thái</th>
                    <th>Thời gian</th>
                    <th style={{ textAlign: 'right' }}>Chi tiết</th>
                  </tr>
                </thead>
                <tbody>
                  {orderLoading ? (
                    <tr>
                      <td colSpan={8} style={{ padding: 48, textAlign: 'center', color: 'var(--muted)' }}>
                        Đang tải danh sách đơn hàng...
                      </td>
                    </tr>
                  ) : payments.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ padding: 48, textAlign: 'center', color: 'var(--muted)' }}>
                        Không có giao dịch nào phù hợp với bộ lọc.
                      </td>
                    </tr>
                  ) : (
                    payments.map((p) => {
                      const isSuccess = p.status === 'SUCCESS';
                      const isPending = p.status === 'PENDING';
                      const isFailed = p.status === 'FAILED';
                      const isCancelled = p.status === 'CANCELLED';

                      return (
                        <tr key={p.paymentId}>
                          <td>
                            <b style={{ color: 'var(--primary-dark)', fontFamily: 'monospace', fontSize: '13.5px' }}>
                              {p.orderCode || `ORD_${p.paymentId}`}
                            </b>
                          </td>
                          <td>
                            <span style={{ fontFamily: 'monospace', fontSize: '12.5px', color: 'var(--muted)' }}>
                              {p.transactionCode || '—'}
                            </span>
                          </td>
                          <td>
                            <div>
                              <b>{p.userFullName || 'Học viên'}</b>
                              <div className="sub" style={{ fontSize: '12px' }}>{p.userEmail}</div>
                            </div>
                          </td>
                          <td>
                            <span className="pill" style={{ background: '#EFF6FF', color: '#1E40AF', fontWeight: 800 }}>
                              {p.packageName || 'Premium 30 ngày'}
                            </span>
                          </td>
                          <td>
                            <b style={{ color: 'var(--ink)', fontSize: '14.5px' }}>
                              {formatVnd(p.amount)}
                            </b>
                          </td>
                          <td>
                            <span
                              className={
                                isSuccess
                                  ? 'pill greensoft'
                                  : isPending
                                  ? 'pill warn'
                                  : isFailed
                                  ? 'pill redsoft'
                                  : 'pill'
                              }
                              style={{ fontWeight: 800 }}
                            >
                              {isSuccess
                                ? 'Thành công'
                                : isPending
                                ? 'Đang chờ'
                                : isCancelled
                                ? 'Đã hủy'
                                : 'Thất bại'}
                            </span>
                          </td>
                          <td style={{ fontSize: '13px', color: 'var(--muted)' }}>
                            {formatDate(p.paidAt || p.createdAt)}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              type="button"
                              className="btn small ghost"
                              onClick={() => viewOrderDetail(p.paymentId)}
                              title="Xem chi tiết giao dịch"
                              disabled={detailLoading}
                              style={{ padding: '6px 10px' }}
                            >
                              <Icon n="eye" s={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>

              {/* Pagination Controls */}
              {orderTotalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--line-soft)' }}>
                  <span style={{ fontSize: '13.5px', color: 'var(--muted)', fontWeight: 600 }}>
                    Trang {orderPage + 1} / {orderTotalPages} · Tổng số {orderTotalElements} giao dịch
                  </span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      className="btn small ghost"
                      disabled={orderPage === 0}
                      onClick={() => setOrderPage((p) => Math.max(0, p - 1))}
                    >
                      Trang trước
                    </button>
                    <button
                      type="button"
                      className="btn small ghost"
                      disabled={orderPage >= orderTotalPages - 1}
                      onClick={() => setOrderPage((p) => p + 1)}
                    >
                      Trang sau
                    </button>
                  </div>
                </div>
              )}
            </MotionCard>
          </motion.div>
        ) : (
          <motion.div
            key="tab-packages"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            style={{ display: 'flex', flexDirection: 'column', gap: 18 }}
          >
            {/* Important Business Rule Notice */}
            <div
              style={{
                padding: '16px 20px',
                borderRadius: 16,
                background: '#EFF6FF',
                border: '1px solid #BFDBFE',
                color: '#1E40AF',
                fontSize: '13.5px',
                lineHeight: 1.5,
                display: 'flex',
                gap: 12,
                alignItems: 'flex-start',
              }}
            >
              <span style={{ fontSize: '18px', lineHeight: 1 }}>ℹ️</span>
              <div>
                <strong>Quy tắc nghiệp vụ:</strong> Việc tạo mới hoặc cập nhật giá/thời hạn gói cước chỉ áp dụng cho các <b>giao dịch thanh toán mới</b> tạo sau đó. Các gói cước và ngày hết hạn mà học viên đã mua trước đây sẽ được hệ thống bảo lưu nguyên vẹn theo đúng cam kết ban đầu.
              </div>
            </div>

            {/* Package Stats Strip */}
            <motion.div
              className="kpi-row"
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
            >
              <motion.div variants={staggerItem} className="kpi">
                <div className="kic" style={{ background: 'var(--tint)', color: 'var(--primary)' }}>
                  <Icon n="gem" s={22} />
                </div>
                <div className="lbl">Tổng số gói</div>
                <div className="num">
                  <AnimatedCounter value={packageStats?.totalPackages ?? packages.length} />
                </div>
                <div className="delta" style={{ color: 'var(--muted)', fontSize: '13px', marginTop: 4 }}>
                  Cấu hình hệ thống
                </div>
              </motion.div>

              <motion.div variants={staggerItem} className="kpi">
                <div className="kic" style={{ background: '#DCFCE7', color: '#15803D' }}>
                  <Icon n="check" s={22} />
                </div>
                <div className="lbl" style={{ color: '#15803D' }}>Đang mở bán</div>
                <div className="num" style={{ color: '#15803D' }}>
                  <AnimatedCounter value={packageStats?.activePackages ?? packages.filter((p) => p.status === 'ACTIVE').length} />
                </div>
                <div className="delta up">Học viên có thể mua</div>
              </motion.div>

              <motion.div variants={staggerItem} className="kpi">
                <div className="kic" style={{ background: 'var(--yellow-bg)', color: '#B45309' }}>
                  <Icon n="clock" s={22} />
                </div>
                <div className="lbl" style={{ color: '#B45309' }}>Tạm ngưng</div>
                <div className="num" style={{ color: '#B45309' }}>
                  <AnimatedCounter value={packageStats?.inactivePackages ?? packages.filter((p) => p.status === 'INACTIVE').length} />
                </div>
                <div className="delta" style={{ color: 'var(--muted)', fontSize: '13px', marginTop: 4 }}>
                  Tạm ngưng mở bán
                </div>
              </motion.div>

              <motion.div variants={staggerItem} className="kpi">
                <div className="kic" style={{ background: '#F1F5F9', color: '#64748B' }}>
                  <Icon n="lock" s={22} />
                </div>
                <div className="lbl">Lưu trữ</div>
                <div className="num" style={{ color: '#64748B' }}>
                  <AnimatedCounter value={packageStats?.archivedPackages ?? packages.filter((p) => p.status === 'ARCHIVED').length} />
                </div>
                <div className="delta" style={{ color: 'var(--muted)', fontSize: '13px', marginTop: 4 }}>
                  Gói cũ ngừng bán
                </div>
              </motion.div>
            </motion.div>

            {/* Packages Search & Action Toolbar */}
            <div className="toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', flex: 1, minWidth: 260 }}>
                <div style={{ flex: 1, minWidth: 260, maxWidth: 420 }}>
                  <AutocompleteSearch
                    value={packageSearch}
                    onChange={(val) => {
                      setPackageSearch(val);
                      fetchPackages(val);
                    }}
                    onSearch={(q) => {
                      setPackageSearch(q);
                      fetchPackages(q);
                    }}
                    placeholder="Tìm theo tên gói hoặc mã code..."
                    type="custom"
                    customItems={packageSuggestions}
                    showButton={true}
                    buttonText="Tìm kiếm"
                    limit={6}
                    inputStyle={{ minHeight: 46 }}
                  />
                </div>

                {/* Status Chips */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  {PACKAGE_STATUS_FILTERS.map((f) => {
                    const isActive = packageStatus === f.id;
                    return (
                      <motion.button
                        key={f.id}
                        type="button"
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.96 }}
                        className={'fchip' + (isActive ? ' on' : '')}
                        onClick={() => setPackageStatus(f.id)}
                        style={{
                          position: 'relative',
                          overflow: 'hidden',
                          cursor: 'pointer',
                          transition: 'border-color 0.2s ease, color 0.2s ease',
                        }}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="active-pkg-status-chip"
                            style={{
                              position: 'absolute',
                              inset: 0,
                              background: 'var(--primary)',
                              borderRadius: 999,
                              zIndex: 0,
                            }}
                            transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                          />
                        )}
                        <span style={{ position: 'relative', zIndex: 1, color: isActive ? '#fff' : 'inherit' }}>
                          {f.label}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              <motion.button
                type="button"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                className="btn green"
                onClick={openCreatePackageModal}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minHeight: 46, padding: '0 22px', borderRadius: 12 }}
              >
                <span style={{ fontSize: '18px', fontWeight: 900 }}>+</span> Tạo gói cước mới
              </motion.button>
            </div>

            {/* Packages Grid Cards */}
            <motion.div
              style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 18 }}
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
            >
              {packageLoading ? (
                <div style={{ gridColumn: '1 / -1', padding: 48, textAlign: 'center', color: 'var(--muted)' }}>
                  Đang tải danh sách gói cước...
                </div>
              ) : packages.length === 0 ? (
                <div style={{ gridColumn: '1 / -1', padding: 48, textAlign: 'center', color: 'var(--muted)' }}>
                  Chưa có gói cước nào trong cơ sở dữ liệu.
                </div>
              ) : (
                packages.map((pkg) => {
                  const isActive = pkg.status === 'ACTIVE';
                  const isArchived = pkg.status === 'ARCHIVED';

                  return (
                    <motion.div key={pkg.id} variants={staggerItem} style={{ display: 'flex' }}>
                      <MotionCard
                        className="card"
                        whileHover={{ y: -4, transition: { duration: 0.2 } }}
                        style={{
                          padding: 24,
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          border: isActive ? '2px solid var(--primary)' : '1px solid var(--line-soft)',
                          position: 'relative',
                          borderRadius: 20,
                          width: '100%',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                            <span
                              className="pill"
                              style={{
                                background: isActive ? '#DCFCE7' : '#F1F5F9',
                                color: isActive ? '#15803D' : '#64748B',
                                fontWeight: 900,
                                fontSize: '11.5px',
                              }}
                            >
                              {isActive ? '● ĐANG MỞ BÁN' : isArchived ? 'ĐÃ LƯU TRỮ' : 'TẠM NGƯNG'}
                            </span>
                            <b style={{ fontFamily: 'monospace', color: 'var(--muted)', fontSize: '12px' }}>
                              {pkg.code}
                            </b>
                          </div>

                          <h3 style={{ fontSize: '20px', fontWeight: 900, marginTop: 14, color: 'var(--ink)' }}>
                            {pkg.name}
                          </h3>

                          <div style={{ fontSize: '32px', fontWeight: 900, color: 'var(--primary-dark)', marginTop: 8 }}>
                            {formatVnd(pkg.price)}
                            <small style={{ fontSize: '14px', fontWeight: 700, color: 'var(--muted)' }}>
                              {' '}/ {pkg.durationDays} ngày
                            </small>
                          </div>

                          <p style={{ color: 'var(--muted)', fontSize: '13.5px', marginTop: 12, minHeight: 40, lineHeight: 1.5 }}>
                            {pkg.description || 'Gói cước học tập toàn diện cùng trợ lý AI Vi không giới hạn.'}
                          </p>
                        </div>

                        <div style={{ borderTop: '1px solid var(--line-soft)', paddingTop: 16, marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                          <button
                            type="button"
                            className="btn small ghost"
                            onClick={() => openEditPackageModal(pkg)}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                          >
                            <Icon n="edit" s={15} /> Sửa gói
                          </button>

                          {!isArchived && (
                            <button
                              type="button"
                              className={isActive ? 'btn small warn' : 'btn small green'}
                              onClick={() => handleTogglePackageStatus(pkg)}
                              style={{ minWidth: 120 }}
                            >
                              {isActive ? 'Tạm ngưng bán' : 'Mở bán lại'}
                            </button>
                          )}
                        </div>
                      </MotionCard>
                    </motion.div>
                  );
                })
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===================== MODAL: ORDER DETAILS ===================== */}
      <AnimatePresence>
        {selectedPayment && (
          <motion.div
            className="modal-backdrop"
            onClick={() => setSelectedPayment(null)}
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <motion.div
              className="modal"
              style={{ maxWidth: 640 }}
              onClick={(e) => e.stopPropagation()}
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--line-soft)', paddingBottom: 14 }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 900 }}>
                  Chi tiết Giao dịch #{selectedPayment.paymentId}
                </h3>
                <button
                  type="button"
                  className="btn small ghost"
                  onClick={() => setSelectedPayment(null)}
                  style={{ padding: 6, borderRadius: '50%' }}
                >
                  <Icon n="x" s={18} />
                </button>
              </div>

              <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 18 }}>
                {/* Payment Overview Box */}
                <div style={{ background: '#F8FAFC', padding: 16, borderRadius: 14, border: '1px solid var(--line-soft)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 700 }}>Số tiền thanh toán:</span>
                    <b style={{ fontSize: '22px', color: 'var(--green-dark)', fontWeight: 900 }}>
                      {formatVnd(selectedPayment.amount)}
                    </b>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                    <span style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 700 }}>Trạng thái:</span>
                    <span className="pill greensoft" style={{ fontWeight: 800 }}>
                      {selectedPayment.status}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                    <span style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 700 }}>Mã đơn (Order Code):</span>
                    <b style={{ fontFamily: 'monospace', fontSize: '13px' }}>{selectedPayment.orderCode || '—'}</b>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                    <span style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 700 }}>Mã GD Cổng PayOS:</span>
                    <b style={{ fontFamily: 'monospace', fontSize: '13px' }}>{selectedPayment.transactionCode || '—'}</b>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                    <span style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 700 }}>Thời gian thanh toán:</span>
                    <span style={{ fontSize: '13px', fontWeight: 700 }}>{formatDate(selectedPayment.paidAt)}</span>
                  </div>
                </div>

                {/* Customer Details */}
                <div>
                  <h4 style={{ margin: '0 0 8px', fontSize: '14.5px', fontWeight: 900, color: 'var(--ink)' }}>
                    Thông tin Khách hàng
                  </h4>
                  <div style={{ background: '#fff', border: '1px solid var(--line-soft)', padding: 14, borderRadius: 12 }}>
                    <div><b>Họ tên:</b> {selectedPayment.userFullName || '—'}</div>
                    <div style={{ marginTop: 4 }}><b>Email tài khoản:</b> {selectedPayment.userEmail}</div>
                    <div style={{ marginTop: 4 }}><b>Mã ID người dùng:</b> #{selectedPayment.userId}</div>
                  </div>
                </div>

                {/* Subscription Granted */}
                {selectedPayment.subscription && (
                  <div>
                    <h4 style={{ margin: '0 0 8px', fontSize: '14.5px', fontWeight: 900, color: 'var(--ink)' }}>
                      Gói dịch vụ đã cấp (Subscription)
                    </h4>
                    <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', padding: 14, borderRadius: 12 }}>
                      <div><b>Tên gói:</b> {selectedPayment.subscription.packageName}</div>
                      <div style={{ marginTop: 4 }}><b>Trạng thái gói:</b> <span className="pill greensoft">{selectedPayment.subscription.status}</span></div>
                      <div style={{ marginTop: 4 }}><b>Ngày kích hoạt:</b> {formatDate(selectedPayment.subscription.startAt)}</div>
                      <div style={{ marginTop: 4 }}><b>Ngày hết hạn:</b> {formatDate(selectedPayment.subscription.endAt)}</div>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ marginTop: 22, display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn small"
                  onClick={() => setSelectedPayment(null)}
                >
                  Đóng
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===================== MODAL: CREATE / EDIT PACKAGE ===================== */}
      <AnimatePresence>
        {isPackageModalOpen && (
          <motion.div
            className="modal-backdrop"
            onClick={() => setIsPackageModalOpen(false)}
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <motion.div
              className="modal"
              style={{ maxWidth: 540 }}
              onClick={(e) => e.stopPropagation()}
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--line-soft)', paddingBottom: 14 }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 900 }}>
                  {editingPackage ? `Sửa Gói Cước #${editingPackage.id}` : 'Tạo Gói Cước Mới'}
                </h3>
                <button
                  type="button"
                  className="btn small ghost"
                  onClick={() => setIsPackageModalOpen(false)}
                  style={{ padding: 6, borderRadius: '50%' }}
                >
                  <Icon n="x" s={18} />
                </button>
              </div>

              <form onSubmit={handleSavePackage} style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="field">
                  <label>Mã code gói (* Viết hoa, không dấu)</label>
                  <input
                    type="text"
                    className="input"
                    value={pkgFormCode}
                    onChange={(e) => setPkgFormCode(e.target.value.toUpperCase())}
                    placeholder="VD: PREMIUM_MONTHLY"
                    disabled={!!editingPackage}
                    required
                    style={{ textTransform: 'uppercase', fontFamily: 'monospace', minHeight: 46 }}
                  />
                  {editingPackage && (
                    <small style={{ color: 'var(--muted)', marginTop: 4, display: 'block' }}>
                      Mã code không thể thay đổi sau khi tạo để đảm bảo liên kết dữ liệu đơn hàng.
                    </small>
                  )}
                </div>

                <div className="field">
                  <label>Tên gói hiển thị (*)</label>
                  <input
                    type="text"
                    className="input"
                    value={pkgFormName}
                    onChange={(e) => setPkgFormName(e.target.value)}
                    placeholder="VD: Gói Premium 30 ngày"
                    required
                    style={{ minHeight: 46 }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="field">
                    <label>Giá bán (VND) (*)</label>
                    <input
                      type="number"
                      className="input"
                      value={pkgFormPrice}
                      onChange={(e) => setPkgFormPrice(Number(e.target.value))}
                      placeholder="99000"
                      min={1000}
                      step={1000}
                      required
                      style={{ minHeight: 46 }}
                    />
                  </div>

                  <div className="field">
                    <label>Thời hạn sử dụng (Số ngày) (*)</label>
                    <input
                      type="number"
                      className="input"
                      value={pkgFormDays}
                      onChange={(e) => setPkgFormDays(Number(e.target.value))}
                      placeholder="30"
                      min={1}
                      required
                      style={{ minHeight: 46 }}
                    />
                  </div>
                </div>

                <div className="field">
                  <label>Trạng thái mở bán</label>
                  <select
                    className="input"
                    value={pkgFormStatus}
                    onChange={(e) => setPkgFormStatus(e.target.value as any)}
                    style={{ minHeight: 46 }}
                  >
                    <option value="ACTIVE">ACTIVE — Đang mở bán</option>
                    <option value="INACTIVE">INACTIVE — Tạm ngưng bán</option>
                    {editingPackage && <option value="ARCHIVED">ARCHIVED — Lưu trữ</option>}
                  </select>
                </div>

                <div className="field">
                  <label>Mô tả gói cước (Tính năng nổi bật)</label>
                  <textarea
                    className="input"
                    rows={3}
                    value={pkgFormDesc}
                    onChange={(e) => setPkgFormDesc(e.target.value)}
                    placeholder="Mở khóa toàn bộ từ vựng Oxford C1, Chat AI Vi không giới hạn..."
                    style={{ minHeight: 76, padding: '10px 14px' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12, paddingTop: 14, borderTop: '1px solid var(--line-soft)' }}>
                  <button
                    type="button"
                    className="btn small ghost"
                    onClick={() => setIsPackageModalOpen(false)}
                    disabled={pkgSubmitting}
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    className="btn small green"
                    disabled={pkgSubmitting}
                  >
                    {pkgSubmitting ? 'Đang lưu...' : editingPackage ? 'Lưu thay đổi' : 'Tạo gói cước'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
