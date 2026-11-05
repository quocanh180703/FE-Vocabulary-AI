import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  learnApi,
  wordApi,
  personalizedApi,
  aiApi,
  errMsg,
  daysOverdue,
  isMeaningfulVietnamese,
  cleanDefinitionText,
  analyzeWordRelations,
  generateFallbackExplanation,
  isWordFavorited,
} from '../api';
import type { Word, ProgressItem } from '../api';
import { Mascot, Icon } from '../components/icons';
import { AiExplanationBox } from '../components/AiExplanationBox';
import { useAuth } from '../auth/AuthContext';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { AnimatedCounter, AnimatedProgressBar, MotionCard } from '../motion';
import viAvatar from '../assets/vi-3d.webp';

interface FlashcardWord {
  id: string | number;
  word: string;
  pronunciation?: string;
  meaning: string;
  vietnameseMeaning?: string;
  definition?: string;
  example?: string;
  level: string;
  partOfSpeech?: string;
  audioUrl?: string;
  progressId?: number;
  reviewCount?: number;
  isSrs?: boolean;
  overdue?: number;
}

const MODES = [
  { id: 'RECOMMENDED', label: '✨ AI gợi ý', badge: true },
  { id: 'SRS', label: '⏰ Cần ôn (SRS)' },
  { id: 'FAVORITES', label: '❤️ Yêu thích' },
  { id: 'A1', label: 'A1' },
  { id: 'A2', label: 'A2' },
  { id: 'B1', label: 'B1' },
  { id: 'B2', label: 'B2' },
  { id: 'C1', label: 'C1' },
  { id: 'ALL', label: 'Tất cả' },
];

function shuffleArray<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default function Review() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get('mode') || 'RECOMMENDED';
  const [selectedMode, setSelectedMode] = useState<string>(initialMode);

  // Storage key for roadmap data
  const storageKey = `vocab_ai_roadmap_${user?.id || user?.username || 'default'}`;
  const getInitialLevel = () => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.profile?.currentLevel) return parsed.profile.currentLevel;
      }
    } catch { }
    return 'B1';
  };

  const [recommendedLevel, setRecommendedLevel] = useState<string>(getInitialLevel);
  const [cards, setCards] = useState<FlashcardWord[]>([]);
  const [i, setI] = useState(0);
  const [flip, setFlip] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  // Translation & AI explanation state
  const [activeVi, setActiveVi] = useState<string>('');
  const [aiDetail, setAiDetail] = useState<string | null>(null);
  const [loadingAiDetail, setLoadingAiDetail] = useState<boolean>(false);

  // Counters
  const [remembered, setRemembered] = useState(0);
  const [forgotten, setForgotten] = useState(0);

  // Favorite tracking for flashcard heart button (tracks both IDs and word texts)
  const [favoriteKeys, setFavoriteKeys] = useState<Set<string>>(new Set());

  const isCurFavorited = (card?: FlashcardWord | null): boolean => {
    return isWordFavorited(card, favoriteKeys);
  };

  useEffect(() => {
    const fetchFavs = () => {
      wordApi.favorites(0, 500)
        .then(({ data }) => {
          const keys = new Set<string>();
          (data?.content || []).forEach((w: any) => {
            if (w.id != null) keys.add(String(w.id).toLowerCase().trim());
            if (w.word) keys.add(String(w.word).toLowerCase().trim());
            if (w.lemma) keys.add(String(w.lemma).toLowerCase().trim());
          });
          (data?.localIds || []).forEach((id: any) => {
            if (id != null) keys.add(String(id).toLowerCase().trim());
          });
          setFavoriteKeys(keys);
        })
        .catch(() => {});
    };
    fetchFavs();
    window.addEventListener('vocab_favorites_changed', fetchFavs);
    return () => window.removeEventListener('vocab_favorites_changed', fetchFavs);
  }, []);

  const nav = useNavigate();
  const cardRef = useRef<HTMLDivElement>(null);
  const shouldReduce = useReducedMotion();

  const toggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const cur = cards[i];
    if (!cur?.id && !cur?.word) return;
    const idKey = cur.id != null ? String(cur.id).toLowerCase().trim() : '';
    const wordKey = cur.word ? cur.word.toLowerCase().trim() : '';
    const isFav = isCurFavorited(cur);

    // Optimistic UI update: immediately toggle in set
    setFavoriteKeys((prev) => {
      const next = new Set(prev);
      if (isFav) {
        if (idKey) next.delete(idKey);
        if (wordKey) next.delete(wordKey);
      } else {
        if (idKey) next.add(idKey);
        if (wordKey) next.add(wordKey);
      }
      return next;
    });

    try {
      if (isFav) {
        await wordApi.unfavorite(cur.id, cur.word);
      } else {
        await wordApi.favorite(cur.id, {
          id: cur.id,
          word: cur.word,
          lemma: cur.word,
          meaning: cur.meaning || cur.vietnameseMeaning || '',
          vietnameseMeaning: cur.vietnameseMeaning || cur.meaning || '',
          level: cur.level,
          partOfSpeech: cur.partOfSpeech,
          pronunciation: cur.pronunciation,
          definition: cur.definition,
          example: cur.example,
          audioUrl: cur.audioUrl,
        });
      }
      window.dispatchEvent(new CustomEvent('vocab_favorites_changed'));
    } catch {
      // Revert if API fails
      setFavoriteKeys((prev) => {
        const next = new Set(prev);
        if (isFav) {
          if (idKey) next.add(idKey);
          if (wordKey) next.add(wordKey);
        } else {
          if (idKey) next.delete(idKey);
          if (wordKey) next.delete(wordKey);
        }
        return next;
      });
    }
  };

  // 1. Fetch AI level recommendation on mount & listen to roadmap updates
  useEffect(() => {
    personalizedApi.level()
      .then(({ data }) => {
        if (data) {
          setRecommendedLevel(data);
        }
      })
      .catch(() => { });

    const onRoadmapAnalyzed = (e: any) => {
      const lvl = e?.detail?.currentLevel;
      if (lvl) setRecommendedLevel(lvl);
    };
    window.addEventListener('vocab_roadmap_analyzed', onRoadmapAnalyzed);
    return () => window.removeEventListener('vocab_roadmap_analyzed', onRoadmapAnalyzed);
  }, [storageKey]);

  // 2. Fetch words based on selectedMode (randomized across levels)
  const loadCards = async (mode: string, recLevel: string) => {
    setLoading(true);
    setErr('');
    setI(0);
    setFlip(false);
    setAiDetail(null);
    setRemembered(0);
    setForgotten(0);

    try {
      if (mode === 'FAVORITES') {
        const { data } = await wordApi.favorites(0, 100);
        const favWords = data.content || [];
        const formatted: FlashcardWord[] = favWords.map((w) => {
          const wText = w.word || w.lemma || '';
          const rawVi = w.vietnameseMeaning || w.meaning;
          const vi = isMeaningfulVietnamese(rawVi) ? rawVi : (rawVi || '');
          return {
            id: w.id,
            word: wText,
            pronunciation: w.pronunciation,
            meaning: vi,
            vietnameseMeaning: vi,
            definition: cleanDefinitionText(w.definition),
            example: w.example,
            level: w.level || w.cefrLevel || 'A1',
            partOfSpeech: w.partOfSpeech,
            audioUrl: w.audioUrl,
            isSrs: false,
          };
        });
        setCards(shuffleArray(formatted));
      } else if (mode === 'SRS') {
        const { data } = await learnApi.queue(30);
        const rawItems: ProgressItem[] = data.content || [];
        const formatted: FlashcardWord[] = rawItems.map((it) => {
          const wText = it.word.word || it.word.lemma || '';
          const rawVi = it.word.vietnameseMeaning || it.word.meaning;
          const vi = isMeaningfulVietnamese(rawVi) ? rawVi : '';
          return {
            id: it.word.id,
            word: wText,
            pronunciation: it.word.pronunciation,
            meaning: vi,
            vietnameseMeaning: vi,
            definition: cleanDefinitionText(it.word.definition),
            example: it.word.example,
            level: it.word.level || it.word.cefrLevel || 'A1',
            partOfSpeech: it.word.partOfSpeech,
            audioUrl: it.word.audioUrl,
            progressId: it.id,
            reviewCount: it.reviewCount,
            isSrs: true,
            overdue: daysOverdue(it),
          };
        });
        setCards(shuffleArray(formatted));
      } else {
        const targetLevel = mode === 'RECOMMENDED' ? recLevel : mode === 'ALL' ? undefined : mode;
        let rawWords: Word[] = [];

        // 1. Try backend random-batch endpoint for uniform randomness across all level words
        try {
          const res = await wordApi.randomBatch({
            level: targetLevel,
            limit: 25,
          });
          if (Array.isArray(res.data) && res.data.length > 0) {
            rawWords = res.data;
          }
        } catch {
          // Fallback to client-side multi-page sampling
        }

        // 2. Fallback: multi-page sampling across dictionary to avoid alphabetical clustering
        if (rawWords.length === 0) {
          const LEVEL_MAX_PAGES: Record<string, number> = {
            A1: 25,
            A2: 25,
            B1: 20,
            B2: 35,
            C1: 40,
            ALL: 120,
          };
          const maxP = LEVEL_MAX_PAGES[targetLevel || 'ALL'] || 20;
          const p1 = Math.floor(Math.random() * Math.max(1, Math.floor(maxP / 2)));
          const p2 = Math.floor(Math.max(1, Math.floor(maxP / 2)) + Math.random() * Math.max(1, Math.floor(maxP / 2)));

          try {
            const [res1, res2] = await Promise.all([
              wordApi.list({ level: targetLevel, page: p1, size: 15 }),
              wordApi.list({ level: targetLevel, page: p2, size: 15 }),
            ]);
            const words1 = res1.data?.content || [];
            const words2 = res2.data?.content || [];
            const combined = [...words1, ...words2];
            if (combined.length > 0) {
              const seen = new Set<string | number>();
              rawWords = combined.filter((w) => {
                const k = w.id || w.word || w.lemma;
                if (!k || seen.has(k)) return false;
                seen.add(k);
                return true;
              });
            }
          } catch {
            // ignore
          }

          if (rawWords.length === 0) {
            const fallback = await wordApi.list({
              level: targetLevel,
              page: 0,
              size: 25,
            });
            rawWords = fallback.data?.content || [];
          }
        }

        // 3. Shuffle array to ensure non-alphabetical appearance every single time
        const shuffled = shuffleArray(rawWords);
        const formatted: FlashcardWord[] = shuffled.map((w) => {
          const wText = w.word || w.lemma || '';
          const rawVi = w.vietnameseMeaning || w.meaning;
          const vi = isMeaningfulVietnamese(rawVi) ? rawVi : '';
          return {
            id: w.id,
            word: wText,
            pronunciation: w.pronunciation,
            meaning: vi,
            vietnameseMeaning: vi,
            definition: cleanDefinitionText(w.definition),
            example: w.example,
            level: w.level || w.cefrLevel || (targetLevel || 'A1'),
            partOfSpeech: w.partOfSpeech,
            audioUrl: w.audioUrl,
            isSrs: false,
            overdue: 0,
          };
        });
        setCards(formatted);
      }
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCards(selectedMode, recommendedLevel);
  }, [selectedMode, recommendedLevel]);

  const cur = cards[i];

  // Resolve and set Vietnamese meaning for current card directly
  useEffect(() => {
    if (!cur?.word) {
      setActiveVi('');
      return;
    }

    setAiDetail(null);
    const rawVi = cur.vietnameseMeaning || cur.meaning;
    const vi = isMeaningfulVietnamese(rawVi) ? rawVi.trim() : '';
    setActiveVi(vi);
  }, [cur?.word, cur?.vietnameseMeaning, cur?.meaning, i]);

  // Play pronunciation via Web Speech API or audioUrl
  const playAudio = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!cur) return;
    if (cur.audioUrl) {
      new Audio(cur.audioUrl).play().catch(() => { });
    } else if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(cur.word);
      u.lang = 'en-US';
      u.rate = 0.9;
      window.speechSynthesis.speak(u);
    }
  };

  const answer = async (ok: boolean) => {
    if (!cur) return;

    if (ok) {
      // 1. Người dùng nhớ từ này -> Chuyển sang từ tiếp theo
      setRemembered((r) => r + 1);
      if (cur.isSrs) {
        try { await learnApi.review(cur.id, true); } catch { /* ignore */ }
      } else {
        // Tự động thêm vào danh sách học để đưa vào SRS
        try { await learnApi.start(cur.id); } catch { /* ignore */ }
      }

      setFlip(false);
      setAiDetail(null);

      if (i + 1 >= cards.length) {
        setI(-1); // Hoàn thành phiên ôn tập
      } else {
        setI(i + 1);
      }
    } else {
      // 2. Người dùng CHƯA NHỚ từ này:
      // Yêu cầu: "khi tôi bấm vào chữ chưa nhớ phải quay lại từ trước đó"
      setForgotten((f) => f + 1);
      if (cur.isSrs) {
        try { await learnApi.review(cur.id, false); } catch { /* ignore */ }
      }

      setFlip(false);
      setAiDetail(null);

      if (i > 0) {
        setI(i - 1); // Quay lại từ trước đó
      } else {
        // Đang ở thẻ đầu tiên (i = 0), lật về mặt trước để người học xem lại từ đầu
        setFlip(false);
      }
    }
  };

  const explainWithAi = async () => {
    if (!cur) return;
    if (!flip) setFlip(true);
    if (aiDetail) {
      setAiDetail(null);
      return;
    }
    setLoadingAiDetail(true);
    try {
      const { data } = await aiApi.explain(cur.id, cur.word, {
        partOfSpeech: cur.partOfSpeech,
        level: cur.level,
        vietnameseMeaning: activeVi || cur.meaning,
      });
      setAiDetail(data.meaning);
    } catch {
      setAiDetail(
        generateFallbackExplanation(cur.word, cur.level, cur.partOfSpeech, activeVi || cur.meaning)
      );
    } finally {
      setLoadingAiDetail(false);
    }
  };

  // Keyboard shortcuts (Space = flip, ArrowLeft = Chưa nhớ, ArrowRight = Đã nhớ)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (i === -1 || cards.length === 0) return;

      if (e.code === 'Space') {
        e.preventDefault();
        setFlip((f) => !f);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        answer(false);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        answer(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cur, i, cards.length]);

  // Completion Screen matching review-done.html
  if (i === -1) {
    const totalDone = remembered + forgotten;
    return (
      <motion.div
        className="content"
        style={{ maxWidth: 820 }}
        initial={{ opacity: 0, scale: 0.96, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      >
        <MotionCard style={{ textAlign: 'center', padding: '44px 34px', margin: '26px auto 0' }}>
          <img src={viAvatar} alt="Vi" style={{ width: 110, height: 110, borderRadius: '50%', objectFit: 'cover', boxShadow: 'var(--sh)', margin: '0 auto' }} />
          <h1 style={{ fontSize: 31, fontWeight: 900, marginTop: 20 }}>Hoàn thành phiên ôn tập!</h1>
          <div className="sub mt8">
            Bạn vừa ôn xong <b>{totalDone}</b> từ vựng — chuỗi streak được giữ vững.
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 26, flexWrap: 'wrap' }}>
            <div className="kpi" style={{ minWidth: 150 }}><div className="lbl">Từ đã ôn</div><div className="num">{totalDone}</div></div>
            <div className="kpi" style={{ minWidth: 150 }}><div className="lbl">Đã nhớ</div><div className="num" style={{ color: 'var(--green-dark)' }}>{remembered}</div></div>
            <div className="kpi" style={{ minWidth: 150 }}><div className="lbl">Cần ôn lại sớm</div><div className="num" style={{ color: 'var(--red-dark)' }}>{forgotten}</div></div>
          </div>
          {forgotten > 0 && (
            <div className="sub mt16">{forgotten} từ chưa nhớ sẽ quay lại hàng đợi vào ngày mai theo lịch SRS.</div>
          )}
          <div className="btn-row mt16" style={{ justifyContent: 'center' }}>
            {forgotten > 0 && (
              <button className="btn ghost" style={{ minHeight: 52, padding: '0 24px' }} onClick={() => loadCards(selectedMode, recommendedLevel)}>
                Ôn lại {forgotten} từ chưa nhớ
              </button>
            )}
            <button className="btn" style={{ minHeight: 52, padding: '0 24px' }} onClick={() => nav('/dashboard')}>
              Về Tổng quan
            </button>
          </div>
        </MotionCard>
      </motion.div>
    );
  }

  const activeLevelDisplay = selectedMode === 'RECOMMENDED'
    ? `✨ AI gợi ý (${recommendedLevel})`
    : selectedMode === 'SRS'
      ? '⏰ Từ cần ôn (SRS)'
      : selectedMode === 'ALL'
        ? 'Tất cả cấp độ'
        : `Cấp độ ${selectedMode}`;

  return (
    <div className="content narrow">
      {/* Header */}
      <div className="pagehead">
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '4px 12px', background: 'rgba(79, 70, 229, 0.08)', borderRadius: 99, color: 'var(--primary)', fontSize: 13, fontWeight: 800, marginBottom: 8 }}>
          <Icon n="bulb" s={14} /> Flashcard Spaced Repetition (SRS)
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
          <div>
            <h1>Ôn tập Flashcard thông minh</h1>
            <div className="sub">
              {loading
                ? 'Đang chuẩn bị bộ thẻ từ vựng...'
                : cards.length === 0
                  ? `Chưa có từ nào ở chế độ "${activeLevelDisplay}"`
                  : `Thẻ ${i + 1} / ${cards.length} · ${activeLevelDisplay}`}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              className="btn sm ghost"
              onClick={() => loadCards(selectedMode, recommendedLevel)}
              title="Tải một bộ thẻ từ vựng ngẫu nhiên mới"
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, minHeight: 38, padding: '0 14px' }}
            >
              🎲 Đổi bộ ngẫu nhiên
            </button>
            <span className="pill green" style={{ fontSize: 12.5, fontWeight: 800, background: '#DCFCE7', color: '#15803D', border: '1px solid #BBF7D0', padding: '5px 12px' }}>
              ✓ <AnimatedCounter value={remembered} /> nhớ
            </span>
            <span className="pill warn" style={{ fontSize: 12.5, fontWeight: 800, background: '#FEE2E2', color: '#DC2626', border: '1px solid #FECACA', padding: '5px 12px' }}>
              ✗ <AnimatedCounter value={forgotten} /> chưa
            </span>
          </div>
        </div>
      </div>

      {/* AI Recommendation Banner */}
      {recommendedLevel && (
        <MotionCard
          style={{
            background: 'linear-gradient(135deg, #F5F3FF 0%, #EEF2FF 100%)',
            border: '1px solid #DDD6FE',
            padding: '14px 20px',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 14,
            flexWrap: 'wrap',
            borderRadius: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Mascot s={40} />
            <div style={{ fontSize: 13.5, color: '#1E1B4B', lineHeight: 1.5 }}>
              <b style={{ color: 'var(--primary)' }}>Gợi ý từ Vi AI:</b> Dựa trên phân tích năng lực gần đây của bạn, Vi khuyên bạn nên tập trung ôn Flashcard cấp độ <b style={{ color: 'var(--primary)' }}>{recommendedLevel}</b> để củng cố phản xạ tốt nhất.
            </div>
          </div>
          {selectedMode !== 'RECOMMENDED' && (
            <button
              className="btn sm ghost"
              onClick={() => {
                if (selectedMode === 'RECOMMENDED') {
                  loadCards('RECOMMENDED', recommendedLevel);
                } else {
                  setSelectedMode('RECOMMENDED');
                }
              }}
              style={{ borderColor: '#C7D2FE', color: 'var(--primary)', background: '#FFFFFF', minHeight: 36, fontSize: 13 }}
            >
              Chọn theo gợi ý AI ({recommendedLevel})
            </button>
          )}
        </MotionCard>
      )}

      {/* Mode / Level Selector Chips */}
      <div className="chips" style={{ marginBottom: 16 }}>
        {MODES.map((m) => {
          const isRec = m.id === 'RECOMMENDED';
          const isSelected = selectedMode === m.id;
          return (
            <button
              key={m.id}
              className={'chip' + (isSelected ? ' on' : '')}
              onClick={() => {
                if (selectedMode === m.id) {
                  // Re-clicking current mode chip triggers fresh random cards
                  loadCards(m.id, recommendedLevel);
                } else {
                  setSelectedMode(m.id);
                }
              }}
              style={
                isRec
                  ? {
                    borderColor: isSelected ? 'var(--ink)' : 'var(--primary)',
                    background: isSelected ? 'var(--ink)' : 'var(--tint-blue, #e0f2fe)',
                    color: isSelected ? '#fff' : 'var(--primary-dark, #0369a1)',
                    fontWeight: 800,
                  }
                  : undefined
              }
              title={`Bấm để tải từ vựng ngẫu nhiên ${m.label}`}
            >
              {isRec ? `✨ AI gợi ý (${recommendedLevel})` : m.label}
            </button>
          );
        })}
      </div>

      {/* Progress Bar */}
      {cards.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <AnimatedProgressBar value={((i + 1) / cards.length) * 100} />
        </div>
      )}

      {err && <div className="error">{err}</div>}

      {/* Loading state */}
      {loading && (
        <div className="card center" style={{ padding: 60 }}>
          <div className="loading">Đang chuẩn bị bộ thẻ flashcard...</div>
        </div>
      )}

      {/* Flashcard Component */}
      {!loading && cur && (
        <>
          <motion.div
            key={`card-${cur.id}-${i}`}
            initial={{ opacity: 0, y: 12, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            style={{ width: '100%' }}
          >
            <div
              ref={cardRef}
              className="card flash"
              onClick={() => setFlip(!flip)}
              style={{
                position: 'relative',
                cursor: 'pointer',
                minHeight: 400,
                padding: '40px 28px',
                border: '1.5px solid var(--line)',
                borderRadius: 22,
                background: flip
                  ? 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)'
                  : 'linear-gradient(180deg, #FFFFFF 0%, #FAFAFC 100%)',
                boxShadow: '0 12px 32px -4px rgba(15, 23, 42, 0.08)',
                transition: 'background 0.3s ease, border-color 0.2s ease',
                perspective: 1200,
              }}
            >
              {/* Top Bar on Flashcard */}
              <div
                style={{
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  position: 'absolute',
                  top: 16,
                  left: 0,
                  padding: '0 22px',
                }}
              >
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span className="pill level" style={{ fontSize: 11.5, padding: '3px 10px', fontWeight: 800 }}>
                    {cur.level}
                  </span>
                  {(() => {
                    const r = analyzeWordRelations(cur.word, cur.partOfSpeech);
                    return cur.partOfSpeech ? (
                      <span
                        className="pill"
                        style={{
                          fontSize: 11.5,
                          fontWeight: 800,
                          padding: '3px 10px',
                          background: r.posBadge.bg,
                          color: r.posBadge.color,
                          border: `1px solid ${r.posBadge.border}`,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <span>{r.posBadge.icon}</span>
                        <span>{r.posBadge.label}</span>
                      </span>
                    ) : null;
                  })()}
                  {cur.isSrs && (
                    <span className="pill warn" style={{ fontSize: 11.5, padding: '3px 10px', fontWeight: 800 }}>
                      SRS
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {(() => {
                    const curIsFav = isCurFavorited(cur);
                    return (
                      <button
                        type="button"
                        className="btn ghost sm"
                        onClick={toggleFavorite}
                        title={curIsFav ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'}
                        style={{
                          borderRadius: '50%',
                          width: 38,
                          height: 38,
                          padding: 0,
                          background: curIsFav ? '#FEE2E2' : 'rgba(100, 116, 139, 0.08)',
                          color: curIsFav ? '#EF4444' : '#94A3B8',
                          border: `1.5px solid ${curIsFav ? '#FCA5A5' : 'var(--line)'}`,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                        aria-label="yêu thích"
                      >
                        <svg
                          width={18}
                          height={18}
                          viewBox="0 0 24 24"
                          fill={curIsFav ? '#EF4444' : 'none'}
                          stroke={curIsFav ? '#EF4444' : 'currentColor'}
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          style={{ display: 'block', transition: 'fill 0.15s ease, stroke 0.15s ease' }}
                        >
                          <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                        </svg>
                      </button>
                    );
                  })()}

                  <button
                    type="button"
                    className="btn ghost sm"
                    onClick={playAudio}
                    title="Nghe phát âm (Phím P)"
                    style={{ borderRadius: '50%', width: 38, height: 38, padding: 0, background: 'rgba(79, 70, 229, 0.08)', color: 'var(--primary)', border: '1px solid #C7D2FE' }}
                    aria-label="phát âm"
                  >
                    <Icon n="vol" s={18} />
                  </button>
                </div>
              </div>

              {/* Front & Back 3D Animated Flip */}
              <AnimatePresence mode="wait" initial={false}>
                {!flip ? (
                  <motion.div
                    key="front"
                    initial={shouldReduce ? { opacity: 0 } : { opacity: 0, rotateY: 90 }}
                    animate={shouldReduce ? { opacity: 1 } : { opacity: 1, rotateY: 0 }}
                    exit={shouldReduce ? { opacity: 0 } : { opacity: 0, rotateY: -90 }}
                    transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 32, transformStyle: 'preserve-3d' }}
                  >
                    <div className="big" style={{ fontSize: 50, fontWeight: 900, color: 'var(--ink)', letterSpacing: '-0.5px' }}>
                      {cur.word}
                    </div>
                    {cur.pronunciation && (
                      <div className="sub mt8" style={{ fontSize: 20, color: 'var(--muted)', fontWeight: 600 }}>
                        {cur.pronunciation}
                      </div>
                    )}
                    <div
                      style={{
                        marginTop: 40,
                        fontSize: 13.5,
                        color: 'var(--primary)',
                        fontWeight: 800,
                        background: '#EEF2FF',
                        border: '1px solid #C7D2FE',
                        padding: '9px 20px',
                        borderRadius: 99,
                        boxShadow: '0 2px 8px rgba(79, 70, 229, 0.08)',
                      }}
                    >
                      👆 Bấm vào thẻ để lật xem nghĩa tiếng Việt
                    </div>
                    <div className="sub mt8" style={{ fontSize: 12.5 }}>
                      Phím tắt: [Space] Lật thẻ · [←] Chưa nhớ · [→] Đã nhớ
                    </div>
                  </motion.div>
                ) : (
                  /* Back of Card */
                  <motion.div
                    key="back"
                    initial={shouldReduce ? { opacity: 0 } : { opacity: 0, rotateY: 90 }}
                    animate={shouldReduce ? { opacity: 1 } : { opacity: 1, rotateY: 0 }}
                    exit={shouldReduce ? { opacity: 0 } : { opacity: 0, rotateY: -90 }}
                    transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', marginTop: 8, transformStyle: 'preserve-3d' }}
                  >
                    {(() => {
                      const rel = analyzeWordRelations(cur.word, cur.partOfSpeech);
                      return (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--ink)' }}>
                              {cur.word}
                            </div>
                            {cur.partOfSpeech && (
                              <span
                                style={{
                                  fontSize: 12,
                                  fontWeight: 800,
                                  padding: '3px 10px',
                                  borderRadius: 99,
                                  background: rel.posBadge.bg,
                                  color: rel.posBadge.color,
                                  border: `1px solid ${rel.posBadge.border}`,
                                }}
                              >
                                {rel.posBadge.icon} {rel.posBadge.shortLabel}
                              </span>
                            )}
                          </div>
                          {cur.pronunciation && (
                            <div className="sub mt4" style={{ fontSize: 16, color: 'var(--muted)', fontWeight: 600 }}>
                              {cur.pronunciation}
                            </div>
                          )}

                          {/* VIETNAMESE MEANING HIGHLIGHT */}
                          <div
                            style={{
                              marginTop: 16,
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              width: '100%',
                              maxWidth: 540,
                              background: 'linear-gradient(135deg, #ECFDF5 0%, #F0FDF4 100%)',
                              padding: '18px 24px',
                              borderRadius: 16,
                              border: '1.5px solid #A7F3D0',
                              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.08)',
                            }}
                          >
                            <div
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                fontSize: 11.5,
                                fontWeight: 800,
                                color: '#047857',
                                background: '#D1FAE5',
                                padding: '3px 10px',
                                borderRadius: 99,
                                border: '1px solid #A7F3D0',
                                letterSpacing: 0.5,
                              }}
                            >
                              🇻🇳 NGHĨA TIẾNG VIỆT
                            </div>

                            <div
                              className="mean"
                              style={{
                                fontSize: 26,
                                fontWeight: 900,
                                color: '#065F46',
                                textAlign: 'center',
                                marginTop: 8,
                                lineHeight: 1.35,
                              }}
                            >
                              {activeVi || (
                                <span style={{ fontSize: 16, color: 'var(--muted)', fontStyle: 'italic' }}>
                                  Đang cập nhật nghĩa tiếng Việt...
                                </span>
                              )}
                            </div>
                          </div>

                          {/* WORD & ADVERB DISAMBIGUATION / RELATIONSHIP BOX */}
                          {rel.warningNote && (
                            <div
                              style={{
                                marginTop: 14,
                                width: '100%',
                                maxWidth: 540,
                                background: '#FFFBEB',
                                border: '1.5px solid #FCD34D',
                                borderRadius: 14,
                                padding: '14px 18px',
                                textAlign: 'left',
                                fontSize: 13,
                                color: '#92400E',
                                boxShadow: '0 2px 8px rgba(245, 158, 11, 0.08)',
                              }}
                            >
                              <div style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                <span>🔍</span>
                                <span>Phân biệt Trạng từ & Từ gốc (Tránh nhầm lẫn):</span>
                              </div>
                              <div style={{ lineHeight: 1.5 }}>{rel.warningNote}</div>
                              {rel.exampleNote && (
                                <div style={{ marginTop: 6, fontStyle: 'italic', color: '#B45309', fontSize: 12.5 }}>
                                  👉 {rel.exampleNote}
                                </div>
                              )}
                            </div>
                          )}

                          {!rel.warningNote && rel.isAdverb && rel.rootWord && (
                            <div
                              style={{
                                marginTop: 12,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 8,
                                fontSize: 12.5,
                                background: '#F5F3FF',
                                border: '1px solid #DDD6FE',
                                color: '#6D28D9',
                                padding: '6px 14px',
                                borderRadius: 99,
                                maxWidth: 540,
                              }}
                            >
                              <span>💡 Tính từ gốc tương ứng:</span>
                              <b style={{ textDecoration: 'underline' }}>{rel.rootWord}</b>
                            </div>
                          )}

                          {!rel.warningNote && rel.isAdjective && rel.correspondingAdverb && (
                            <div
                              style={{
                                marginTop: 12,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 8,
                                fontSize: 12.5,
                                background: '#EFF6FF',
                                border: '1px solid #BFDBFE',
                                color: '#1D4ED8',
                                padding: '6px 14px',
                                borderRadius: 99,
                                maxWidth: 540,
                              }}
                            >
                              <span>⚡ Trạng từ tương ứng:</span>
                              <b style={{ textDecoration: 'underline' }}>{rel.correspondingAdverb}</b>
                            </div>
                          )}
                        </>
                      );
                    })()}

                    {/* Oxford English Definition */}
                    {cur.definition && (
                      <div
                        style={{
                          marginTop: 14,
                          fontSize: 13.5,
                          maxWidth: 540,
                          textAlign: 'left',
                          lineHeight: 1.55,
                          color: 'var(--muted)',
                          background: '#F8FAFC',
                          padding: '10px 16px',
                          borderRadius: 10,
                          border: '1px solid var(--line)',
                        }}
                      >
                        <b style={{ color: 'var(--ink)' }}>English: </b>
                        {cleanDefinitionText(cur.definition)}
                      </div>
                    )}

                    {/* Example sentence */}
                    {cur.example && (
                      <div
                        style={{
                          marginTop: 12,
                          fontSize: 13.5,
                          fontStyle: 'italic',
                          color: 'var(--ink)',
                          background: 'rgba(79, 70, 229, 0.04)',
                          padding: '10px 16px',
                          borderRadius: 10,
                          maxWidth: 540,
                          textAlign: 'left',
                          lineHeight: 1.5,
                          borderLeft: '3px solid var(--primary)',
                        }}
                      >
                        💬 "{cur.example}"
                      </div>
                    )}

                    {cur.overdue !== undefined && cur.overdue > 0 && (
                      <div className="sub mt8" style={{ fontSize: 12, color: 'var(--red-dark)' }}>
                        Trễ lịch ôn tập {cur.overdue} ngày
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Action Button Row */}
          <div className="btn-row mt16">
            <button
              type="button"
              className="btn softred"
              style={{ flex: 1, minHeight: 52 }}
              onClick={() => answer(false)}
            >
              Chưa nhớ
            </button>
            <button
              type="button"
              className="btn ghost"
              style={{
                minHeight: 52,
                padding: '0 22px',
                color: 'var(--primary, #1565C0)',
                borderColor: '#C7D2FE',
                background: aiDetail ? '#EEF2FF' : '#FFFFFF',
                fontWeight: 800,
                fontSize: 14,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                transition: 'all 0.2s ease',
              }}
              onClick={explainWithAi}
              disabled={loadingAiDetail}
            >
              <Icon n="spark" s={18} />
              {loadingAiDetail ? 'Vi đang giải thích...' : aiDetail ? 'Thu gọn giải thích' : 'Vi giải thích chuyên sâu'}
            </button>
            <button
              type="button"
              className="btn green"
              style={{ flex: 1, minHeight: 52 }}
              onClick={() => answer(true)}
            >
              Đã nhớ
            </button>
          </div>

          {/* AI Explanation Area / Vi Coach Box */}
          {loadingAiDetail && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="card mt16"
              style={{
                padding: '18px 24px',
                background: 'linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 100%)',
                border: '1.5px solid #C4B5FD',
                borderRadius: 16,
              }}
            >
              <div className="coach" style={{ alignItems: 'center' }}>
                <img src={viAvatar} alt="Vi" style={{ width: 50, height: 50, borderRadius: '50%', objectFit: 'cover' }} />
                <div>
                  <div style={{ fontWeight: 800, color: '#6D28D9', display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
                    <Icon n="spark" s={16} /> Vi đang soạn lời giải thích chuyên sâu...
                  </div>
                  <div className="sub mt4" style={{ fontSize: 13, color: '#7C3AED' }}>
                    Đang tổng hợp ví dụ thực tế, từ đồng nghĩa/trái nghĩa, ngữ cảnh sử dụng và mẹo ghi nhớ cho từ “{cur.word}”.
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {aiDetail && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="mt16"
              style={{ width: '100%' }}
            >
              <AiExplanationBox explanation={aiDetail} />
            </motion.div>
          )}

          {!aiDetail && !loadingAiDetail && (
            <div className="card mt16">
              <div className="coach">
                <img src={viAvatar} alt="Vi" style={{ width: 54, height: 54, borderRadius: '50%', objectFit: 'cover' }} />
                <div className="bubble">
                  <b>Vi đồng hành:</b> “{cur.word}” là từ vựng quan trọng ở cấp độ {cur.level}. Bạn có thể bấm “Vi giải thích chuyên sâu” để xem ngữ cảnh, từ đồng nghĩa và mẹo ghi nhớ!
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Empty State */}
      {!loading && cards.length === 0 && !err && (
        <div className="empty" style={{ textAlign: 'center', padding: '48px 16px' }}>
          <Mascot s={80} />
          <div style={{ marginTop: 16, fontSize: 18, fontWeight: 700 }}>
            {selectedMode === 'SRS'
              ? 'Hết từ cần ôn SRS — giỏi quá!'
              : `Chưa có từ vựng nào ở cấp độ "${activeLevelDisplay}"`}
          </div>
          <div className="sub mt8" style={{ maxWidth: 420, margin: '8px auto 0' }}>
            {selectedMode === 'SRS'
              ? 'Hôm nay bạn đã ôn sạch các từ đến hạn. Hãy chọn một cấp độ khác bên trên để tiếp tục luyện Flashcard nhé!'
              : 'Hãy thử chọn một cấp độ khác hoặc bấm vào "AI gợi ý" để ôn tập từ vựng thích hợp.'}
          </div>
          <div className="btn-row mt16" style={{ justifyContent: 'center' }}>
            <button
              className="btn"
              onClick={() => setSelectedMode(recommendedLevel || 'A1')}
            >
              Ôn Flashcard cấp độ {recommendedLevel || 'A1'}
            </button>
            <button className="btn ghost" onClick={() => nav('/words')}>
              Khám phá kho từ vựng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
