/**
 * Demo-mode mock adapter cho VocabularyAI.
 * Giả lập 100% API của BE thật (đã đối chiếu controller + ApiResponse.java):
 * mọi response được bọc trong ApiResponse {success, message, data, timestamp}
 * để đi qua đúng interceptor bóc vỏ của client.ts như production.
 *
 * Bật bằng: VITE_DEMO=1 npm run build -- --outDir dist-demo
 * Không ảnh hưởng build production (chỉ import khi flag bật).
 */
import type {
  Category, ProgressItem, Quiz, Word,
} from '../api';

/* ---------------- dữ liệu mẫu ---------------- */

export const CATS: Record<string, Category> = {
  v: { id: 1, name: 'Động từ' },
  n: { id: 2, name: 'Danh từ' },
  adj: { id: 3, name: 'Tính từ' },
};

export const WORDS: Word[] = [
  { id: 1, word: 'abandon', pronunciation: '/əˈbændən/', meaning: 'từ bỏ, bỏ rơi', example: "Don't abandon your dreams.", level: 'B2', category: CATS.v },
  { id: 2, word: 'ability', pronunciation: '/əˈbɪləti/', meaning: 'khả năng, năng lực', example: 'She has the ability to learn fast.', level: 'B1', category: CATS.n },
  { id: 3, word: 'achieve', pronunciation: '/əˈtʃiːv/', meaning: 'đạt được, giành được', example: 'He achieved his goal after months of practice.', level: 'B2', category: CATS.v },
  { id: 4, word: 'adapt', pronunciation: '/əˈdæpt/', meaning: 'thích nghi', example: 'We must adapt to the changing world.', level: 'B2', category: CATS.v },
  { id: 5, word: 'ambition', pronunciation: '/æmˈbɪʃn/', meaning: 'tham vọng, hoài bão', example: 'Her ambition is to become a doctor.', level: 'C1', category: CATS.n },
  { id: 6, word: 'ancient', pronunciation: '/ˈeɪnʃənt/', meaning: 'cổ xưa', example: 'Hue has many ancient temples.', level: 'B1', category: CATS.adj },
  { id: 7, word: 'apologize', pronunciation: '/əˈpɒlədʒaɪz/', meaning: 'xin lỗi', example: 'He apologized for being late.', level: 'B1', category: CATS.v },
  { id: 8, word: 'appreciate', pronunciation: '/əˈpriːʃieɪt/', meaning: 'trân trọng, đánh giá cao', example: 'I really appreciate your help.', level: 'B2', category: CATS.v },
  { id: 9, word: 'brave', pronunciation: '/breɪv/', meaning: 'dũng cảm', example: 'The brave firefighter saved the child.', level: 'A2', category: CATS.adj },
  { id: 10, word: 'bright', pronunciation: '/braɪt/', meaning: 'sáng sủa; thông minh', example: 'She is one of the brightest students in class.', level: 'A2', category: CATS.adj },
  { id: 11, word: 'curious', pronunciation: '/ˈkjʊəriəs/', meaning: 'tò mò, ham hiểu biết', example: 'Babies are curious about everything.', level: 'B1', category: CATS.adj },
  { id: 12, word: 'decide', pronunciation: '/dɪˈsaɪd/', meaning: 'quyết định', example: 'We decided to travel to Da Lat this summer.', level: 'A2', category: CATS.v },
  { id: 13, word: 'dedicate', pronunciation: '/ˈdedɪkeɪt/', meaning: 'cống hiến, dành trọn', example: 'She dedicated her life to teaching.', level: 'C1', category: CATS.v },
  { id: 14, word: 'eager', pronunciation: '/ˈiːɡər/', meaning: 'háo hức, khao khát', example: 'The kids are eager to start the game.', level: 'B2', category: CATS.adj },
  { id: 15, word: 'efficient', pronunciation: '/ɪˈfɪʃnt/', meaning: 'hiệu quả, năng suất', example: 'This new method is very efficient.', level: 'B2', category: CATS.adj },
  { id: 16, word: 'embrace', pronunciation: '/ɪmˈbreɪs/', meaning: 'ôm; đón nhận', example: 'Embrace new challenges with confidence.', level: 'C1', category: CATS.v },
  { id: 17, word: 'encourage', pronunciation: '/ɪnˈkʌrɪdʒ/', meaning: 'khuyến khích, động viên', example: 'Teachers encourage students to ask questions.', level: 'B1', category: CATS.v },
  { id: 18, word: 'essential', pronunciation: '/ɪˈsenʃl/', meaning: 'thiết yếu, cốt yếu', example: 'Water is essential for life.', level: 'B2', category: CATS.adj },
  { id: 19, word: 'fluent', pronunciation: '/ˈfluːənt/', meaning: 'trôi chảy', example: 'She speaks fluent English after two years abroad.', level: 'B2', category: CATS.adj },
  { id: 20, word: 'grateful', pronunciation: '/ˈɡreɪtfl/', meaning: 'biết ơn', example: "I'm grateful for your support.", level: 'B1', category: CATS.adj },
  { id: 21, word: 'habit', pronunciation: '/ˈhæbɪt/', meaning: 'thói quen', example: 'Reading every day is a good habit.', level: 'A2', category: CATS.n },
  { id: 22, word: 'humble', pronunciation: '/ˈhʌmbl/', meaning: 'khiêm tốn', example: 'Despite his success, he remains humble.', level: 'B2', category: CATS.adj },
  { id: 23, word: 'imagine', pronunciation: '/ɪˈmædʒɪn/', meaning: 'tưởng tượng', example: 'Imagine a world without war.', level: 'A2', category: CATS.v },
  { id: 24, word: 'improve', pronunciation: '/ɪmˈpruːv/', meaning: 'cải thiện', example: 'Daily practice will improve your speaking.', level: 'A2', category: CATS.v },
  { id: 25, word: 'inspire', pronunciation: '/ɪnˈspaɪər/', meaning: 'truyền cảm hứng', example: 'Her story inspires thousands of students.', level: 'B2', category: CATS.v },
  { id: 26, word: 'journey', pronunciation: '/ˈdʒɜːni/', meaning: 'hành trình, chuyến đi', example: 'The journey to Sapa took six hours.', level: 'B1', category: CATS.n },
  { id: 27, word: 'knowledge', pronunciation: '/ˈnɒlɪdʒ/', meaning: 'kiến thức', example: 'Knowledge is power.', level: 'B1', category: CATS.n },
  { id: 28, word: 'memory', pronunciation: '/ˈmeməri/', meaning: 'ký ức, trí nhớ', example: 'This song brings back sweet memories.', level: 'A2', category: CATS.n },
  { id: 29, word: 'negotiate', pronunciation: '/nɪˈɡəʊʃieɪt/', meaning: 'đàm phán, thương lượng', example: 'They negotiated a better price.', level: 'C1', category: CATS.v },
  { id: 30, word: 'opportunity', pronunciation: '/ˌɒpəˈtjuːnəti/', meaning: 'cơ hội', example: 'This scholarship is a great opportunity.', level: 'B1', category: CATS.n },
  { id: 31, word: 'patient', pronunciation: '/ˈpeɪʃnt/', meaning: 'kiên nhẫn', example: 'Be patient with beginners.', level: 'A2', category: CATS.adj },
  { id: 32, word: 'persevere', pronunciation: '/ˌpɜːsəˈvɪər/', meaning: 'kiên trì, bền bỉ', example: 'Persevere and you will succeed.', level: 'C1', category: CATS.v },
  { id: 33, word: 'proud', pronunciation: '/praʊd/', meaning: 'tự hào', example: 'We are so proud of you.', level: 'A2', category: CATS.adj },
  { id: 34, word: 'reflect', pronunciation: '/rɪˈflekt/', meaning: 'suy ngẫm, phản chiếu', example: 'Take time to reflect on your progress.', level: 'B2', category: CATS.v },
  { id: 35, word: 'resilient', pronunciation: '/rɪˈzɪliənt/', meaning: 'kiên cường, dễ phục hồi', example: 'Children are remarkably resilient.', level: 'C1', category: CATS.adj },
  { id: 36, word: 'curiosity', pronunciation: '/ˌkjʊəriˈɒsəti/', meaning: 'sự tò mò', example: 'Curiosity drives every great discovery.', level: 'B2', category: CATS.n },
];

export const FAV_IDS = new Set([3, 10, 19, 25, 30]);

export const REVIEW: ProgressItem[] = [3, 10, 14, 19, 22, 25, 30, 34].map((wid, i) => {
  const word = WORDS.find((w) => w.id === wid)!;
  const overdueDays = [3, 1, 5, 0, 2, 7, 1, 4][i];
  return {
    id: 100 + i, word, status: 'LEARNING',
    correctCount: 4 + i, wrongCount: i % 3, reviewCount: 2 + (i % 4),
    accuracy: 0.8,
    nextReviewAt: new Date(Date.now() - overdueDays * 86400000).toISOString(),
    lastReviewedAt: new Date(Date.now() - (overdueDays + 2) * 86400000).toISOString(),
  };
});

export interface Q { id: number; content: string; options: string[]; correct: number }
export interface QuizSeed { quiz: Quiz; questions: Q[] }

export const QUIZZES: QuizSeed[] = [
  {
    quiz: { id: 1, title: 'Business English Essentials', level: 'B1', questionCount: 5, timeLimit: 10, category: 'Business', status: 'ACTIVE' },
    questions: [
      { id: 101, content: '"ability" có nghĩa là gì?', options: ['khả năng', 'sự sợ hãi', 'cơ hội', 'thói quen'], correct: 0 },
      { id: 102, content: 'Chọn từ đồng nghĩa với "grateful":', options: ['angry', 'thankful', 'tired', 'lonely'], correct: 1 },
      { id: 103, content: 'Điền từ: "Be ___ with beginners."', options: ['patient', 'ancient', 'brave', 'curious'], correct: 0 },
      { id: 104, content: '"journey" gần nghĩa nhất với:', options: ['bữa tiệc', 'hành trình', 'câu chuyện', 'giấc mơ'], correct: 1 },
      { id: 105, content: 'Chọn câu dùng "encourage" đúng:', options: ['They encourage to swim yesterday.', 'Teachers encourage students to ask questions.', 'She encourage him last week.', 'We are encourage now.'], correct: 1 },
    ],
  },
  {
    quiz: { id: 2, title: 'Travel & Tourism Vocabulary', level: 'A2', questionCount: 5, timeLimit: 10, category: 'Travel', status: 'ACTIVE' },
    questions: [
      { id: 201, content: 'She ___ to Da Lat last summer.', options: ['go', 'goes', 'went', 'going'], correct: 2 },
      { id: 202, content: 'They ___ football yesterday.', options: ['played', 'play', 'playing', 'plays'], correct: 0 },
      { id: 203, content: 'I ___ my keys this morning.', options: ['lose', 'losed', 'lost', 'losing'], correct: 2 },
      { id: 204, content: '___ you watch the match last night?', options: ['Do', 'Did', 'Are', 'Have'], correct: 1 },
      { id: 205, content: 'He ___ very tired after the trip.', options: ['is', 'are', 'was', 'were'], correct: 2 },
    ],
  },
  {
    quiz: { id: 3, title: 'Information Technology & Computing', level: 'B2', questionCount: 5, timeLimit: 12, category: 'Technology', status: 'ACTIVE' },
    questions: [
      { id: 301, content: '"resilient" có nghĩa là gì?', options: ['kiên cường', 'lười biếng', 'ồn ào', 'mờ nhạt'], correct: 0 },
      { id: 302, content: 'Từ trái nghĩa với "ancient":', options: ['old', 'modern', 'brave', 'bright'], correct: 1 },
      { id: 303, content: 'Điền từ: "This method is very ___. It saves us hours."', options: ['efficient', 'lonely', 'ancient', 'humble'], correct: 0 },
      { id: 304, content: '"eager" gần nghĩa nhất với:', options: ['háo hức', 'mệt mỏi', 'tức giận', 'buồn ngủ'], correct: 0 },
      { id: 305, content: 'Chọn từ đúng: "Water is ___ for life."', options: ['essential', 'curious', 'patient', 'proud'], correct: 0 },
    ],
  },
  {
    quiz: { id: 6, title: 'Daily Communication & Basic Words', level: 'A1', questionCount: 5, timeLimit: 8, category: 'Everyday Life', status: 'ACTIVE' },
    questions: [
      { id: 601, content: 'When meeting someone in the morning, say: "Good ___!"', options: ['night', 'morning', 'bye', 'luck'], correct: 1 },
      { id: 602, content: 'My mother\'s brother is my ___.', options: ['aunt', 'cousin', 'uncle', 'nephew'], correct: 2 },
      { id: 603, content: 'I have coffee and bread for ___ at 7:00 AM.', options: ['dinner', 'lunch', 'breakfast', 'supper'], correct: 2 },
      { id: 604, content: 'Can you speak slowly? I am still ___ English.', options: ['teaching', 'learning', 'selling', 'forgetting'], correct: 1 },
      { id: 605, content: 'Today is Monday, tomorrow will be ___.', options: ['Tuesday', 'Wednesday', 'Friday', 'Sunday'], correct: 0 },
    ],
  },
  {
    quiz: { id: 21, title: 'Academic Research & Critical Epistemology', level: 'C1', questionCount: 5, timeLimit: 15, category: 'Education', status: 'ACTIVE' },
    questions: [
      { id: 2101, content: 'The scholar presented an ___ critique challenging orthodox theories.', options: ['incisive', 'indolent', 'inept', 'insipid'], correct: 0 },
      { id: 2102, content: 'Scholarly papers must delineate their methodological ___.', options: ['glories', 'limitations', 'triumphs', 'fantasies'], correct: 1 },
      { id: 2103, content: 'Academic arguments require ___ substantiated evidence.', options: ['empirically', 'randomly', 'superficially', 'emotionally'], correct: 0 },
      { id: 2104, content: 'The thesis synthesized two seemingly ___ paradigms.', options: ['incompatible', 'identical', 'synonymous', 'redundant'], correct: 0 },
      { id: 2105, content: 'Peer review safeguards epistemological ___ and ethics.', options: ['integrity', 'deception', 'falsification', 'plagiarism'], correct: 0 },
    ],
  },
];

export const attemptQuiz = new Map<number, number>(); // attemptId -> quizId
