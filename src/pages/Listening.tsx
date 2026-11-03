import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
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
  {
    name: 'Giới thiệu bản thân',
    en: 'Introduce Yourself',
    category: 'daily',
    tag: 'A2',
    desc: 'Nghe đoạn giới thiệu tên tuổi, nghề nghiệp, nơi sống và sở thích.',
  },
  {
    name: 'Kể về cuối tuần vừa qua',
    en: 'My Last Weekend',
    category: 'daily',
    tag: 'A2',
    desc: 'Lắng nghe các hoạt động thư giãn, giải trí và sinh hoạt cuối tuần.',
  },
  {
    name: 'Thói quen một ngày của bạn',
    en: 'My Daily Routine',
    category: 'daily',
    tag: 'A2',
    desc: 'Lịch trình từ sáng thức dậy, bữa ăn đến giờ làm việc và nghỉ ngơi.',
  },
  {
    name: 'Công việc mơ ước',
    en: 'My Dream Career',
    category: 'work',
    tag: 'B1',
    desc: 'Mô tả nghề nghiệp lý tưởng, môi trường làm việc và các kỹ năng cần thiết.',
  },
  {
    name: 'Làm việc từ xa hay văn phòng?',
    en: 'Remote vs Office Work',
    category: 'work',
    tag: 'B2',
    desc: 'So sánh ưu nhược điểm giữa làm việc từ xa và văn phòng truyền thống.',
  },
  {
    name: 'Chuyến du lịch đáng nhớ',
    en: 'A Memorable Journey',
    category: 'travel',
    tag: 'B1',
    desc: 'Kỷ niệm du lịch, khám phá danh lam thắng cảnh và ẩm thực địa phương.',
  },
  {
    name: 'Món ăn yêu thích',
    en: 'Favorite Food & Cooking',
    category: 'hobbies',
    tag: 'A2',
    desc: 'Mô tả hương vị món ăn yêu thích, nguyên liệu và cách chế biến.',
  },
  {
    name: 'Trí tuệ nhân tạo (AI)',
    en: 'AI in Daily Life',
    category: 'tech',
    tag: 'B2',
    desc: 'Những lợi ích và ứng dụng thực tế của AI trong công việc và đời sống.',
  },
];

const LEVELS = [
  { id: 'A1', name: 'A1 - Căn bản (25-35 từ)' },
  { id: 'A2', name: 'A2 - Sơ cấp (40-55 từ)' },
  { id: 'B1', name: 'B1 - Trung cấp (60-80 từ)' },
  { id: 'B2', name: 'B2 - Khá (85-110 từ)' },
  { id: 'C1', name: 'C1 - Nâng cao (115-140 từ)' },
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

  const selectedVoiceObj = VOICES.find((v) => v.id === voice) || VOICES[0];

  return (
    <div className="listening-page">
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

      {/* VIEW 1: SELECT TOPIC & SETUP */}
      {view === 'select' && (
        <>
          {/* Category Filter & Level Selector */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
              marginBottom: 16,
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
                >
                  {c.name}
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
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#64748b', marginRight: 2 }}>
                Trình độ:
              </span>
              {LEVELS.map((lvl) => (
                <button
                  key={lvl.id}
                  type="button"
                  className={'fchip' + (level === lvl.id ? ' on' : '')}
                  style={{
                    padding: '4px 12px',
                    fontSize: '12.5px',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                  title={lvl.name}
                  onClick={() => setLevel(lvl.id)}
                >
                  {lvl.id}
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
                style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}
              >
                {filteredTopics.map((t) => {
                  const isSelected = !isCustom && topic === t.name;
                  return (
                    <motion.div key={t.name} variants={staggerItem}>
                      <button
                        type="button"
                        className={'topic' + (isSelected ? ' on' : '')}
                        style={{ height: '100%' }}
                        onClick={() => {
                          setTopic(t.name);
                          setIsCustom(false);
                        }}
                      >
                        <b style={{ fontSize: 15, display: 'block', color: 'var(--ink)' }}>{t.name}</b>
                        <div className="sub mt8" style={{ fontSize: 12.5 }}>{t.en}</div>
                        <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#64748b', lineHeight: 1.4 }}>
                          {t.desc}
                        </p>
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
                    type="text"
                    value={customTopic}
                    onChange={(e) => {
                      setCustomTopic(e.target.value);
                      setIsCustom(true);
                    }}
                    onFocus={() => setIsCustom(true)}
                    placeholder="Ví dụ: Lợi ích của việc đọc sách mỗi ngày..."
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      borderRadius: 10,
                      border: isCustom ? '2px solid var(--primary)' : '1px solid #cbd5e1',
                      outline: 'none',
                      fontSize: 14,
                    }}
                  />
                  {isCustom && (
                    <button
                      type="button"
                      className="btn sec"
                      style={{ padding: '0 14px', fontSize: 13 }}
                      onClick={() => {
                        setIsCustom(false);
                        setCustomTopic('');
                      }}
                    >
                      Bỏ chọn
                    </button>
                  )}
                </div>
              </MotionCard>
            </div>

            {/* Right Column: Setup Summary & Start Button */}
            <div className="colstack">
              <MotionCard style={{ padding: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
                  <img src={viAvatar} alt="Vi AI" style={{ width: 56, height: 56, borderRadius: '50%' }} />
                  <div>
                    <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>Sẵn sàng luyện nghe!</h3>
                    <p className="sub" style={{ margin: '4px 0 0', fontSize: 13 }}>
                      AI sẽ tạo đoạn văn độc quyền và đọc giọng chuẩn bản xứ cho bạn.
                    </p>
                  </div>
                </div>

                <div
                  style={{
                    background: '#f8fafc',
                    borderRadius: 14,
                    padding: '14px 16px',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                    marginBottom: 20,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5 }}>
                    <span style={{ color: '#64748b' }}>Chủ đề:</span>
                    <b style={{ color: 'var(--ink)', textAlign: 'right', maxWidth: '60%' }}>
                      {isCustom && customTopic ? customTopic : topic}
                    </b>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5 }}>
                    <span style={{ color: '#64748b' }}>Trình độ:</span>
                    <span className="pill" style={{ fontSize: '12px', fontWeight: 800 }}>
                      Cấp {level}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13.5 }}>
                    <span style={{ color: '#64748b' }}>Giọng đọc:</span>
                    <select
                      value={voice}
                      onChange={(e) => {
                        setVoice(e.target.value);
                        localStorage.setItem('vocab_ai_voice', e.target.value);
                      }}
                      style={{
                        padding: '5px 10px',
                        borderRadius: 8,
                        border: '1px solid #cbd5e1',
                        fontSize: 13,
                        fontWeight: 600,
                        outline: 'none',
                        background: '#fff',
                      }}
                    >
                      {VOICES.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name}
                        </option>
                      ))}
                    </select>
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
                    fontSize: 16,
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
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

              {/* History list preview */}
              {historyList.length > 0 && (
                <div className="listening-history-card mt16">
                  <h4 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 800, color: 'var(--ink)' }}>
                    🕒 Bài đã làm gần đây
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {historyList.slice(0, 5).map((item) => (
                      <div
                        key={item.id}
                        className="history-item-row"
                        onClick={() => handleReviewHistoryItem(item)}
                      >
                        <div style={{ overflow: 'hidden' }}>
                          <b style={{ fontSize: 13.5, color: 'var(--ink)', display: 'block', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                            {item.topic}
                          </b>
                          <span style={{ fontSize: 12, color: '#64748b' }}>
                            Cấp {item.level} · {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                          </span>
                        </div>
                        {item.score !== null && item.score !== undefined && (
                          <span
                            className="pill"
                            style={{
                              fontSize: 12,
                              fontWeight: 800,
                              background: item.score >= 80 ? '#dcfce7' : item.score >= 50 ? '#fef3c7' : '#fee2e2',
                              color: item.score >= 80 ? '#15803d' : item.score >= 50 ? '#b45309' : '#b91c1c',
                            }}
                          >
                            {item.score}/100
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* VIEW 2: PRACTICE / DICTATION PLAYER */}
      {view === 'practice' && currentExercise && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
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
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
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
    </div>
  );
}
