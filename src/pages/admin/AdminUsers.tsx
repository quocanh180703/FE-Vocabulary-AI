import { useEffect, useState } from 'react';
import { adminApi } from '../../api';
import type { AdminStudent, AdminStudentDetail } from '../../api';
import { AutocompleteSearch } from '../../components/AutocompleteSearch';
import { Icon } from '../../components/icons';

const STATUS_FILTERS = [
  { id: 'ALL', label: 'Tất cả' },
  { id: 'ACTIVE', label: 'Đang hoạt động' },
  { id: 'INACTIVE', label: 'Chưa kích hoạt' },
  { id: 'BANNED', label: 'Đã khóa' },
];

export default function AdminUsers() {
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

  const fetchUsers = async (overrideSearch?: string) => {
    setLoading(true);
    try {
      const queryToUse = typeof overrideSearch === 'string' ? overrideSearch : search;
      const res = await adminApi.students(page, 15, queryToUse, statusFilter);
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
  }, [page, statusFilter]);

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
      alert('Không thể tải chi tiết học viên: ' + (e?.message || 'Lỗi server'));
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Title */}
      <div className="pagehead">
        <h1>Quản lý Học viên</h1>
        <div className="sub">
          {totalElements} học viên · tìm kiếm, lọc theo trạng thái và quản lý tài khoản
        </div>
      </div>

      {actionMsg && (
        <div className={actionMsg.error ? 'error' : 'ok'}>
          {actionMsg.text}
        </div>
      )}

      {/* Toolbar: Search + Filter Chips */}
      <div className="toolbar">
        <div style={{ flex: 1, minWidth: 260 }}>
          <AutocompleteSearch
            value={search}
            onChange={setSearch}
            onSearch={handleSearch}
            placeholder="Tìm theo tên đăng nhập, email, họ tên..."
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
      <div className="card" style={{ padding: '20px 14px' }}>
        <table className="atable">
          <thead>
            <tr>
              <th>Học viên</th>
              <th>Mã ID</th>
              <th>Trạng thái</th>
              <th>Từ đã học</th>
              <th>Số buổi học</th>
              <th>Ngày tham gia</th>
              <th style={{ textAlign: 'right' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
                  Đang tải danh sách người dùng...
                </td>
              </tr>
            ) : students.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
                  Không tìm thấy người dùng nào phù hợp.
                </td>
              </tr>
            ) : (
              students.map((u, idx) => {
                const isActive = u.status === 'ACTIVE';
                const isBanned = u.status === 'BANNED';
                return (
                  <tr key={u.userId}>
                    <td>
                      <div style={{ display: 'flex', gap: 11, alignItems: 'center' }}>
                        <span
                          className="uavatar sm"
                          style={{
                            background:
                              idx % 3 === 0
                                ? 'var(--primary)'
                                : idx % 3 === 1
                                ? 'var(--green)'
                                : 'var(--yellow-dark)',
                          }}
                        >
                          {(u.fullName || u.username || 'H')[0].toUpperCase()}
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
                          title="Xem chi tiết học viên"
                          style={{ padding: '4px 10px', fontSize: 12.5 }}
                        >
                          Chi tiết
                        </button>
                        {isActive ? (
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
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="row" style={{ alignItems: 'center' }}>
          <span className="sub">
            Trang <b>{page + 1}</b> / <b>{totalPages}</b> · {totalElements} học viên
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

      {/* User Detail Modal */}
      {selectedUser && (
        <>
          <div className="scrim" onClick={() => setSelectedUser(null)} />
          <div className="modal" style={{ maxWidth: 580 }}>
            <div className="row" style={{ alignItems: 'flex-start', marginBottom: 18 }}>
              <div>
                <h2 style={{ fontSize: 20 }}>Hồ sơ Học viên #{selectedUser.userId}</h2>
                <div className="sub mt8">{selectedUser.email}</div>
              </div>
              <button
                type="button"
                className="btn ghost sm"
                onClick={() => setSelectedUser(null)}
                style={{ padding: '4px 8px' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
              <div className="card" style={{ padding: 12 }}>
                <span className="sub" style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>
                  TÊN TÀI KHOẢN
                </span>
                <div style={{ fontWeight: 800, fontSize: 15, marginTop: 4 }}>
                  @{selectedUser.username}
                </div>
              </div>

              <div className="card" style={{ padding: 12 }}>
                <span className="sub" style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>
                  HỌ VÀ TÊN
                </span>
                <div style={{ fontWeight: 800, fontSize: 15, marginTop: 4 }}>
                  {selectedUser.fullName || '—'}
                </div>
              </div>

              <div className="card" style={{ padding: 12 }}>
                <span className="sub" style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>
                  TỪ ĐÃ HỌC
                </span>
                <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--green-dark)', marginTop: 4 }}>
                  {selectedUser.wordsLearned ?? 0} từ
                </div>
              </div>

              <div className="card" style={{ padding: 12 }}>
                <span className="sub" style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>
                  TỔNG BUỔI HỌC
                </span>
                <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--primary)', marginTop: 4 }}>
                  {selectedUser.totalSessions ?? 0} buổi
                </div>
              </div>

              <div className="card" style={{ padding: 12 }}>
                <span className="sub" style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>
                  ĐỘ CHÍNH XÁC
                </span>
                <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--yellow-dark)', marginTop: 4 }}>
                  {selectedUser.accuracyRate ? `${selectedUser.accuracyRate}%` : '—'}
                </div>
              </div>

              <div className="card" style={{ padding: 12 }}>
                <span className="sub" style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>
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
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              {selectedUser.status === 'ACTIVE' ? (
                <button
                  type="button"
                  className="btn"
                  style={{ background: 'var(--red)', border: 'none' }}
                  onClick={() => handleStatusChange(selectedUser.userId, 'BANNED')}
                >
                  <Icon n="lock" s={16} /> Khóa tài khoản
                </button>
              ) : (
                <button
                  type="button"
                  className="btn"
                  style={{ background: 'var(--green)', border: 'none' }}
                  onClick={() => handleStatusChange(selectedUser.userId, 'ACTIVE')}
                >
                  <Icon n="check" s={16} /> Kích hoạt tài khoản
                </button>
              )}
              <button
                type="button"
                className="btn ghost"
                onClick={() => setSelectedUser(null)}
              >
                Đóng
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
