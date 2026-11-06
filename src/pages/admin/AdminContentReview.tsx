import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AdminExerciseReviewTab } from './AdminExerciseReviewTab';
import {
  contentReportApi,
  CONTENT_REPORT_TYPE_LABELS,
  CONTENT_REPORT_STATUS_LABELS,
  errMsg,
} from '../../api';
import type {
  ContentReportItem,
  ContentReportStatus,
  ContentReportType,
} from '../../api';
import { Icon } from '../../components/icons';

const STATUS_FILTERS: { value: ContentReportStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'Tất cả trạng thái' },
  { value: 'PENDING', label: 'Chờ xử lý' },
  { value: 'APPROVED', label: 'Đã duyệt lỗi' },
  { value: 'FIXED', label: 'Đã sửa xong' },
  { value: 'REJECTED', label: 'Đã từ chối' },
];

export default function AdminContentReview() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') === 'exercise-review' ? 'exercise-review' : 'content-reports';

  const handleTabChange = (tab: 'content-reports' | 'exercise-review') => {
    setSearchParams({ tab });
  };
  const [reports, setReports] = useState<ContentReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<ContentReportStatus | 'ALL'>('PENDING');
  const [selectedType, setSelectedType] = useState<ContentReportType | 'ALL'>('ALL');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  // Modal resolve state
  const [activeReport, setActiveReport] = useState<ContentReportItem | null>(null);
  const [resolveStatus, setResolveStatus] = useState<ContentReportStatus>('APPROVED');
  const [adminNote, setAdminNote] = useState('');
  const [resolving, setResolving] = useState(false);
  const [resolveErr, setResolveErr] = useState('');
  const [resolveSuccess, setResolveSuccess] = useState('');

  const fetchReports = async () => {
    setLoading(true);
    setErr('');
    try {
      const { data } = await contentReportApi.listAdmin({
        status: selectedStatus === 'ALL' ? undefined : selectedStatus,
        type: selectedType === 'ALL' ? undefined : selectedType,
        page,
        size: 15,
      });

      const list = data?.data?.content || data?.content || [];
      const totalP = data?.data?.totalPages ?? data?.totalPages ?? 1;
      const totalE = data?.data?.totalElements ?? data?.totalElements ?? list.length;

      setReports(list);
      setTotalPages(totalP);
      setTotalElements(totalE);
    } catch (e: any) {
      setErr(errMsg(e, 'Không thể tải danh sách báo cáo nội dung.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [selectedStatus, selectedType, page]);

  const handleOpenResolve = (rep: ContentReportItem) => {
    setActiveReport(rep);
    setResolveStatus(rep.status === 'PENDING' ? 'APPROVED' : rep.status);
    setAdminNote(rep.adminNote || '');
    setResolveErr('');
    setResolveSuccess('');
  };

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeReport) return;
    setResolving(true);
    setResolveErr('');
    setResolveSuccess('');
    try {
      await contentReportApi.resolve(activeReport.id, {
        status: resolveStatus,
        adminNote: adminNote.trim() || undefined,
      });
      setResolveSuccess('Cập nhật trạng thái báo cáo thành công!');
      setTimeout(() => {
        setActiveReport(null);
        fetchReports();
      }, 1200);
    } catch (e: any) {
      setResolveErr(errMsg(e, 'Lỗi khi cập nhật trạng thái báo cáo.'));
    } finally {
      setResolving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Page Header */}
      <div className="pagehead" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1>Duyệt nội dung &amp; Báo lỗi</h1>
          <div className="sub">
            Tiếp nhận, kiểm tra và xử lý các phản ánh lỗi từ học viên về từ vựng CEFR
          </div>
        </div>
        <button
          type="button"
          className="btn ghost"
          onClick={fetchReports}
          disabled={loading}
        >
          <Icon n="spark" s={16} />
          {loading ? 'Đang tải...' : 'Làm mới hàng chờ'}
        </button>
      </div>

      {/* Main Tabs Navigation */}
      <div style={{ display: 'flex', gap: 10, borderBottom: '2px solid var(--border)', paddingBottom: 2 }}>
        <button
          type="button"
          onClick={() => handleTabChange('content-reports')}
          style={{
            padding: '10px 18px',
            fontSize: 14,
            fontWeight: 800,
            cursor: 'pointer',
            border: 'none',
            background: 'transparent',
            color: activeTab === 'content-reports' ? 'var(--primary, #2563eb)' : 'var(--muted, #64748b)',
            borderBottom: activeTab === 'content-reports' ? '3px solid var(--primary, #2563eb)' : '3px solid transparent',
            marginBottom: -2,
            transition: 'all 0.15s ease',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Icon n="spark" s={16} />
          Báo lỗi từ vựng
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('exercise-review')}
          style={{
            padding: '10px 18px',
            fontSize: 14,
            fontWeight: 800,
            cursor: 'pointer',
            border: 'none',
            background: 'transparent',
            color: activeTab === 'exercise-review' ? 'var(--primary, #2563eb)' : 'var(--muted, #64748b)',
            borderBottom: activeTab === 'exercise-review' ? '3px solid var(--primary, #2563eb)' : '3px solid transparent',
            marginBottom: -2,
            transition: 'all 0.15s ease',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Icon n="zap" s={16} />
          Bài tập chờ duyệt
        </button>
      </div>

      {activeTab === 'exercise-review' ? (
        <AdminExerciseReviewTab />
      ) : (
        <>
      {/* Filter Row */}
      <div className="card" style={{ padding: '16px 20px', display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              className={'fchip' + (selectedStatus === f.value ? ' on' : '')}
              onClick={() => {
                setSelectedStatus(f.value);
                setPage(0);
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)' }}>Loại lỗi:</span>
          <select
            value={selectedType}
            onChange={(e) => {
              setSelectedType(e.target.value as any);
              setPage(0);
            }}
            className="input"
            style={{ padding: '6px 12px', fontSize: 13, borderRadius: 8 }}
          >
            <option value="ALL">Tất cả loại lỗi</option>
            {Object.entries(CONTENT_REPORT_TYPE_LABELS).map(([k, label]) => (
              <option key={k} value={k}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {err && <div className="error">{err}</div>}

      {/* Reports Table Card */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--ink)' }}>
            Hàng chờ phản ánh ({totalElements} mục)
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--muted)' }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--primary)', marginBottom: 4 }}>
              Đang tải danh sách báo lỗi...
            </div>
          </div>
        ) : reports.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--muted)' }}>
            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 4 }}>
              Không có báo cáo nào trong hàng chờ
            </div>
            <div className="sub">Hệ thống từ vựng đang hoạt động chuẩn xác</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
              <thead>
                <tr style={{ background: '#F8FAFC', textAlign: 'left', borderBottom: '1.5px solid var(--border)' }}>
                  <th style={{ padding: '12px 18px', fontWeight: 800 }}>Từ vựng</th>
                  <th style={{ padding: '12px 18px', fontWeight: 800 }}>Loại lỗi</th>
                  <th style={{ padding: '12px 18px', fontWeight: 800 }}>Nội dung mô tả</th>
                  <th style={{ padding: '12px 18px', fontWeight: 800 }}>Người báo</th>
                  <th style={{ padding: '12px 18px', fontWeight: 800 }}>Thời gian</th>
                  <th style={{ padding: '12px 18px', fontWeight: 800 }}>Trạng thái</th>
                  <th style={{ padding: '12px 18px', fontWeight: 800, textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((rep) => {
                  const st = CONTENT_REPORT_STATUS_LABELS[rep.status] || { label: rep.status, color: 'inherit', bg: '#F1F5F9' };
                  return (
                    <tr key={rep.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '14px 18px', fontWeight: 800, color: 'var(--primary-dark)' }}>
                        {rep.lemmaSnapshot}
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <span style={{ fontSize: 12, padding: '3px 8px', borderRadius: 6, background: '#EFF6FF', color: '#1E40AF', fontWeight: 700 }}>
                          {CONTENT_REPORT_TYPE_LABELS[rep.type] || rep.type}
                        </span>
                      </td>
                      <td style={{ padding: '14px 18px', maxWidth: 300 }}>
                        <div style={{ color: 'var(--ink)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={rep.description}>
                          {rep.description}
                        </div>
                        {rep.adminNote && (
                          <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 3 }}>
                            Ghi chú: {rep.adminNote}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontWeight: 700 }}>{rep.userFullName || 'Học viên'}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{rep.userEmail}</div>
                      </td>
                      <td style={{ padding: '14px 18px', fontSize: 12, color: 'var(--muted)' }}>
                        {rep.createdAt ? new Date(rep.createdAt).toLocaleString('vi-VN') : '—'}
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <span style={{ fontSize: 12, padding: '4px 9px', borderRadius: 8, background: st.bg, color: st.color, fontWeight: 800 }}>
                          {st.label}
                        </span>
                      </td>
                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        <button
                          type="button"
                          className="btn ghost"
                          style={{ padding: '6px 12px', fontSize: 12.5 }}
                          onClick={() => handleOpenResolve(rep)}
                        >
                          Xử lý
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: '16px 20px', borderTop: '1px solid var(--border)' }}>
            <button
              type="button"
              className="btn ghost"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              style={{ padding: '6px 14px', fontSize: 13 }}
            >
              Trang trước
            </button>
            <span style={{ display: 'inline-flex', alignItems: 'center', padding: '0 10px', fontSize: 13, fontWeight: 700 }}>
              {page + 1} / {totalPages}
            </span>
            <button
              type="button"
              className="btn ghost"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              style={{ padding: '6px 14px', fontSize: 13 }}
            >
              Trang sau
            </button>
          </div>
        )}
      </div>
        </>
      )}

      {/* Modal Xử lý Báo Cáo */}
      {activeReport && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
          onClick={() => setActiveReport(null)}
        >
          <div
            className="card"
            style={{
              maxWidth: 560,
              width: '100%',
              background: '#fff',
              borderRadius: 20,
              padding: 24,
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900 }}>
                  Xử lý phản ánh từ: <span style={{ color: 'var(--primary)' }}>{activeReport.lemmaSnapshot}</span>
                </h3>
                <div className="sub" style={{ fontSize: 12.5, marginTop: 2 }}>
                  Loại: <b>{CONTENT_REPORT_TYPE_LABELS[activeReport.type] || activeReport.type}</b>
                </div>
              </div>
              <button
                type="button"
                className="btn ghost"
                style={{ border: 'none', padding: '4px 8px', fontSize: 16 }}
                onClick={() => setActiveReport(null)}
              >
                ✕
              </button>
            </div>

            {/* Chi tiết nội dung học viên báo */}
            <div style={{ background: '#F8FAFC', borderRadius: 12, padding: 14, marginBottom: 16, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 4 }}>
                MÔ TẢ LỖI CỦA HỌC VIÊN:
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.5 }}>
                “{activeReport.description}”
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 8 }}>
                Người báo: <b>{activeReport.userFullName || 'Học viên'}</b> ({activeReport.userEmail}) · {activeReport.createdAt ? new Date(activeReport.createdAt).toLocaleString('vi-VN') : ''}
              </div>
            </div>

            {/* Shortcut sang sửa từ */}
            <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 16 }}>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  window.open(`/admin/words?search=${encodeURIComponent(activeReport.lemmaSnapshot)}`, '_blank');
                }}
                style={{ fontSize: 12.5, padding: '7px 14px', display: 'inline-flex', alignItems: 'center', gap: 6, borderColor: 'var(--primary)' }}
                title="Mở tab Quản lý Từ vựng để chỉnh sửa trực tiếp"
              >
                <Icon n="book" s={15} />
                <span>Mở sửa từ này trong Kho từ vựng ↗</span>
              </button>
            </div>

            {resolveErr && <div className="error" style={{ marginBottom: 12, fontSize: 13 }}>{resolveErr}</div>}
            {resolveSuccess && <div className="card" style={{ background: '#ECFDF5', borderColor: '#A7F3D0', color: '#065F46', padding: 12, marginBottom: 12, fontSize: 13, fontWeight: 700 }}>{resolveSuccess}</div>}

            <form onSubmit={handleResolveSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: 'var(--ink)', marginBottom: 6 }}>
                  Quyết định duyệt / Trạng thái xử lý:
                </label>
                <select
                  value={resolveStatus}
                  onChange={(e) => setResolveStatus(e.target.value as ContentReportStatus)}
                  className="input"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid var(--border)' }}
                >
                  <option value="APPROVED">APPROVED — Duyệt lỗi (Xác nhận từ có lỗi, chờ sửa)</option>
                  <option value="FIXED">FIXED — Đã sửa xong từ vựng trong hệ thống</option>
                  <option value="REJECTED">REJECTED — Từ chối (Nội dung của từ hoàn toàn chính xác)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: 'var(--ink)', marginBottom: 6 }}>
                  Ghi chú phản hồi / Lý do (tối đa 500 ký tự):
                </label>
                <textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value.slice(0, 500))}
                  placeholder="Ví dụ: Đã sửa nghĩa tiếng Việt và thêm ví dụ mới theo đúng chuẩn Oxford..."
                  rows={3}
                  className="input"
                  style={{ width: '100%', padding: 12, borderRadius: 10, border: '1.5px solid var(--border)', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => setActiveReport(null)}
                  disabled={resolving}
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  className="btn"
                  disabled={resolving}
                  style={{ minWidth: 140 }}
                >
                  {resolving ? 'Đang lưu...' : 'Lưu kết quả duyệt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
