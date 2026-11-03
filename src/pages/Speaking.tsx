import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { speakApi, personalizedApi, errMsg } from '../api';
import type { SpeakSession } from '../api';
import { Icon } from '../components/icons';
import { useAuth } from '../auth/AuthContext';
import { useUsage } from '../context/UsageContext';
import { QuotaBadge } from '../components/QuotaBadge';
import { MotionCard, AnimatedCounter, staggerContainer, staggerItem } from '../motion';
import viAvatar from '../assets/vi-3d.webp';
import { VoiceChatPanel } from '../components/VoiceChatPanel';

interface TopicItem {
  name: string;
  en: string;
  category: 'daily' | 'hobbies' | 'work' | 'travel' | 'tech';
  tag: string;
  desc: string;
}

const CATEGORIES = [
  { id: 'all', name: 'Tất cả' },
  { id: 'daily', name: 'Đời sống' },
  { id: 'hobbies', name: 'Sở thích' },
  { id: 'work', name: 'Công việc & Học tập' },
  { id: 'travel', name: 'Du lịch & Văn hóa' },
  { id: 'tech', name: 'Công nghệ & Xã hội' },
];

const TOPICS: TopicItem[] = [
  // 1. Đời sống
  {
    name: 'Giới thiệu bản thân',
    en: 'Introduce Yourself',
    category: 'daily',
    tag: 'A2',
    desc: 'Nói về tên, tuổi, quê quán, nghề nghiệp hiện tại và sở thích.',
  },
  {
    name: 'Kể về cuối tuần vừa qua',
    en: 'My Last Weekend',
    category: 'daily',
    tag: 'A2',
    desc: 'Bạn đã dành thời gian làm gì? Đi chơi với ai, xem phim hay nghỉ ngơi?',
  },
  {
    name: 'Thói quen một ngày của bạn',
    en: 'My Daily Routine',
    category: 'daily',
    tag: 'A2',
    desc: 'Kể về lịch trình từ sáng thức dậy, bữa ăn đến khi đi ngủ.',
  },

  // 2. Công việc & Học tập
  {
    name: 'Công việc mơ ước',
    en: 'My Dream Career',
    category: 'work',
    tag: 'B1',
    desc: 'Lý do bạn chọn nghề nghiệp này, môi trường làm việc lý tưởng và kỹ năng cần có.',
  },
  {
    name: 'Làm việc từ xa hay văn phòng?',
    en: 'Remote vs Office Work',
    category: 'work',
    tag: 'B2',
    desc: 'So sánh ưu nhược điểm của làm việc online tại nhà so với văn phòng truyền thống.',
  },

  // 3. Du lịch & Văn hóa
  {
    name: 'Chuyến du lịch đáng nhớ',
    en: 'A Memorable Journey',
    category: 'travel',
    tag: 'B1',
    desc: 'Nơi bạn đã đến, phong cảnh, ẩm thực địa phương và kỷ niệm không quên.',
  },

  // 4. Sở thích
  {
    name: 'Món ăn yêu thích',
    en: 'Favorite Food & Cooking',
    category: 'hobbies',
    tag: 'A2',
    desc: 'Món ăn khoái khẩu của bạn là gì? Hương vị ra sao và bạn có tự nấu không?',
  },

  // 5. Công nghệ & Xã hội
  {
    name: 'Trí tuệ nhân tạo (AI)',
    en: 'AI in Daily Life',
    category: 'tech',
    tag: 'B2',
    desc: 'AI mang lại những tiện ích gì cho việc học và cuộc sống hàng ngày?',
  },
];

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'];

export default function Speaking() {
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [topic, setTopic] = useState<string>(TOPICS[0].name);
  const [customTopic, setCustomTopic] = useState<string>('');
  const [isCustom, setIsCustom] = useState<boolean>(false);

  const storageKey = `vocab_ai_roadmap_${user?.id || user?.username || 'default'}`;
  const getInitialLevel = () => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.profile?.currentLevel) return parsed.profile.currentLevel;
      }
    } catch {}
    return 'B1';
  };

  const initialLvl = TOPICS[0]?.tag || getInitialLevel();
  const [level, setLevel] = useState(initialLvl);
  const [mode, setMode] = useState<'practice' | 'voice'>('practice');
  const [session, setSession] = useState<SpeakSession | null>(null);
  const [rec, setRec] = useState(false);
  const [busy, setBusy] = useState(false);
  const [isGrading, setIsGrading] = useState(false);
  const [err, setErr] = useState('');
  const mr = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const [historySessions, setHistorySessions] = useState<any[]>([]);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const nav = useNavigate();
  const { decrementQuota } = useUsage();

  useEffect(() => {
    let interval: any = null;
    if (rec) {
      setRecordSeconds(0);
      interval = setInterval(() => {
        setRecordSeconds((s) => s + 1);
      }, 1000);
    } else {
      setRecordSeconds(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [rec]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const loadHistory = () => {
    speakApi
      .listSessions(0, 10)
      .then(({ data }) => {
        const list = Array.isArray(data?.content) ? data.content : Array.isArray(data) ? data : [];
        setHistorySessions(list);
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadHistory();
    personalizedApi
      .level()
      .then(({ data }) => {
        if (data && LEVELS.includes(data) && isCustom) {
          setLevel(data);
        }
      })
      .catch(() => {});
  }, [storageKey, isCustom]);

  const activeTopicObj = TOPICS.find((t) => t.name === topic);

  const startSessionAndRecord = async () => {
    const finalTopic = isCustom && customTopic.trim() ? customTopic.trim() : topic;
    if (!finalTopic) {
      setErr('Vui lòng chọn hoặc nhập chủ đề luyện nói.');
      return;
    }

    setErr('');
    setBusy(true);

    try {
      let currentSession = session;
      if (!currentSession || currentSession.topic !== finalTopic) {
        const { data } = await speakApi.createSession(finalTopic, level);
        currentSession = data;
        setSession(data);
      }

      // Start recording immediately
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunks.current = [];
      const m = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      m.ondataavailable = (e) => {
        if (e.data.size) chunks.current.push(e.data);
      };
      m.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (!currentSession) return;
        setIsGrading(true);
        try {
          const res = await speakApi.uploadAttempt(
            currentSession.id,
            new Blob(chunks.current, { type: 'audio/webm' })
          );
          decrementQuota('speaking');
          nav('/speaking/result', { state: { sessionId: currentSession.id, latestResult: res.data } });
        } catch (e) {
          setErr(errMsg(e, 'Gửi bản ghi lỗi, thử lại nhé.'));
          setIsGrading(false);
          setBusy(false);
        }
      };
      mr.current = m;
      m.start();
      setRec(true);
    } catch (e: any) {
      setErr(errMsg(e, 'Không truy cập được micro. Vui lòng cho phép quyền truy cập micro rồi thử lại.'));
    } finally {
      setBusy(false);
    }
  };

  const stopRecording = () => {
    if (rec && mr.current) {
      mr.current.stop();
      setRec(false);
    }
  };

  const filteredTopics =
    selectedCategory === 'all'
      ? TOPICS
      : TOPICS.filter((t) => t.category === selectedCategory);

  if (isGrading) {
    return (
      <div className="content" style={{ maxWidth: 1600 }}>
        <div className="card" style={{ textAlign: 'center', padding: '48px 34px', maxWidth: 680, margin: '40px auto 0' }}>
          <svg width="110" height="110" viewBox="0 0 110 110" style={{ margin: '0 auto' }}>
            <circle cx="55" cy="55" r="46" fill="none" stroke="#E7EEF5" strokeWidth="10" />
            <circle
              cx="55"
              cy="55"
              r="46"
              fill="none"
              stroke="#1565C0"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray="289"
              strokeDashoffset="110"
              transform="rotate(-90 55 55)"
              className="grading-spin"
            />
          </svg>
          <h1 style={{ fontSize: 26, fontWeight: 900, marginTop: 24 }}>Vi đang chấm bài nói của bạn…</h1>
          <div className="sub mt8">
            Chủ đề &quot;{isCustom && customTopic ? customTopic : topic}&quot; · bản ghi {recordSeconds} giây vừa được gửi lên.
          </div>
          <div style={{ textAlign: 'left', marginTop: 28, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="taskrow">
              <span className="tk" style={{ color: 'var(--primary)' }}>
                <Icon n="check" s={18} />
              </span>
              <div style={{ flex: 1 }}>
                <b style={{ fontSize: 15 }}>Nghe &amp; chuyển thành văn bản</b>
                <div className="sub">Whisper AI đang nhận diện lời nói của bạn.</div>
              </div>
              <span className="pill greensoft">Đang xử lý</span>
            </div>
            <div className="taskrow">
              <span className="tk" style={{ color: 'var(--primary)' }}>
                <Icon n="spark" s={18} />
              </span>
              <div style={{ flex: 1 }}>
                <b style={{ fontSize: 15 }}>Chấm 5 tiêu chí</b>
                <div className="sub">Ngữ pháp · Từ vựng · Trôi chảy · Nội dung · Phát âm</div>
              </div>
              <span className="pill warn">Đang chấm…</span>
            </div>
            <div className="taskrow">
              <span className="tk" style={{ color: 'var(--primary)' }}>
                <Icon n="clock" s={18} />
              </span>
              <div style={{ flex: 1 }}>
                <b style={{ fontSize: 15 }}>Tổng hợp nhận xét</b>
                <div className="sub">Vi viết góp ý chi tiết riêng cho bạn.</div>
              </div>
              <span className="pill">Chờ</span>
            </div>
          </div>
          <div className="sub mt16" style={{ fontSize: 12.5 }}>
            Thường mất khoảng 10–20 giây — bạn cứ để nguyên màn hình này nhé.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="content" style={{ maxWidth: 1600 }}>
      <div className="pagehead" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1>Luyện nói phản xạ cùng AI</h1>
          <div className="sub">Chọn chủ đề, nói 1–2 phút — Vi nghe và chấm 5 tiêu chí ngay</div>
        </div>
        <QuotaBadge featureKey={mode === 'voice' ? 'voice' : 'speaking'} labelSuffix={mode === 'voice' ? 'lượt thoại hôm nay' : 'lượt chấm hôm nay'} />
      </div>

      {/* Mode Switcher Tabs */}
      <div style={{ display: 'flex', gap: '10px', margin: '20px 0' }}>
        <button
          type="button"
          onClick={() => setMode('practice')}
          className={'fchip' + (mode === 'practice' ? ' on' : '')}
          style={{ fontSize: '14px', padding: '9px 20px', fontWeight: 800, cursor: 'pointer' }}
        >
          🎙️ Luyện nói & Chấm điểm
        </button>
        <button
          type="button"
          onClick={() => setMode('voice')}
          className={'fchip' + (mode === 'voice' ? ' on' : '')}
          style={{ fontSize: '14px', padding: '9px 20px', fontWeight: 800, cursor: 'pointer' }}
        >
          💬 Trò chuyện giọng nói với AI (Voice Chat)
        </button>
      </div>

      {mode === 'voice' ? (
        <VoiceChatPanel
          topic={isCustom && customTopic ? customTopic : topic}
          level={level}
          onLevelChange={setLevel}
          customTopic={isCustom ? customTopic : undefined}
          onBackToPractice={() => setMode('practice')}
        />
      ) : (
        <>
          {err && <div className="error">{err}</div>}

          {/* Category & Level Filter Row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
            <div className="chiprow" style={{ margin: 0 }}>
              {CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={'fchip' + (selectedCategory === c.id ? ' on' : '')}
                  onClick={() => setSelectedCategory(c.id)}
                >
                  {c.name}
                </button>
              ))}
            </div>

            {/* Trình độ (Level) Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', padding: '5px 12px', borderRadius: 14, border: '1px solid var(--border, #e2e8f0)', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#64748b', marginRight: 2 }}>Trình độ:</span>
              {LEVELS.map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  className={'fchip' + (level === lvl ? ' on' : '')}
                  style={{
                    padding: '4px 12px',
                    fontSize: '12.5px',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                  onClick={() => setLevel(lvl)}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          <div className="cols2" style={{ alignItems: 'start' }}>
            {/* Left Column: Topics Grid */}
            <div className="colstack">
              <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
                key={selectedCategory}
                style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}
              >
                {filteredTopics.map((t) => {
                  const isSelected = !isCustom && topic === t.name;
                  return (
                    <motion.div key={t.name} variants={staggerItem}>
                      <button
                        type="button"
                        className={'topic' + (isSelected ? ' on' : '')}
                        onClick={() => {
                          setTopic(t.name);
                          setIsCustom(false);
                        }}
                      >
                        <b style={{ fontSize: 15.5, display: 'block' }}>{t.name}</b>
                        <div className="sub mt8" style={{ fontSize: 12.5 }}>{t.en}</div>
                      </button>
                    </motion.div>
                  );
                })}
          </motion.div>

          {/* Custom Topic Input */}
          <MotionCard className="mt16" style={{ padding: 18 }}>
            <label style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink)' }}>
              Hoặc tự nhập chủ đề theo ý bạn:
            </label>
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <input
                className="input"
                style={{ flex: 1, minHeight: 44, fontSize: 14 }}
                placeholder="Ví dụ: My favorite season, Living in a big city..."
                value={customTopic}
                onChange={(e) => {
                  setCustomTopic(e.target.value);
                  if (e.target.value.trim()) setIsCustom(true);
                }}
              />
              {isCustom && customTopic.trim() && (
                <button
                  type="button"
                  className="btn ghost sm"
                  onClick={() => setIsCustom(false)}
                >
                  Dùng gợi ý
                </button>
              )}
            </div>
          </MotionCard>
        </div>

        {/* Right Column: Recording card & History */}
        <div className="colstack">
          {/* Main Recording Card */}
          <MotionCard style={{ textAlign: 'center', padding: 30 }}>
            {rec ? (
              <span className="pill redsoft">● Đang ghi âm · {formatTime(recordSeconds)}</span>
            ) : (
              <span className="pill level">Micro đã sẵn sàng</span>
            )}

            <div style={{ margin: '26px 0 6px' }}>
              <button
                type="button"
                className="micbig"
                onClick={rec ? stopRecording : startSessionAndRecord}
                disabled={busy}
                title={rec ? 'Dừng ghi âm' : 'Bắt đầu ghi âm'}
              >
                <Icon n="mic" s={38} />
              </button>
            </div>

            {/* Audio Wave Visualizer */}
            <div className="wave mt16">
              {[10, 20, 30, 16, 34, 24, 12, 28, 36, 18, 26, 32, 14, 22, 30, 12, 24, 34, 16, 26, 10, 20, 28, 15].map(
                (h, idx) => (
                  <i key={idx} style={{ height: rec ? h : 6, opacity: rec ? 1 : 0.4 }} />
                )
              )}
            </div>

            <b style={{ fontSize: 17, display: 'block', marginTop: 14 }}>
              Chủ đề: {isCustom && customTopic ? customTopic : topic} · Trình độ {level}
            </b>
            <div className="sub mt8" style={{ fontSize: 13 }}>
              {activeTopicObj?.desc || 'Hãy nói tự nhiên từ 30–60 giây để Vi đánh giá.'}
            </div>

            {rec ? (
              <button
                type="button"
                className="btn block mt16"
                style={{ background: 'var(--red)', boxShadow: '0 14px 28px rgba(229,72,77,.3)' }}
                onClick={stopRecording}
              >
                ■ Dừng &amp; gửi chấm điểm
              </button>
            ) : (
              <button
                type="button"
                className="btn block mt16"
                disabled={busy}
                onClick={startSessionAndRecord}
              >
                <Icon n="mic" s={20} />
                {busy ? 'Đang kết nối micro...' : 'Bắt đầu nói ngay'}
              </button>
            )}
          </MotionCard>

          {/* Recent sessions card */}
          {historySessions.length > 0 && (
            <MotionCard>
              <h2>
                <span className="dot g" />
                Các lần nói gần đây
              </h2>
              <div className="mt8" style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {historySessions.slice(0, 4).map((hs: any) => {
                  const score = hs.overallScore != null ? Math.round(Number(hs.overallScore)) : null;
                  return (
                    <div
                      key={hs.id}
                      className="taskrow"
                      style={{ cursor: 'pointer' }}
                      onClick={() => nav('/speaking/result', { state: { sessionId: hs.id } })}
                    >
                      <span className="tk" style={{ color: 'var(--primary)' }}>
                        <Icon n="mic" s={18} />
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <b style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
                          {hs.topic}
                        </b>
                        <div className="sub">
                          {hs.level} · {hs.createdAt ? new Date(hs.createdAt).toLocaleDateString('vi-VN') : 'Gần đây'}
                        </div>
                      </div>
                      <span className="pill level">
                        {score != null ? <><AnimatedCounter value={score} />đ</> : 'Xem'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </MotionCard>
          )}

          {/* Mascot reminder */}
          <MotionCard>
            <div className="coach">
              <img src={viAvatar} alt="Vi" />
              <div className="bubble">
                <b>Vi nhắc bạn:</b> Đừng ngại nói sai! Nói chậm, rõ ràng theo cụm ý (chunking) sẽ giúp điểm trôi chảy và phát âm tăng rất nhanh đấy.
              </div>
            </div>
          </MotionCard>
        </div>
      </div>
        </>
      )}
    </div>
  );
}
