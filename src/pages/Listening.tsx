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
import viAvatar from '../assets/vi-3d.webp';
import './Listening.css';

interface TopicItem {
  name: string;
  en: string;
  category: 'daily' | 'hobbies' | 'work' | 'travel' | 'tech';
  tag: string;
  icon: string;
  desc: string;
}

const CATEGORIES = [
  { id: 'all', name: 'Tất cả', icon: '🌟' },
  { id: 'daily', name: 'Đời sống', icon: '☕' },
  { id: 'hobbies', name: 'Sở thích', icon: '🎨' },
  { id: 'work', name: 'Công việc & Học tập', icon: '💼' },
  { id: 'travel', name: 'Du lịch & Văn hóa', icon: '✈️' },
  { id: 'tech', name: 'Công nghệ & Xã hội', icon: '💡' },
];

const TOPICS: TopicItem[] = [
  // 1. Đời sống (daily)
  {
    name: 'Giới thiệu bản thân',
    en: 'Introduce Yourself',
    category: 'daily',
    tag: 'A2',
    icon: '👤',
    desc: 'Nghe đoạn giới thiệu tên tuổi, nghề nghiệp, nơi sống và sở thích cá nhân.',
  },
  {
    name: 'Kể về cuối tuần vừa qua',
    en: 'My Last Weekend',
    category: 'daily',
    tag: 'A2',
    icon: '🗓️',
    desc: 'Lắng nghe các hoạt động thư giãn, giải trí và sinh hoạt cuối tuần cùng bạn bè.',
  },
  {
    name: 'Thói quen một ngày của bạn',
    en: 'My Daily Routine',
    category: 'daily',
    tag: 'A2',
    icon: '⏰',
    desc: 'Lịch trình từ sáng thức dậy, bữa ăn đến giờ làm việc và nghỉ ngơi buổi tối.',
  },
  {
    name: 'Thời tiết & Bốn mùa',
    en: 'Weather & Four Seasons',
    category: 'daily',
    tag: 'A2',
    icon: '🌤️',
    desc: 'Mô tả thời tiết yêu thích, sự thay đổi của khí hậu và các hoạt động theo mùa.',
  },

  // 2. Công việc & Học tập (work)
  {
    name: 'Công việc mơ ước',
    en: 'My Dream Career',
    category: 'work',
    tag: 'B1',
    icon: '💼',
    desc: 'Mô tả nghề nghiệp lý tưởng, môi trường làm việc và các kỹ năng cần thiết.',
  },
  {
    name: 'Làm việc từ xa hay văn phòng?',
    en: 'Remote vs Office Work',
    category: 'work',
    tag: 'B2',
    icon: '💻',
    desc: 'So sánh ưu nhược điểm giữa làm việc từ xa online và văn phòng truyền thống.',
  },

  // 3. Du lịch & Văn hóa (travel)
  {
    name: 'Chuyến du lịch đáng nhớ',
    en: 'A Memorable Journey',
    category: 'travel',
    tag: 'B1',
    icon: '✈️',
    desc: 'Kỷ niệm du lịch, khám phá danh lam thắng cảnh, con người và ẩm thực địa phương.',
  },
  {
    name: 'Khám phá văn hóa cà phê',
    en: 'Coffee Culture & Cafes',
    category: 'travel',
    tag: 'A2',
    icon: '☕',
    desc: 'Thói quen thưởng thức cà phê, không gian quán xá và phong cách sống hiện đại.',
  },

  // 4. Sở thích (hobbies)
  {
    name: 'Món ăn yêu thích',
    en: 'Favorite Food & Cooking',
    category: 'hobbies',
    tag: 'A2',
    icon: '🍜',
    desc: 'Mô tả hương vị món ăn khoái khẩu, nguyên liệu tươi ngon và cách chế biến.',
  },
  {
    name: 'Thói quen đọc sách',
    en: 'Reading & Books',
    category: 'hobbies',
    tag: 'B1',
    icon: '📚',
    desc: 'Lợi ích của việc đọc sách mỗi ngày, thể loại yêu thích và kỹ năng tự học.',
  },

  // 5. Công nghệ & Xã hội (tech)
  {
    name: 'Trí tuệ nhân tạo (AI)',
    en: 'AI in Daily Life',
    category: 'tech',
    tag: 'B2',
    icon: '🤖',
    desc: 'Những lợi ích và ứng dụng thực tế của AI trong công việc và đời sống hàng ngày.',
  },
  {
    name: 'Mạng xã hội trong đời sống',
    en: 'Social Media & Modern Life',
    category: 'tech',
    tag: 'B1',
    icon: '📱',
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

const VOICE_DETAILS = [
  { id: 'coral', name: 'Coral', tone: 'Trong trẻo, Dễ nghe', gender: 'Nữ', avatar: '👩', badge: 'Khuyên dùng' },
  { id: 'nova', name: 'Nova', tone: 'Trẻ trung, Năng động', gender: 'Nữ', avatar: '👩' },
  { id: 'alloy', name: 'Alloy', tone: 'Tự nhiên, Chuẩn phát âm', gender: 'Chuẩn', avatar: '🎙️' },
  { id: 'echo', name: 'Echo', tone: 'Ấm áp, Điềm tĩnh', gender: 'Nam', avatar: '👨' },
  { id: 'onyx', name: 'Onyx', tone: 'Trầm ấm, Chững chạc', gender: 'Nam', avatar: '👨' },
  { id: 'fable', name: 'Fable', tone: 'Biểu cảm, Kể chuyện', gender: 'Truyền cảm', avatar: '🎭' },
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
    <div className="listening-page" style={{ maxWidth: 1520, margin: '0 auto' }}>
      {/* Hidden Audio Player */}
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
      <div className="listening-header">
        <div>
          <h1>
            <Icon n="headphones" s={28} />
            <span>Luyện nghe Chép chính tả</span>
          </h1>
          <p className="sub" style={{ margin: '4px 0 0', fontSize: '14px' }}>
            Rèn luyện kỹ năng nghe hiểu tiếng Anh qua phương pháp Dictation & Chấm điểm từng từ.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <QuotaBadge featureKey="listening" labelSuffix="bài hôm nay" />
          {view !== 'select' && (
            <button
              type="button"
              className="btn sec"
              style={{ padding: '8px 16px', borderRadius: '12px', fontSize: '13.5px', fontWeight: 700 }}
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

      {err && (
        <div className="error" style={{ marginBottom: 16 }}>
          {err}
        </div>
      )}

      <AnimatePresence mode="wait">
      {/* VIEW 1: SELECT TOPIC & SETUP */}
      {view === 'select' && (
        <motion.div
          key="select"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.22 }}
        >
          {/* Category Filter & Level Selector */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
              marginBottom: 18,
            }}
          >
            {/* Category tabs */}
            <div className="chiprow" style={{ margin: 0 }}>
              {CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={'fchip' + (selectedCategory === c.id ? ' on' : '')}
                  onClick={() => setSelectedCategory(c.id)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '13.5px', padding: '7px 15px' }}
                >
                  <span>{c.icon}</span>
                  <span>{c.name}</span>
                </button>
              ))}
            </div>

            {/* Trình độ (Level) Chips */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: '#fff',
                padding: '5px 12px',
                borderRadius: 14,
                border: '1px solid var(--border, #e2e8f0)',
                boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
              }}
            >
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#64748b', marginRight: 4 }}>
                Trình độ:
              </span>
              {LEVELS.map((lvl) => (
                <button
                  key={lvl.id}
                  type="button"
                  className={'fchip' + (level === lvl.id ? ' on' : '')}
                  style={{
                    padding: '5px 13px',
                    fontSize: '12.5px',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                  title={`${lvl.name} (${lvl.desc})`}
                  onClick={() => setLevel(lvl.id)}
                >
                  {lvl.id}
                </button>
              ))}
            </div>
          </div>

          <div className="cols2" style={{ alignItems: 'start', gap: 22 }}>
            {/* Left Column: Topics Grid & Custom Topic */}
            <div className="colstack" style={{ flex: '1 1 63%' }}>
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
                          <span className="listening-topic-icon">{t.icon}</span>
                          {isSelected && (
                            <span
                              className="pill"
                              style={{
                                fontSize: '11.5px',
                                padding: '3px 9px',
                                fontWeight: 800,
                                background: '#dbeafe',
                                color: '#1e40af',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                              }}
                            >
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

              {/* Custom Topic Input */}
              <div
                style={{
                  marginTop: 18,
                  padding: '16px 20px',
                  borderRadius: 18,
                  background: '#ffffff',
                  border: isCustom ? '2px solid var(--primary, #1565C0)' : '1.5px solid var(--border, #e2e8f0)',
                  boxShadow: isCustom ? '0 6px 20px rgba(21, 101, 192, 0.12)' : '0 2px 8px rgba(15, 23, 42, 0.02)',
                  transition: 'all 0.22s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <label style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 16 }}>✏️</span> Hoặc tự nhập chủ đề theo ý bạn:
                  </label>
                  {isCustom && (
                    <span className="pill greensoft" style={{ fontSize: 11, padding: '2px 8px' }}>
                      Đang dùng chủ đề tự nhập
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <input
                    type="text"
                    value={customTopic}
                    onChange={(e) => {
                      setCustomTopic(e.target.value);
                      setIsCustom(true);
                    }}
                    onFocus={() => {
                      if (customTopic.trim()) setIsCustom(true);
                    }}
                    placeholder="Ví dụ: Lợi ích của việc đọc sách mỗi ngày, Trải nghiệm phỏng vấn đầu tiên..."
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      borderRadius: 12,
                      border: '1.5px solid #cbd5e1',
                      outline: 'none',
                      fontSize: 14,
                      background: '#fff',
                    }}
                  />
                  {isCustom && (
                    <button
                      type="button"
                      className="btn ghost sm"
                      onClick={() => {
                        setIsCustom(false);
                        setCustomTopic('');
                      }}
                      style={{ padding: '0 14px', fontSize: 13, borderRadius: 12 }}
                    >
                      Bỏ chọn
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Setup Summary, Dictation Guide, & History / Mascot Tip */}
            <div className="colstack" style={{ flex: '1 1 37%', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Card 1: Setup Summary & Start Button */}
              <MotionCard style={{ padding: 22, borderRadius: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                  <img
                    src={viAvatar}
                    alt="Vi AI"
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: '50%',
                      objectFit: 'cover',
                      boxShadow: '0 4px 12px rgba(21, 101, 192, 0.2)',
                    }}
                  />
                  <div>
                    <h3 style={{ margin: 0, fontSize: 17, fontWeight: 900, color: 'var(--ink)' }}>
                      Sẵn sàng luyện nghe!
                    </h3>
                    <p className="sub" style={{ margin: '3px 0 0', fontSize: 12.5 }}>
                      AI sẽ tạo đoạn văn độc quyền và đọc giọng chuẩn bản xứ cho bạn.
                    </p>
                  </div>
                </div>

                <div
                  style={{
                    background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                    borderRadius: 16,
                    padding: '16px',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                    marginBottom: 18,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13.5 }}>
                    <span style={{ color: '#64748b', fontWeight: 600 }}>Chủ đề:</span>
                    <b
                      style={{
                        color: 'var(--ink)',
                        textAlign: 'right',
                        maxWidth: '65%',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                      }}
                    >
                      <span>{isCustom ? '✏️' : activeTopicObj?.icon || '💡'}</span>
                      <span>{isCustom && customTopic ? customTopic : topic}</span>
                    </b>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13.5 }}>
                    <span style={{ color: '#64748b', fontWeight: 600 }}>Trình độ:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className="pill" style={{ fontSize: '12px', fontWeight: 800 }}>
                        Cấp {level}
                      </span>
                      <span style={{ fontSize: 12, color: '#64748b' }}>
                        ({selectedLevelObj?.desc || 'Chuẩn CEFR'})
                      </span>
                    </div>
                  </div>

                  {/* Custom Modern Voice Selector */}
                  <div className="custom-voice-select-wrap" ref={voiceDropdownRef} style={{ marginTop: 2 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ color: '#64748b', fontWeight: 600, fontSize: 13 }}>Giọng đọc bản xứ:</span>
                      <span className="pill" style={{ fontSize: 11, padding: '2px 8px', background: '#eff6ff', color: '#1d4ed8', fontWeight: 800 }}>
                        {selectedVoiceDetail.gender} · {selectedVoiceDetail.tone}
                      </span>
                    </div>

                    <button
                      type="button"
                      className={'custom-voice-trigger' + (isVoiceOpen ? ' active' : '')}
                      onClick={() => setIsVoiceOpen(!isVoiceOpen)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span className="voice-avatar-badge">{selectedVoiceDetail.avatar}</span>
                        <div style={{ textAlign: 'left' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <b style={{ fontSize: 13.5, color: 'var(--ink)' }}>{selectedVoiceDetail.name}</b>
                            {selectedVoiceDetail.badge && (
                              <span className="voice-recommend-badge">{selectedVoiceDetail.badge}</span>
                            )}
                          </div>
                          <span style={{ fontSize: 11.5, color: '#64748b' }}>{selectedVoiceDetail.tone}</span>
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
                                <span className="voice-avatar-badge">{v.avatar}</span>
                                <div style={{ flex: 1, textAlign: 'left' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <b style={{ fontSize: 13, color: isCurrent ? 'var(--primary)' : 'var(--ink)' }}>
                                      {v.name}
                                    </b>
                                    <span className="voice-gender-tag">{v.gender}</span>
                                    {v.badge && <span className="voice-recommend-badge">{v.badge}</span>}
                                  </div>
                                  <div style={{ fontSize: 11.5, color: '#64748b' }}>{v.tone}</div>
                                </div>
                                {isCurrent && <Icon n="check" s={16} style={{ color: 'var(--primary)' }} />}
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
                  className="btn primary"
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: 14,
                    fontSize: 15.5,
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                    boxShadow: '0 8px 24px rgba(21, 101, 192, 0.28)',
                  }}
                  onClick={handleCreateExercise}
                >
                  {loading ? (
                    <>
                      <Icon n="loader" s={20} className="spin" />
                      <span>Đang tạo bài nghe bằng AI...</span>
                    </>
                  ) : (
                    <>
                      <Icon n="headphones" s={20} />
                      <span>Bắt đầu Tạo bài nghe</span>
                    </>
                  )}
                </button>
              </MotionCard>

              {/* Card 2: Dictation Method Guide */}
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid var(--border, #e2e8f0)',
                  borderRadius: 20,
                  padding: '18px 20px',
                  boxShadow: '0 2px 10px rgba(15, 23, 42, 0.03)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <span style={{ fontSize: 18 }}>💡</span>
                  <b style={{ fontSize: 14.5, color: 'var(--ink)' }}>Phương pháp Dictation 3 bước</b>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <span
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        background: '#eff6ff',
                        color: '#1d4ed8',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 11,
                        fontWeight: 800,
                        flexShrink: 0,
                      }}
                    >
                      1
                    </span>
                    <div>
                      <b style={{ color: '#1e293b' }}>Nghe tổng thể:</b>
                      <span style={{ color: '#64748b' }}> Nghe lướt 1 lần để nắm ý chính, chủ đề và ngữ cảnh đoạn văn.</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <span
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        background: '#eff6ff',
                        color: '#1d4ed8',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 11,
                        fontWeight: 800,
                        flexShrink: 0,
                      }}
                    >
                      2
                    </span>
                    <div>
                      <b style={{ color: '#1e293b' }}>Chép chính tả:</b>
                      <span style={{ color: '#64748b' }}> Vừa nghe vừa gõ lại; có thể tua lùi -5s hoặc chỉnh tốc độ 0.75x.</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <span
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        background: '#eff6ff',
                        color: '#1d4ed8',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 11,
                        fontWeight: 800,
                        flexShrink: 0,
                      }}
                    >
                      3
                    </span>
                    <div>
                      <b style={{ color: '#1e293b' }}>Đối chiếu &amp; Sửa sai:</b>
                      <span style={{ color: '#64748b' }}> Nộp bài để AI so từ từng chữ, nhận diện các từ nối âm hoặc nuốt âm.</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 3: Recent History OR Mascot Coach Tip */}
              {historyList.length > 0 ? (
                <div className="listening-history-card">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <h4 style={{ margin: 0, fontSize: 14.5, fontWeight: 800, color: 'var(--ink)' }}>
                      🕒 Bài đã làm gần đây
                    </h4>
                    <span style={{ fontSize: 12, color: '#64748b' }}>{historyList.length} bài</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {historyList.slice(0, 4).map((item) => (
                      <div
                        key={item.id}
                        className="history-item-row"
                        onClick={() => handleReviewHistoryItem(item)}
                      >
                        <div style={{ overflow: 'hidden', flex: 1, minWidth: 0, marginRight: 8 }}>
                          <b
                            style={{
                              fontSize: 13,
                              color: 'var(--ink)',
                              display: 'block',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                            }}
                          >
                            {item.topic}
                          </b>
                          <span style={{ fontSize: 11.5, color: '#64748b' }}>
                            Cấp {item.level} · {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                          </span>
                        </div>
                        {item.score !== null && item.score !== undefined && (
                          <span
                            className="pill"
                            style={{
                              fontSize: 11.5,
                              fontWeight: 800,
                              padding: '3px 8px',
                              borderRadius: 8,
                              background: item.score >= 80 ? '#dcfce7' : item.score >= 50 ? '#fef3c7' : '#fee2e2',
                              color: item.score >= 80 ? '#15803d' : item.score >= 50 ? '#b45309' : '#b91c1c',
                              flexShrink: 0,
                            }}
                          >
                            {item.score}/100
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
                    borderRadius: 20,
                    border: '1px solid #bbf7d0',
                    padding: '18px 20px',
                    display: 'flex',
                    gap: 14,
                    alignItems: 'center',
                  }}
                >
                  <img
                    src={viAvatar}
                    alt="Vi"
                    style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                  />
                  <div style={{ fontSize: 12.8, color: '#166534', lineHeight: 1.5 }}>
                    <b>Vi mách nhỏ:</b> Đừng ngại nếu lần đầu chưa nghe kịp hết! Bạn có thể nghe đi nghe lại thoải mái và giảm tốc độ để luyện phản xạ tai tốt hơn nhé.
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
        >
          {/* Exercise Info & Audio Player */}
          <div className="listening-player-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <span className="pill" style={{ fontSize: 12, fontWeight: 800, marginRight: 8 }}>
                  Cấp {currentExercise.level}
                </span>
                <b style={{ fontSize: 18, color: 'var(--ink)' }}>{currentExercise.topic}</b>
              </div>
              <div style={{ fontSize: 13, color: '#64748b' }}>
                Giọng: <b>{selectedVoiceObj.name}</b>
              </div>
            </div>

            {/* Custom Modern Audio Controls */}
            <div className="listening-audio-controls">
              {/* Play/Pause Button */}
              <button
                type="button"
                className="audio-btn-circle"
                onClick={togglePlay}
                title={isPlaying ? 'Tạm dừng' : 'Phát âm thanh'}
              >
                {isPlaying ? <span style={{ fontSize: 20 }}>⏸</span> : <span style={{ fontSize: 22, marginLeft: 3 }}>▶</span>}
              </button>

              {/* Seek -5s and +5s */}
              <button
                type="button"
                className="audio-btn-sec"
                onClick={() => seekRelative(-5)}
                title="Lùi lại 5 giây"
              >
                ⏪ -5s
              </button>
              <button
                type="button"
                className="audio-btn-sec"
                onClick={() => seekRelative(5)}
                title="Tua tới 5 giây"
              >
                ⏩ +5s
              </button>

              {/* Progress Bar & Current Time */}
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
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b', fontWeight: 600 }}>
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Speed Toggles */}
              <div style={{ display: 'flex', gap: 6 }}>
                {[0.75, 1.0].map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    className={'audio-btn-sec' + (playbackRate === rate ? ' active' : '')}
                    style={{
                      background: playbackRate === rate ? 'var(--primary)' : '#fff',
                      color: playbackRate === rate ? '#fff' : '#334155',
                      borderColor: playbackRate === rate ? 'var(--primary)' : '#cbd5e1',
                    }}
                    onClick={() => changeRate(rate)}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Typing Area */}
          <div className="listening-player-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <label style={{ fontSize: 15, fontWeight: 800, color: 'var(--ink)' }}>
                ✍️ Gõ lại những gì bạn nghe được:
              </label>
              <span style={{ fontSize: 13, color: '#64748b' }}>
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

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, flexWrap: 'wrap', gap: 12 }}>
              <div style={{ fontSize: 13, color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>💡</span>
                <span>Mẹo: Bạn có thể nghe lại bao nhiêu lần tùy thích trước khi nộp bài.</span>
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  type="button"
                  className="btn sec"
                  onClick={() => {
                    if (audioRef.current) audioRef.current.pause();
                    setView('select');
                  }}
                  style={{ padding: '12px 20px', borderRadius: 12, fontWeight: 700 }}
                >
                  Làm bài khác
                </button>

                <button
                  type="button"
                  className="btn primary"
                  disabled={submitting || !typedText.trim()}
                  onClick={handleSubmit}
                  style={{
                    padding: '12px 28px',
                    borderRadius: 12,
                    fontSize: 15,
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  {submitting ? (
                    <>
                      <Icon n="loader" s={18} className="spin" />
                      <span>Đang chấm điểm...</span>
                    </>
                  ) : (
                    <>
                      <Icon n="check" s={18} />
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
        >
          {/* Result Score Card */}
          <div className="result-card">
            <div className="score-hero">
              {/* Score circle */}
              <div
                className={
                  'score-circle ' +
                  (submitResult.score >= 85
                    ? 'excellent'
                    : submitResult.score >= 70
                    ? 'good'
                    : submitResult.score >= 50
                    ? 'fair'
                    : 'poor')
                }
              >
                <span style={{ fontSize: 32, lineHeight: 1 }}>{submitResult.score}</span>
                <span style={{ fontSize: 12, opacity: 0.9 }}>/ 100</span>
              </div>

              {/* Title & Feedback */}
              <div style={{ flex: 1 }}>
                <h2 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 800, color: 'var(--ink)' }}>
                  {submitResult.score >= 85
                    ? '🎉 Xuất sắc! Khả năng nghe của bạn rất ấn tượng!'
                    : submitResult.score >= 70
                    ? '👍 Rất tốt! Bạn đã nắm bắt hầu hết đoạn văn.'
                    : submitResult.score >= 50
                    ? '💪 Khá ổn! Tiếp tục luyện tập để quen tai hơn nhé.'
                    : '🌱 Cần cố gắng thêm! Hãy nghe lại và đối chiếu từng từ bên dưới.'}
                </h2>
                <p className="sub" style={{ margin: 0, fontSize: 14 }}>
                  Chủ đề: <b>{currentExercise?.topic}</b> · Trình độ: <b>Cấp {currentExercise?.level}</b>
                </p>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  className="btn sec"
                  onClick={() => {
                    if (audioRef.current) {
                      audioRef.current.currentTime = 0;
                      audioRef.current.play().catch(() => {});
                    }
                  }}
                  style={{ padding: '10px 16px', borderRadius: 12, fontWeight: 700, fontSize: 13.5 }}
                >
                  🔊 Nghe lại
                </button>

                <button
                  type="button"
                  className="btn primary"
                  onClick={() => {
                    if (audioRef.current) audioRef.current.pause();
                    setView('select');
                  }}
                  style={{ padding: '10px 20px', borderRadius: 12, fontWeight: 800, fontSize: 13.5 }}
                >
                  Luyện bài tiếp theo →
                </button>
              </div>
            </div>

            {/* Quick Statistics Bar */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: 12,
                marginTop: 20,
              }}
            >
              <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 12, color: '#64748b' }}>Tổng số từ</div>
                <b style={{ fontSize: 20, color: '#1e293b' }}>{submitResult.totalWords}</b>
              </div>

              <div style={{ background: '#f0fdf4', padding: '12px 16px', borderRadius: 12, border: '1px solid #bbf7d0' }}>
                <div style={{ fontSize: 12, color: '#166534' }}>Từ đúng hoàn toàn</div>
                <b style={{ fontSize: 20, color: '#15803d' }}>{submitResult.correctWords}</b>
              </div>

              <div style={{ background: '#fefce8', padding: '12px 16px', borderRadius: 12, border: '1px solid #fef08a' }}>
                <div style={{ fontSize: 12, color: '#854d0e' }}>Gần đúng (sai nhẹ)</div>
                <b style={{ fontSize: 20, color: '#b45309' }}>{submitResult.nearMissWords}</b>
              </div>

              <div style={{ background: '#fef2f2', padding: '12px 16px', borderRadius: 12, border: '1px solid #fecaca' }}>
                <div style={{ fontSize: 12, color: '#991b1b' }}>Từ thiếu hoặc sai</div>
                <b style={{ fontSize: 20, color: '#dc2626' }}>
                  {Math.max(0, submitResult.totalWords - submitResult.correctWords - submitResult.nearMissWords)}
                </b>
              </div>
            </div>

            {/* Word-by-Word Diff Visualizer */}
            <div style={{ marginTop: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--ink)' }}>
                  🔍 Chi tiết đối chiếu từng từ:
                </h3>
                {/* Legend */}
                <div style={{ display: 'flex', gap: 10, fontSize: 12, flexWrap: 'wrap' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981' }} /> Đúng
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b' }} /> Sai nhẹ (Near-miss)
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }} /> Từ sai
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#94a3b8' }} /> Bỏ sót
                  </span>
                </div>
              </div>

              {/* Aligned tokens */}
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

            {/* Revealed Original Transcript */}
            {submitResult.transcript && (
              <div className="transcript-box">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <b style={{ fontSize: 14, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    📖 Văn bản đầy đủ đoạn nghe:
                  </b>
                  <button
                    type="button"
                    onClick={() => {
                      if (audioRef.current) {
                        audioRef.current.currentTime = 0;
                        audioRef.current.play().catch(() => {});
                      }
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#166534',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontSize: 13,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    🔊 Nghe lại đoạn này
                  </button>
                </div>
                <p style={{ margin: 0, fontStyle: 'normal' }}>
                  {submitResult.transcript}
                </p>
              </div>
            )}
          </div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
}
