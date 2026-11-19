import type { UiIconName } from '../components/UiIcon';

export interface TopicItem {
  code: string;
  label: string;
  icon: UiIconName;
}

export const TOPICS: readonly TopicItem[] = [
  { code: 'WORK', label: 'Công việc & Văn phòng', icon: 'briefcase' },
  { code: 'TRAVEL', label: 'Du lịch & Di chuyển', icon: 'plane' },
  { code: 'ACADEMIC', label: 'Học thuật & Giáo dục', icon: 'graduation' },
  { code: 'TECHNOLOGY', label: 'Công nghệ', icon: 'laptop' },
  { code: 'HEALTH', label: 'Sức khỏe', icon: 'health' },
  { code: 'FOOD', label: 'Ăn uống', icon: 'food' },
  { code: 'MONEY', label: 'Mua sắm & Tiền bạc', icon: 'coins' },
  { code: 'FAMILY', label: 'Gia đình & Bạn bè', icon: 'users' },
  { code: 'SPORTS', label: 'Thể thao & Giải trí', icon: 'sport' },
  { code: 'ENVIRONMENT', label: 'Môi trường', icon: 'sprout' },
  { code: 'SOCIETY', label: 'Xã hội & Pháp luật', icon: 'landmark' },
  { code: 'ARTS', label: 'Nghệ thuật & Văn hóa', icon: 'palette' },
] as const;

export const TOPIC_LABELS: Record<string, string> = Object.fromEntries(
  TOPICS.map((t) => [t.code, t.label])
);

export const TOPIC_ICONS: Record<string, UiIconName> = Object.fromEntries(
  TOPICS.map((t) => [t.code, t.icon])
) as Record<string, UiIconName>;

// Backward compatibility alias for existing components importing TOPIC_MAP
export const TOPIC_MAP = TOPIC_LABELS;

// Options list including "All topics" for filter dropdowns
export const TOPIC_FILTER_OPTIONS = [
  { code: 'ALL', label: 'Tất cả chủ đề', icon: 'books' as UiIconName },
  ...TOPICS,
];
