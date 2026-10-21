/**
 * Word & Adverb Relations & Disambiguation Utility
 * Helps learners clearly distinguish between base words, adjectives, and adverbs.
 */

const VI_DIACRITICS = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđĐ]/i;

export const cleanDefinitionText = (def?: string): string => {
  if (!def) return '';
  return def
    .replace(/\.mw-parser-output[^{]*\{[^}]*\}/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/\{\{[^}]*\}\}/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

export const isMeaningfulVietnamese = (text?: string): boolean => {
  if (!text) return false;
  const clean = text.trim();
  // Reject pure POS labels or placeholders
  if (/^(danh từ|động từ|tính từ|trạng từ|giới từ|liên từ|đại từ|từ hạn định|thán từ)(\s*\(.*\))?$/i.test(clean)) {
    return false;
  }
  if (/^từ vựng( tiếng anh)?$/i.test(clean)) {
    return false;
  }
  return VI_DIACRITICS.test(clean);
};

export const isVietnamese = (text?: string): boolean => {
  return isMeaningfulVietnamese(text);
};

export const formatPartOfSpeech = (pos?: string): string => {
  if (!pos) return '';
  const p = pos.toUpperCase();
  switch (p) {
    case 'NOUN': return 'Danh từ';
    case 'VERB': return 'Động từ';
    case 'ADJECTIVE': case 'ADJ': return 'Tính từ';
    case 'ADVERB': case 'ADV': return 'Trạng từ';
    case 'PREPOSITION': case 'PREP': return 'Giới từ';
    case 'CONJUNCTION': case 'CONJ': return 'Liên từ';
    case 'PRONOUN': case 'PRON': return 'Đại từ';
    case 'DETERMINER': case 'DET': return 'Từ hạn định';
    case 'INTERJECTION': case 'INTJ': return 'Thán từ';
    case 'EXCLAMATION': return 'Thán từ';
    default: return pos.toLowerCase();
  }
};

export interface PosBadgeStyle {
  bg: string;
  color: string;
  border: string;
  label: string;
  shortLabel: string;
  icon: string;
}

export const getPartOfSpeechBadgeStyle = (pos?: string): PosBadgeStyle => {
  const p = (pos || '').toUpperCase();
  if (p === 'ADVERB' || p === 'ADV') {
    return {
      bg: '#f3e8ff',
      color: '#7e22ce',
      border: '#d8b4fe',
      label: 'Trạng từ (Adverb)',
      shortLabel: 'Trạng từ',
      icon: '🟣',
    };
  }
  if (p === 'ADJECTIVE' || p === 'ADJ') {
    return {
      bg: '#e0f2fe',
      color: '#0369a1',
      border: '#7dd3fc',
      label: 'Tính từ (Adjective)',
      shortLabel: 'Tính từ',
      icon: '🔵',
    };
  }
  if (p === 'NOUN') {
    return {
      bg: '#dcfce7',
      color: '#15803d',
      border: '#86efac',
      label: 'Danh từ (Noun)',
      shortLabel: 'Danh từ',
      icon: '🟢',
    };
  }
  if (p === 'VERB') {
    return {
      bg: '#ffedd5',
      color: '#c2410c',
      border: '#fdba74',
      label: 'Động từ (Verb)',
      shortLabel: 'Động từ',
      icon: '🟠',
    };
  }
  return {
    bg: '#f1f5f9',
    color: '#475569',
    border: '#cbd5e1',
    label: formatPartOfSpeech(pos) || 'Từ vựng',
    shortLabel: formatPartOfSpeech(pos) || 'Từ vựng',
    icon: '⚪',
  };
};

// Special disambiguation warnings for tricky words and adverbs
export const TRICKY_ADVERBS_NOTE: Record<string, { root: string; note: string; example?: string }> = {
  hardly: {
    root: 'hard (cứng, chăm chỉ)',
    note: '⚠️ CẢNH BÁO TRÁNH NHẦM: "hardly" có nghĩa là "hầu như không, hiếm khi" (mang nghĩa phủ định). KHÔNG mang nghĩa "chăm chỉ" hay "cứng" của từ "hard"!',
    example: 'I can hardly believe it (Tôi hầu như không thể tin nổi) — Trạng từ của "chăm chỉ" vẫn là "hard" (work hard).',
  },
  lately: {
    root: 'late (muộn, trễ)',
    note: '⚠️ CẢNH BÁO TRÁNH NHẦM: "lately" có nghĩa là "gần đây, dạo này". KHÔNG mang nghĩa "muộn/trễ" của từ "late"!',
    example: 'Have you seen her lately? (Dạo này bạn có gặp cô ấy không?) — Đến muộn dùng "arrive late".',
  },
  shortly: {
    root: 'short (ngắn, thấp)',
    note: '⚠️ CẢNH BÁO TRÁNH NHẦM: "shortly" có nghĩa là "sắp, chẳng bao lâu nữa, ngay sau đó". KHÔNG mang nghĩa "ngắn" của tính từ "short"!',
    example: 'The train will arrive shortly (Tàu sẽ đến trong chốc lát).',
  },
  nearly: {
    root: 'near (ở gần, cận kề)',
    note: '⚠️ CẢNH BÁO TRÁNH NHẦM: "nearly" chỉ mức độ "gần như, suýt chút nữa". Khác với "near" là vị trí ở gần!',
    example: 'It\'s nearly finished (Nó gần như hoàn thành rồi).',
  },
  closely: {
    root: 'close (gần gũi, đóng)',
    note: '⚠️ CẢNH BÁO TRÁNH NHẦM: "closely" có nghĩa là "chặt chẽ, kỹ lưỡng, tỉ mỉ". Khác với "close" là khoảng cách gần!',
    example: 'Watch closely (Quan sát kỹ), work closely (hợp tác chặt chẽ).',
  },
  fairly: {
    root: 'fair (công bằng; hội chợ)',
    note: '⚠️ CẢNH BÁO TRÁNH NHẦM: Khi bổ nghĩa tính từ, "fairly" thường mang nghĩa "khá là, tương đối" (VD: fairly good = khá tốt).',
    example: 'The test was fairly easy (Bài kiểm tra tương đối dễ).',
  },
  highly: {
    root: 'high (cao)',
    note: '⚠️ CẢNH BÁO TRÁNH NHẦM: "highly" dùng để chỉ mức độ/đánh giá cao ("rất, được đánh giá cao"). Không dùng chỉ độ cao vật lý (độ cao vật lý dùng "high").',
    example: 'Highly recommended (Rất được khuyến khích/đánh giá cao).',
  },
  deeply: {
    root: 'deep (sâu)',
    note: '⚠️ CẢNH BÁO TRÁNH NHẦM: "deeply" chỉ mức độ cảm xúc, suy nghĩ sâu sắc (VD: deeply moved = vô cùng xúc động). Độ sâu vật lý dùng "deep".',
    example: 'I deeply regret my mistake (Tôi hết sức hối hận về sai lầm của mình).',
  },
  widely: {
    root: 'wide (rộng)',
    note: '⚠️ CẢNH BÁO TRÁNH NHẦM: "widely" chỉ phạm vi phổ biến, ở nhiều nơi (VD: widely known). Khác với "wide" là mở rộng diện tích vật lý.',
    example: 'This technology is widely used (Công nghệ này được sử dụng rộng rãi).',
  },
  badly: {
    root: 'bad (xấu, tồi)',
    note: '⚠️ LƯU Ý: Trong cụm "need badly" hay "want badly", "badly" mang nghĩa là "rất nhiều, tha thiết", không phải điều xấu!',
    example: 'The building is badly damaged (bị hư hỏng nặng); I need help badly (tôi rất cần giúp đỡ).',
  },
  freely: {
    root: 'free (tự do; miễn phí)',
    note: '⚠️ CẢNH BÁO TRÁNH NHẦM: "freely" có nghĩa là "thoải mái, tự do, không hạn chế". KHÔNG mang nghĩa "miễn phí" (miễn phí dùng "for free" / "free of charge")!',
    example: 'You can speak freely here (Bạn có thể nói chuyện thoải mái ở đây).',
  },
  barely: {
    root: 'bare (trần trụi, trọc)',
    note: '⚠️ LƯU Ý: "barely" có nghĩa là "vừa đủ, hầu như không, suýt chút nữa".',
    example: 'We barely caught the bus (Chúng tôi suýt nữa thì lỡ xe buýt).',
  },
  actually: {
    root: 'actual (thực tế)',
    note: '⚠️ CẢNH BÁO TRÁNH NHẦM: "actually" có nghĩa là "thực ra, trên thực tế". Khác với "currently" (hiện tại).',
    example: 'Actually, I don\'t know him (Thực ra tôi không biết anh ta).',
  },
};

/**
 * Infer root adjective from an adverb ending in -ly
 */
export const inferRootAdjective = (adverb: string): string | null => {
  const w = adverb.trim().toLowerCase();
  if (!w.endsWith('ly') || w.length <= 3) return null;

  if (w.endsWith('ically')) {
    return w.slice(0, -4); // automatically -> automatic
  }
  if (w.endsWith('ily')) {
    return w.slice(0, -3) + 'y'; // happily -> happy, easily -> easy
  }
  if (w.endsWith('ably') || w.endsWith('ibly')) {
    return w.slice(0, -1) + 'e'; // comfortably -> comfortable, terribly -> terrible
  }
  return w.slice(0, -2); // quickly -> quick, carefully -> careful
};

/**
 * Infer corresponding adverb from an adjective
 */
export const inferCorrespondingAdverb = (adjective: string): string => {
  const w = adjective.trim().toLowerCase();
  // Irregulars
  if (w === 'good') return 'well';
  if (w === 'hard') return 'hard (chăm chỉ) / hardly (hầu như không)';
  if (w === 'fast') return 'fast';
  if (w === 'late') return 'late (muộn) / lately (gần đây)';
  if (w === 'early') return 'early';

  if (w.endsWith('ic')) {
    return w + 'ally';
  }
  if (w.endsWith('y') && !w.endsWith('ey')) {
    return w.slice(0, -1) + 'ily';
  }
  if (w.endsWith('le')) {
    return w.slice(0, -1) + 'y';
  }
  return w + 'ly';
};

export interface WordRelationAnalysis {
  isAdverb: boolean;
  isAdjective: boolean;
  posBadge: PosBadgeStyle;
  rootWord?: string;
  correspondingAdverb?: string;
  warningNote?: string;
  exampleNote?: string;
}

/**
 * Analyzes word relations to show disambiguation cards on Flashcards
 */
export const analyzeWordRelations = (word: string, pos?: string): WordRelationAnalysis => {
  const cleanWord = (word || '').trim().toLowerCase();
  const cleanPos = (pos || '').toUpperCase();
  const isAdv = cleanPos === 'ADVERB' || cleanPos === 'ADV' || cleanWord.endsWith('ly');
  const isAdj = cleanPos === 'ADJECTIVE' || cleanPos === 'ADJ';

  const badge = getPartOfSpeechBadgeStyle(pos);

  // Check tricky adverbs
  const tricky = TRICKY_ADVERBS_NOTE[cleanWord];
  if (tricky) {
    return {
      isAdverb: true,
      isAdjective: false,
      posBadge: getPartOfSpeechBadgeStyle('ADVERB'),
      rootWord: tricky.root,
      warningNote: tricky.note,
      exampleNote: tricky.example,
    };
  }

  if (isAdv) {
    const root = inferRootAdjective(cleanWord);
    return {
      isAdverb: true,
      isAdjective: false,
      posBadge: badge,
      rootWord: root || undefined,
    };
  }

  if (isAdj) {
    const adv = inferCorrespondingAdverb(cleanWord);
    return {
      isAdverb: false,
      isAdjective: true,
      posBadge: badge,
      correspondingAdverb: adv,
    };
  }

  return {
    isAdverb: false,
    isAdjective: false,
    posBadge: badge,
  };
};
