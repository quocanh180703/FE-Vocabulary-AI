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
  myWordsApi,
} from '../api';
import type { Word, ProgressItem } from '../api';
import { TOPICS, TOPIC_LABELS } from '../constants/topics';
import { useUsage } from '../context/UsageContext';
import { Icon } from '../components/icons';
import { ViLoadingScreen } from '../components/states/ViLoadingScreen';
import { ApiErrorState } from '../components/states/SageStates';
import { UiIcon, type UiIconName } from '../components/UiIcon';
import { ViMascotImage } from '../components/ViMascotImage';
import { SplitHeading } from '../components/SageEffects';
import { AiExplanationBox } from '../components/AiExplanationBox';
import { useAuth } from '../auth/AuthContext';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import {
  AnimatedCounter,
  AnimatedProgressBar,
  MotionCard,
  motionTokens,
} from '../motion';

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

const STUDY_MODES: ReadonlyArray<{ id: string; label: string; icon: UiIconName }> = [
  { id: 'RECOMMENDED', label: 'AI gợi ý', icon: 'sparkles' },
  { id: 'SRS', label: 'Cần ôn (SRS)', icon: 'clock' },
  { id: 'TOPIC', label: 'Theo chủ đề', icon: 'folder' },
  { id: 'FAVORITES', label: 'Yêu thích', icon: 'heart' },
  { id: 'MY_WORDS', label: 'Từ của tôi', icon: 'file' },
];

const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'ALL'] as const;

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
  const [searchParams, setSearchParams] = useSearchParams();
  const initialMode = searchParams.get('mode') || 'RECOMMENDED';
  const [selectedMode, setSelectedMode] = useState<string>(initialMode);

  useEffect(() => {
    const m = searchParams.get('mode');
    if (m && m !== selectedMode) {
      setSelectedMode(m);
    }
  }, [searchParams]);

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
  const { isVip, openUpgradeModal } = useUsage();
  const [selectedTopic, setSelectedTopic] = useState<string | null>(searchParams.get('topic') || null);
  const [topicLevel, setTopicLevel] = useState<string>(() => {
    const init = getInitialLevel();
    return init || 'A1';
  });
  const [topicCounts, setTopicCounts] = useState<Record<string, number>>({});
  const [loadingTopicCounts, setLoadingTopicCounts] = useState<boolean>(false);
  const [topicUpgradeRequired, setTopicUpgradeRequired] = useState<boolean>(false);

  useEffect(() => {
    if (selectedMode !== 'TOPIC') return;

    const isLocked = !isVip && (topicLevel === 'B1' || topicLevel === 'B2' || topicLevel === 'C1');
    if (isLocked) {
      setTopicUpgradeRequired(true);
      setTopicCounts({});
      return;
    }

    setTopicUpgradeRequired(false);
    setLoadingTopicCounts(true);
    wordApi
      .topicCounts(topicLevel === 'Tất cả' ? undefined : topicLevel)
      .then(({ data }) => {
        const counts: Record<string, number> = {};
        if (Array.isArray(data)) {
          data.forEach((item: any) => {
            const key = item.topic?.name || item.topic || item.code;
            if (key) counts[key] = item.count ?? 0;
          });
        }
        setTopicCounts(counts);
      })
      .catch((e: any) => {
        const errCode = e?.response?.data?.code || e?.code;
        if (errCode === 'CEFR_B1_C1' || e?.response?.status === 403) {
          setTopicUpgradeRequired(true);
        }
        setTopicCounts({});
      })
      .finally(() => {
        setLoadingTopicCounts(false);
      });
  }, [selectedMode, topicLevel, isVip]);

  const handleTopicLevelChange = (newLevel: string) => {
    setTopicLevel(newLevel);
    setSelectedTopic(null);
  };

  // Đồng bộ selectedTopic lên URL để nút Back trình duyệt quay về được danh sách
  // (Effect 1: state -> URL, chỉ chạy khi selectedTopic đổi; KHÔNG thêm searchParams
  // vào deps của effect này, nếu không nó sẽ đẩy topic trở lại URL khi anh bấm Back)
  useEffect(() => {
    const urlTopic = searchParams.get('topic');
    if (selectedTopic && urlTopic !== selectedTopic) {
      const next = new URLSearchParams(searchParams);
      next.set('topic', selectedTopic);
      setSearchParams(next);
    } else if (!selectedTopic && urlTopic) {
      const next = new URLSearchParams(searchParams);
      next.delete('topic');
      setSearchParams(next, { replace: true });
    }
  }, [selectedTopic]);

  // Đồng bộ URL -> state khi anh bấm Back/Forward của trình duyệt
  useEffect(() => {
    const urlTopic = searchParams.get('topic');
    if (urlTopic !== selectedTopic) {
      setSelectedTopic(urlTopic);
    }
  }, [searchParams]);

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
  const [direction, setDirection] = useState<'next' | 'prev'>('next');

  const cardTransitionVariants = {
    enter: (dir: 'next' | 'prev') => ({
      x: shouldReduce ? 0 : dir === 'next' ? 36 : -36,
      opacity: 0,
      scale: shouldReduce ? 1 : 0.98,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
      transition: {
        duration: shouldReduce ? 0.15 : motionTokens.duration.normal,
        ease: motionTokens.ease.gentleOut,
      },
    },
    exit: (dir: 'next' | 'prev') => ({
      x: shouldReduce ? 0 : dir === 'next' ? -36 : 36,
      opacity: 0,
      scale: shouldReduce ? 1 : 0.98,
      transition: {
        duration: shouldReduce ? 0.1 : motionTokens.duration.fast,
        ease: motionTokens.ease.standard,
      },
    }),
  };

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
  const loadCards = async (mode: string, recLevel: string, topic?: string | null) => {
    setLoading(true);
    setErr('');
    setI(0);
    setFlip(false);
    setAiDetail(null);
    setRemembered(0);
    setForgotten(0);
    setDirection('next');

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
      } else if (mode === 'MY_WORDS') {
        const { data } = await myWordsApi.list({ size: 100 });
        const list = data?.data?.content || data?.content || [];
        const formatted: FlashcardWord[] = list.map((w: any) => ({
          id: `custom_${w.id}`,
          word: w.lemma,
          pronunciation: w.partOfSpeech ? `(${w.partOfSpeech})` : '',
          meaning: w.vietnameseMeaning,
          vietnameseMeaning: w.vietnameseMeaning,
          definition: w.vietnameseMeaning,
          example: w.example,
          level: w.cefrLevel || 'B1',
          partOfSpeech: w.partOfSpeech,
          isSrs: false,
          overdue: 0,
        }));
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
        // Ưu tiên hiển thị đúng từ được chọn từ Dashboard (nếu có param wordId hoặc word)
        const targetWordId = searchParams.get('wordId');
        const targetWord = searchParams.get('word')?.toLowerCase();
        let targetIdx = -1;
        if (targetWordId) {
          targetIdx = formatted.findIndex(
            (c) => String(c.id) === String(targetWordId) || String(c.progressId) === String(targetWordId)
          );
        }
        if (targetIdx === -1 && targetWord) {
          targetIdx = formatted.findIndex((c) => c.word.toLowerCase() === targetWord);
        }

        if (targetIdx !== -1) {
          const targetCard = formatted[targetIdx];
          const remaining = formatted.filter((_, idx) => idx !== targetIdx);
          setCards([targetCard, ...shuffleArray(remaining)]);
        } else if (targetWordId) {
          try {
            const wRes = await wordApi.get(targetWordId);
            const w = wRes?.data;
            if (w) {
              const wText = w.word || w.lemma || '';
              const rawVi = w.vietnameseMeaning || w.meaning;
              const vi = isMeaningfulVietnamese(rawVi) ? rawVi : '';
              const targetCard: FlashcardWord = {
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
                isSrs: true,
                overdue: 0,
              };
              setCards([targetCard, ...shuffleArray(formatted)]);
            } else {
              setCards(shuffleArray(formatted));
            }
          } catch {
            setCards(shuffleArray(formatted));
          }
        } else {
          setCards(shuffleArray(formatted));
        }
      } else if (mode === 'TOPIC') {
        const activeTopic = topic || selectedTopic;
        if (!activeTopic) {
          setCards([]);
          setLoading(false);
          return;
        }
        const targetLevel = topicLevel === 'Tất cả' ? undefined : topicLevel;
        let rawWords: Word[] = [];

        try {
          const res = await wordApi.randomBatch({
            level: targetLevel,
            topic: activeTopic,
            limit: 25,
          });
          if (Array.isArray(res.data) && res.data.length > 0) {
            rawWords = res.data;
          }
        } catch (e) {
          console.warn('randomBatch for topic failed, falling back to list:', e);
        }

        if (rawWords.length === 0) {
          try {
            const fallback = await wordApi.list({
              level: targetLevel,
              topic: activeTopic,
              page: 0,
              size: 25,
            });
            rawWords = fallback.data?.content || [];
          } catch (e) {
            console.warn('fallback list for topic failed:', e);
          }
        }

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
    if (selectedMode === 'TOPIC') {
      if (selectedTopic) {
        loadCards('TOPIC', recommendedLevel, selectedTopic);
      } else {
        setCards([]);
        setLoading(false);
      }
    } else {
      loadCards(selectedMode, recommendedLevel);
    }
  }, [selectedMode, recommendedLevel, selectedTopic, topicLevel]);

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

    if (selectedMode === 'MY_WORDS') {
      if (ok) {
        setDirection('next');
        setRemembered((r) => r + 1);
        setFlip(false);
        setAiDetail(null);
        if (i + 1 >= cards.length) {
          setI(-1);
        } else {
          setI(i + 1);
        }
      } else {
        setDirection('prev');
        setForgotten((f) => f + 1);
        setFlip(false);
        setAiDetail(null);
        if (i > 0) {
          setI(i - 1);
        } else {
          setFlip(false);
        }
      }
      return;
    }

    if (ok) {
      // 1. Người dùng nhớ từ này -> Chuyển sang từ tiếp theo
      setDirection('next');
      setRemembered((r) => r + 1);
      if (cur.isSrs) {
        try {
          const res = await learnApi.review(cur.id, true);
          const updatedCount = res?.data?.data?.reviewCount ?? res?.data?.reviewCount;
          if (updatedCount != null) {
            setCards((prev) => prev.map((c, idx) => (idx === i ? { ...c, reviewCount: updatedCount } : c)));
          }
          window.dispatchEvent(new CustomEvent('vocab_review_completed', { detail: { wordId: cur.id, correct: true } }));
        } catch { /* ignore */ }
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
      setDirection('prev');
      setForgotten((f) => f + 1);
      if (cur.isSrs) {
        try {
          const res = await learnApi.review(cur.id, false);
          const updatedCount = res?.data?.data?.reviewCount ?? res?.data?.reviewCount;
          if (updatedCount != null) {
            setCards((prev) => prev.map((c, idx) => (idx === i ? { ...c, reviewCount: updatedCount } : c)));
          }
          window.dispatchEvent(new CustomEvent('vocab_review_completed', { detail: { wordId: cur.id, correct: false } }));
        } catch { /* ignore */ }
      } else {
        try { await learnApi.start(cur.id); } catch { /* ignore */ }
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

  // Completion Screen matching review-done
  if (i === -1) {
    const totalDone = remembered + forgotten;
    return (
      <div className="content narrow center">
        <MotionCard className="center" style={{ maxWidth: 680, width: '100%', padding: '32px 28px', gap: 14 }}>
          <ViMascotImage
            pose="celebrate"
            animated
            size={112}
            priority
            alt="Vi ăn mừng bạn đã hoàn thành phiên ôn tập flashcard"
          />
          <SplitHeading text="Hoàn thành phiên ôn tập!" />
          <p className="sub" style={{ margin: 0 }}>
            {selectedMode === 'TOPIC' && selectedTopic ? (
              <>Bạn vừa ôn xong <b>{totalDone}</b> từ vựng chủ đề <b>{TOPIC_LABELS[selectedTopic] || selectedTopic}</b> ({topicLevel}).</>
            ) : (
              <>Bạn vừa ôn xong <b>{totalDone}</b> từ vựng — chuỗi streak được giữ vững.</>
            )}
          </p>
          <div className="row" style={{ gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginTop: 8 }}>
            <div className="kpi" style={{ minWidth: 140 }}><div className="lbl">Từ đã ôn</div><div className="num">{totalDone}</div></div>
            <div className="kpi" style={{ minWidth: 140 }}><div className="lbl">Đã nhớ</div><div className="num" style={{ color: 'var(--green-dark)' }}>{remembered}</div></div>
            <div className="kpi" style={{ minWidth: 140 }}><div className="lbl">Cần ôn lại sớm</div><div className="num" style={{ color: 'var(--red-dark)' }}>{forgotten}</div></div>
          </div>
          {forgotten > 0 && (
            <div className="tiny muted">{forgotten} từ chưa nhớ sẽ quay lại hàng đợi vào ngày mai theo lịch SRS.</div>
          )}
          <div className="row" style={{ justifyContent: 'center', flexWrap: 'wrap', gap: 10, marginTop: 6 }}>
            {forgotten > 0 && (
              <button
                type="button"
                className="btn secondary"
                onClick={() => loadCards(selectedMode, recommendedLevel, selectedTopic)}
              >
                Ôn lại {forgotten} từ chưa nhớ
              </button>
            )}
            {selectedMode === 'TOPIC' && selectedTopic && (
              <>
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => loadCards('TOPIC', recommendedLevel, selectedTopic)}
                >
                  <UiIcon name="dice" size={14} /> Ôn tiếp bộ thẻ này
                </button>
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => {
                    setSelectedTopic(null);
                    setI(0);
                  }}
                >
                  ← Chọn chủ đề khác
                </button>
              </>
            )}
            <button type="button" className="btn" onClick={() => nav('/dashboard')}>
              Về Tổng quan
            </button>
          </div>
        </MotionCard>
      </div>
    );
  }

  const activeLevelDisplay = selectedMode === 'RECOMMENDED'
    ? `AI gợi ý (${recommendedLevel})`
    : selectedMode === 'SRS'
      ? 'Từ cần ôn (SRS)'
      : selectedMode === 'TOPIC'
        ? selectedTopic
          ? `${TOPIC_LABELS[selectedTopic] || selectedTopic} (${topicLevel})`
          : `Theo chủ đề (${topicLevel})`
        : selectedMode === 'ALL'
          ? 'Tất cả cấp độ'
          : `Cấp độ ${selectedMode}`;

  return (
    <div className="content">
      {/* Compact Header */}
      <div className="pagehead">
        <div>
          <div className="eyebrow">FLASHCARD · SPACED REPETITION SRS</div>
          <SplitHeading
            text={selectedMode === 'TOPIC' && !selectedTopic ? 'Ôn theo chủ đề' : 'Ôn Flashcard'}
          />
          <p className="sub">
            {selectedMode === 'TOPIC' && !selectedTopic ? (
              'Hành trình 12 chủ đề từ vựng thiết thực · SRS 1–3–7–14–30 ngày'
            ) : loading ? (
              'Đang chuẩn bị bộ thẻ...'
            ) : cards.length === 0 ? (
              `Chưa có từ (${activeLevelDisplay})`
            ) : (
              `Thẻ ${i + 1} / ${cards.length} · ${activeLevelDisplay}`
            )}
          </p>
        </div>

        <div className="row" style={{ gap: 10 }}>
          {!(selectedMode === 'TOPIC' && !selectedTopic) && (
            <>
              <span className="pill greensoft">✓ <AnimatedCounter value={remembered} /> nhớ</span>
              <span className="pill redsoft">✗ <AnimatedCounter value={forgotten} /> chưa</span>
            </>
          )}
          <ViMascotImage
            pose="encourage"
            size={46}
            alt="Vi cổ vũ bạn duy trì thói quen ôn flashcard mỗi ngày"
          />
        </div>
      </div>

      {/* Main Viewport-Locked 2-Column Layout: Flashcard/Topic Stage + Controls Rail */}
      <div
        className="cols2 review-cols"
        style={{
          flex: 1,
          minHeight: 0,
          alignItems: 'stretch',
        }}
      >
        {/* MAIN COLUMN */}
        <div className="colstack" style={{ flex: 1, minHeight: 0, gap: 10 }}>
          {selectedMode === 'TOPIC' && selectedTopic && (
            <div className="row between" style={{ flex: 'none', flexWrap: 'wrap', gap: 8 }}>
              <button
                type="button"
                className="btn secondary sm"
                onClick={() => {
                  setSelectedTopic(null);
                  setCards([]);
                  setI(0);
                }}
              >
                ← Tất cả chủ đề
              </button>
              <span className="pill level">
                Đang ôn: <b>{TOPIC_LABELS[selectedTopic] || selectedTopic}</b> · {topicLevel}
              </span>
            </div>
          )}

          {/* 1. TOPIC MODE: JOURNEY LIST VIEW */}
          {selectedMode === 'TOPIC' && selectedTopic === null ? (
            <div className="colstack" style={{ flex: 1, minHeight: 0, gap: 10 }}>
              <div className="card row between" style={{ padding: '10px 16px', flex: 'none', flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 14.5, color: 'var(--ink)' }}>
                    Hành trình 12 chủ đề từ vựng
                  </div>
                  <div className="tiny muted">25 từ ngẫu nhiên mỗi chủ đề · Tự động đồng bộ vào chu trình SRS</div>
                </div>
                <div className="chips">
                  {['Tất cả', 'A1', 'A2', 'B1', 'B2', 'C1'].map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      className={'fchip' + (topicLevel === lvl ? ' on' : '')}
                      onClick={() => handleTopicLevelChange(lvl)}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              <div className="long-list" style={{ flex: 1, minHeight: 0, paddingRight: 4 }}>
                {topicUpgradeRequired ? (
                  <MotionCard className="center" style={{ padding: '32px 20px', gap: 10 }}>
                    <span className="pill warn"><UiIcon name="crown" size={12} /> PREMIUM</span>
                    <div style={{ fontSize: 16.5, fontWeight: 800, color: 'var(--amber-dark)' }}>
                      Từ vựng chủ đề cấp độ {topicLevel} dành riêng cho Premium
                    </div>
                    <p className="sub" style={{ maxWidth: 460, margin: 0 }}>
                      Nâng cấp tài khoản Premium để mở khóa toàn bộ kho từ vựng B1–C1 theo mọi chủ đề chuyên sâu.
                    </p>
                    <button
                      type="button"
                      className="btn amber"
                      onClick={() => openUpgradeModal({ feature: 'CEFR_B1_C1' })}
                    >
                      Mở khóa Premium ngay
                    </button>
                  </MotionCard>
                ) : (
                  <div className="cols2" style={{ gap: 10 }}>
                    {TOPICS.map((topic) => {
                      const count = topicCounts[topic.code] ?? 0;
                      const isDisabled = count === 0 && !loadingTopicCounts;

                      return (
                        <div
                          key={topic.code}
                          className="card row between"
                          style={{
                            padding: '12px 14px',
                            opacity: isDisabled ? 0.55 : 1,
                            cursor: isDisabled ? 'default' : 'pointer',
                            gap: 12,
                          }}
                          onClick={() => !isDisabled && setSelectedTopic(topic.code)}
                        >
                          <div className="row" style={{ gap: 10, minWidth: 0, flex: 1 }}>
                            <span
                              style={{
                                width: 38,
                                height: 38,
                                borderRadius: 10,
                                background: 'rgba(71, 96, 63, 0.14)',
                                color: 'var(--sage-dark)',
                                display: 'grid',
                                placeItems: 'center',
                                fontSize: 18,
                                flexShrink: 0,
                              }}
                            >
                              <UiIcon name={topic.icon} size={18} />
                            </span>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {topic.label}
                              </div>
                              <div className="tiny muted">
                                {loadingTopicCounts ? 'Đang tải...' : `${count} từ · Cấp độ ${topicLevel}`}
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            className="btn sm"
                            disabled={isDisabled || loadingTopicCounts}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTopic(topic.code);
                            }}
                          >
                            {isDisabled ? 'Chưa có từ' : 'Ôn ngay'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* 2. FLASHCARD STAGE */
            <div className="colstack" style={{ flex: 1, minHeight: 0, gap: 10 }}>
              {cards.length > 0 && (
                <div style={{ flex: 'none' }}>
                  <AnimatedProgressBar value={((i + 1) / cards.length) * 100} />
                </div>
              )}

              {err && <ApiErrorState title="Không tải được bộ thẻ ôn tập" errorDetail={err} onRetry={() => loadCards(selectedMode, recommendedLevel, selectedTopic)} compact />}

              {loading && <ViLoadingScreen subtitle="Đang chuẩn bị bộ thẻ ôn tập SRS" />}

              {!loading && cur && (
                <div className="colstack" style={{ flex: 1, minHeight: 0, justifyContent: 'space-between', gap: 10 }}>
                  {/* 3D Flip + Tilt Flashcard */}
                  <AnimatePresence mode="wait" custom={direction} initial={false}>
                    <motion.div
                      key={`card-${cur.id}-${i}`}
                      custom={direction}
                      variants={cardTransitionVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      className="flip-wrap"
                      style={{ flex: 'none' }}
                    >
                      <div
                        ref={cardRef}
                        className={'flashcard tilt-target' + (flip ? ' flipped' : '')}
                        data-tilt-max="4"
                        onClick={() => setFlip(!flip)}
                      >
                        {/* FRONT FACE */}
                        <div className="card face front" style={{ justifyContent: 'space-between' }}>
                          <div className="row between" style={{ width: '100%' }}>
                            <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                              <span className="pill level">{cur.level}</span>
                              {(() => {
                                const r = analyzeWordRelations(cur.word, cur.partOfSpeech);
                                return cur.partOfSpeech ? (
                                  <span className="pill">
                                    <UiIcon name={r.posBadge.icon} size={11} /> {r.posBadge.label}
                                  </span>
                                ) : null;
                              })()}
                              {cur.isSrs && <span className="pill warn">SRS</span>}
                            </div>

                            <div className="row" style={{ gap: 6 }}>
                              <button
                                type="button"
                                className={'heartbtn' + (isCurFavorited(cur) ? ' on' : '')}
                                style={{ width: 34, height: 34 }}
                                onClick={toggleFavorite}
                                title={isCurFavorited(cur) ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'}
                                aria-label="yêu thích"
                              >
                                <Icon n="heart" s={16} />
                              </button>
                              <button
                                type="button"
                                className="speakbtn"
                                onClick={playAudio}
                                title="Nghe phát âm (Phím P)"
                                aria-label="phát âm"
                              >
                                <Icon n="vol" s={16} />
                              </button>
                            </div>
                          </div>

                          <div>
                            <div className="big">{cur.word}</div>
                            {cur.pronunciation && (
                              <div className="sub mt4" style={{ fontSize: 16, fontFamily: 'ui-monospace, monospace' }}>
                                {cur.pronunciation}
                              </div>
                            )}
                          </div>

                          <div className="tiny muted">
                            <UiIcon name="hand" size={13} /> Bấm vào thẻ để lật · [Space] Lật · [←] Chưa nhớ · [→] Đã nhớ
                          </div>
                        </div>

                        {/* BACK FACE */}
                        <div className="card face back" style={{ justifyContent: 'flex-start', gap: 8 }}>
                          <div className="row between" style={{ width: '100%', flex: 'none' }}>
                            <div className="row" style={{ gap: 8 }}>
                              <strong style={{ fontSize: 19, color: 'var(--ink)' }}>{cur.word}</strong>
                              {cur.pronunciation && (
                                <span className="tiny muted">{cur.pronunciation}</span>
                              )}
                            </div>
                            <div className="row" style={{ gap: 6 }}>
                              <button
                                type="button"
                                className={'heartbtn' + (isCurFavorited(cur) ? ' on' : '')}
                                style={{ width: 32, height: 32 }}
                                onClick={toggleFavorite}
                                aria-label="yêu thích"
                              >
                                <Icon n="heart" s={15} />
                              </button>
                              <button
                                type="button"
                                className="speakbtn"
                                onClick={playAudio}
                                aria-label="phát âm"
                              >
                                <Icon n="vol" s={15} />
                              </button>
                            </div>
                          </div>

                          <div className="long-list colstack" style={{ flex: 1, minHeight: 0, width: '100%', alignItems: 'center', gap: 8 }}>
                            {(() => {
                              const rel = analyzeWordRelations(cur.word, cur.partOfSpeech);
                              return (
                                <>
                                  <div
                                    style={{
                                      background: 'var(--success-bg)',
                                      border: '1px solid rgba(66, 119, 77, 0.28)',
                                      borderRadius: 12,
                                      padding: '8px 16px',
                                      width: '100%',
                                      maxWidth: 500,
                                    }}
                                  >
                                    <div style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--green-dark)', letterSpacing: 0.6 }}>
                                      NGHĨA TIẾNG VIỆT
                                    </div>
                                    <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--ink)' }}>
                                      {activeVi || 'Đang cập nhật nghĩa tiếng Việt...'}
                                    </div>
                                  </div>

                                  {rel.warningNote && (
                                    <div className="pill warn" style={{ whiteSpace: 'normal', textAlign: 'left', fontSize: 12 }}>
                                      <UiIcon name="search" size={13} /> {rel.warningNote}
                                    </div>
                                  )}

                                  {cur.definition && (
                                    <div style={{ fontSize: 13, color: 'var(--muted)', maxWidth: 500, lineHeight: 1.4 }}>
                                      <b>English:</b> {cleanDefinitionText(cur.definition)}
                                    </div>
                                  )}

                                  {cur.example && (
                                    <div style={{ fontSize: 12.5, fontStyle: 'italic', color: 'var(--sage-dark)', maxWidth: 500 }}>
                                      <UiIcon name="message" size={13} /> "{cur.example}"
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  </AnimatePresence>

                  {/* Action Buttons Row */}
                  <div className="row" style={{ gap: 10, maxWidth: 620, width: '100%', margin: '0 auto', flex: 'none' }}>
                    <button
                      type="button"
                      className="btn softred"
                      style={{ flex: 1 }}
                      onClick={() => answer(false)}
                    >
                      Chưa nhớ
                    </button>
                    <button
                      type="button"
                      className="btn secondary"
                      onClick={explainWithAi}
                      disabled={loadingAiDetail}
                    >
                      <Icon n="spark" s={16} />
                      {loadingAiDetail ? 'Vi đang giải thích...' : aiDetail ? 'Thu gọn giải thích' : 'Vi giải thích'}
                    </button>
                    <button
                      type="button"
                      className="btn green"
                      style={{ flex: 1 }}
                      onClick={() => answer(true)}
                    >
                      Đã nhớ
                    </button>
                  </div>

                  {/* Vi Coach / AI Detail Area (bounded inside viewport) */}
                  <div className="long-list" style={{ flex: 1, minHeight: 0, maxWidth: 740, width: '100%', margin: '0 auto' }}>
                    {loadingAiDetail ? (
                      <div className="card" style={{ padding: '12px 16px' }}>
                        <div className="coach">
                          <ViMascotImage pose="thinking" size={44} alt="Vi đang suy nghĩ giải thích chuyên sâu" />
                          <div className="bubble" style={{ fontSize: 13 }}>
                            <b>Vi đang soạn lời giải thích:</b> Đang tổng hợp ví dụ, đồng nghĩa và mẹo ghi nhớ cho “{cur.word}”...
                          </div>
                        </div>
                      </div>
                    ) : aiDetail ? (
                      <AiExplanationBox explanation={aiDetail} />
                    ) : (
                      <div className="card" style={{ padding: '12px 16px' }}>
                        <div className="coach">
                          <ViMascotImage pose="explain" size={44} alt="Vi sẵn sàng giải thích chuyên sâu từ vựng" />
                          <div className="bubble" style={{ fontSize: 13 }}>
                            <b>Vi đồng hành:</b> “{cur.word}” là từ vựng cấp {cur.level}. Bấm <b>Vi giải thích</b> để xem ngữ cảnh sử dụng và mẹo ghi nhớ!
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Topic-specific Empty State */}
              {!loading && cards.length === 0 && !err && selectedMode === 'TOPIC' && selectedTopic && (
                <div className="card center" style={{ flex: 1, padding: '32px 20px', gap: 12 }}>
                  <ViMascotImage pose="encourage" size={82} alt="Vi khích lệ chọn chủ đề khác" />
                  <div style={{ fontSize: 17, fontWeight: 800 }}>
                    Chủ đề “{TOPIC_LABELS[selectedTopic]}” chưa có từ ở cấp độ {topicLevel}
                  </div>
                  <p className="sub" style={{ maxWidth: 420, margin: 0 }}>
                    Chuyển sang tất cả cấp độ hoặc quay về danh sách hành trình nhé.
                  </p>
                  <div className="row" style={{ gap: 10 }}>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => {
                        setSelectedTopic(null);
                        setI(0);
                      }}
                    >
                      ← Quay về danh sách hành trình
                    </button>
                    <button
                      type="button"
                      className="btn secondary"
                      onClick={() => {
                        setTopicLevel('Tất cả');
                        loadCards('TOPIC', recommendedLevel, selectedTopic);
                      }}
                    >
                      Xem ở tất cả cấp độ
                    </button>
                  </div>
                </div>
              )}

              {/* General / SRS Empty State — Sleep pose when all done! */}
              {!loading && cards.length === 0 && !err && selectedMode !== 'TOPIC' && (
                <div className="card center" style={{ flex: 1, padding: '32px 20px', gap: 12 }}>
                  <ViMascotImage
                    pose={selectedMode === 'SRS' ? 'sleep' : 'encourage'}
                    size={88}
                    alt={selectedMode === 'SRS' ? 'Vi nghỉ ngơi — hôm nay bạn đã ôn sạch từ đến hạn' : 'Vi gợi ý chọn cấp độ ôn tập'}
                  />
                  <div style={{ fontSize: 17, fontWeight: 800 }}>
                    {selectedMode === 'SRS'
                      ? 'Hết từ cần ôn SRS — giỏi quá!'
                      : `Chưa có từ vựng nào ở cấp độ "${activeLevelDisplay}"`}
                  </div>
                  <p className="sub" style={{ maxWidth: 420, margin: 0 }}>
                    {selectedMode === 'SRS'
                      ? 'Hôm nay bạn đã ôn sạch các từ đến hạn. Hãy chọn một cấp độ khác bên phải để tiếp tục luyện Flashcard nhé!'
                      : 'Hãy thử chọn một cấp độ khác hoặc bấm vào "AI gợi ý" để ôn tập từ vựng thích hợp.'}
                  </p>
                  <div className="row" style={{ gap: 10 }}>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => setSelectedMode(recommendedLevel || 'A1')}
                    >
                      Ôn Flashcard cấp độ {recommendedLevel || 'A1'}
                    </button>
                    <button type="button" className="btn secondary" onClick={() => nav('/words')}>
                      Khám phá kho từ vựng
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT CONTROLS SIDEBAR */}
        <aside className="card long-list colstack" style={{ gap: 12, padding: 14 }}>
          {!(selectedMode === 'TOPIC' && !selectedTopic) && (
            <button
              type="button"
              className="btn secondary sm"
              style={{ width: '100%' }}
              onClick={() => {
                setDirection('next');
                loadCards(selectedMode, recommendedLevel, selectedTopic);
              }}
              title="Tải một bộ thẻ từ vựng ngẫu nhiên mới"
            >
              <UiIcon name="dice" size={14} /> Đổi bộ ngẫu nhiên
            </button>
          )}

          <div>
            <div className="overline" style={{ marginBottom: 6 }}>Chế độ ôn tập</div>
            <div className="colstack" style={{ gap: 5 }}>
              {STUDY_MODES.map((m) => {
                const isSelected = selectedMode === m.id;
                const label = m.id === 'RECOMMENDED' ? `AI gợi ý (${recommendedLevel})` : m.label;
                return (
                  <button
                    key={m.id}
                    type="button"
                    className={isSelected ? 'btn sm' : 'btn ghost sm'}
                    style={{ justifyContent: 'space-between', width: '100%' }}
                    onClick={() => {
                      if (selectedMode === m.id) {
                        if (m.id === 'TOPIC') setSelectedTopic(null);
                        else loadCards(m.id, recommendedLevel);
                      } else {
                        setSelectedTopic(null);
                        setSelectedMode(m.id);
                      }
                    }}
                  >
                    <span>{label}</span>
                    {isSelected && <span>●</span>}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ height: 1, background: 'var(--line)' }} />

          <div>
            <div className="overline" style={{ marginBottom: 6 }}>Cấp độ CEFR</div>
            <div className="cols2" style={{ gap: 6 }}>
              {CEFR_LEVELS.map((lvl) => {
                const isSelected = selectedMode === lvl;
                const displayLabel = lvl === 'ALL' ? 'Tất cả' : lvl;
                return (
                  <button
                    key={lvl}
                    type="button"
                    className={isSelected ? 'btn sm' : 'btn secondary sm'}
                    onClick={() => {
                      if (selectedMode === lvl) {
                        loadCards(lvl, recommendedLevel);
                      } else {
                        setSelectedTopic(null);
                        setSelectedMode(lvl);
                      }
                    }}
                  >
                    {displayLabel}
                  </button>
                );
              })}
            </div>
          </div>

          {recommendedLevel && (
            <div
              style={{
                padding: '10px 12px',
                borderRadius: 12,
                background: 'rgba(71, 96, 63, 0.1)',
                border: '1px solid rgba(71, 96, 63, 0.2)',
                fontSize: 12,
                lineHeight: 1.45,
                color: 'var(--ink)',
              }}
            >
              <strong style={{ color: 'var(--sage-dark)', display: 'block', marginBottom: 3 }}>
                ✦ Gợi ý từ Vi AI
              </strong>
              Tập trung ôn cấp độ <b>{recommendedLevel}</b> để củng cố phản xạ tốt nhất.
              {selectedMode !== 'RECOMMENDED' && (
                <button
                  type="button"
                  className="btn ghost sm"
                  style={{ width: '100%', marginTop: 8 }}
                  onClick={() => {
                    setSelectedTopic(null);
                    setSelectedMode('RECOMMENDED');
                  }}
                >
                  Chọn AI gợi ý ({recommendedLevel})
                </button>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
