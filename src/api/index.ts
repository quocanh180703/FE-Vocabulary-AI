import { api } from './client';
export { api, errMsg } from './client';

/* ---------- types ---------- */
export interface User { id: number; email: string; username: string; fullName?: string; role: 'ADMIN' | 'STUDENT'; status: string; avatarUrl?: string; createdAt?: string }
export interface AuthResp {
  accessToken?: string;
  access_token?: string;
  refreshToken?: string;
  refresh_token?: string;
  tokenType?: string;
  token_type?: string;
  expiresIn?: number;
  expires_in?: number;
  user: User;
  message?: string;
}
/** BE RegisterSuccessResponse — KHÔNG chứa token (BE bắt đăng nhập tay sau OTP) */
export interface RegisterSuccess { message: string; email: string; username: string; fullName: string; status: string; instruction: string }
export interface Page<T> { content: T[]; pageable: { pageNumber: number; pageSize: number; totalElements: number; totalPages: number }; totalPages?: number; totalElements?: number }
export interface Category { id: number; name: string }
export interface Word {
  id: number | string;
  word: string;
  lemma?: string;
  pronunciation?: string;
  meaning: string;
  definition?: string;
  example?: string;
  level: string;
  cefrLevel?: string;
  partOfSpeech?: string;
  audioUrl?: string;
  imageUrl?: string;
  vietnameseMeaning?: string;
  category?: Category;
}
export interface ReviewItem { wordId: number | string; word: string; daysOverdue: number; attemptCount: number }
/** BE: LearningProgressResponse — item của GET /api/learning/review-queue (Spring Page) */
export interface ProgressItem {
  id: number; word: Word; status: string;
  correctCount: number; wrongCount: number; reviewCount: number;
  accuracy?: number; nextReviewAt?: string; lastReviewedAt?: string;
}
export interface ProgressPage { content: ProgressItem[]; totalElements: number; totalPages: number }
/** Số ngày trễ ôn = hôm nay - nextReviewAt (BE không trả sẵn) */
export const daysOverdue = (it: ProgressItem): number => {
  if (!it.nextReviewAt) return 0;
  const d = Math.ceil((Date.now() - new Date(it.nextReviewAt).getTime()) / 86400000);
  return d > 0 ? d : 0;
};
export interface Quiz { id: number; title: string; level: string; questionCount: number; timeLimit: number; category?: string; status: string }
export interface Question { id: number; content: string; options: string[] }
export interface QuizDetail extends Quiz { totalQuestions: number; questions: Question[] }
export interface Attempt { attemptId: number; quizId: number; startedAt: string; expiresAt: string }
export interface QuizResult { attemptId: number; score: number; totalQuestions: number; correctAnswers: number; feedback: string }
export interface Explain { wordId: number | string; word: string; meaning: string; examples: string[]; synonyms: string[]; usageTips: string; tokensUsed: number; source: string }
export interface GrammarErr { errorType: string; message: string; suggestion: string }
export interface GrammarResp { originalText: string; correctedText: string; score: number; errors: GrammarErr[]; tokensUsed: number }
export interface Hint { progressId: number; word: string; attemptCount: number; hint: string; difficulty: string; tokensUsed: number }
export interface Conversation { id: number; type: string; title: string; createdAt: string; isPinned?: boolean }
export interface ChatMsg { id: number; conversationId: number; role: 'USER' | 'ASSISTANT'; content: string; tokensUsed?: number }
export interface SpeakSession { id: number; topic: string; level: string; startedAt: string; status: string }
export interface AttemptFeedback {
  overallScore?: number;
  grammarScore?: number;
  vocabularyScore?: number;
  fluencyScore?: number;
  contentScore?: number;
  pronunciationScore?: number;
  feedback?: string;
  generalFeedback?: string;
  corrections?: any;
  suggestions?: any;
  strengths?: any;
  weaknesses?: any;
}

export interface AttemptDetail {
  id: number;
  attemptId?: number;
  attemptNumber: number;
  overallScore?: number;
  audioUrl?: string;
  audioDurationSeconds?: number;
  transcript?: string;
  transcriptConfidence?: number;
  feedback?: AttemptFeedback;
}
export interface SpeakAttempt {
  id?: number;
  attemptId?: number;
  sessionId?: number;
  attemptNumber?: number;
  overallScore?: number;
  audioUrl?: string;
  audioDurationSeconds?: number;
  transcript?: string;
  transcriptConfidence?: number;
  scores?: any;
  feedback?: AttemptFeedback;
}

export interface SessionDetail extends SpeakSession {
  attemptCount: number;
  overallScore?: number;
  attempts: AttemptDetail[];
  statistics?: { averageScore: number; bestScore: number; improvement: string };
  feedback?: AttemptFeedback;
}
export interface DailyStreakStatus {
  dayName: string;
  date: string;
  completed: boolean;
  isToday: boolean;
}

export interface RecentActivitySummary {
  type: 'VOCABULARY' | 'QUIZ' | 'SPEAKING' | string;
  title: string;
  result: string;
  timeAgo?: string;
  createdAt?: string;
}

export interface LearningStats {
  totalWords: number;
  newWords: number;
  learningWords: number;
  masteredWords: number;
  wordsNeedingReview: number;
  averageAccuracy: number;
  totalActivities: number;
  correctAnswers: number;
  overallAccuracyRate: number;
  currentStreak?: number;
  longestStreak?: number;
  todayCompleted?: boolean;
  todayActivitiesCount?: number;
  dailyGoal?: number;
  totalPoints?: number;
  weekProgress?: DailyStreakStatus[];
  recentActivities?: RecentActivitySummary[];
}

import { formatPartOfSpeech, isVietnamese, isMeaningfulVietnamese, cleanDefinitionText, analyzeWordRelations, getPartOfSpeechBadgeStyle } from '../utils/wordRelations';
export { formatPartOfSpeech, isVietnamese, isMeaningfulVietnamese, cleanDefinitionText, analyzeWordRelations, getPartOfSpeechBadgeStyle };

// Backwards-compatible stubs
export const getCachedTranslation = (_w?: string): string | null => null;
export const translateToVietnamese = async (w: string, fallback?: string): Promise<string> => fallback || w;
export const prefetchTranslations = async (_words: string[]): Promise<void> => {};

export const normalizeWord = (w: any): Word => {
  if (!w) return { id: 0, word: '', meaning: '', level: 'A1' };
  const word = w.word || w.lemma || '';
  const level = w.level || w.cefrLevel || 'A1';

  // Chỉ lấy nghĩa tiếng Việt thực sự, tuyệt đối không lấy nhãn từ loại như "Danh từ (noun)"
  const rawVi = w.vietnameseMeaning || w.meaning;
  const viMeaning = isMeaningfulVietnamese(rawVi) ? rawVi.trim() : '';

  const cleanDef = cleanDefinitionText(w.definition || (!isMeaningfulVietnamese(w.meaning) ? w.meaning : ''));

  return {
    id: w.id,
    word,
    lemma: w.lemma || word,
    pronunciation: w.pronunciation || '',
    meaning: viMeaning,
    vietnameseMeaning: viMeaning || undefined,
    definition: cleanDef,
    example: w.example || '',
    level,
    cefrLevel: w.cefrLevel || level,
    partOfSpeech: w.partOfSpeech || '',
    audioUrl: w.audioUrl,
    imageUrl: w.imageUrl,
    category: w.category,
  };
};

/* ---------- auth ---------- */
export const authApi = {
  validate: (d: { email: string; username: string; fullName: string; password: string }) =>
    api.post('/auth/register/validate', d),
  verifyOtp: (d: { email: string; otp: string; username: string; password: string; fullName: string }) =>
    api.post<RegisterSuccess>('/auth/register/verify-otp', d),
  login: (d: { emailOrUsername: string; password: string }) =>
    api.post<AuthResp>('/auth/login', d),
  // BE POST /auth/logout yêu cầu body { refreshToken } — không gửi là 400
  logout: () => {
    const rt = localStorage.getItem('vocab_refresh');
    return api.post('/auth/logout', rt ? { refreshToken: rt } : {}).catch(() => {});
  },
};

const KNOWN_CEFR_FALLBACKS: Record<string, Word> = {
  '2422aed1-bc72-4d7d-b34e-3edd5b244bce': {
    id: '2422aed1-bc72-4d7d-b34e-3edd5b244bce',
    word: 'a',
    lemma: 'a',
    level: 'A1',
    cefrLevel: 'A1',
    partOfSpeech: 'DETERMINER',
    pronunciation: '/eɪ/',
    meaning: 'một (dùng trước từ bắt đầu bằng phụ âm)',
    vietnameseMeaning: 'một (dùng trước từ bắt đầu bằng phụ âm)',
    definition: 'Used before a noun that refers to a single thing or person.',
    example: 'I have a cat and a dog.',
  },
  '2422acd1-bc72-4d7d-b34e-3edd5b244bce': {
    id: '2422aed1-bc72-4d7d-b34e-3edd5b244bce',
    word: 'a',
    lemma: 'a',
    level: 'A1',
    cefrLevel: 'A1',
    partOfSpeech: 'DETERMINER',
    pronunciation: '/eɪ/',
    meaning: 'một (dùng trước từ bắt đầu bằng phụ âm)',
    vietnameseMeaning: 'một (dùng trước từ bắt đầu bằng phụ âm)',
    definition: 'Used before a noun that refers to a single thing or person.',
    example: 'I have a cat and a dog.',
  },
  '2ba0ce92-36ba-4bd0-a2a0-2154bbb419cc': {
    id: '2ba0ce92-36ba-4bd0-a2a0-2154bbb419cc',
    word: 'ability',
    lemma: 'ability',
    level: 'A2',
    cefrLevel: 'A2',
    partOfSpeech: 'NOUN',
    pronunciation: '/əˈbɪləti/',
    meaning: 'khả năng, năng lực',
    vietnameseMeaning: 'khả năng, năng lực',
    definition: 'The physical or mental power or skill needed to do something.',
    example: 'She has a remarkable ability to learn languages quickly.',
  },
  '698726b0-87d9-4734-aae9-b408a9cfdc27': {
    id: '698726b0-87d9-4734-aae9-b408a9cfdc27',
    word: 'academic',
    lemma: 'academic',
    level: 'B1',
    cefrLevel: 'B1',
    partOfSpeech: 'ADJECTIVE',
    pronunciation: '/ˌækəˈdemɪk/',
    meaning: 'thuộc về học thuật, học viện',
    vietnameseMeaning: 'thuộc về học thuật, học viện',
    definition: 'Relating to schools, colleges, and universities, or to study and thinking.',
    example: 'She had a brilliant academic career at university.',
  },
  'e22d585f-92a9-44f6-b1ea-440151d67e4d': {
    id: 'e22d585f-92a9-44f6-b1ea-440151d67e4d',
    word: 'abandon',
    lemma: 'abandon',
    level: 'B2',
    cefrLevel: 'B2',
    partOfSpeech: 'VERB',
    pronunciation: '/əˈbændən/',
    meaning: 'từ bỏ, bỏ rơi',
    vietnameseMeaning: 'từ bỏ, bỏ rơi',
    definition: 'To leave a place, thing, or person, usually for ever.',
    example: 'They had to abandon their car in the heavy snow.',
  },
  'e22d585f-92a9-44f6-b1ea-440151d67c4d': {
    id: 'e22d585f-92a9-44f6-b1ea-440151d67e4d',
    word: 'abandon',
    lemma: 'abandon',
    level: 'B2',
    cefrLevel: 'B2',
    partOfSpeech: 'VERB',
    pronunciation: '/əˈbændən/',
    meaning: 'từ bỏ, bỏ rơi',
    vietnameseMeaning: 'từ bỏ, bỏ rơi',
    definition: 'To leave a place, thing, or person, usually for ever.',
    example: 'They had to abandon their car in the heavy snow.',
  },
};

const WORD_CACHE = new Map<string, Word>();

export const wordApi = {
  list: (p: { page?: number; size?: number; level?: string; category?: string; search?: string }) => {
    const params: Record<string, any> = {
      page: p.page ?? 0,
      size: p.size ?? 20,
    };
    if (p.level && p.level !== 'Tất cả') params.level = p.level;
    if (p.search && p.search.trim()) params.query = p.search.trim();

    return api.get<any>('/cefr-words/search', { params }).then((res) => {
      const pageData = res.data || {};
      const rawList = Array.isArray(pageData.content) ? pageData.content : (Array.isArray(pageData) ? pageData : []);
      const totalPages = pageData.totalPages ?? 1;
      const totalElements = pageData.totalElements ?? rawList.length;
      const normalizedList: Word[] = rawList.map(normalizeWord);
      normalizedList.forEach((w: Word) => {
        if (w.id) WORD_CACHE.set(String(w.id), w);
        if (w.word) WORD_CACHE.set(w.word.toLowerCase(), w);
      });
      return {
        ...res,
        data: {
          content: normalizedList,
          pageable: pageData.pageable || { pageNumber: p.page ?? 0, pageSize: p.size ?? 20, totalElements, totalPages },
          totalPages,
          totalElements,
        },
      };
    });
  },
  autocomplete: async (prefix: string, limit = 8): Promise<Word[]> => {
    const trimmed = (prefix || '').trim();
    if (!trimmed) return [];
    try {
      const res = await api.get<any>('/cefr-words/autocomplete', {
        params: { prefix: trimmed, limit },
      });
      const pageData = res.data || {};
      const rawList = Array.isArray(pageData.content)
        ? pageData.content
        : (Array.isArray(pageData) ? pageData : []);
      const normalizedList: Word[] = rawList.map(normalizeWord);
      normalizedList.forEach((w: Word) => {
        if (w.id) WORD_CACHE.set(String(w.id), w);
        if (w.word) WORD_CACHE.set(w.word.toLowerCase(), w);
      });
      return normalizedList;
    } catch (e) {
      console.warn('Autocomplete fetch failed:', e);
      return [];
    }
  },
  randomBatch: async (p: { level?: string; limit?: number }) => {
    const params: Record<string, any> = {
      limit: p.limit ?? 25,
    };
    if (p.level && p.level !== 'Tất cả' && p.level !== 'ALL') {
      params.level = p.level;
    }
    const res = await api.get<any>('/cefr-words/random-batch', { params });
    const rawList = Array.isArray(res.data) ? res.data : (Array.isArray(res.data?.content) ? res.data.content : []);
    const normalizedList: Word[] = rawList.map(normalizeWord);
    normalizedList.forEach((w: Word) => {
      if (w.id) WORD_CACHE.set(String(w.id), w);
      if (w.word) WORD_CACHE.set(w.word.toLowerCase(), w);
    });
    return {
      ...res,
      data: normalizedList,
    };
  },
  get: async (id: string | number) => {
    const idStr = String(id).trim();
    if (!idStr) throw new Error('Word not found');

    // 1. Check in-memory WORD_CACHE
    const cached = WORD_CACHE.get(idStr) || WORD_CACHE.get(idStr.toLowerCase());
    if (cached) return { data: cached };

    // 2. Check local cached favorite items
    try {
      const items: Word[] = JSON.parse(localStorage.getItem('vocab_fav_items') || '[]');
      const found = items.find((x) => String(x.id) === idStr || (x.word && x.word.toLowerCase() === idStr.toLowerCase()));
      if (found) {
        const norm = normalizeWord(found);
        WORD_CACHE.set(idStr, norm);
        return { data: norm };
      }
    } catch {}

    // 3. Check built-in fallback index for instant lookup
    if (KNOWN_CEFR_FALLBACKS[idStr]) {
      const norm = normalizeWord(KNOWN_CEFR_FALLBACKS[idStr]);
      WORD_CACHE.set(idStr, norm);
      return { data: norm };
    }

    // 4. Try GET /cefr-words/${id}
    try {
      const res = await api.get<any>(`/cefr-words/${encodeURIComponent(idStr)}`);
      if (res.data) {
        const norm = normalizeWord(res.data);
        WORD_CACHE.set(idStr, norm);
        return { data: norm };
      }
    } catch {}

    // 5. Try GET /cefr-words/lemma/${id} if id is a word name
    try {
      const res = await api.get<any>(`/cefr-words/lemma/${encodeURIComponent(idStr)}`);
      if (res.data) {
        const norm = normalizeWord(res.data);
        WORD_CACHE.set(idStr, norm);
        return { data: norm };
      }
    } catch {}

    // 6. Try searching /cefr-words/search?query=${id}
    try {
      const res = await api.get<any>(`/cefr-words/search`, { params: { query: idStr, size: 5 } });
      const rawList = Array.isArray(res.data?.content) ? res.data.content : (Array.isArray(res.data) ? res.data : []);
      const match = rawList.find((w: any) => String(w.id) === idStr || (w.lemma && w.lemma.toLowerCase() === idStr.toLowerCase()) || (w.word && w.word.toLowerCase() === idStr.toLowerCase()));
      if (match) {
        const norm = normalizeWord(match);
        WORD_CACHE.set(idStr, norm);
        return { data: norm };
      }
    } catch {}

    // 7. Try /words/${id} ONLY if numeric ID
    const isNumeric = /^\d+$/.test(idStr);
    if (isNumeric) {
      try {
        const res = await api.get<any>(`/words/${idStr}`);
        if (res.data) {
          const norm = normalizeWord(res.data);
          WORD_CACHE.set(idStr, norm);
          return { data: norm };
        }
      } catch {}
    }

    throw new Error('Word not found');
  },
  favorite: async (id: number | string, wordObj?: Word) => {
    try {
      const idStr = String(id);
      const local: string[] = JSON.parse(localStorage.getItem('vocab_favs') || '[]');
      if (!local.includes(idStr)) {
        local.push(idStr);
        localStorage.setItem('vocab_favs', JSON.stringify(local));
      }

      const items: Word[] = JSON.parse(localStorage.getItem('vocab_fav_items') || '[]');
      const targetObj = wordObj || KNOWN_CEFR_FALLBACKS[idStr];
      if (targetObj) {
        const idx = items.findIndex((x) => String(x.id) === idStr);
        if (idx === -1) {
          items.push(targetObj);
        } else {
          items[idx] = targetObj;
        }
        localStorage.setItem('vocab_fav_items', JSON.stringify(items));
      }
      try {
        window.dispatchEvent(new Event('vocab_favorites_changed'));
      } catch {}
    } catch { /* ignore */ }
    return api.post(`/words/${id}/favorite`).catch(() => ({ data: {} }));
  },
  unfavorite: async (id: number | string) => {
    try {
      const idStr = String(id);
      const local: string[] = JSON.parse(localStorage.getItem('vocab_favs') || '[]');
      const filtered = local.filter((x: string) => x !== idStr);
      localStorage.setItem('vocab_favs', JSON.stringify(filtered));

      const items: Word[] = JSON.parse(localStorage.getItem('vocab_fav_items') || '[]');
      const filteredItems = items.filter((x) => String(x.id) !== idStr);
      localStorage.setItem('vocab_fav_items', JSON.stringify(filteredItems));
      try {
        window.dispatchEvent(new Event('vocab_favorites_changed'));
      } catch {}
    } catch { /* ignore */ }
    return api.delete(`/words/${id}/favorite`).catch(() => ({ data: {} }));
  },
  favorites: async (page = 0, size = 100) => {
    let beItems: Word[] = [];
    const t = localStorage.getItem('vocab_access');
    const hasToken = Boolean(t && t !== 'undefined' && t !== 'null');
    if (hasToken) {
      try {
        const res = await api.get<any>('/words/favorites', { params: { page, size } });
        const rawList = Array.isArray(res.data?.content) ? res.data.content : (Array.isArray(res.data) ? res.data : []);
        beItems = rawList.map((item: any) => normalizeWord(item.word || item));
      } catch {
        // Unauthenticated hoặc chưa có favorite trên BE
      }
    }

    // Get cached items in localStorage
    let cachedItems: Word[] = [];
    try {
      cachedItems = JSON.parse(localStorage.getItem('vocab_fav_items') || '[]');
    } catch {}

    let localIds: string[] = [];
    try {
      localIds = JSON.parse(localStorage.getItem('vocab_favs') || '[]');
    } catch {}

    // Merge beItems, cachedItems, and KNOWN_CEFR_FALLBACKS for localIds
    const itemMap = new Map<string, Word>();
    beItems.forEach((w) => itemMap.set(String(w.id), w));
    cachedItems.forEach((w) => itemMap.set(String(w.id), w));

    // For any localId not yet in itemMap, resolve from KNOWN_CEFR_FALLBACKS
    localIds.forEach((id) => {
      if (!itemMap.has(id) && KNOWN_CEFR_FALLBACKS[id]) {
        itemMap.set(id, KNOWN_CEFR_FALLBACKS[id]);
      }
    });

    // If there are still missing localIds, try to fetch them asynchronously
    const remainingMissing = localIds.filter((id) => !itemMap.has(id));
    if (remainingMissing.length > 0) {
      try {
        const fetched = await Promise.all(
          remainingMissing.slice(0, 20).map((id) => wordApi.get(id).then((r) => r.data).catch(() => null))
        );
        fetched.forEach((w) => {
          if (w) itemMap.set(String(w.id), w);
        });
      } catch {}
    }

    const mergedContent = Array.from(itemMap.values());

    // Sync back to vocab_fav_items cache
    try {
      localStorage.setItem('vocab_fav_items', JSON.stringify(mergedContent));
    } catch {}

    return {
      data: {
        content: mergedContent,
        localIds,
        pageable: { pageNumber: page, pageSize: size, totalElements: mergedContent.length, totalPages: 1 },
        totalElements: mergedContent.length,
        totalPages: 1,
      },
    };
  },
};

/* ---------- learning ---------- */
export const learnApi = {
  start: (wordId: number | string) => {
    return api.post(`/learning/words/${wordId}/start`);
  },
  review: (wordId: number | string, isCorrect: boolean) => {
    return api.post(`/learning/words/${wordId}/review`, { correct: isCorrect });
  },
  queue: (limit = 10) =>
    api.get<any>('/learning/review-queue', { params: { size: limit } }).then((res) => {
      const pageData = res.data || {};
      const raw = Array.isArray(pageData.content) ? pageData.content : (Array.isArray(pageData) ? pageData : []);
      const content = raw.map((item: any) => ({
        id: item.id,
        word: normalizeWord(item.word),
        status: item.status,
        correctCount: item.correctCount || 0,
        wrongCount: item.wrongCount || 0,
        reviewCount: item.reviewCount || 0,
        accuracy: item.accuracy,
        nextReviewAt: item.nextReviewAt,
        lastReviewedAt: item.lastReviewedAt,
      }));
      return {
        ...res,
        data: {
          content,
          totalElements: pageData.totalElements ?? content.length,
          totalPages: pageData.totalPages ?? 1,
        },
      };
    }).catch(() => ({
      data: {
        content: [] as ProgressItem[],
        totalElements: 0,
        totalPages: 1,
      },
    })),
  stats: () =>
    api.get<any>('/learning/statistics').then((res) => ({ ...res, data: res.data as LearningStats })).catch(() => ({ data: null })),
};

/* ---------- quiz ---------- */
export const quizApi = {
  list: (p: { page?: number; size?: number; level?: string }) => {
    const params: Record<string, any> = { page: p.page ?? 0, size: p.size ?? 50 };
    return api.get<any>('/quizzes', { params }).then((res) => {
      const pageData = res.data || {};
      const raw = Array.isArray(pageData.content) ? pageData.content : (Array.isArray(pageData) ? pageData : []);
      let content: Quiz[] = raw.map((q: any) => ({
        id: q.id,
        title: q.title,
        level: q.level || 'B1',
        timeLimit: q.timeLimit || 15,
        questionCount: q.questionCount || 5,
        category: q.categoryName || q.category?.name || q.category || 'Tổng hợp',
        status: q.status,
      }));
      if (p.level && p.level !== 'Tất cả') {
        const targetLvl = p.level.toUpperCase();
        content = content.filter((q) => q.level.toUpperCase() === targetLvl);
      }
      return { ...res, data: { ...pageData, content } };
    });
  },
  detail: (id: number) =>
    api.get<any>(`/quizzes/${id}`).then((res) => {
      const d = res.data || {};
      const quizObj = d.quiz || d;
      const questionsList = d.questions || [];
      const detail: QuizDetail = {
        id: quizObj.id,
        title: quizObj.title,
        level: quizObj.level || 'B1',
        timeLimit: quizObj.timeLimit || 15,
        questionCount: questionsList.length || quizObj.questionCount || 5,
        totalQuestions: questionsList.length || 5,
        category: quizObj.category?.name || quizObj.category,
        status: quizObj.status,
        questions: questionsList.map((q: any) => ({
          id: q.id,
          content: q.content,
          options: Array.isArray(q.options) ? q.options : [],
        })),
      };
      return { ...res, data: detail };
    }),
  start: (id: number) =>
    api.post<any>(`/quizzes/${id}/start`).then((res) => {
      const a = res.data || {};
      const attempt: Attempt = {
        attemptId: a.id || a.attemptId,
        quizId: a.quizId || id,
        startedAt: a.startedAt || new Date().toISOString(),
        expiresAt: a.expiresAt || new Date(Date.now() + (a.timeLimit || 15) * 60000).toISOString(),
      };
      return { ...res, data: attempt };
    }),
  submit: (attemptId: number, answers: { questionId: number; answer: number }[]) =>
    api.post<any>(`/quizzes/${attemptId}/submit`, { answers }).then((res) => {
      const a = res.data || {};
      const score = Math.round(Number(a.score ?? 0));
      const result: QuizResult = {
        attemptId: a.id || attemptId,
        score,
        totalQuestions: a.totalQuestions || answers.length,
        correctAnswers: a.correctAnswers || 0,
        feedback:
          score >= 80
            ? 'Xuất sắc! Bạn nắm rất vững kiến thức phần này.'
            : score >= 60
            ? 'Khá tốt! Ôn lại vài từ vựng còn nhầm lẫn nhé.'
            : 'Cần cố gắng thêm — hãy ôn lại các từ trong bài học nhé.',
      };
      return { ...res, data: result };
    }),
};

/* ---------- ai ---------- */
import { buildExplainPrompt, generateFallbackExplanation } from '../utils/aiFallback';
export { buildExplainPrompt, generateFallbackExplanation };

export const aiApi = {
  explain: async (
    wordId: number | string,
    wordText?: string,
    meta?: { partOfSpeech?: string; level?: string; vietnameseMeaning?: string }
  ) => {
    const targetWord = wordText || String(wordId);
    const prompt = buildExplainPrompt(targetWord, meta);

    try {
      const convRes = await api.post<any>('/api/v1/ai/conversations', {
        type: 'VOCABULARY',
        title: `Giải thích: ${targetWord}`,
      });
      const convId = convRes.data.id;
      const msgRes = await api.post<any>(`/api/v1/ai/conversations/${convId}/messages`, { content: prompt });
      const reply = msgRes.data?.content || msgRes.data?.message || '';
      return {
        data: {
          wordId,
          word: targetWord,
          meaning: reply,
          examples: [],
          synonyms: [],
          usageTips: '',
          tokensUsed: msgRes.data?.tokensUsed || 200,
          source: 'gemini-ai',
        } as Explain,
      };
    } catch {
      // Fallback khi AI backend gặp sự cố hoặc timeout
      const fallbackText = generateFallbackExplanation(
        targetWord,
        meta?.level,
        meta?.partOfSpeech,
        meta?.vietnameseMeaning
      );
      return {
        data: {
          wordId,
          word: targetWord,
          meaning: fallbackText,
          examples: [],
          synonyms: [],
          usageTips: '',
          tokensUsed: 0,
          source: 'fallback',
        } as Explain,
      };
    }
  },
  grammar: (text: string) =>
    api.post<any>('/api/v1/ai/grammar/check', { text, language: 'English', includeSuggestions: true }).then((res) => {
      const d = res.data;
      const score = Math.max(0, 100 - (d.errors?.length || 0) * 15);
      return {
        data: {
          originalText: d.originalText || text,
          correctedText: d.correctedText || text,
          score,
          errors: (d.errors || []).map((e: any) => ({
            errorType: e.errorType || 'GRAMMAR',
            message: e.explanation || e.message || '',
            suggestion: e.suggestion || '',
          })),
          tokensUsed: 120,
        } as GrammarResp,
      };
    }),
  hint: (progressId: number, attemptCount: number) =>
    api.post<any>('/api/v1/ai/hints/generate', { learningProgressId: progressId, attemptCount }).then((res) => {
      const d = res.data;
      return {
        data: {
          progressId,
          word: d.word || '',
          attemptCount,
          hint: d.hint || d.message || 'Hãy nhớ lại ngữ cảnh bạn đã gặp từ này nhé.',
          difficulty: d.difficulty || 'medium',
          tokensUsed: d.tokensUsed || 50,
        } as Hint,
      };
    }),
  createConv: (type: string, title: string) =>
    api.post<any>('/api/v1/ai/conversations', { type, title }).then((res) => ({ ...res, data: res.data })),
  listConv: () =>
    api.get<any>('/api/v1/ai/conversations', { params: { page: 0, size: 50 } }).then((res) => {
      const pageData = res.data || {};
      const content = Array.isArray(pageData.content) ? pageData.content : (Array.isArray(pageData) ? pageData : []);
      return { ...res, data: { ...pageData, content } };
    }),
  updateConvTitle: (convId: number, title: string) =>
    api.put<any>(`/api/v1/ai/conversations/${convId}/title`, { title }).then((res) => res.data),
  deleteConv: (convId: number) =>
    api.delete<any>(`/api/v1/ai/conversations/${convId}`).then((res) => res.data),
  sendMsg: (convId: number, content: string) =>
    api.post<any>(`/api/v1/ai/conversations/${convId}/messages`, { content }).then((res) => {
      const m = res.data;
      return {
        ...res,
        data: {
          id: m.id,
          conversationId: convId,
          role: m.role || 'ASSISTANT',
          content: m.content,
          tokensUsed: m.tokensUsed,
        } as ChatMsg,
      };
    }),
  convMsgs: (convId: number) =>
    api.get<any>(`/api/v1/ai/conversations/${convId}`).then((res) => {
      const d = res.data || {};
      return {
        ...res,
        data: {
          messages: (d.messages || []).map((m: any) => ({
            id: m.id,
            conversationId: convId,
            role: m.role,
            content: m.content,
            tokensUsed: m.tokensUsed,
          })),
        },
      };
    }),
};

/* ---------- speaking ---------- */
export const speakApi = {
  createSession: (topic: string, level: string) =>
    api.post<any>('/api/ai/speaking/sessions', { topic, level }).then((res) => ({ ...res, data: res.data })),
  uploadAttempt: (sessionId: number, file: Blob) => {
    const fd = new FormData();
    fd.append('audioFile', file, 'recording.webm');
    return api.post<any>(`/api/ai/speaking/attempts?sessionId=${sessionId}`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 180000,
    }).then((res) => ({ ...res, data: res.data }));
  },
  sessionDetail: (id: number) =>
    api.get<any>(`/api/ai/speaking/sessions/${id}`).then((res) => ({ ...res, data: res.data })),
  listSessions: (page = 0, size = 10) =>
    api.get<any>('/api/ai/speaking/sessions', { params: { page, size, sort: 'createdAt,desc' } }).then((res) => ({ ...res, data: res.data })),
};

/* ---------- tts (Text to Speech) ---------- */
export const ttsApi = {
  synthesizeWord: (word: string, language = 'en-US') =>
    api.post<any>('/ai/speaking/tts/word', { word, language }).then((res) => ({ ...res, data: res.data })),
  synthesizePhrase: (phrase: string, language = 'en-US') =>
    api.post<any>('/ai/speaking/tts/phrase', { phrase, language }).then((res) => ({ ...res, data: res.data })),
  getStreamUrl: (text: string, voice = 'alloy') =>
    `${import.meta.env.VITE_API_URL || 'http://localhost:8080/api'}/ai/speaking/tts/stream?text=${encodeURIComponent(text)}&voice=${encodeURIComponent(voice)}`,
};

/* ---------- user ---------- */
export const userApi = {
  me: () =>
    api
      .get<any>('/users/me')
      .then((res) => {
        const u = res.data?.data || res.data;
        return { ...res, data: u as User };
      })
      .catch(() => ({ data: null })),
  updateProfile: (data: { fullName?: string; avatarUrl?: string }) =>
    api.put<any>('/users/me', data).then((res) => ({ ...res, data: res.data?.data || res.data })),
  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append('avatar', file);
    return api.post<any>('/users/me/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((res) => ({ ...res, data: (res.data?.data || res.data) as User }));
  },
  deleteAvatar: () =>
    api.delete<any>('/users/me/avatar').then((res) => ({ ...res, data: (res.data?.data || res.data) as User })),
  changePassword: (data: { oldPassword: string; newPassword: string; confirmPassword: string }) =>
    api.put<any>('/users/me/password', data).then((res) => ({ ...res, data: res.data })),
};

/* ---------- personalized learning ---------- */
export interface PerformanceMetric {
  score: number;
  itemsLearned?: number;
  totalActivities?: number;
  accuracy?: number;
  level: string;
}

export interface LearningProfile {
  userId: number;
  userName: string;
  currentLevel: string;
  overallScore: number;
  vocabulary?: PerformanceMetric;
  grammar?: PerformanceMetric;
  speaking?: PerformanceMetric;
  currentStreak?: number;
  longestStreak?: number;
  achievements?: string[];
  nextMilestone?: string;
  weakTopics?: string[];
  strongTopics?: string[];
  learningFrequency?: number;
  averageSessionDuration?: number;
}

export interface WeaknessItem {
  area: string;
  skill: string;
  severity: string;
  description: string;
  recommendation: string;
}

export interface StrengthItem {
  area: string;
  skill: string;
  proficiencyLevel: string;
  description: string;
}

export interface PriorityAction {
  action: string;
  area: string;
  expectedImpact: string;
  timeFrame?: string;
}

export interface WeaknessStrengthAnalysis {
  profileSummary?: string;
  learningStyle?: string;
  motivationLevel?: string;
  weaknesses?: WeaknessItem[];
  criticalWeaknesses?: WeaknessItem[];
  strengths?: StrengthItem[];
  outstandingStrengths?: StrengthItem[];
  priorityActions?: PriorityAction[];
  immediateNextSteps?: string[];
}

export interface DailyActivity {
  id?: string | number;
  activityTitle: string;
  activityType: 'VOCABULARY' | 'GRAMMAR' | 'SPEAKING' | 'QUIZ' | string;
  durationMinutes: number;
  description: string;
  isPriority?: boolean;
  completed?: boolean;
}

export interface DailyPractice {
  dayTitle: string;
  dailyGoal: string;
  motivationalTip?: string;
  totalDurationMinutes: number;
  activities: DailyActivity[];
}

export interface MilestoneItem {
  id?: string | number;
  title: string;
  targetWeek: number;
  targetDate?: string;
  completed: boolean;
  description: string;
}

export interface WeekPlan {
  weekNumber: number;
  weekTitle: string;
  focusArea: string;
  targetMinutes: number;
  completed?: boolean;
}

export interface LearningPlan {
  planTitle: string;
  planDescription: string;
  primaryGoal: string;
  totalCommitmentMinutesPerWeek: number;
  weeks?: WeekPlan[];
  milestones?: MilestoneItem[];
}

export interface ProgressPrediction {
  estimatedCompletionDate?: string;
  onTimeCompletionProbability?: number;
  daysAheadOrBehind?: number;
  status?: 'AHEAD' | 'BEHIND' | 'ON_TRACK';
}

export interface AdaptiveDifficulty {
  recommendedAverageDifficulty?: number;
  performanceTrend?: string;
  performanceSummary?: string;
  performanceByTopic?: Record<string, any>;
}

export const personalizedApi = {
  profile: () =>
    api.get<any>('/ai/personalized/profile').then((res) => ({
      ...res,
      data: (res.data?.data || res.data?.profile || res.data) as LearningProfile,
    })),
  level: () =>
    api.get<any>('/ai/personalized/level').then((res) => ({
      ...res,
      data: (typeof res.data === 'string' ? res.data : (res.data?.data?.level || res.data?.level || 'B1')) as string,
    })),
  analysis: (refresh?: boolean) =>
    api.get<any>(`/ai/personalized/analysis${refresh ? '?refresh=true' : ''}`).then((res) => ({
      ...res,
      data: (res.data?.data || res.data?.analysis || res.data) as WeaknessStrengthAnalysis,
    })),
  recommendations: () =>
    api.get<any>('/ai/personalized/recommendations').then((res) => ({
      ...res,
      data: res.data?.data || res.data?.recommendations || res.data,
    })),
  plan: () =>
    api.get<any>('/ai/personalized/plan').then((res) => ({
      ...res,
      data: (res.data?.data || res.data?.plan || res.data) as LearningPlan,
    })),
  dailyPractice: () =>
    api.get<any>('/ai/personalized/daily-practice').then((res) => ({
      ...res,
      data: (res.data?.data || res.data?.dailyPractice || res.data) as DailyPractice,
    })),
  prediction: () =>
    api.get<any>('/ai/personalized/progress-analysis/prediction').then((res) => ({
      ...res,
      data: (res.data?.data || res.data) as ProgressPrediction,
    })),
  adaptiveDifficulty: () =>
    api.get<any>('/ai/personalized/adaptive-difficulty').then((res) => ({
      ...res,
      data: (res.data?.adaptiveDifficulty || res.data) as AdaptiveDifficulty,
    })),
  weakTopics: () =>
    api.get<any>('/ai/personalized/weak-topics').then((res) => ({
      ...res,
      data: (Array.isArray(res.data) ? res.data : (res.data?.weakTopics || [])) as string[],
    })),
  completeDailyActivity: (activityId: string | number) =>
    api.post('/ai/personalized/daily-practice/complete', { activityId }),
};

/* ============================================================
   ADMIN API & TYPES
   ============================================================ */

export interface AdminDashboardSummary {
  totalUsers: number;
  activeSubscriptions: number;
  totalRevenue: number;
  activeLearningSessionsToday: number;
  systemStatus: string;
  lastUpdatedAt: string;
}

export interface AdminRevenueMetrics {
  totalRevenue: number;
  revenueToday: number;
  revenueThisMonth: number;
  totalPayments: number;
  paymentsToday: number;
  averagePaymentAmount: number;
  popularPackageId?: number;
  popularPackageName?: string;
}

export interface AdminStudent {
  userId: number;
  username: string;
  email: string;
  fullName: string;
  status: 'ACTIVE' | 'INACTIVE' | 'BANNED';
  hasActiveSubscription: boolean;
  totalSessions: number;
  createdAt: string;
  lastLoginAt?: string;
}

export interface AdminStudentDetail extends AdminStudent {
  wordsLearned: number;
  accuracyRate: number;
  packageName?: string;
  subscriptionStartAt?: string;
  subscriptionEndAt?: string;
  remainingDays: number;
  totalPaid: number;
  paymentCount: number;
  lastPaymentAt?: string;
  updatedAt?: string;
  avatarUrl?: string;
}

export interface AdminCefrStats {
  a1Count: number;
  a2Count: number;
  b1Count: number;
  b2Count: number;
  c1Count: number;
  totalCount: number;
}

export interface AdminVocabularyItem {
  id: string;
  word: string;
  pronunciation?: string;
  partOfSpeech?: string;
  cefr?: string;
  meaning: string;
  vietnameseMeaning?: string;
  definition?: string;
  example?: string;
  source?: string;
  createdAt?: string;
}

export interface AdminQuiz {
  id: number;
  title: string;
  description?: string;
  level: string;
  timeLimit: number;
  questionCount: number;
  status: 'PUBLISHED' | 'DRAFT' | 'ARCHIVED';
  categoryId?: number;
  categoryName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminQuestion {
  id: number;
  quizId: number;
  content: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

export const adminApi = {
  // Dashboard & Metrics
  summary: () => api.get<AdminDashboardSummary>('/admin/dashboard/summary'),
  revenue: () => api.get<AdminRevenueMetrics>('/admin/dashboard/revenue'),
  topStudents: (limit = 5) => api.get<any[]>(`/admin/dashboard/top-students?limit=${limit}`),
  activityTrend: () => api.get<any>('/admin/dashboard/activity-trend'),

  // System monitoring
  systemHealth: () => api.get<any>('/api/admin/system/health'),
  systemOverview: () => api.get<any>('/api/admin/system/overview'),

  // User / Student management
  students: (page = 0, size = 20, search = '', status = '') => {
    const params = new URLSearchParams({ page: String(page), size: String(size), sort: 'createdAt,desc' });
    if (search) params.append('search', search);
    if (status && status !== 'ALL') params.append('status', status);
    return api.get<{ content: AdminStudent[]; totalElements: number; totalPages: number }>(`/admin/students?${params}`);
  },
  studentDetail: (userId: number) => api.get<AdminStudentDetail>(`/admin/students/${userId}`),
  updateUserStatus: (userId: number, status: 'ACTIVE' | 'INACTIVE' | 'BANNED') =>
    api.put<User>(`/users/${userId}/status?status=${status}`),

  // Vocabulary & CEFR management
  vocabulary: (page = 0, size = 20, cefr = '', search = '', pos = '') => {
    const params = new URLSearchParams({ page: String(page), size: String(size) });
    if (cefr && cefr !== 'ALL') params.append('cefr', cefr);
    if (search) params.append('search', search);
    if (pos && pos !== 'ALL') params.append('pos', pos);
    return api.get<{ content: AdminVocabularyItem[]; totalElements: number; totalPages: number }>(`/admin/vocabulary?${params}`);
  },
  createWord: (data: Partial<AdminVocabularyItem>) => api.post<AdminVocabularyItem>('/admin/vocabulary', data),
  updateWord: (wordId: string, data: Partial<AdminVocabularyItem>) => api.put<AdminVocabularyItem>(`/admin/vocabulary/${wordId}`, data),
  deleteWord: (wordId: string) => api.delete(`/admin/vocabulary/${wordId}`),
  cefrStats: () => api.get<AdminCefrStats>('/admin/vocabulary/stats/cefr'),
  importAllCefr: () => api.post<any>('/api/admin/cefr-words/import/all'),

  // Quizzes management
  quizzes: (page = 0, size = 50) =>
    api.get<{ content: AdminQuiz[]; totalElements: number; totalPages: number }>(`/quizzes/admin/all?page=${page}&size=${size}`),
  createQuiz: (data: { title: string; description?: string; level: string; timeLimit?: number }) =>
    api.post<AdminQuiz>('/quizzes', data),
  updateQuiz: (id: number, data: { title?: string; description?: string; level?: string; timeLimit?: number }, status?: string) =>
    api.put<AdminQuiz>(`/quizzes/${id}${status ? `?status=${status}` : ''}`, data),
  deleteQuiz: (id: number) => api.delete(`/quizzes/${id}`),

  // Questions management
  questions: (page = 0, size = 50) =>
    api.get<{ content: AdminQuestion[]; totalElements: number; totalPages: number }>(`/api/admin/questions?page=${page}&size=${size}`),
  createQuestion: (data: { quizId: number; content: string; options: string[]; correctAnswer: number; explanation?: string }) =>
    api.post<AdminQuestion>('/api/admin/questions', data),
  updateQuestion: (questionId: number, data: Partial<AdminQuestion>) =>
    api.put<AdminQuestion>(`/api/admin/questions/${questionId}`, data),
  deleteQuestion: (questionId: number) => api.delete(`/api/admin/questions/${questionId}`),

  // Reports
  learningProgressReport: () => api.get<any>('/api/admin/reports/learning-progress'),
  contentPerformanceReport: () => api.get<any>('/api/admin/reports/content-performance'),
  revenueReport: () => api.get<any>('/api/admin/reports/revenue'),
  engagementReport: () => api.get<any>('/api/admin/reports/engagement'),

  // AI Analytics & Cost Optimizer
  aiAnalyticsSummary: (timeRange = '7d') =>
    api.get<AiAnalyticsSummary>(`/api/admin/ai-analytics/summary?timeRange=${timeRange}`),
  aiRequestLogs: (timeRange = '7d', feature = '', status = '', page = 0, size = 15) => {
    const params = new URLSearchParams({ timeRange, page: String(page), size: String(size) });
    if (feature) params.append('feature', feature);
    if (status) params.append('status', status);
    return api.get<{ content: AiRequestLogItem[]; totalElements: number; totalPages: number }>(`/api/admin/ai-analytics/logs?${params}`);
  },

  // AI Vocabulary Studio
  aiVocabAudit: () =>
    api.get<AiVocabAuditSummary>('/api/admin/ai-vocabulary/audit'),
  aiVocabMissingData: (type = 'example', limit = 10) =>
    api.get<any[]>(`/api/admin/ai-vocabulary/missing-data?type=${type}&limit=${limit}`),
  aiVocabGenerate: (word: string, levelHint?: string) =>
    api.post<AiGeneratedWordItem>('/api/admin/ai-vocabulary/generate', { word, levelHint }),
  aiVocabBatchGenerate: (words: string[], levelHint?: string) =>
    api.post<AiGeneratedWordItem[]>('/api/admin/ai-vocabulary/batch-generate', { words, levelHint }),
  aiVocabApprove: (words: AiGeneratedWordItem[], overwriteExisting = true) =>
    api.post<{ success: boolean; savedCount: number; message: string }>('/api/admin/ai-vocabulary/approve', {
      words,
      overwriteExisting,
    }),

  // Admin Copilot (Phase 3)
  copilotChat: (message: string, history: Array<{ sender: 'user' | 'ai'; text: string }>) =>
    api.post<AdminCopilotChatResponse>('/api/admin/copilot/chat', { message, history }),
};

/* ---------- cefr & statistics ---------- */
export interface CefrStats {
  a1Count: number;
  a2Count: number;
  b1Count: number;
  b2Count: number;
  c1Count: number;
  totalCount: number;
}

export const cefrApi = {
  stats: () =>
    api.get<any>('/cefr-words/statistics').then((res) => {
      const d = res.data?.data || res.data;
      return {
        ...res,
        data: d as CefrStats,
      };
    }),
};

/* ---------- subscription & payments ---------- */
export interface SubscriptionPackage {
  id: number;
  code: string;
  name: string;
  price: number;
  durationDays: number;
  description?: string;
  status?: string;
}

export interface SubscriptionStatus {
  subscriptionId?: number;
  userId?: number;
  packageName?: string;
  status?: string;
  remainingDays?: number;
  endDate?: string;
}

export const paymentApi = {
  getPackages: () =>
    api.get<any>('/payments/packages').then((res) => {
      const d = res.data?.data || res.data;
      return {
        ...res,
        data: (Array.isArray(d) ? d : []) as SubscriptionPackage[],
      };
    }),
  initiate: (packageId: number) =>
    api.post<any>(`/payments/initiate?packageId=${packageId}`).then((res) => res.data?.data || res.data),
  getStatus: (orderId: number) =>
    api.get<any>(`/payments/${orderId}`).then((res) => res.data?.data || res.data),
  getSubscriptionStatus: () =>
    api.get<any>('/subscriptions/status').then((res) => {
      const d = res.data?.data || res.data;
      return {
        ...res,
        data: d as SubscriptionStatus | null,
      };
    }),
};

/* ---------- AI Analytics & Cost Optimizer ---------- */
export interface AiAnalyticsSummary {
  totalRequests: number;
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  estimatedCostUsd: number;
  estimatedCostVnd: number;
  averageLatencyMs: number;
  successRate: number;
  errorCount: number;
  activeModel: string;
  periodStart?: string;
  periodEnd?: string;
  featureBreakdown: {
    feature: string;
    displayName: string;
    requestCount: number;
    totalTokens: number;
    costUsd: number;
    avgLatencyMs: number;
    percentage: number;
  }[];
  dailyTrend: {
    date: string;
    requests: number;
    tokens: number;
    costUsd: number;
  }[];
  anomalies: {
    id: number;
    feature: string;
    totalTokens: number;
    latencyMs: number;
    status: string;
    reason: string;
    createdAt: string;
  }[];
  optimizationTips: string[];
}

export interface AiRequestLogItem {
  id: number;
  userId?: number;
  username: string;
  feature: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  latencyMs: number;
  status: string;
  errorMessage?: string;
  createdAt: string;
}

/* ---------- AI Vocabulary Studio ---------- */
export interface AiVocabAuditSummary {
  totalWords: number;
  wordsMissingMeaning: number;
  wordsMissingExample: number;
  wordsMissingPronunciation: number;
  wordsMissingDefinition: number;
  completenessRate: number;
}

export interface AiGeneratedWordItem {
  existingWordId?: number | null;
  word: string;
  pronunciation: string;
  partOfSpeech: string;
  meaning: string;
  definition: string;
  example: string;
  exampleTranslation: string;
  level: string;
  synonyms?: string[];
  antonyms?: string[];
  isDuplicate?: boolean;
}

/* ---------- Admin Copilot (Phase 3) ---------- */
export interface AdminCopilotChatResponse {
  reply: string;
  widgetType: 'cost_summary' | 'vocab_audit' | 'revenue_summary' | 'sla_status' | 'none';
  widgetData?: Record<string, any>;
  suggestedActions?: string[];
}





