import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { personalizedApi } from '../api';
import type {
  LearningProfile,
  WeaknessStrengthAnalysis,
  LearningPlan,
  DailyPractice,
  ProgressPrediction,
  DailyActivity,
} from '../api';
import { Mascot, Icon } from '../components/icons';
import { useAuth } from '../auth/AuthContext';

interface SavedRoadmapData {
  analyzedAt: string;
  profile: LearningProfile | null;
  analysis: WeaknessStrengthAnalysis | null;
  plan: LearningPlan | null;
  daily: DailyPractice | null;
  prediction: ProgressPrediction | null;
  completedActs: (string | number)[];
}

const DEFAULT_FALLBACK_ACTIVITIES: DailyActivity[] = [
  {
    id: 1,
    activityTitle: 'Ôn tập 5 từ vựng đến hạn (SRS)',
    activityType: 'VOCABULARY',
    durationMinutes: 8,
    description: 'Luyện tập các từ bạn đang học để củng cố trí nhớ dài hạn.',
    isPriority: true,
  },
  {
    id: 2,
    activityTitle: 'Thử sức với Quiz Business English B1',
    activityType: 'QUIZ',
    durationMinutes: 10,
    description: 'Cải thiện kỹ năng chọn từ ngữ cảnh và ngữ pháp thương mại.',
    isPriority: true,
  },
  {
    id: 3,
    activityTitle: 'Luyện nói chủ đề "Giới thiệu bản thân"',
    activityType: 'SPEAKING',
    durationMinutes: 7,
    description: 'Nói 45 giây để AI phân tích độ trôi chảy và phát âm.',
    isPriority: false,
  },
];

const formatLearningStyle = (style?: string) => {
  if (!style) return 'Học kết hợp (Ngữ cảnh + Flashcard SRS)';
  const s = style.trim().toUpperCase();
  if (s.includes('MIX')) return 'Đa phong cách (Kết hợp Nghe - Nhìn - Thực hành)';
  if (s.includes('VISUAL')) return 'Thị giác (Hình ảnh & Flashcard trực quan)';
  if (s.includes('AUDITORY')) return 'Thính giác (Luyện nghe & Âm thanh phát âm)';
  if (s.includes('KINESTHETIC')) return 'Vận động / Tương tác (Làm bài trắc nghiệm & Phản xạ)';
  return style;
};

const formatMotivationLevel = (level?: string) => {
  if (!level) return 'Trung bình (Cần duy trì đều đặn)';
  const l = level.trim().toUpperCase();
  if (l === 'HIGH' || l.includes('CAO')) return 'Cao (Duy trì streak đều đặn)';
  if (l === 'MEDIUM' || l.includes('TRUNG')) return 'Trung bình (Cần giữ nhịp học ổn định)';
  if (l === 'LOW' || l.includes('THẤP')) return 'Cần cải thiện (Chưa học thường xuyên)';
  return level;
};

const formatExcellenceLevel = (level?: string) => {
  if (!level) return 'XUẤT SẮC';
  const l = level.trim().toUpperCase();
  if (l === 'OUTSTANDING') return 'XUẤT SẮC';
  if (l === 'STRONG') return 'KHÁ TỐT';
  if (l === 'SOLID') return 'VỮNG VÀNG';
  return level;
};

const formatSeverity = (sev?: string) => {
  if (!sev) return 'CẦN LƯU Ý';
  const s = sev.trim().toUpperCase();
  if (s === 'CRITICAL') return 'CẤP THIẾT';
  if (s === 'HIGH') return 'ƯU TIÊN CAO';
  if (s === 'MEDIUM') return 'TRUNG BÌNH';
  if (s === 'LOW') return 'MỨC ĐỘ NHẸ';
  return sev;
};

const formatArea = (area?: string, idx: number = 0) => {
  if (!area) return idx === 0 ? 'Luyện nói' : idx === 1 ? 'Từ vựng' : 'Thói quen học';
  const a = area.trim().toUpperCase();
  if (a.includes('SPEAK') || a.includes('NÓI') || a.includes('ORAL') || a.includes('PRONUNCIATION')) return 'Luyện nói';
  if (a.includes('VOCAB') || a.includes('TỪ VỰNG')) return 'Từ vựng';
  if (a.includes('GRAMMAR') || a.includes('NGỮ PHÁP')) return 'Ngữ pháp';
  if (a.includes('CONSISTEN') || a.includes('HABIT') || a.includes('THÓI QUEN') || a.includes('STREAK')) return 'Thói quen học';
  if (a.includes('READ') || a.includes('ĐỌC')) return 'Đọc hiểu';
  if (a.includes('LISTEN') || a.includes('NGHE')) return 'Luyện nghe';
  return area;
};

const formatImpact = (impact?: string) => {
  if (!impact) return 'Cao';
  const i = impact.trim().toUpperCase();
  if (i === 'HIGH') return 'Cao';
  if (i === 'MEDIUM') return 'Trung bình';
  if (i === 'LOW') return 'Thấp';
  return impact;
};

export default function Roadmap() {
  const { user } = useAuth();
  const nav = useNavigate();

  // Storage key uniquely scoped to user
  const storageKey = `vocab_ai_roadmap_${user?.id || user?.username || 'default'}`;

  const [tab, setTab] = useState<'today' | 'analysis' | 'insights'>('today');
  const [hasSaved, setHasSaved] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analyzingStep, setAnalyzingStep] = useState<number>(0);
  const [analyzedAt, setAnalyzedAt] = useState<string>('');
  const [feedbackMsg, setFeedbackMsg] = useState<string>('');

  const [profile, setProfile] = useState<LearningProfile | null>(null);
  const [analysis, setAnalysis] = useState<WeaknessStrengthAnalysis | null>(null);
  const [plan, setPlan] = useState<LearningPlan | null>(null);
  const [daily, setDaily] = useState<DailyPractice | null>(null);
  const [prediction, setPrediction] = useState<ProgressPrediction | null>(null);
  const [completedActs, setCompletedActs] = useState<Set<string | number>>(new Set());

  // 1. Initial Load: Check localStorage for existing saved analysis
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const data: SavedRoadmapData = JSON.parse(raw);
        if (data.analyzedAt) {
          setProfile(data.profile);
          setAnalysis(data.analysis);
          setPlan(data.plan);
          setDaily(data.daily);
          setPrediction(data.prediction);
          setCompletedActs(new Set(data.completedActs || []));
          setAnalyzedAt(data.analyzedAt);
          setHasSaved(true);
        }
      }
    } catch (e) {
      console.warn('Lỗi đọc dữ liệu lộ trình đã lưu:', e);
    }
  }, [storageKey]);

  // 2. Start AI Analysis handler (only runs when explicitly triggered by the user)
  const startAnalysis = async () => {
    setIsAnalyzing(true);
    setFeedbackMsg('');
    setAnalyzingStep(1);

    try {
      // Step 1: Collect user learning profile
      setAnalyzingStep(1);
      const profRes = await personalizedApi.profile().catch(() => null);
      const newProfile = profRes?.data || null;

      // Small delay for natural UX pacing
      await new Promise((r) => setTimeout(r, 600));

      // Step 2: Analyze strengths and weaknesses
      setAnalyzingStep(2);
      const anaRes = await personalizedApi.analysis(true).catch(() => null);
      const newAnalysis = anaRes?.data || null;

      await new Promise((r) => setTimeout(r, 700));

      // Step 3: Generate 4-week learning plan
      setAnalyzingStep(3);
      const planRes = await personalizedApi.plan().catch(() => null);
      const newPlan = planRes?.data || null;

      await new Promise((r) => setTimeout(r, 400));

      // Step 4: Daily practice (called sequentially on its own)
      setAnalyzingStep(4);
      const dailyRes = await personalizedApi.dailyPractice().catch(() => null);
      const newDaily = dailyRes?.data || null;

      await new Promise((r) => setTimeout(r, 400));

      // Step 5: Progress prediction (called sequentially after daily practice)
      setAnalyzingStep(5);
      const predRes = await personalizedApi.prediction().catch(() => null);
      const newPrediction = predRes?.data || null;

      await new Promise((r) => setTimeout(r, 400));

      // Timestamp of current analysis
      const nowStr = new Date().toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });

      // Update states
      setProfile(newProfile);
      setAnalysis(newAnalysis);
      setPlan(newPlan);
      setDaily(newDaily);
      setPrediction(newPrediction);
      setAnalyzedAt(nowStr);
      setHasSaved(true);

      // Persist analysis result to localStorage
      const saveData: SavedRoadmapData = {
        analyzedAt: nowStr,
        profile: newProfile,
        analysis: newAnalysis,
        plan: newPlan,
        daily: newDaily,
        prediction: newPrediction,
        completedActs: Array.from(completedActs),
      };
      localStorage.setItem(storageKey, JSON.stringify(saveData));
      window.dispatchEvent(new CustomEvent('vocab_roadmap_analyzed', { detail: newProfile }));

      setFeedbackMsg('✨ Lộ trình AI đã được phân tích và lưu lại thành công!');
      setTimeout(() => setFeedbackMsg(''), 5000);
    } catch (e) {
      console.error('Lỗi khi phân tích lộ trình:', e);
      setFeedbackMsg('Đã thiết lập lộ trình dựa trên hồ sơ học tập gần nhất.');
    } finally {
      setIsAnalyzing(false);
      setAnalyzingStep(0);
    }
  };

  // 3. Clear saved analysis to re-test the fresh onboarding flow
  const resetSavedAnalysis = () => {
    if (window.confirm('Bạn có chắc chắn muốn đặt lại lộ trình AI đã lưu không?')) {
      localStorage.removeItem(storageKey);
      window.dispatchEvent(new CustomEvent('vocab_roadmap_analyzed', { detail: null }));
      setHasSaved(false);
      setProfile(null);
      setAnalysis(null);
      setPlan(null);
      setDaily(null);
      setPrediction(null);
      setCompletedActs(new Set());
      setAnalyzedAt('');
    }
  };

  // 4. Activity checkbox toggle (saves to localStorage immediately)
  const toggleActivity = (act: DailyActivity, index: number) => {
    const key = act.id || index;
    setCompletedActs((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else {
        next.add(key);
        if (act.id) personalizedApi.completeDailyActivity(act.id).catch(() => {});
      }

      // Update completedActs in storage
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          parsed.completedActs = Array.from(next);
          localStorage.setItem(storageKey, JSON.stringify(parsed));
        }
      } catch (e) {
        console.warn('Lỗi lưu trạng thái hoàn thành:', e);
      }

      return next;
    });
  };

  const currentLevel = profile?.currentLevel || 'A1';
  const overallScore = Math.round(profile?.overallScore != null ? profile.overallScore : 0);
  const vocabScore = Math.round(profile?.vocabulary?.score != null ? profile.vocabulary.score : 0);
  const grammarScore = Math.round(profile?.grammar?.score != null ? profile.grammar.score : 0);
  const speakingScore = Math.round(profile?.speaking?.score != null ? profile.speaking.score : 0);

  const activities = (daily?.activities && daily.activities.length > 0)
    ? daily.activities
    : DEFAULT_FALLBACK_ACTIVITIES;

  return (
    <div className="content">
      {/* Page Header */}
      <div className="pagehead">
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '4px 12px', background: 'rgba(79, 70, 229, 0.08)', borderRadius: 99, color: 'var(--primary)', fontSize: 13, fontWeight: 800, marginBottom: 8 }}>
          <Icon n="zap" s={14} /> Adaptive AI Study Plan & Mastery Engine
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1>Lộ trình học AI cá nhân hóa</h1>
            <div className="sub">
              Hệ thống theo dõi năng lực theo thời gian thực và tự động tối ưu hóa lộ trình dành riêng cho bạn
            </div>
          </div>

          {hasSaved && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <span
                className="pill level"
                style={{ fontSize: 14, padding: '6px 14px', fontWeight: 800, background: 'var(--primary)', color: '#fff' }}
                title="Trình độ CEFR được AI đánh giá"
              >
                Trình độ AI: {currentLevel}
              </span>
              <span
                className="pill"
                style={{ fontSize: 13, padding: '6px 12px', background: 'var(--bg-tag, #f1f5f9)', color: 'var(--text-sub)' }}
                title="Thời điểm lưu kết quả phân tích gần nhất"
              >
                🕒 Đã phân tích: {analyzedAt}
              </span>
              <button
                className="btn ghost sm"
                onClick={startAnalysis}
                disabled={isAnalyzing}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                title="Chạy lại phân tích AI mới nhất"
              >
                🔄 Cập nhật / Phân tích lại
              </button>
              <button
                className="btn ghost sm"
                onClick={resetSavedAnalysis}
                style={{ color: '#ef4444' }}
                title="Xóa kết quả phân tích đã lưu"
              >
                🗑️ Đặt lại
              </button>
            </div>
          )}
        </div>
      </div>

      {feedbackMsg && (
        <div
          style={{
            padding: '12px 18px',
            marginBottom: 20,
            borderRadius: 10,
            background: '#ecfdf5',
            color: '#065f46',
            border: '1px solid #a7f3d0',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Analyzing Stepper Loading Modal / Card */}
      {isAnalyzing && (
        <div
          className="card"
          style={{
            background: 'linear-gradient(135deg, #0A2540 0%, #1e3a8a 100%)',
            color: '#fff',
            padding: '36px 32px',
            marginBottom: 24,
            borderRadius: 16,
            boxShadow: '0 12px 32px rgba(10, 37, 64, 0.25)',
          }}
        >
          <div style={{ textAlign: 'center', maxWidth: 620, margin: '0 auto' }}>
            <div style={{ display: 'inline-block', marginBottom: 16 }}>
              <Mascot s={80} />
            </div>
            <h2 style={{ color: '#fff', fontSize: 24, fontWeight: 800 }}>
              Vi đang phân tích năng lực & thiết lập lộ trình cho bạn...
            </h2>
            <p style={{ color: '#93c5fd', fontSize: 14, marginTop: 8 }}>
              Hệ thống AI đang quét lịch sử học từ vựng, điểm Quiz, ngữ pháp và phát âm để xây dựng kế hoạch tối ưu.
            </p>

            {/* Stepper Steps */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 28, textAlign: 'left' }}>
              {[
                { step: 1, title: 'Thu thập lịch sử từ vựng, Quiz và kết quả luyện nói gần đây' },
                { step: 2, title: 'AI phân tích phong cách học, điểm mạnh vượt trội & lỗ hổng kiến thức' },
                { step: 3, title: 'Xây dựng kế hoạch Microlearning 4 tuần' },
                { step: 4, title: 'AI thiết lập bài tập tối ưu hóa cho ngày hôm nay' },
                { step: 5, title: 'AI dự báo tiến độ về đích & lưu lại kết quả phân tích' },
              ].map((s) => {
                const isPassed = analyzingStep > s.step;
                const isCurrent = analyzingStep === s.step;
                return (
                  <div
                    key={s.step}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      padding: '12px 16px',
                      borderRadius: 10,
                      background: isCurrent
                        ? 'rgba(255, 255, 255, 0.16)'
                        : isPassed
                        ? 'rgba(34, 197, 94, 0.18)'
                        : 'rgba(255, 255, 255, 0.05)',
                      border: isCurrent
                        ? '1px solid #38bdf8'
                        : isPassed
                        ? '1px solid #4ade80'
                        : '1px solid transparent',
                      transition: 'all 0.3s ease',
                    }}
                  >
                    <div
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: 13,
                        background: isPassed ? '#22c55e' : isCurrent ? '#38bdf8' : 'rgba(255,255,255,0.2)',
                        color: isPassed || isCurrent ? '#0A2540' : '#fff',
                      }}
                    >
                      {isPassed ? '✓' : s.step}
                    </div>
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: isCurrent ? 700 : 500,
                        color: isCurrent ? '#ffffff' : isPassed ? '#bbf7d0' : '#94a3b8',
                      }}
                    >
                      {s.title}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 5. ONBOARDING / EMPTY STATE: User has not started analysis yet */}
      {!hasSaved && !isAnalyzing && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Main Hero Card to start analysis */}
          <div
            className="card"
            style={{
              background: 'linear-gradient(135deg, #0A2540 0%, #173860 50%, #0369a1 100%)',
              color: '#fff',
              padding: '44px 36px',
              borderRadius: 20,
              boxShadow: '0 16px 36px rgba(10, 37, 64, 0.25)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 32 }}>
              <div style={{ maxWidth: 650 }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(56, 189, 248, 0.18)', border: '1px solid rgba(56, 189, 248, 0.4)', padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 700, color: '#38bdf8', marginBottom: 14 }}>
                  <Icon n="spark" s={16} /> AI Personalized Roadmap Engine
                </div>
                <h2 style={{ fontSize: 32, fontWeight: 900, color: '#fff', lineHeight: 1.25, margin: 0 }}>
                  Bắt đầu phân tích lộ trình học AI cá nhân hóa
                </h2>
                <p style={{ fontSize: 16, color: '#e2e8f0', marginTop: 12, lineHeight: 1.6 }}>
                  Hệ thống AI sẽ quét sâu kết quả ôn tập từ vựng, lịch sử trắc nghiệm, các lỗi ngữ pháp và phiên nói tiếng Anh của bạn. Từ đó xây dựng kế hoạch 4 tuần độc quyền cùng bài tập mỗi ngày để bạn bứt phá nhanh nhất!
                </p>

                <div style={{ marginTop: 28, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                  <button
                    className="btn primary"
                    onClick={startAnalysis}
                    style={{
                      fontSize: 16,
                      fontWeight: 800,
                      padding: '14px 28px',
                      borderRadius: 12,
                      background: 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)',
                      color: '#0A2540',
                      border: 'none',
                      cursor: 'pointer',
                      boxShadow: '0 8px 24px rgba(56, 189, 248, 0.45)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 10,
                      transition: 'transform 0.2s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
                  >
                    <Icon n="zap" s={20} /> Bắt đầu phân tích ngay
                  </button>
                  <span style={{ fontSize: 13, color: '#94a3b8' }}>
                    ⚡ Phân tích tức thì · Kết quả được lưu lại tự động
                  </span>
                </div>
              </div>

              <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.06)', padding: 24, borderRadius: 20, border: '1px solid rgba(255,255,255,0.1)' }}>
                <Mascot s={110} />
                <div style={{ marginTop: 12, fontWeight: 700, fontSize: 16, color: '#38bdf8' }}>
                  Trợ lý Vi
                </div>
                <div style={{ fontSize: 13, color: '#cbd5e1', maxWidth: 180, marginTop: 4 }}>
                  Sẵn sàng đồng hành tối ưu hóa từng bài tập của bạn
                </div>
              </div>
            </div>
          </div>

          {/* 3 Core Benefits Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
            <div className="card" style={{ padding: 24, borderTop: '4px solid var(--primary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ background: 'var(--tint-blue)', padding: 10, borderRadius: 10, color: 'var(--primary)' }}>
                  <Icon n="chart" s={24} />
                </div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>1. Đánh giá CEFR chuẩn xác</h3>
              </div>
              <p className="sub mt8" style={{ fontSize: 14, lineHeight: 1.5 }}>
                Đo lường năng lực thực tế qua điểm Vi Index (0-100) trên 3 kỹ năng: Từ vựng cốt lõi, Ngữ pháp văn bản và Khả năng phát âm trôi chảy.
              </p>
            </div>

            <div className="card" style={{ padding: 24, borderTop: '4px solid #f59e0b' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ background: '#fef3c7', padding: 10, borderRadius: 10, color: '#d97706' }}>
                  <Icon n="spark" s={24} />
                </div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>2. Bắt bệnh & Khoanh vùng lỗi</h3>
              </div>
              <p className="sub mt8" style={{ fontSize: 14, lineHeight: 1.5 }}>
                Chỉ ra chính xác các chủ đề từ vựng bạn hay quên, các âm đuôi (-s/-ed) phát âm chưa rõ và lỗi ngữ pháp lặp lại để tập trung sửa trước.
              </p>
            </div>

            <div className="card" style={{ padding: 24, borderTop: '4px solid #10b981' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ background: '#d1fae5', padding: 10, borderRadius: 10, color: '#059669' }}>
                  <Icon n="book" s={24} />
                </div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>3. Kế hoạch Microlearning 4 tuần</h3>
              </div>
              <p className="sub mt8" style={{ fontSize: 14, lineHeight: 1.5 }}>
                Phân bổ thời gian khoa học chỉ 15-20 phút/ngày với 4 cột mốc quan trọng, giúp bạn tiến bộ vượt bậc mà không bao giờ bị nản lòng.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 6. FULL ROADMAP VIEW (Shown when user has an active saved analysis) */}
      {hasSaved && !isAnalyzing && (
        <>
          {/* Hero Performance Overview Banner */}
          <div
            className="card"
            style={{
              background: 'linear-gradient(135deg, #0A2540 0%, #1E1B4B 50%, #312E81 100%)',
              color: '#fff',
              padding: '32px 36px',
              marginBottom: 24,
              borderRadius: 20,
              boxShadow: '0 12px 32px rgba(10, 37, 64, 0.25)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24, position: 'relative', zIndex: 2 }}>
              <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                <Mascot s={76} />
                <div>
                  <div style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: 1.2, color: '#38BDF8', fontWeight: 800 }}>
                    Chỉ số năng lực tổng hợp
                  </div>
                  <div style={{ fontSize: 36, fontWeight: 900, marginTop: 4, letterSpacing: -0.5 }}>
                    {overallScore}/100 <span style={{ fontSize: 18, fontWeight: 600, color: '#94A3B8' }}>Điểm Vi Index</span>
                  </div>
                  <div style={{ fontSize: 14.5, color: '#CBD5E1', marginTop: 4, maxWidth: 520, lineHeight: 1.5 }}>
                    {analysis?.profileSummary || `Bạn đang ở cấp độ ${currentLevel}. Duy trì nhịp học đều để sớm bứt phá lên cấp độ tiếp theo!`}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)', padding: '14px 22px', borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)' }}>
                  <div style={{ fontSize: 12.5, color: '#94A3B8', fontWeight: 700 }}>📖 Từ vựng</div>
                  <div style={{ fontSize: 26, fontWeight: 900, color: '#38BDF8', marginTop: 2 }}>{vocabScore}%</div>
                </div>
                <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)', padding: '14px 22px', borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)' }}>
                  <div style={{ fontSize: 12.5, color: '#94A3B8', fontWeight: 700 }}>✍️ Ngữ pháp</div>
                  <div style={{ fontSize: 26, fontWeight: 900, color: '#4ADE80', marginTop: 2 }}>{grammarScore}%</div>
                </div>
                <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)', padding: '14px 22px', borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)' }}>
                  <div style={{ fontSize: 12.5, color: '#94A3B8', fontWeight: 700 }}>🎙️ Luyện nói</div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: '#F59E0B', marginTop: 2 }}>
                    {(profile?.speaking?.totalActivities && profile.speaking.totalActivities > 0) || speakingScore > 0 ? `${speakingScore}%` : 'Chưa luyện'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="chips" style={{ marginBottom: 24, gap: 10 }}>
            <button className={'chip' + (tab === 'today' ? ' on' : '')} onClick={() => setTab('today')} style={{ padding: '8px 18px', fontSize: 14 }}>
              <Icon n="bulb" s={18} /> Nhiệm vụ hôm nay & Kế hoạch
            </button>
            <button className={'chip' + (tab === 'analysis' ? ' on' : '')} onClick={() => setTab('analysis')} style={{ padding: '8px 18px', fontSize: 14 }}>
              <Icon n="spark" s={18} /> Phân tích Điểm mạnh / Yếu
            </button>
            <button className={'chip' + (tab === 'insights' ? ' on' : '')} onClick={() => setTab('insights')} style={{ padding: '8px 18px', fontSize: 14 }}>
              <Icon n="chart" s={18} /> Gợi ý AI & Dự báo tiến độ
            </button>
          </div>

          {/* TAB 1: Today's Tasks & 4-Week Plan */}
          {tab === 'today' && (
            <div className="cols2" style={{ alignItems: 'start' }}>
              {/* Daily Practice */}
              <div className="card">
                <div className="row" style={{ alignItems: 'center' }}>
                  <h2>
                    <span className="dot" style={{ background: 'var(--primary)' }} />
                    Bài tập hôm nay ({daily?.totalDurationMinutes || 25} phút)
                  </h2>
                  <span className="pill" style={{ background: 'var(--tint-blue)', color: 'var(--primary)' }}>
                    {completedActs.size}/{activities.length} hoàn thành
                  </span>
                </div>

                <div className="sub mt8" style={{ fontStyle: 'italic', color: 'var(--text-sub)' }}>
                  "{daily?.motivationalTip || 'Mỗi ngày tích lũy 15 phút, sau 1 tháng bạn sẽ bất ngờ với vốn từ của mình!'}"
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
                  {activities.map((act, idx) => {
                    const isDone = completedActs.has(act.id || idx);
                    return (
                      <div
                        key={act.id || idx}
                        style={{
                          border: '1px solid var(--border)',
                          borderRadius: 12,
                          padding: 16,
                          background: isDone ? 'var(--bg-tag, #f8fafc)' : 'var(--bg-card, #fff)',
                          opacity: isDone ? 0.75 : 1,
                          transition: 'all 0.2s',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                            <input
                              type="checkbox"
                              checked={isDone}
                              onChange={() => toggleActivity(act, idx)}
                              style={{ width: 18, height: 18, marginTop: 3, cursor: 'pointer', accentColor: 'var(--primary)' }}
                              id={`act-${idx}`}
                            />
                            <div>
                              <label
                                htmlFor={`act-${idx}`}
                                style={{
                                  fontWeight: 700,
                                  fontSize: 15,
                                  cursor: 'pointer',
                                  textDecoration: isDone ? 'line-through' : 'none',
                                  color: isDone ? 'var(--text-sub)' : 'var(--text-main)',
                                }}
                              >
                                {act.activityTitle}
                              </label>
                              <div className="sub mt8" style={{ fontSize: 13 }}>
                                {act.description}
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                            <span className="sub" style={{ fontSize: 12, fontWeight: 600 }}>
                              ⏱️ {act.durationMinutes}p
                            </span>
                            {act.isPriority && (
                              <span className="pill warn" style={{ fontSize: 11, padding: '2px 8px' }}>
                                Ưu tiên
                              </span>
                            )}
                          </div>
                        </div>

                        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                          {act.activityType === 'VOCABULARY' && (
                            <button className="btn ghost sm" onClick={() => nav('/review')}>
                              Vào Ôn tập →
                            </button>
                          )}
                          {act.activityType === 'QUIZ' && (
                            <button className="btn ghost sm" onClick={() => nav('/quiz')}>
                              Làm Quiz →
                            </button>
                          )}
                          {act.activityType === 'SPEAKING' && (
                            <button className="btn ghost sm" onClick={() => nav('/speaking')}>
                              Luyện nói →
                            </button>
                          )}
                          {act.activityType === 'GRAMMAR' && (
                            <button className="btn ghost sm" onClick={() => nav('/grammar')}>
                              Sửa ngữ pháp →
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 4-Week Plan & Milestones */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div className="card">
                  <h2><Icon n="book" s={20} /> Kế hoạch học tập 4 tuần</h2>
                  <div className="sub mt8">
                    {plan?.planDescription || 'Kế hoạch được AI thiết kế tối ưu theo mô hình Microlearning (15-20 phút/ngày) để duy trì sự tập trung tối đa.'}
                  </div>

                  <div className="mt16" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div className="kv">
                      <span>Mục tiêu chính</span>
                      <b>{plan?.primaryGoal || `Chinh phục 150 từ vựng cốt lõi & cải thiện độ trôi chảy cấp độ ${currentLevel}`}</b>
                    </div>
                    <div className="kv">
                      <span>Thời gian cam kết</span>
                      <b>{plan?.totalCommitmentMinutesPerWeek || 90} phút / tuần</b>
                    </div>
                  </div>

                  <h3 style={{ fontSize: 15, fontWeight: 700, margin: '20px 0 10px' }}>Các cột mốc quan trọng (Milestones)</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {(plan?.milestones && plan.milestones.length > 0
                      ? plan.milestones.map((m: any, idx: number) => ({
                          title: m.name || m.title || `Hoàn thiện mục tiêu tuần ${m.week || idx + 1}`,
                          status: m.week === 1 ? 'Đang làm' : m.week === 4 ? 'Mục tiêu' : 'Sắp tới',
                          week: `Tuần ${m.week || idx + 1}`,
                        }))
                      : [
                          { title: `Hoàn thiện 50 từ vựng cấp độ ${currentLevel}`, status: 'Đang làm', week: 'Tuần 1' },
                          { title: 'Đạt điểm Quiz 80% trở lên ở bài Business Essentials', status: 'Sắp tới', week: 'Tuần 2' },
                          { title: 'Luyện 5 phiên nói AI với điểm trôi chảy > 70', status: 'Sắp tới', week: 'Tuần 3' },
                          { title: `Đánh giá tổng kết nâng hạng lên cấp độ tiếp theo`, status: 'Mục tiêu', week: 'Tuần 4' },
                        ]
                    ).map((m, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'var(--bg-tag, #f8fafc)', borderRadius: 8 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span className="pill" style={{ fontSize: 11 }}>{m.week}</span>
                          <span style={{ fontSize: 13, fontWeight: 600 }}>{m.title}</span>
                        </div>
                        <span className="sub" style={{ fontSize: 12 }}>{m.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Weakness & Strength Analysis */}
          {tab === 'analysis' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Learning Style Assessment */}
              <div className="card">
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  <Icon n="spark" s={28} />
                  <div>
                    <h2 style={{ margin: 0 }}>Đặc điểm phong cách học của bạn</h2>
                    <div className="sub mt8">
                      Phong cách chính: <b>{formatLearningStyle(analysis?.learningStyle)}</b> · Mức độ duy trì: <b>{formatMotivationLevel(analysis?.motivationLevel)}</b>
                    </div>
                  </div>
                </div>
              </div>

              <div className="cols2" style={{ alignItems: 'start' }}>
                {/* Outstanding Strengths */}
                <div className="card">
                  <div className="row">
                    <h2 style={{ color: 'var(--green-dark, #15803d)' }}>
                      🟢 Điểm mạnh vượt trội ({analysis?.outstandingStrengths?.length || 2})
                    </h2>
                  </div>
                  <div className="sub mt8">Các chủ đề và kỹ năng bạn đã xử lý rất tốt:</div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
                    {(analysis?.outstandingStrengths && analysis.outstandingStrengths.length > 0
                      ? analysis.outstandingStrengths
                      : [
                          {
                            skill: 'Ghi nhớ từ vựng SRS',
                            proficiencyLevel: 'XUẤT SẮC',
                            description: 'Tỉ lệ nhớ chính xác từ vựng sau 24h đạt trên 85%.',
                          },
                          {
                            skill: 'Đọc hiểu ngữ cảnh đề bài Quiz',
                            proficiencyLevel: 'KHÁ TỐT',
                            description: 'Tốc độ trả lời câu hỏi trắc nghiệm nhanh, ít bị bẫy ngữ nghĩa.',
                          },
                        ]
                    ).map((s: any, idx: number) => {
                      const name = s.area || s.skill || s.category || 'Điểm mạnh';
                      const level = s.excellenceLevel || s.proficiencyLevel || 'XUẤT SẮC';
                      return (
                        <div key={idx} style={{ padding: 14, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <b style={{ color: '#166534', fontSize: 15 }}>{name}</b>
                            <span className="pill green" style={{ fontSize: 11 }}>{formatExcellenceLevel(level)}</span>
                          </div>
                          <div className="sub mt8" style={{ fontSize: 13, color: '#14532d' }}>
                            {s.description || s.leverageStrategy}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Critical Weaknesses */}
                <div className="card">
                  <div className="row">
                    <h2 style={{ color: 'var(--red-dark, #b91c1c)' }}>
                      🔴 Lỗ hổng cần cải thiện ({analysis?.criticalWeaknesses?.length || 2})
                    </h2>
                  </div>
                  <div className="sub mt8">Những điểm thường bị trừ điểm hoặc hay quên:</div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
                    {(analysis?.criticalWeaknesses && analysis.criticalWeaknesses.length > 0
                      ? analysis.criticalWeaknesses
                      : [
                          {
                            skill: 'Kỹ năng nói & Phản xạ giao tiếp',
                            severity: 'CẤP THIẾT',
                            description: 'Chưa có nhiều hoạt động luyện nói được ghi nhận, phản xạ đàm thoại cần được rèn luyện thêm.',
                            recommendation: 'Dành 5 phút mỗi ngày shadowing theo phát âm mẫu chậm để quen khẩu hình không áp lực.',
                          },
                          {
                            skill: 'Cấu trúc câu căn bản',
                            severity: 'ƯU TIÊN CAO',
                            description: 'Điểm số ngữ pháp ở mức cơ bản, cần làm quen thêm với các cấu trúc thì hiện tại và trật tự từ.',
                            recommendation: 'Hoàn thành các bài luyện tập ngữ pháp ngắn 10 phút tập trung vào từng cấu trúc.',
                          },
                        ]
                    ).map((w: any, idx: number) => {
                      const name = w.area || w.skill || w.category || 'Lỗ hổng kiến thức';
                      const rec = w.recommendation || (w.strategies && w.strategies.length > 0 ? w.strategies[0] : null);
                      return (
                        <div key={idx} style={{ padding: 14, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <b style={{ color: '#991b1b', fontSize: 15 }}>{name}</b>
                            <span className="pill warn" style={{ fontSize: 11 }}>{formatSeverity(w.severity)}</span>
                          </div>
                          <div className="sub mt8" style={{ fontSize: 13, color: '#7f1d1d' }}>
                            {w.description}
                          </div>
                          {rec && (
                            <div style={{ marginTop: 8, fontSize: 12, color: '#991b1b', fontStyle: 'italic', background: 'rgba(255,255,255,0.6)', padding: '6px 10px', borderRadius: 6 }}>
                              💡 <b>Lời khuyên từ Vi:</b> {rec}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Priority Actions */}
              <div className="card">
                <h2><Icon n="zap" s={20} /> Hành động ưu tiên được AI đề xuất cho bạn</h2>
                <div className="sub mt8">Tập trung vào 3 việc này sẽ giúp điểm số của bạn tăng nhanh nhất:</div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14, marginTop: 16 }}>
                  {(analysis?.priorityActions && analysis.priorityActions.length > 0
                    ? analysis.priorityActions.slice(0, 3).map((act: any, i: number) => {
                        const area = formatArea(act.addressesArea, i);
                        let actionText = 'Bắt đầu ngay';
                        let link = '/review';
                        if (area === 'Luyện nói') {
                          actionText = 'Luyện nói ngay';
                          link = '/speaking';
                        } else if (area === 'Ngữ pháp' || area.includes('Quiz')) {
                          actionText = 'Làm Quiz';
                          link = '/quiz';
                        } else if (area === 'Từ vựng') {
                          actionText = 'Học từ vựng';
                          link = '/words';
                        } else {
                          actionText = 'Vào Ôn tập';
                          link = '/review';
                        }
                        const impactStr = formatImpact(act.expectedImpact);
                        const desc = act.rationale
                          ? `Tác động: ${impactStr}. ${act.rationale}`
                          : `Tác động: ${impactStr}`;

                        return {
                          title: act.action || `Hành động ${i + 1}`,
                          area,
                          desc,
                          actionText,
                          link,
                        };
                      })
                    : [
                        { title: '1. Thêm 1 phiên luyện nói 5 phút với AI', area: 'Luyện nói', desc: 'Tác động: Cao. Shadowing câu mẫu giúp xóa bỏ tâm lý sợ nói.', actionText: 'Luyện nói ngay', link: '/speaking' },
                        { title: '2. Luyện tập ngữ pháp căn bản 10 phút', area: 'Ngữ pháp', desc: 'Tác động: Cao. Củng cố cấu trúc câu trọng tâm nâng điểm đọc hiểu.', actionText: 'Làm Quiz', link: '/quiz' },
                        { title: '3. Giữ vững chuỗi streak học hàng ngày', area: 'Thói quen học', desc: 'Tác động: Cao. Mở app ôn ít nhất 5 từ kích hoạt thuật toán SRS.', actionText: 'Vào Ôn tập', link: '/review' },
                      ]
                  ).map((act: any, i: number) => (
                    <div key={i} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <span className="pill" style={{ fontSize: 11, marginBottom: 8 }}>{act.area}</span>
                        <h3 style={{ fontSize: 15, fontWeight: 700, margin: '6px 0' }}>{act.title}</h3>
                        <div className="sub" style={{ fontSize: 13 }}>{act.desc}</div>
                      </div>
                      <button className="btn ghost sm mt16" onClick={() => nav(act.link)}>
                        {act.actionText} →
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Insights & Prediction */}
          {tab === 'insights' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Progress Prediction Card */}
              <div
                className="card"
                style={{
                  background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
                  color: '#fff',
                  padding: 28,
                  borderRadius: 16,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
                  <div>
                    <span className="pill" style={{ background: '#4338ca', color: '#e0e7ff', fontSize: 12 }}>
                      Dự báo tiến độ AI (Predictive Analytics)
                    </span>
                    <h2 style={{ fontSize: 26, fontWeight: 900, marginTop: 10, color: '#fff' }}>
                      Dự kiến hoàn thành mục tiêu {currentLevel === 'A1' ? 'A2' : currentLevel === 'A2' ? 'B1' : 'B2'}
                    </h2>
                    <div style={{ color: '#c7d2fe', fontSize: 15, marginTop: 6 }}>
                      Thời điểm dự kiến: <b>{prediction?.estimatedCompletionDate ? new Date(prediction.estimatedCompletionDate).toLocaleDateString('vi-VN') : 'Sau khoảng 24 ngày'}</b>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 36, fontWeight: 900, color: '#38bdf8' }}>
                      {prediction?.onTimeCompletionProbability ? Math.round(prediction.onTimeCompletionProbability * 100) : 88}%
                    </div>
                    <div style={{ fontSize: 13, color: '#a5b4fc' }}>Xác suất đạt đúng hạn</div>
                    <span className="pill green mt8" style={{ display: 'inline-block' }}>
                      {prediction?.status === 'AHEAD' ? '🚀 Đang vượt tiến độ' : '✅ Đang bám sát lộ trình'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Wins & Long Term */}
              <div className="cols2" style={{ alignItems: 'start' }}>
                <div className="card">
                  <h2>⚡ Nhiệm vụ ăn điểm nhanh (Quick Wins)</h2>
                  <div className="sub mt8">Các hoạt động tốn dưới 5 phút mang lại hiệu quả tức thì:</div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
                    {[
                      { text: 'Lướt 5 flashcard từ vựng đang trễ hạn', dur: '3 phút', link: '/review' },
                      { text: 'Gửi 1 đoạn văn tiếng Anh vào Chat với Vi để kiểm tra lỗi ngữ pháp', dur: '4 phút', link: '/chat' },
                      { text: 'Nghe phát âm chuẩn của 3 từ vựng mới trong kho từ', dur: '2 phút', link: '/words' },
                    ].map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: 'var(--bg-tag, #f8fafc)', borderRadius: 10 }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{item.text}</div>
                          <div className="sub" style={{ fontSize: 12 }}>Thời lượng: {item.dur}</div>
                        </div>
                        <button className="btn sm ghost" onClick={() => nav(item.link)}>Làm</button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card">
                  <h2>🎯 Mục tiêu dài hạn</h2>
                  <div className="sub mt8">Định hướng nâng cao kỹ năng toàn diện:</div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
                    {[
                      { title: 'Làm chủ 500 từ vựng cốt lõi theo tiêu chuẩn Oxford CEFR', progress: '35%' },
                      { title: 'Tự tin giao tiếp phản xạ các chủ đề công sở và du lịch', progress: '60%' },
                      { title: 'Giảm tỉ lệ lỗi ngữ pháp văn bản xuống dưới 5%', progress: '75%' },
                    ].map((g, idx) => (
                      <div key={idx} style={{ border: '1px solid var(--border)', padding: 14, borderRadius: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, fontSize: 14 }}>
                          <span>{g.title}</span>
                          <span style={{ color: 'var(--primary)' }}>{g.progress}</span>
                        </div>
                        <div className="progress mt8" style={{ height: 6 }}>
                          <i style={{ width: g.progress }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
