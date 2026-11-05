import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { wordApi, aiApi, getPartOfSpeechBadgeStyle, type Word, type GrammarResp } from '../../api';
import { MotionCard } from '../../motion';
import ResultPanel from './ResultPanel';

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

interface PracticePrompt {
  id?: number;
  wordId: number;
  targetWord: string;
  targetMeaning?: string;
  mode: string;
  viText: string;
}

interface TranslationResult extends GrammarResp {
  targetWord?: string;
  isTargetWordUsed?: boolean;
  viPrompt?: string;
  feedback?: string;
  meaningMatch?: 'MATCH' | 'PARTIAL' | 'MISMATCH';
  overall?: 'PASS' | 'FAIL';
}

const LEVEL_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  A1: { label: 'A1', color: '#047857', bg: '#ECFDF5', border: '#A7F3D0' },
  A2: { label: 'A2', color: '#1D4ED8', bg: '#EFF6FF', border: '#BFDBFE' },
  B1: { label: 'B1', color: '#6D28D9', bg: '#F5F3FF', border: '#DDD6FE' },
  B2: { label: 'B2', color: '#B45309', bg: '#FFFBEB', border: '#FDE68A' },
  C1: { label: 'C1', color: '#BE123C', bg: '#FFF1F2', border: '#FECDD3' },
};

export default function TranslationPanel() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [favorites, setFavorites] = useState<Word[]>([]);
  const [loadingFavorites, setLoadingFavorites] = useState(true);
  const [selectedWordId, setSelectedWordId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [mode, setMode] = useState<'SENTENCE' | 'PARAGRAPH'>('SENTENCE');
  const [prompt, setPrompt] = useState<PracticePrompt | null>(null);
  const [loadingPrompt, setLoadingPrompt] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [result, setResult] = useState<TranslationResult | null>(null);

  // Helper: Lấy nghĩa tiếng Việt đầy đủ, fallback an toàn
  const getWordMeaning = useCallback((w: Word | null | undefined): string => {
    if (!w) return '';
    return w.vietnameseMeaning || w.meaning || w.definition || '';
  }, []);

  // 1. Fetch user's favorite words
  useEffect(() => {
    let active = true;
    setLoadingFavorites(true);
    wordApi
      .favorites(0, 500)
      .then((res) => {
        if (!active) return;
        const list = res.data?.content || [];
        setFavorites(list);

        const qWordId = searchParams.get('wordId');
        if (qWordId) {
          const numId = Number(qWordId);
          const found = list.find((w) => Number(w.id) === numId);
          if (found) {
            setSelectedWordId(Number(found.id));
            return;
          }
        }

        if (list.length > 0) {
          setSelectedWordId(Number(list[0].id));
        }
      })
      .catch((err) => {
        console.error('Error fetching favorites:', err);
        if (!active) return;
        setFavorites([]);
      })
      .finally(() => {
        if (active) setLoadingFavorites(false);
      });

    return () => {
      active = false;
    };
  }, [searchParams]);

  const selectedWord = useMemo(() => {
    if (!selectedWordId) return null;
    return favorites.find((w) => Number(w.id) === selectedWordId) || null;
  }, [favorites, selectedWordId]);

  // Danh sách từ vựng yêu thích đã lọc theo từ khóa tìm kiếm (nếu có)
  const filteredFavorites = useMemo(() => {
    if (!searchTerm.trim()) return favorites;
    const q = searchTerm.trim().toLowerCase();
    return favorites.filter((w) => {
      const matchWord = (w.word || '').toLowerCase().includes(q);
      const matchMeaning = getWordMeaning(w).toLowerCase().includes(q);
      return matchWord || matchMeaning;
    });
  }, [favorites, searchTerm, getWordMeaning]);

  // 2. Kiểm tra xem trong DB đã có sẵn đề bài cho từ này chưa (tốn 0 token)
  useEffect(() => {
    if (!selectedWordId) {
      setPrompt(null);
      return;
    }

    let active = true;
    setLoadingPrompt(true);
    setResult(null);
    setErrorMsg('');

    aiApi
      .getPracticePrompt({ wordId: selectedWordId, mode })
      .then((data) => {
        if (!active) return;
        setPrompt(data || null);
      })
      .catch((err) => {
        console.error('Error fetching existing practice prompt:', err);
        if (!active) return;
        setPrompt(null);
      })
      .finally(() => {
        if (active) setLoadingPrompt(false);
      });

    return () => {
      active = false;
    };
  }, [selectedWordId, mode]);

  // Tạo đề bài mới khi người dùng bấm nút tạo đề ở giữa ô
  const handleCreatePrompt = () => {
    if (!selectedWordId) return;
    setLoadingPrompt(true);
    setResult(null);
    setErrorMsg('');
    aiApi
      .generatePracticePrompt({ wordId: selectedWordId, mode, forceNew: false })
      .then((data) => {
        setPrompt(data);
      })
      .catch((err) => {
        console.error('Error generating practice prompt:', err);
        setErrorMsg('Không thể tạo đề bài lúc này. Vui lòng thử lại sau.');
      })
      .finally(() => {
        setLoadingPrompt(false);
      });
  };

  // Đổi sang đề bài khác khi người dùng chủ động bấm "Đổi đề khác"
  const handleShufflePrompt = () => {
    if (!selectedWordId) return;
    setLoadingPrompt(true);
    setResult(null);
    setErrorMsg('');
    aiApi
      .generatePracticePrompt({ wordId: selectedWordId, mode, forceNew: true })
      .then((data) => {
        setPrompt(data);
        setText('');
        setResult(null);
      })
      .catch((err) => {
        console.error('Error shuffling practice prompt:', err);
        setErrorMsg('Không thể đổi đề lúc này. Vui lòng thử lại sau.');
      })
      .finally(() => {
        setLoadingPrompt(false);
      });
  };

  const handleRandomWord = () => {
    if (favorites.length <= 1) return;
    const candidates = favorites.filter((w) => Number(w.id) !== selectedWordId);
    if (candidates.length > 0) {
      const rand = candidates[Math.floor(Math.random() * candidates.length)];
      setSelectedWordId(Number(rand.id));
      setText('');
      setResult(null);
    }
  };

  // Phát âm từ vựng (ưu tiên audioUrl, fallback Web Speech API)
  const playWordAudio = (word: Word | null, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!word || !word.word) return;

    setIsPlayingAudio(true);
    if (word.audioUrl) {
      const audio = new Audio(word.audioUrl);
      audio.onended = () => setIsPlayingAudio(false);
      audio.onerror = () => setIsPlayingAudio(false);
      audio.play().catch(() => setIsPlayingAudio(false));
    } else if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(word.word);
      u.lang = 'en-US';
      u.rate = 0.95;
      u.onend = () => setIsPlayingAudio(false);
      u.onerror = () => setIsPlayingAudio(false);
      window.speechSynthesis.speak(u);
    } else {
      setIsPlayingAudio(false);
    }
  };

  // Chèn từ vựng vào con trỏ bản dịch
  const handleInsertWord = () => {
    if (!selectedWord) return;
    setText((prev) => {
      const sep = prev && !prev.endsWith(' ') ? ' ' : '';
      return prev + sep + selectedWord.word;
    });
  };

  const isWordUsedInText = useMemo(() => {
    if (!selectedWord) return false;
    return checkWordUsed(text, selectedWord.word);
  }, [text, selectedWord]);

  const wordCount = useMemo(() => {
    const trimmed = text.trim();
    return trimmed ? trimmed.split(/\s+/).length : 0;
  }, [text]);

  const charCount = useMemo(() => text.length, [text]);

  const handleCheck = async () => {
    if (!text.trim()) {
      setErrorMsg('Vui lòng nhập câu dịch của bạn trước khi kiểm tra.');
      return;
    }
    if (!prompt || !selectedWord) {
      setErrorMsg('Thiếu đề bài hoặc từ vựng mục tiêu.');
      return;
    }

    setErrorMsg('');
    setBusy(true);
    try {
      const res = await aiApi.checkTranslation({
        text,
        viPrompt: prompt.viText,
        targetWord: selectedWord.word,
        targetMeaning: getWordMeaning(selectedWord),
        mode,
      });
      setResult(res.data);
    } catch (err: any) {
      console.error('Error checking translation:', err);
      const msg = err.response?.data?.message || 'Không thể kiểm tra bản dịch lúc này. Vui lòng thử lại sau.';
      setErrorMsg(msg);
    } finally {
      setBusy(false);
    }
  };

  if (loadingFavorites) {
    return (
      <MotionCard className="card" style={{ textAlign: 'center', padding: '48px 20px', background: '#FFFFFF' }}>
        <div className="spinner lg" style={{ margin: '0 auto 16px' }} />
        <div style={{ fontWeight: 800, color: 'var(--ink)', fontSize: 16 }}>
          Đang tải danh sách từ vựng yêu thích của bạn...
        </div>
        <p className="sub" style={{ fontSize: 13, marginTop: 6 }}>
          Hệ thống đang chuẩn bị dữ liệu luyện dịch câu cá nhân hóa
        </p>
      </MotionCard>
    );
  }

  if (favorites.length === 0) {
    return (
      <MotionCard className="card" style={{ textAlign: 'center', padding: '56px 24px', background: '#FFFFFF' }}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>❤️</div>
        <h2 style={{ fontSize: 22, color: 'var(--ink)', marginBottom: 8, fontWeight: 800 }}>
          Chưa có từ vựng yêu thích
        </h2>
        <p className="sub" style={{ maxWidth: 520, margin: '0 auto 28px', lineHeight: 1.6, fontSize: 14.5 }}>
          Để luyện dịch theo từ yêu thích, hãy nhấn biểu tượng trái tim ❤️ khi tra từ điển hoặc lúc ôn tập Flashcard để lưu lại các từ cần rèn luyện nhé!
        </p>
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn primary"
            onClick={() => navigate('/words')}
            style={{ fontWeight: 800, padding: '10px 22px', borderRadius: 10 }}
          >
            📖 Khám phá kho từ vựng
          </button>
          <button
            type="button"
            className="btn ghost"
            onClick={() => navigate('/review')}
            style={{ fontWeight: 700, padding: '10px 20px', borderRadius: 10 }}
          >
            🔄 Ôn tập Flashcard
          </button>
        </div>
      </MotionCard>
    );
  }

  const selectedMeaning = getWordMeaning(selectedWord);
  const posBadge = selectedWord?.partOfSpeech ? getPartOfSpeechBadgeStyle(selectedWord.partOfSpeech) : null;
  const levelCfg = selectedWord?.level ? LEVEL_CONFIG[selectedWord.level.toUpperCase()] : null;

  return (
    <div className="colstack" style={{ gap: 20 }}>
      {/* 1. THANH ĐIỀU KHIỂN CHÍNH: Chọn từ vựng yêu thích & Hình thức luyện tập */}
      <MotionCard
        className="card"
        style={{
          background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)',
          border: '1.5px solid var(--line)',
          boxShadow: 'var(--shadow-sm)',
          padding: '20px 24px',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            {/* 1.1 Khối chọn từ vựng yêu thích */}
            <div style={{ flex: 1, minWidth: 300 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink)', textTransform: 'uppercase', letterSpacing: 0.6 }}>
                    ❤️ 1. Chọn từ vựng yêu thích:
                  </span>
                  <span className="sub" style={{ fontSize: 12, fontWeight: 700 }}>
                    ({favorites.length} từ đã lưu)
                  </span>
                </div>
                {favorites.length > 1 && (
                  <button
                    type="button"
                    onClick={handleRandomWord}
                    className="btn ghost sm"
                    title="Bốc ngẫu nhiên 1 từ yêu thích khác"
                    style={{ padding: '3px 10px', fontSize: 12, fontWeight: 700, borderRadius: 8 }}
                  >
                    🎲 Từ ngẫu nhiên
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <select
                  value={selectedWordId || ''}
                  onChange={(e) => {
                    setSelectedWordId(Number(e.target.value));
                    setText('');
                    setResult(null);
                  }}
                  style={{
                    flex: 1,
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
                  {filteredFavorites.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.word} {w.pronunciation ? `[${w.pronunciation}]` : ''} — {getWordMeaning(w)}
                    </option>
                  ))}
                </select>

                {favorites.length > 10 && (
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Lọc từ..."
                    style={{
                      width: 110,
                      padding: '9px 12px',
                      borderRadius: 10,
                      border: '1.5px solid var(--line)',
                      fontSize: 13,
                      background: '#FFFFFF',
                      outline: 'none',
                    }}
                  />
                )}
              </div>
            </div>

            {/* 1.2 Khối chọn hình thức luyện tập */}
            <div>
              <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink)', textTransform: 'uppercase', letterSpacing: 0.6, display: 'block', marginBottom: 8 }}>
                2. Hình thức luyện tập:
              </span>
              <div
                style={{
                  display: 'flex',
                  gap: 6,
                  padding: 4,
                  background: '#EDF2F7',
                  borderRadius: 12,
                  border: '1px solid #E2E8F0',
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setMode('SENTENCE');
                    setText('');
                    setResult(null);
                  }}
                  style={{
                    padding: '8px 18px',
                    borderRadius: 9,
                    fontWeight: 800,
                    fontSize: 13.5,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    border: 'none',
                    background: mode === 'SENTENCE' ? '#FFFFFF' : 'transparent',
                    color: mode === 'SENTENCE' ? 'var(--primary)' : '#64748B',
                    boxShadow: mode === 'SENTENCE' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                  }}
                >
                  📝 Luyện câu (1 câu)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('PARAGRAPH');
                    setText('');
                    setResult(null);
                  }}
                  style={{
                    padding: '8px 18px',
                    borderRadius: 9,
                    fontWeight: 800,
                    fontSize: 13.5,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    border: 'none',
                    background: mode === 'PARAGRAPH' ? '#FFFFFF' : 'transparent',
                    color: mode === 'PARAGRAPH' ? 'var(--primary)' : '#64748B',
                    boxShadow: mode === 'PARAGRAPH' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                  }}
                >
                  📄 Luyện đoạn văn (2-3 câu)
                </button>
              </div>
            </div>
          </div>
        </div>
      </MotionCard>

      {/* 2. KHÔNG GIAN LÀM VIỆC 2 CỘT: Đề bài & Từ mục tiêu (Trái) - Trình soạn thảo AI Editor (Phải) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
          gap: 20,
          alignItems: 'start',
        }}
      >
        {/* ==================== CỘT TRÁI: ĐỀ BÀI & TỪ VỰNG MỤC TIÊU ==================== */}
        <div className="colstack" style={{ gap: 20 }}>
          {/* 2.1 Thẻ Từ vựng mục tiêu (VIP Target Word Card) */}
          {selectedWord && (
            <MotionCard
              className="card"
              style={{
                background: '#FFFFFF',
                border: isWordUsedInText ? '2px solid #86EFAC' : '1.5px solid #E2E8F0',
                boxShadow: isWordUsedInText ? '0 4px 14px rgba(22, 163, 74, 0.12)' : 'var(--shadow-sm)',
                transition: 'all 0.3s ease',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Highlight ribbon khi đã nhận diện từ */}
              {isWordUsedInText && (
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    background: '#16A34A',
                    color: '#FFFFFF',
                    fontSize: 11,
                    fontWeight: 800,
                    padding: '3px 12px',
                    borderBottomLeftRadius: 8,
                    letterSpacing: 0.4,
                  }}
                >
                  ✓ ĐÃ ÁP DỤNG VÀO BÀI DỊCH
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 22, fontWeight: 900, color: 'var(--primary)', letterSpacing: -0.3 }}>
                      {selectedWord.word}
                    </span>
                    {selectedWord.pronunciation && (
                      <span style={{ color: '#64748B', fontSize: 14, fontWeight: 700, fontFamily: 'monospace' }}>
                        [{selectedWord.pronunciation}]
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={(e) => playWordAudio(selectedWord, e)}
                      title="Nghe phát âm chuẩn (Mỹ)"
                      className="btn ghost sm"
                      style={{
                        padding: '3px 8px',
                        borderRadius: 8,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: 12,
                        color: isPlayingAudio ? 'var(--primary)' : '#475569',
                        background: isPlayingAudio ? '#EFF6FF' : '#F1F5F9',
                      }}
                    >
                      🔊 {isPlayingAudio ? 'Đang phát...' : 'Phát âm'}
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}>
                    {posBadge && (
                      <span
                        className="pill"
                        style={{
                          fontSize: 11,
                          padding: '2px 8px',
                          background: posBadge.bg,
                          color: posBadge.color,
                          border: `1px solid ${posBadge.border}`,
                          fontWeight: 800,
                        }}
                      >
                        {posBadge.icon} {posBadge.shortLabel}
                      </span>
                    )}
                    {levelCfg && (
                      <span
                        className="pill level"
                        style={{
                          fontSize: 11,
                          padding: '2px 8px',
                          background: levelCfg.bg,
                          color: levelCfg.color,
                          border: `1px solid ${levelCfg.border}`,
                          fontWeight: 800,
                        }}
                      >
                        {levelCfg.label}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Dòng nghĩa tiếng Việt */}
              <div
                style={{
                  marginTop: 14,
                  padding: '12px 14px',
                  borderRadius: 10,
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                }}
              >
                <span style={{ fontSize: 16 }}>🇻🇳</span>
                <div style={{ fontSize: 14, lineHeight: 1.5, color: '#1E293B' }}>
                  <span style={{ color: '#64748B', fontWeight: 600, marginRight: 4 }}>Nghĩa:</span>
                  <b style={{ color: 'var(--ink)', fontSize: 14.5 }}>{selectedMeaning || 'Chưa cập nhật nghĩa'}</b>
                </div>
              </div>

              {/* Nút chèn từ nhanh nếu chưa dùng */}
              <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: isWordUsedInText ? '#16A34A' : '#64748B',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: isWordUsedInText ? '#16A34A' : '#CBD5E1',
                      display: 'inline-block',
                    }}
                  />
                  {isWordUsedInText ? 'Đã xuất hiện trong bài dịch của bạn' : 'Chưa xuất hiện trong bài dịch'}
                </span>

                {!isWordUsedInText && (
                  <button
                    type="button"
                    onClick={handleInsertWord}
                    className="btn ghost sm"
                    style={{ padding: '3px 10px', fontSize: 12, fontWeight: 700, borderRadius: 8 }}
                  >
                    + Chèn từ vào bài
                  </button>
                )}
              </div>
            </MotionCard>
          )}

          {/* 2.2 Khung Đề bài tiếng Việt (Vietnamese Translation Challenge) */}
          <MotionCard
            className="card"
            style={{
              background: '#FFFFFF',
              border: '1.5px solid #E2E8F0',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18 }}>🎯</span>
                <b style={{ fontSize: 15, color: 'var(--ink)' }}>
                  Đề bài tiếng Việt ({mode === 'SENTENCE' ? 'Câu đơn' : 'Đoạn văn'})
                </b>
              </div>
              {prompt && (
                <button
                  type="button"
                  onClick={handleShufflePrompt}
                  disabled={loadingPrompt}
                  className="btn ghost sm"
                  style={{ padding: '4px 10px', fontSize: 12, fontWeight: 700, borderRadius: 8 }}
                  title="Đổi sang đề bài khác cho từ này"
                >
                  {loadingPrompt ? '⏳ Đang đổi...' : '🔄 Đổi đề khác'}
                </button>
              )}
            </div>

            <div>
              {loadingPrompt ? (
                <div style={{ padding: '36px 20px', textAlign: 'center', color: '#64748B', fontSize: 14 }}>
                  <span className="spinner sm" style={{ marginRight: 10 }} />
                  Đang chuẩn bị đề bài tiếng Việt cho từ "{selectedWord?.word}"...
                </div>
              ) : prompt ? (
                <div
                  style={{
                    padding: '18px 20px',
                    borderRadius: 12,
                    background: 'linear-gradient(180deg, #F8FAFC 0%, #FFFFFF 100%)',
                    border: '1.5px solid #CBD5E1',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                  }}
                >
                  <div style={{ fontSize: 13, color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
                    💬 Đề bài cần dịch:
                  </div>
                  <div style={{ fontSize: 16, lineHeight: 1.65, color: '#0F172A', fontWeight: 600 }}>
                    "{prompt.viText}"
                  </div>

                  <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                      <span className="sub" style={{ fontWeight: 700 }}>Mục tiêu:</span>
                      <span
                        className="pill"
                        style={{
                          background: isWordUsedInText ? '#DCFCE7' : '#EFF6FF',
                          color: isWordUsedInText ? '#15803D' : '#1D4ED8',
                          border: '1px solid ' + (isWordUsedInText ? '#86EFAC' : '#BFDBFE'),
                          fontWeight: 800,
                          fontSize: 12,
                        }}
                      >
                        {isWordUsedInText ? '✓' : '•'} {selectedWord?.word}
                      </span>
                    </div>

                    <span style={{ fontSize: 12, color: '#64748B', fontStyle: 'italic' }}>
                      (Lưu lại trong kho đề dùng chung)
                    </span>
                  </div>
                </div>
              ) : (
                /* Nút tạo đề đặt ở giữa ô khi chưa có đề trong DB */
                <div
                  style={{
                    padding: '36px 20px',
                    borderRadius: 12,
                    background: '#F8FAFC',
                    border: '2px dashed #CBD5E1',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 12,
                  }}
                >
                  <div style={{ fontSize: 34 }}>✨</div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink)' }}>
                      Chưa có đề bài cho từ "{selectedWord?.word}"
                    </div>
                    <div className="sub" style={{ fontSize: 13, marginTop: 4, maxWidth: 440, lineHeight: 1.5 }}>
                      Từ vựng này chưa có sẵn câu tiếng Việt trong kho. Nhấn nút bên dưới để Vi AI biên soạn đề bài {mode === 'SENTENCE' ? 'câu đơn' : 'đoạn văn'} chuẩn cho bạn luyện tập!
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleCreatePrompt}
                    disabled={loadingPrompt}
                    className="btn primary"
                    style={{
                      marginTop: 4,
                      padding: '11px 26px',
                      fontSize: 14.5,
                      fontWeight: 800,
                      borderRadius: 10,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      boxShadow: '0 4px 14px rgba(21, 101, 192, 0.25)',
                    }}
                  >
                    ✨ Tạo đề bài {mode === 'SENTENCE' ? 'Luyện câu' : 'Luyện đoạn văn'} với Vi AI
                  </button>
                </div>
              )}
            </div>

            {/* Mẹo dịch thuật nhỏ */}
            <div
              style={{
                marginTop: 14,
                padding: '10px 14px',
                borderRadius: 8,
                background: '#F0FDF4',
                border: '1px solid #BBF7D0',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 12.5,
                color: '#166534',
              }}
            >
              <span>💡</span>
              <span>
                <strong>Mẹo luyện dịch:</strong> Hãy diễn đạt ý nghĩa tự nhiên bằng tiếng Anh thay vì dịch từng từ (word-by-word) và chú ý cách chia thì phù hợp.
              </span>
            </div>
          </MotionCard>
        </div>

        {/* ==================== CỘT PHẢI: TRÌNH SOẠN THẢO BẢN DỊCH AI EDITOR ==================== */}
        <MotionCard
          className="card"
          style={{
            background: '#FFFFFF',
            border: '1.5px solid #E2E8F0',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          {/* Editor Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="dot g" />
                <b style={{ fontSize: 16, color: 'var(--ink)' }}>Bản dịch tiếng Anh của bạn</b>
              </div>
              <p className="sub" style={{ fontSize: 12.5, marginTop: 4 }}>
                Dịch câu tiếng Việt ở cột trái sang tiếng Anh và sử dụng từ mục tiêu <strong>"{selectedWord?.word}"</strong>
              </p>
            </div>

            {/* Bộ đếm từ & ký tự */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '4px 10px',
                background: '#F8FAFC',
                borderRadius: 8,
                border: '1px solid #E2E8F0',
                fontSize: 12,
                fontWeight: 700,
                color: '#475569',
              }}
            >
              <span>{wordCount} từ</span>
              <span>•</span>
              <span>{charCount} ký tự</span>
            </div>
          </div>

          {/* Ô soạn thảo bản dịch */}
          <div style={{ position: 'relative' }}>
            <textarea
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                if (errorMsg) setErrorMsg('');
              }}
              placeholder={`Nhập bản dịch tiếng Anh của bạn tại đây...\nVí dụ: Nhớ áp dụng từ "${selectedWord?.word || ''}" vào ngữ cảnh phù hợp nhé!`}
              rows={mode === 'PARAGRAPH' ? 9 : 7}
              style={{
                width: '100%',
                padding: '14px 16px',
                borderRadius: 12,
                border: isWordUsedInText ? '1.5px solid #86EFAC' : '1.5px solid var(--line)',
                fontSize: 15,
                lineHeight: 1.65,
                fontFamily: 'inherit',
                resize: 'vertical',
                outline: 'none',
                boxSizing: 'border-box',
                background: isWordUsedInText ? '#FAFFFD' : '#FFFFFF',
                transition: 'border 0.2s ease, background 0.2s ease',
              }}
            />
          </div>

          {/* Thao tác nhanh dưới chân Editor */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {selectedWord && (
                <button
                  type="button"
                  onClick={handleInsertWord}
                  className="btn ghost sm"
                  style={{
                    padding: '3px 10px',
                    fontSize: 12,
                    fontWeight: 700,
                    borderRadius: 8,
                    background: isWordUsedInText ? '#DCFCE7' : '#F1F5F9',
                    color: isWordUsedInText ? '#15803D' : '#334155',
                  }}
                >
                  {isWordUsedInText ? '✓ Đã chèn: ' : '+ Chèn: '} {selectedWord.word}
                </button>
              )}
            </div>

            {text.trim().length > 0 && (
              <button
                type="button"
                onClick={() => setText('')}
                className="btn ghost sm"
                style={{ padding: '3px 8px', fontSize: 11.5, color: '#94A3B8' }}
              >
                Xóa bản dịch
              </button>
            )}
          </div>

          {/* Hộp thông báo lỗi nếu có */}
          {errorMsg && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 8,
                background: '#FEE2E2',
                color: '#B91C1C',
                fontSize: 13,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span>⚠️</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Nút hành động chính: Chấm bài dịch với Vi AI */}
          <div
            style={{
              marginTop: 8,
              paddingTop: 14,
              borderTop: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748B' }}>
              <span>⚡</span>
              <span>Tốn 1 lượt kiểm tra ngữ pháp (Free 5/ngày) • Vi AI phân tích độ sát nghĩa & cấu trúc</span>
            </div>

            <button
              type="button"
              className="btn primary"
              onClick={handleCheck}
              disabled={busy || !text.trim() || !prompt}
              style={{
                minWidth: 180,
                padding: '10px 22px',
                fontWeight: 800,
                fontSize: 14.5,
                borderRadius: 10,
                boxShadow: '0 4px 12px rgba(21, 101, 192, 0.25)',
              }}
            >
              {busy ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="spinner sm" /> Đang chấm bài dịch...
                </span>
              ) : (
                '🔍 Chấm bài dịch với Vi AI'
              )}
            </button>
          </div>
        </MotionCard>
      </div>

      {/* 3. KHỐI KẾT QUẢ CHẤM BÀI DỊCH THUẬT (Result Section) */}
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
              translationVerdict={{
                meaningMatch: result.meaningMatch,
                overall: result.overall,
                isTargetWordUsed: result.isTargetWordUsed,
                targetWord: result.targetWord,
                feedback: result.feedback,
              }}
              outlineReport={{
                targetWordCount: 1,
                usedWordCount: result.isTargetWordUsed ? 1 : 0,
                usedWords: result.isTargetWordUsed && result.targetWord ? [result.targetWord] : [],
                unusedWords: !result.isTargetWordUsed && result.targetWord ? [result.targetWord] : [],
                outlineFeedback: result.feedback,
              }}
              extraActions={
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 12, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() => {
                      setText('');
                      setResult(null);
                      handleShufflePrompt();
                    }}
                    style={{ fontWeight: 700, borderRadius: 8 }}
                  >
                    🔄 Luyện đề khác cho từ này
                  </button>
                  <button
                    type="button"
                    className="btn primary"
                    onClick={() => {
                      handleRandomWord();
                    }}
                    style={{ fontWeight: 800, borderRadius: 8 }}
                  >
                    🎲 Đổi sang từ vựng khác
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
