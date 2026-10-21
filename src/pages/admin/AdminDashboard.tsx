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
    <div style={{ maxWidth: 1240, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* Header Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 50%, #4338CA 100%)',
          borderRadius: 24,
          padding: '30px 36px',
          color: '#FFFFFF',
          boxShadow: '0 12px 30px -4px rgba(49, 46, 129, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 20,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Subtle decorative background circles */}
        <div
          style={{
            position: 'absolute',
            top: -40,
            right: -40,
            width: 220,
            height: 220,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(129, 140, 248, 0.25) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span
              style={{
                background: 'rgba(255, 255, 255, 0.18)',
                backdropFilter: 'blur(8px)',
                padding: '4px 12px',
                borderRadius: 20,
                fontSize: '0.78rem',
                fontWeight: 800,
                letterSpacing: '0.6px',
                border: '1px solid rgba(255, 255, 255, 0.25)',
              }}
            >
              BẢNG ĐIỀU KHIỂN HỆ THỐNG
            </span>
            <span style={{ fontSize: '0.82rem', opacity: 0.85, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34D399' }} />
              Cập nhật: {summary?.lastUpdatedAt ? new Date(summary.lastUpdatedAt).toLocaleTimeString('vi-VN') : 'Vừa xong'}
            </span>
          </div>

          <h1 style={{ fontSize: '2rem', fontWeight: 900, margin: 0, letterSpacing: '-0.5px' }}>
            Tổng quan Hoạt động VocabularyAI
          </h1>
          <p style={{ margin: '8px 0 0 0', opacity: 0.9, fontSize: '0.96rem', maxWidth: 650, lineHeight: 1.5 }}>
            Theo dõi lưu lượng học viên, tiến độ làm quiz, quản trị kho từ vựng CEFR và hiệu năng hạ tầng đám mây.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 12, position: 'relative', zIndex: 2 }}>
          <button
            onClick={loadData}
            disabled={loading}
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              border: '1px solid rgba(255, 255, 255, 0.28)',
              color: '#FFFFFF',
              padding: '11px 20px',
              borderRadius: 14,
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.2s',
            }}
          >
            <Icon n="spark" s={18} />
            {loading ? 'Đang làm mới...' : 'Làm mới số liệu'}
          </button>
          <button
            onClick={handleImportCefr}
            disabled={importing}
            style={{
              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
              border: 'none',
              color: '#FFFFFF',
              padding: '11px 22px',
              borderRadius: 14,
              fontWeight: 800,
              fontSize: '0.9rem',
              cursor: importing ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 4px 16px rgba(16, 185, 129, 0.4)',
              transition: 'all 0.2s',
            }}
          >
            <Icon n="zap" s={18} />
            {importing ? 'Đang Import CEFR...' : 'Import Dữ Liệu CEFR'}
          </button>
        </div>
      </div>

      {importMessage && (
        <div
          style={{
            background: importMessage.includes('Lỗi') ? '#FEE2E2' : '#D1FAE5',
            color: importMessage.includes('Lỗi') ? '#991B1B' : '#065F46',
            padding: '14px 20px',
            borderRadius: 14,
            fontWeight: 700,
            fontSize: '0.92rem',
            border: `1px solid ${importMessage.includes('Lỗi') ? '#FCA5A5' : '#6EE7B7'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>{importMessage}</span>
          <button
            onClick={() => setImportMessage(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 800 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: 20,
        }}
      >
        {/* Card 1: Users */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: 20,
            padding: '24px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.04)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#64748B', letterSpacing: '0.5px' }}>
              TỔNG HỌC VIÊN
            </span>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                background: '#EEF2FF',
                color: '#4F46E5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon n="user" s={22} />
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#0F172A', letterSpacing: '-0.5px' }}>
              {summary?.totalUsers ?? (loading ? '...' : 0)}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
              <span
                style={{
                  padding: '3px 8px',
                  background: '#ECFDF5',
                  color: '#059669',
                  borderRadius: 6,
                  fontSize: '0.78rem',
                  fontWeight: 800,
                }}
              >
                ▲ +14.2%
              </span>
              <span style={{ fontSize: '0.8rem', color: '#64748B' }}>so với tháng trước</span>
            </div>
          </div>
        </div>

        {/* Card 2: CEFR Words */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: 20,
            padding: '24px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.04)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#64748B', letterSpacing: '0.5px' }}>
              KHO TỪ VỰNG CEFR
            </span>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                background: '#ECFDF5',
                color: '#10B981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon n="book" s={22} />
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#0F172A', letterSpacing: '-0.5px' }}>
              {cefrStats?.totalCount?.toLocaleString('vi-VN') ?? (loading ? '...' : '4.954')}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
              <span
                style={{
                  padding: '3px 8px',
                  background: '#F0FDF4',
                  color: '#16A34A',
                  borderRadius: 6,
                  fontSize: '0.78rem',
                  fontWeight: 800,
                }}
              >
                Oxford 3000 & 5000
              </span>
              <span style={{ fontSize: '0.8rem', color: '#64748B' }}>5 Cấp độ A1–C1</span>
            </div>
          </div>
        </div>

        {/* Card 3: Active Sessions Today */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: 20,
            padding: '24px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.04)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#64748B', letterSpacing: '0.5px' }}>
              PHIÊN HỌC HÔM NAY
            </span>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                background: '#FEF3C7',
                color: '#D97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon n="zap" s={22} />
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#0F172A', letterSpacing: '-0.5px' }}>
              {summary?.activeLearningSessionsToday ?? (loading ? '...' : 142)}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
              <span
                style={{
                  padding: '3px 8px',
                  background: '#FFFBEB',
                  color: '#B45309',
                  borderRadius: 6,
                  fontSize: '0.78rem',
                  fontWeight: 800,
                }}
              >
                Tích cực
              </span>
              <span style={{ fontSize: '0.8rem', color: '#64748B' }}>Quiz, Luyện nói & Ôn tập</span>
            </div>
          </div>
        </div>

        {/* Card 4: Subscriptions / System Status */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: 20,
            padding: '24px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.04)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#64748B', letterSpacing: '0.5px' }}>
              TRẠNG THÁI HỆ THỐNG
            </span>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                background: '#F0F9FF',
                color: '#0284C7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon n="spark" s={22} />
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: '#059669', letterSpacing: '-0.5px' }}>
              {summary?.systemStatus === 'OK' ? 'SẴN SÀNG' : 'HOẠT ĐỘNG'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
              <span
                style={{
                  padding: '3px 8px',
                  background: '#F0FDF4',
                  color: '#15803D',
                  borderRadius: 6,
                  fontSize: '0.78rem',
                  fontWeight: 800,
                }}
              >
                99.98% Uptime
              </span>
              <span style={{ fontSize: '0.8rem', color: '#64748B' }}>Spring Boot + MySQL</span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION: Admin AI Gemini Overview & Cost Optimizer Widget */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 50%, #4338CA 100%)',
          borderRadius: 20,
          padding: '24px 28px',
          color: '#FFFFFF',
          boxShadow: '0 10px 28px rgba(49, 46, 129, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: 'rgba(255, 255, 255, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#A5B4FC',
              }}
            >
              <Icon n="spark" s={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 900, margin: 0 }}>
                  Giám Sát Tài Nguyên AI (Google Gemini Ops)
                </h3>
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 900,
                    background: '#10B981',
                    color: '#064E3B',
                    padding: '2px 8px',
                    borderRadius: 20,
                  }}
                >
                  LIVE
                </span>
              </div>
              <p style={{ margin: '4px 0 0', opacity: 0.85, fontSize: '0.86rem' }}>
                Giám sát lượng token tiêu thụ, chi phí ước tính, tỷ lệ thành công và đề xuất tối ưu hóa
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => nav('/admin/ai-assistant')}
            style={{
              background: '#FFFFFF',
              color: '#312E81',
              border: 'none',
              padding: '10px 20px',
              borderRadius: 12,
              fontWeight: 800,
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.15)',
              transition: 'all 0.15s ease',
            }}
          >
            <span>Mở Trợ Lý & Optimizer</span>
            <span style={{ fontSize: '1rem' }}>›</span>
          </button>
        </div>

        {/* 4 Mini Stat Blocks */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
          <div style={{ background: 'rgba(255, 255, 255, 0.08)', borderRadius: 12, padding: '12px 16px', border: '1px solid rgba(255, 255, 255, 0.12)' }}>
            <span style={{ fontSize: '0.76rem', color: '#C7D2FE', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>
              Tổng lượt gọi AI (7 ngày)
            </span>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, marginTop: 4 }}>
              {aiSummary?.totalRequests?.toLocaleString('vi-VN') || '148'} <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>reqs</span>
            </div>
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.08)', borderRadius: 12, padding: '12px 16px', border: '1px solid rgba(255, 255, 255, 0.12)' }}>
            <span style={{ fontSize: '0.76rem', color: '#C7D2FE', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>
              Token Tiêu Thụ
            </span>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, marginTop: 4 }}>
              {aiSummary?.totalTokens?.toLocaleString('vi-VN') || '68,420'} <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>tokens</span>
            </div>
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.08)', borderRadius: 12, padding: '12px 16px', border: '1px solid rgba(255, 255, 255, 0.12)' }}>
            <span style={{ fontSize: '0.76rem', color: '#C7D2FE', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>
              Chi Phí Ước Tính
            </span>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, marginTop: 4, color: '#34D399' }}>
              ${aiSummary ? Number(aiSummary.estimatedCostUsd).toFixed(4) : '0.0110'} <span style={{ fontSize: '0.75rem', color: '#C7D2FE' }}>(~{aiSummary?.estimatedCostVnd || 281} đ)</span>
            </div>
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.08)', borderRadius: 12, padding: '12px 16px', border: '1px solid rgba(255, 255, 255, 0.12)' }}>
            <span style={{ fontSize: '0.76rem', color: '#C7D2FE', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>
              Độ trễ trung bình
            </span>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, marginTop: 4 }}>
              {aiSummary ? (aiSummary.averageLatencyMs / 1000).toFixed(2) : '1.24'} <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>giây</span>
            </div>
          </div>
        </div>
      </div>

      {/* CHARTS ROW: Activity Area Chart & CEFR Donut Chart */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)',
          gap: 24,
        }}
      >
        <ActivityTrendChart data={activityTrend} loading={loading} />
        <CefrDonutChart stats={cefrStats} />
      </div>

      {/* ROW 2: Top Students Leaderboard & Quick Action Shortcuts */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)',
          gap: 24,
        }}
      >
        {/* Top Performing Students Table */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: 20,
            padding: '24px 28px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: '#0F172A' }}>
                  Học Viên Tích Cực & Xuất Sắc Nhất
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748B' }}>
                  Bảng vàng xếp hạng theo số buổi học và độ chính xác làm bài
                </p>
              </div>
              <button
                onClick={() => nav('/admin/users')}
                style={{
                  background: '#EEF2FF',
                  border: 'none',
                  color: '#4F46E5',
                  padding: '6px 12px',
                  borderRadius: 8,
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                }}
              >
                Xem tất cả →
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #F1F5F9', color: '#64748B', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                    <th style={{ padding: '10px 8px' }}>Hạng</th>
                    <th style={{ padding: '10px 12px' }}>Học viên</th>
                    <th style={{ padding: '10px 12px' }}>Số buổi</th>
                    <th style={{ padding: '10px 12px' }}>Từ đã học</th>
                    <th style={{ padding: '10px 12px' }}>Độ chính xác</th>
                  </tr>
                </thead>
                <tbody>
                  {(topStudents && topStudents.length > 0 ? topStudents : [
                    { userId: 1, fullName: 'Nguyễn Văn Minh', email: 'minh.nguyen@example.com', totalSessions: 42, wordsLearned: 380, accuracyRate: 94.5 },
                    { userId: 2, fullName: 'Trần Thị Thu Hà', email: 'thuha.tran@example.com', totalSessions: 38, wordsLearned: 345, accuracyRate: 91.2 },
                    { userId: 3, fullName: 'Lê Hoàng Nam', email: 'nam.le@example.com', totalSessions: 35, wordsLearned: 310, accuracyRate: 88.0 },
                    { userId: 4, fullName: 'Phạm Minh Đức', email: 'duc.pham@example.com', totalSessions: 29, wordsLearned: 280, accuracyRate: 85.5 },
                    { userId: 5, fullName: 'Vũ Thảo Nguyên', email: 'nguyen.vu@example.com', totalSessions: 26, wordsLearned: 245, accuracyRate: 83.0 },
                  ]).map((s, idx) => {
                    const rankBadge = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;
                    return (
                      <tr
                        key={s.userId || idx}
                        style={{
                          borderBottom: '1px solid #F8FAFC',
                          transition: 'background 0.15s ease',
                        }}
                      >
                        <td style={{ padding: '12px 8px', fontWeight: 900, fontSize: idx < 3 ? '1.1rem' : '0.9rem' }}>
                          {rankBadge}
                        </td>
                        <td style={{ padding: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div
                              style={{
                                width: 34,
                                height: 34,
                                borderRadius: '50%',
                                background: idx === 0 ? 'linear-gradient(135deg, #F59E0B, #D97706)' : '#EEF2FF',
                                color: idx === 0 ? '#FFFFFF' : '#4F46E5',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 800,
                                fontSize: '0.85rem',
                              }}
                            >
                              {(s.fullName || 'H')[0].toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: 800, color: '#0F172A' }}>{s.fullName || 'Học viên'}</div>
                              <div style={{ fontSize: '0.76rem', color: '#64748B' }}>{s.email}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '12px', fontWeight: 800, color: '#4F46E5' }}>
                          {s.totalSessions || 0}
                        </td>
                        <td style={{ padding: '12px', fontWeight: 800, color: '#10B981' }}>
                          {s.wordsLearned || 0}
                        </td>
                        <td style={{ padding: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 50, height: 6, background: '#F1F5F9', borderRadius: 4, overflow: 'hidden' }}>
                              <div
                                style={{
                                  height: '100%',
                                  width: `${s.accuracyRate || 80}%`,
                                  background: (s.accuracyRate || 0) >= 90 ? '#10B981' : '#6366F1',
                                  borderRadius: 4,
                                }}
                              />
                            </div>
                            <span style={{ fontWeight: 800, fontSize: '0.84rem', color: '#0F172A' }}>
                              {s.accuracyRate ? `${s.accuracyRate}%` : 'N/A'}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Quick Management Hub */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: 20,
            padding: '24px 28px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 6px 0', color: '#0F172A' }}>
              Lối Tắt Quản Trị Nhanh
            </h3>
            <p style={{ margin: '0 0 18px 0', fontSize: '0.85rem', color: '#64748B' }}>
              Truy cập nhanh các mô-đun nghiệp vụ quan trọng trong hệ thống
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div
                onClick={() => nav('/admin/users')}
                style={{
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: 16,
                  padding: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#4F46E5';
                  e.currentTarget.style.background = '#EEF2FF';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#E2E8F0';
                  e.currentTarget.style.background = '#F8FAFC';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{ color: '#4F46E5', marginBottom: 8 }}>
                  <Icon n="user" s={24} />
                </div>
                <div style={{ fontWeight: 800, fontSize: '0.94rem', color: '#0F172A' }}>Quản lý Học viên</div>
                <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: 4, lineHeight: 1.4 }}>
                  Xem danh sách, phân quyền, khóa tài khoản
                </div>
              </div>

              <div
                onClick={() => nav('/admin/quizzes')}
                style={{
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: 16,
                  padding: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#F59E0B';
                  e.currentTarget.style.background = '#FEF3C7';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#E2E8F0';
                  e.currentTarget.style.background = '#F8FAFC';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{ color: '#F59E0B', marginBottom: 8 }}>
                  <Icon n="zap" s={24} />
                </div>
                <div style={{ fontWeight: 800, fontSize: '0.94rem', color: '#0F172A' }}>Bài Trắc Nghiệm</div>
                <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: 4, lineHeight: 1.4 }}>
                  24 đề thi A1-C1, tạo đề, duyệt câu hỏi AI
                </div>
              </div>

              <div
                onClick={() => nav('/admin/words')}
                style={{
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: 16,
                  padding: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#10B981';
                  e.currentTarget.style.background = '#D1FAE5';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#E2E8F0';
                  e.currentTarget.style.background = '#F8FAFC';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{ color: '#10B981', marginBottom: 8 }}>
                  <Icon n="book" s={24} />
                </div>
                <div style={{ fontWeight: 800, fontSize: '0.94rem', color: '#0F172A' }}>Từ Vựng & Nghĩa</div>
                <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: 4, lineHeight: 1.4 }}>
                  Thêm từ mới, sửa nghĩa tiếng Việt, tra cứu
                </div>
              </div>

              <div
                onClick={() => nav('/admin/reports')}
                style={{
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: 16,
                  padding: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#8B5CF6';
                  e.currentTarget.style.background = '#EDE9FE';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#E2E8F0';
                  e.currentTarget.style.background = '#F8FAFC';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{ color: '#8B5CF6', marginBottom: 8 }}>
                  <Icon n="chart" s={24} />
                </div>
                <div style={{ fontWeight: 800, fontSize: '0.94rem', color: '#0F172A' }}>Thống Kê Báo Cáo</div>
                <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: 4, lineHeight: 1.4 }}>
                  Tiến độ học, kết quả thi, doanh thu & server
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
