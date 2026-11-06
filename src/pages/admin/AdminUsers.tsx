import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { adminApi } from '../../api';
import type { AdminStudent, AdminStudentDetail } from '../../api';
import { useAuth } from '../../auth/AuthContext';
import { AutocompleteSearch } from '../../components/AutocompleteSearch';
import { Icon } from '../../components/icons';
import { MotionCard, AnimatedCounter, modalVariants, backdropVariants } from '../../motion';

const STATUS_FILTERS = [
  { id: 'ALL', label: 'Tất cả' },
  { id: 'ACTIVE', label: 'Đang hoạt động' },
  { id: 'INACTIVE', label: 'Chưa kích hoạt' },
  { id: 'BANNED', label: 'Đã khóa' },
];

const ROLE_TABS = [
  { id: 'STUDENT', label: 'Học viên', icon: 'user' },
  { id: 'INSTRUCTOR', label: 'Instructor', icon: 'zap' },
] as const;

export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'ADMIN';

  const [roleTab, setRoleTab] = useState<'STUDENT' | 'INSTRUCTOR'>('STUDENT');
  const [students, setStudents] = useState<AdminStudent[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<AdminStudentDetail | null>(null);
  const [actionMsg, setActionMsg] = useState<{ text: string; error?: boolean } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Modal tạo tài khoản Instructor
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    username: '',
    email: '',
    fullName: '',
    password: '',
    confirmPassword: '',
  });
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSubmitting, setCreateSubmitting] = useState(false);

  useEffect(() => {
    if (selectedUser || showCreateModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedUser, showCreateModal]);

  const fetchUsers = async (overrideSearch?: string) => {
    setLoading(true);
    try {
      const queryToUse = typeof overrideSearch === 'string' ? overrideSearch : search;
      const res = await adminApi.students(page, 15, queryToUse, statusFilter, roleTab);
      if (res.data) {
        setStudents(res.data.content || []);
        setTotalElements(res.data.totalElements || 0);
        setTotalPages(res.data.totalPages || 1);
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, statusFilter, roleTab]);

  const handleSearch = (customQuery?: string) => {
    const q = typeof customQuery === 'string' ? customQuery : search;
    setPage(0);
    fetchUsers(q);
  };

  const handleStatusChange = async (userId: number, newStatus: 'ACTIVE' | 'INACTIVE' | 'BANNED') => {
    if (!confirm(`Bạn có chắc muốn chuyển trạng thái tài khoản ID #${userId} sang "${newStatus}"?`)) {
      return;
    }
    try {
      await adminApi.updateUserStatus(userId, newStatus);
      setActionMsg({ text: `Đã cập nhật trạng thái người dùng #${userId} thành công!` });
      await fetchUsers();
      if (selectedUser && selectedUser.userId === userId) {
        setSelectedUser({ ...selectedUser, status: newStatus });
      }
      setTimeout(() => setActionMsg(null), 4000);
    } catch (e: any) {
      setActionMsg({ text: 'Lỗi cập nhật: ' + (e?.message || 'Không thể thực hiện'), error: true });
    }
  };

  const viewDetail = async (userId: number) => {
    setDetailLoading(true);
    try {
      const res = await adminApi.studentDetail(userId);
      if (res.data) {
        setSelectedUser(res.data);
      }
    } catch (e: any) {
      alert('Không thể tải chi tiết: ' + (e?.message || 'Lỗi server'));
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCreateInstructorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    // Validation
    const username = createForm.username.trim();
    const email = createForm.email.trim();
    const fullName = createForm.fullName.trim();
    const password = createForm.password;
    const confirmPassword = createForm.confirmPassword;

    if (!username || username.length < 3) {
      setCreateError('Tên đăng nhập phải có ít nhất 3 ký tự (chữ cái, số, gạch dưới).');
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setCreateError('Tên đăng nhập chỉ được chứa chữ cái, số và dấu gạch dưới (_).');
      return;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setCreateError('Email không hợp lệ.');
      return;
    }
    if (!fullName || fullName.length < 2) {
      setCreateError('Họ và tên phải có ít nhất 2 ký tự.');
      return;
    }
    if (!password || password.length < 6) {
      setCreateError('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }
    if (password !== confirmPassword) {
      setCreateError('Mật khẩu xác nhận không khớp.');
      return;
    }

    setCreateSubmitting(true);
    try {
      await adminApi.createInstructor({ username, email, fullName, password });
      setShowCreateModal(false);
      setCreateForm({ username: '', email: '', fullName: '', password: '', confirmPassword: '' });
      setActionMsg({ text: `Tạo tài khoản Instructor "${username}" thành công!` });
      setTimeout(() => setActionMsg(null), 5000);

      // Chuyển sang tab Instructor để xem ngay tài khoản vừa tạo
      if (roleTab !== 'INSTRUCTOR') {
        setRoleTab('INSTRUCTOR');
      } else {
        setPage(0);
        fetchUsers();
      }
    } catch (err: any) {
      console.error('Create instructor error:', err);
      const msg = err?.response?.data?.message || err?.message || 'Lỗi khi tạo tài khoản Instructor.';
      setCreateError(msg);
    } finally {
      setCreateSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Title + Action */}
      <div className="pagehead" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1>{roleTab === 'STUDENT' ? 'Quản lý Học viên' : 'Quản lý Instructor'}</h1>
          <div className="sub">
            <AnimatedCounter value={totalElements} /> {roleTab === 'STUDENT' ? 'học viên' : 'instructor'} · tìm kiếm, lọc theo trạng thái và quản lý tài khoản
          </div>
        </div>

        {isAdmin && (
          <button
            type="button"
            className="btn primary"
            onClick={() => {
              setCreateError(null);
              setCreateForm({ username: '', email: '', fullName: '', password: '', confirmPassword: '' });
              setShowCreateModal(true);
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              fontWeight: 700,
              padding: '10px 18px',
              borderRadius: 12,
              boxShadow: '0 4px 14px rgba(24, 119, 242, 0.25)',
              cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: 16 }}>＋</span> Tạo tài khoản Instructor
          </button>
        )}
      </div>

      {actionMsg && (
        <div className={actionMsg.error ? 'error' : 'ok'}>
          {actionMsg.text}
        </div>
      )}

      {/* Role Tabs */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--border-soft, #E2E8F0)', paddingBottom: 12 }}>
        {ROLE_TABS.map((tab) => {
          const isActive = roleTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                if (roleTab !== tab.id) {
                  setRoleTab(tab.id);
                  setPage(0);
                }
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '9px 18px',
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                background: isActive ? 'var(--primary, #1877F2)' : 'var(--card-bg, #FFFFFF)',
                color: isActive ? '#FFFFFF' : 'var(--muted, #64748B)',
                boxShadow: isActive ? '0 4px 12px rgba(24, 119, 242, 0.22)' : 'none',
              }}
            >
              <Icon n={tab.icon as any} s={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Toolbar: Search + Filter Chips */}
      <div className="toolbar">
        <div style={{ flex: 1, minWidth: 260 }}>
          <AutocompleteSearch
            value={search}
            onChange={setSearch}
            onSearch={handleSearch}
            placeholder={roleTab === 'STUDENT' ? "Tìm theo tên đăng nhập, email, họ tên học viên..." : "Tìm theo tên đăng nhập, email, họ tên instructor..."}
            type="admin-users"
            showButton={true}
            buttonText="Tìm kiếm"
            limit={8}
            inputStyle={{ minHeight: 46 }}
          />
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={'fchip' + (statusFilter === f.id ? ' on' : '')}
              onClick={() => {
                setStatusFilter(f.id);
                setPage(0);
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table Card */}
      <MotionCard className="card" style={{ padding: '20px 14px' }}>
        <table className="atable">
          <thead>
            <tr>
              <th>{roleTab === 'STUDENT' ? 'Học viên' : 'Giảng viên'}</th>
              <th>Mã ID</th>
              <th>Vai trò</th>
              <th>Trạng thái</th>
              <th>{roleTab === 'STUDENT' ? 'Từ đã học' : 'Từ vựng'}</th>
              <th>{roleTab === 'STUDENT' ? 'Số buổi học' : 'Phiên hoạt động'}</th>
              <th>Ngày tham gia</th>
              <th style={{ textAlign: 'right' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
                  Đang tải danh sách...
                </td>
              </tr>
            ) : students.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
                  {roleTab === 'STUDENT'
                    ? 'Không tìm thấy học viên nào phù hợp.'
                    : 'Không tìm thấy Instructor nào phù hợp.'}
                </td>
              </tr>
            ) : (
              students.map((u, idx) => {
                const isActive = u.status === 'ACTIVE';
                const isBanned = u.status === 'BANNED';
                const userRole = u.role || roleTab;
                return (
                  <tr key={u.userId}>
                    <td>
                      <div style={{ display: 'flex', gap: 11, alignItems: 'center' }}>
                        <span
                          className="uavatar sm"
                          style={{
                            background:
                              userRole === 'INSTRUCTOR'
                                ? '#8B5CF6'
                                : idx % 3 === 0
                                ? 'var(--primary)'
                                : idx % 3 === 1
                                ? 'var(--green)'
                                : 'var(--yellow-dark)',
                          }}
                        >
                          {(u.fullName || u.username || 'U')[0].toUpperCase()}
                        </span>
                        <div>
                          <b>{u.fullName || u.username}</b>
                          <div className="sub">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <b style={{ color: 'var(--muted)' }}>#{u.userId}</b>
                    </td>
                    <td>
                      <span
                        className="pill"
                        style={{
                          background: userRole === 'INSTRUCTOR' ? 'rgba(139, 92, 246, 0.12)' : 'rgba(24, 119, 242, 0.1)',
                          color: userRole === 'INSTRUCTOR' ? '#7C3AED' : 'var(--primary)',
                          fontWeight: 700,
                        }}
                      >
                        {userRole}
                      </span>
                    </td>
                    <td>
                      <span
                        className={
                          isActive ? 'pill greensoft' : isBanned ? 'pill redsoft' : 'pill warn'
                        }
                      >
                        {isActive ? 'Đang hoạt động' : isBanned ? 'Đã khóa' : u.status}
                      </span>
                    </td>
                    <td>
                      <b>{u.wordsLearned ?? 0}</b>
                    </td>
                    <td>
                      <b>{u.totalSessions ?? 0}</b>
                    </td>
                    <td style={{ color: 'var(--muted)', fontSize: 13.5 }}>
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString('vi-VN') : '—'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        <button
                          type="button"
                          className="btn ghost sm"
                          onClick={() => viewDetail(u.userId)}
                          disabled={detailLoading}
                          title="Xem chi tiết"
                          style={{ padding: '4px 10px', fontSize: 12.5 }}
                        >
                          Chi tiết
                        </button>
                        {isAdmin && (
                          isActive ? (
                            <button
                              type="button"
                              className="btn ghost sm"
                              onClick={() => handleStatusChange(u.userId, 'BANNED')}
                              title="Khóa tài khoản này"
                              style={{
                                padding: '4px 10px',
                                fontSize: 12.5,
                                color: 'var(--red-dark)',
                                borderColor: 'rgba(229,72,77,0.3)',
                              }}
                            >
                              Khóa
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="btn ghost sm"
                              onClick={() => handleStatusChange(u.userId, 'ACTIVE')}
                              title="Mở khóa tài khoản"
                              style={{
                                padding: '4px 10px',
                                fontSize: 12.5,
                                color: 'var(--green-dark)',
                                borderColor: 'rgba(53,158,125,0.3)',
                              }}
                            >
                              Mở khóa
                            </button>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </MotionCard>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="row" style={{ alignItems: 'center' }}>
          <span className="sub">
            Trang <b>{page + 1}</b> / <b>{totalPages}</b> · {totalElements} {roleTab === 'STUDENT' ? 'học viên' : 'instructor'}
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              className="pagebtn"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              ‹
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pNum = i;
              return (
                <button
                  key={pNum}
                  type="button"
                  className={'pagebtn' + (page === pNum ? ' on' : '')}
                  onClick={() => setPage(pNum)}
                >
                  {pNum + 1}
                </button>
              );
            })}
            <button
              type="button"
              className="pagebtn"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            >
              ›
            </button>
          </div>
        </div>
      )}

      {/* Modal Tạo Tài Khoản Instructor */}
      {showCreateModal &&
        createPortal(
          <AnimatePresence>
            <div
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 99999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 16,
              }}
            >
              <motion.div
                className="scrim"
                style={{
                  position: 'fixed',
                  inset: 0,
                  zIndex: 1,
                  background: 'rgba(10, 37, 64, 0.55)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                }}
                variants={backdropVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                onClick={() => {
                  if (!createSubmitting) setShowCreateModal(false);
                }}
              />

              <motion.div
                className="modal"
                style={{
                  position: 'relative',
                  top: 'auto',
                  left: 'auto',
                  transform: 'none',
                  maxWidth: 500,
                  width: '100%',
                  zIndex: 2,
                  margin: 0,
                  borderRadius: 24,
                  boxShadow: '0 25px 70px rgba(10, 37, 64, 0.35)',
                  background: '#ffffff',
                  padding: '28px 30px',
                }}
                variants={modalVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="row" style={{ alignItems: 'flex-start', marginBottom: 18 }}>
                  <div>
                    <h2 style={{ fontSize: 20, fontWeight: 900, color: 'var(--ink)', margin: 0 }}>
                      Tạo tài khoản Instructor
                    </h2>
                    <div className="sub mt8" style={{ fontSize: 13, color: 'var(--muted)' }}>
                      Tài khoản sẽ được kích hoạt ngay với quyền Giảng viên (INSTRUCTOR)
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn ghost sm"
                    onClick={() => setShowCreateModal(false)}
                    disabled={createSubmitting}
                    style={{ padding: '6px 10px', borderRadius: 8, cursor: 'pointer' }}
                  >
                    ✕
                  </button>
                </div>

                {createError && (
                  <div
                    style={{
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      color: '#DC2626',
                      padding: '10px 14px',
                      borderRadius: 12,
                      fontSize: 13.5,
                      fontWeight: 600,
                      marginBottom: 16,
                    }}
                  >
                    {createError}
                  </div>
                )}

                <form onSubmit={handleCreateInstructorSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, marginBottom: 6, color: 'var(--ink)' }}>
                      Tên đăng nhập (Username) <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      className="input"
                      placeholder="ví dụ: giangvien_lan"
                      value={createForm.username}
                      onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                      required
                      disabled={createSubmitting}
                      style={{ width: '100%', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, marginBottom: 6, color: 'var(--ink)' }}>
                      Email <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <input
                      type="email"
                      className="input"
                      placeholder="giangvien@example.com"
                      value={createForm.email}
                      onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                      required
                      disabled={createSubmitting}
                      style={{ width: '100%', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, marginBottom: 6, color: 'var(--ink)' }}>
                      Họ và tên <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      className="input"
                      placeholder="Nguyễn Thị Lan"
                      value={createForm.fullName}
                      onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
                      required
                      disabled={createSubmitting}
                      style={{ width: '100%', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, marginBottom: 6, color: 'var(--ink)' }}>
                      Mật khẩu khởi tạo <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <input
                      type="password"
                      className="input"
                      placeholder="Ít nhất 6 ký tự..."
                      value={createForm.password}
                      onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                      required
                      disabled={createSubmitting}
                      style={{ width: '100%', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, marginBottom: 6, color: 'var(--ink)' }}>
                      Nhập lại mật khẩu <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <input
                      type="password"
                      className="input"
                      placeholder="Xác nhận mật khẩu..."
                      value={createForm.confirmPassword}
                      onChange={(e) => setCreateForm({ ...createForm, confirmPassword: e.target.value })}
                      required
                      disabled={createSubmitting}
                      style={{ width: '100%', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
                    <button
                      type="button"
                      className="btn ghost"
                      onClick={() => setShowCreateModal(false)}
                      disabled={createSubmitting}
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      className="btn primary"
                      disabled={createSubmitting}
                      style={{ minWidth: 140, fontWeight: 700 }}
                    >
                      {createSubmitting ? 'Đang tạo...' : 'Tạo tài khoản'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          </AnimatePresence>,
          document.body
        )}

      {/* User Detail Modal */}
      {selectedUser &&
        createPortal(
          <AnimatePresence>
            <div
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 99999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 16,
              }}
            >
              {/* Full-screen Dark Backdrop Scrim & Blur */}
              <motion.div
                className="scrim"
                style={{
                  position: 'fixed',
                  inset: 0,
                  zIndex: 1,
                  background: 'rgba(10, 37, 64, 0.55)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                }}
                variants={backdropVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                onClick={() => setSelectedUser(null)}
              />

              {/* Centered Modal Content Card */}
              <motion.div
                className="modal"
                style={{
                  position: 'relative',
                  top: 'auto',
                  left: 'auto',
                  transform: 'none',
                  maxWidth: 560,
                  width: '100%',
                  zIndex: 2,
                  margin: 0,
                  borderRadius: 24,
                  boxShadow: '0 25px 70px rgba(10, 37, 64, 0.35)',
                  background: '#ffffff',
                  padding: '28px 30px',
                }}
                variants={modalVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="row" style={{ alignItems: 'flex-start', marginBottom: 20 }}>
                  <div>
                    <h2 style={{ fontSize: 20, fontWeight: 900, color: 'var(--ink)', margin: 0 }}>
                      {selectedUser.role === 'INSTRUCTOR' ? 'Hồ sơ Instructor' : 'Hồ sơ Học viên'} #{selectedUser.userId}
                    </h2>
                    <div className="sub mt8" style={{ fontSize: 13, color: 'var(--muted)' }}>
                      {selectedUser.email}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn ghost sm"
                    onClick={() => setSelectedUser(null)}
                    style={{ padding: '6px 10px', borderRadius: 8, cursor: 'pointer' }}
                  >
                    ✕
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 22 }}>
                  <div style={{ padding: '12px 14px', background: '#F8FAFC', borderRadius: 14, border: '1px solid #E2E8F0' }}>
                    <span className="sub" style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      TÊN TÀI KHOẢN
                    </span>
                    <div style={{ fontWeight: 800, fontSize: 15, marginTop: 4, color: 'var(--ink)' }}>
                      @{selectedUser.username}
                    </div>
                  </div>

                  <div style={{ padding: '12px 14px', background: '#F8FAFC', borderRadius: 14, border: '1px solid #E2E8F0' }}>
                    <span className="sub" style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      HỌ VÀ TÊN
                    </span>
                    <div style={{ fontWeight: 800, fontSize: 15, marginTop: 4, color: 'var(--ink)' }}>
                      {selectedUser.fullName || '—'}
                    </div>
                  </div>

                  <div style={{ padding: '12px 14px', background: '#F8FAFC', borderRadius: 14, border: '1px solid #E2E8F0' }}>
                    <span className="sub" style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      VAI TRÒ
                    </span>
                    <div style={{ fontWeight: 800, fontSize: 15, marginTop: 4 }}>
                      <span
                        className="pill"
                        style={{
                          background: selectedUser.role === 'INSTRUCTOR' ? 'rgba(139, 92, 246, 0.12)' : 'rgba(24, 119, 242, 0.1)',
                          color: selectedUser.role === 'INSTRUCTOR' ? '#7C3AED' : 'var(--primary)',
                          fontWeight: 700,
                        }}
                      >
                        {selectedUser.role || roleTab}
                      </span>
                    </div>
                  </div>

                  <div style={{ padding: '12px 14px', background: '#F8FAFC', borderRadius: 14, border: '1px solid #E2E8F0' }}>
                    <span className="sub" style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      TRẠNG THÁI HIỆN TẠI
                    </span>
                    <div style={{ fontWeight: 800, fontSize: 15, marginTop: 4 }}>
                      <span
                        className={
                          selectedUser.status === 'ACTIVE'
                            ? 'pill greensoft'
                            : selectedUser.status === 'BANNED'
                            ? 'pill redsoft'
                            : 'pill warn'
                        }
                      >
                        {selectedUser.status}
                      </span>
                    </div>
                  </div>

                  <div style={{ padding: '12px 14px', background: '#F8FAFC', borderRadius: 14, border: '1px solid #E2E8F0' }}>
                    <span className="sub" style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      TỪ ĐÃ HỌC
                    </span>
                    <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--green-dark)', marginTop: 4 }}>
                      {selectedUser.wordsLearned ?? 0} từ
                    </div>
                  </div>

                  <div style={{ padding: '12px 14px', background: '#F8FAFC', borderRadius: 14, border: '1px solid #E2E8F0' }}>
                    <span className="sub" style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      TỔNG BUỔI HỌC
                    </span>
                    <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--primary)', marginTop: 4 }}>
                      {selectedUser.totalSessions ?? 0} buổi
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  {isAdmin && (
                    selectedUser.status === 'ACTIVE' ? (
                      <button
                        type="button"
                        className="btn"
                        style={{ background: 'var(--red)', border: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                        onClick={() => handleStatusChange(selectedUser.userId, 'BANNED')}
                      >
                        <Icon n="lock" s={16} /> Khóa tài khoản
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn"
                        style={{ background: 'var(--green)', border: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                        onClick={() => handleStatusChange(selectedUser.userId, 'ACTIVE')}
                      >
                        <Icon n="check" s={16} /> Kích hoạt tài khoản
                      </button>
                    )
                  )}
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() => setSelectedUser(null)}
                  >
                    Đóng
                  </button>
                </div>
              </motion.div>
            </div>
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
}
