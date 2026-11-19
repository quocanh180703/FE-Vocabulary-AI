import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { listeningApi, errMsg } from '../api';
import type {
  CreateListeningResponse,
  ListeningSubmitResponse,
  ListeningHistoryItem,
} from '../api';
import { Icon } from '../components/icons';
import { useUsage } from '../context/UsageContext';
import { QuotaBadge } from '../components/QuotaBadge';
import { MotionCard, staggerContainer, staggerItem } from '../motion';
import { VOICES } from '../components/VoiceChatPanel';
import { ViMascotImage } from '../components/ViMascotImage';
import { SplitHeading, ScoreRing } from '../components/SageEffects';
import { UiIcon, type UiIconName } from '../components/UiIcon';
import './Listening.css';

interface TopicItem {
  name: string;
  en: string;
  category: 'daily' | 'hobbies' | 'work' | 'travel' | 'tech';
  tag: string;
  icon: UiIconName;
  desc: string;
}

const CATEGORIES: Array<{ id: string; name: string; icon: UiIconName }> = [
  { id: 'all', name: 'Tất cả', icon: 'sparkles' },
  { id: 'daily', name: 'Đời sống', icon: 'coffee' },
  { id: 'hobbies', name: 'Sở thích', icon: 'palette' },
  { id: 'work', name: 'Công việc & Học tập', icon: 'briefcase' },
  { id: 'travel', name: 'Du lịch & Văn hóa', icon: 'plane' },
  { id: 'tech', name: 'Công nghệ & Xã hội', icon: 'lightbulb' },
];

const TOPICS: TopicItem[] = [
  // 1. Đời sống (daily)
  {
    name: 'Giới thiệu bản thân',
    en: 'Introduce Yourself',
    category: 'daily',
    tag: 'A2',
    icon: 'user',
    desc: 'Nghe đoạn giới thiệu tên tuổi, nghề nghiệp, nơi sống và sở thích cá nhân.',
  },
  {
    name: 'Kể về cuối tuần vừa qua',
    en: 'My Last Weekend',
    category: 'daily',
    tag: 'A2',
    icon: 'calendar',
    desc: 'Lắng nghe các hoạt động thư giãn, giải trí và sinh hoạt cuối tuần cùng bạn bè.',
  },
  {
    name: 'Thói quen một ngày của bạn',
    en: 'My Daily Routine',
    category: 'daily',
    tag: 'A2',
    icon: 'clock',
    desc: 'Lịch trình từ sáng thức dậy, bữa ăn đến giờ làm việc và nghỉ ngơi buổi tối.',
  },
  {
    name: 'Thời tiết & Bốn mùa',
    en: 'Weather & Four Seasons',
    category: 'daily',
    tag: 'A2',
    icon: 'weather',
    desc: 'Mô tả thời tiết yêu thích, sự thay đổi của khí hậu và các hoạt động theo mùa.',
  },

  // 2. Công việc & Học tập (work)
  {
    name: 'Công việc mơ ước',
    en: 'My Dream Career',
    category: 'work',
    tag: 'B1',
    icon: 'briefcase',
    desc: 'Mô tả nghề nghiệp lý tưởng, môi trường làm việc và các kỹ năng cần thiết.',
  },
  {
    name: 'Làm việc từ xa hay văn phòng?',
    en: 'Remote vs Office Work',
    category: 'work',
    tag: 'B2',
    icon: 'laptop',
    desc: 'So sánh ưu nhược điểm giữa làm việc từ xa online và văn phòng truyền thống.',
  },

  // 3. Du lịch & Văn hóa (travel)
  {
    name: 'Chuyến du lịch đáng nhớ',
    en: 'A Memorable Journey',
    category: 'travel',
    tag: 'B1',
    icon: 'plane',
    desc: 'Kỷ niệm du lịch, khám phá danh lam thắng cảnh, con người và ẩm thực địa phương.',
  },
  {
    name: 'Khám phá văn hóa cà phê',
    en: 'Coffee Culture & Cafes',
    category: 'travel',
    tag: 'A2',
    icon: 'coffee',
    desc: 'Thói quen thưởng thức cà phê, không gian quán xá và phong cách sống hiện đại.',
  },

  // 4. Sở thích (hobbies)
  {
    name: 'Món ăn yêu thích',
    en: 'Favorite Food & Cooking',
    category: 'hobbies',
    tag: 'A2',
    icon: 'food',
    desc: 'Mô tả hương vị món ăn khoái khẩu, nguyên liệu tươi ngon và cách chế biến.',
  },
  {
    name: 'Thói quen đọc sách',
    en: 'Reading & Books',
    category: 'hobbies',
    tag: 'B1',
    icon: 'books',
    desc: 'Lợi ích của việc đọc sách mỗi ngày, thể loại yêu thích và kỹ năng tự học.',
  },

  // 5. Công nghệ & Xã hội (tech)
  {
    name: 'Trí tuệ nhân tạo (AI)',
    en: 'AI in Daily Life',
    category: 'tech',
    tag: 'B2',
    icon: 'bot',
    desc: 'Những lợi ích và ứng dụng thực tế của AI trong công việc và đời sống hàng ngày.',
  },
  {
    name: 'Mạng xã hội trong đời sống',
    en: 'Social Media & Modern Life',
    category: 'tech',
    tag: 'B1',
    icon: 'phone',
    desc: 'Sự kết nối, chia sẻ thông tin và cách cân bằng thời gian trên mạng xã hội.',
  },
];

const LEVELS = [
  { id: 'A1', name: 'A1 · Căn bản', desc: '25–35 từ' },
  { id: 'A2', name: 'A2 · Sơ cấp', desc: '40–55 từ' },
  { id: 'B1', name: 'B1 · Trung cấp', desc: '60–80 từ' },
  { id: 'B2', name: 'B2 · Khá', desc: '85–110 từ' },
  { id: 'C1', name: 'C1 · Nâng cao', desc: '115–140 từ' },
];

const VOICE_DETAILS: Array<{ id: string; name: string; tone: string; gender: string; avatar: UiIconName; badge?: string }> = [
  { id: 'coral', name: 'Coral', tone: 'Trong trẻo, Dễ nghe', gender: 'Nữ', avatar: 'user', badge: 'Khuyên dùng' },
  { id: 'nova', name: 'Nova', tone: 'Trẻ trung, Năng động', gender: 'Nữ', avatar: 'sparkles' },
  { id: 'alloy', name: 'Alloy', tone: 'Tự nhiên, Chuẩn phát âm', gender: 'Chuẩn', avatar: 'mic' },
  { id: 'echo', name: 'Echo', tone: 'Ấm áp, Điềm tĩnh', gender: 'Nam', avatar: 'headphones' },
  { id: 'onyx', name: 'Onyx', tone: 'Trầm ấm, Chững chạc', gender: 'Nam', avatar: 'volume' },
  { id: 'fable', name: 'Fable', tone: 'Biểu cảm, Kể chuyện', gender: 'Truyền cảm', avatar: 'theater' },
];


export default function Listening() {
  const { decrementQuota } = useUsage();

  // Selection states
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [topic, setTopic] = useState<string>(TOPICS[0].name);
  const [customTopic, setCustomTopic] = useState<string>('');
  const [isCustom, setIsCustom] = useState<boolean>(false);
  const [level, setLevel] = useState<string>('B1');
  const [voice, setVoice] = useState<string>(() => localStorage.getItem('vocab_ai_voice') || 'alloy');
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const voiceDropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (voiceDropdownRef.current && !voiceDropdownRef.current.contains(e.target as Node)) {
        setIsVoiceOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Exercise states
  const [view, setView] = useState<'select' | 'practice' | 'result'>('select');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');

  const [currentExercise, setCurrentExercise] = useState<CreateListeningResponse | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [typedText, setTypedText] = useState('');
  const [submitResult, setSubmitResult] = useState<ListeningSubmitResponse | null>(null);
  const [historyList, setHistoryList] = useState<ListeningHistoryItem[]>([]);

  // Audio player controls
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const loadHistory = () => {
    listeningApi
      .history(0, 10)
      .then(({ data }) => {
        const list = Array.isArray(data?.content) ? data.content : Array.isArray(data) ? data : [];
        setHistoryList(list);
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadHistory();
  }, []);

  // Clean up object URL when component unmounts or audio changes
  useEffect(() => {
    return () => {
      if (audioUrl && audioUrl.startsWith('blob:')) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  // Handle Play/Pause
  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(() => {});
    }
  };

  const seekRelative = (seconds: number) => {
    if (!audioRef.current) return;
    const target = Math.min(Math.max(0, audioRef.current.currentTime + seconds), duration || 999);
    audioRef.current.currentTime = target;
  };

  const changeRate = (rate: number) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Start new exercise
  const handleCreateExercise = async () => {
    const finalTopic = isCustom && customTopic.trim() ? customTopic.trim() : topic;
    if (!finalTopic) {
      setErr('Vui lòng chọn hoặc nhập chủ đề luyện nghe.');
      return;
    }

    setErr('');
    setLoading(true);

    try {
      const { data } = await listeningApi.create(finalTopic, level, voice);
      decrementQuota('listening');
      setCurrentExercise(data);

      // Fetch audio blob with JWT token
      const blob = await listeningApi.audioBlob(data.exerciseId);
      const blobUrl = URL.createObjectURL(blob);
      setAudioUrl(blobUrl);

      setTypedText('');
      setSubmitResult(null);
      setView('practice');
    } catch (e: any) {
      setErr(errMsg(e, 'Không thể tạo bài luyện nghe lúc này. Vui lòng thử lại!'));
    } finally {
      setLoading(false);
    }
  };

  // Submit and grade exercise
  const handleSubmit = async () => {
    if (!currentExercise) return;
    if (!typedText.trim()) {
      setErr('Vui lòng gõ lại nội dung bạn nghe được trước khi chấm điểm nhé!');
      return;
    }

    setErr('');
    setSubmitting(true);

    try {
      const { data } = await listeningApi.submit(currentExercise.exerciseId, typedText);
      setSubmitResult(data);
      setView('result');
      loadHistory();
    } catch (e: any) {
      if (e?.response?.status === 409) {
        try {
          const { data } = await listeningApi.detail(currentExercise.exerciseId);
          setSubmitResult(data);
          setView('result');
          loadHistory();
          return;
        } catch {
          // ignore, fall back to err
        }
      }
      setErr(errMsg(e, 'Chấm điểm bài nghe thất bại. Vui lòng thử lại!'));
    } finally {
      setSubmitting(false);
    }
  };

  // Review past exercise from history
  const handleReviewHistoryItem = async (item: ListeningHistoryItem) => {
    try {
      setLoading(true);
      setErr('');
      const { data } = await listeningApi.detail(item.id);
      setSubmitResult(data);
      setCurrentExercise({
        exerciseId: item.id,
        topic: item.topic,
        level: item.level,
        voice: item.voice,
        audioUrl: `/api/ai/listening/audio/${item.id}/stream`,
      });

      const blob = await listeningApi.audioBlob(item.id);
      const blobUrl = URL.createObjectURL(blob);
      setAudioUrl(blobUrl);

      setView('result');
    } catch (e: any) {
      setErr(errMsg(e, 'Không thể mở bài nghe cũ.'));
    } finally {
      setLoading(false);
    }
  };

  const filteredTopics = TOPICS.filter((t) =>
    selectedCategory === 'all' ? true : t.category === selectedCategory
  );

  const selectedVoiceDetail = VOICE_DETAILS.find((v) => v.id === voice) || VOICE_DETAILS[0];
  const selectedVoiceObj = VOICES.find((v) => v.id === voice) || VOICES[0];
  const selectedLevelObj = LEVELS.find((l) => l.id === level) || LEVELS[2];
  const activeTopicObj = TOPICS.find((t) => t.name === topic);

  return (
    <div className="content listening-page">
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          onTimeUpdate={() => {
            if (audioRef.current) {
              setCurrentTime(audioRef.current.currentTime);
            }
          }}
          onLoadedMetadata={() => {
            if (audioRef.current) {
              setDuration(audioRef.current.duration);
              audioRef.current.playbackRate = playbackRate;
            }
          }}
        />
      )}

      {/* Header Bar */}
      <div className="pagehead listening-header">
        <div>
          <div className="eyebrow">LISTENING STUDIO · DICTATION</div>
          <SplitHeading text="Luyện nghe Chép chính tả" />
          <p className="sub">
            Rèn luyện kỹ năng nghe hiểu tiếng Anh qua phương pháp Dictation &amp; Chấm điểm từng từ.
          </p>
        </div>

        <div className="row" style={{ gap: 10 }}>
          <QuotaBadge featureKey="listening" labelSuffix="bài hôm nay" />
          {view !== 'select' && (
            <button
              type="button"
              className="btn secondary sm"
              onClick={() => {
                if (audioRef.current) audioRef.current.pause();
                setView('select');
              }}
            >
              ← Chọn bài khác
            </button>
          )}
        </div>
      </div>

      {err && <div className="error">{err}</div>}

      <AnimatePresence mode="wait">
      {/* VIEW 1: SELECT TOPIC & SETUP */}
      {view === 'select' && (
        <motion.div
          key="select"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.22 }}
          className="colstack"
          style={{ flex: 1, minHeight: 0, gap: 10 }}
        >
          {/* Category Filter & Level Selector */}
          <div className="row between" style={{ flexWrap: 'wrap', gap: 10, flex: 'none' }}>
            <div className="chiprow" style={{ margin: 0 }}>
              {CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={'fchip' + (selectedCategory === c.id ? ' on' : '')}
                  onClick={() => setSelectedCategory(c.id)}
                >
                  <UiIcon name={c.icon} size={14} />
                  <span>{c.name}</span>
                </button>
              ))}
            </div>

            <div className="chips">
              <span className="tiny" style={{ fontWeight: 800, color: 'var(--cream)', textShadow: '0 1px 4px rgba(0,0,0,0.4)', marginRight: 2 }}>
                Trình độ:
              </span>
              {LEVELS.map((lvl) => (
                <button
                  key={lvl.id}
                  type="button"
                  className={'fchip' + (level === lvl.id ? ' on' : '')}
                  title={`${lvl.name} (${lvl.desc})`}
                  onClick={() => setLevel(lvl.id)}
                >
                  {lvl.id}
                </button>
              ))}
            </div>
          </div>

          <div className="cols2" style={{ gridTemplateColumns: 'minmax(0, 1.35fr) minmax(300px, 0.9fr)', flex: 1, minHeight: 0, alignItems: 'stretch' }}>
            {/* Left Column: Scrollable Topics Grid & Pinned Custom Input */}
            <div className="card colstack" style={{ gap: 10, minHeight: 0 }}>
              <div className="long-list" style={{ flex: 1, minHeight: 0, paddingRight: 4 }}>
                <motion.div
                  variants={staggerContainer}
                  initial="hidden"
                  animate="visible"
                  key={selectedCategory}
                  className="listening-topics-grid"
                >
                  {filteredTopics.map((t) => {
                    const isSelected = !isCustom && topic === t.name;
                    return (
                      <motion.div key={t.name} variants={staggerItem}>
                        <button
                          type="button"
                          className={'listening-topic-card' + (isSelected ? ' on' : '')}
                          onClick={() => {
                            setTopic(t.name);
                            setIsCustom(false);
                          }}
                        >
                          <div className="listening-topic-card-top">
                            <span className="listening-topic-icon"><UiIcon name={t.icon} size={18} /></span>
                            {isSelected && (
                              <span className="pill greensoft" style={{ fontSize: 11 }}>
                                <Icon n="check" s={12} /> Đã chọn
                              </span>
                            )}
                          </div>
                          <div className="listening-topic-body">
                            <b className="listening-topic-title">{t.name}</b>
                            <div className="listening-topic-en">{t.en}</div>
                            <p className="listening-topic-desc">{t.desc}</p>
                          </div>
                        </button>
                      </motion.div>
                    );
                  })}
                </motion.div>
              </div>

              {/* Custom Topic Input pinned at bottom */}
              <div style={{ flex: 'none', paddingTop: 10, borderTop: '1px solid var(--line)' }}>
                <div className="row between" style={{ marginBottom: 6 }}>
                  <label className="tiny" style={{ fontWeight: 800, color: 'var(--ink)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <UiIcon name="pencil" size={13} /> Hoặc tự nhập chủ đề theo ý bạn:
                  </label>
                  {isCustom && <span className="pill greensoft" style={{ fontSize: 11 }}>Đang dùng chủ đề tự nhập</span>}
                </div>
                <div className="row" style={{ gap: 8 }}>
                  <input
                    type="text"
                    className="input"
                    value={customTopic}
                    onChange={(e) => {
                      setCustomTopic(e.target.value);
                      setIsCustom(true);
                    }}
                    onFocus={() => {
                      if (customTopic.trim()) setIsCustom(true);
                    }}
                    placeholder="Ví dụ: Lợi ích của việc đọc sách mỗi ngày..."
                    style={{ flex: 1, fontSize: 13.5 }}
                  />
                  {isCustom && (
                    <button
                      type="button"
                      className="btn ghost sm"
                      onClick={() => {
                        setIsCustom(false);
                        setCustomTopic('');
                      }}
                    >
                      Bỏ chọn
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Setup Summary, Guide & History */}
            <div className="colstack long-list" style={{ gap: 10, paddingRight: 4 }}>
              <MotionCard style={{ padding: 18 }}>
                <div className="row" style={{ gap: 12, marginBottom: 12 }}>
                  <ViMascotImage
                    pose="listen"
                    animated
                    size={58}
                    priority
                    alt="Vi đeo tai nghe sẵn sàng tạo bài luyện nghe tiếng Anh"
                  />
                  <div>
                    <h3 style={{ margin: 0, fontSize: 16, color: 'var(--ink)' }}>
                      Sẵn sàng luyện nghe!
                    </h3>
                    <p className="tiny muted" style={{ margin: '2px 0 0' }}>
                      AI sẽ tạo đoạn văn độc quyền và đọc giọng chuẩn bản xứ.
                    </p>
                  </div>
                </div>

                <div
                  style={{
                    background: 'rgba(250, 248, 241, 0.72)',
                    borderRadius: 14,
                    padding: 12,
                    border: '1px solid var(--line)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                    marginBottom: 14,
                  }}
                >
                  <div className="row between" style={{ fontSize: 13 }}>
                    <span className="muted">Chủ đề:</span>
                    <b style={{ color: 'var(--ink)', maxWidth: '65%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <UiIcon name={isCustom ? 'pencil' : activeTopicObj?.icon || 'lightbulb'} size={14} /> {isCustom && customTopic ? customTopic : topic}
                    </b>
                  </div>

                  <div className="row between" style={{ fontSize: 13 }}>
                    <span className="muted">Trình độ:</span>
                    <div className="row" style={{ gap: 6 }}>
                      <span className="pill">Cấp {level}</span>
                      <span className="tiny muted">({selectedLevelObj?.desc || 'Chuẩn CEFR'})</span>
                    </div>
                  </div>

                  {/* Custom Modern Voice Selector */}
                  <div className="custom-voice-select-wrap" ref={voiceDropdownRef}>
                    <div className="row between" style={{ marginBottom: 6 }}>
                      <span className="tiny muted" style={{ fontWeight: 700 }}>Giọng đọc bản xứ:</span>
                      <span className="pill" style={{ fontSize: 11 }}>
                        {selectedVoiceDetail.gender} · {selectedVoiceDetail.tone}
                      </span>
                    </div>

                    <button
                      type="button"
                      className={'custom-voice-trigger' + (isVoiceOpen ? ' active' : '')}
                      onClick={() => setIsVoiceOpen(!isVoiceOpen)}
                    >
                      <div className="row" style={{ gap: 10 }}>
                        <span className="voice-avatar-badge"><UiIcon name={selectedVoiceDetail.avatar} size={15} /></span>
                        <div style={{ textAlign: 'left' }}>
                          <div className="row" style={{ gap: 6 }}>
                            <b style={{ fontSize: 13, color: 'var(--ink)' }}>{selectedVoiceDetail.name}</b>
                            {selectedVoiceDetail.badge && (
                              <span className="voice-recommend-badge">{selectedVoiceDetail.badge}</span>
                            )}
                          </div>
                          <span className="tiny muted">{selectedVoiceDetail.tone}</span>
                        </div>
                      </div>
                      <span className={'voice-chevron' + (isVoiceOpen ? ' open' : '')}>
                        <Icon n="chevronDown" s={16} />
                      </span>
                    </button>

                    <AnimatePresence>
                      {isVoiceOpen && (
                        <motion.div
                          className="custom-voice-dropdown-menu"
                          initial={{ opacity: 0, y: -6, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -6, scale: 0.98 }}
                          transition={{ duration: 0.15 }}
                        >
                          {VOICE_DETAILS.map((v) => {
                            const isCurrent = v.id === voice;
                            return (
                              <button
                                key={v.id}
                                type="button"
                                className={'custom-voice-option' + (isCurrent ? ' selected' : '')}
                                onClick={() => {
                                  setVoice(v.id);
                                  localStorage.setItem('vocab_ai_voice', v.id);
                                  setIsVoiceOpen(false);
                                }}
                              >
                                <span className="voice-avatar-badge"><UiIcon name={v.avatar} size={15} /></span>
                                <div style={{ flex: 1, textAlign: 'left' }}>
                                  <div className="row" style={{ gap: 6 }}>
                                    <b style={{ fontSize: 13, color: isCurrent ? 'var(--sage-dark)' : 'var(--ink)' }}>
                                      {v.name}
                                    </b>
                                    <span className="voice-gender-tag">{v.gender}</span>
                                    {v.badge && <span className="voice-recommend-badge">{v.badge}</span>}
                                  </div>
                                  <div className="tiny muted">{v.tone}</div>
                                </div>
                                {isCurrent && <Icon n="check" s={16} />}
                              </button>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn block"
                  disabled={loading}
                  onClick={handleCreateExercise}
                >
                  {loading ? (
                    <>
                      <Icon n="loader" s={18} className="spin" />
                      <span>Đang tạo bài nghe bằng AI...</span>
                    </>
                  ) : (
                    <>
                      <Icon n="headphones" s={18} />
                      <span>Bắt đầu Tạo bài nghe</span>
                    </>
                  )}
                </button>
              </MotionCard>

              {historyList.length > 0 ? (
                <div className="listening-history-card" style={{ padding: 16 }}>
                  <div className="row between" style={{ marginBottom: 8 }}>
                    <h4 style={{ margin: 0, fontSize: 14, color: 'var(--ink)', display: 'inline-flex', alignItems: 'center', gap: 6 }}><UiIcon name="clock" size={15} /> Bài đã làm gần đây</h4>
                    <span className="tiny muted">{historyList.length} bài</span>
                  </div>
                  <div className="colstack" style={{ gap: 6 }}>
                    {historyList.slice(0, 3).map((item) => (
                      <div
                        key={item.id}
                        className="history-item-row"
                        style={{ padding: '8px 10px', marginBottom: 0 }}
                        onClick={() => handleReviewHistoryItem(item)}
                      >
                        <div style={{ overflow: 'hidden', flex: 1, minWidth: 0, marginRight: 8 }}>
                          <b style={{ fontSize: 13, color: 'var(--ink)', display: 'block', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                            {item.topic}
                          </b>
                          <span className="tiny muted">
                            Cấp {item.level} · {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                          </span>
                        </div>
                        {item.score !== null && item.score !== undefined && (
                          <span className={'pill ' + (item.score >= 80 ? 'greensoft' : item.score >= 50 ? 'warn' : 'redsoft')}>
                            {item.score}/100
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="card" style={{ padding: 14 }}>
                  <div className="coach">
                    <ViMascotImage
                      pose="listen"
                      size={44}
                      alt="Vi mách nhỏ mẹo luyện nghe chép chính tả"
                    />
                    <div className="bubble" style={{ fontSize: 12.5, lineHeight: 1.45 }}>
                      <b>Vi mách nhỏ:</b> Bạn có thể nghe lại nhiều lần và giảm tốc độ xuống 0.75x để luyện bắt âm nối tự nhiên.
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* VIEW 2: PRACTICE / DICTATION PLAYER */}
      {view === 'practice' && currentExercise && (
        <motion.div
          key="practice"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.22 }}
          className="long-list colstack"
          style={{ flex: 1, minHeight: 0, gap: 12, paddingRight: 4 }}
        >
          <div className="listening-player-card">
            <div className="row between" style={{ marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
              <div className="row" style={{ gap: 8 }}>
                <span className="pill">Cấp {currentExercise.level}</span>
                <b style={{ fontSize: 16.5, color: 'var(--ink)' }}>{currentExercise.topic}</b>
              </div>
              <div className="row" style={{ gap: 10 }}>
                <ViMascotImage pose="listen" animated size={40} alt="Vi đang phát bài nghe tiếng Anh" />
                <span className="tiny muted">Giọng: <b>{selectedVoiceObj.name}</b></span>
              </div>
            </div>

            <div className="listening-audio-controls">
              <button
                type="button"
                className="audio-btn-circle"
                onClick={togglePlay}
                title={isPlaying ? 'Tạm dừng' : 'Phát âm thanh'}
              >
                {isPlaying ? <span style={{ fontSize: 18 }}>⏸</span> : <span style={{ fontSize: 20, marginLeft: 2 }}>▶</span>}
              </button>

              <button type="button" className="audio-btn-sec" onClick={() => seekRelative(-5)}>⏪ -5s</button>
              <button type="button" className="audio-btn-sec" onClick={() => seekRelative(5)}>⏩ +5s</button>

              <div className="audio-progress-wrap">
                <input
                  type="range"
                  className="audio-progress-slider"
                  min={0}
                  max={duration || 100}
                  step={0.1}
                  value={currentTime}
                  onChange={(e) => {
                    const target = parseFloat(e.target.value);
                    setCurrentTime(target);
                    if (audioRef.current) audioRef.current.currentTime = target;
                  }}
                />
                <div className="row between tiny muted">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              <div className="row" style={{ gap: 6 }}>
                {[0.75, 1.0].map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    className={playbackRate === rate ? 'btn sm' : 'btn secondary sm'}
                    onClick={() => changeRate(rate)}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="listening-player-card">
            <div className="row between" style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--ink)' }}>
                <UiIcon name="pen" size={14} /> Gõ lại những gì bạn nghe được:
              </label>
              <span className="tiny muted">
                Đã gõ: <b>{typedText.trim() ? typedText.trim().split(/\s+/).length : 0}</b> từ
              </span>
            </div>

            <textarea
              className="dictation-textarea"
              value={typedText}
              onChange={(e) => setTypedText(e.target.value)}
              placeholder="Lắng nghe cẩn thận và gõ từng từ bạn nghe được... Không cần lo lắng về dấu câu hay viết hoa/thường!"
              autoFocus
            />

            <div className="row between" style={{ marginTop: 14, flexWrap: 'wrap', gap: 10 }}>
              <div className="tiny muted">
                <UiIcon name="lightbulb" size={14} /> Mẹo: Bạn có thể nghe lại bao nhiêu lần tùy thích trước khi nộp bài.
              </div>

              <div className="row" style={{ gap: 10 }}>
                <button
                  type="button"
                  className="btn secondary sm"
                  onClick={() => {
                    if (audioRef.current) audioRef.current.pause();
                    setView('select');
                  }}
                >
                  Làm bài khác
                </button>

                <button
                  type="button"
                  className="btn sm"
                  disabled={submitting || !typedText.trim()}
                  onClick={handleSubmit}
                >
                  {submitting ? (
                    <>
                      <Icon n="loader" s={16} className="spin" />
                      <span>Đang chấm điểm...</span>
                    </>
                  ) : (
                    <>
                      <Icon n="check" s={16} />
                      <span>Chấm điểm ngay</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* VIEW 3: RESULTS & WORD-BY-WORD DIFF */}
      {view === 'result' && submitResult && (
        <motion.div
          key="result"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.22 }}
          className="long-list colstack"
          style={{ flex: 1, minHeight: 0, paddingRight: 4 }}
        >
          <div className="result-card">
            <div className="score-hero">
              <ScoreRing
                value={submitResult.score}
                label={`${submitResult.score}/100`}
                size={88}
                accentColor={submitResult.score >= 80 ? 'var(--success)' : submitResult.score >= 50 ? 'var(--sage)' : 'var(--danger)'}
              />
              <ViMascotImage
                pose={submitResult.score >= 70 ? 'celebrate' : 'listen'}
                animated={submitResult.score >= 80}
                size={76}
                alt={submitResult.score >= 70 ? 'Vi ăn mừng kết quả nghe chép chính tả tốt' : 'Vi khích lệ bạn luyện nghe thêm'}
              />

              <div style={{ flex: 1, minWidth: 200 }}>
                <h2 style={{ margin: '0 0 4px', fontSize: 19, color: 'var(--ink)', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <UiIcon
                    name={
                      submitResult.score >= 85
                        ? 'award'
                        : submitResult.score >= 70
                        ? 'thumbs-up'
                        : submitResult.score >= 50
                        ? 'dumbbell'
                        : 'sprout'
                    }
                    size={20}
                  />
                  <span>
                    {submitResult.score >= 85
                      ? 'Xuất sắc! Khả năng nghe của bạn rất ấn tượng!'
                      : submitResult.score >= 70
                      ? 'Rất tốt! Bạn đã nắm bắt hầu hết đoạn văn.'
                      : submitResult.score >= 50
                      ? 'Khá ổn! Tiếp tục luyện tập để quen tai hơn nhé.'
                      : 'Cần cố gắng thêm! Hãy nghe lại và đối chiếu từng từ bên dưới.'}
                  </span>
                </h2>
                <p className="sub" style={{ margin: 0, fontSize: 13.5 }}>
                  Chủ đề: <b>{currentExercise?.topic}</b> · Trình độ: <b>Cấp {currentExercise?.level}</b>
                </p>
              </div>

              <div className="row" style={{ gap: 8 }}>
                <button
                  type="button"
                  className="btn secondary sm"
                  onClick={() => {
                    if (audioRef.current) {
                      audioRef.current.currentTime = 0;
                      audioRef.current.play().catch(() => {});
                    }
                  }}
                >
                  <UiIcon name="volume" size={15} /> Nghe lại
                </button>

                <button
                  type="button"
                  className="btn sm"
                  onClick={() => {
                    if (audioRef.current) audioRef.current.pause();
                    setView('select');
                  }}
                >
                  Luyện bài tiếp theo →
                </button>
              </div>
            </div>

            <div className="cols2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginTop: 14 }}>
              <div className="kpi" style={{ padding: 12 }}>
                <div className="lbl">Tổng số từ</div>
                <div className="num" style={{ fontSize: 20 }}>{submitResult.totalWords}</div>
              </div>
              <div className="kpi" style={{ padding: 12 }}>
                <div className="lbl">Từ đúng</div>
                <div className="num" style={{ fontSize: 20, color: 'var(--green-dark)' }}>{submitResult.correctWords}</div>
              </div>
              <div className="kpi" style={{ padding: 12 }}>
                <div className="lbl">Sai nhẹ</div>
                <div className="num" style={{ fontSize: 20, color: 'var(--amber-dark)' }}>{submitResult.nearMissWords}</div>
              </div>
              <div className="kpi" style={{ padding: 12 }}>
                <div className="lbl">Thiếu / Sai</div>
                <div className="num" style={{ fontSize: 20, color: 'var(--red-dark)' }}>
                  {Math.max(0, submitResult.totalWords - submitResult.correctWords - submitResult.nearMissWords)}
                </div>
              </div>
            </div>

            <div style={{ marginTop: 18 }}>
              <div className="row between" style={{ flexWrap: 'wrap', gap: 8 }}>
                <h3 style={{ margin: 0, fontSize: 15, color: 'var(--ink)' }}>
                  <UiIcon name="search" size={14} /> Chi tiết đối chiếu từng từ:
                </h3>
                <div className="row tiny" style={{ gap: 10 }}>
                  <span className="pill greensoft">Đúng</span>
                  <span className="pill warn">Sai nhẹ</span>
                  <span className="pill redsoft">Từ sai</span>
                </div>
              </div>

              <div className="diff-stream">
                {submitResult.wordResults.map((w, idx) => {
                  const status = w.status.toLowerCase();
                  if (status === 'correct') {
                    return (
                      <span key={idx} className="diff-token correct" title="Chính xác">
                        {w.originalWord || w.userWord}
                      </span>
                    );
                  }
                  if (status === 'near_miss') {
                    return (
                      <span
                        key={idx}
                        className="diff-token near_miss"
                        title={`Gần đúng! Bạn gõ: "${w.userWord}" ➔ Đúng: "${w.originalWord}"`}
                      >
                        {w.originalWord}
                        <span style={{ fontSize: 11, marginLeft: 4, opacity: 0.8 }}>({w.userWord})</span>
                      </span>
                    );
                  }
                  if (status === 'incorrect') {
                    return (
                      <span
                        key={idx}
                        className="diff-token incorrect"
                        title={`Bạn gõ: "${w.userWord}" ➔ Đúng: "${w.originalWord}"`}
                      >
                        {w.originalWord}
                        <span style={{ fontSize: 11, marginLeft: 4, textDecoration: 'line-through', opacity: 0.75 }}>
                          {w.userWord}
                        </span>
                      </span>
                    );
                  }
                  if (status === 'missing') {
                    return (
                      <span key={idx} className="diff-token missing" title="Bạn chưa gõ từ này">
                        [{w.originalWord}]
                      </span>
                    );
                  }
                  if (status === 'extra') {
                    return (
                      <span key={idx} className="diff-token extra" title="Từ thừa bạn tự thêm">
                        {w.userWord}
                      </span>
                    );
                  }
                  return null;
                })}
              </div>
            </div>

            {submitResult.transcript && (
              <div className="transcript-box">
                <div className="row between" style={{ marginBottom: 6 }}>
                  <b style={{ fontSize: 13.5, display: 'inline-flex', alignItems: 'center', gap: 6 }}><UiIcon name="book" size={15} /> Văn bản đầy đủ đoạn nghe:</b>
                  <button
                    type="button"
                    className="btn ghost sm"
                    onClick={() => {
                      if (audioRef.current) {
                        audioRef.current.currentTime = 0;
                        audioRef.current.play().catch(() => {});
                      }
                    }}
                  >
                    <UiIcon name="volume" size={15} /> Nghe lại đoạn này
                  </button>
                </div>
                <p style={{ margin: 0 }}>{submitResult.transcript}</p>
              </div>
            )}
          </div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
}
