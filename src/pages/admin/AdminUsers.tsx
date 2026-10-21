import { useEffect, useState } from 'react';
import { adminApi } from '../../api';
import type { AdminStudent, AdminStudentDetail } from '../../api';
import { AutocompleteSearch } from '../../components/AutocompleteSearch';

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
    <div style={{ maxWidth: 1240, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: '1.9rem', fontWeight: 900, margin: 0, color: '#0F172A', letterSpacing: '-0.5px' }}>
            Quản lý Người dùng & Học viên
          </h1>
          <p style={{ margin: '4px 0 0 0', color: '#64748B', fontSize: '0.94rem' }}>
            Tổng số: <b style={{ color: '#0F172A' }}>{totalElements}</b> tài khoản được ghi nhận trong cơ sở dữ liệu
          </p>
        </div>
      </div>

      {actionMsg && (
        <div style={{
          background: actionMsg.error ? '#FEE2E2' : '#D1FAE5',
          color: actionMsg.error ? '#991B1B' : '#065F46',
          border: `1px solid ${actionMsg.error ? '#FCA5A5' : '#6EE7B7'}`,
          padding: '12px 18px',
          borderRadius: 12,
          marginBottom: 20,
          fontWeight: 600,
          fontSize: '0.92rem'
        }}>
          {actionMsg.text}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: 16,
        padding: '18px 22px',
        border: '1px solid #E2E8F0',
        boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
        marginBottom: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16
      }}>
        <div style={{ flex: 1, minWidth: 280 }}>
          <AutocompleteSearch
            value={search}
            onChange={setSearch}
            onSearch={handleSearch}
            placeholder="Tìm theo tên đăng nhập, email, họ tên..."
            type="admin-users"
            showButton={true}
            buttonText="Tìm kiếm"
            limit={8}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#64748B' }}>Trạng thái:</span>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
            style={{
              padding: '9px 14px',
              borderRadius: 10,
              border: '1px solid #CBD5E1',
              fontSize: '0.9rem',
              fontWeight: 600,
              color: '#1E293B',
              outline: 'none',
              background: '#FFFFFF',
              cursor: 'pointer'
            }}
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang hoạt động (ACTIVE)</option>
            <option value="INACTIVE">Chưa kích hoạt (INACTIVE)</option>
            <option value="BANNED">Đã bị khóa (BANNED)</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: 18,
        border: '1px solid #E2E8F0',
        overflow: 'hidden',
        boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
        marginBottom: 20
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B' }}>
                <th style={{ padding: '14px 18px' }}>Mã ID</th>
                <th style={{ padding: '14px 18px' }}>Tài khoản</th>
                <th style={{ padding: '14px 18px' }}>Email</th>
                <th style={{ padding: '14px 18px' }}>Họ và tên</th>
                <th style={{ padding: '14px 18px' }}>Số buổi học</th>
                <th style={{ padding: '14px 18px' }}>Trạng thái</th>
                <th style={{ padding: '14px 18px' }}>Ngày tạo</th>
                <th style={{ padding: '14px 18px', textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>
                    Đang tải danh sách người dùng...
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>
                    Không tìm thấy người dùng nào phù hợp.
                  </td>
                </tr>
              ) : (
                students.map((u) => {
                  const isActive = u.status === 'ACTIVE';
                  const isBanned = u.status === 'BANNED';
                  return (
                    <tr key={u.userId} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '14px 18px', fontWeight: 700, color: '#64748B' }}>
                        #{u.userId}
                      </td>
                      <td style={{ padding: '14px 18px', fontWeight: 700, color: '#0F172A' }}>
                        {u.username}
                      </td>
                      <td style={{ padding: '14px 18px', color: '#475569' }}>
                        {u.email}
                      </td>
                      <td style={{ padding: '14px 18px', fontWeight: 600, color: '#1E293B' }}>
                        {u.fullName || 'Chưa cập nhật'}
                      </td>
                      <td style={{ padding: '14px 18px', fontWeight: 700, color: '#4F46E5' }}>
                        {u.totalSessions ?? 0}
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '3px 10px',
                          borderRadius: 20,
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          background: isActive ? '#ECFDF5' : isBanned ? '#FEE2E2' : '#FEF3C7',
                          color: isActive ? '#059669' : isBanned ? '#DC2626' : '#D97706',
                          border: `1px solid ${isActive ? '#A7F3D0' : isBanned ? '#FCA5A5' : '#FDE68A'}`
                        }}>
                          {u.status}
                        </span>
                      </td>
                      <td style={{ padding: '14px 18px', color: '#64748B', fontSize: '0.84rem' }}>
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString('vi-VN') : '—'}
                      </td>
                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 6 }}>
                          <button
                            onClick={() => viewDetail(u.userId)}
                            disabled={detailLoading}
                            title="Xem chi tiết học viên"
                            style={{
                              background: '#F1F5F9',
                              border: '1px solid #E2E8F0',
                              color: '#334155',
                              padding: '5px 10px',
                              borderRadius: 8,
                              fontSize: '0.82rem',
                              fontWeight: 600,
                              cursor: detailLoading ? 'not-allowed' : 'pointer',
                              opacity: detailLoading ? 0.7 : 1
                            }}
                          >
                            {detailLoading ? 'Đang tải...' : 'Chi tiết'}
                          </button>
                          {isActive ? (
                            <button
                              onClick={() => handleStatusChange(u.userId, 'BANNED')}
                              title="Khóa tài khoản này"
                              style={{
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.25)',
                                color: '#DC2626',
                                padding: '5px 10px',
                                borderRadius: 8,
                                fontSize: '0.82rem',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              Khóa
                            </button>
                          ) : (
                            <button
                              onClick={() => handleStatusChange(u.userId, 'ACTIVE')}
                              title="Mở khóa tài khoản"
                              style={{
                                background: 'rgba(16, 185, 129, 0.1)',
                                border: '1px solid rgba(16, 185, 129, 0.25)',
                                color: '#059669',
                                padding: '5px 10px',
                                borderRadius: 8,
                                fontSize: '0.82rem',
                                fontWeight: 700,
                                cursor: 'pointer'
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

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div style={{
            padding: '14px 20px',
            borderTop: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#F8FAFC'
          }}>
            <span style={{ fontSize: '0.88rem', color: '#64748B' }}>
              Trang <b>{page + 1}</b> / <b>{totalPages}</b>
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                style={{
                  padding: '6px 14px',
                  borderRadius: 8,
                  border: '1px solid #CBD5E1',
                  background: page === 0 ? '#F1F5F9' : '#FFFFFF',
                  color: page === 0 ? '#94A3B8' : '#334155',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: page === 0 ? 'not-allowed' : 'pointer'
                }}
              >
                Trang trước
              </button>
              <button
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                style={{
                  padding: '6px 14px',
                  borderRadius: 8,
                  border: '1px solid #CBD5E1',
                  background: page >= totalPages - 1 ? '#F1F5F9' : '#FFFFFF',
                  color: page >= totalPages - 1 ? '#94A3B8' : '#334155',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer'
                }}
              >
                Trang kế tiếp
              </button>
            </div>
          </div>
        )}
      </div>

      {/* User Detail Modal */}
      {selectedUser && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 20
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: 22,
            padding: '28px 32px',
            maxWidth: 580,
            width: '100%',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            position: 'relative',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#0F172A' }}>
                  Hồ sơ Học viên #{selectedUser.userId}
                </h2>
                <span style={{ fontSize: '0.86rem', color: '#64748B' }}>{selectedUser.email}</span>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                style={{
                  background: '#F1F5F9',
                  border: 'none',
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  cursor: 'pointer',
                  fontWeight: 800,
                  color: '#64748B'
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
              <div style={{ background: '#F8FAFC', padding: 14, borderRadius: 12 }}>
                <div style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 700 }}>TÊN TÀI KHOẢN</div>
                <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#1E293B', marginTop: 4 }}>{selectedUser.username}</div>
              </div>
              <div style={{ background: '#F8FAFC', padding: 14, borderRadius: 12 }}>
                <div style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 700 }}>HỌ VÀ TÊN</div>
                <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#1E293B', marginTop: 4 }}>{selectedUser.fullName || '—'}</div>
              </div>
              <div style={{ background: '#F8FAFC', padding: 14, borderRadius: 12 }}>
                <div style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 700 }}>TỪ ĐÃ HỌC</div>
                <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#10B981', marginTop: 4 }}>{selectedUser.wordsLearned ?? 0} từ</div>
              </div>
              <div style={{ background: '#F8FAFC', padding: 14, borderRadius: 12 }}>
                <div style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 700 }}>TỔNG BUỔI HỌC</div>
                <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#4F46E5', marginTop: 4 }}>{selectedUser.totalSessions ?? 0} buổi</div>
              </div>
              <div style={{ background: '#F8FAFC', padding: 14, borderRadius: 12 }}>
                <div style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 700 }}>ĐỘ CHÍNH XÁC</div>
                <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#F59E0B', marginTop: 4 }}>{selectedUser.accuracyRate ? `${selectedUser.accuracyRate}%` : '—'}</div>
              </div>
              <div style={{ background: '#F8FAFC', padding: 14, borderRadius: 12 }}>
                <div style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 700 }}>TRẠNG THÁI HIỆN TẠI</div>
                <div style={{ fontWeight: 800, fontSize: '1.05rem', color: selectedUser.status === 'ACTIVE' ? '#059669' : '#DC2626', marginTop: 4 }}>
                  {selectedUser.status}
                </div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: 18, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              {selectedUser.status === 'ACTIVE' ? (
                <button
                  onClick={() => handleStatusChange(selectedUser.userId, 'BANNED')}
                  style={{
                    background: '#EF4444',
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '10px 18px',
                    borderRadius: 10,
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Khóa tài khoản
                </button>
              ) : (
                <button
                  onClick={() => handleStatusChange(selectedUser.userId, 'ACTIVE')}
                  style={{
                    background: '#10B981',
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '10px 18px',
                    borderRadius: 10,
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Kích hoạt tài khoản
                </button>
              )}
              <button
                onClick={() => setSelectedUser(null)}
                style={{
                  background: '#F1F5F9',
                  color: '#334155',
                  border: '1px solid #CBD5E1',
                  padding: '10px 18px',
                  borderRadius: 10,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
