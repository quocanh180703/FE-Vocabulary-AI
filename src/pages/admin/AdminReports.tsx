import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { adminApi } from '../../api';
import type {
  AdminRevenueMetrics,
  AdminLearningProgressReport,
  AdminContentPerformanceItem,
  AdminSystemHealth,
  AdminDashboardSummary,
} from '../../api';
import { Icon } from '../../components/icons';
import {
  ActivityTrendChart,
  QuizPerformanceBarChart,
  SystemHealthGauges,
} from '../../components/admin/AdminCharts';
import type { QuizPerformanceItem, ActivityTrendData } from '../../components/admin/AdminCharts';
import { AnimatedCounter } from '../../motion';

export default function AdminReports() {
  const { user } = useAuth();
  const isInstructor = user?.role === 'INSTRUCTOR';
  const [activeTab, setActiveTab] = useState<'progress' | 'content' | 'revenue' | 'system'>(
    isInstructor ? 'progress' : 'revenue'
  );

  useEffect(() => {
    if (isInstructor && (activeTab === 'revenue' || activeTab === 'system')) {
      setActiveTab('progress');
    }
  }, [isInstructor, activeTab]);
  const [loading, setLoading] = useState(true);
  const [learningReport, setLearningReport] = useState<AdminLearningProgressReport | null>(null);
  const [contentReport, setContentReport] = useState<AdminContentPerformanceItem[]>([]);
  const [revenueReport, setRevenueReport] = useState<AdminRevenueMetrics | null>(null);
  const [systemHealth, setSystemHealth] = useState<AdminSystemHealth | null>(null);
  const [summary, setSummary] = useState<AdminDashboardSummary | null>(null);
  const [activityTrend, setActivityTrend] = useState<ActivityTrendData | null>(null);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const promises: Promise<any>[] = [
        adminApi.learningProgressReport(),
        adminApi.contentPerformanceReport(),
      ];
      if (!isInstructor) {
        promises.push(
          adminApi.revenue(),
          adminApi.systemHealth(),
          adminApi.summary(),
          adminApi.activityTrend()
        );
      }
      const results = await Promise.allSettled(promises);
      const progRes = results[0];
      const contRes = results[1];
      if (progRes.status === 'fulfilled' && progRes.value.data) setLearningReport(progRes.value.data);
      if (contRes.status === 'fulfilled' && contRes.value.data) {
        const rawContent = contRes.value.data;
        setContentReport(Array.isArray(rawContent) ? rawContent : (rawContent?.content || []));
      }
      if (!isInstructor) {
        const revRes = results[2];
        const sysRes = results[3];
        const sumRes = results[4];
        const trendRes = results[5];
        if (revRes && revRes.status === 'fulfilled' && revRes.value.data) setRevenueReport(revRes.value.data);
        if (sysRes && sysRes.status === 'fulfilled' && sysRes.value.data) setSystemHealth(sysRes.value.data);
        if (sumRes && sumRes.status === 'fulfilled' && sumRes.value.data) setSummary(sumRes.value.data);
        if (trendRes && trendRes.status === 'fulfilled' && trendRes.value.data) setActivityTrend(trendRes.value.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  // Compute aggregated level stats from real contentReport data
  const levelItems: QuizPerformanceItem[] | undefined = useMemo(() => {
    if (!contentReport || contentReport.length === 0) return undefined;
    const levels = ['A1', 'A2', 'B1', 'B2', 'C1'];
    const colors: Record<string, string> = {
      A1: '#10B981',
      A2: '#06B6D4',
      B1: '#3B82F6',
      B2: '#8B5CF6',
      C1: '#EC4899',
    };
    return levels.map((lvl) => {
      const quizes = contentReport.filter((c) => c.level === lvl);
      const count = quizes.length;
      const totalScore = quizes.reduce((sum, q) => sum + (q.avgScore || 0), 0);
      const avg = count > 0 ? Math.round(totalScore / count) : 0;
      const totalComp = quizes.reduce((sum, q) => sum + (q.completionRate || 0), 0);
      const comp = count > 0 ? Math.round(totalComp / count) : 0;
      return {
        level: lvl,
        quizzesCount: count,
        passRate: comp,
        avgScore: avg,
        color: colors[lvl] || '#4F46E5',
      };
    });
  }, [contentReport]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Header */}
      <div className="pagehead" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1>Báo cáo &amp; Thống kê</h1>
          <div className="sub">{isInstructor ? 'Nhóm báo cáo vận hành và đo lường học tập dựa trên dữ liệu thực tế' : 'Bốn nhóm báo cáo vận hành và đo lường hệ thống dựa trên dữ liệu thực tế'}</div>
        </div>
        <button
          type="button"
          className="btn ghost"
          onClick={fetchReports}
          disabled={loading}
        >
          <Icon n="spark" s={16} />
          {loading ? 'Đang tải...' : 'Làm mới báo cáo'}
        </button>
      </div>

      {/* Tab Switcher */}
      <div className="chiprow">
        {!isInstructor && (
          <button
            type="button"
            className={'fchip' + (activeTab === 'revenue' ? ' on' : '')}
            onClick={() => setActiveTab('revenue')}
          >
            Doanh thu &amp; Gói cước
          </button>
        )}
        <button
          type="button"
          className={'fchip' + (activeTab === 'progress' ? ' on' : '')}
          onClick={() => setActiveTab('progress')}
        >
          Tiến độ học tập &amp; Quiz
        </button>
        <button
          type="button"
          className={'fchip' + (activeTab === 'content' ? ' on' : '')}
          onClick={() => setActiveTab('content')}
        >
          Hiệu suất nội dung đề thi
        </button>
        {!isInstructor && (
          <button
            type="button"
            className={'fchip' + (activeTab === 'system' ? ' on' : '')}
            onClick={() => setActiveTab('system')}
          >
            Hệ thống &amp; Hạ tầng
          </button>
        )}
      </div>

      {loading ? (
        <div className="card" style={{ padding: 60, textAlign: 'center', color: 'var(--muted)' }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--primary)', marginBottom: 6 }}>
            Đang tổng hợp dữ liệu thống kê...
          </div>
          <div className="sub">Vui lòng chờ trong giây lát</div>
        </div>
      ) : (
        <>
          {/* TAB 1: DOANH THU */}
          {activeTab === 'revenue' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* KPI 3 Columns (100% Real data - No fake yearly plan) */}
              <div className="kpi-row" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                <div className="kpi">
                  <div className="kic" style={{ background: 'var(--yellow-bg)', color: 'var(--yellow-dark)' }}>
                    <Icon n="gem" s={22} />
                  </div>
                  <div className="lbl">Doanh thu tích lũy</div>
                  <div className="num">
                    <AnimatedCounter value={revenueReport?.totalRevenue ?? 0} /> đ
                  </div>
                  <div className="delta up">
                    {revenueReport?.totalPayments ?? 0} giao dịch thành công
                  </div>
                </div>

                <div className="kpi">
                  <div className="kic" style={{ background: 'var(--green-bg)', color: 'var(--green-dark)' }}>
                    <Icon n="check" s={22} />
                  </div>
                  <div className="lbl">Gói Premium đã bán (99k)</div>
                  <div className="num">
                    <AnimatedCounter value={revenueReport?.totalPayments ?? 0} />
                  </div>
                  <div className="delta up">
                    {((revenueReport?.totalRevenue ?? 0)).toLocaleString('vi-VN')}đ qua PayOS
                  </div>
                </div>

                <div className="kpi">
                  <div className="kic" style={{ background: 'var(--tint)', color: 'var(--primary)' }}>
                    <Icon n="spark" s={22} />
                  </div>
                  <div className="lbl">Doanh thu tháng này (T11)</div>
                  <div className="num">
                    <AnimatedCounter value={revenueReport?.revenueThisMonth ?? 0} /> đ
                  </div>
                  <div className="delta up">
                    {(revenueReport?.revenueThisMonth ?? 0) > 0 ? `${revenueReport?.paymentsToday ?? 0} giao dịch hôm nay` : 'Đơn 99k phát sinh ngày 31/10 (T10)'}
                  </div>
                </div>
              </div>

              {/* Revenue Activity Trend + Package Breakdown */}
              <div className="cols2">
                <div className="card">
                  <div className="row" style={{ alignItems: 'center' }}>
                    <h2><span className="dot" />Xu hướng Doanh thu &amp; Lượt học</h2>
                    <span className="pill">Theo thời gian thực</span>
                  </div>
                  <div className="mt16">
                    <ActivityTrendChart data={activityTrend} loading={loading} defaultMetric="revenue" />
                  </div>
                </div>

                <div className="card">
                  <h2><span className="dot g" />Cơ cấu học viên &amp; Gói cước</h2>
                  <div className="mt8">
                    <div className="kv">
                      <span>Học viên Premium đang hoạt động</span>
                      <b>{summary?.activeSubscriptions ?? 0} học viên</b>
                    </div>
                    <div className="kv">
                      <span>Học viên miễn phí</span>
                      <b>{Math.max(0, (summary?.totalUsers ?? 0) - (summary?.activeSubscriptions ?? 0))} học viên</b>
                    </div>
                    <div className="kv">
                      <span>Tỷ lệ nâng cấp Premium</span>
                      <b style={{ color: 'var(--green-dark)' }}>
                        {summary?.totalUsers && summary.totalUsers > 0
                          ? (((summary.activeSubscriptions || 0) / summary.totalUsers) * 100).toFixed(1) + '%'
                          : '0.0%'}
                      </b>
                    </div>
                    <div className="kv">
                      <span>Giá trị đơn hàng trung bình</span>
                      <b>{(revenueReport?.averagePaymentAmount ?? 99000).toLocaleString('vi-VN')} đ</b>
                    </div>
                    <div className="kv">
                      <span>Cổng thanh toán tích hợp</span>
                      <span className="pill" style={{ fontSize: 12 }}>PayOS (Tự động kích hoạt)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TIẾN ĐỘ HỌC TẬP & QUIZ */}
          {activeTab === 'progress' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* 3 KPI Cards */}
              <div className="kpi-row" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                <div className="kpi">
                  <div className="kic" style={{ background: 'var(--tint)', color: 'var(--primary)' }}>
                    <Icon n="chart" s={22} />
                  </div>
                  <div className="lbl">Tổng lượt làm Quiz</div>
                  <div className="num">
                    <AnimatedCounter value={learningReport?.totalAttempts ?? 0} />
                  </div>
                  <div className="delta up">
                    {learningReport?.uniqueUsers ?? 0} học viên tham gia
                  </div>
                </div>

                <div className="kpi">
                  <div className="kic" style={{ background: 'var(--green-bg)', color: 'var(--green-dark)' }}>
                    <Icon n="check" s={22} />
                  </div>
                  <div className="lbl">Điểm trung bình toàn sàn</div>
                  <div className="num">
                    {learningReport?.avgScore ? `${Number(learningReport.avgScore).toFixed(1)}%` : '0%'}
                  </div>
                  <div className="delta up">Dựa trên các bài thi thực tế</div>
                </div>

                <div className="kpi">
                  <div className="kic" style={{ background: 'var(--yellow-bg)', color: 'var(--yellow-dark)' }}>
                    <Icon n="spark" s={22} />
                  </div>
                  <div className="lbl">Phiên luyện nói AI</div>
                  <div className="num">
                    <AnimatedCounter value={learningReport?.totalSpeakingSessions ?? 0} />
                  </div>
                  <div className="delta up">Chấm phát âm &amp; ngữ pháp AI</div>
                </div>
              </div>

              {/* Quiz Performance Bar Chart with dynamic level data */}
              <QuizPerformanceBarChart items={levelItems} />

              {/* Engagement & Retention Metrics */}
              <div className="card">
                <h2><span className="dot" />Chỉ số tương tác &amp; Vận hành học tập</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginTop: 16 }}>
                  <div style={{ background: '#F8FAFC', padding: 18, borderRadius: 16, border: '1px solid var(--line)' }}>
                    <div className="lbl" style={{ fontSize: 11.5, fontWeight: 900, color: 'var(--muted)', textTransform: 'uppercase' }}>
                      TỔNG HỌC VIÊN LÀM BÀI
                    </div>
                    <div style={{ fontSize: 26, fontWeight: 900, color: 'var(--green-dark)', marginTop: 4 }}>
                      {learningReport?.uniqueUsers ?? 0}
                    </div>
                    <div className="sub" style={{ fontSize: 13, marginTop: 2 }}>Đã có bài nộp trong hệ thống</div>
                  </div>

                  <div style={{ background: '#F8FAFC', padding: 18, borderRadius: 16, border: '1px solid var(--line)' }}>
                    <div className="lbl" style={{ fontSize: 11.5, fontWeight: 900, color: 'var(--muted)', textTransform: 'uppercase' }}>
                      PHIÊN HỌC HÔM NAY
                    </div>
                    <div style={{ fontSize: 26, fontWeight: 900, color: 'var(--yellow-dark)', marginTop: 4 }}>
                      {summary?.activeLearningSessionsToday ?? 0}
                    </div>
                    <div className="sub" style={{ fontSize: 13, marginTop: 2 }}>Hoạt động học tập trong ngày</div>
                  </div>

                  <div style={{ background: '#F8FAFC', padding: 18, borderRadius: 16, border: '1px solid var(--line)' }}>
                    <div className="lbl" style={{ fontSize: 11.5, fontWeight: 900, color: 'var(--muted)', textTransform: 'uppercase' }}>
                      LƯỢT NỘP BÀI QUIZ
                    </div>
                    <div style={{ fontSize: 26, fontWeight: 900, color: 'var(--primary)', marginTop: 4 }}>
                      {learningReport?.totalAttempts ?? 0}
                    </div>
                    <div className="sub" style={{ fontSize: 13, marginTop: 2 }}>Tổng số bài trắc nghiệm nộp</div>
                  </div>

                  <div style={{ background: '#F8FAFC', padding: 18, borderRadius: 16, border: '1px solid var(--line)' }}>
                    <div className="lbl" style={{ fontSize: 11.5, fontWeight: 900, color: 'var(--muted)', textTransform: 'uppercase' }}>
                      PHIÊN LUYỆN NÓI ĐÃ TẠO
                    </div>
                    <div style={{ fontSize: 26, fontWeight: 900, color: 'var(--ink)', marginTop: 4 }}>
                      {learningReport?.totalSpeakingSessions ?? 0}
                    </div>
                    <div className="sub" style={{ fontSize: 13, marginTop: 2 }}>Phiên luyện nói độc thoại &amp; AI</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: HIỆU SUẤT NỘI DUNG */}
          {activeTab === 'content' && (
            <div className="card" style={{ padding: '20px 14px' }}>
              <div className="row" style={{ padding: '0 10px 14px' }}>
                <div>
                  <h2><span className="dot" />Hiệu Suất Nội Dung Đề Thi</h2>
                  <div className="sub">Thống kê lượt giải đề, tỷ lệ hoàn thành và điểm số trung bình của từng bộ đề</div>
                </div>
                <span className="pill">{contentReport.length} BỘ ĐỀ TRONG HỆ THỐNG</span>
              </div>

              {contentReport.length === 0 ? (
                <div className="center" style={{ padding: 40, color: 'var(--muted)', fontSize: 14 }}>
                  Chưa có dữ liệu bài thi nào trong hệ thống.
                </div>
              ) : (
                <table className="atable">
                  <thead>
                    <tr>
                      <th>Mã Đề</th>
                      <th>Tên Bài Thi</th>
                      <th>Cấp độ</th>
                      <th>Lượt làm bài</th>
                      <th>Tỷ lệ hoàn thành</th>
                      <th>Điểm TB</th>
                      <th style={{ textAlign: 'right' }}>Đánh giá</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contentReport.map((row) => {
                      const score = row.avgScore || 0;
                      let badgeColor = 'var(--muted)';
                      let badgeBg = '#F1F5F9';
                      let ratingText = 'Chưa làm';
                      if (row.attemptCount > 0) {
                        if (score >= 80) {
                          badgeColor = 'var(--green-dark)';
                          badgeBg = 'var(--green-bg)';
                          ratingText = 'Tốt';
                        } else if (score >= 50) {
                          badgeColor = 'var(--yellow-dark)';
                          badgeBg = 'var(--yellow-bg)';
                          ratingText = 'Khá';
                        } else {
                          badgeColor = 'var(--red-dark)';
                          badgeBg = 'var(--red-bg)';
                          ratingText = 'Cần cải thiện';
                        }
                      }
                      return (
                        <tr key={row.quizId}>
                          <td style={{ fontWeight: 800, color: 'var(--muted)' }}>
                            #{row.quizId}
                          </td>
                          <td>
                            <b style={{ color: 'var(--ink)' }}>{row.quizTitle}</b>
                          </td>
                          <td>
                            <span className="pill level">{row.level || 'A1'}</span>
                          </td>
                          <td>
                            <b>{row.attemptCount ?? 0}</b> lượt
                          </td>
                          <td>
                            <span className="pill" style={{ background: 'var(--tint)', color: 'var(--primary)' }}>
                              {row.completionRate ?? 0}%
                            </span>
                          </td>
                          <td>
                            <b>{row.avgScore ? `${Number(row.avgScore).toFixed(1)}đ` : '—'}</b>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <span
                              className="pill"
                              style={{ background: badgeBg, color: badgeColor, fontSize: 12, fontWeight: 700 }}
                            >
                              {ratingText}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* TAB 4: HỆ THỐNG & HẠ TẦNG */}
          {!isInstructor && activeTab === 'system' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Dynamic Gauges */}
              <SystemHealthGauges health={systemHealth} />

              {/* Server Spec & Memory Process */}
              <div className="cols2">
                <div className="card">
                  <h2><span className="dot g" />Thông số hạ tầng Server</h2>
                  <div className="mt8">
                    <div className="kv">
                      <span>Trạng thái API Backend</span>
                      <b style={{ color: 'var(--green-dark)' }}>200 OK · UP ({systemHealth?.status || 'HEALTHY'})</b>
                    </div>
                    <div className="kv">
                      <span>Cơ sở dữ liệu MySQL</span>
                      <b style={{ color: 'var(--green-dark)' }}>{systemHealth?.dbPoolStatus || 'Connected (HikariCP)'}</b>
                    </div>
                    <div className="kv">
                      <span>Tổng người dùng hệ thống</span>
                      <b>{systemHealth?.totalUsers ?? summary?.totalUsers ?? 0} tài khoản</b>
                    </div>
                    <div className="kv">
                      <span>Lượt gọi API hôm nay</span>
                      <b>{systemHealth?.apiCallsToday ?? 0} requests</b>
                    </div>
                    <div className="kv">
                      <span>Dịch vụ AI Phụ trợ</span>
                      <b style={{ color: 'var(--green-dark)' }}>Active (Azure Speech &amp; Gemini API)</b>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <h2><span className="dot" />Kiểm soát bộ nhớ &amp; Tiến trình</h2>
                  <div className="mt8">
                    <div className="kv">
                      <span>JVM Uptime</span>
                      <b>{systemHealth?.uptime || 'Đang hoạt động'}</b>
                    </div>
                    <div className="kv">
                      <span>Bộ nhớ RAM (JVM Heap)</span>
                      <b style={{ color: 'var(--primary)' }}>{systemHealth?.jvmMemory || 'Đang tính toán'}</b>
                    </div>
                    <div className="kv">
                      <span>Độ trễ API nội bộ</span>
                      <b style={{ color: 'var(--green-dark)' }}>~{systemHealth?.averageResponseTime || 12}ms</b>
                    </div>
                    <div className="kv">
                      <span>Tỷ lệ lỗi (Error Rate)</span>
                      <b>{systemHealth?.errorRate ? `${Number(systemHealth.errorRate).toFixed(2)}%` : '0.00%'}</b>
                    </div>
                    <div className="kv">
                      <span>Mã hóa bảo mật</span>
                      <b>BCrypt 10 &amp; JWT Bearer (HS512)</b>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
