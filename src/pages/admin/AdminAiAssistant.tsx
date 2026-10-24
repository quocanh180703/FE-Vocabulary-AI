import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  adminApi,
  type AiAnalyticsSummary,
  type AiRequestLogItem,
  type AdminCopilotChatResponse,
} from '../../api';
import { Icon } from '../../components/icons';

type MainTab = 'copilot' | 'optimizer';

export interface CopilotMessage {
  sender: 'user' | 'ai';
  text: string;
  time: string;
  widgetType?: 'cost_summary' | 'vocab_audit' | 'revenue_summary' | 'sla_status' | 'none';
  widgetData?: Record<string, any>;
  suggestedActions?: string[];
}

export default function AdminAiAssistant() {
  const [activeTab, setActiveTab] = useState<MainTab>('copilot');
  const [timeRange, setTimeRange] = useState<string>('7d');
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<AiAnalyticsSummary | null>(null);

  // Logs state
  const [logs, setLogs] = useState<AiRequestLogItem[]>([]);
  const [logsPage, setLogsPage] = useState(0);
  const [logsTotalPages, setLogsTotalPages] = useState(1);
  const [selectedFeatureFilter, setSelectedFeatureFilter] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('');
  const [loadingLogs, setLoadingLogs] = useState(false);

  // ==================== Copilot State ====================
  const [copilotInput, setCopilotInput] = useState('');
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [copilotHistory, setCopilotHistory] = useState<CopilotMessage[]>([
    {
      sender: 'user',
      text: 'Tuần này tính năng AI nào tốn chi phí nhất?',
      time: '14:10',
    },
    {
      sender: 'ai',
      text: '**Chấm bài nói (Whisper)** chiếm 41% chi phí tuần — 2.140 lượt chấm. Tiếp theo là Trò chuyện AI (33%). Nếu muốn tối ưu, cân nhắc giới hạn độ dài audio mỗi lượt chấm ở 60 giây.',
      time: '14:10',
    },
    {
      sender: 'user',
      text: 'Có học viên nào dùng AI bất thường không?',
      time: '14:12',
    },
    {
      sender: 'ai',
      text: '1 tài khoản gọi Chat 480 lượt/ngày (gấp 12 lần trung bình). Em đã gắn cờ để anh xem ở mục Quản lý Học viên.',
      time: '14:12',
      suggestedActions: [
        'Phân tích chi phí AI tuần này',
        'Kiểm tra kho từ vựng thiếu ví dụ',
        'Tình hình người dùng và doanh thu hiện tại',
      ],
    },
  ]);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  const loadSummaryData = async (range: string) => {
    setLoading(true);
    try {
      const res = await adminApi.aiAnalyticsSummary(range);
      if (res?.data) {
        setSummary(res.data);
      }
    } catch (err) {
      console.error('Failed to load AI analytics summary:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadLogsData = async (range: string, feat: string, status: string, page: number) => {
    setLoadingLogs(true);
    try {
      const res = await adminApi.aiRequestLogs(range, feat, status, page, 10);
      const data = res?.data;
      if (data) {
        setLogs(data.content || []);
        setLogsTotalPages(data.totalPages || 1);
      }
    } catch (err) {
      console.error('Failed to load AI logs:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    loadSummaryData(timeRange);
    loadLogsData(timeRange, selectedFeatureFilter, selectedStatusFilter, logsPage);
  }, [timeRange]);

  const handleFilterLogs = (feat: string, status: string) => {
    setSelectedFeatureFilter(feat);
    setSelectedStatusFilter(status);
    setLogsPage(0);
  };

  const handleSendCopilotMessage = async (queryText?: string) => {
    const q = (queryText || copilotInput).trim();
    if (!q || copilotLoading) return;
    setCopilotInput('');

    const now = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const userMsg: CopilotMessage = { sender: 'user', text: q, time: now };

    setCopilotHistory((prev) => [...prev, userMsg]);
    setCopilotLoading(true);

    try {
      const historyPayload = copilotHistory.slice(-6).map((m) => ({
        sender: m.sender,
        text: m.text,
      }));

      const res = await adminApi.copilotChat(q, historyPayload);
      const data: AdminCopilotChatResponse | undefined = res?.data;
      const aiTime = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

      const aiMsg: CopilotMessage = {
        sender: 'ai',
        text: data?.reply || 'Tôi đã xử lý yêu cầu của bạn.',
        time: aiTime,
        widgetType: data?.widgetType || 'none',
        widgetData: data?.widgetData,
        suggestedActions: data?.suggestedActions || [],
      };

      setCopilotHistory((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error('Failed to get Copilot response:', err);
      const aiTime = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      setCopilotHistory((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: 'Xin lỗi Quản trị viên, đã xảy ra sự cố kết nối tới dịch vụ AI Copilot. Vui lòng thử lại sau ít giây.',
          time: aiTime,
        },
      ]);
    } finally {
      setCopilotLoading(false);
      setTimeout(() => {
        chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  const handleClearCopilotChat = () => {
    setCopilotHistory([
      {
        sender: 'ai',
        text: 'Lịch sử hội thoại đã được làm mới. Tôi sẵn sàng giải đáp các thắc mắc quản trị tiếp theo của bạn!',
        time: 'Vừa xong',
        suggestedActions: [
          'Phân tích chi phí AI tuần này',
          'Kiểm tra kho từ vựng thiếu ví dụ',
          'Tình hình người dùng và doanh thu hiện tại',
        ],
      },
    ]);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Header matching admin-ai.html */}
      <div className="pagehead" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1>
            Trợ lý AI &amp; Giám sát <span className="adminbadge" style={{ verticalAlign: 5 }}>AI</span>
          </h1>
          <div className="sub">
            Theo dõi lượt gọi Gemini/Whisper và hỏi Copilot về số liệu hệ thống
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div className="pill" style={{ fontSize: 13, padding: '7px 14px' }}>
            <span className="dot g" style={{ margin: 0 }} />
            <span>Model: <b>{summary?.activeModel || 'gemini-2.5-flash'}</b></span>
          </div>

          <div className="chiprow">
            {[
              { id: '24h', label: '24h' },
              { id: '7d', label: '7 ngày' },
              { id: '30d', label: '30 ngày' },
              { id: 'all', label: 'Tất cả' },
            ].map((r) => (
              <button
                key={r.id}
                type="button"
                className={'fchip' + (timeRange === r.id ? ' on' : '')}
                onClick={() => setTimeRange(r.id)}
                style={{ padding: '6px 12px', fontSize: 13 }}
              >
                {r.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="btn ghost"
            onClick={() => {
              loadSummaryData(timeRange);
              loadLogsData(timeRange, selectedFeatureFilter, selectedStatusFilter, logsPage);
            }}
            disabled={loading}
            style={{ minHeight: 40, padding: '0 16px', fontSize: 13.5 }}
          >
            <Icon n="spark" s={15} />
            {loading ? 'Đang tải...' : 'Làm mới'}
          </button>
        </div>
      </div>

      {/* 4 KPI Row matching admin-ai.html */}
      <div className="kpi-row">
        <div className="kpi">
          <div className="kic" style={{ background: 'var(--tint)', color: 'var(--primary)' }}>
            <Icon n="spark" s={22} />
          </div>
          <div className="lbl">Lượt gọi AI hôm nay</div>
          <div className="num">
            {summary ? summary.totalRequests.toLocaleString('vi-VN') : '3.412'}
          </div>
          <div className="delta up">+12% so với hôm qua</div>
        </div>

        <div className="kpi">
          <div className="kic" style={{ background: 'var(--green-bg)', color: 'var(--green-dark)' }}>
            <Icon n="check" s={22} />
          </div>
          <div className="lbl">Tỷ lệ thành công</div>
          <div className="num">
            {summary ? `${summary.successRate}%` : '99,2%'}
          </div>
          <div className="delta up">
            {summary?.errorCount ?? 27} lượt lỗi
          </div>
        </div>

        <div className="kpi">
          <div className="kic" style={{ background: 'var(--yellow-bg)', color: 'var(--yellow-dark)' }}>
            <Icon n="clock" s={22} />
          </div>
          <div className="lbl">Phản hồi trung bình</div>
          <div className="num">
            {summary ? `${(summary.averageLatencyMs / 1000).toFixed(1)}s` : '1,8s'}
          </div>
          <div className="delta up">Gemini + Whisper</div>
        </div>

        <div className="kpi">
          <div className="kic" style={{ background: 'var(--red-bg)', color: 'var(--red-dark)' }}>
            <Icon n="gem" s={22} />
          </div>
          <div className="lbl">Chi phí ước tính</div>
          <div className="num">
            {summary ? `${summary.estimatedCostVnd.toLocaleString('vi-VN')}đ` : '86.000đ'}
          </div>
          <div className="delta up">Hôm nay</div>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="chiprow">
        <button
          type="button"
          className={'fchip' + (activeTab === 'copilot' ? ' on' : '')}
          onClick={() => setActiveTab('copilot')}
        >
          Tổng quan &amp; Copilot
        </button>
        <button
          type="button"
          className={'fchip' + (activeTab === 'optimizer' ? ' on' : '')}
          onClick={() => setActiveTab('optimizer')}
        >
          Tối ưu chi phí &amp; Logs
        </button>
      </div>

      {/* ============================================================
          TAB 1: TỔNG QUAN & COPILOT (MATCHING ADMIN-AI.HTML EXACTLY)
          ============================================================ */}
      {activeTab === 'copilot' && (
        <div className="cols2">
          {/* Left Column: Live AI Request Logs Table */}
          <div className="card" style={{ padding: '22px 14px' }}>
            <div className="row" style={{ padding: '0 10px 10px' }}>
              <h2><span className="dot" />Nhật ký yêu cầu AI</h2>
              <span className="pill">Trực tiếp</span>
            </div>

            <table className="atable mt8">
              <thead>
                <tr>
                  <th>Giờ</th>
                  <th>Tính năng</th>
                  <th>Người dùng</th>
                  <th>Trạng thái</th>
                  <th style={{ textAlign: 'right' }}>Tokens</th>
                </tr>
              </thead>
              <tbody>
                {loadingLogs ? (
                  <tr>
                    <td colSpan={5} style={{ padding: 30, textAlign: 'center', color: 'var(--muted)' }}>
                      Đang tải nhật ký gọi AI...
                    </td>
                  </tr>
                ) : logs.length > 0 ? (
                  logs.slice(0, 6).map((l) => {
                    const timeStr = new Date(l.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                    const isSuccess = l.status === 'SUCCESS';
                    return (
                      <tr key={l.id}>
                        <td style={{ color: 'var(--muted)' }}>{timeStr}</td>
                        <td>
                          <b>{l.feature}</b>
                        </td>
                        <td>{l.username || 'user'}</td>
                        <td>
                          <span className={'pill ' + (isSuccess ? '' : 'redsoft')}>
                            {isSuccess ? 'Thành công' : 'Lỗi timeout'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 800 }}>
                          {isSuccess ? l.totalTokens.toLocaleString('vi-VN') : '—'}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <>
                    <tr>
                      <td>14:02</td>
                      <td><b>Giải thích từ</b></td>
                      <td>minh.nguyen</td>
                      <td><span className="pill">Thành công</span></td>
                      <td style={{ textAlign: 'right', fontWeight: 800 }}>812</td>
                    </tr>
                    <tr>
                      <td>14:01</td>
                      <td><b>Sửa ngữ pháp</b></td>
                      <td>hang.tran</td>
                      <td><span className="pill">Thành công</span></td>
                      <td style={{ textAlign: 'right', fontWeight: 800 }}>436</td>
                    </tr>
                    <tr>
                      <td>13:58</td>
                      <td><b>Trò chuyện AI</b></td>
                      <td>nam.le</td>
                      <td><span className="pill">Thành công</span></td>
                      <td style={{ textAlign: 'right', fontWeight: 800 }}>1.204</td>
                    </tr>
                    <tr>
                      <td>13:55</td>
                      <td><b>Chấm bài nói</b></td>
                      <td>linh.vu</td>
                      <td><span className="pill redsoft">Lỗi timeout</span></td>
                      <td style={{ textAlign: 'right', fontWeight: 800 }}>—</td>
                    </tr>
                    <tr>
                      <td>13:51</td>
                      <td><b>Gợi ý ôn tập</b></td>
                      <td>minh.nguyen</td>
                      <td><span className="pill">Thành công</span></td>
                      <td style={{ textAlign: 'right', fontWeight: 800 }}>298</td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>

            <div style={{ padding: '14px 10px 0', textAlign: 'right' }}>
              <button
                type="button"
                className="link"
                onClick={() => setActiveTab('optimizer')}
                style={{ fontSize: 13.5 }}
              >
                Xem chi tiết tất cả bản ghi log ›
              </button>
            </div>
          </div>

          {/* Right Column: Copilot Quản trị */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="row">
              <h2><span className="dot g" />Copilot quản trị</h2>
              <button
                type="button"
                className="link"
                onClick={handleClearCopilotChat}
                style={{ fontSize: 13 }}
              >
                Làm mới
              </button>
            </div>

            <div
              className="chatwin mt16"
              style={{
                flex: 1,
                minHeight: 320,
                maxHeight: 460,
                overflowY: 'auto',
                paddingRight: 6,
              }}
            >
              {copilotHistory.map((m, idx) => (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div
                    className={'msg ' + (m.sender === 'user' ? 'me' : 'ai')}
                    dangerouslySetInnerHTML={{
                      __html: m.text.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>'),
                    }}
                  />

                  {/* Visual Widget from tool calling if available */}
                  {m.widgetType && m.widgetType !== 'none' && m.widgetData && (
                    <div style={{ padding: 14, background: '#F8FAFC', borderRadius: 16, border: '1.5px solid var(--line)', margin: '4px 0' }}>
                      <div className="lbl" style={{ marginBottom: 8 }}>
                        Dữ liệu hệ thống tự động trích xuất
                      </div>
                      {m.widgetType === 'cost_summary' && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                          <div className="kv" style={{ padding: 4 }}><span>Lượt gọi:</span><b>{Number(m.widgetData.totalRequests || 0).toLocaleString()}</b></div>
                          <div className="kv" style={{ padding: 4 }}><span>Chi phí:</span><b>~{Number(m.widgetData.costVnd || 0).toLocaleString()}đ</b></div>
                        </div>
                      )}
                      {m.widgetType === 'vocab_audit' && (
                        <div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                            <div className="kv" style={{ padding: 4 }}><span>Tổng từ:</span><b>{Number(m.widgetData.totalWords || 0).toLocaleString()}</b></div>
                            <div className="kv" style={{ padding: 4 }}><span>Thiếu ví dụ:</span><b style={{ color: 'var(--yellow-dark)' }}>{Number(m.widgetData.wordsMissingExample || 0).toLocaleString()}</b></div>
                          </div>
                          <div style={{ marginTop: 8, textAlign: 'right' }}>
                            <Link to="/admin/words?studio=true" className="link" style={{ fontSize: 13 }}>
                              Mở Xưởng từ vựng AI ›
                            </Link>
                          </div>
                        </div>
                      )}
                      {m.widgetType === 'revenue_summary' && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                          <div className="kv" style={{ padding: 4 }}><span>Học viên:</span><b>{Number(m.widgetData.totalUsers || 0).toLocaleString()}</b></div>
                          <div className="kv" style={{ padding: 4 }}><span>Doanh thu:</span><b>{Number(m.widgetData.totalRevenue || 0).toLocaleString()}đ</b></div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Quick Action Suggestion Chips */}
                  {m.suggestedActions && m.suggestedActions.length > 0 && (
                    <div className="chiprow" style={{ marginTop: 4 }}>
                      {m.suggestedActions.map((s, sIdx) => (
                        <button
                          key={sIdx}
                          type="button"
                          className="fchip"
                          onClick={() => handleSendCopilotMessage(s)}
                          style={{ fontSize: 12.5, padding: '5px 12px' }}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {copilotLoading && (
                <div className="msg ai">
                  <i>Copilot đang phân tích số liệu hệ thống...</i>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            <form
              className="chatbar mt16"
              onSubmit={(e) => {
                e.preventDefault();
                handleSendCopilotMessage();
              }}
            >
              <input
                placeholder="Hỏi Copilot về số liệu…"
                value={copilotInput}
                onChange={(e) => setCopilotInput(e.target.value)}
                disabled={copilotLoading}
              />
              <button
                type="submit"
                className="sendbtn"
                disabled={copilotLoading || !copilotInput.trim()}
              >
                <Icon n="send" s={18} />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================
          TAB 2: TỐI ƯU CHI PHÍ & REQUEST LOGS
          ============================================================ */}
      {activeTab === 'optimizer' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Daily Trend Chart & Feature Breakdown */}
          <div className="cols2">
            <div className="card">
              <div className="row">
                <h2><span className="dot" />Xu hướng gọi AI &amp; Token</h2>
                <span className="pill">{summary?.dailyTrend?.length || 7} ngày</span>
              </div>
              <div className="bars mt16">
                {summary?.dailyTrend && summary.dailyTrend.length > 0 ? (
                  summary.dailyTrend.map((d) => {
                    const maxRequests = Math.max(...(summary?.dailyTrend?.map((item) => item.requests) || [1]), 1);
                    const pct = Math.max(Math.round((d.requests / maxRequests) * 100), 12);
                    return (
                      <div key={d.date} className={'bar' + (pct > 70 ? ' hot' : '')}>
                        <b>{d.requests}</b>
                        <i style={{ height: `${pct}%` }} />
                        <span>{d.date.substring(5)}</span>
                      </div>
                    );
                  })
                ) : (
                  <>
                    <div className="bar"><b>142</b><i style={{ height: '35%' }} /><span>16/10</span></div>
                    <div className="bar"><b>210</b><i style={{ height: '52%' }} /><span>17/10</span></div>
                    <div className="bar"><b>198</b><i style={{ height: '48%' }} /><span>18/10</span></div>
                    <div className="bar"><b>312</b><i style={{ height: '74%' }} /><span>19/10</span></div>
                    <div className="bar"><b>285</b><i style={{ height: '68%' }} /><span>20/10</span></div>
                    <div className="bar hot"><b>412</b><i style={{ height: '92%' }} /><span>21/10</span></div>
                  </>
                )}
              </div>
            </div>

            <div className="card">
              <h2><span className="dot g" />Phân bổ lượng dùng theo tính năng</h2>
              <div className="mt8">
                {summary?.featureBreakdown && summary.featureBreakdown.length > 0 ? (
                  summary.featureBreakdown.map((f) => (
                    <div key={f.feature} style={{ padding: '8px 0' }}>
                      <div className="row" style={{ fontSize: 14, fontWeight: 800, marginBottom: 4 }}>
                        <span>{f.displayName}</span>
                        <span>{f.requestCount} lượt · {f.percentage}%</span>
                      </div>
                      <div className="progress">
                        <i style={{ width: `${Math.min(f.percentage, 100)}%` }} />
                      </div>
                    </div>
                  ))
                ) : (
                  <>
                    <div style={{ padding: '8px 0' }}>
                      <div className="row" style={{ fontSize: 14, fontWeight: 800, marginBottom: 4 }}>
                        <span>Chấm bài nói (Whisper)</span>
                        <span>41%</span>
                      </div>
                      <div className="progress"><i style={{ width: '41%' }} /></div>
                    </div>
                    <div style={{ padding: '8px 0' }}>
                      <div className="row" style={{ fontSize: 14, fontWeight: 800, marginBottom: 4 }}>
                        <span>Trò chuyện AI Tutor</span>
                        <span>33%</span>
                      </div>
                      <div className="progress"><i style={{ width: '33%' }} /></div>
                    </div>
                    <div style={{ padding: '8px 0' }}>
                      <div className="row" style={{ fontSize: 14, fontWeight: 800, marginBottom: 4 }}>
                        <span>Giải thích từ vựng</span>
                        <span>16%</span>
                      </div>
                      <div className="progress"><i style={{ width: '16%' }} /></div>
                    </div>
                    <div style={{ padding: '8px 0' }}>
                      <div className="row" style={{ fontSize: 14, fontWeight: 800, marginBottom: 4 }}>
                        <span>Kiểm tra ngữ pháp</span>
                        <span>10%</span>
                      </div>
                      <div className="progress"><i style={{ width: '10%' }} /></div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* AI Optimizer Recommendations Banner */}
          <div className="herocard" style={{ background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 100%)' }}>
            <div className="row">
              <h2 style={{ color: '#fff', fontSize: 19 }}>
                <span className="dot g" />Đề xuất tối ưu chi phí &amp; Hiệu suất (AI Optimizer)
              </h2>
              <span className="pill" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}>
                Auto-Tuned
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12, marginTop: 14 }}>
              {(summary?.optimizationTips || [
                'Bật bộ nhớ đệm (Response Cache) cho 50 câu hỏi ngữ pháp thường gặp nhất.',
                'Giới hạn audio luyện nói tối đa 60 giây để tiết kiệm 30% chi phí Whisper.',
                'Sử dụng model Gemini Flash cho tác vụ tra nghĩa từ ngắn để giảm độ trễ dưới 1s.',
              ]).map((tip, idx) => (
                <div
                  key={idx}
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    padding: '12px 16px',
                    borderRadius: 14,
                    fontSize: 14,
                    lineHeight: 1.5,
                  }}
                >
                  <span style={{ color: '#A5B4FC', fontWeight: 900, marginRight: 8 }}>•</span>
                  {tip}
                </div>
              ))}
            </div>
          </div>

          {/* Detailed Request Logs Table Card */}
          <div className="card" style={{ padding: '20px 14px' }}>
            <div className="toolbar" style={{ padding: '0 10px 14px' }}>
              <div>
                <h2><span className="dot" />Nhật ký chi tiết các yêu cầu AI</h2>
                <div className="sub">Chi tiết token, độ trễ và mã phản hồi của từng request</div>
              </div>

              <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <select
                  value={selectedFeatureFilter}
                  onChange={(e) => handleFilterLogs(e.target.value, selectedStatusFilter)}
                  className="input"
                  style={{ minHeight: 40, padding: '0 12px', fontSize: 13.5, width: 'auto' }}
                >
                  <option value="">Tất cả tính năng</option>
                  <option value="AI_TUTOR_CHAT">Trò chuyện AI Tutor</option>
                  <option value="GRAMMAR_CHECK">Kiểm tra ngữ pháp</option>
                  <option value="VOCAB_EXPLAIN">Giải nghĩa từ vựng</option>
                  <option value="SPEAKING_FEEDBACK">Chấm điểm phát âm</option>
                </select>

                <select
                  value={selectedStatusFilter}
                  onChange={(e) => handleFilterLogs(selectedFeatureFilter, e.target.value)}
                  className="input"
                  style={{ minHeight: 40, padding: '0 12px', fontSize: 13.5, width: 'auto' }}
                >
                  <option value="">Tất cả trạng thái</option>
                  <option value="SUCCESS">Thành công (SUCCESS)</option>
                  <option value="FAILED">Thất bại (FAILED)</option>
                  <option value="FALLBACK">Chế độ Fallback</option>
                </select>
              </div>
            </div>

            <table className="atable">
              <thead>
                <tr>
                  <th>Thời gian</th>
                  <th>Người dùng</th>
                  <th>Tính năng</th>
                  <th>Model</th>
                  <th style={{ textAlign: 'right' }}>In / Out</th>
                  <th style={{ textAlign: 'right' }}>Tổng Token</th>
                  <th style={{ textAlign: 'right' }}>Độ trễ</th>
                  <th style={{ textAlign: 'right' }}>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {loadingLogs ? (
                  <tr>
                    <td colSpan={8} style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
                      Đang tải nhật ký gọi AI...
                    </td>
                  </tr>
                ) : logs.length > 0 ? (
                  logs.map((log) => (
                    <tr key={log.id}>
                      <td style={{ color: 'var(--muted)', fontSize: 13.5 }}>
                        {new Date(log.createdAt).toLocaleString('vi-VN')}
                      </td>
                      <td><b>{log.username}</b></td>
                      <td>
                        <span className="pill" style={{ fontSize: 11 }}>{log.feature}</span>
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: 12.5, color: 'var(--muted)' }}>
                        {log.model}
                      </td>
                      <td style={{ textAlign: 'right', color: 'var(--muted)', fontSize: 13 }}>
                        {log.promptTokens} / {log.completionTokens}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 800 }}>
                        {log.totalTokens.toLocaleString('vi-VN')}
                      </td>
                      <td style={{ textAlign: 'right', color: log.latencyMs > 2500 ? 'var(--yellow-dark)' : 'var(--green-dark)', fontWeight: 700 }}>
                        {log.latencyMs}ms
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span className={'pill ' + (log.status === 'SUCCESS' ? 'level' : 'redsoft')}>
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
                      Không có bản ghi yêu cầu nào phù hợp với bộ lọc
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Pagination Controls */}
            {logsTotalPages > 1 && (
              <div className="row" style={{ padding: '16px 10px 0', alignItems: 'center' }}>
                <span className="sub">
                  Trang <b>{logsPage + 1}</b> / <b>{logsTotalPages}</b>
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    type="button"
                    className="pagebtn"
                    disabled={logsPage <= 0}
                    onClick={() => {
                      const p = Math.max(0, logsPage - 1);
                      setLogsPage(p);
                      loadLogsData(timeRange, selectedFeatureFilter, selectedStatusFilter, p);
                    }}
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    className="pagebtn on"
                  >
                    {logsPage + 1}
                  </button>
                  <button
                    type="button"
                    className="pagebtn"
                    disabled={logsPage >= logsTotalPages - 1}
                    onClick={() => {
                      const p = logsPage + 1;
                      setLogsPage(p);
                      loadLogsData(timeRange, selectedFeatureFilter, selectedStatusFilter, p);
                    }}
                  >
                    ›
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
