export type ViPoseId =
  | 'happy-wave'
  | 'thinking'
  | 'celebrate'
  | 'encourage'
  | 'listen'
  | 'explain'
  | 'surprised'
  | 'sleep';

export interface ViPoseAsset {
  id: ViPoseId;
  file: string;
  transparentFile?: string;
  animatedFile?: string;
  alt: string;
  width: number;
  height: number;
  usage: string;
}

export const VI_APP_ICON = {
  file: '/mascot/vi-logo-transparent.webp',
  alt: 'Biểu tượng Vi — Trợ lý AI VocabularyAI',
  width: 128,
  height: 128,
} as const;

export const VI_LOGO_TRANSPARENT = {
  file: '/mascot/vi-logo-transparent.webp',
  alt: 'Biểu tượng Vi trong suốt — VocabularyAI',
  width: 128,
  height: 128,
} as const;

export const VI_MASCOT_POSES: Record<ViPoseId, ViPoseAsset> = {
  'happy-wave': {
    id: 'happy-wave',
    file: '/mascot/vi-happy-wave-transparent.webp',
    transparentFile: '/mascot/vi-happy-wave-transparent.webp',
    alt: 'Vi mascot — vẫy tay chào thân thiện',
    width: 384,
    height: 512,
    usage: 'Landing hero, lời chào Tổng quan, trạng thái chào mừng',
  },
  explain: {
    id: 'explain',
    file: '/mascot/vi-explain-transparent.webp',
    transparentFile: '/mascot/vi-explain-transparent.webp',
    alt: 'Vi mascot — giải thích từ vựng và hội thoại',
    width: 384,
    height: 512,
    usage: 'AI giải thích chi tiết từ vựng và avatar Chat với Vi',
  },
  listen: {
    id: 'listen',
    file: '/mascot/vi-listen-transparent.webp',
    transparentFile: '/mascot/vi-listen-transparent.webp',
    alt: 'Vi mascot — đang lắng nghe phát âm',
    width: 384,
    height: 512,
    usage: 'Khu vực ghi âm và kết quả Luyện nói / Luyện nghe',
  },
  celebrate: {
    id: 'celebrate',
    file: '/mascot/vi-celebrate-transparent.webp',
    transparentFile: '/mascot/vi-celebrate-transparent.webp',
    alt: 'Vi mascot — ăn mừng thành tích học tập',
    width: 384,
    height: 512,
    usage: 'Kết quả Quiz, Kết quả nói và cột mốc streak',
  },
  encourage: {
    id: 'encourage',
    file: '/mascot/vi-encourage-transparent.webp',
    transparentFile: '/mascot/vi-encourage-transparent.webp',
    alt: 'Vi mascot — giơ tay khích lệ bạn tiếp tục',
    width: 384,
    height: 512,
    usage: 'Đầu trang Làm Quiz và khích lệ khi ôn tập SRS',
  },
  thinking: {
    id: 'thinking',
    file: '/mascot/vi-thinking-transparent.webp',
    transparentFile: '/mascot/vi-thinking-transparent.webp',
    alt: 'Vi mascot — đang suy nghĩ và phân tích',
    width: 384,
    height: 512,
    usage: 'Trợ lý Ngữ pháp và trạng thái AI đang phân tích',
  },
  surprised: {
    id: 'surprised',
    file: '/mascot/vi-surprised-transparent.webp',
    transparentFile: '/mascot/vi-surprised-transparent.webp',
    alt: 'Vi mascot — ngạc nhiên khi gặp lỗi hoặc đáp án chưa đúng',
    width: 384,
    height: 512,
    usage: 'Trạng thái lỗi và phản hồi câu trả lời sai',
  },
  sleep: {
    id: 'sleep',
    file: '/mascot/vi-sleep-transparent.webp',
    transparentFile: '/mascot/vi-sleep-transparent.webp',
    alt: 'Vi mascot — nghỉ ngơi sau khi hoàn thành mục tiêu',
    width: 384,
    height: 512,
    usage: 'Trạng thái đã xong hết bài hôm nay và thẻ nghỉ ngơi Hồ sơ',
  },
};
