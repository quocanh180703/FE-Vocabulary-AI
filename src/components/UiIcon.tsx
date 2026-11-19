import React from 'react';
import {
  AlertTriangle,
  Award,
  BarChart3,
  BookMarked,
  BookOpen,
  Bot,
  Brain,
  Briefcase,
  CalendarDays,
  Check,
  CheckCircle2,
  ClipboardList,
  Clock,
  CloudSun,
  Coffee,
  Coins,
  Crown,
  Dices,
  Dumbbell,
  FileText,
  Flag,
  FolderOpen,
  Globe,
  GraduationCap,
  Hand,
  Headphones,
  Heart,
  Landmark,
  Laptop,
  Lightbulb,
  Link2,
  Lock,
  MessageCircle,
  Mic,
  Package,
  Palette,
  PenLine,
  Pencil,
  Pin,
  Plane,
  RefreshCw,
  Rocket,
  Search,
  Shield,
  Smartphone,
  Sparkles,
  Sprout,
  Star,
  Stethoscope,
  Target,
  Theater,
  ThumbsUp,
  Trash2,
  TrendingUp,
  Trophy,
  Type,
  User,
  Users,
  Utensils,
  Volume2,
  Wrench,
  X,
  Zap,
  ArrowRight,
  Circle,
  type LucideIcon,
} from 'lucide-react';

export type UiIconName =
  | 'user'
  | 'users'
  | 'calendar'
  | 'clock'
  | 'weather'
  | 'briefcase'
  | 'laptop'
  | 'plane'
  | 'coffee'
  | 'food'
  | 'book'
  | 'books'
  | 'bot'
  | 'phone'
  | 'target'
  | 'lightbulb'
  | 'sparkles'
  | 'zap'
  | 'warning'
  | 'check'
  | 'check-circle'
  | 'x'
  | 'mic'
  | 'headphones'
  | 'volume'
  | 'search'
  | 'pen'
  | 'pencil'
  | 'refresh'
  | 'lock'
  | 'globe'
  | 'rocket'
  | 'heart'
  | 'brain'
  | 'link'
  | 'clipboard'
  | 'file'
  | 'folder'
  | 'message'
  | 'pin'
  | 'trash'
  | 'graduation'
  | 'palette'
  | 'landmark'
  | 'health'
  | 'coins'
  | 'sprout'
  | 'sport'
  | 'theater'
  | 'trophy'
  | 'award'
  | 'star'
  | 'crown'
  | 'dice'
  | 'hand'
  | 'thumbs-up'
  | 'dumbbell'
  | 'flag'
  | 'package'
  | 'trending'
  | 'chart'
  | 'wrench'
  | 'shield'
  | 'type'
  | 'arrow-right'
  | 'dot';

const ICON_MAP: Record<UiIconName, LucideIcon> = {
  user: User,
  users: Users,
  calendar: CalendarDays,
  clock: Clock,
  weather: CloudSun,
  briefcase: Briefcase,
  laptop: Laptop,
  plane: Plane,
  coffee: Coffee,
  food: Utensils,
  book: BookOpen,
  books: BookMarked,
  bot: Bot,
  phone: Smartphone,
  target: Target,
  lightbulb: Lightbulb,
  sparkles: Sparkles,
  zap: Zap,
  warning: AlertTriangle,
  check: Check,
  'check-circle': CheckCircle2,
  x: X,
  mic: Mic,
  headphones: Headphones,
  volume: Volume2,
  search: Search,
  pen: PenLine,
  pencil: Pencil,
  refresh: RefreshCw,
  lock: Lock,
  globe: Globe,
  rocket: Rocket,
  heart: Heart,
  brain: Brain,
  link: Link2,
  clipboard: ClipboardList,
  file: FileText,
  folder: FolderOpen,
  message: MessageCircle,
  pin: Pin,
  trash: Trash2,
  graduation: GraduationCap,
  palette: Palette,
  landmark: Landmark,
  health: Stethoscope,
  coins: Coins,
  sprout: Sprout,
  sport: Dumbbell,
  theater: Theater,
  trophy: Trophy,
  award: Award,
  star: Star,
  crown: Crown,
  dice: Dices,
  hand: Hand,
  'thumbs-up': ThumbsUp,
  dumbbell: Dumbbell,
  flag: Flag,
  package: Package,
  trending: TrendingUp,
  chart: BarChart3,
  wrench: Wrench,
  shield: Shield,
  type: Type,
  'arrow-right': ArrowRight,
  dot: Circle,
};

const EMOJI_TO_NAME: Record<string, UiIconName> = {
  '👤': 'user',
  '👨': 'users',
  '👩': 'user',
  '👧': 'user',
  '👥': 'users',
  '🗓': 'calendar',
  '🗓️': 'calendar',
  '⏰': 'clock',
  '🕒': 'clock',
  '🌤': 'weather',
  '🌤️': 'weather',
  '💼': 'briefcase',
  '💻': 'laptop',
  '✈': 'plane',
  '✈️': 'plane',
  '☕': 'coffee',
  '🍜': 'food',
  '📖': 'book',
  '📚': 'books',
  '🤖': 'bot',
  '📱': 'phone',
  '🎯': 'target',
  '💡': 'lightbulb',
  '✨': 'sparkles',
  '🌟': 'star',
  '🎉': 'award',
  '⚡': 'zap',
  '⚠': 'warning',
  '⚠️': 'warning',
  '✅': 'check-circle',
  '✓': 'check',
  '✕': 'x',
  '✗': 'x',
  '🎙': 'mic',
  '🎙️': 'mic',
  '🗣': 'mic',
  '🗣️': 'mic',
  '🎧': 'headphones',
  '🔊': 'volume',
  '🔍': 'search',
  '✍': 'pen',
  '✍️': 'pen',
  '✏': 'pencil',
  '✏️': 'pencil',
  '📝': 'file',
  '📄': 'file',
  '🔄': 'refresh',
  '🔒': 'lock',
  '🌐': 'globe',
  '🚀': 'rocket',
  '❤': 'heart',
  '❤️': 'heart',
  '♥': 'heart',
  '♡': 'heart',
  '🧠': 'brain',
  '🔗': 'link',
  '📋': 'clipboard',
  '🗂': 'folder',
  '🗂️': 'folder',
  '💬': 'message',
  '📌': 'pin',
  '🗑': 'trash',
  '🗑️': 'trash',
  '🎓': 'graduation',
  '🎨': 'palette',
  '🏛': 'landmark',
  '🏛️': 'landmark',
  '🏥': 'health',
  '💰': 'coins',
  '🌱': 'sprout',
  '⚽': 'sport',
  '🎭': 'theater',
  '🏆': 'trophy',
  '★': 'star',
  '👑': 'crown',
  '🎲': 'dice',
  '👆': 'hand',
  '👉': 'arrow-right',
  '➔': 'arrow-right',
  '👍': 'thumbs-up',
  '💪': 'dumbbell',
  '🏁': 'flag',
  '📦': 'package',
  '📈': 'trending',
  '📊': 'chart',
  '🛠': 'wrench',
  '🛠️': 'wrench',
  '🛡': 'shield',
  '🛡️': 'shield',
  '🔤': 'type',
  '🔴': 'dot',
  '🟢': 'dot',
  '🟠': 'dot',
  '🟣': 'dot',
  '⚪': 'dot',
};

export interface UiIconProps {
  /** Either a semantic UiIconName or a legacy emoji string (mapped automatically). */
  name: UiIconName | string;
  size?: number;
  strokeWidth?: number;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Crisp stroke icon powered by lucide-react, harmonized with Sage Thư Viện.
 * Replaces all colored OS emojis across the application.
 */
export function UiIcon({
  name,
  size = 16,
  strokeWidth = 1.75,
  color = 'currentColor',
  className = '',
  style,
}: UiIconProps) {
  const cleaned = typeof name === 'string' ? name.replace(/\uFE0F/g, '').trim() : 'sparkles';
  const resolvedName: UiIconName =
    (cleaned as UiIconName) in ICON_MAP
      ? (cleaned as UiIconName)
      : EMOJI_TO_NAME[name] || EMOJI_TO_NAME[cleaned] || 'sparkles';
  const Comp = ICON_MAP[resolvedName];

  return (
    <Comp
      size={size}
      strokeWidth={strokeWidth}
      color={color}
      className={className}
      aria-hidden="true"
      style={{
        display: 'inline-block',
        verticalAlign: '-0.16em',
        flexShrink: 0,
        ...style,
      }}
    />
  );
}
