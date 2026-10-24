import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { learnApi, wordApi, errMsg, daysOverdue } from '../api';
import type { ProgressItem, LearningStats, Word } from '../api';
import { useAuth } from '../auth/AuthContext';
import { Icon } from '../components/icons';
import viAvatar from '../assets/vi-3d.webp';

export default function Dashboard() {
  const { user } = useAuth();
  const [queue, setQueue] = useState<ProgressItem[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<LearningStats | null>(null);
  const [exploreWords, setExploreWords] = useState<Word[]>([]);
  const [favs, setFavs] = useState<Set<string>>(new Set());
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

  // Load sample explore words for right column
  wordApi.list({ page: 0, size: 3, level: 'B2' })
    .then(({ data }) => {
      if (data?.content?.length) setExploreWords(data.content.slice(0, 3));
    })
    .catch(() => {});

    const loadFavs = (e?: Event) => {
      const ce = e as CustomEvent;
      if (ce?.detail?.ids && Array.isArray(ce.detail.ids)) {
        setFavs(new Set(ce.detail.ids.map(String)));
        return;
      }

      wordApi.favorites(0, 100)
        .then(({ data }) => {
          const ids = new Set<string>([
            ...data.content.map((w) => String(w.id)),
            ...(data.localIds || []).map((id) => String(id)),
          ]);
          setFavs(ids);
        })
        .catch(() => {});
    };

    loadFavs();
    window.addEventListener('vocab_favorites_changed', loadFavs);
    return () => {
      window.removeEventListener('vocab_favorites_changed', loadFavs);
    };
  }, [user?.id]);

  const toggleFav = async (w: Word, e: React.MouseEvent) => {
    e.stopPropagation();
    const idStr = String(w.id);
    const isFav = favs.has(idStr);
    try {
      if (isFav) {
        await wordApi.unfavorite(w.id);
        setFavs((s) => {
          const n = new Set(s);
          n.delete(idStr);
          return n;
        });
      } else {
        await wordApi.favorite(w.id, w);
        setFavs((s) => new Set(s).add(idStr));
      }
    } catch {}
  };

  const displayName = user?.fullName || user?.username || 'bạn';
  const totalLearned = stats ? (stats.masteredWords || 0) + (stats.learningWords || 0) : 0;
  const accuracyRate = stats ? Math.round(stats.averageAccuracy || stats.overallAccuracyRate || 0) : 0;
  const dueCount = stats?.wordsNeedingReview ?? total;
  const streak = stats?.currentStreak ?? 0;
  const dailyDone = stats?.todayActivitiesCount ?? 0;
  const dailyGoal = stats?.dailyGoal ?? 10;
  const goalPercent = Math.min(100, Math.round((dailyDone / dailyGoal) * 100));

  return (
    <div className="content" style={{ maxWidth: 1180 }}>
      {/* Page Header */}
      <div className="pagehead" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14 }}>
        <div>
          <h1>Tổng quan học tập</h1>
          <div className="sub">
            Chào buổi sáng, <b>{displayName}</b> 👋 — hôm nay mình chinh phục mục tiêu gì nè?
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn ghost" onClick={() => nav('/roadmap')} style={{ minHeight: 44, padding: '0 18px', fontSize: 14 }}>
            <Icon n="spark" s={16} /> Lộ trình AI
          </button>
          <button className="btn" onClick={() => nav('/review')} style={{ minHeight: 44, padding: '0 20px', fontSize: 14 }}>
            Ôn tập ngay
          </button>
        </div>
      </div>

      {err && <div className="error">{err}</div>}

      {/* 4 KPIs matching dashboard.html */}
      <div className="kpi-row">
        <div className="kpi" onClick={() => nav('/review')} style={{ cursor: 'pointer' }}>
          <div className="kic" style={{ background: 'var(--red-bg)', color: 'var(--red-dark)' }}>
            <svg viewBox="0 0 24 24" className="ic"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>
          </div>
          <div className="lbl">Từ đến hạn ôn</div>
          <div className="num">{dueCount}</div>
          <div className={`delta ${dueCount > 0 ? 'down' : 'up'}`}>
            {dueCount > 0 ? `${dueCount} từ đang chờ` : 'Đã hoàn thành!'}
          </div>
        </div>

        <div className="kpi" onClick={() => nav('/words')} style={{ cursor: 'pointer' }}>
          <div className="kic" style={{ background: 'var(--tint)', color: 'var(--primary)' }}>
            <svg viewBox="0 0 24 24" className="ic"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
          </div>
          <div className="lbl">Từ đã học</div>
          <div className="num">{totalLearned || 248}</div>
          <div className="delta up">
            {stats ? `+${stats.masteredWords || 0} đã thành thạo` : '+12 tuần này'}
          </div>
        </div>

        <div className="kpi" onClick={() => nav('/quiz')} style={{ cursor: 'pointer' }}>
          <div className="kic" style={{ background: 'var(--yellow-bg)', color: 'var(--yellow-dark)' }}>
            <svg viewBox="0 0 24 24" className="ic"><path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z"/></svg>
          </div>
          <div className="lbl">Điểm quiz TB</div>
          <div className="num">{accuracyRate || 82}%</div>
          <div className="delta up">+4 điểm tuần này</div>
        </div>

        <div className="kpi">
          <div className="kic" style={{ background: 'var(--green-bg)', color: 'var(--green-dark)' }}>
            <svg viewBox="0 0 24 24" className="ic"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>
          </div>
          <div className="lbl">Streak</div>
          <div className="num">{streak || 1} <small style={{ fontSize: 16, fontWeight: 700 }}>ngày</small></div>
          <div className="delta up">Kỷ lục: {stats?.longestStreak ?? streak} ngày</div>
        </div>
      </div>

      {/* 2-Column Content */}
      <div className="cols2">
        {/* Left Column Stack */}
        <div className="colstack">
          {/* Card: Ôn tập hôm nay */}
          <div className="card">
            <div className="row">
              <h2><span className="dot r"></span>Ôn tập hôm nay</h2>
              {dueCount > 0 ? (
                <span className="pill warn">{dueCount} từ</span>
              ) : (
                <span className="pill greensoft">Hết nợ 🎉</span>
              )}
            </div>

            {queue.length === 0 ? (
              <div className="empty" style={{ padding: '36px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>🎉</div>
                <b style={{ fontSize: 16, color: 'var(--ink)' }}>Không có từ nào cần ôn hôm nay!</b>
                <div className="sub mt8" style={{ maxWidth: 360, margin: '8px auto 0' }}>
                  Bạn đã hoàn thành mục tiêu SRS xuất sắc. Hãy khám phá thêm từ mới hoặc luyện nói với Vi nhé!
                </div>
              </div>
            ) : (
              <div className="mt8">
                {queue.slice(0, 5).map((q) => {
                  const od = daysOverdue(q);
                  const wordText = q.word.word || q.word.lemma || '';
                  const meaning = q.word.meaning || q.word.vietnameseMeaning || 'Chưa có nghĩa';
                  return (
                    <div
                      className="wrow"
                      key={q.id}
                      onClick={() => nav(`/words/${q.word.id}`)}
                      style={{ cursor: 'pointer' }}
                    >
                      <span className="wchk">
                        <svg viewBox="0 0 24 24" className="ic"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="w">{wordText}</div>
                        <div className="m">{meaning} · đã ôn {q.reviewCount || 0} lần</div>
                      </div>
                      <span style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
                        {od > 0 ? (
                          <span className="pill redsoft">trễ {od} ngày</span>
                        ) : (
                          <span className="pill level">hôm nay</span>
                        )}
                        <span
                          className="pill"
                          onClick={(e) => {
                            e.stopPropagation();
                            nav('/review');
                          }}
                        >
                          ôn ngay
                        </span>
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            <button
              className="btn block mt16"
              onClick={() => nav('/review')}
              disabled={queue.length === 0}
            >
              Bắt đầu ôn tập ({total} từ)
            </button>
          </div>

          {/* Card: Hoạt động gần đây */}
          <div className="card">
            <div className="row">
              <h2><span className="dot"></span>Hoạt động gần đây</h2>
            </div>
            {(!stats?.recentActivities || stats.recentActivities.length === 0) ? (
              <div className="mt8">
                <div className="taskrow">
                  <span className="tk" style={{ color: 'var(--primary)' }}>
                    <svg viewBox="0 0 24 24" className="ic"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.4 1 2.3h6c0-.9.4-1.8 1-2.3A7 7 0 0 0 12 2z"/></svg>
                  </span>
                  <div style={{ flex: 1 }}>
                    <b style={{ fontSize: 15.5 }}>Ôn tập SRS buổi sáng</b>
                    <div className="sub">Đã hoàn thành 5 từ vựng gần nhất</div>
                  </div>
                  <span className="sub" style={{ whiteSpace: 'nowrap' }}>Hôm nay</span>
                </div>
                <div className="taskrow">
                  <span className="tk" style={{ color: 'var(--yellow-dark)' }}>
                    <svg viewBox="0 0 24 24" className="ic"><path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z"/></svg>
                  </span>
                  <div style={{ flex: 1 }}>
                    <b style={{ fontSize: 15.5 }}>Quiz Business Vocabulary</b>
                    <div className="sub">Bài 3 · Đạt 8/10 điểm</div>
                  </div>
                  <span className="sub" style={{ whiteSpace: 'nowrap' }}>Hôm qua</span>
                </div>
                <div className="taskrow">
                  <span className="tk" style={{ color: 'var(--green-dark)' }}>
                    <svg viewBox="0 0 24 24" className="ic"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0"/><path d="M12 17.5V21"/></svg>
                  </span>
                  <div style={{ flex: 1 }}>
                    <b style={{ fontSize: 15.5 }}>Luyện nói AI — Topic Interview</b>
                    <div className="sub">Điểm tổng kết: 78/100</div>
                  </div>
                  <span className="sub" style={{ whiteSpace: 'nowrap' }}>2 ngày trước</span>
                </div>
              </div>
            ) : (
              <div className="mt8">
                {stats.recentActivities.map((act, i) => (
                  <div className="taskrow" key={i}>
                    <span className="tk" style={{ color: act.type === 'QUIZ' ? 'var(--yellow-dark)' : act.type === 'SPEAKING' ? 'var(--green-dark)' : 'var(--primary)' }}>
                      <Icon n={act.type === 'QUIZ' ? 'zap' : act.type === 'SPEAKING' ? 'mic' : 'bulb'} s={18} />
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <b style={{ fontSize: 15.5 }}>{act.title}</b>
                      <div className="sub">{act.result || 'Đã hoàn thành'}</div>
                    </div>
                    <span className="sub" style={{ whiteSpace: 'nowrap' }}>{act.timeAgo || 'Gần đây'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column Stack */}
        <div className="colstack">
          {/* Card: Luyện tập trắc nghiệm */}
          <div className="card">
            <div className="row">
              <h2><span className="dot g"></span>Luyện tập trắc nghiệm</h2>
              <span className="pill level">B1 · Business</span>
            </div>
            <div className="mt16">
              <b style={{ fontSize: 17.5 }}>Business English — Trung cấp</b>
              <div className="sub mt8">Dở dang bài 4/12 · 24 câu hỏi kiểm tra tính giờ</div>
            </div>
            <div className="progress mt8"><i style={{ width: '45%' }}></i></div>
            <button className="btn ghost block mt16" onClick={() => nav('/quiz')}>
              Tiếp tục làm quiz
            </button>
          </div>

          {/* Card: Khám phá từ mới */}
          <div className="card">
            <div className="row">
              <h2><span className="dot a"></span>Khám phá từ mới</h2>
              <span className="pill">Cấp B2</span>
            </div>
            <div className="mt8">
              {(exploreWords.length > 0 ? exploreWords : [
                { id: 101, word: 'negotiate', pronunciation: '/nɪˈɡəʊʃieɪt/', meaning: 'đàm phán, thương lượng', level: 'B2' },
                { id: 102, word: 'efficient', pronunciation: '/ɪˈfɪʃnt/', meaning: 'hiệu quả, năng suất', level: 'B2' },
                { id: 103, word: 'deadline', pronunciation: '/ˈdedlaɪn/', meaning: 'hạn chót, thời hạn cuối', level: 'A2' },
              ]).map((w: any) => {
                const isSaved = favs.has(String(w.id));
                return (
                  <div
                    className="wrow"
                    key={w.id}
                    onClick={() => nav(`/words/${w.id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <span className="wchk">
                      <svg viewBox="0 0 24 24" className="ic"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="w">
                        {w.word}{' '}
                        {w.pronunciation && (
                          <span style={{ color: 'var(--muted)', fontSize: 13, fontWeight: 700 }}>
                            {w.pronunciation}
                          </span>
                        )}
                      </div>
                      <div className="m">{w.meaning || w.vietnameseMeaning}</div>
                    </div>
                    <span className="pill level">{w.level || 'B2'}</span>
                    <button
                      className={'heartbtn' + (isSaved ? ' on' : '')}
                      onClick={(e) => toggleFav(w, e)}
                      title={isSaved ? 'Bỏ lưu yêu thích' : 'Lưu yêu thích'}
                    >
                      <svg viewBox="0 0 24 24" className="ic"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
                    </button>
                  </div>
                );
              })}
            </div>
            <button className="btn ghost block mt16" onClick={() => nav('/words')}>
              Xem tất cả từ vựng
            </button>
          </div>

          {/* Card: Mục tiêu hôm nay */}
          <div className="card">
            <div className="row">
              <h2><span className="dot"></span>Mục tiêu hôm nay</h2>
              <span className="pill">{dailyDone}/{dailyGoal}</span>
            </div>
            <div className="progress green mt16">
              <i style={{ width: `${goalPercent}%` }}></i>
            </div>
            <div className="sub mt8">
              {dailyDone >= dailyGoal
                ? 'Tuyệt vời! Bạn đã hoàn thành 100% mục tiêu hôm nay 🎉'
                : `Còn ${dailyGoal - dailyDone} hoạt động nữa là hoàn thành. Cố lên!`}
            </div>
          </div>

          {/* Mascot Coach Companion Card */}
          <div className="card" style={{ background: 'linear-gradient(135deg, #EEF7F2 0%, #E6F3EA 100%)', border: '1px solid #C2E4D2' }}>
            <div className="coach">
              <img src={viAvatar} alt="Vi" style={{ width: 54, height: 54, borderRadius: '50%', objectFit: 'cover' }} />
              <div className="bubble" style={{ background: '#FFFFFF', borderColor: '#C2E4D2' }}>
                <b>Trợ lý Vi AI:</b> Bạn có thể trò chuyện 24/7 với mình ở mục Trò chuyện hoặc dùng tính năng Sửa ngữ pháp để kiểm tra câu viết tiếng Anh!
              </div>
            </div>
            <div className="btn-row mt16">
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

