import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { speakApi, personalizedApi, errMsg } from '../api';
import type { SpeakSession } from '../api';
import { Icon } from '../components/icons';
import { useAuth } from '../auth/AuthContext';
import { useUsage } from '../context/UsageContext';
import { QuotaBadge } from '../components/QuotaBadge';
import { MotionCard, AnimatedCounter, staggerContainer, staggerItem } from '../motion';
import { ViMascotImage } from '../components/ViMascotImage';
import { UiIcon } from '../components/UiIcon';
import { SplitHeading } from '../components/SageEffects';
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
  const [isVoiceScoringResult, setIsVoiceScoringResult] = useState(false);
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
      <div className="content narrow center">
        <MotionCard className="center" style={{ maxWidth: 600, width: '100%', padding: '32px 26px', gap: 14 }}>
          <ViMascotImage
            pose="thinking"
            size={88}
            priority
            alt="Vi đang nghe và chấm điểm 5 tiêu chí bài nói của bạn"
          />
          <SplitHeading text="Vi đang chấm bài nói của bạn…" />
          <p className="sub" style={{ margin: 0 }}>
            Chủ đề &quot;{isCustom && customTopic ? customTopic : topic}&quot; · bản ghi {recordSeconds} giây vừa được gửi lên.
          </p>
          <div className="colstack" style={{ width: '100%', textAlign: 'left', gap: 8, marginTop: 6 }}>
            <div className="taskrow">
              <span className="tk" style={{ color: 'var(--sage-dark)' }}>
                <Icon n="check" s={16} />
              </span>
              <div style={{ flex: 1 }}>
                <b style={{ fontSize: 14 }}>Nghe &amp; chuyển thành văn bản</b>
                <div className="tiny muted">Whisper AI đang nhận diện lời nói của bạn.</div>
              </div>
              <span className="pill greensoft">Đang xử lý</span>
            </div>
            <div className="taskrow">
              <span className="tk" style={{ color: 'var(--sage-dark)' }}>
                <Icon n="spark" s={16} />
              </span>
              <div style={{ flex: 1 }}>
                <b style={{ fontSize: 14 }}>Chấm 5 tiêu chí</b>
                <div className="tiny muted">Ngữ pháp · Từ vựng · Trôi chảy · Nội dung · Phát âm</div>
              </div>
              <span className="pill warn">Đang chấm…</span>
            </div>
            <div className="taskrow">
              <span className="tk" style={{ color: 'var(--sage-dark)' }}>
                <Icon n="clock" s={16} />
              </span>
              <div style={{ flex: 1 }}>
                <b style={{ fontSize: 14 }}>Tổng hợp nhận xét</b>
                <div className="tiny muted">Vi viết góp ý chi tiết riêng cho bạn.</div>
              </div>
              <span className="pill">Chờ</span>
            </div>
          </div>
          <div className="tiny muted">
            Thường mất khoảng 10–20 giây — bạn cứ để nguyên màn hình này nhé.
          </div>
        </MotionCard>
      </div>
    );
  }

  return (
    <div className="content">
      {!isVoiceScoringResult && (
        <div className="pagehead">
          <div>
            <div className="eyebrow">SPEAKING STUDIO · 5 CRITERIA</div>
            <SplitHeading text="Luyện nói phản xạ cùng AI" />
            <p className="sub">Chọn chủ đề, nói 1–2 phút — Vi nghe và chấm 5 tiêu chí ngay</p>
          </div>

          <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
            <div className="chips">
              <button
                type="button"
                onClick={() => {
                  setMode('practice');
                  setIsVoiceScoringResult(false);
                }}
                className={'fchip' + (mode === 'practice' ? ' on' : '')}
              >
                <UiIcon name="mic" size={14} /> Luyện nói &amp; Chấm điểm
              </button>
              <button
                type="button"
                onClick={() => setMode('voice')}
                className={'fchip' + (mode === 'voice' ? ' on' : '')}
              >
                <UiIcon name="message" size={14} /> Voice Chat cùng Vi
              </button>
            </div>
            <QuotaBadge featureKey={mode === 'voice' ? 'voice' : 'speaking'} labelSuffix={mode === 'voice' ? 'lượt thoại hôm nay' : 'lượt chấm hôm nay'} />
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        {mode === 'voice' ? (
          <motion.div
            key="voice"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22 }}
            style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}
          >
            <VoiceChatPanel
              topic={isCustom && customTopic ? customTopic : topic}
              level={level}
              onLevelChange={setLevel}
              customTopic={isCustom ? customTopic : undefined}
              onBackToPractice={() => {
                setIsVoiceScoringResult(false);
                setMode('practice');
              }}
              onScoreStateChange={setIsVoiceScoringResult}
            />
          </motion.div>
        ) : (
          <motion.div
            key="practice"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22 }}
            className="colstack"
            style={{ flex: 1, minHeight: 0, gap: 10 }}
          >
            {err && <div className="error">{err}</div>}

            {/* Category & Level Filter Row */}
            <div className="row between" style={{ flexWrap: 'wrap', gap: 10, flex: 'none' }}>
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

              <div className="chips">
                <span className="tiny" style={{ fontWeight: 800, color: 'var(--cream)', textShadow: '0 1px 4px rgba(0,0,0,0.4)', marginRight: 2 }}>
                  Trình độ:
                </span>
                {LEVELS.map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    className={'fchip' + (level === lvl ? ' on' : '')}
                    onClick={() => setLevel(lvl)}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            {/* Main 2-Column Viewport-Locked Studio */}
            <div className="cols2" style={{ flex: 1, minHeight: 0, alignItems: 'stretch' }}>
              {/* Left Column: Topics & Custom Topic */}
              <div className="card colstack" style={{ gap: 10, minHeight: 0 }}>
                <div className="long-list" style={{ flex: 1, minHeight: 0, paddingRight: 4 }}>
                  <motion.div
                    variants={staggerContainer}
                    initial="hidden"
                    animate="visible"
                    key={selectedCategory}
                    style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(165px, 1fr))', gap: 10 }}
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
                            <b style={{ fontSize: 14, display: 'block' }}>{t.name}</b>
                            <div className="tiny muted mt4">{t.en}</div>
                          </button>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                </div>

                {/* Custom Topic Input pinned inside left card */}
                <div style={{ flex: 'none', paddingTop: 10, borderTop: '1px solid var(--line)' }}>
                  <label className="tiny" style={{ fontWeight: 800, color: 'var(--ink)' }}>
                    Hoặc tự nhập chủ đề theo ý bạn:
                  </label>
                  <div className="row mt4" style={{ gap: 8 }}>
                    <input
                      className="input"
                      style={{ flex: 1, fontSize: 13.5 }}
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
                </div>
              </div>

              {/* Right Column: Recorder Stage + Recent Sessions + Listen Pose */}
              <div className="colstack long-list" style={{ gap: 10, paddingRight: 4 }}>
                <MotionCard className="center" style={{ padding: '20px 22px', gap: 10 }}>
                  <div className="row between" style={{ width: '100%' }}>
                    {rec ? (
                      <span className="pill redsoft">● Đang ghi âm · {formatTime(recordSeconds)}</span>
                    ) : (
                      <span className="pill greensoft">Micro đã sẵn sàng</span>
                    )}
                    <span className="pill level">{level}</span>
                  </div>

                  <div className="row" style={{ gap: 18, justifyContent: 'center', margin: '4px 0' }}>
                    <button
                      type="button"
                      className={'record-circle' + (rec ? ' recording' : '')}
                      onClick={rec ? stopRecording : startSessionAndRecord}
                      disabled={busy}
                      title={rec ? 'Dừng ghi âm' : 'Bắt đầu ghi âm'}
                    >
                      <Icon n="mic" s={36} />
                    </button>

                    <ViMascotImage
                      pose="listen"
                      animated
                      size={82}
                      priority
                      alt="Vi đeo tai nghe sẵn sàng lắng nghe bài luyện nói của bạn"
                    />
                  </div>

                  {/* Audio Wave Visualizer */}
                  <div className="wave">
                    {[10, 20, 30, 16, 34, 24, 12, 28, 36, 18, 26, 32, 14, 22, 30, 12, 24, 34, 16, 26].map(
                      (h, idx) => (
                        <i key={idx} style={{ height: rec ? h : 6, opacity: rec ? 1 : 0.4 }} />
                      )
                    )}
                  </div>

                  <div>
                    <b style={{ fontSize: 16, display: 'block', color: 'var(--ink)' }}>
                      Chủ đề: {isCustom && customTopic ? customTopic : topic}
                    </b>
                    <div className="tiny muted mt4">
                      {activeTopicObj?.desc || 'Hãy nói tự nhiên từ 30–60 giây để Vi đánh giá.'}
                    </div>
                  </div>

                  {rec ? (
                    <button
                      type="button"
                      className="btn softred block"
                      onClick={stopRecording}
                    >
                      ■ Dừng &amp; gửi chấm điểm
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn block"
                      disabled={busy}
                      onClick={startSessionAndRecord}
                    >
                      <Icon n="mic" s={18} />
                      {busy ? 'Đang kết nối micro...' : 'Bắt đầu nói ngay'}
                    </button>
                  )}
                </MotionCard>

                {historySessions.length > 0 && (
                  <MotionCard style={{ gap: 8 }}>
                    <div className="row between">
                      <h2 style={{ fontSize: 15, margin: 0 }}>Các lần nói gần đây</h2>
                      <span className="pill">{historySessions.length} lượt</span>
                    </div>
                    <div className="colstack" style={{ gap: 6 }}>
                      {historySessions.slice(0, 3).map((hs: any) => {
                        const score = hs.overallScore != null ? Math.round(Number(hs.overallScore)) : null;
                        return (
                          <div
                            key={hs.id}
                            className="taskrow"
                            style={{ cursor: 'pointer', padding: '8px 10px' }}
                            onClick={() => nav('/speaking/result', { state: { sessionId: hs.id } })}
                          >
                            <span className="tk" style={{ color: 'var(--sage-dark)' }}>
                              <Icon n="mic" s={15} />
                            </span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <b style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', fontSize: 13.5 }}>
                                {hs.topic}
                              </b>
                              <div className="tiny muted">
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

                <MotionCard style={{ padding: '12px 14px' }}>
                  <div className="coach">
                    <ViMascotImage
                      pose="listen"
                      size={44}
                      alt="Vi khuyên bạn nói chậm và rõ theo cụm ý"
                    />
                    <div className="bubble" style={{ fontSize: 13 }}>
                      <b>Vi nhắc bạn:</b> Đừng ngại nói sai! Nói chậm, rõ theo cụm ý (chunking) sẽ giúp điểm trôi chảy và phát âm tăng rất nhanh.
                    </div>
                  </div>
                </MotionCard>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
