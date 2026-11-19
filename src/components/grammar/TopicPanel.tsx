import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { wordApi, aiApi, TOPIC_MAP, type Word, type GrammarResp } from '../../api';
import { MotionCard } from '../../motion';
import { Icon } from '../icons';
import ResultPanel, { type OutlineReport } from './ResultPanel';
import { UiIcon } from '../UiIcon';

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'] as const;
type Level = typeof LEVELS[number];

const LEVEL_CONFIG: Record<Level, { label: string; desc: string; color: string; bg: string; border: string }> = {
  A1: { label: 'A1', desc: 'Cơ bản', color: '#34482e', bg: 'rgba(71, 96, 63, 0.12)', border: 'rgba(71, 96, 63, 0.28)' },
  A2: { label: 'A2', desc: 'Sơ cấp', color: '#42774d', bg: 'rgba(66, 119, 77, 0.12)', border: 'rgba(66, 119, 77, 0.28)' },
  B1: { label: 'B1', desc: 'Trung cấp', color: '#47603f', bg: 'rgba(71, 96, 63, 0.18)', border: 'rgba(71, 96, 63, 0.34)' },
  B2: { label: 'B2', desc: 'Trung cao', color: '#8f5a14', bg: 'rgba(201, 134, 47, 0.14)', border: 'rgba(201, 134, 47, 0.35)' },
  C1: { label: 'C1', desc: 'Nâng cao', color: '#9a4b43', bg: 'rgba(154, 75, 67, 0.12)', border: 'rgba(154, 75, 67, 0.30)' },
};

const TOPIC_ICONS: Record<string, string> = {
  WORK: 'briefcase',
  TRAVEL: 'plane',
  ACADEMIC: 'graduation',
  TECHNOLOGY: 'laptop',
  HEALTH: 'health',
  FOOD: 'food',
  MONEY: 'coins',
  FAMILY: 'users',
  SPORTS: 'sport',
  ENVIRONMENT: 'sprout',
  SOCIETY: 'landmark',
  ARTS: 'palette',
};

const STRUCTURES_BY_LEVEL: Record<Level, Array<{ name: string; template: string; note: string }>> = {
  A1: [
    { name: 'There is / There are', template: 'There is a [noun] in my...', note: 'Chỉ sự tồn tại' },
    { name: 'Subject + like/love + V-ing', template: 'I really like [verb]-ing when...', note: 'Bày tỏ sở thích' },
    { name: 'Subject + can/cannot + V-inf', template: 'We can [verb] easily because...', note: 'Khả năng' },
  ],
  A2: [
    { name: 'Past Simple (Quá khứ đơn)', template: 'Yesterday, I [verb-ed/V2] with my friends...', note: 'Kể sự việc trong quá khứ' },
    { name: 'Comparative (So sánh hơn)', template: 'This [noun] is more [adj] than...', note: 'So sánh tính chất' },
    { name: 'Future with "going to"', template: 'I am going to [verb] this weekend...', note: 'Kế hoạch tương lai' },
  ],
  B1: [
    { name: 'Present Perfect (Hiện tại hoàn thành)', template: 'I have already [verb-ed/V3] for several times...', note: 'Kinh nghiệm hoặc kết quả' },
    { name: 'First Conditional (Điều kiện loại 1)', template: 'If you [present simple], you will [verb]...', note: 'Tình huống có thể xảy ra' },
    { name: 'Relative Clause (Mệnh đề quan hệ)', template: 'The [noun] which I chose helped me to...', note: 'Bổ nghĩa với who/which/that' },
  ],
  B2: [
    { name: 'Second Conditional (Điều kiện loại 2)', template: 'If I were in that situation, I would [verb]...', note: 'Giả định trái với hiện tại' },
    { name: 'Passive Voice (Câu bị động)', template: 'These [nouns] are widely considered to be...', note: 'Nhấn mạnh đối tượng tác động' },
    { name: 'Contrast (Mệnh đề tương phản)', template: 'Although [clause], we still managed to...', note: 'Liên kết ý tương phản' },
  ],
  C1: [
    { name: 'Inversion (Đảo ngữ nhấn mạnh)', template: 'Not only did we [verb], but we also [verb-ed]...', note: 'Đảo ngữ nâng cao' },
    { name: 'Mixed / Third Conditional', template: 'Had we [verb-ed/V3], the outcome would have been...', note: 'Giả định quá khứ sắc bén' },
    { name: 'Participle Clause (Phân từ rút gọn)', template: 'Having [verb-ed/V3], they proceeded to...', note: 'Rút gọn câu chuyên nghiệp' },
  ],
};

const TOPIC_SAMPLE_IDEAS: Record<string, string> = {
  WORK: 'I usually collaborate with my colleagues to complete challenging projects on time.',
  TRAVEL: 'Last summer, I embarked on a memorable journey and explored breathtaking landscapes.',
  ACADEMIC: 'Regular revision and active learning strategies significantly enhance memory retention.',
  TECHNOLOGY: 'Artificial intelligence is revolutionizing modern education and workplace efficiency.',
  HEALTH: 'Maintaining a balanced diet and regular exercise routine is essential for physical wellbeing.',
  FOOD: 'Vietnamese traditional cuisine features a delicate harmony of fresh herbs and savory flavors.',
  MONEY: 'Effective budget management helps individuals avoid financial stress and build savings.',
  FAMILY: 'Family gatherings during traditional festivals provide precious moments of connection.',
  SPORTS: 'Participating in team sports promotes mutual support, discipline, and physical fitness.',
  ENVIRONMENT: 'Reducing single-use plastics is a vital step toward protecting marine ecosystems.',
  SOCIETY: 'Community volunteers contribute significantly to supporting underprivileged families.',
  ARTS: 'Appreciating contemporary art inspires creativity and critical thinking among students.',
};

function checkWordUsed(text: string, word: string): boolean {
  if (!text || !word) return false;
  const cleanWord = word.trim().toLowerCase();
  if (!cleanWord) return false;
  if (cleanWord.includes(' ')) {
    const escaped = cleanWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`\\b${escaped}\\b`, 'i').test(text);
  }
  let base = cleanWord;
  if (base.endsWith('e')) {
    base = base.slice(0, -1);
  }
  const pattern = `\\b${base}(|s|es|d|ed|ing|y|ies|ied)\\b`;
  try {
    return new RegExp(pattern, 'i').test(text);
  } catch {
    return text.toLowerCase().includes(cleanWord);
  }
}

export default function TopicPanel() {
  const [level, setLevel] = useState<Level>('A1');
  const [topicList, setTopicList] = useState<Array<{ topic: string; count: number }>>([]);
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [loadingTopics, setLoadingTopics] = useState(false);

  const [wordPool, setWordPool] = useState<Word[]>([]);
  const [suggestedWords, setSuggestedWords] = useState<Word[]>([]);
  const [loadingWords, setLoadingWords] = useState(false);

  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showIdea, setShowIdea] = useState(false);
  const [playingWordId, setPlayingWordId] = useState<number | string | null>(null);

  const [result, setResult] = useState<(GrammarResp & { outlineReport?: OutlineReport }) | null>(null);

  // 1. Tải danh sách chủ đề theo Level
  useEffect(() => {
    let active = true;
    setLoadingTopics(true);
    wordApi
      .topicCounts(level)
      .then((res) => {
        if (!active) return;
        const list = Array.isArray(res.data) ? res.data : [];
        setTopicList(list);
        if (list.length > 0) {
          const exists = list.some((t) => t.topic.toLowerCase() === selectedTopic.toLowerCase());
          if (!exists) {
            setSelectedTopic(list[0].topic);
          }
        } else {
          setSelectedTopic('');
        }
      })
      .catch(() => {
        if (!active) return;
        setTopicList([]);
        setSelectedTopic('');
      })
      .finally(() => {
        if (active) setLoadingTopics(false);
      });

    return () => {
      active = false;
    };
  }, [level]);

  // 2. Tải từ vựng khi đổi Level hoặc Chủ đề
  useEffect(() => {
    if (!selectedTopic) {
      setWordPool([]);
      setSuggestedWords([]);
      return;
    }

    let active = true;
    setLoadingWords(true);
    wordApi
      .list({ level, topic: selectedTopic, size: 50 })
      .then((res) => {
        if (!active) return;
        const content = res.data?.content || [];
        setWordPool(content);
        pickRandomWords(content);
      })
      .catch(() => {
        if (!active) return;
        setWordPool([]);
        setSuggestedWords([]);
      })
      .finally(() => {
        if (active) setLoadingWords(false);
      });

    return () => {
      active = false;
    };
  }, [level, selectedTopic]);

  const pickRandomWords = useCallback((pool: Word[]) => {
    if (!pool || pool.length === 0) {
      setSuggestedWords([]);
      return;
    }
    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    setSuggestedWords(shuffled.slice(0, 5));
  }, []);

  const handleShuffleWords = () => {
    if (wordPool.length > 5) {
      pickRandomWords(wordPool);
    } else if (selectedTopic) {
      setLoadingWords(true);
      wordApi
        .list({ level, topic: selectedTopic, size: 50 })
        .then((res) => {
          const content = res.data?.content || [];
          setWordPool(content);
          pickRandomWords(content);
        })
        .finally(() => setLoadingWords(false));
    }
  };

  const handleRandomTopic = () => {
    if (topicList.length <= 1) return;
    const candidates = topicList.filter((t) => t.topic.toLowerCase() !== selectedTopic.toLowerCase());
    if (candidates.length > 0) {
      const random = candidates[Math.floor(Math.random() * candidates.length)];
      setSelectedTopic(random.topic);
      setText('');
      setResult(null);
    }
  };

  const structures = useMemo(() => STRUCTURES_BY_LEVEL[level] || [], [level]);

  // Kiểm tra trạng thái sử dụng từ theo thời gian thực
  const usedWordsStatus = useMemo(() => {
    return suggestedWords.map((w) => ({
      ...w,
      isUsed: checkWordUsed(text, w.word),
    }));
  }, [text, suggestedWords]);

  const usedCount = useMemo(() => {
    return usedWordsStatus.filter((w) => w.isUsed).length;
  }, [usedWordsStatus]);

  const progressPercent = useMemo(() => {
    if (suggestedWords.length === 0) return 0;
    return Math.round((usedCount / suggestedWords.length) * 100);
  }, [usedCount, suggestedWords.length]);

  const wordCount = useMemo(() => {
    const trimmed = text.trim();
    return trimmed ? trimmed.split(/\s+/).length : 0;
  }, [text]);

  const sentenceCount = useMemo(() => {
    const trimmed = text.trim();
    if (!trimmed) return 0;
    const matches = trimmed.match(/[^.!?]+[.!?]+(\s|$)/g);
    return matches ? matches.length : 1;
  }, [text]);

  // Chèn từ hoặc mẫu câu vào textarea
  const insertSnippet = (snippet: string) => {
    setText((prev) => {
      const separator = prev && !prev.endsWith(' ') ? ' ' : '';
      return prev + separator + snippet;
    });
  };

  // Phát âm từ vựng
  const playWordAudio = (word: Word, e: React.MouseEvent) => {
    e.stopPropagation();
    const textToSpeak = word.word || '';
    if (!textToSpeak) return;

    setPlayingWordId(word.id);
    if (word.audioUrl) {
      const audio = new Audio(word.audioUrl);
      audio.onended = () => setPlayingWordId(null);
      audio.onerror = () => setPlayingWordId(null);
      audio.play().catch(() => setPlayingWordId(null));
    } else if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(textToSpeak);
      u.lang = 'en-US';
      u.rate = 0.95;
      u.onend = () => setPlayingWordId(null);
      u.onerror = () => setPlayingWordId(null);
      window.speechSynthesis.speak(u);
    } else {
      setPlayingWordId(null);
    }
  };

  const handleCheck = async () => {
    if (!text.trim()) {
      setErrorMsg('Vui lòng nhập bài viết của bạn trước khi kiểm tra.');
      return;
    }
    setErrorMsg('');
    setBusy(true);
    try {
      const res = await aiApi.topicGrammar({
        text,
        topic: selectedTopic,
        level,
        suggestedWords: suggestedWords.map((w) => w.word),
        structures: structures.map((s) => `${s.name}: ${s.template}`),
      });
      setResult(res.data);
    } catch (err: any) {
      console.error('Error checking topic grammar:', err);
      const msg = err.response?.data?.message || 'Không thể kiểm tra ngữ pháp lúc này. Vui lòng thử lại sau.';
      setErrorMsg(msg);
    } finally {
      setBusy(false);
    }
  };

  const getTopicLabel = (topicKey: string) => {
    const upper = topicKey.toUpperCase();
    return TOPIC_MAP[upper] || topicKey;
  };

  const currentTopicIcon = TOPIC_ICONS[selectedTopic?.toUpperCase()] || 'file';
  const sampleIdeaText = TOPIC_SAMPLE_IDEAS[selectedTopic?.toUpperCase()] || '';

  return (
    <div className="colstack" style={{ gap: 20 }}>
      {/* 1. Thanh điều khiển: Trình độ CEFR & Lựa chọn Chủ đề */}
      <MotionCard
        className="card"
        style={{
          background: 'var(--glass-strong)',
          border: '1px solid var(--rim)',
          boxShadow: 'var(--shadow-sm)',
          padding: '16px 20px',
          flex: 'none',
          flexShrink: 0,
          marginBottom: 14,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
            {/* 1.1 Khối chọn CEFR Level */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink)', textTransform: 'uppercase', letterSpacing: 0.6 }}>
                  1. Trình độ CEFR:
                </span>
                <span className="sub" style={{ fontSize: 12 }}>
                  ({LEVEL_CONFIG[level].desc})
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {LEVELS.map((lvl) => {
                  const cfg = LEVEL_CONFIG[lvl];
                  const isSelected = level === lvl;
                  return (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => {
                        setLevel(lvl);
                        setResult(null);
                      }}
                      style={{
                        padding: '6px 16px',
                        borderRadius: 10,
                        fontWeight: 800,
                        fontSize: 13.5,
                        cursor: 'pointer',
                        transition: 'transform var(--dur-micro) var(--ease), background-color var(--dur-micro) var(--ease), border-color var(--dur-micro) var(--ease)',
                        border: isSelected ? `2px solid ${cfg.color}` : '1.5px solid var(--line)',
                        background: isSelected ? cfg.bg : 'rgba(255, 255, 255, 0.72)',
                        color: isSelected ? cfg.color : 'var(--muted)',
                        boxShadow: isSelected ? `0 2px 8px ${cfg.color}25` : 'none',
                        transform: isSelected ? 'scale(1.04)' : 'none',
                      }}
                    >
                      {lvl}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 1.2 Khối chọn Chủ đề */}
            <div style={{ flex: 1, minWidth: 280 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink)', textTransform: 'uppercase', letterSpacing: 0.6 }}>
                  2. Chủ đề luyện viết:
                </span>
                {topicList.length > 1 && (
                  <button
                    type="button"
                    onClick={handleRandomTopic}
                    className="btn ghost sm"
                    title="Bốc ngẫu nhiên 1 chủ đề khác"
                    style={{ padding: '3px 10px', fontSize: 12, fontWeight: 700, borderRadius: 8 }}
                  >
                    <UiIcon name="dice" size={14} /> Ngẫu nhiên
                  </button>
                )}
              </div>
              <div style={{ position: 'relative' }}>
                <select
                  value={selectedTopic}
                  onChange={(e) => {
                    setSelectedTopic(e.target.value);
                    setResult(null);
                    setText('');
                  }}
                  disabled={loadingTopics || topicList.length === 0}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 10,
                    border: '1.5px solid var(--line)',
                    background: '#FFFFFF',
                    fontWeight: 700,
                    color: 'var(--ink)',
                    fontSize: 14.5,
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {loadingTopics ? (
                    <option>Đang tải danh sách chủ đề...</option>
                  ) : topicList.length === 0 ? (
                    <option>Không có chủ đề cho cấp độ này</option>
                  ) : (
                    topicList.map((t) => (
                      <option key={t.topic} value={t.topic}>
                        {getTopicLabel(t.topic)} ({t.count} từ vựng)
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>
          </div>
        </div>
      </MotionCard>

      {/* 2. KHUNG LÀM VIỆC CHÍNH: Dàn ý thông minh (Trái) & Editor Soạn thảo (Phải) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: 20,
          alignItems: 'start',
        }}
      >
        {/* 2.1 CỘT TRÁI: Dàn ý & Nhiệm vụ luyện từ vựng */}
        <MotionCard
          className="card"
          style={{
            background: '#FFFFFF',
            border: '1.5px solid #E2E8F0',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          {/* Header dàn ý */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20 }}><UiIcon name={currentTopicIcon} size={16} /></span>
              <div>
                <b style={{ fontSize: 16, color: 'var(--ink)' }}>
                  {selectedTopic ? getTopicLabel(selectedTopic) : 'Chủ đề'}
                </b>
                <span className="pill level" style={{ marginLeft: 8, fontSize: 11, fontWeight: 800 }}>
                  {level}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleShuffleWords}
              disabled={loadingWords || wordPool.length === 0}
              className="btn ghost sm"
              style={{ padding: '4px 10px', fontSize: 12, fontWeight: 700, borderRadius: 8 }}
            >
              {loadingWords ? 'Đang đổi...' : <><UiIcon name="refresh" size={13} /> Đổi bộ từ khác</>}
            </button>
          </div>

          {/* Thanh đo tiến độ áp dụng từ vựng (Mission Progress) */}
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 12,
              background: progressPercent === 100 ? 'var(--success-bg)' : 'rgba(250, 248, 241, 0.65)',
              border: progressPercent === 100 ? '1.5px solid rgba(66, 119, 77, 0.35)' : '1px solid var(--line)',
              transition: 'background-color 0.3s var(--ease), border-color 0.3s var(--ease)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 12.5, fontWeight: 800, color: progressPercent === 100 ? 'var(--green-dark)' : 'var(--ink)' }}>
                <UiIcon name="target" size={14} /> Tiến độ áp dụng từ gợi ý:
              </span>
              <span
                style={{
                  fontSize: 12.5,
                  fontWeight: 900,
                  color: progressPercent === 100 ? 'var(--green-dark)' : 'var(--sage)',
                }}
              >
                {usedCount}/{suggestedWords.length} từ ({progressPercent}%)
              </span>
            </div>

            {/* Progress track */}
            <div
              style={{
                width: '100%',
                height: 8,
                borderRadius: 999,
                background: 'rgba(71, 96, 63, 0.14)',
                overflow: 'hidden',
              }}
            >
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                style={{
                  height: '100%',
                  borderRadius: 999,
                  background:
                    progressPercent === 100
                      ? 'var(--success)'
                      : 'var(--sage)',
                }}
              />
            </div>
            {progressPercent === 100 && (
              <div style={{ marginTop: 6, fontSize: 11.5, color: '#15803D', fontWeight: 700 }}>
                ✓ Xuất sắc! Bạn đã đưa đầy đủ 5 từ vựng vào bài viết.
              </div>
            )}
          </div>

          {/* Danh sách 5 thẻ từ vựng tương tác */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
              Từ vựng mục tiêu (gõ vào bài để kích hoạt):
            </div>

            {loadingWords ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#64748B', fontSize: 13 }}>
                <span className="spinner sm" style={{ marginRight: 8 }} /> Đang tải từ vựng cho chủ đề...
              </div>
            ) : suggestedWords.length === 0 ? (
              <div style={{ padding: '16px', color: '#94A3B8', fontSize: 13, textAlign: 'center' }}>
                Chưa có từ vựng phù hợp cho cấp độ này.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {usedWordsStatus.map((w, idx) => (
                  <motion.div
                    key={idx}
                    whileHover={{ scale: 1.01 }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderRadius: 10,
                      transition: 'transform 0.25s var(--ease), background-color 0.25s var(--ease), border-color 0.25s var(--ease)',
                      background: w.isUsed ? 'var(--success-bg)' : 'rgba(255, 255, 255, 0.78)',
                      border: w.isUsed ? '1.5px solid rgba(66, 119, 77, 0.35)' : '1px solid var(--line)',
                      boxShadow: w.isUsed ? 'var(--shadow-sm)' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 999,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 11,
                          fontWeight: 900,
                          background: w.isUsed ? '#10B981' : '#F1F5F9',
                          color: w.isUsed ? '#FFFFFF' : '#94A3B8',
                          flexShrink: 0,
                        }}
                      >
                        {w.isUsed ? '✓' : idx + 1}
                      </span>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <b style={{ fontSize: 14.5, color: w.isUsed ? '#15803D' : '#1E293B' }}>
                            {w.word}
                          </b>
                          {w.partOfSpeech && (
                            <span
                              style={{
                                fontSize: 10.5,
                                padding: '1px 6px',
                                borderRadius: 4,
                                background: '#F1F5F9',
                                color: '#475569',
                                fontWeight: 700,
                              }}
                            >
                              {w.partOfSpeech}
                            </span>
                          )}
                        </div>
                        {w.meaning && (
                          <div style={{ fontSize: 12.5, color: '#64748B', marginTop: 2 }}>
                            {w.meaning}
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <button
                        type="button"
                        onClick={(e) => playWordAudio(w, e)}
                        title="Nghe phát âm chuẩn"
                        className={'speakbtn' + (playingWordId === w.id ? ' on' : '')}
                        style={{ width: 28, height: 28, padding: 0 }}
                      >
                        <Icon n="vol" s={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => insertSnippet(w.word)}
                        title="Chèn từ này vào bài viết"
                        className="btn ghost sm"
                        style={{ padding: '2px 7px', fontSize: 11, fontWeight: 700, height: 26 }}
                      >
                        + Chèn
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Cấu trúc ngữ pháp trọng tâm theo Level */}
          {structures.length > 0 && (
            <div style={{ paddingTop: 12, borderTop: '1px dashed #E2E8F0' }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                Cấu trúc câu khuyến khích áp dụng:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {structures.map((st, i) => (
                  <div
                    key={i}
                    style={{
                      background: '#F8FAFC',
                      padding: '10px 12px',
                      borderRadius: 10,
                      border: '1px solid #E2E8F0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#1E293B' }}>
                        <UiIcon name="pin" size={13} /> {st.name}
                      </div>
                      <div style={{ fontSize: 12, color: '#64748B', fontStyle: 'italic', marginTop: 2 }}>
                        {st.template}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => insertSnippet(st.template)}
                      className="btn ghost sm"
                      title="Chèn khung câu mẫu này vào bài viết"
                      style={{ padding: '3px 8px', fontSize: 11, fontWeight: 700, flexShrink: 0 }}
                    >
                      + Chèn
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </MotionCard>

        {/* 2.2 CỘT PHẢI: Trình soạn thảo bài viết & Chấm điểm AI */}
        <MotionCard
          className="card"
          style={{
            background: '#FFFFFF',
            border: '1.5px solid #E2E8F0',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <h2>
                  <span className="dot b" />
                  Bài viết của bạn
                </h2>
                <p className="sub mt8" style={{ fontSize: 13.5 }}>
                  Viết 1 đoạn văn tiếng Anh (2–5 câu) về chủ đề <b>{selectedTopic ? getTopicLabel(selectedTopic) : 'chủ đề trên'}</b>, vận dụng tối đa các từ và mẫu câu gợi ý.
                </p>
              </div>

              {sampleIdeaText && (
                <button
                  type="button"
                  onClick={() => setShowIdea(!showIdea)}
                  className="btn ghost sm"
                  style={{ padding: '4px 10px', fontSize: 12, fontWeight: 700, borderRadius: 8 }}
                >
                  <UiIcon name="lightbulb" size={13} /> {showIdea ? 'Ẩn gợi ý ý tưởng' : 'Gợi ý ý tưởng'}
                </button>
              )}
            </div>

            {/* Gợi ý ý tưởng tham khảo (Idea hint) */}
            <AnimatePresence>
              {showIdea && sampleIdeaText && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{
                    marginTop: 12,
                    padding: '10px 14px',
                    borderRadius: 10,
                    background: '#FEF3C7',
                    border: '1px solid #FCD34D',
                    fontSize: 13,
                    color: '#92400E',
                  }}
                >
                  <b><UiIcon name="lightbulb" size={13} /> Câu mẫu gợi mở ý tưởng:</b> "{sampleIdeaText}"
                </motion.div>
              )}
            </AnimatePresence>

            {/* Textarea nhập liệu */}
            <div style={{ position: 'relative', marginTop: 14 }}>
              <textarea
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
                placeholder={`Ví dụ: Recently, I have been thinking about... (Gõ các từ vựng gợi ý ở cột trái vào để xem đèn sáng lên nhé!)`}
                rows={9}
                style={{
                  width: '100%',
                  padding: '16px',
                  borderRadius: 12,
                  border: '1.5px solid var(--line)',
                  fontSize: 15,
                  lineHeight: 1.65,
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  outline: 'none',
                  boxSizing: 'border-box',
                  background: '#FCFDFE',
                  color: 'var(--ink)',
                  transition: 'border-color 0.2s ease',
                }}
                onFocus={(e) => (e.target.style.borderColor = 'var(--primary)')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--line)')}
              />
            </div>

            {/* Thanh thông số bài viết */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
              <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#64748B', fontWeight: 600 }}>
                <span>📝 {wordCount} từ</span>
                <span>•</span>
                <span>🔤 {text.length} ký tự</span>
                <span>•</span>
                <span>📄 ~{sentenceCount} câu</span>
              </div>
              {text.trim().length > 0 && (
                <button
                  type="button"
                  onClick={() => setText('')}
                  className="btn ghost sm"
                  style={{ padding: '2px 8px', fontSize: 11, borderRadius: 6 }}
                >
                  Xóa bài
                </button>
              )}
            </div>

            {errorMsg && (
              <div
                style={{
                  marginTop: 12,
                  padding: '10px 14px',
                  borderRadius: 8,
                  background: '#FEE2E2',
                  color: '#B91C1C',
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                ⚠️ {errorMsg}
              </div>
            )}
          </div>

          {/* Action Footer */}
          <div
            style={{
              marginTop: 20,
              paddingTop: 16,
              borderTop: '1px solid var(--line)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div style={{ fontSize: 12, color: '#64748B', maxWidth: 320 }}>
              ⚡ Tốn 1 lượt kiểm tra ngữ pháp (Free 5/ngày) • AI chấm điểm & đối chiếu dàn ý
            </div>

            <button
              type="button"
              className="btn primary"
              onClick={handleCheck}
              disabled={busy || !text.trim()}
              style={{
                minWidth: 180,
                padding: '10px 20px',
                fontWeight: 800,
                fontSize: 14.5,
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              {busy ? (
                <>
                  <span className="spinner sm" /> Đang chấm bài...
                </>
              ) : (
                <>
                  <Icon n="spark" s={18} /> Chấm bài viết với Vi AI
                </>
              )}
            </button>
          </div>
        </MotionCard>
      </div>

      {/* 3. KHỐI KẾT QUẢ ĐÁNH GIÁ (KHI CÓ KẾT QUẢ TỪ AI) */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.3 }}
          >
            <ResultPanel
              res={result}
              outlineReport={result.outlineReport}
              extraActions={
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 12 }}>
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() => {
                      setText('');
                      setResult(null);
                    }}
                    style={{ fontWeight: 700, borderRadius: 10 }}
                  >
                    ✍️ Viết tiếp cùng chủ đề
                  </button>
                  <button
                    type="button"
                    className="btn primary"
                    onClick={() => {
                      handleRandomTopic();
                    }}
                    style={{ fontWeight: 700, borderRadius: 10 }}
                  >
                    🎲 Đổi sang chủ đề mới
                  </button>
                </div>
              }
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
