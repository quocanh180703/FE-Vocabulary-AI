import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { learnApi, errMsg, daysOverdue } from '../api';
import type { ProgressItem, LearningStats } from '../api';
import { useAuth } from '../auth/AuthContext';
import { Mascot, Icon } from '../components/icons';
import { staggerContainer, staggerItem } from '../motion';

export default function Dashboard() {
  const { user } = useAuth();
  const [queue, setQueue] = useState<ProgressItem[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<LearningStats | null>(null);
  const [err, setErr] = useState('');
  const nav = useNavigate();

  useEffect(() => {
    learnApi.queue(10)
      .then(({ data }) => {
        setQueue(data?.content || []);
        setTotal(data?.totalElements || 0);
      })
      .catch((e) => {
        const msg = errMsg(e);
        if (!msg.toLowerCase().includes('proxy') && !msg.toLowerCase().includes('session')) {
          setErr(msg);
        }
        setQueue([]);
        setTotal(0);
      });

    learnApi.stats()
      .then(({ data }) => {
        if (data) setStats(data);
      })
      .catch(() => {});
  }, []);

  const totalLearned = stats ? (stats.masteredWords || 0) + (stats.learningWords || 0) : 0;
  const accuracyRate = stats ? Math.round(stats.averageAccuracy || stats.overallAccuracyRate || 0) : 0;
  const totalActs = stats ? stats.totalActivities || 0 : 0;

  const kpis = [
    {
      lbl: 'Từ đến hạn ôn',
      num: String(stats?.wordsNeedingReview ?? total),
      delta: (stats?.wordsNeedingReview ?? total) > 0 ? `${stats?.wordsNeedingReview ?? total} từ chờ` : 'hết nợ',
      dir: (stats?.wordsNeedingReview ?? total) > 0 ? 'down' : 'up',
    },
    {
      lbl: 'Từ đang học',
      num: String(totalLearned || 0),
      delta: stats ? `${stats.masteredWords || 0} đã thành thạo` : 'bắt đầu học',
      dir: 'up',
    },
    {
      lbl: 'Độ chính xác TB',
      num: String(accuracyRate || 0),
      unit: '%',
      delta: stats ? `${stats.correctAnswers || 0} câu đúng` : 'chưa có dữ liệu',
      dir: 'up',
    },
    {
      lbl: 'Tổng hoạt động',
      num: String(totalActs || 0),
      unit: 'lần',
      delta: 'tổng số lượt học & ôn',
      dir: 'up',
    },
  ];

  const displayName = user?.fullName || user?.username || 'bạn';

  return (
    <div className="content">
      <div className="pagehead" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '4px 12px', background: 'rgba(79, 70, 229, 0.08)', borderRadius: 99, color: 'var(--primary)', fontSize: 13, fontWeight: 800, marginBottom: 8 }}>
            <Icon n="spark" s={14} /> AI Learning Workspace
          </div>
          <h1>Tổng quan học tập</h1>
          <div className="sub">Chào mừng trở lại, <b style={{ color: 'var(--ink)' }}>{displayName}</b> 👋 — hôm nay bạn muốn chinh phục mục tiêu nào?</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="btn ghost" onClick={() => nav('/roadmap')} style={{ minHeight: 42, padding: '0 16px', fontSize: 14 }}>
            <Icon n="chart" s={18} /> Lộ trình học AI
          </button>
        </div>
      </div>

      {err && <div className="error">{err}</div>}

      {/* Streak & Daily Goal Section */}
      <div className="streak-card">
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 24 }}>
          {/* Left: Streak Info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 20px rgba(249, 115, 22, 0.32)',
                color: '#fff',
                flexShrink: 0,
              }}
            >
              <Icon n="flame" s={34} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 34, fontWeight: 900, color: '#C2410C', lineHeight: 1, letterSpacing: '-0.5px' }}>
                  {stats?.currentStreak ?? 0}
                </span>
                <span style={{ fontSize: 19, fontWeight: 800, color: '#9A3412' }}>
                  ngày streak liên tiếp
                </span>
                <span style={{ fontSize: 12, color: '#9A3412', background: '#FEF3C7', padding: '3px 10px', borderRadius: 99, fontWeight: 800, border: '1px solid #FDE68A' }}>
                  🏆 Kỷ lục: {stats?.longestStreak ?? stats?.currentStreak ?? 0} ngày
                </span>
              </div>
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                {stats?.todayCompleted ? (
                  <span className="pill" style={{ background: '#DCFCE7', color: '#15803D', fontWeight: 800, border: '1px solid #BBF7D0' }}>
                    ✓ Đã hoàn thành hôm nay — Chuỗi streak được bảo toàn!
                  </span>
                ) : (
                  <span className="pill" style={{ background: '#FFEDD5', color: '#C2410C', fontWeight: 800, border: '1px solid #FED7AA' }}>
                    ⚡ Chưa học hôm nay — Hoàn thành 1 bài để giữ chuỗi nhé!
                  </span>
                )}
                <span style={{ fontSize: 13, color: '#78350F', fontWeight: 700 }}>
                  Tích lũy <b>{stats?.totalPoints ?? 0}</b> kim cương 💎
                </span>
              </div>
            </div>
          </div>

          {/* Right: 7-Day Flame Track */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#FFFFFF', padding: '8px 12px', borderRadius: 16, border: '1px solid #FED7AA', boxShadow: '0 2px 8px rgba(249, 115, 22, 0.06)' }}>
            {(stats?.weekProgress || [
              { dayName: 'T2', completed: true, isToday: false },
              { dayName: 'T3', completed: true, isToday: false },
              { dayName: 'T4', completed: true, isToday: false },
              { dayName: 'T5', completed: true, isToday: false },
              { dayName: 'T6', completed: true, isToday: false },
              { dayName: 'T7', completed: true, isToday: false },
              { dayName: 'CN', completed: true, isToday: true },
            ]).map((d, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 8px',
                  borderRadius: 12,
                  background: d.isToday ? '#FFFBEB' : 'transparent',
                  border: d.isToday ? '1.5px solid #F59E0B' : '1.5px solid transparent',
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: d.completed ? 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)' : '#F1F5F9',
                    color: d.completed ? '#fff' : '#94A3B8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: d.completed ? '0 2px 8px rgba(249, 115, 22, 0.25)' : 'none',
                  }}
                >
                  <Icon n="flame" s={18} />
                </div>
                <span style={{ fontSize: 12, fontWeight: d.isToday ? 800 : 700, color: d.isToday ? '#B45309' : '#64748B' }}>
                  {d.dayName}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Daily Goal Bar */}
        <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid rgba(251, 191, 36, 0.25)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, fontSize: 13, fontWeight: 700 }}>
            <span style={{ color: '#9A3412' }}>
              🎯 Mục tiêu hôm nay: <b>{stats?.todayActivitiesCount ?? 0}</b> / {stats?.dailyGoal ?? 10} hoạt động
            </span>
            <span style={{ color: '#EA580C', fontWeight: 800 }}>
              {Math.min(100, Math.round(((stats?.todayActivitiesCount ?? 0) / (stats?.dailyGoal ?? 10)) * 100))}%
            </span>
          </div>
          <div style={{ width: '100%', height: 9, background: '#FEF3C7', borderRadius: 99, overflow: 'hidden' }}>
            <div
              style={{
                width: `${Math.min(100, Math.round(((stats?.todayActivitiesCount ?? 0) / (stats?.dailyGoal ?? 10)) * 100))}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #F97316 0%, #10B981 100%)',
                borderRadius: 99,
                transition: 'width 0.4s ease',
              }}
            />
          </div>
        </div>
      </div>

      {/* 4 Skill Shortcuts */}
      {/* 4 Skill Shortcuts */}
      <motion.div
        className="skill-grid"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <motion.div
          variants={staggerItem}
          whileHover={{ y: -3 }}
          whileTap={{ scale: 0.98 }}
          className="skill-card blue"
          onClick={() => nav('/words')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div className="skill-icon blue">
              <Icon n="book" s={22} />
            </div>
            <div>
              <b style={{ fontSize: 16, color: 'var(--ink)' }}>Học Từ Vựng</b>
              <div style={{ fontSize: 12.5, color: 'var(--muted)', fontWeight: 700, marginTop: 2 }}>4,900+ từ chuẩn Oxford</div>
            </div>
          </div>
          <div className="skill-arrow">→</div>
        </motion.div>

        <motion.div
          variants={staggerItem}
          whileHover={{ y: -3 }}
          whileTap={{ scale: 0.98 }}
          className="skill-card red"
          onClick={() => nav('/review')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div className="skill-icon red">
              <Icon n="bulb" s={22} />
            </div>
            <div>
              <b style={{ fontSize: 16, color: 'var(--ink)' }}>Ôn Tập SRS</b>
              <div style={{ fontSize: 12.5, color: 'var(--muted)', fontWeight: 700, marginTop: 2 }}>{stats?.wordsNeedingReview ?? total} từ cần ôn tập</div>
            </div>
          </div>
          <div className="skill-arrow">→</div>
        </motion.div>

        <motion.div
          variants={staggerItem}
          whileHover={{ y: -3 }}
          whileTap={{ scale: 0.98 }}
          className="skill-card green"
          onClick={() => nav('/quiz')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div className="skill-icon green">
              <Icon n="zap" s={22} />
            </div>
            <div>
              <b style={{ fontSize: 16, color: 'var(--ink)' }}>Trắc Nghiệm</b>
              <div style={{ fontSize: 12.5, color: 'var(--muted)', fontWeight: 700, marginTop: 2 }}>24 bài thi A1 - C1</div>
            </div>
          </div>
          <div className="skill-arrow">→</div>
        </motion.div>

        <motion.div
          variants={staggerItem}
          whileHover={{ y: -3 }}
          whileTap={{ scale: 0.98 }}
          className="skill-card purple"
          onClick={() => nav('/speaking')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div className="skill-icon purple">
              <Icon n="mic" s={22} />
            </div>
            <div>
              <b style={{ fontSize: 16, color: 'var(--ink)' }}>Luyện Nói AI</b>
              <div style={{ fontSize: 12.5, color: 'var(--muted)', fontWeight: 700, marginTop: 2 }}>Chấm ngữ điệu & âm vị</div>
            </div>
          </div>
          <div className="skill-arrow">→</div>
        </motion.div>
      </motion.div>

      {/* KPI Row */}
      <motion.div
        className="kpi-row"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {kpis.map((k) => (
          <motion.div
            variants={staggerItem}
            whileHover={{ y: -2 }}
            className="kpi"
            key={k.lbl}
          >
            <div className="lbl">{k.lbl}</div>
            <div className="num">
              {k.num}
              {k.unit && <span style={{ fontSize: 18, color: 'var(--muted)', fontWeight: 700 }}> {k.unit}</span>}
            </div>
            <div className={`delta ${k.dir}`}>{k.delta}</div>
          </motion.div>
        ))}
      </motion.div>

      <div className="cols2">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Ôn tập hôm nay */}
          <div className="card">
            <div className="row">
              <h2><span className="dot r" />Ôn tập hôm nay</h2>
              {total > 0 && <span className="pill warn">{total} từ cần ôn</span>}
            </div>
            {queue.length === 0 ? (
              <div className="empty" style={{ padding: '36px 20px' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🎉</div>
                <b style={{ fontSize: 16, color: 'var(--ink)' }}>Hết từ cần ôn rồi!</b>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
                  Bạn đã hoàn thành toàn bộ mục tiêu SRS hôm nay. Tiếp tục phát huy nhé!
                </div>
              </div>
            ) : (
              <table className="data mt8">
                <thead>
                  <tr>
                    <th>Từ vựng</th>
                    <th>Trễ hạn</th>
                    <th>Lần thử</th>
                    <th style={{ textAlign: 'right' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {queue.slice(0, 5).map((q) => {
                    const od = daysOverdue(q);
                    return (
                      <tr key={q.id}>
                        <td>
                          <b style={{ fontSize: 15, color: 'var(--ink)' }}>{q.word.word || q.word.lemma}</b>
                          {q.word.pronunciation && (
                            <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 8, fontWeight: 600 }}>
                              {q.word.pronunciation}
                            </span>
                          )}
                        </td>
                        <td style={od > 0 ? { color: 'var(--red-dark)' } : { color: 'var(--muted)' }}>
                          <b>{od > 0 ? `${od} ngày` : 'hôm nay'}</b>
                        </td>
                        <td>
                          <span className="pill" style={{ padding: '2px 8px', fontSize: 12 }}>
                            {q.reviewCount} lần
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            className="btn"
                            style={{ minHeight: 32, padding: '0 14px', fontSize: 13, borderRadius: 8 }}
                            onClick={() => nav('/review')}
                          >
                            Ôn ngay
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
            <button
              className="btn block mt16"
              onClick={() => nav('/review')}
              disabled={total === 0}
            >
              <Icon n="bulb" s={18} /> Bắt đầu phiên ôn tập ({total} từ)
            </button>
          </div>

          {/* Recent Activities Feed */}
          <div className="card">
            <div className="row">
              <h2><span className="dot" />Hoạt động gần đây</h2>
              <span className="sub">Lịch sử rèn luyện</span>
            </div>
            {(!stats?.recentActivities || stats.recentActivities.length === 0) ? (
              <div className="empty" style={{ padding: '24px 0' }}>
                Chưa có hoạt động nào hôm nay. Hãy bắt đầu học ngay nhé!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
                {stats.recentActivities.map((act, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      borderRadius: 12,
                      background: 'var(--bg)',
                      border: '1px solid var(--line)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span
                        className="pill"
                        style={{
                          fontSize: 11,
                          fontWeight: 800,
                          background: act.type === 'QUIZ' ? '#ecfdf5' : act.type === 'SPEAKING' ? '#faf5ff' : '#eff6ff',
                          color: act.type === 'QUIZ' ? '#059669' : act.type === 'SPEAKING' ? '#9333ea' : '#2563eb',
                        }}
                      >
                        {act.type === 'QUIZ' ? 'Quiz' : act.type === 'SPEAKING' ? 'Nói' : 'Từ vựng'}
                      </span>
                      <b style={{ fontSize: 14.5, color: 'var(--ink)' }}>{act.title}</b>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)' }}>
                        {act.result}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>
                        {act.timeAgo || 'Gần đây'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Luyện tập trắc nghiệm */}
          <div className="card">
            <div className="row">
              <h2><span className="dot g" />Luyện tập trắc nghiệm</h2>
              <span className="pill level">24 Quizzes</span>
            </div>
            <div className="mt8">
              <b style={{ fontSize: 17, color: 'var(--ink)' }}>Kiểm tra kiến thức từ vựng</b>
              <div className="sub mt8" style={{ lineHeight: 1.5 }}>
                Làm bài tập trắc nghiệm tính giờ từ cấp độ A1 đến C1 và nhận phản hồi chi tiết từ hệ thống.
              </div>
            </div>
            <button className="btn ghost block mt16" onClick={() => nav('/quiz')}>
              <Icon n="zap" s={18} /> Vào danh sách Quiz
            </button>
          </div>

          {/* Khám phá từ mới */}
          <div className="card">
            <div className="row">
              <h2><span className="dot" />Khám phá từ mới</h2>
              <span className="pill">CEFR A1 - C1</span>
            </div>
            <p className="mt8" style={{ color: 'var(--muted)', lineHeight: 1.6, fontWeight: 600, fontSize: 14.5 }}>
              Kho từ vựng 4,900+ từ chuẩn Oxford 3000/5000 phân cấp độ từ A1 đến C1 giúp bạn nâng cao vốn từ nhanh chóng.
            </p>
            <button className="btn ghost block mt16" onClick={() => nav('/words')}>
              <Icon n="book" s={18} /> Khám phá từ vựng ngay
            </button>
          </div>

          {/* Coach Vi */}
          <div
            className="card"
            style={{
              background: 'linear-gradient(135deg, #F5F3FF 0%, #EEF2FF 100%)',
              border: '1px solid #DDD6FE',
            }}
          >
            <div className="coach">
              <Mascot s={54} />
              <div className="bubble" style={{ background: '#FFFFFF', borderColor: '#C7D2FE' }}>
                <b>Trợ lý Vi AI:</b> Bạn có thể trò chuyện 24/7 với Vi ở mục Trò chuyện hoặc dùng tính năng Sửa ngữ pháp để kiểm tra câu viết tiếng Anh!
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <button className="btn block" style={{ flex: 1 }} onClick={() => nav('/chat')}>
                <Icon n="msg" s={18} /> Chat với Vi
              </button>
              <button className="btn ghost block" style={{ flex: 1, background: '#FFFFFF' }} onClick={() => nav('/grammar')}>
                <Icon n="spark" s={18} /> Sửa ngữ pháp
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

