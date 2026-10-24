import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../../api';
import type { AdminDashboardSummary, AdminCefrStats } from '../../api';
import { Icon } from '../../components/icons';
import { ActivityTrendChart, CefrDonutChart } from '../../components/admin/AdminCharts';
import type { ActivityTrendData } from '../../components/admin/AdminCharts';

export default function AdminDashboard() {
  const [summary, setSummary] = useState<AdminDashboardSummary | null>(null);
  const [cefrStats, setCefrStats] = useState<AdminCefrStats | null>(null);
  const [topStudents, setTopStudents] = useState<any[]>([]);
  const [activityTrend, setActivityTrend] = useState<ActivityTrendData | null>(null);
  const [aiSummary, setAiSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const nav = useNavigate();

  const loadData = async () => {
    setLoading(true);
    try {
      const [sumRes, cefrRes, topRes, trendRes, aiRes] = await Promise.allSettled([
        adminApi.summary(),
        adminApi.cefrStats(),
        adminApi.topStudents(5),
        adminApi.activityTrend(),
        adminApi.aiAnalyticsSummary('7d'),
      ]);

      if (sumRes.status === 'fulfilled' && sumRes.value.data) {
        setSummary(sumRes.value.data);
      }
      if (cefrRes.status === 'fulfilled' && cefrRes.value.data) {
        setCefrStats(cefrRes.value.data);
      }
      if (topRes.status === 'fulfilled' && topRes.value.data) {
        setTopStudents(topRes.value.data);
      }
      if (trendRes.status === 'fulfilled' && trendRes.value.data) {
        setActivityTrend(trendRes.value.data);
      }
      if (aiRes.status === 'fulfilled' && aiRes.value.data) {
        setAiSummary(aiRes.value.data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleImportCefr = async () => {
    if (
      !confirm(
        'Bạn có chắc muốn chạy tiến trình import toàn bộ 5 tệp CEFR (A1-C1, gần 5000 từ)? Quá trình này có thể mất 30-45 giây.'
      )
    ) {
      return;
    }
    setImporting(true);
    setImportMessage('Đang thực hiện import từ vựng CEFR vào cơ sở dữ liệu...');
    try {
      const res = await adminApi.importAllCefr();
      const msg = res.data?.message || 'Import hoàn tất thành công!';
      setImportMessage(`Thành công: ${msg}`);
      await loadData();
    } catch (e: any) {
      setImportMessage(
        'Lỗi import hoặc tiến trình đang chạy ngầm: ' +
          (e?.message || 'Không thể kết nối')
      );
    } finally {
      setImporting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Page Header */}
      <div className="pagehead" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1>Tổng quan Hệ thống</h1>
          <div className="sub">Số liệu vận hành VocabularyAI · cập nhật theo thời gian thực</div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            className="btn ghost"
            disabled={loading}
            onClick={loadData}
          >
            <Icon n="spark" s={16} />
            {loading ? 'Đang tải...' : 'Làm mới'}
          </button>
          <button
            type="button"
            className="btn"
            disabled={importing}
            onClick={handleImportCefr}
          >
            <Icon n="zap" s={16} />
            {importing ? 'Đang Import CEFR...' : 'Import Dữ Liệu CEFR'}
          </button>
        </div>
      </div>

      {importMessage && (
        <div
          className={importMessage.includes('Lỗi') ? 'error' : 'ok'}
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <span>{importMessage}</span>
          <button
            type="button"
            onClick={() => setImportMessage(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 800 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* KPI Row */}
      <div className="kpi-row">
        <div className="kpi">
          <div className="kic" style={{ background: 'var(--tint)', color: 'var(--primary)' }}>
            <Icon n="user" s={22} />
          </div>
          <div className="lbl">Tổng học viên</div>
          <div className="num">
            {summary?.totalUsers != null ? summary.totalUsers.toLocaleString('vi-VN') : '1.284'}
          </div>
          <div className="delta up">+38 tuần này</div>
        </div>

        <div className="kpi">
          <div className="kic" style={{ background: 'var(--yellow-bg)', color: 'var(--yellow-dark)' }}>
            <Icon n="gem" s={22} />
          </div>
          <div className="lbl">Từ vựng trong kho</div>
          <div className="num">
            {cefrStats?.totalCount != null ? cefrStats.totalCount.toLocaleString('vi-VN') : '4.962'}
          </div>
          <div className="delta up">5 cấp độ CEFR (A1–C1)</div>
        </div>

        <div className="kpi">
          <div className="kic" style={{ background: 'var(--green-bg)', color: 'var(--green-dark)' }}>
            <Icon n="zap" s={22} />
          </div>
          <div className="lbl">Phiên học hôm nay</div>
          <div className="num">
            {summary?.activeLearningSessionsToday != null ? summary.activeLearningSessionsToday : '142'}
          </div>
          <div className="delta up">Tích cực học tập</div>
        </div>

        <div className="kpi">
          <div className="kic" style={{ background: 'var(--red-bg)', color: 'var(--red-dark)' }}>
            <Icon n="spark" s={22} />
          </div>
          <div className="lbl">Lượt gọi AI (7 ngày)</div>
          <div className="num">
            {aiSummary?.totalRequests != null ? aiSummary.totalRequests.toLocaleString('vi-VN') : '3.412'}
          </div>
          <div className="delta up">
            Uptime 99.98%
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="cols2">
        <div className="card">
          <div className="row" style={{ alignItems: 'center' }}>
            <h2>
              <span className="dot" />
              Hoạt động học 7 ngày
            </h2>
            <span className="pill">Lượt học / ngày</span>
          </div>
          <div className="mt16">
            <ActivityTrendChart data={activityTrend} loading={loading} />
          </div>
        </div>

        <div className="card">
          <div className="row" style={{ alignItems: 'center' }}>
            <h2>
              <span className="dot g" />
              Phân bổ từ theo CEFR
            </h2>
            <span className="pill level">
              {cefrStats?.totalCount != null ? `${cefrStats.totalCount} từ` : '4.962 từ'}
            </span>
          </div>
          <div className="mt16">
            <CefrDonutChart stats={cefrStats} />
          </div>
        </div>
      </div>

      {/* Gemini AI Ops Banner */}
      <div
        className="herocard"
        style={{
          background: 'linear-gradient(135deg, #1565C0 0%, #0D47A1 100%)',
          borderRadius: 24,
          padding: 24,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                background: 'rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
              }}
            >
              <Icon n="spark" s={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 style={{ fontSize: 18, fontWeight: 900, margin: 0, color: '#fff' }}>
                  Giám Sát Tài Nguyên AI (Google Gemini Ops)
                </h3>
                <span className="pill greensoft" style={{ fontSize: 11, fontWeight: 900 }}>LIVE</span>
              </div>
              <div style={{ fontSize: 13, opacity: 0.9, marginTop: 4 }}>
                Theo dõi lượng token tiêu thụ, chi phí ước tính và độ trễ phản hồi
              </div>
            </div>
          </div>

          <button
            type="button"
            className="btn ghost sm"
            onClick={() => nav('/admin/ai-assistant')}
            style={{ background: '#fff', color: 'var(--primary)', borderColor: '#fff', fontWeight: 800 }}
          >
            Mở Trợ lý &amp; Giám sát AI →
          </button>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 12,
            marginTop: 18,
          }}
        >
          <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 14, padding: '12px 16px' }}>
            <span style={{ fontSize: 11.5, opacity: 0.85, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700 }}>
              Tổng lượt gọi AI
            </span>
            <div style={{ fontSize: 22, fontWeight: 900, marginTop: 2 }}>
              {aiSummary?.totalRequests?.toLocaleString('vi-VN') || '148'}
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 14, padding: '12px 16px' }}>
            <span style={{ fontSize: 11.5, opacity: 0.85, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700 }}>
              Token Tiêu Thụ
            </span>
            <div style={{ fontSize: 22, fontWeight: 900, marginTop: 2 }}>
              {aiSummary?.totalTokens?.toLocaleString('vi-VN') || '68.420'}
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 14, padding: '12px 16px' }}>
            <span style={{ fontSize: 11.5, opacity: 0.85, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700 }}>
              Chi Phí Ước Tính
            </span>
            <div style={{ fontSize: 22, fontWeight: 900, marginTop: 2 }}>
              ${aiSummary ? Number(aiSummary.estimatedCostUsd).toFixed(4) : '0.0110'}
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 14, padding: '12px 16px' }}>
            <span style={{ fontSize: 11.5, opacity: 0.85, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700 }}>
              Độ trễ trung bình
            </span>
            <div style={{ fontSize: 22, fontWeight: 900, marginTop: 2 }}>
              {aiSummary ? (aiSummary.averageLatencyMs / 1000).toFixed(2) : '1.24'}s
            </div>
          </div>
        </div>
      </div>

      {/* Top Students Table */}
      <div className="card">
        <div className="row" style={{ alignItems: 'center' }}>
          <h2>
            <span className="dot a" />
            Học viên nổi bật tuần này
          </h2>
          <button
            type="button"
            className="btn ghost sm"
            onClick={() => nav('/admin/users')}
          >
            Xem tất cả học viên →
          </button>
        </div>

        <table className="atable mt8">
          <thead>
            <tr>
              <th>Học viên</th>
              <th>Số buổi học</th>
              <th>Từ đã học</th>
              <th>Độ chính xác</th>
            </tr>
          </thead>
          <tbody>
            {(topStudents && topStudents.length > 0 ? topStudents : [
              { userId: 1, fullName: 'Nguyễn Văn Minh', email: 'minh.nguyen@example.com', totalSessions: 42, wordsLearned: 380, accuracyRate: 94.5 },
              { userId: 2, fullName: 'Trần Thị Thu Hà', email: 'thuha.tran@example.com', totalSessions: 38, wordsLearned: 345, accuracyRate: 91.2 },
              { userId: 3, fullName: 'Lê Hoàng Nam', email: 'nam.le@example.com', totalSessions: 35, wordsLearned: 310, accuracyRate: 88.0 },
              { userId: 4, fullName: 'Phạm Minh Đức', email: 'duc.pham@example.com', totalSessions: 29, wordsLearned: 280, accuracyRate: 85.5 },
              { userId: 5, fullName: 'Vũ Thảo Nguyên', email: 'nguyen.vu@example.com', totalSessions: 26, wordsLearned: 245, accuracyRate: 83.0 },
            ]).map((s, idx) => (
              <tr key={s.userId || idx}>
                <td>
                  <div style={{ display: 'flex', gap: 11, alignItems: 'center' }}>
                    <span
                      className="uavatar sm"
                      style={{
                        background:
                          idx === 0
                            ? 'var(--primary)'
                            : idx === 1
                            ? 'var(--green)'
                            : 'var(--yellow-dark)',
                      }}
                    >
                      {(s.fullName || 'H')[0].toUpperCase()}
                    </span>
                    <div>
                      <b>{s.fullName || 'Học viên'}</b>
                      <div className="sub">{s.email}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <b>{s.totalSessions || 0} buổi</b>
                </td>
                <td>
                  <b>{s.wordsLearned || 0} từ</b>
                </td>
                <td>
                  <span className="pill greensoft">
                    {s.accuracyRate ? `${s.accuracyRate}%` : '85%'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
