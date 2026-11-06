import { api } from './client';
export { api, errMsg } from './client';

/* ---------- types ---------- */
export interface User { id: number; email: string; username: string; fullName?: string; role: 'ADMIN' | 'STUDENT' | 'INSTRUCTOR'; status: string; avatarUrl?: string; emailRemindersEnabled?: boolean; createdAt?: string; provider?: string }
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
  topic?: string;
}

export type WordTopic =
  | 'WORK'
  | 'TRAVEL'
  | 'ACADEMIC'
  | 'TECHNOLOGY'
  | 'HEALTH'
  | 'FOOD'
  | 'MONEY'
  | 'FAMILY'
  | 'SPORTS'
  | 'ENVIRONMENT'
  | 'SOCIETY'
  | 'ARTS';

export const TOPIC_MAP: Record<string, string> = {
  WORK: 'Công việc & Văn phòng',
  TRAVEL: 'Du lịch & Di chuyển',
  ACADEMIC: 'Học thuật & Giáo dục',
  TECHNOLOGY: 'Công nghệ',
  HEALTH: 'Sức khỏe',
  FOOD: 'Ăn uống',
  MONEY: 'Mua sắm & Tiền bạc',
  FAMILY: 'Gia đình & Bạn bè',
  SPORTS: 'Thể thao & Giải trí',
  ENVIRONMENT: 'Môi trường',
  SOCIETY: 'Xã hội & Pháp luật',
  ARTS: 'Nghệ thuật & Văn hóa',
};
export interface AiVocabTagBackfillStatus {
  jobId: string;
  scope?: string;
  total: number;
  processed: number;
  autoSaved: number;
  queued: number;
  skipped: number;
  skippedIntentional?: number;
  failed: number;
  lastError?: string;
  status: string;
  message: string;
}

export interface AiVocabTagBackfillPayload {
  scope?: 'IDS' | 'IMPORT' | 'ALL';
  wordIds?: string[];
  createdAfter?: string;
  source?: string;
  batchSize?: number;
  confidenceThreshold?: number;
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
export interface Quiz {
  id: number;
  title: string;
  description?: string;
  level: string;
  questionCount: number;
  timeLimit: number;
  category?: string;
  status: string;
  visibility?: 'PUBLIC' | 'PRIVATE' | 'PENDING' | 'REJECTED';
  isAiGenerated?: boolean;
  createdBy?: number;
  creatorUsername?: string;
  reviewNote?: string;
  reviewedBy?: number;
  reviewedAt?: string;
  sourceDocumentId?: number;
}
export interface Question { id: number; content: string; options: string[]; correctAnswer?: number; explanation?: string }
export interface QuizDetail extends Quiz { totalQuestions: number; questions: Question[] }
export interface Attempt { attemptId: number; quizId: number; startedAt: string; expiresAt: string }
export interface QuizResult { attemptId: number; score: number; totalQuestions: number; correctAnswers: number; feedback: string }
export interface QuizAttemptAnswerDetail {
  questionId: number;
  content: string;
  options: string[];
  selectedAnswer: number;
  correctAnswer: number;
  isCorrect: boolean;
  explanation?: string;
}
export interface QuizHistoryItem {
  attemptId: number;
  quizId: number;
  quizTitle: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  completed: boolean;
  timeTaken: number;
  submittedAt: string;
}
export interface Explain { wordId: number | string; word: string; meaning: string; examples: string[]; synonyms: string[]; usageTips: string; tokensUsed: number; source: string }
export interface GrammarErr { errorType: string; message: string; suggestion: string; startOffset?: number; endOffset?: number }
export interface GrammarResp { originalText: string; correctedText: string; score: number; errors: GrammarErr[]; tokensUsed: number; meaningMatch?: 'MATCH' | 'PARTIAL' | 'MISMATCH'; overall?: 'PASS' | 'FAIL' }
export interface GrammarHistoryItem { id: number; mode: 'FREE' | 'TOPIC' | 'TRANSLATION'; label?: string; score: number; preview: string; createdAt: string }
export interface GrammarHistoryDetail { id: number; mode: 'FREE' | 'TOPIC' | 'TRANSLATION'; label?: string; score: number; inputText: string; contextJson?: string; resultJson: string; createdAt: string }
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
    topic: w.topic || undefined,
  };
};

/* ---------- auth ---------- */
export const authApi = {
  validate: (d: { email: string; username: string; fullName: string; password: string }) =>
    api.post('/auth/register/validate', d),
  verifyOtp: (d: { email: string; otp: string; username?: string; password?: string; fullName?: string }) =>
    api.post<RegisterSuccess>('/auth/register/verify-otp', { email: d.email, otp: d.otp }),
  login: (d: { emailOrUsername: string; password: string }) =>
    api.post<AuthResp>('/auth/login', d),
  googleLogin: (d: { idToken: string }) =>
    api.post<AuthResp>('/auth/google', d),
  // BE POST /auth/logout yêu cầu body { refreshToken } — không gửi là 400
  logout: () => {
    const rt = localStorage.getItem('vocab_refresh');
    return api.post('/auth/logout', rt ? { refreshToken: rt } : {}).catch(() => {});
  },
  forgotPasswordSendOtp: (d: { email: string }) =>
    api.post<{ message: string; email: string; expiresIn: number; resetToken: string }>('/auth/forgot-password/send-otp', d),
  forgotPasswordVerifyOtp: (d: { email: string; otp: string; resetToken: string }) =>
    api.post<{ message: string; verificationToken: string; instruction: string }>('/auth/forgot-password/verify-otp', d),
  forgotPasswordReset: (d: { email: string; verificationToken: string; newPassword: string }) =>
    api.post<AuthResp>('/auth/forgot-password/reset', d),
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

// Helper to isolate favorite words storage per user in localStorage
export const getFavStorageKeys = () => {
  try {
    const raw = localStorage.getItem('vocab_user');
    if (raw) {
      const u = JSON.parse(raw);
      if (u && (u.id || u.username)) {
        const uid = String(u.id || u.username);
        return {
          idsKey: `vocab_favs_${uid}`,
          itemsKey: `vocab_fav_items_${uid}`,
        };
      }
    }
  } catch {}
  return {
    idsKey: 'vocab_favs_guest',
    itemsKey: 'vocab_fav_items_guest',
  };
};

export const wordApi = {
  list: (p: { page?: number; size?: number; level?: string; topic?: string; search?: string }) => {
    const params: Record<string, any> = {
      page: p.page ?? 0,
      size: p.size ?? 20,
    };
    if (p.level && p.level !== 'Tất cả') params.level = p.level;
    if (p.topic && p.topic !== 'Tất cả') params.topic = p.topic;
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
  topicCounts: (level?: string) => {
    const params: Record<string, any> = {};
    if (level && level !== 'Tất cả') params.level = level;
    return api.get<Array<{ topic: string; count: number }>>('/cefr-words/topic-counts', { params });
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

    // 2. Check local cached favorite items (scoped to current user)
    try {
      const { itemsKey } = getFavStorageKeys();
      const items: Word[] = JSON.parse(localStorage.getItem(itemsKey) || '[]');
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
    const { idsKey, itemsKey } = getFavStorageKeys();
    const idStr = String(id);
    const wKey = wordObj?.word ? wordObj.word.toLowerCase().trim() : '';
    let updatedIds: string[] = [];
    try {
      let items: Word[] = JSON.parse(localStorage.getItem(itemsKey) || '[]');
      const targetObj = wordObj || KNOWN_CEFR_FALLBACKS[idStr];
      const matchIdx = items.findIndex((x) =>
        String(x.id) === idStr ||
        (wKey && x.word && x.word.toLowerCase().trim() === wKey) ||
        (wKey && x.lemma && x.lemma.toLowerCase().trim() === wKey)
      );

      if (matchIdx === -1) {
        if (targetObj) {
          items.push(targetObj);
        } else {
          items.push({ id, word: wKey || idStr, meaning: '', level: 'A1' });
        }
      } else if (targetObj) {
        items[matchIdx] = { ...items[matchIdx], ...targetObj };
      }

      // Save exact unique words list
      localStorage.setItem(itemsKey, JSON.stringify(items));

      // IDs list contains strictly 1 ID per unique word
      updatedIds = Array.from(new Set(items.map((w) => String(w.id))));
      localStorage.setItem(idsKey, JSON.stringify(updatedIds));

      const count = items.length;
      try {
        window.dispatchEvent(
          new CustomEvent('vocab_favorites_changed', {
            detail: { count, ids: updatedIds, added: idStr, word: wordObj?.word },
          })
        );
      } catch {}
    } catch { /* ignore */ }
    return api.post(`/words/${id}/favorite`).catch(() => ({ data: {} }));
  },
  unfavorite: async (id: number | string, wordText?: string) => {
    const { idsKey, itemsKey } = getFavStorageKeys();
    const idStr = String(id);
    const wKey = wordText?.toLowerCase().trim();
    let updatedIds: string[] = [];
    try {
      let items: Word[] = JSON.parse(localStorage.getItem(itemsKey) || '[]');
      items = items.filter((x) => {
        const matchId = String(x.id) === idStr;
        const matchWord = wKey && x.word && x.word.toLowerCase().trim() === wKey;
        const matchLemma = wKey && x.lemma && x.lemma.toLowerCase().trim() === wKey;
        return !matchId && !matchWord && !matchLemma;
      });

      localStorage.setItem(itemsKey, JSON.stringify(items));

      updatedIds = items.map((w) => String(w.id));
      localStorage.setItem(idsKey, JSON.stringify(updatedIds));

      const count = items.length;
      try {
        window.dispatchEvent(
          new CustomEvent('vocab_favorites_changed', {
            detail: { count, ids: updatedIds, removed: idStr, word: wordText },
          })
        );
      } catch {}
    } catch { /* ignore */ }
    return api.delete(`/words/${id}/favorite`).catch(() => ({ data: {} }));
  },
  favorites: async (page = 0, size = 100) => {
    // Purge legacy unscoped global storage
    try {
      localStorage.removeItem('vocab_favs');
      localStorage.removeItem('vocab_fav_items');
    } catch {}

    const { idsKey, itemsKey } = getFavStorageKeys();
    let beItems: Word[] = [];
    let beSuccess = false;
    const t = localStorage.getItem('vocab_access');
    const hasToken = Boolean(t && t !== 'undefined' && t !== 'null');

    if (hasToken) {
      try {
        const res = await api.get<any>('/words/favorites', { params: { page, size } });
        const rawList = Array.isArray(res.data?.content) ? res.data.content : (Array.isArray(res.data) ? res.data : []);
        beItems = rawList.map((item: any) => normalizeWord(item.word || item));
        beSuccess = true;
      } catch {
        // Backend offline or error
      }
    }

    if (beSuccess) {
      // Backend is authoritative for the currently authenticated user
      // Deduplicate backend items by unique word text
      const seenWords = new Set<string>();
      const dedupedItems: Word[] = [];
      beItems.forEach((w) => {
        const key = (w.word || w.lemma || String(w.id)).toLowerCase().trim();
        if (!seenWords.has(key)) {
          seenWords.add(key);
          dedupedItems.push(w);
        }
      });

      const uniqueCount = dedupedItems.length;
      const beIds = dedupedItems.map((w) => String(w.id));

      try {
        localStorage.setItem(idsKey, JSON.stringify(beIds));
        localStorage.setItem(itemsKey, JSON.stringify(dedupedItems));
      } catch {}

      return {
        data: {
          content: dedupedItems,
          localIds: beIds,
          pageable: { pageNumber: page, pageSize: size, totalElements: uniqueCount, totalPages: Math.ceil(uniqueCount / size) || 1 },
          totalElements: uniqueCount,
          count: uniqueCount,
          totalPages: Math.ceil(uniqueCount / size) || 1,
        },
      };
    }

    // Fallback if offline: strictly use this specific user's cache
    let cachedItems: Word[] = [];
    try {
      cachedItems = JSON.parse(localStorage.getItem(itemsKey) || '[]');
    } catch {}

    let localIds: string[] = [];
    try {
      localIds = JSON.parse(localStorage.getItem(idsKey) || '[]');
    } catch {}

    const itemMap = new Map<string, Word>();
    cachedItems.forEach((w) => itemMap.set(String(w.id), w));
    localIds.forEach((id) => {
      if (!itemMap.has(id) && KNOWN_CEFR_FALLBACKS[id]) {
        itemMap.set(id, KNOWN_CEFR_FALLBACKS[id]);
      }
    });

    const mergedContent = Array.from(itemMap.values());
    const validIds = Array.from(new Set([...mergedContent.map((w) => String(w.id)), ...localIds]));
    return {
      data: {
        content: mergedContent,
        localIds: validIds,
        pageable: { pageNumber: page, pageSize: size, totalElements: mergedContent.length, totalPages: 1 },
        totalElements: mergedContent.length,
        totalPages: 1,
      },
    };
  },
  isFavorite: (idOrWord: number | string): boolean => {
    const { idsKey, itemsKey } = getFavStorageKeys();
    try {
      const target = String(idOrWord).toLowerCase().trim();
      const localIds: string[] = JSON.parse(localStorage.getItem(idsKey) || '[]');
      if (localIds.some((x) => String(x).toLowerCase().trim() === target)) return true;

      const items: Word[] = JSON.parse(localStorage.getItem(itemsKey) || '[]');
      return items.some((x) =>
        String(x.id).toLowerCase().trim() === target ||
        (x.word && x.word.toLowerCase().trim() === target) ||
        (x.lemma && x.lemma.toLowerCase().trim() === target)
      );
    } catch {
      return false;
    }
  },
  getFavoriteIds: (): string[] => {
    const { idsKey } = getFavStorageKeys();
    try {
      return JSON.parse(localStorage.getItem(idsKey) || '[]');
    } catch {
      return [];
    }
  },
};

export const isWordFavorited = (
  item?: { id?: string | number; word?: string; lemma?: string } | null,
  favSet?: Set<string>
): boolean => {
  if (!item) return false;
  if (favSet) {
    if (item.id != null && favSet.has(String(item.id).toLowerCase().trim())) return true;
    if (item.word && favSet.has(item.word.toLowerCase().trim())) return true;
    if (item.lemma && favSet.has(item.lemma.toLowerCase().trim())) return true;
    return false;
  }
  return (
    (item.id != null && wordApi.isFavorite(item.id)) ||
    (!!item.word && wordApi.isFavorite(item.word)) ||
    (!!item.lemma && wordApi.isFavorite(item.lemma))
  );
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
    const params: Record<string, any> = { page: p.page ?? 0, size: p.size ?? 500 };
    return api.get<any>('/quizzes', { params }).then((res) => {
      const pageData = res.data || {};
      const raw = Array.isArray(pageData.content) ? pageData.content : (Array.isArray(pageData) ? pageData : []);
      let content: Quiz[] = raw.map((q: any) => ({
        id: q.id,
        title: q.title,
        description: q.description,
        level: q.level || 'B1',
        timeLimit: q.timeLimit || 15,
        questionCount: q.questionCount || 5,
        category: q.categoryName || q.category?.name || q.category || 'Tổng hợp',
        status: q.status,
        creatorUsername: q.creatorUsername,
        isAiGenerated: q.isAiGenerated ?? false,
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
        description: quizObj.description,
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
  getAttemptDetails: (attemptId: number) =>
    api.get<any>(`/quizzes/attempts/${attemptId}`).then((res) => {
      const d = res.data?.data || res.data || {};
      const rawAnswers = Array.isArray(d.answers)
        ? d.answers
        : Array.isArray(res.data?.answers)
        ? res.data.answers
        : [];
      const answers: QuizAttemptAnswerDetail[] = rawAnswers.map((a: any) => ({
        questionId: a.questionId,
        content: a.content,
        options: Array.isArray(a.options) ? a.options : [],
        selectedAnswer: a.selectedAnswer,
        correctAnswer: a.correctAnswer,
        isCorrect:
          a.isCorrect !== undefined
            ? Boolean(a.isCorrect)
            : a.correct !== undefined
            ? Boolean(a.correct)
            : Number(a.selectedAnswer) === Number(a.correctAnswer),
        explanation: a.explanation,
      }));
      return {
        ...res,
        data: {
          attempt: d.attempt || res.data?.attempt,
          answers,
        },
      };
    }),
  getMyQuizDetail: (id: number) =>
    api.get<any>('/quizzes/mine/' + id).then((res) => {
      const d = res.data?.data || res.data || {};
      const quizObj = d.quiz || d;
      const questionsList = d.questions || [];
      const detail: QuizDetail = {
        id: quizObj.id,
        title: quizObj.title,
        description: quizObj.description,
        level: quizObj.level || 'B1',
        timeLimit: quizObj.timeLimit || 15,
        questionCount: questionsList.length || quizObj.questionCount || 5,
        totalQuestions: questionsList.length || 5,
        category: quizObj.category?.name || quizObj.category,
        status: quizObj.status,
        visibility: quizObj.visibility,
        reviewNote: quizObj.reviewNote,
        isAiGenerated: quizObj.isAiGenerated,
        questions: questionsList.map((q: any) => ({
          id: q.id,
          content: q.content,
          options: Array.isArray(q.options) ? q.options : [],
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
        })),
      };
      return { ...res, data: detail };
    }),
  updateMyQuiz: (id: number, data: { title: string; description?: string; level?: string; timeLimit?: number; questions?: any[] }) =>
    api.put<any>('/quizzes/mine/' + id, data).then((res) => res.data?.data || res.data),
  deleteMyQuiz: (id: number) =>
    api.delete<any>('/quizzes/mine/' + id).then((res) => res.data?.data || res.data),
  publishRequest: (id: number) =>
    api.post<any>('/quizzes/mine/' + id + '/publish-request').then((res) => res.data?.data || res.data),
  withdraw: (id: number) =>
    api.post<any>('/quizzes/mine/' + id + '/withdraw').then((res) => res.data?.data || res.data),
  hide: (id: number) =>
    api.post<any>('/quizzes/mine/' + id + '/hide').then((res) => res.data?.data || res.data),
  myQuizzes: (p?: { page?: number; size?: number }) => {
    const params: Record<string, any> = { page: p?.page ?? 0, size: p?.size ?? 20 };
    return api.get<any>('/quizzes/mine', { params }).then((res) => {
      const pageData = res.data?.data || res.data || {};
      const raw = Array.isArray(pageData.content) ? pageData.content : (Array.isArray(pageData) ? pageData : []);
      const content: Quiz[] = raw.map((q: any) => ({
        id: q.id,
        title: q.title,
        description: q.description,
        level: q.level || 'B1',
        timeLimit: q.timeLimit || 15,
        questionCount: q.questionCount || 5,
        category: q.categoryName || q.category?.name || q.category || 'Tự tạo',
        status: q.status,
        visibility: q.visibility || 'PRIVATE',
        isAiGenerated: q.isAiGenerated ?? false,
        createdBy: q.createdBy,
        creatorUsername: q.creatorUsername,
        reviewNote: q.reviewNote,
        reviewedBy: q.reviewedBy,
        reviewedAt: q.reviewedAt,
        sourceDocumentId: q.sourceDocumentId,
      }));
      return { ...res, data: { ...pageData, content } };
    });
  },
  history: (p?: { page?: number; size?: number }) =>
    api.get<any>('/quizzes/history', {
      params: { page: p?.page ?? 0, size: p?.size ?? 6 },
    }).then((res) => {
      const pageData = res.data?.data || res.data || {};
      const raw = Array.isArray(pageData.content) ? pageData.content : [];
      return {
        ...res,
        data: {
          ...pageData,
          content: raw.map((a: any) => ({
            attemptId: a.id,
            quizId: a.quizId,
            quizTitle: a.quizTitle || `Bài thi #${a.quizId}`,
            score: a.score,
            totalQuestions: a.totalQuestions,
            correctAnswers: a.correctAnswers,
            completed: a.completed,
            timeTaken: a.timeTaken,
            submittedAt: a.submittedAt,
          })),
        },
      };
    }),
};


/* ---------- documents & AI exercise ---------- */
export interface DocumentItem {
  id: number;
  originalName: string;
  fileType: 'TXT' | 'MD' | 'PDF' | 'DOCX';
  fileSize: number;
  charCount: number;
  status: 'PENDING' | 'READY' | 'FAILED';
  errorMessage?: string;
  createdAt: string;
}

export interface DocumentAnalysis {
  summary: string;
  suggestedLevel: string;
  mainTopics: string[];
  keyVocabularies: string[];
}

export interface DocumentChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface DraftQuestion {
  content: string;
  options: string[];
  correctAnswer?: number;
  explanation?: string;
}

export interface DocumentChatResponse {
  reply: string;
  draftQuestions?: DraftQuestion[];
}

export interface GenerateQuizRequest {
  title?: string;
  level?: string;
  questionCount?: number;
  extraPrompt?: string;
}

export const documentApi = {
  upload: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<any>('/documents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((res) => res.data?.data || res.data);
  },
  list: (params?: { page?: number; size?: number }) =>
    api.get<any>('/documents', { params }).then((res) => {
      const d = res.data?.data || res.data || {};
      const raw = Array.isArray(d.content) ? d.content : (Array.isArray(d) ? d : []);
      return {
        ...res,
        data: {
          content: raw as DocumentItem[],
          pageable: d.pageable || { pageNumber: params?.page ?? 0, pageSize: params?.size ?? 10 },
          totalElements: d.totalElements ?? raw.length,
          totalPages: d.totalPages ?? 1,
        },
      };
    }),
  get: (id: number) =>
    api.get<any>('/documents/' + id).then((res) => res.data?.data || res.data),
  delete: (id: number) =>
    api.delete<any>('/documents/' + id).then((res) => res.data?.data || res.data),
  analyze: (id: number) =>
    api.post<any>('/documents/' + id + '/analyze').then((res) => res.data?.data || res.data),
  chat: (id: number, messages: DocumentChatMessage[]) =>
    api.post<any>('/documents/' + id + '/generate-chat', { messages }).then((res) => res.data?.data || res.data),
  generateQuiz: (id: number, data: GenerateQuizRequest) =>
    api.post<any>('/documents/' + id + '/generate', data).then((res) => res.data?.data || res.data),
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

      // Tự động xóa đoạn chat tạm ngay sau khi nhận câu trả lời để không lưu vào mục "Trò chuyện với Vi"
      if (convId) {
        api.delete(`/api/v1/ai/conversations/${convId}`).catch(() => {});
      }

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
  getPracticePrompt: (params: { wordId: number; mode?: 'SENTENCE' | 'PARAGRAPH' }) =>
    api.get<any>('/api/v1/ai/grammar/practice/prompt', { params }).then((res) => res.data),

  generatePracticePrompt: (body: { wordId: number; mode?: 'SENTENCE' | 'PARAGRAPH'; level?: string; forceNew?: boolean }) =>
    api.post<any>('/api/v1/ai/grammar/practice/generate', body).then((res) => res.data),

  checkTranslation: (body: {
    text: string;
    viPrompt: string;
    targetWord: string;
    targetMeaning?: string;
    mode?: 'SENTENCE' | 'PARAGRAPH';
  }) =>
    api.post<any>('/api/v1/ai/grammar/check-translation', body).then((res) => {
      const d = res.data;
      const score = typeof d.score === 'number' ? d.score : Math.max(0, 100 - (d.errors?.length || 0) * 15);
      return {
        data: {
          originalText: d.originalText || body.text,
          correctedText: d.correctedText || body.text,
          score,
          errors: (d.errors || []).map((e: any) => ({
            errorType: e.errorType || 'GRAMMAR',
            message: e.explanation || e.message || '',
            suggestion: e.suggestion || '',
            startOffset: typeof e.startOffset === 'number' ? e.startOffset : undefined,
            endOffset: typeof e.endOffset === 'number' ? e.endOffset : undefined,
          })),
          tokensUsed: 120,
          targetWord: d.targetWord,
          isTargetWordUsed: d.isTargetWordUsed,
          viPrompt: d.viPrompt,
          feedback: d.feedback,
          meaningMatch: d.meaningMatch,
          overall: d.overall,
        },
      };
    }),

  topicGrammar: (body: { text: string; topic?: string; level?: string; suggestedWords?: string[]; structures?: string[] }) =>
    api.post<any>('/api/v1/ai/grammar/check-topic', body).then((res) => {
      const d = res.data;
      const score = typeof d.score === 'number' ? d.score : Math.max(0, 100 - (d.errors?.length || 0) * 15);
      return {
        data: {
          originalText: d.originalText || body.text,
          correctedText: d.correctedText || body.text,
          score,
          errors: (d.errors || []).map((e: any) => ({
            errorType: e.errorType || 'GRAMMAR',
            message: e.explanation || e.message || '',
            suggestion: e.suggestion || '',
            startOffset: typeof e.startOffset === 'number' ? e.startOffset : undefined,
            endOffset: typeof e.endOffset === 'number' ? e.endOffset : undefined,
          })),
          tokensUsed: 120,
          outlineReport: d.outlineReport,
        },
      };
    }),
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
            startOffset: typeof e.startOffset === 'number' ? e.startOffset : undefined,
            endOffset: typeof e.endOffset === 'number' ? e.endOffset : undefined,
          })),
          tokensUsed: 120,
        } as GrammarResp,
      };
    }),
  getGrammarHistory: (params?: { mode?: string; page?: number; size?: number }) =>
    api.get<any>('/api/v1/ai/grammar/history', { params }).then((res) => res.data),
  getGrammarHistoryDetail: (id: number) =>
    api.get<any>(`/api/v1/ai/grammar/history/${id}`).then((res) => res.data),
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
  explainQuizQuestion: async (params: {
    questionContent: string;
    options: string[];
    selectedAnswerIndex: number;
    correctAnswerIndex: number;
    presetExplanation?: string;
  }) => {
    const { questionContent, options, selectedAnswerIndex, correctAnswerIndex, presetExplanation } = params;
    const selectedText = options[selectedAnswerIndex] ?? 'Chưa chọn';
    const correctText = options[correctAnswerIndex] ?? '';

    const prompt = `Bạn là trợ lý học tiếng Anh thông minh Vi AI. Người học vừa làm bài trắc nghiệm tiếng Anh và cần phân tích chi tiết cho câu hỏi sau:

Câu hỏi: "${questionContent}"
Các lựa chọn: ${options.map((opt, i) => `${['A', 'B', 'C', 'D'][i]}. ${opt}`).join(', ')}
- Người học đã chọn: "${selectedText}" ${selectedAnswerIndex === correctAnswerIndex ? '(Đúng)' : '(Chưa chính xác)'}
- Đáp án đúng: "${correctText}"
${presetExplanation ? `Giải thích ngữ pháp gốc: ${presetExplanation}` : ''}

Hãy phân tích ngắn gọn, súc tích và dễ nhớ bằng tiếng Việt theo 3 ý rõ ràng:
1. 💡 Vì sao "${correctText}" là đáp án đúng? (Phân tích ngữ pháp, ngữ cảnh hoặc collocation).
2. ⚠️ Vì sao "${selectedText}" lại chưa chính xác? (Giải thích bẫy ngữ pháp hoặc lỗi sai thường gặp).
3. 🎯 Mẹo ghi nhớ: 1 mẹo nhỏ hoặc ví dụ thực tế giúp người học không lặp lại lỗi này.`;

    try {
      const convRes = await api.post<any>('/api/v1/ai/conversations', {
        type: 'GRAMMAR',
        title: `Giải thích câu: ${correctText}`,
      });
      const convId = convRes.data.id;
      const msgRes = await api.post<any>(`/api/v1/ai/conversations/${convId}/messages`, { content: prompt });
      const reply = msgRes.data?.content || msgRes.data?.message || '';

      // Tự động xóa đoạn chat tạm ngay sau khi nhận câu trả lời để không lưu vào mục "Trò chuyện với Vi"
      if (convId) {
        api.delete(`/api/v1/ai/conversations/${convId}`).catch(() => {});
      }

      if (reply) return { explanation: reply };
    } catch {
      // Fallback below
    }

    return {
      explanation: `💡 **Vì sao "${correctText}" là đáp án đúng?**\n${presetExplanation || `Trong ngữ cảnh này, "${correctText}" là từ chính xác nhất về quy tắc ngữ pháp hoặc kết hợp từ (collocation).`}\n\n⚠️ **Vì sao chọn "${selectedText}" chưa chính xác?**\nPhương án "${selectedText}" không thỏa mãn cấu trúc ngữ pháp hoặc từ loại cần điền trong câu này.\n\n🎯 **Mẹo ghi nhớ:** Hãy quan sát các từ đứng liền trước và liền sau chỗ trống để xác định đúng loại từ hoặc giới từ đi kèm.`
    };
  },
  createConv: (type: string, title: string) =>
    api.post<any>('/api/v1/ai/conversations', { type, title }).then((res) => ({ ...res, data: res.data })),
  listConv: () =>
    api.get<any>('/api/v1/ai/conversations', { params: { page: 0, size: 50 } }).then((res) => {
      const pageData = res.data?.data || res.data || {};
      const rawList: any[] = Array.isArray(pageData.content)
        ? pageData.content
        : Array.isArray(pageData)
        ? pageData
        : [];

      // Chỉ giữ lại các cuộc trò chuyện được tạo trực tiếp từ trang Chat (GENERAL),
      // loại bỏ và dọn dẹp các đoạn giải thích phát sinh từ nút click AI
      const content = rawList.filter((c: any) => {
        if (!c) return false;
        const isExplanation =
          c.type !== 'GENERAL' ||
          (typeof c.title === 'string' &&
            (c.title.startsWith('Giải thích:') || c.title.startsWith('Giải thích câu:')));
        if (isExplanation) {
          if (c.id) {
            api.delete(`/api/v1/ai/conversations/${c.id}`).catch(() => {});
          }
          return false;
        }
        return true;
      });

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
  attemptAudioBlob: (sessionId: number, attemptNumber: number) =>
    api.get(`/api/ai/speaking/audio/${sessionId}/attempt-${attemptNumber}/stream`, {
      responseType: 'blob',
    }).then((res) => res.data as Blob),
};


/* ---------- Listening (Luyện nghe) ---------- */
export interface CreateListeningRequest {
  topic: string;
  level?: string;
  voice?: string;
}

export interface CreateListeningResponse {
  exerciseId: number;
  topic: string;
  level: string;
  voice: string;
  audioUrl: string;
}

export interface WordMatchResult {
  originalWord?: string | null;
  userWord?: string | null;
  status: 'CORRECT' | 'NEAR_MISS' | 'INCORRECT' | 'MISSING' | 'EXTRA';
}

export interface ListeningSubmitResponse {
  exerciseId: number;
  score: number;
  totalWords: number;
  correctWords: number;
  nearMissWords: number;
  wordResults: WordMatchResult[];
  transcript?: string;
  userAnswer?: string;
  completedAt?: string;
}

export interface ListeningHistoryItem {
  id: number;
  topic: string;
  level: string;
  voice: string;
  score?: number | null;
  status: string;
  createdAt: string;
  completedAt?: string | null;
}

export const listeningApi = {
  create: (topic: string, level = 'B1', voice = 'alloy') =>
    api.post<CreateListeningResponse>('/ai/listening/create', { topic, level, voice }).then((res) => ({ ...res, data: res.data })),
  audioBlob: (exerciseId: number) =>
    api.get(`/ai/listening/audio/${exerciseId}/stream`, { responseType: 'blob' }).then((res) => res.data as Blob),
  submit: (exerciseId: number, typedText: string) =>
    api.post<ListeningSubmitResponse>(`/ai/listening/${exerciseId}/submit`, { typedText }).then((res) => ({ ...res, data: res.data })),
  detail: (exerciseId: number) =>
    api.get<ListeningSubmitResponse>(`/ai/listening/${exerciseId}`).then((res) => ({ ...res, data: res.data })),
  history: (page = 0, size = 10) =>
    api.get<any>('/ai/listening/history', { params: { page, size, sort: 'createdAt,desc' } }).then((res) => ({ ...res, data: res.data })),
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

/* ---------- voice chat ---------- */
export interface VoiceChatTranscribeResponse {
  transcript: string;
}

export interface VoiceChatReplyRequest {
  topic: string;
  level: string;
  messages: Array<{ role: string; content: string }>;
  opening?: boolean;
}

export interface VoiceChatReplyResponse {
  reply: string;
}

export interface VoiceChatCriterionScore {
  score: number;
  comment: string;
  estimatedFromTranscript?: boolean;
}

export interface VoiceChatNewWord {
  word: string;
  meaning: string;
  example: string;
  wordId?: string | null;
  inDictionary: boolean;
}

export interface VoiceChatScoreResponse {
  grammar: VoiceChatCriterionScore;
  vocabulary: VoiceChatCriterionScore;
  fluency: VoiceChatCriterionScore;
  content: VoiceChatCriterionScore;
  pronunciation: VoiceChatCriterionScore;
  overall: number;
  summary: string;
  newWords: VoiceChatNewWord[];
}

export interface VoiceChatApiOptions {
  signal?: AbortSignal;
  timeout?: number;
}

export const voiceChatApi = {
  transcribe: (audioFile: Blob | File, options?: VoiceChatApiOptions) => {
    const formData = new FormData();
    formData.append('audioFile', audioFile, 'voice-chat.webm');
    return api
      .post<VoiceChatTranscribeResponse>('/ai/speaking/voice-chat/transcribe', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        signal: options?.signal,
        timeout: options?.timeout ?? 45000,
      })
      .then((res) => (res.data as any)?.data || res.data);
  },
  reply: (data: VoiceChatReplyRequest, options?: VoiceChatApiOptions) =>
    api
      .post<VoiceChatReplyResponse>('/ai/speaking/voice-chat/reply', data, {
        signal: options?.signal,
        timeout: options?.timeout ?? 60000,
      })
      .then((res) => (res.data as any)?.data || res.data),
  score: (
    audioFile: Blob | File | null,
    payload: { topic: string; level: string; turns: Array<{ role: string; text: string }> },
    options?: VoiceChatApiOptions
  ) => {
    const formData = new FormData();
    if (audioFile) {
      formData.append('audioFile', audioFile, 'longest-turn.webm');
    }
    formData.append('payload', JSON.stringify(payload));
    return api
      .post<VoiceChatScoreResponse>('/ai/speaking/voice-chat/score', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        signal: options?.signal,
        timeout: options?.timeout ?? 90000,
      })
      .then((res) => (res.data as any)?.data || res.data);
  },
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
  updatePreferences: (preferences: { emailRemindersEnabled: boolean }) =>
    api.patch<any>('/users/me/preferences', preferences).then((res) => ({ ...res, data: (res.data?.data || res.data) as User })),
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
  regeneratePlan: () =>
    api.post<any>('/ai/personalized/plan/regenerate').then((res) => ({
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

export interface AdminLearningProgressReport {
  totalAttempts: number;
  avgScore: number;
  avgCompletionTime: number;
  uniqueUsers: number;
  totalSpeakingSessions?: number;
}

export interface AdminContentPerformanceItem {
  quizId: number;
  quizTitle: string;
  level: string;
  attemptCount: number;
  avgScore: number;
  completionRate: number;
}

export interface AdminSystemHealth {
  totalUsers: number;
  apiCallsToday: number;
  averageResponseTime: number;
  errorRate: number;
  status: string;
  uptime?: string;
  jvmMemory?: string;
  jvmMemoryPercent?: number;
  dbPoolStatus?: string;
}

export interface AdminStudent {
  userId: number;
  username: string;
  email: string;
  fullName: string;
  role?: 'ADMIN' | 'STUDENT' | 'INSTRUCTOR';
  status: 'ACTIVE' | 'INACTIVE' | 'BANNED';
  hasActiveSubscription: boolean;
  totalSessions: number;
  wordsLearned?: number;
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
  students: (page = 0, size = 20, search = '', status = '', role = 'STUDENT') => {
    const params = new URLSearchParams({ page: String(page), size: String(size), sort: 'createdAt,desc' });
    if (search) params.append('search', search);
    if (status && status !== 'ALL') params.append('status', status);
    if (role) params.append('role', role);
    return api.get<{ content: AdminStudent[]; totalElements: number; totalPages: number }>(`/admin/students?${params}`);
  },
  createInstructor: (data: { username: string; email: string; fullName: string; password: string }) =>
    api.post<any>('/admin/students/instructors', data),
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
  aiVocabTagClassify: (lemmas: string[]) =>
    api.post<Array<{ existingWordId?: string; word: string; topic?: string; confidence: number; reason?: string }>>(
      '/api/admin/ai-vocabulary/tag-classify',
      { lemmas }
    ),
  aiVocabTagApprove: (items: Array<{ wordId: string; topic: string }>, overwrite = true) =>
    api.post<{ success: boolean; savedCount: number; message: string }>('/api/admin/ai-vocabulary/tag-approve', {
      items,
      overwrite,
    }),
  aiVocabTagBackfill: (payload: AiVocabTagBackfillPayload) =>
    api.post<AiVocabTagBackfillStatus>(
      '/api/admin/ai-vocabulary/tag-backfill',
      payload
    ),
  aiVocabGetSources: () =>
    api.get<string[]>('/api/admin/ai-vocabulary/sources'),
  aiVocabTagBackfillStatus: (jobId: string) =>
    api.get<AiVocabTagBackfillStatus>(
      `/api/admin/ai-vocabulary/tag-backfill/${jobId}`
    ),
  aiVocabTagBackfillCancel: () =>
    api.post<AiVocabTagBackfillStatus>(
      '/api/admin/ai-vocabulary/tag-backfill/cancel'
    ),
  aiVocabTagQueue: (status = 'PENDING', page = 0, size = 20) =>
    api.get<{ content: Array<{ id: number; cefrWordId: string; lemma: string; suggestedTopic: string; confidence: number; reason: string; status: string; createdAt: string }>; totalElements: number; totalPages: number }>(
      '/api/admin/ai-vocabulary/tag-queue',
      { params: { status, page, size } }
    ),

  // Admin Copilot (Phase 3)
  copilotChat: (message: string, history: Array<{ sender: 'user' | 'ai'; text: string }>) =>
    api.post<AdminCopilotChatResponse>('/api/admin/copilot/chat', { message, history }),

  // Payments & Orders (Phase 1)
  payments: (page = 0, size = 20, status = '', search = '', sort = 'paidAt,desc') => {
    const params = new URLSearchParams({ page: String(page), size: String(size), sort });
    if (status && status !== 'ALL') params.append('status', status);
    if (search) params.append('search', search);
    return api.get<{ content: AdminPaymentItem[]; totalElements: number; totalPages: number }>(`/admin/payments?${params}`);
  },
  paymentDetail: (id: number) => api.get<AdminPaymentDetail>(`/admin/payments/${id}`),

  // Subscriptions
  subscriptions: (page = 0, size = 20, status = '', search = '', activeOnly = false) => {
    const params = new URLSearchParams({ page: String(page), size: String(size), sort: 'createdAt,desc' });
    if (status && status !== 'ALL') params.append('status', status);
    if (search) params.append('search', search);
    if (activeOnly) params.append('activeOnly', 'true');
    return api.get<{ content: AdminSubscriptionItem[]; totalElements: number; totalPages: number }>(`/admin/subscriptions?${params}`);
  },
  subscriptionDetail: (id: number) => api.get<any>(`/admin/subscriptions/${id}`),

  // Packages management
  packages: (page = 0, size = 20, status = '', search = '') => {
    const params = new URLSearchParams({ page: String(page), size: String(size) });
    if (status && status !== 'ALL') params.append('status', status);
    if (search) params.append('search', search);
    return api.get<{ content: AdminPackageItem[]; totalElements: number; totalPages: number }>(`/api/admin/packages?${params}`);
  },
  packageDetail: (id: number) => api.get<AdminPackageItem>(`/api/admin/packages/${id}`),
  packageStats: () => api.get<AdminPackageStats>('/api/admin/packages/stats/summary'),
  createPackage: (data: { code: string; name: string; price: number; durationDays: number; status?: string; description?: string }) =>
    api.post<AdminPackageItem>('/api/admin/packages', data),
  updatePackage: (id: number, data: { name?: string; price?: number; durationDays?: number; status?: string; description?: string }) =>
    api.put<AdminPackageItem>(`/api/admin/packages/${id}`, data),
  deletePackage: (id: number) => api.delete(`/api/admin/packages/${id}`),
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

export interface FeatureQuota {
  limit: number | null;
  used: number;
  remaining: number | null;
}

export interface SubscriptionUsageResponse {
  isVip: boolean;
  isFreeUsageAtLeastHalf?: boolean;
  resetAt: string;
  features: {
    chat: FeatureQuota;
    speaking: FeatureQuota;
    grammar: FeatureQuota;
    explain: FeatureQuota;
    roadmap: FeatureQuota;
    voice?: FeatureQuota;
    listening?: FeatureQuota;
    exercise_generation?: FeatureQuota;
  };
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
  verifyPayment: (orderCode: string | number) =>
    api.post<any>(`/payments/verify/${orderCode}`).then((res) => res.data?.data || res.data),
  getSubscriptionStatus: () =>
    api.get<any>('/subscriptions/status').then((res) => {
      const d = res.data?.data || res.data;
      return {
        ...res,
        data: d as SubscriptionStatus | null,
      };
    }),
  getUsage: () =>
    api.get<any>('/subscription/usage').then((res) => {
      const d = res.data?.data || res.data;
      return d as SubscriptionUsageResponse;
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

/* ---------- Placement Test ---------- */
export interface PlacementStatus {
  completed: boolean;
  placementLevel: string | null;
  attemptCount: number;
  scoreByLevel?: Record<string, number>;
}

export interface PlacementQuestion {
  id: number;
  level: string;
  content: string;
  options: string[];
}

export interface PlacementSubmitRequest {
  answers: {
    questionId: number;
    selectedIndex: number | null;
  }[];
}

export interface PlacementSubmitResult {
  level: string;
  scoreByLevel: Record<string, number>;
  feedback: string;
}

export const placementApi = {
  getStatus: () =>
    api.get<any>('/placement/status').then((res) => ({
      ...res,
      data: (res.data?.data || res.data) as PlacementStatus,
    })),
  getTest: () =>
    api.get<any>('/placement/test').then((res) => ({
      ...res,
      data: (res.data?.data || res.data) as PlacementQuestion[],
    })),
  submit: (req: PlacementSubmitRequest) =>
    api.post<any>('/placement/submit', req).then((res) => ({
      ...res,
      data: (res.data?.data || res.data) as PlacementSubmitResult,
    })),
};

/* ---------- Admin Orders & Packages Types ---------- */
export interface AdminPaymentItem {
  paymentId: number;
  transactionCode: string;
  orderCode: string;
  userId: number;
  userEmail: string;
  userFullName: string;
  packageName: string;
  amount: number;
  status: 'SUCCESS' | 'PENDING' | 'CANCELLED' | 'FAILED';
  paymentMethod: string;
  paidAt?: string;
  createdAt?: string;
}

export interface AdminPaymentDetail extends AdminPaymentItem {
  updatedAt?: string;
  paymentOrder?: {
    orderId: number;
    packageId: number;
    packageName: string;
    packagePrice: number;
    packageDuration: number;
    orderCode: string;
    amount: number;
    status: string;
    paymentUrl?: string;
    expiredAt?: string;
    paidAt?: string;
    createdAt?: string;
  };
  subscription?: {
    subscriptionId: number;
    userId: number;
    packageId: number;
    packageName: string;
    packagePrice: number;
    packageDuration: number;
    status: string;
    startAt: string;
    endAt: string;
    createdAt?: string;
    updatedAt?: string;
  };
}

export interface AdminSubscriptionItem {
  subscriptionId: number;
  userId: number;
  userEmail: string;
  userFullName: string;
  packageId: number;
  packageName: string;
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'SUSPENDED';
  startAt: string;
  endAt: string;
  isExpired: boolean;
  daysRemaining: number;
  createdAt: string;
}

export interface AdminPackageItem {
  id: number;
  code: string;
  name: string;
  price: number;
  durationDays: number;
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminPackageStats {
  totalPackages: number;
  activePackages: number;
  inactivePackages: number;
  archivedPackages: number;
}

/* ---------- Content Reports API ---------- */
export type ContentReportType =
  | 'WRONG_MEANING'
  | 'WRONG_EXAMPLE'
  | 'WRONG_PRONUNCIATION'
  | 'WRONG_LEVEL'
  | 'OTHER';

export type ContentReportStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'FIXED';

export const CONTENT_REPORT_TYPE_LABELS: Record<ContentReportType, string> = {
  WRONG_MEANING: 'Sai nghĩa tiếng Việt',
  WRONG_EXAMPLE: 'Câu ví dụ chưa chuẩn',
  WRONG_PRONUNCIATION: 'Phát âm / Phiên âm sai',
  WRONG_LEVEL: 'Cấp độ CEFR chưa đúng',
  OTHER: 'Lỗi khác',
};

export const CONTENT_REPORT_STATUS_LABELS: Record<ContentReportStatus, { label: string; color: string; bg: string }> = {
  PENDING: { label: 'Chờ duyệt', color: 'var(--yellow-dark)', bg: 'var(--yellow-bg)' },
  APPROVED: { label: 'Đã duyệt lỗi', color: 'var(--primary)', bg: 'rgba(21, 101, 192, 0.1)' },
  REJECTED: { label: 'Từ chối', color: 'var(--red-dark)', bg: 'var(--red-bg)' },
  FIXED: { label: 'Đã sửa xong', color: 'var(--green-dark)', bg: 'var(--green-bg)' },
};

export interface ContentReportItem {
  id: number;
  userId: number;
  userFullName?: string;
  userEmail?: string;
  cefrWordId: string;
  lemmaSnapshot: string;
  type: ContentReportType;
  description: string;
  status: ContentReportStatus;
  adminNote?: string;
  resolvedBy?: number;
  resolverName?: string;
  createdAt: string;
  resolvedAt?: string;
}

export const contentReportApi = {
  create: (data: { cefrWordId: string; type: ContentReportType; description: string }) =>
    api.post<any>('/content-reports', data),
  listAdmin: (params?: { status?: ContentReportStatus; type?: ContentReportType; page?: number; size?: number }) =>
    api.get<any>('/admin/content-reports', { params }),
  resolve: (id: number, data: { status: ContentReportStatus; adminNote?: string }) =>
    api.post<any>(`/admin/content-reports/${id}/resolve`, data),
};

/* ---------- User Custom Words API ---------- */
export interface CustomWordItem {
  id: number;
  userId: number;
  lemma: string;
  vietnameseMeaning: string;
  partOfSpeech?: string;
  example?: string;
  exampleTranslation?: string;
  cefrLevel: string;
  topic: string;
  createdAt: string;
  updatedAt: string;
}

export const myWordsApi = {
  list: (params?: { level?: string; topic?: string; search?: string; page?: number; size?: number }) =>
    api.get<any>('/my-words', { params }),
  get: (id: number) =>
    api.get<any>(`/my-words/${id}`),
  create: (data: { lemma: string; vietnameseMeaning: string; partOfSpeech?: string; example?: string; exampleTranslation?: string; cefrLevel: string; topic: string }) =>
    api.post<any>('/my-words', data),
  update: (id: number, data: { vietnameseMeaning: string; partOfSpeech?: string; example?: string; exampleTranslation?: string; cefrLevel: string; topic: string }) =>
    api.put<any>(`/my-words/${id}`, data),
  delete: (id: number) =>
    api.delete<any>(`/my-words/${id}`),
};







/* ---------- In-App Notifications API ---------- */
export interface InAppNotification {
  id: number;
  title: string;
  content: string;
  type: 'EXERCISE_PENDING_REVIEW' | 'EXERCISE_APPROVED' | 'EXERCISE_REJECTED' | 'SYSTEM' | string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationPage {
  content: InAppNotification[];
  unreadCount: number;
  totalElements: number;
  totalPages: number;
  pageNumber: number;
  pageSize: number;
}

export const notificationApi = {
  list: (params?: { page?: number; size?: number }) => {
    const p = { page: params?.page ?? 0, size: params?.size ?? 10 };
    return api.get<any>('/notifications', { params: p }).then((res) => {
      const d = res.data?.data || res.data || {};
      return {
        content: (d.content || []).map((n: any) => ({
          id: n.id,
          title: n.title,
          content: n.content,
          type: n.type,
          link: n.link,
          isRead: Boolean(n.read ?? n.isRead),
          createdAt: n.createdAt,
        })),
        unreadCount: Number(d.unreadCount ?? 0),
        totalElements: Number(d.totalElements ?? 0),
        totalPages: Number(d.totalPages ?? 0),
        pageNumber: Number(d.pageNumber ?? 0),
        pageSize: Number(d.pageSize ?? 10),
      } as NotificationPage;
    });
  },
  read: (id: number) =>
    api.post<any>(`/notifications/${id}/read`).then((res) => res.data?.data || res.data),
  readAll: () =>
    api.post<any>('/notifications/read-all').then((res) => res.data?.data || res.data),
};

/* ---------- Admin Exercise Review API ---------- */
export interface PendingQuizItem {
  id: number;
  title: string;
  description?: string;
  level: string;
  timeLimit: number;
  questionCount: number;
  category: string;
  status: string;
  visibility: string;
  isAiGenerated: boolean;
  creatorUsername?: string;
  createdAt: string;
}

export const adminExerciseReviewApi = {
  list: (params?: { page?: number; size?: number }) => {
    const p = { page: params?.page ?? 0, size: params?.size ?? 10 };
    return api.get<any>('/admin/exercise-reviews', { params: p }).then((res) => {
      const pageData = res.data?.data || res.data || {};
      const raw = Array.isArray(pageData.content) ? pageData.content : [];
      return {
        content: raw.map((q: any) => ({
          id: q.id,
          title: q.title,
          description: q.description,
          level: q.level || 'B1',
          timeLimit: q.timeLimit || 15,
          questionCount: q.questionCount || 0,
          category: q.categoryName || 'Tổng hợp',
          status: q.status,
          visibility: q.visibility,
          isAiGenerated: Boolean(q.isAiGenerated),
          creatorUsername: q.creatorUsername,
          createdAt: q.createdAt,
        })) as PendingQuizItem[],
        totalElements: Number(pageData.totalElements ?? 0),
        totalPages: Number(pageData.totalPages ?? 0),
      };
    });
  },
  get: (id: number) =>
    api.get<any>(`/admin/exercise-reviews/${id}`).then((res) => {
      const d = res.data?.data || res.data || {};
      const quizObj = d.quiz || d;
      const questionsList = d.questions || [];
      return {
        quiz: {
          id: quizObj.id,
          title: quizObj.title,
          description: quizObj.description,
          level: quizObj.level || 'B1',
          timeLimit: quizObj.timeLimit || 15,
          questionCount: questionsList.length || quizObj.questionCount || 0,
          category: quizObj.categoryName || 'Tổng hợp',
          status: quizObj.status,
          visibility: quizObj.visibility,
          isAiGenerated: Boolean(quizObj.isAiGenerated),
          creatorUsername: quizObj.creatorUsername,
          createdAt: quizObj.createdAt,
        },
        questions: questionsList.map((q: any) => ({
          id: q.id,
          content: q.content,
          options: Array.isArray(q.options) ? q.options : [],
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
        })),
      };
    }),
  review: (id: number, data: { decision: 'APPROVED' | 'REJECTED'; note?: string }) =>
    api.post<any>(`/admin/exercise-reviews/${id}/review`, data).then((res) => res.data?.data || res.data),
};
