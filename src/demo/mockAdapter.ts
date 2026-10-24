import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import {
  WORDS, FAV_IDS, REVIEW, QUIZZES, attemptQuiz,
} from './mockData';
import type {
  Attempt, AuthResp, ChatMsg, Conversation, Explain, GrammarResp, Hint,
  Page, ProgressItem, Quiz, QuizDetail, QuizResult, RegisterSuccess,
  SessionDetail, SpeakAttempt, SpeakSession, User, Word,
} from '../api';
import { generateFallbackExplanation } from '../utils/aiFallback';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
const rnd = (a: number, b: number) => Math.round(a + Math.random() * (b - a));
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

let attemptSeq = 9000;
let msgSeq = 50000;
let convSeq = 800;
const convList: Conversation[] = [
  { id: 701, type: 'GENERAL', title: 'Hỏi về thì hiện tại hoàn thành', createdAt: new Date(Date.now() - 86400000).toISOString() },
  { id: 702, type: 'GENERAL', title: 'Phân biệt "affect" và "effect"', createdAt: new Date(Date.now() - 3 * 86400000).toISOString() },
];
const convMsgs = new Map<number, ChatMsg[]>([
  [701, [
    { id: 1, conversationId: 701, role: 'USER', content: 'Khi nào dùng thì hiện tại hoàn thành vậy Vi?' },
    { id: 2, conversationId: 701, role: 'ASSISTANT', content: 'Dùng khi hành động xảy ra trong quá khứ nhưng còn liên quan tới hiện tại nha. Ví dụ: "I have finished my homework" — làm xong rồi, giờ rảnh. Dấu hiệu nhận biết: already, just, yet, ever, never, since, for.' },
  ]],
  [702, [
    { id: 3, conversationId: 702, role: 'USER', content: 'Phân biệt affect và effect giúp mình.' },
    { id: 4, conversationId: 702, role: 'ASSISTANT', content: '"Affect" thường là động từ (gây ảnh hưởng), "effect" thường là danh từ (kết quả). Mẹo nhớ: A = Action, E = End result. Ví dụ: "Rain affects traffic" / "The effect was huge."' },
  ]],
]);

function page<T>(items: T[], p: number, size: number): Page<T> {
  const totalPages = Math.max(1, Math.ceil(items.length / size));
  const content = items.slice(p * size, p * size + size);
  return { content, pageable: { pageNumber: p, pageSize: size, totalElements: items.length, totalPages } };
}


function explainFor(word: Word): Explain {
  const text = generateFallbackExplanation(
    word.word,
    word.level,
    word.partOfSpeech,
    word.meaning || word.vietnameseMeaning
  );
  return {
    wordId: word.id,
    word: word.word,
    meaning: text,
    examples: [],
    synonyms: [],
    usageTips: '',
    tokensUsed: rnd(120, 220),
    source: 'demo-ai',
  };
}

const VI_REPLIES = [
  'Hay đó! Để Vi giải thích nhanh nhé: câu này dùng thì hiện tại đơn vì diễn tả thói quen. Công thức: S + V(s/es).',
  'Vi hiểu rồi! Mẹo nhỏ: khi học từ mới, hãy đặt 1 câu ví dụ của riêng bạn — não sẽ nhớ lâu gấp 3 lần so với chỉ đọc nghĩa.',
  'Quy tắc cơ bản: Tính từ đứng trước danh từ (*a beautiful day*), còn trạng từ bổ nghĩa cho hành động (*speak slowly*).',
  'Đúng hướng rồi đó! Vi gợi ý: mỗi ngày ôn lại 10 từ cũ trước khi học từ mới là cách chống quên hiệu quả nhất.',
];

const EN_REPLIES = [
  'Great question! Keep your sentences concise and natural. Practice using this in a daily sentence to remember it longer!',
  'Here is a quick breakdown: adjectives describe nouns (e.g., *a quick learner*), while adverbs describe actions (e.g., *learn quickly*).',
  'Spot on! A quick learning tip: write 1 personal sentence with new vocabulary — you will retain it 3x longer.',
  "You're doing great! Keep practicing speaking and writing a little bit every day for steady progress.",
];

function grammarFor(text: string): GrammarResp {
  const errors: GrammarResp['errors'] = [];
  let corrected = text.trim();
  const fixes: Array<[RegExp, string, string, string]> = [
    [/\beated\b/gi, 'ate', 'Thì quá khứ', '"eat" là động từ bất quy tắc: eat → ate → eaten.'],
    [/\bgoed\b/gi, 'went', 'Thì quá khứ', '"go" là động từ bất quy tắc: go → went → gone.'],
    [/\bwrited\b/gi, 'wrote', 'Thì quá khứ', '"write" là động từ bất quy tắc: write → wrote → written.'],
    [/\bspeaked\b/gi, 'spoke', 'Thì quá khứ', '"speak" là động từ bất quy tắc: speak → spoke → spoken.'],
    [/\bbuyed\b/gi, 'bought', 'Thì quá khứ', '"buy" là động từ bất quy tắc: buy → bought → bought.'],
    [/\bteached\b/gi, 'taught', 'Thì quá khứ', '"teach" là động từ bất quy tắc: teach → taught → taught.'],
    [/\bthinked\b/gi, 'thought', 'Thì quá khứ', '"think" là động từ bất quy tắc: think → thought → thought.'],
  ];
  for (const [re, to, type, msg] of fixes) {
    if (re.test(corrected)) {
      corrected = corrected.replace(re, (m) => (m[0] === m[0].toUpperCase() ? to[0].toUpperCase() + to.slice(1) : to));
      errors.push({ errorType: type, message: msg, suggestion: `Dùng "${to}" thay cho dạng sai.` });
    }
  }
  if (/^i\b/.test(corrected)) {
    corrected = 'I' + corrected.slice(1);
    errors.push({ errorType: 'Viết hoa', message: 'Đại từ "I" luôn viết hoa trong tiếng Anh.', suggestion: 'Viết hoa chữ I ở đầu câu.' });
  }
  corrected = corrected.charAt(0).toUpperCase() + corrected.slice(1);
  if (!/[.!?]$/.test(corrected)) {
    corrected += '.';
    errors.push({ errorType: 'Dấu câu', message: 'Câu thiếu dấu kết thúc.', suggestion: 'Thêm dấu chấm ở cuối câu.' });
  }
  const score = Math.max(40, 100 - errors.length * 12);
  return { originalText: text, correctedText: corrected, score, errors, tokensUsed: rnd(80, 160) };
}

function hintFor(progressId: number, attemptCount: number): Hint {
  const item = REVIEW.find((r) => r.id === progressId);
  const w = item ? item.word.word : 'từ này';
  const hints = [
    `Từ bắt đầu bằng chữ "${w[0].toUpperCase()}" và có ${w.length} chữ cái.`,
    `Nghĩ tới câu ví dụ bạn đã gặp "${w}" — ngữ cảnh giúp nhớ nhanh hơn.`,
    `Từ này thuộc trình độ ${item ? item.word.level : 'B1'}. Đọc to phát âm 3 lần rồi đoán nghĩa.`,
  ];
  return {
    progressId, word: w, attemptCount,
    hint: hints[Math.min(attemptCount - 1, hints.length - 1)] || hints[0],
    difficulty: attemptCount > 2 ? 'easy' : 'medium', tokensUsed: rnd(40, 90),
  };
}

function speakResult(sessionId: number): SessionDetail {
  const mk = (n: number) => ({
    id: n, attemptNumber: n, overallScore: rnd(68, 88),
  });
  return {
    id: sessionId, topic: 'Giới thiệu bản thân', level: 'B1',
    startedAt: new Date(Date.now() - 300000).toISOString(), status: 'COMPLETED',
    attemptCount: 1, attempts: [mk(1)],
    statistics: { averageScore: 76, bestScore: 82, improvement: '+6 so với lần trước. Phát âm đã rõ hơn, chú ý trọng âm từ 2 âm tiết nhé!' },
  };
}

/* ---------------- adapter ---------------- */

export const mockAdapter: AxiosAdapter = async (config: InternalAxiosRequestConfig) => {
  await delay(rnd(250, 650));
  const method = (config.method || 'get').toLowerCase();
  const url = config.url || '';
  const params = config.params || {};
  let body: Record<string, unknown> = {};
  try { body = typeof config.data === 'string' ? JSON.parse(config.data) : (config.data || {}); }
  catch { body = {}; }

  const ok = <T,>(data: T, message = 'OK'): AxiosResponse => ({
    data: { success: true, message, data, timestamp: new Date().toISOString() } as unknown as T,
    status: 200, statusText: 'OK', headers: {}, config,
  });

  const fail = (status: number, message: string): Promise<never> => {
    const err = Object.assign(new Error(message), {
      isAxiosError: true,
      config,
      response: { data: { success: false, message, data: null }, status, statusText: 'Error', headers: {}, config },
    });
    return Promise.reject(err);
  };

  // ---- auth ----
  if (method === 'post' && url === '/api/auth/register/validate') return ok({ message: 'Thông tin hợp lệ. Mã OTP đã gửi tới email của bạn (demo: nhập 6 số bất kỳ).' });
  if (method === 'post' && url === '/api/auth/register/verify-otp') {
    const s = body as { email?: string; username?: string; fullName?: string };
    const rs: RegisterSuccess = {
      message: 'Đăng ký thành công! Hãy đăng nhập để bắt đầu học.',
      email: String(s.email || ''), username: String(s.username || ''),
      fullName: String(s.fullName || ''), status: 'ACTIVE',
      instruction: 'Vui lòng đăng nhập bằng tài khoản vừa tạo.',
    };
    return ok(rs);
  }
  if (method === 'post' && url === '/api/auth/login') {
    const id = String((body as { emailOrUsername?: string }).emailOrUsername || 'demo@vocab.ai');
    const user: User = { id: 1, email: id.includes('@') ? id : `${id}@vocab.ai`, username: id.split('@')[0], fullName: 'Học viên Demo', role: 'STUDENT', status: 'ACTIVE' };
    const resp: AuthResp = { accessToken: 'demo-access-token', refreshToken: 'demo-refresh-token', expiresIn: 3600, user, message: 'Đăng nhập thành công' };
    return ok(resp);
  }
  if (method === 'post' && url === '/api/auth/logout') return ok({});
  if (method === 'post' && url === '/api/auth/refresh') return ok({ accessToken: 'demo-access-token-2', refreshToken: 'demo-refresh-token-2' });

  // ---- words ----
  if (method === 'get' && url === '/api/words/favorites')
    return ok(page(WORDS.filter((w) => FAV_IDS.has(Number(w.id))), Number(params.page || 0), Number(params.size || 20)));
  if (method === 'get' && url === '/api/words') {
    let list = WORDS.slice();
    if (params.level) list = list.filter((w) => w.level === params.level);
    if (params.category) list = list.filter((w) => w.category?.name === params.category);
    if (params.search) {
      const q = String(params.search).toLowerCase();
      list = list.filter((w) => w.word.includes(q) || w.meaning.toLowerCase().includes(q));
    }
    return ok(page(list, Number(params.page || 0), Number(params.size || 20)));
  }
  const favMatch = url.match(/^\/api\/words\/(\d+)\/favorite$/);
  if (favMatch) {
    const id = Number(favMatch[1]);
    if (method === 'post') { FAV_IDS.add(id); return ok({}); }
    if (method === 'delete') { FAV_IDS.delete(id); return ok({}); }
  }

  // ---- learning ----
  const startMatch = url.match(/^\/api\/learning\/words\/(\d+)\/start$/);
  if (method === 'post' && startMatch) return ok({});
  const reviewMatch = url.match(/^\/api\/learning\/words\/(\d+)\/review$/);
  if (method === 'post' && reviewMatch) return ok({ correct: (body as { correct?: boolean }).correct });
  if (method === 'get' && url === '/api/learning/review-queue') {
    const items: ProgressItem[] = REVIEW.slice(0, Number(params.size || 10));
    return ok({ content: items, totalElements: REVIEW.length, totalPages: 1 });
  }

  // ---- quiz ----
  if (method === 'get' && url === '/api/quizzes') {
    const qs: Quiz[] = QUIZZES.map((q) => q.quiz);
    return ok(page(qs, Number(params.page || 0), Number(params.size || 20)));
  }
  const qDetail = url.match(/^\/api\/quizzes\/(\d+)$/);
  if (method === 'get' && qDetail) {
    const seed = QUIZZES.find((q) => q.quiz.id === Number(qDetail[1]));
    if (!seed) return fail(404, 'Không tìm thấy quiz.');
    const detail: QuizDetail = {
      ...seed.quiz, totalQuestions: seed.questions.length,
      questions: seed.questions.map(({ id, content, options }) => ({ id, content, options })),
    };
    return ok(detail);
  }
  const qStart = url.match(/^\/api\/quizzes\/(\d+)\/start$/);
  if (method === 'post' && qStart) {
    const seed = QUIZZES.find((q) => q.quiz.id === Number(qStart[1]));
    if (!seed) return fail(404, 'Không tìm thấy quiz.');
    const attemptId = attemptSeq++;
    attemptQuiz.set(attemptId, seed.quiz.id);
    const a: Attempt = {
      attemptId, quizId: seed.quiz.id,
      startedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + seed.quiz.timeLimit * 60000).toISOString(),
    };
    return ok(a);
  }
  const qSubmit = url.match(/^\/api\/quizzes\/(\d+)\/submit$/);
  if (method === 'post' && qSubmit) {
    const quizId = attemptQuiz.get(Number(qSubmit[1]));
    const seed = QUIZZES.find((q) => q.quiz.id === quizId);
    if (!seed) return fail(404, 'Attempt không hợp lệ.');
    const answers = (body as { answers?: Array<{ questionId: number; answer: number }> }).answers || [];
    let correct = 0;
    for (const q of seed.questions) {
      const a = answers.find((x) => x.questionId === q.id);
      if (a && a.answer === q.correct) correct++;
    }
    const total = seed.questions.length;
    const score = Math.round((correct / total) * 100);
    const result: QuizResult = {
      attemptId: Number(qSubmit[1]), score, totalQuestions: total, correctAnswers: correct,
      feedback: score >= 80 ? 'Xuất sắc! Bạn nắm chắc kiến thức này rồi.' : score >= 60 ? 'Khá tốt! Ôn lại vài câu sai là ổn.' : 'Cố gắng thêm nhé — Vi gợi ý ôn lại từ vựng tuần này.',
    };
    return ok(result);
  }

  // ---- ai ----
  if (method === 'post' && url === '/api/v1/ai/vocabulary/explain') {
    const wid = Number((body as { wordId?: number }).wordId);
    const w = WORDS.find((x) => x.id === wid) || WORDS[0];
    return ok(explainFor(w));
  }
  if (method === 'post' && url === '/api/v1/ai/grammar') {
    const text = String((body as { text?: string }).text || '');
    if (text.trim().length < 3) return fail(400, 'Viết vài từ đã rồi hãy kiểm tra nhé.');
    return ok(grammarFor(text));
  }
  if (method === 'post' && url === '/api/v1/ai/hints/generate') {
    const b = body as { learningProgressId?: number; attemptCount?: number };
    const h: Hint = hintFor(Number(b.learningProgressId), Number(b.attemptCount || 1));
    return ok(h);
  }
  if (method === 'post' && url === '/api/v1/ai/conversations') {
    const b = body as { type?: string; title?: string };
    const c: Conversation = { id: convSeq++, type: String(b.type || 'GENERAL'), title: String(b.title || 'Trò chuyện mới'), createdAt: new Date().toISOString() };
    convList.unshift(c);
    return ok(c);
  }
  if (method === 'get' && url === '/api/v1/ai/conversations') {
    return ok(page(convList, Number(params.page || 0), Number(params.size || 50)));
  }
  const cTitle = url.match(/^\/api\/v1\/ai\/conversations\/(\d+)\/title$/);
  if (method === 'put' && cTitle) {
    const cid = Number(cTitle[1]);
    const b = body as { title?: string };
    const found = convList.find((c) => c.id === cid);
    if (found && b.title) found.title = b.title.trim();
    return ok({ success: true, message: 'Updated title' });
  }
  const cDel = url.match(/^\/api\/v1\/ai\/conversations\/(\d+)$/);
  if (method === 'delete' && cDel) {
    const cid = Number(cDel[1]);
    const idx = convList.findIndex((c) => c.id === cid);
    if (idx !== -1) convList.splice(idx, 1);
    convMsgs.delete(cid);
    return ok({ success: true, message: 'Deleted' });
  }
  if (method === 'get' && cDel) {
    const cid = Number(cDel[1]);
    const found = convList.find((c) => c.id === cid);
    const msgs = convMsgs.get(cid) || [];
    return ok({ id: cid, title: found?.title || 'Cuộc trò chuyện', messages: msgs });
  }
  const cMsgs = url.match(/^\/api\/v1\/ai\/conversations\/(\d+)\/messages$/);
  if (cMsgs) {
    const cid = Number(cMsgs[1]);
    if (method === 'get') return ok(page(convMsgs.get(cid) || [], Number(params.page || 0), Number(params.size || 50)));
    if (method === 'post') {
      const content = String((body as { content?: string }).content || '');
      const arr = convMsgs.get(cid) || [];
      arr.push({ id: msgSeq++, conversationId: cid, role: 'USER', content });
      let replyContent = pick(VI_REPLIES);
      const matchWord = content.match(/từ vựng.*?"([^"]+)"/i);
      if (matchWord) {
        replyContent = generateFallbackExplanation(matchWord[1]);
      } else {
        const isVi = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđĐ]/i.test(content);
        if (!isVi) {
          replyContent = pick(EN_REPLIES);
        }
      }
      const reply: ChatMsg = { id: msgSeq++, conversationId: cid, role: 'ASSISTANT', content: replyContent, tokensUsed: rnd(60, 140) };
      arr.push(reply);
      convMsgs.set(cid, arr);
      return ok(reply);
    }
  }

  // ---- speaking ----
  if (method === 'post' && url === '/api/ai/speaking/sessions') {
    const b = body as { topic?: string; level?: string };
    const s: SpeakSession = { id: rnd(1000, 9999), topic: String(b.topic || 'Giới thiệu bản thân'), level: String(b.level || 'B1'), startedAt: new Date().toISOString(), status: 'ACTIVE' };
    return ok(s);
  }
  if (method === 'post' && url.startsWith('/api/ai/speaking/attempts')) {
    const sessionId = Number(new URL(url, 'http://x').searchParams.get('sessionId') || 0);
    const a: SpeakAttempt = {
      attemptId: rnd(10000, 99999), sessionId, attemptNumber: 1,
      audioUrl: '', audioDurationSeconds: rnd(20, 45),
      transcript: 'Hello, my name is Demo. I am learning English every day.',
      transcriptConfidence: 0.92,
      scores: { grammarScore: rnd(70, 85), vocabularyScore: rnd(72, 88), fluencyScore: rnd(60, 78), contentScore: rnd(70, 85), overallScore: rnd(68, 84) },
      feedback: {
        generalFeedback: 'Bài nói tốt! Phát âm rõ ràng, ý tưởng mạch lạc.',
        suggestions: ['Chú ý trọng âm của từ 2 âm tiết', 'Nói chậm lại ở các câu dài'],
        strengths: ['Phát âm rõ ràng', 'Từ vựng đa dạng'],
        weaknesses: ['Ngữ điệu còn đều', 'Thỉnh thoảng nuốt âm cuối'],
      },
    };
    return ok(a, 'Đã chấm xong bài nói của bạn.');
  }
  const sDetail = url.match(/^\/api\/ai\/speaking\/sessions\/(\d+)$/);
  if (method === 'get' && sDetail) return ok(speakResult(Number(sDetail[1])));

  // ---- cefr & payment for landing page ----
  if (method === 'get' && (url === '/cefr-words/statistics' || url === '/api/cefr-words/statistics')) {
    return ok({
      a1Count: 520,
      a2Count: 680,
      b1Count: 850,
      b2Count: 740,
      c1Count: 410,
      totalCount: 3200,
    });
  }
  if (method === 'get' && (url === '/payments/packages' || url === '/api/payments/packages')) {
    return ok([
      {
        id: 1,
        code: 'PREMIUM_MONTHLY',
        name: 'Premium Monthly',
        price: 99000,
        durationDays: 30,
        description: 'Gói học tập cao cấp 1 tháng mở khóa đầy đủ tính năng AI',
        status: 'ACTIVE',
      },
      {
        id: 2,
        code: 'PREMIUM_YEARLY',
        name: 'Premium Yearly',
        price: 899000,
        durationDays: 365,
        description: 'Gói học tập cao cấp 1 năm tiết kiệm chi phí, trọn vẹn lộ trình',
        status: 'ACTIVE',
      },
    ]);
  }
  if (method === 'get' && (url === '/subscriptions/status' || url === '/api/subscriptions/status')) {
    try {
      const stored = localStorage.getItem('vocab_demo_subscription');
      if (stored) return ok(JSON.parse(stored));
    } catch {}
    return ok(null);
  }
  if (method === 'get' && (url === '/subscription/usage' || url === '/api/subscription/usage' || url === '/subscriptions/usage' || url === '/api/subscriptions/usage')) {
    let isVip = false;
    try {
      const stored = localStorage.getItem('vocab_demo_subscription');
      if (stored) {
        const sub = JSON.parse(stored);
        if (sub?.status === 'ACTIVE') isVip = true;
      }
    } catch {}
    return ok({
      isVip,
      resetAt: new Date(Date.now() + 86400000).toISOString(),
      features: {
        chat: { limit: isVip ? null : 5, used: 2, remaining: isVip ? null : 3 },
        speaking: { limit: isVip ? null : 5, used: 1, remaining: isVip ? null : 4 },
        grammar: { limit: isVip ? null : 5, used: 0, remaining: isVip ? null : 5 },
        explain: { limit: isVip ? null : 10, used: 3, remaining: isVip ? null : 7 },
        roadmap: { limit: isVip ? null : 2, used: 1, remaining: isVip ? null : 1 },
      },
    });
  }
  if (method === 'post' && (url?.startsWith('/payments/initiate') || url?.startsWith('/api/payments/initiate'))) {
    const isMockYearly = url.includes('packageId=2');
    const mockPlanName = isMockYearly ? 'Gói Theo Năm' : 'Gói Theo Tháng';
    const mockDays = isMockYearly ? 365 : 30;
    // Set demo active subscription in localStorage so UI reflects immediate success if simulating
    const simExpiry = new Date(Date.now() + mockDays * 86400000).toISOString();
    localStorage.setItem(
      'vocab_demo_subscription',
      JSON.stringify({
        subscriptionId: 999,
        packageName: mockPlanName,
        status: 'ACTIVE',
        remainingDays: mockDays,
        endDate: simExpiry,
      })
    );
    return ok({
      checkoutUrl: 'https://checkout.payos.vn/demo-payment-checkout',
      orderCode: 'ORD_DEMO_' + Date.now(),
      amount: isMockYearly ? 899000 : 99000,
    });
  }

  if (method === 'get' && url?.startsWith('/api/admin/ai-analytics/summary')) {
    return ok({
      totalRequests: 148,
      totalTokens: 68420,
      promptTokens: 42100,
      completionTokens: 26320,
      estimatedCostUsd: 0.011053,
      estimatedCostVnd: 281,
      averageLatencyMs: 1240.5,
      successRate: 98.6,
      errorCount: 2,
      activeModel: 'gemini-2.5-flash',
      featureBreakdown: [
        { feature: 'AI_TUTOR_CHAT', displayName: 'Trò chuyện AI Tutor', requestCount: 68, totalTokens: 34200, costUsd: 0.0055, avgLatencyMs: 1380, percentage: 46.0 },
        { feature: 'GRAMMAR_CHECK', displayName: 'Kiểm tra ngữ pháp', requestCount: 38, totalTokens: 14100, costUsd: 0.0022, avgLatencyMs: 980, percentage: 25.7 },
        { feature: 'VOCAB_EXPLAIN', displayName: 'Giải nghĩa từ vựng', requestCount: 26, totalTokens: 12300, costUsd: 0.0019, avgLatencyMs: 1100, percentage: 17.6 },
        { feature: 'SPEAKING_FEEDBACK', displayName: 'Chấm điểm phát âm', requestCount: 16, totalTokens: 7820, costUsd: 0.0014, avgLatencyMs: 1540, percentage: 10.7 }
      ],
      dailyTrend: [
        { date: '2026-10-15', requests: 14, tokens: 6800, costUsd: 0.0011 },
        { date: '2026-10-16', requests: 19, tokens: 8900, costUsd: 0.0014 },
        { date: '2026-10-17', requests: 22, tokens: 10400, costUsd: 0.0017 },
        { date: '2026-10-18', requests: 26, tokens: 12100, costUsd: 0.0019 },
        { date: '2026-10-19', requests: 21, tokens: 9900, costUsd: 0.0016 },
        { date: '2026-10-20', requests: 28, tokens: 13200, costUsd: 0.0021 },
        { date: '2026-10-21', requests: 18, tokens: 7120, costUsd: 0.0012 }
      ],
      anomalies: [
        { id: 101, feature: 'Trò chuyện AI Tutor', totalTokens: 1820, latencyMs: 2450, status: 'SUCCESS', reason: 'Token vượt ngưỡng cao (1820 tokens)', createdAt: '2026-10-20T19:30:00' },
        { id: 98, feature: 'Chấm điểm phát âm', totalTokens: 640, latencyMs: 3400, status: 'SUCCESS', reason: 'Độ trễ xử lý cao (3400ms)', createdAt: '2026-10-20T14:15:00' }
      ],
      optimizationTips: [
        "Model 'gemini-2.5-flash' duy trì SLA phản hồi tốt (1.2s trung bình) và tỷ lệ thành công 98.6%.",
        "Tối ưu Prompt: Cắt giảm context lịch sử trò chuyện AI Tutor xuống tối đa 6 lượt gần nhất để tiết kiệm 20% token.",
        "Bộ nhớ đệm: Đã có thể bật Cache cho các từ vựng học nhiều nhất (Top 500 từ CEFR A1-B1).",
        "Chi phí an toàn: Hệ thống hiện tại tiêu thụ ít hơn 2% hạn mức miễn phí hàng ngày của Google AI Studio."
      ]
    });
  }

  if (method === 'get' && url?.startsWith('/api/admin/ai-analytics/logs')) {
    return ok({
      content: [
        { id: 148, username: 'student1', feature: 'Trò chuyện AI Tutor', model: 'gemini-2.5-flash', promptTokens: 390, completionTokens: 180, totalTokens: 570, estimatedCostUsd: 0.000083, latencyMs: 1190, status: 'SUCCESS', createdAt: '2026-10-21T11:45:00' },
        { id: 147, username: 'student1', feature: 'Giải nghĩa từ vựng', model: 'gemini-2.5-flash', promptTokens: 260, completionTokens: 115, totalTokens: 375, estimatedCostUsd: 0.000054, latencyMs: 990, status: 'SUCCESS', createdAt: '2026-10-21T09:20:00' },
        { id: 146, username: 'quocanh', feature: 'Kiểm tra ngữ pháp', model: 'gemini-2.5-flash', promptTokens: 220, completionTokens: 105, totalTokens: 325, estimatedCostUsd: 0.000048, latencyMs: 1010, status: 'SUCCESS', createdAt: '2026-10-20T21:10:00' },
        { id: 145, username: 'quocanh', feature: 'Chấm điểm phát âm', model: 'gemini-2.5-flash', promptTokens: 480, completionTokens: 210, totalTokens: 690, estimatedCostUsd: 0.000099, latencyMs: 1490, status: 'SUCCESS', createdAt: '2026-10-20T18:40:00' },
        { id: 144, username: 'demo_user', feature: 'Trò chuyện AI Tutor', model: 'gemini-2.5-flash', promptTokens: 510, completionTokens: 240, totalTokens: 750, estimatedCostUsd: 0.000110, latencyMs: 1580, status: 'SUCCESS', createdAt: '2026-10-20T15:12:00' }
      ],
      totalElements: 148,
      totalPages: 10
    });
  }

  // AI Vocabulary Studio Mocks
  if (method === 'get' && url?.startsWith('/api/admin/ai-vocabulary/audit')) {
    return ok({
      totalWords: 4962,
      wordsMissingMeaning: 48,
      wordsMissingExample: 112,
      wordsMissingPronunciation: 35,
      wordsMissingDefinition: 24,
      completenessRate: 98.9,
    });
  }

  if (method === 'get' && url?.startsWith('/api/admin/ai-vocabulary/missing-data')) {
    return ok([
      { id: 101, word: 'resilient', level: 'B2', meaning: 'kiên cường', example: null, pronunciation: '/rɪˈzɪl.jənt/' },
      { id: 102, word: 'articulate', level: 'C1', meaning: 'hoạt ngôn, diễn đạt rõ ràng', example: null, pronunciation: '/ɑːˈtɪk.jə.lət/' },
      { id: 103, word: 'meticulous', level: 'C1', meaning: 'tỉ mỉ, cẩn thận', example: null, pronunciation: '/məˈtɪk.jə.ləs/' },
      { id: 104, word: 'versatile', level: 'B2', meaning: 'đa năng, linh hoạt', example: null, pronunciation: '/ˈvɜː.sə.taɪl/' },
      { id: 105, word: 'pragmatic', level: 'C1', meaning: 'thực dụng, thực tế', example: null, pronunciation: '/præɡˈmæt.ɪk/' },
    ]);
  }

  if (method === 'post' && url?.startsWith('/api/admin/ai-vocabulary/generate')) {
    const rawWord = String(body?.word || 'resilient');
    return ok({
      existingWordId: null,
      word: rawWord,
      pronunciation: '/' + rawWord.toLowerCase() + '/',
      partOfSpeech: 'ADJECTIVE',
      meaning: 'có khả năng phục hồi nhanh chóng, kiên cường',
      definition: 'able to withstand or recover quickly from difficult conditions',
      example: 'Children are often remarkably resilient in facing life challenges.',
      exampleTranslation: 'Trẻ em thường có khả năng kiên cường đáng kinh ngạc khi đối mặt với thử thách cuộc sống.',
      level: String(body?.levelHint || 'B2'),
      synonyms: ['tough', 'adaptable', 'buoyant'],
      antonyms: ['fragile', 'vulnerable'],
      isDuplicate: false,
    });
  }

  if (method === 'post' && url?.startsWith('/api/admin/ai-vocabulary/batch-generate')) {
    const wordsList: string[] = Array.isArray(body?.words) ? (body.words as string[]) : ['resilient', 'meticulous'];
    const mockItems = wordsList.map((w) => ({
      existingWordId: null,
      word: w,
      pronunciation: '/' + w.toLowerCase() + '/',
      partOfSpeech: 'ADJECTIVE',
      meaning: `ý nghĩa chuẩn tiếng Việt của từ ${w}`,
      definition: `accurate English dictionary definition for ${w}`,
      example: `This example clearly illustrates how to use the word ${w} in daily context.`,
      exampleTranslation: `Ví dụ này minh họa rõ ràng cách sử dụng từ ${w} trong ngữ cảnh hàng ngày.`,
      level: String(body?.levelHint || 'B2'),
      synonyms: ['adaptable', 'dynamic'],
      antonyms: ['rigid'],
      isDuplicate: false,
    }));
    return ok(mockItems);
  }

  if (method === 'post' && url?.startsWith('/api/admin/ai-vocabulary/approve')) {
    const count = Array.isArray(body?.words) ? body.words.length : 1;
    return ok({
      success: true,
      savedCount: count,
      message: `Đã phê duyệt và lưu thành công ${count} từ vựng vào cơ sở dữ liệu.`,
    });
  }

  if (method === 'post' && url?.startsWith('/api/admin/copilot/chat')) {
    const rawMsg = String(body?.message || '').toLowerCase();
    let reply = 'Chào Quản trị viên! Tôi có thể hỗ trợ bạn phân tích dữ liệu, chi phí AI, kho từ vựng và vận hành hệ thống VocabAI.';
    let widgetType: 'cost_summary' | 'vocab_audit' | 'revenue_summary' | 'sla_status' | 'none' = 'none';
    let widgetData: Record<string, any> = {};
    let suggestedActions = [
      'Phân tích chi phí AI tuần này',
      'Kiểm tra kho từ vựng',
      'Tình hình người dùng và doanh thu',
      'Độ trễ và hiệu suất SLA hệ thống'
    ];

    if (rawMsg.includes('chi phí') || rawMsg.includes('token') || rawMsg.includes('giá') || rawMsg.includes('tiền')) {
      widgetType = 'cost_summary';
      widgetData = {
        totalRequests: 148,
        totalTokens: 68420,
        costUsd: 0.0112,
        costVnd: 281,
        successRate: 99.3,
        avgLatencyMs: 1240,
      };
      reply = '### 📊 Báo Cáo Chi Phí & Sử Dụng AI (7 Ngày Gần Nhất)\n\n' +
        '- **Tổng lượt gọi API:** **148 requests**\n' +
        '- **Tổng token tiêu thụ:** **68,420 tokens** (Prompt: 41,200 | Output: 27,220)\n' +
        '- **Chi phí ước tính:** **$0.0112 USD (~281 VNĐ)**\n' +
        '- **Tỷ lệ thành công:** **99.3%** với độ trễ trung bình **1.24s**.\n\n' +
        '💡 **Đánh giá:** Chi phí đang nằm hoàn toàn trong hạn mức Free Tier an toàn của Gemini Flash.';
      suggestedActions = [
        'Phân bổ token theo từng chức năng',
        'Kiểm tra chất lượng kho từ vựng',
        'Tình hình người dùng và doanh thu'
      ];
    } else if (rawMsg.includes('từ vựng') || rawMsg.includes('ví dụ') || rawMsg.includes('chất lượng') || rawMsg.includes('kho từ')) {
      widgetType = 'vocab_audit';
      widgetData = {
        totalWords: 4962,
        completenessRate: 98.9,
        wordsMissingExample: 112,
        wordsMissingMeaning: 48,
        wordsMissingPronunciation: 35,
      };
      reply = '### 📚 Kiểm Định Chất Lượng Kho Từ Vựng VocabAI\n\n' +
        '- **Tổng số từ vựng trong kho:** **4,962 từ** (Phân bổ chuẩn CEFR A1 - C1)\n' +
        '- **Tỷ lệ hoàn thiện dữ liệu:** **98.9%** (Rất Tốt)\n' +
        '- **Dữ liệu cần bổ sung:** Hiện có **112 từ** thiếu câu ví dụ ngữ cảnh song ngữ và **48 từ** thiếu nghĩa tiếng Việt.\n\n' +
        '🛠️ **Đề xuất:** Bạn có thể mở **Xưởng Từ Vựng AI** để làm giàu tự động các từ còn thiếu bằng Gemini.';
      suggestedActions = [
        'Mở Xưởng Từ Vựng để sinh ví dụ',
        'Phân tích chi phí AI tuần này',
        'Hiệu suất độ trễ hệ thống SLA'
      ];
    } else if (rawMsg.includes('người dùng') || rawMsg.includes('học viên') || rawMsg.includes('doanh thu') || rawMsg.includes('gói')) {
      widgetType = 'revenue_summary';
      widgetData = {
        totalUsers: 1250,
        activeSubscriptions: 450,
        totalRevenue: 45000000,
        activeLearningSessionsToday: 320,
      };
      reply = '### 👥 Tình Hình Người Dùng & Doanh Thu Hệ Thống\n\n' +
        '- **Tổng số học viên:** **1,250 tài khoản**\n' +
        '- **Gói Premium đang hoạt động:** **450 học viên** (~36% tỷ lệ chuyển đổi)\n' +
        '- **Tổng doanh thu tích lũy:** **45,000,000 VNĐ**\n' +
        '- **Số phiên học hôm nay:** **320 lượt học**\n\n' +
        '📈 **Xu hướng:** Lưu lượng học tập tăng trưởng ổn định, tập trung vào khung giờ 19:00 - 22:00.';
      suggestedActions = [
        'Phân tích chi phí AI tuần này',
        'Kiểm tra chất lượng kho từ vựng',
        'Báo cáo hiệu suất độ trễ SLA'
      ];
    } else if (rawMsg.includes('lỗi') || rawMsg.includes('sla') || rawMsg.includes('độ trễ') || rawMsg.includes('hiệu suất')) {
      widgetType = 'sla_status';
      widgetData = {
        avgLatencyMs: 1240,
        successRate: 99.3,
        errorCount: 1,
        activeModel: 'gemini-2.5-flash',
      };
      reply = '### ⚡ Báo Cáo Hiệu Suất SLA & Giám Sát Lỗi AI\n\n' +
        '- **Độ trễ trung bình:** **1.24 giây/request** (Đạt chuẩn SLA < 2.0s)\n' +
        '- **Tỷ lệ thành công:** **99.3%**\n' +
        '- **Số lỗi:** **1 lỗi** (Do timeout tạm thời)\n' +
        '- **Model chính:** `gemini-2.5-flash`\n\n' +
        '🛡️ **Trạng thái:** Hệ thống vận hành trơn tru và phản hồi nhanh chóng.';
      suggestedActions = [
        'Phân tích chi phí AI tuần này',
        'Kiểm tra kho từ vựng',
        'Xem nhật ký yêu cầu gần đây'
      ];
    }

    return ok({
      reply,
      widgetType,
      widgetData,
      suggestedActions,
    });
  }

  return fail(404, `Demo chưa giả lập: ${method.toUpperCase()} ${url}`);
};
