import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { learnApi, wordApi, placementApi, errMsg, daysOverdue } from '../api';
import type { ProgressItem, LearningStats, Word } from '../api';
import { useAuth } from '../auth/AuthContext';
import { Icon } from '../components/icons';
import { ViMascotImage } from '../components/ViMascotImage';
import { ScoreRing, SplitHeading } from '../components/SageEffects';
import { motion } from 'motion/react';
import { AnimatedCounter, AnimatedProgressBar, staggerContainer, staggerItem } from '../motion';

export default function Dashboard() {
  const { user } = useAuth();
  const [queue, setQueue] = useState<ProgressItem[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<LearningStats | null>(null);
  const [exploreWords, setExploreWords] = useState<Word[]>([]);
  const [favs, setFavs] = useState<Set<string>>(new Set());
  const [placementCompleted, setPlacementCompleted] = useState<boolean>(true);
  const [err, setErr] = useState('');
  const nav = useNavigate();

  const loadQueue = () => {
    learnApi
      .queue(10)
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
  };

  useEffect(() => {
    loadQueue();
    const onReviewDone = () => loadQueue();
    window.addEventListener('vocab_review_completed', onReviewDone);

    learnApi
      .stats()
      .then(({ data }) => {
        if (data) setStats(data);
      })
      .catch(() => {});

    wordApi
      .list({ page: 0, size: 3, level: 'B2' })
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

      wordApi
        .favorites(0, 100)
        .then(({ data }) => {
          const ids = new Set<string>();
          (data?.content || []).forEach((w: any) => {
            if (w.id != null) ids.add(String(w.id).toLowerCase().trim());
            if (w.word) ids.add(String(w.word).toLowerCase().trim());
            if (w.lemma) ids.add(String(w.lemma).toLowerCase().trim());
          });
          (data?.localIds || []).forEach((id: any) => {
            if (id != null) ids.add(String(id).toLowerCase().trim());
          });
          setFavs(ids);
        })
        .catch(() => {});
    };

    loadFavs();
    window.addEventListener('vocab_favorites_changed', loadFavs);

    placementApi
      .getStatus()
      .then(({ data }) => {
        setPlacementCompleted(!!data?.completed);
      })
      .catch(() => {});

    const onPlacementUpdated = () => setPlacementCompleted(true);
    window.addEventListener('vocab_placement_updated', onPlacementUpdated);

    return () => {
      window.removeEventListener('vocab_review_completed', onReviewDone);
      window.removeEventListener('vocab_favorites_changed', loadFavs);
      window.removeEventListener('vocab_placement_updated', onPlacementUpdated);
    };
  }, [user?.id]);

  const toggleFav = async (w: Word, e: React.MouseEvent) => {
    e.stopPropagation();
    const idStr = String(w.id).toLowerCase().trim();
    const wordKey = w.word ? w.word.toLowerCase().trim() : '';
    const isFav = favs.has(idStr) || (!!wordKey && favs.has(wordKey));
    try {
      if (isFav) {
        await wordApi.unfavorite(w.id, w.word);
        setFavs((s) => {
          const n = new Set(s);
          n.delete(idStr);
          if (wordKey) n.delete(wordKey);
          return n;
        });
      } else {
        await wordApi.favorite(w.id, w);
        setFavs((s) => {
          const n = new Set(s);
          n.add(idStr);
          if (wordKey) n.add(wordKey);
          return n;
        });
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

  const featuredList =
    exploreWords.length > 0
      ? exploreWords
      : [
          { id: 101, word: 'negotiate', pronunciation: '/nɪˈɡəʊʃieɪt/', meaning: 'đàm phán, thương lượng', level: 'B2' },
          { id: 102, word: 'efficient', pronunciation: '/ɪˈfɪʃnt/', meaning: 'hiệu quả, năng suất', level: 'B2' },
        ];
  const primaryWord = featuredList[0] as any;

  return (
    <div className="content">
      {/* Compact Intro Row */}
      <div className="pagehead">
        <div>
          <div className="eyebrow">GOOD MORNING · YOUR LEARNING LIBRARY</div>
          <SplitHeading text="Hôm nay, mình học gì?" />
          <p className="sub">
            Chào <b>{displayName}</b> — một hàng đợi duy nhất: học từ mới, ôn đúng lúc và luyện nói cùng Vi.
          </p>
        </div>

        <div className="row">
          {!placementCompleted && (
            <button type="button" className="btn secondary sm" onClick={() => nav('/placement')}>
              <Icon n="target" s={15} /> Kiểm tra xếp lớp 10p
            </button>
          )}
          <button type="button" className="btn ghost sm" onClick={() => nav('/roadmap')}>
            <Icon n="spark" s={15} /> Lộ trình AI
          </button>
          <button type="button" className="btn sm" onClick={() => nav('/review?mode=SRS')}>
            Ôn tập ngay ({dueCount})
          </button>
        </div>
      </div>

      {err && <div className="error">{err}</div>}

      {/* Viewport-Locked 2-Column Dashboard Grid matching Sage Library Prototype */}
      <div className="dash-grid">
        {/* Left Top: Hero Coach Card */}
        <section className="card hero-card dash-hero tilt-target" data-tilt-max="4">
          <div className="hero-inner">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <span className="tag">✦ VI · AI LEARNING COACH</span>
              </div>
              <h2 style={{ fontSize: 'clamp(20px, 2.2vw, 28px)', margin: 0 }}>
                Mỗi từ bạn nhớ, một câu chuyện bạn kể.
              </h2>
              <p className="sub" style={{ margin: 0 }}>
                Tiếp tục vòng học Học → Ôn → Nói với thuật toán lặp lại ngắt quãng SRS 1–3–7–14–30 ngày.
              </p>
              <div className="row" style={{ flexWrap: 'wrap', marginTop: 4 }}>
                <button type="button" className="btn" onClick={() => nav('/review?mode=SRS')}>
                  Bắt đầu vòng học
                </button>
                <button type="button" className="btn secondary sm" onClick={() => nav('/chat')}>
                  <Icon n="msg" s={15} /> Chat với Vi
                </button>
                <button type="button" className="btn secondary sm" onClick={() => nav('/grammar')}>
                  <Icon n="pen" s={15} /> Sửa ngữ pháp
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <ViMascotImage
                pose="happy-wave"
                size={96}
                priority
                alt="Vi mascot — vẫy tay chào bạn trên trang Tổng quan"
              />
            </div>
          </div>
        </section>

        {/* Right Top: Today's Queue */}
        <div className="section-head dash-queue-head">
          <h2>Hàng đợi hôm nay</h2>
          <span className="tag">{dueCount > 0 ? `${dueCount} từ cần ôn` : 'Hoàn thành'}</span>
        </div>

        <section className="card dash-queue-card">
          {queue.length === 0 ? (
            <div className="center" style={{ flex: 1, gap: 10 }}>
              <ViMascotImage
                pose="sleep"
                size={76}
                alt="Vi nghỉ ngơi — bạn đã hoàn thành hết từ cần ôn hôm nay"
              />
              <strong style={{ fontSize: 14.5 }}>Hết từ cần ôn hôm nay rồi!</strong>
              <p className="tiny muted" style={{ margin: 0, maxWidth: 280 }}>
                Bạn đã hoàn thành mục tiêu SRS. Khám phá thêm từ mới hoặc luyện nói cùng Vi nhé.
              </p>
              <div className="row">
                <button type="button" className="btn sm" onClick={() => nav('/words')}>
                  Khám phá từ
                </button>
                <button type="button" className="btn secondary sm" onClick={() => nav('/speaking')}>
                  Luyện nói
                </button>
              </div>
            </div>
          ) : (
            <div className="colstack long-list" style={{ flex: 1, gap: 8 }}>
              <div className="queue-item" style={{ cursor: 'pointer' }} onClick={() => nav('/review?mode=SRS')}>
                <div className="queue-num">01</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <strong>Ôn từ đến hạn</strong>
                  <div className="tiny muted">{total} từ · SRS 1–3–7–14–30 ngày</div>
                </div>
                <button type="button" className="btn sm">Ôn ngay</button>
              </div>

              {queue.slice(0, 4).map((q) => {
                const od = daysOverdue(q);
                const wordText = q.word.word || q.word.lemma || '';
                const meaning = q.word.meaning || q.word.vietnameseMeaning || 'Chưa có nghĩa';
                return (
                  <div
                    key={q.id}
                    className="wrow"
                    style={{ cursor: 'pointer' }}
                    onClick={() => nav(`/words/${q.word.id}`)}
                  >
                    <span className="wchk">
                      <Icon n="book" s={16} />
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="w" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {wordText}
                      </div>
                      <div className="m" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {meaning} · đã ôn {q.reviewCount || 0} lần
                      </div>
                    </div>
                    {od > 0 ? (
                      <span className="pill redsoft">trễ {od}d</span>
                    ) : (
                      <span className="pill level">hôm nay</span>
                    )}
                    <button
                      type="button"
                      className="btn secondary sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        nav(`/review?mode=SRS&wordId=${q.word?.id || q.id}`);
                      }}
                    >
                      Ôn
                    </button>
                  </div>
                );
              })}

              <div className="queue-item" style={{ cursor: 'pointer' }} onClick={() => nav('/speaking')}>
                <div className="queue-num">03</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <strong>Luyện nói cùng Vi</strong>
                  <div className="tiny muted">Chấm 5 tiêu chí · 30–60 giây</div>
                </div>
                <button type="button" className="btn secondary sm">Nói ngay</button>
              </div>
            </div>
          )}
        </section>

        {/* Left Bottom Header & 2 Explore Cards */}
        <div className="section-head dash-explore-head">
          <h2>Tiếp tục khám phá</h2>
          <button type="button" className="btn ghost sm" onClick={() => nav('/quiz')} style={{ color: 'var(--cream)', borderColor: 'rgba(250,248,241,0.3)', background: 'rgba(250,248,241,0.12)' }}>
            Làm Quiz
          </button>
        </div>

        <div className="dash-explore-grid">
          <section className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div className="row between">
              <div>
                <div className="overline">MỤC TIÊU HÔM NAY</div>
                <h3 style={{ marginTop: 6, marginBottom: 4 }}>Học đều, nhớ lâu</h3>
                <p className="tiny muted" style={{ margin: 0 }}>
                  {dailyDone}/{dailyGoal} hoạt động hôm nay
                </p>
              </div>
              <ScoreRing value={goalPercent} label={`${goalPercent}%`} size={68} />
            </div>
            <div style={{ marginTop: 10 }}>
              <AnimatedProgressBar progress={goalPercent} />
            </div>
          </section>

          {primaryWord && (
            <section
              className="card"
              style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', cursor: 'pointer' }}
              onClick={() => nav(`/words/${primaryWord.id}`)}
            >
              <div className="row between">
                <div className="overline">TỪ VỰNG NỔI BẬT</div>
                <div className="row" style={{ gap: 6 }}>
                  <span className="tag">{primaryWord.level || 'B2'}</span>
                  <button
                    type="button"
                    className={
                      'heartbtn' +
                      (favs.has(String(primaryWord.id).toLowerCase()) || favs.has(String(primaryWord.word).toLowerCase())
                        ? ' on'
                        : '')
                    }
                    style={{ width: 28, height: 28 }}
                    onClick={(e) => toggleFav(primaryWord, e)}
                    aria-label="Lưu từ yêu thích"
                  >
                    <Icon n="heart" s={14} />
                  </button>
                </div>
              </div>
              <div>
                <h3 style={{ fontSize: 20, margin: '4px 0 2px' }}>{primaryWord.word}</h3>
                <p className="tiny muted" style={{ margin: 0 }}>
                  {primaryWord.pronunciation ? `${primaryWord.pronunciation} · ` : ''}
                  {primaryWord.meaning || primaryWord.vietnameseMeaning}
                </p>
              </div>
              <div className="row between">
                <button
                  type="button"
                  className="btn secondary sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    nav(`/words/${primaryWord.id}`);
                  }}
                >
                  Khám phá từ này
                </button>
                <button
                  type="button"
                  className="btn ghost sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    nav('/words');
                  }}
                >
                  Thư viện →
                </button>
              </div>
            </section>
          )}
        </div>

        {/* Right Bottom Header & 2x2 KPI Grid */}
        <div className="section-head dash-stats-head">
          <h2>Nhịp học của bạn</h2>
          <span className="tiny" style={{ color: 'rgba(250,248,241,0.85)' }}>Kỷ lục: {stats?.longestStreak ?? streak} ngày</span>
        </div>

        <motion.div
          className="dash-kpi-grid"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={staggerItem} className="kpi" onClick={() => nav('/review')} style={{ cursor: 'pointer' }}>
            <div className="lbl">Từ đến hạn</div>
            <div className="num"><AnimatedCounter value={dueCount} /></div>
            <div className={`delta ${dueCount > 0 ? 'down' : 'up'}`}>
              {dueCount > 0 ? `${dueCount} từ đang chờ` : 'Hoàn thành!'}
            </div>
          </motion.div>

          <motion.div variants={staggerItem} className="kpi" onClick={() => nav('/words')} style={{ cursor: 'pointer' }}>
            <div className="lbl">Từ đã học</div>
            <div className="num"><AnimatedCounter value={totalLearned} /></div>
            <div className="delta up">+{stats?.masteredWords || 0} thành thạo</div>
          </motion.div>

          <motion.div variants={staggerItem} className="kpi" onClick={() => nav('/quiz')} style={{ cursor: 'pointer' }}>
            <div className="lbl">Điểm quiz TB</div>
            <div className="num"><AnimatedCounter value={accuracyRate} />%</div>
            <div className="delta up">{stats?.totalActivities || 0} hoạt động</div>
          </motion.div>

          <motion.div variants={staggerItem} className="kpi">
            <div className="lbl">Streak</div>
            <div className="num" style={{ color: 'var(--amber)' }}>
              <AnimatedCounter value={streak} /> <small style={{ fontSize: 13 }}>ngày</small>
            </div>
            <div className="delta" style={{ color: 'var(--amber-dark)' }}>Nhịp liên tục</div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
