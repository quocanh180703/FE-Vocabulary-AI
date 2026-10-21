import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../icons';
import { AnimatedSection } from '../../animations/AnimatedSection';
import { cefrApi, type CefrStats } from '../../api';

interface CefrLevelInfo {
  level: string;
  name: string;
  colorClass: string;
  badgeBg: string;
  badgeColor: string;
  targetSkill: string;
  description: string;
  sampleWords: Array<{ word: string; meaning: string; pos: string }>;
}

const CEFR_LEVELS: CefrLevelInfo[] = [
  {
    level: 'A1',
    name: 'Breakthrough',
    colorClass: 'a1',
    badgeBg: '#ECFDF5',
    badgeColor: '#059669',
    targetSkill: 'Căn bản & Nhập môn',
    description: 'Hiểu và sử dụng các cách diễn đạt quen thuộc hàng ngày, chào hỏi, tự giới thiệu bản thân và người khác.',
    sampleWords: [
      { word: 'welcome', meaning: 'chào mừng', pos: 'verb' },
      { word: 'family', meaning: 'gia đình', pos: 'noun' },
      { word: 'daily', meaning: 'hàng ngày', pos: 'adj' },
    ],
  },
  {
    level: 'A2',
    name: 'Waystage',
    colorClass: 'a2',
    badgeBg: '#EFF6FF',
    badgeColor: '#2563EB',
    targetSkill: 'Sơ trung cấp',
    description: 'Giao tiếp trong các tình huống đơn giản hàng ngày đòi hỏi trao đổi thông tin trực tiếp về công việc, mua sắm và gia đình.',
    sampleWords: [
      { word: 'ability', meaning: 'khả năng, năng lực', pos: 'noun' },
      { word: 'travel', meaning: 'du lịch, di chuyển', pos: 'verb' },
      { word: 'healthy', meaning: 'khỏe mạnh', pos: 'adj' },
    ],
  },
  {
    level: 'B1',
    name: 'Threshold',
    colorClass: 'b1',
    badgeBg: '#EEF2FF',
    badgeColor: '#4F46E5',
    targetSkill: 'Trung cấp tự tin',
    description: 'Hiểu các ý chính của các văn bản chuẩn về các chủ đề quen thuộc. Tự tin xử lý hầu hết các tình huống khi đi du lịch hoặc học tập.',
    sampleWords: [
      { word: 'academic', meaning: 'thuộc về học thuật', pos: 'adj' },
      { word: 'challenge', meaning: 'thử thách', pos: 'noun' },
      { word: 'improve', meaning: 'cải thiện, tiến bộ', pos: 'verb' },
    ],
  },
  {
    level: 'B2',
    name: 'Vantage',
    colorClass: 'b2',
    badgeBg: '#F5F3FF',
    badgeColor: '#7C3AED',
    targetSkill: 'Trung cao cấp',
    description: 'Hiểu được ý chính của các văn bản phức tạp về cả chủ đề cụ thể và trừu tượng. Giao tiếp trôi chảy tự nhiên với người bản xứ.',
    sampleWords: [
      { word: 'persevere', meaning: 'kiên trì, bền chí', pos: 'verb' },
      { word: 'resilient', meaning: 'kiên cường, mau phục hồi', pos: 'adj' },
      { word: 'collaborate', meaning: 'hợp tác, cộng tác', pos: 'verb' },
    ],
  },
  {
    level: 'C1',
    name: 'Effective Proficiency',
    colorClass: 'c1',
    badgeBg: '#FDF2F8',
    badgeColor: '#DB2777',
    targetSkill: 'Cao cấp thành thạo',
    description: 'Hiểu nhiều loại văn bản dài và khó. Diễn đạt ý kiến trôi chảy, không cần tìm từ ngữ khó khăn. Sử dụng linh hoạt cho học thuật.',
    sampleWords: [
      { word: 'ambiguous', meaning: 'mơ hồ, nước đôi', pos: 'adj' },
      { word: 'advocate', meaning: 'ủng hộ, tán thành', pos: 'verb' },
      { word: 'eloquent', meaning: 'hùng biện, lưu loát', pos: 'adj' },
    ],
  },
];

export function CefrLearningPath() {
  const [selectedLevel, setSelectedLevel] = useState<string>('B1');
  const [stats, setStats] = useState<CefrStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const nav = useNavigate();

  useEffect(() => {
    cefrApi
      .stats()
      .then((res) => {
        if (res.data) {
          setStats(res.data);
        }
      })
      .catch(() => {
        // Handled silently, stats display will indicate syncing
      })
      .finally(() => {
        setLoadingStats(false);
      });
  }, []);

  const getWordCount = (lvl: string) => {
    if (!stats) return null;
    switch (lvl) {
      case 'A1': return stats.a1Count;
      case 'A2': return stats.a2Count;
      case 'B1': return stats.b1Count;
      case 'B2': return stats.b2Count;
      case 'C1': return stats.c1Count;
      default: return null;
    }
  };

  const activeLevelData = CEFR_LEVELS.find((l) => l.level === selectedLevel) || CEFR_LEVELS[2];

  return (
    <AnimatedSection id="cefr-path" className="lp-section">
      <div className="lp-container">
        <div className="lp-section-header">
          <div className="lp-section-eyebrow">
            <Icon n="target" s={16} />
            <span>Tiêu chuẩn quốc tế</span>
          </div>
          <h2 className="lp-section-title">
            Lộ trình học theo 5 cấp độ chuẩn CEFR Châu Âu
          </h2>
          <p className="lp-section-subtitle">
            Hệ thống từ vựng VocabularyAI được thiết kế tỉ mỉ theo Khung tham chiếu trình độ ngôn ngữ 
            chung Châu Âu (CEFR), giúp bạn nâng cao năng lực theo từng mốc vững chắc.
          </p>
        </div>

        {/* 5 CEFR Cards */}
        <div className="lp-cefr-grid">
          {CEFR_LEVELS.map((lvl) => {
            const isSelected = selectedLevel === lvl.level;
            const count = getWordCount(lvl.level);

            return (
              <div
                key={lvl.level}
                className={`lp-cefr-card ${isSelected ? 'selected' : ''}`}
                onClick={() => setSelectedLevel(lvl.level)}
                style={{
                  borderColor: isSelected ? 'var(--lp-primary)' : undefined,
                  boxShadow: isSelected ? 'var(--lp-shadow-lg)' : undefined,
                  cursor: 'pointer',
                }}
              >
                <div className={`lp-cefr-tag ${lvl.colorClass}`}>
                  {lvl.level}
                </div>
                <h4 style={{ fontSize: 18, fontWeight: 900, color: 'var(--lp-text-primary)', marginBottom: 4 }}>
                  {lvl.name}
                </h4>
                <div style={{ fontSize: 12.5, fontWeight: 800, color: lvl.badgeColor, marginBottom: 12 }}>
                  {lvl.targetSkill}
                </div>
                <p style={{ fontSize: 13, color: 'var(--lp-text-secondary)', lineHeight: 1.5, flexGrow: 1 }}>
                  {lvl.description}
                </p>

                <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--lp-border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, color: 'var(--lp-text-muted)', fontWeight: 700 }}>
                    {loadingStats ? (
                      'Đang cập nhật...'
                    ) : count !== null ? (
                      <b>{count.toLocaleString('vi-VN')} từ vựng</b>
                    ) : (
                      'Kho từ phong phú'
                    )}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 900, color: isSelected ? 'var(--lp-primary)' : 'var(--lp-text-muted)' }}>
                    {isSelected ? 'Đang chọn ✓' : 'Xem chi tiết'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Level Deep-Dive Panel */}
        <div
          style={{
            marginTop: 36,
            background: 'linear-gradient(135deg, #F8FAFC 0%, #EEF2FF 100%)',
            border: '1px solid #E0E7FF',
            borderRadius: 20,
            padding: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 24,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <span
                style={{
                  background: activeLevelData.badgeBg,
                  color: activeLevelData.badgeColor,
                  fontSize: 13,
                  fontWeight: 900,
                  padding: '3px 10px',
                  borderRadius: 99,
                }}
              >
                Cấp độ {activeLevelData.level} • {activeLevelData.name}
              </span>
              <span style={{ fontSize: 13, color: '#64748B', fontWeight: 700 }}>
                {activeLevelData.targetSkill}
              </span>
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#1E293B', marginBottom: 10 }}>
              Một số từ vựng tiêu biểu trong cấp độ này:
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {activeLevelData.sampleWords.map((w) => (
                <div
                  key={w.word}
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    borderRadius: 10,
                    padding: '8px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 14,
                  }}
                >
                  <b style={{ color: '#0F172A' }}>{w.word}</b>
                  <span style={{ fontSize: 12, color: '#64748B' }}>({w.pos})</span>
                  <span style={{ color: '#4F46E5', fontWeight: 700 }}>: {w.meaning}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <button
              type="button"
              className="lp-btn-primary"
              onClick={() => nav('/words')}
              style={{ whiteSpace: 'nowrap' }}
            >
              <Icon n="book" s={18} />
              <span>Học từ vựng cấp độ {activeLevelData.level}</span>
            </button>
          </div>
        </div>
      </div>
    </AnimatedSection>
  );
}
