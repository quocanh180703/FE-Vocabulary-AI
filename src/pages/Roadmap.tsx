import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { personalizedApi, learnApi } from '../api';
import type {
  LearningProfile,
  WeaknessStrengthAnalysis,
  LearningPlan,
  DailyPractice,
  ProgressPrediction,
  DailyActivity,
  LearningStats,
} from '../api';
import { Icon } from '../components/icons';
import { ViMascotImage } from '../components/ViMascotImage';
import { UiIcon, type UiIconName } from '../components/UiIcon';
import { ScoreRing, SplitHeading } from '../components/SageEffects';
import { ConfirmModal } from '../components/ConfirmModal';
import { useAuth } from '../auth/AuthContext';
import { useUsage } from '../context/UsageContext';
import { QuotaBadge } from '../components/QuotaBadge';
import { motion, AnimatePresence } from 'motion/react';
import { AnimatedCounter, MotionCard } from '../motion';

interface SavedRoadmapData {
  analyzedAt: string;
  profile: LearningProfile | null;
  analysis: WeaknessStrengthAnalysis | null;
  plan: LearningPlan | null;
  daily: DailyPractice | null;
  prediction: ProgressPrediction | null;
  completedActs: (string | number)[];
}

const nextLevel = (lvl: string): string | null => {
  const order = ['A1', 'A2', 'B1', 'B2', 'C1'];
  const idx = order.indexOf(lvl);
  if (idx === -1 || idx === order.length - 1) return null;
  return order[idx + 1];
};

const formatLearningStyle = (style?: string) => {
  if (!style) return 'Chưa xác định';
  const s = style.trim().toUpperCase();
  if (s.includes('MIX')) return 'Đa phong cách (Kết hợp Nghe - Nhìn - Thực hành)';
  if (s.includes('VISUAL')) return 'Thị giác (Hình ảnh & Flashcard trực quan)';
  if (s.includes('AUDITORY')) return 'Thính giác (Luyện nghe & Âm thanh phát âm)';
  if (s.includes('KINESTHETIC')) return 'Vận động / Tương tác (Làm bài trắc nghiệm & Phản xạ)';
  return style;
};

const formatMotivationLevel = (level?: string) => {
  if (!level) return 'Chưa xác định';
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

const VI_ROADMAP_TRANSLATIONS: Record<string, string> = {
  // Skill & Area names
  'Spoken Production & Interaction': 'Kỹ năng Nói & Phản xạ Giao tiếp',
  'Spoken Production': 'Kỹ năng Nói & Giao tiếp',
  'Core Sentence Structure (A1)': 'Cấu trúc câu căn bản (A1)',
  'Core Sentence Structure': 'Cấu trúc câu căn bản',
  'Vocabulary Retention & Recall': 'Ghi nhớ & Mở rộng từ vựng',
  'Grammar Accuracy': 'Độ chính xác ngữ pháp',
  'Reading Comprehension': 'Đọc hiểu ngữ cảnh',
  'Listening Comprehension': 'Kỹ năng nghe hiểu',
  'Daily Study Habits': 'Thói quen học tập hàng ngày',
  'Pronunciation & Phonetics': 'Phát âm & Ngữ âm',
  'Oral Fluency': 'Độ trôi chảy khi nói',
  'Speaking': 'Luyện nói & Phản xạ',
  'Vocabulary': 'Từ vựng',
  'Grammar': 'Ngữ pháp',
  'Reading': 'Đọc hiểu',
  'Listening': 'Luyện nghe',
};

const toVietnameseRoadmapText = (text?: string): string => {
  if (!text) return '';
  const trimmed = text.trim();
  if (!trimmed) return '';

  // 1. Direct dictionary lookup
  if (VI_ROADMAP_TRANSLATIONS[trimmed]) {
    return VI_ROADMAP_TRANSLATIONS[trimmed];
  }

  // 2. Already contains Vietnamese diacritics
  if (/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđĐ]/.test(trimmed)) {
    return trimmed;
  }

  // 3. Check for partial matches in dictionary
  for (const [en, vi] of Object.entries(VI_ROADMAP_TRANSLATIONS)) {
    if (trimmed.toLowerCase().includes(en.toLowerCase()) || en.toLowerCase().includes(trimmed.toLowerCase())) {
      if (en.length > 12) return vi;
    }
  }

  // 4. Pattern matching for common AI recommendations
  if (/no speaking activities/i.test(trimmed)) {
    return 'Chưa có hoạt động luyện nói nào được ghi nhận. Kỹ năng giao tiếp và phát âm cơ bản cần được rèn luyện thêm.';
  }
  if (/grammar sits at/i.test(trimmed) || (/grammar/i.test(trimmed) && /activities/i.test(trimmed) && /consolidated/i.test(trimmed))) {
    return 'Điểm ngữ pháp cần được củng cố thêm qua các bài luyện tập về thì hiện tại, mạo từ và cấu trúc câu căn bản.';
  }
  if (/shadowing/i.test(trimmed) && (/5-minute/i.test(trimmed) || /audio/i.test(trimmed))) {
    return 'Dành 5 phút mỗi ngày shadowing (nhại theo) audio mẫu phát âm chậm để làm quen khẩu hình và tăng độ tự tin.';
  }
  if (/grammar drills/i.test(trimmed)) {
    return 'Luyện tập ngữ pháp ngắn 10 phút tập trung vào các thì căn bản và trật tự từ mỗi ngày.';
  }
  if (/raise practice/i.test(trimmed) || (/activities per week/i.test(trimmed) && /sessions/i.test(trimmed))) {
    return 'Tăng tần suất học lên ít nhất 5 buổi mỗi tuần với các phiên cố định 15 phút mỗi ngày để tạo thói quen vững chắc.';
  }
  if (/retention/i.test(trimmed) && /consistency/i.test(trimmed)) {
    return 'Tần suất học đều đặn là nền tảng cốt lõi giúp kích hoạt trí nhớ dài hạn và ghi nhớ từ vựng lâu hơn.';
  }

  // Common phrase replacements
  let translated = trimmed
    .replace(/\bSpeaking is at\b/gi, 'Kỹ năng nói đang ở mức')
    .replace(/\bGrammar is at\b/gi, 'Ngữ pháp đang ở mức')
    .replace(/\bwith zero activities\b/gi, 'chưa có hoạt động nào')
    .replace(/\bthe single largest gap\b/gi, 'lỗ hổng lớn nhất hiện tại')
    .replace(/\bcritical bottleneck\b/gi, 'điểm nghẽn cần tháo gỡ')
    .replace(/\bSpoken Production & Interaction\b/gi, 'Kỹ năng Nói & Phản xạ Giao tiếp')
    .replace(/\bSpoken Production\b/gi, 'Kỹ năng Nói & Giao tiếp')
    .replace(/\bCore Sentence Structure\b/gi, 'Cấu trúc câu căn bản');

  return translated;
};

const toVietnameseSkillName = (name?: string): string => {
  if (!name) return 'Kỹ năng';
  const trimmed = name.trim();
  if (VI_ROADMAP_TRANSLATIONS[trimmed]) return VI_ROADMAP_TRANSLATIONS[trimmed];
  if (/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđĐ]/.test(trimmed)) {
    return trimmed;
  }
  const upper = trimmed.toUpperCase();
  if (upper.includes('SPEAK') || upper.includes('ORAL') || upper.includes('PRONUNCIATION')) {
    return 'Kỹ năng Nói & Phản xạ Giao tiếp';
  }
  if (upper.includes('SENTENCE') || upper.includes('GRAMMAR')) {
    return upper.includes('A1') ? 'Cấu trúc câu căn bản (A1)' : 'Cấu trúc câu & Ngữ pháp';
  }
  if (upper.includes('VOCAB') || upper.includes('WORD')) {
    return 'Ghi nhớ & Mở rộng từ vựng';
  }
  if (upper.includes('READ')) {
    return 'Đọc hiểu & Ngữ cảnh';
  }
  if (upper.includes('LISTEN')) {
    return 'Luyện nghe & Nhận diện âm';
  }
  if (upper.includes('HABIT') || upper.includes('FREQUENCY')) {
    return 'Thói quen học tập hàng ngày';
  }
  return trimmed;
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
  const { decrementQuota, refreshUsage } = useUsage();
  const nav = useNavigate();

  // Storage key uniquely scoped to user
  const storageKey = `vocab_ai_roadmap_${user?.id || user?.username || 'default'}`;

  const [tab, setTab] = useState<'today' | 'analysis' | 'insights'>('today');
  const [hasSaved, setHasSaved] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analyzingStep, setAnalyzingStep] = useState<number>(0);
  const [analyzedAt, setAnalyzedAt] = useState<string>('');
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string>('');

  const [profile, setProfile] = useState<LearningProfile | null>(null);
  const [analysis, setAnalysis] = useState<WeaknessStrengthAnalysis | null>(null);
  const [plan, setPlan] = useState<LearningPlan | null>(null);
  const [daily, setDaily] = useState<DailyPractice | null>(null);
  const [prediction, setPrediction] = useState<ProgressPrediction | null>(null);
  const [completedActs, setCompletedActs] = useState<Set<string | number>>(new Set());
  const [stats, setStats] = useState<LearningStats | null>(null);

  // Load learning statistics (non-blocking)
  useEffect(() => {
    learnApi.stats()
      .then((res) => {
        if (res?.data) setStats(res.data);
      })
      .catch(() => { });
  }, []);

  // 1. Initial Load: Check localStorage and backend cache for existing saved analysis (GET plan does not consume quota)
  useEffect(() => {
    let isCurrent = true;
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
      } else {
        // If no localStorage, check if backend Redis has a cached plan (GET /plan does NOT consume quota)
        personalizedApi.plan()
          .then((res) => {
            if (!isCurrent) return;
            const cachedPlan = res?.data;
            if (cachedPlan && cachedPlan.weeks && cachedPlan.weeks.length > 0) {
              setPlan(cachedPlan);
              setHasSaved(true);
              setAnalyzedAt('Đã lưu gần đây');
              personalizedApi.profile().then((pRes) => {
                if (isCurrent && pRes?.data) setProfile(pRes.data);
              }).catch(() => { });
              personalizedApi.dailyPractice().then((dRes) => {
                if (isCurrent && dRes?.data) setDaily(dRes.data);
              }).catch(() => { });
            }
          })
          .catch(() => {
            // 404 NO_PLAN_YET: No plan exists yet, show empty/onboarding state
            if (isCurrent) setHasSaved(false);
          });
      }
    } catch (e) {
      console.warn('Lỗi đọc dữ liệu lộ trình đã lưu:', e);
    }
    return () => {
      isCurrent = false;
    };
  }, [storageKey]);

  // 2. Start AI Analysis handler (only runs when explicitly triggered by the user via POST regenerate)
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

      // Step 3: Generate 4-week learning plan via POST /plan/regenerate (consumes 1 ROADMAP quota)
      setAnalyzingStep(3);
      const planRes = await personalizedApi.regeneratePlan();
      const newPlan = planRes?.data || null;
      if (newPlan) {
        decrementQuota('roadmap');
        refreshUsage();
      }

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

      setFeedbackMsg('Lộ trình AI đã được phân tích và lưu lại thành công!');
      setTimeout(() => setFeedbackMsg(''), 5000);
      learnApi.stats().then((res) => { if (res?.data) setStats(res.data); }).catch(() => { });
    } catch (e: any) {
      console.error('Lỗi khi phân tích lộ trình:', e);
      if (e?.response?.status === 429) {
        setFeedbackMsg('Bạn đã dùng hết lượt tạo lộ trình miễn phí hôm nay.');
      } else {
        setFeedbackMsg('Đã xảy ra lỗi khi tạo lại lộ trình. Vui lòng thử lại sau.');
      }
    } finally {
      setIsAnalyzing(false);
      setAnalyzingStep(0);
    }
  };

  // 3. Clear saved analysis to re-test the fresh onboarding flow
  const handleConfirmResetAnalysis = () => {
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
    setIsResetModalOpen(false);
  };

  // 4. Activity checkbox toggle (saves to localStorage immediately)
  const toggleActivity = (act: DailyActivity, index: number) => {
    const key = act.id || index;
    setCompletedActs((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else {
        next.add(key);
        if (act.id) personalizedApi.completeDailyActivity(act.id).catch(() => { });
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
  const listeningScore = Math.round(profile?.listening?.score != null ? profile.listening.score : 0);
  const quizScore = Math.round(profile?.quiz?.score != null ? profile.quiz.score : 0);

  const activities = (daily?.activities && daily.activities.length > 0)
    ? daily.activities
    : [];

  return (
    <div className="content">
      {/* Compact Page Header */}
      <div className="pagehead">
        <div>
          <div className="eyebrow">ADAPTIVE AI ENGINE · 4-WEEK ROADMAP</div>
          <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
            <SplitHeading text="Lộ trình học AI cá nhân hóa" />
            <QuotaBadge featureKey="roadmap" labelSuffix="lượt tạo hôm nay" />
          </div>
          <p className="sub">
            Theo dõi năng lực theo thời gian thực và tự động tối ưu hóa lộ trình dành riêng cho bạn
          </p>
        </div>

        {hasSaved && (
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <span className="pill level" title="Trình độ CEFR được AI đánh giá">
              Trình độ AI: {currentLevel}
            </span>
            <span
              className="pill greensoft"
              title={`Lộ trình học tập được lưu trữ trong 7 ngày${analyzedAt ? ` (Lưu lúc: ${analyzedAt})` : ''}`}
            >
              ✓ Kế hoạch tuần này {analyzedAt ? `· ${analyzedAt}` : ''}
            </span>
            <button
              type="button"
              className="btn secondary sm"
              onClick={startAnalysis}
              disabled={isAnalyzing}
              title="Tạo lại kế hoạch mới qua AI Gemini (tiêu tốn 1 lượt tạo lộ trình)"
            >
              <UiIcon name="refresh" size={14} /> {isAnalyzing ? 'Đang phân tích...' : 'Cập nhật / Tạo lại'}
            </button>
            <button
              type="button"
              className="btn softred sm"
              onClick={() => setIsResetModalOpen(true)}
              title="Xóa kết quả phân tích đã lưu"
            >
              <UiIcon name="trash" size={14} /> Đặt lại
            </button>
          </div>
        )}
      </div>

      <div className="long-list colstack" style={{ flex: 1, minHeight: 0, gap: 14, paddingRight: 4 }}>
        {feedbackMsg && (
          <div className="ok" style={{ flex: 'none' }}>
            {feedbackMsg}
          </div>
        )}

        {/* Analyzing Stepper Loading Card */}
        {isAnalyzing && (
          <div
            className="card"
            style={{
              background: 'linear-gradient(135deg, rgba(22, 34, 20, 0.94) 0%, rgba(44, 65, 39, 0.96) 100%)',
              color: 'var(--cream)',
              padding: '28px 26px',
              border: '1px solid rgba(250, 248, 241, 0.18)',
            }}
          >
            <div style={{ textAlign: 'center', maxWidth: 620, margin: '0 auto' }}>
              <ViMascotImage
                pose="thinking"
                size={88}
                priority
                alt="Vi đang suy nghĩ và thiết lập lộ trình học cá nhân hóa"
              />
              <h2 style={{ color: 'var(--cream)', fontSize: 22, fontWeight: 800, marginTop: 12 }}>
                Vi đang phân tích năng lực &amp; thiết lập lộ trình cho bạn...
              </h2>
              <p style={{ color: 'rgba(250, 248, 241, 0.78)', fontSize: 13.5, marginTop: 6 }}>
                Hệ thống AI đang phân tích lịch sử ôn tập SRS, các phiên luyện nói và xu hướng tiến bộ để xây dựng kế hoạch tối ưu.
              </p>

              <div className="colstack" style={{ gap: 10, marginTop: 20, textAlign: 'left' }}>
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
                        gap: 12,
                        padding: '10px 14px',
                        borderRadius: 10,
                        background: isCurrent
                          ? 'rgba(250, 248, 241, 0.14)'
                          : isPassed
                            ? 'rgba(66, 119, 77, 0.25)'
                            : 'rgba(255, 255, 255, 0.05)',
                        border: isCurrent
                          ? '1px solid rgba(250, 248, 241, 0.45)'
                          : isPassed
                            ? '1px solid rgba(114, 173, 126, 0.6)'
                            : '1px solid transparent',
                        transition: 'background-color 0.3s var(--ease), border-color 0.3s var(--ease)',
                      }}
                    >
                      <div
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: 12,
                          background: isPassed ? 'var(--success)' : isCurrent ? 'var(--cream)' : 'rgba(255,255,255,0.2)',
                          color: isPassed ? '#fff' : isCurrent ? 'var(--ink)' : '#fff',
                        }}
                      >
                        {isPassed ? '✓' : s.step}
                      </div>
                      <span style={{ fontSize: 13.5, fontWeight: isCurrent ? 700 : 500, color: 'var(--cream)' }}>
                        {s.title}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 5. ONBOARDING / EMPTY STATE */}
        {!hasSaved && !isAnalyzing && (
          <div className="colstack" style={{ gap: 16 }}>
            <div
              className="card"
              style={{
                background: 'linear-gradient(135deg, rgba(22, 34, 20, 0.94) 0%, rgba(44, 65, 39, 0.96) 100%)',
                color: 'var(--cream)',
                padding: '28px 30px',
                border: '1px solid rgba(250, 248, 241, 0.18)',
              }}
            >
              <div className="row between" style={{ flexWrap: 'wrap', gap: 24 }}>
                <div style={{ maxWidth: 620, flex: 1 }}>
                  <div className="tag" style={{ background: 'rgba(250, 248, 241, 0.14)', color: 'var(--cream)', marginBottom: 10 }}>
                    ✦ AI Personalized Roadmap Engine
                  </div>
                  <h2 style={{ fontSize: 26, fontWeight: 800, color: 'var(--cream)', lineHeight: 1.25, margin: 0 }}>
                    Bắt đầu phân tích lộ trình học AI cá nhân hóa
                  </h2>
                  <p style={{ fontSize: 14.5, color: 'rgba(250, 248, 241, 0.84)', marginTop: 10, lineHeight: 1.55 }}>
                    Hệ thống AI phân tích kết quả ôn tập SRS, các phiên luyện nói và thói quen học để xây dựng kế hoạch 4 tuần cùng bài tập mỗi ngày!
                  </p>

                  <div className="row" style={{ marginTop: 18, gap: 12, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="btn amber"
                      onClick={startAnalysis}
                      disabled={isAnalyzing}
                    >
                      <Icon n="zap" s={18} /> {isAnalyzing ? 'Đang phân tích...' : 'Bắt đầu phân tích ngay'}
                    </button>
                    <QuotaBadge featureKey="roadmap" labelSuffix="lượt tạo hôm nay" />
                    <span className="tiny" style={{ color: 'rgba(250, 248, 241, 0.72)' }}>
                      <UiIcon name="zap" size={13} /> Lưu trữ tự động trong 7 ngày
                    </span>
                  </div>
                </div>

                <div
                  className="center"
                  style={{
                    background: 'rgba(250, 248, 241, 0.08)',
                    padding: '18px 22px',
                    borderRadius: 18,
                    border: '1px solid rgba(250, 248, 241, 0.14)',
                    gap: 8,
                  }}
                >
                  <ViMascotImage
                    pose="explain"
                    size={96}
                    priority
                    alt="Vi trợ lý AI giải thích và xây dựng lộ trình học 4 tuần"
                  />
                  <b style={{ fontSize: 15, color: 'var(--cream)' }}>Trợ lý Vi</b>
                  <span className="tiny" style={{ color: 'rgba(250, 248, 241, 0.75)', maxWidth: 165 }}>
                    Đồng hành tối ưu hóa từng bài tập mỗi ngày
                  </span>
                </div>
              </div>
            </div>

            <div className="g3">
              <MotionCard style={{ borderTop: '3px solid var(--sage)' }}>
                <div className="row" style={{ gap: 10 }}>
                  <span style={{ background: 'rgba(71, 96, 63, 0.14)', padding: 8, borderRadius: 10, color: 'var(--sage-dark)' }}>
                    <Icon n="chart" s={20} />
                  </span>
                  <h3 style={{ margin: 0, fontSize: 15.5 }}>1. Đánh giá CEFR chuẩn xác</h3>
                </div>
                <p className="tiny muted mt8" style={{ lineHeight: 1.5, marginBottom: 0 }}>
                  Đo lường năng lực qua điểm Vi Index (0–100) trên Từ vựng cốt lõi, Ngữ pháp và Phát âm trôi chảy.
                </p>
              </MotionCard>

              <MotionCard style={{ borderTop: '3px solid var(--amber)' }}>
                <div className="row" style={{ gap: 10 }}>
                  <span style={{ background: 'var(--amber-bg)', padding: 8, borderRadius: 10, color: 'var(--amber-dark)' }}>
                    <Icon n="spark" s={20} />
                  </span>
                  <h3 style={{ margin: 0, fontSize: 15.5 }}>2. Bắt bệnh &amp; Khoanh vùng lỗi</h3>
                </div>
                <p className="tiny muted mt8" style={{ lineHeight: 1.5, marginBottom: 0 }}>
                  Chỉ ra chính xác chủ đề hay quên, âm đuôi phát âm chưa rõ và lỗi ngữ pháp lặp lại.
                </p>
              </MotionCard>

              <MotionCard style={{ borderTop: '3px solid var(--success)' }}>
                <div className="row" style={{ gap: 10 }}>
                  <span style={{ background: 'var(--success-bg)', padding: 8, borderRadius: 10, color: 'var(--green-dark)' }}>
                    <Icon n="book" s={20} />
                  </span>
                  <h3 style={{ margin: 0, fontSize: 15.5 }}>3. Kế hoạch 4 tuần</h3>
                </div>
                <p className="tiny muted mt8" style={{ lineHeight: 1.5, marginBottom: 0 }}>
                  Phân bổ chỉ 15–20 phút/ngày với 4 cột mốc quan trọng giúp tiến bộ đều đặn.
                </p>
              </MotionCard>
            </div>
          </div>
        )}

        {/* 6. FULL ROADMAP VIEW */}
        {hasSaved && !isAnalyzing && (
          <>
            {/* Hero Performance Overview Banner */}
            <div
              className="card"
              style={{
                background: 'linear-gradient(135deg, rgba(22, 34, 20, 0.94) 0%, rgba(44, 65, 39, 0.96) 100%)',
                color: 'var(--cream)',
                padding: '20px 24px',
                border: '1px solid rgba(250, 248, 241, 0.18)',
                flex: 'none',
              }}
            >
              <div className="row between" style={{ flexWrap: 'wrap', gap: 18 }}>
                <div className="row" style={{ gap: 16 }}>
                  <ScoreRing
                    value={overallScore}
                    label={`${overallScore}`}
                    size={76}
                    accentColor="var(--amber)"
                    onDark
                  />
                  <ViMascotImage
                    pose="explain"
                    size={68}
                    alt="Vi đánh giá chỉ số năng lực Vi Index của bạn"
                  />
                  <div>
                    <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.2, color: '#f4c77f', fontWeight: 800 }}>
                      CHỈ SỐ NĂNG LỰC TỔNG HỢP · VI INDEX
                    </div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--cream)', lineHeight: 1.15 }}>
                      <AnimatedCounter value={overallScore} />/100 <span style={{ fontSize: 14, opacity: 0.78 }}>điểm</span>
                    </div>
                    <div style={{ fontSize: 13, color: 'rgba(250, 248, 241, 0.8)', maxWidth: 460, marginTop: 2 }}>
                      {analysis?.profileSummary || `Bạn đang ở cấp độ ${currentLevel}. Duy trì nhịp học đều để bứt phá!`}
                    </div>
                  </div>
                </div>

                <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                  {(
                    [
                      { icon: 'book' as UiIconName, label: 'Từ vựng', val: vocabScore, hasAct: true },
                      { icon: 'pen' as UiIconName, label: 'Ngữ pháp', val: grammarScore, hasAct: !!(profile?.grammar?.totalActivities && profile.grammar.totalActivities > 0) || grammarScore > 0 },
                      { icon: 'mic' as UiIconName, label: 'Luyện nói', val: speakingScore, hasAct: !!(profile?.speaking?.totalActivities && profile.speaking.totalActivities > 0) || speakingScore > 0 },
                      { icon: 'headphones' as UiIconName, label: 'Luyện nghe', val: listeningScore, hasAct: !!(profile?.listening?.totalActivities && profile.listening.totalActivities > 0) || listeningScore > 0 },
                      { icon: 'file' as UiIconName, label: 'Quiz', val: quizScore, hasAct: !!(profile?.quiz?.totalActivities && profile.quiz.totalActivities > 0) || quizScore > 0 },
                    ]
                  ).map((s, idx) => (
                    <div
                      key={idx}
                      style={{
                        textAlign: 'center',
                        background: 'rgba(250, 248, 241, 0.08)',
                        padding: '8px 12px',
                        borderRadius: 12,
                        border: '1px solid rgba(250, 248, 241, 0.14)',
                        minWidth: 82,
                      }}
                    >
                      <div style={{ fontSize: 11, color: 'rgba(250, 248, 241, 0.78)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <UiIcon name={s.icon} size={12} /> {s.label}
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--cream)', marginTop: 2 }}>
                        {s.hasAct ? <AnimatedCounter value={s.val} suffix="%" /> : <span style={{ fontSize: 11.5, opacity: 0.65 }}>Chưa luyện</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="chips" style={{ flex: 'none' }}>
              <button type="button" className={'chip' + (tab === 'today' ? ' on' : '')} onClick={() => setTab('today')}>
                <Icon n="bulb" s={16} /> Nhiệm vụ hôm nay &amp; Kế hoạch
              </button>
              <button type="button" className={'chip' + (tab === 'analysis' ? ' on' : '')} onClick={() => setTab('analysis')}>
                <Icon n="spark" s={16} /> Phân tích Điểm mạnh / Yếu
              </button>
              <button type="button" className={'chip' + (tab === 'insights' ? ' on' : '')} onClick={() => setTab('insights')}>
                <Icon n="chart" s={16} /> Gợi ý AI &amp; Dự báo tiến độ
              </button>
            </div>

            <AnimatePresence mode="wait">
              {/* TAB 1: Today's Tasks & 4-Week Plan */}
              {tab === 'today' && (
                <motion.div
                  key="today"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div className="cols2" style={{ alignItems: 'start' }}>
                    <MotionCard>
                      <div className="row between" style={{ marginBottom: 8 }}>
                        <h2 style={{ fontSize: 16, margin: 0 }}>
                          Bài tập hôm nay {daily?.totalDurationMinutes ? `(${daily.totalDurationMinutes} phút)` : ''}
                        </h2>
                        {activities.length > 0 && (
                          <span className="pill greensoft">
                            {completedActs.size}/{activities.length} hoàn thành
                          </span>
                        )}
                      </div>

                      {activities.length === 0 ? (
                        <div className="center" style={{ padding: '24px 12px', gap: 10 }}>
                          <ViMascotImage pose="encourage" size={64} alt="Vi khuyến khích tạo nhiệm vụ hôm nay" />
                          <strong style={{ fontSize: 15 }}>Chưa có nhiệm vụ hôm nay</strong>
                          <p className="tiny muted" style={{ maxWidth: 340, margin: 0 }}>
                            Chạy phân tích để AI tạo kế hoạch và nhiệm vụ cho bạn.
                          </p>
                          <button type="button" className="btn sm" onClick={startAnalysis} disabled={isAnalyzing}>
                            <Icon n="spark" s={15} /> Chạy phân tích AI
                          </button>
                        </div>
                      ) : (
                        <>
                          {daily?.motivationalTip && (
                            <div className="tiny muted" style={{ fontStyle: 'italic', marginBottom: 10 }}>
                              "{daily.motivationalTip}"
                            </div>
                          )}

                          <div className="colstack" style={{ gap: 10 }}>
                            {activities.map((act, idx) => {
                              const isDone = completedActs.has(act.id || idx);
                              return (
                                <div
                                  key={act.id || idx}
                                  style={{
                                    border: '1px solid var(--line)',
                                    borderRadius: 12,
                                    padding: 12,
                                    background: isDone ? 'rgba(71, 96, 63, 0.08)' : 'rgba(255, 255, 255, 0.72)',
                                    opacity: isDone ? 0.78 : 1,
                                    transition: 'background-color 0.2s var(--ease)',
                                  }}
                                >
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                                      <input
                                        type="checkbox"
                                        checked={isDone}
                                        onChange={() => toggleActivity(act, idx)}
                                        style={{ width: 17, height: 17, marginTop: 2, cursor: 'pointer', accentColor: 'var(--sage)' }}
                                        id={`act-${idx}`}
                                      />
                                      <div>
                                        <label
                                          htmlFor={`act-${idx}`}
                                          style={{
                                            fontWeight: 700,
                                            fontSize: 14,
                                            cursor: 'pointer',
                                            textDecoration: isDone ? 'line-through' : 'none',
                                            color: isDone ? 'var(--muted)' : 'var(--ink)',
                                          }}
                                        >
                                          {act.activityTitle}
                                        </label>
                                        {act.description && (
                                          <div className="tiny muted mt4">{act.description}</div>
                                        )}
                                      </div>
                                    </div>

                                    <div className="colstack" style={{ alignItems: 'flex-end', gap: 4 }}>
                                      {act.durationMinutes && <span className="tiny muted">⏱️ {act.durationMinutes}p</span>}
                                      {act.isPriority && <span className="pill warn">Ưu tiên</span>}
                                    </div>
                                  </div>

                                  <div className="row" style={{ marginTop: 8, justifyContent: 'flex-end', gap: 8 }}>
                                    {act.activityType === 'VOCABULARY' && (
                                      <button type="button" className="btn secondary sm" onClick={() => nav('/review')}>Vào Ôn tập →</button>
                                    )}
                                    {act.activityType === 'QUIZ' && (
                                      <button type="button" className="btn secondary sm" onClick={() => nav('/quiz')}>Làm Quiz →</button>
                                    )}
                                    {act.activityType === 'SPEAKING' && (
                                      <button type="button" className="btn secondary sm" onClick={() => nav('/speaking')}>Luyện nói →</button>
                                    )}
                                    {act.activityType === 'GRAMMAR' && (
                                      <button type="button" className="btn secondary sm" onClick={() => nav('/grammar')}>Sửa ngữ pháp →</button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </MotionCard>

                    <MotionCard>
                      <h2 style={{ fontSize: 16, marginBottom: 10 }}><Icon n="book" s={18} /> Kế hoạch học tập 4 tuần</h2>
                      {!plan ? (
                        <div className="center" style={{ padding: '24px 12px', gap: 10 }}>
                          <ViMascotImage pose="thinking" size={64} alt="Vi chuẩn bị kế hoạch 4 tuần" />
                          <strong style={{ fontSize: 15 }}>Chưa có kế hoạch 4 tuần</strong>
                          <p className="tiny muted" style={{ maxWidth: 340, margin: 0 }}>
                            Chạy phân tích để AI tạo kế hoạch từ dữ liệu học của bạn.
                          </p>
                          <button type="button" className="btn sm" onClick={startAnalysis} disabled={isAnalyzing}>
                            <Icon n="spark" s={15} /> Chạy phân tích AI
                          </button>
                        </div>
                      ) : (
                        <>
                          {plan.planDescription && <div className="sub">{plan.planDescription}</div>}
                          {(plan.primaryGoal || plan.totalCommitmentMinutesPerWeek) && (
                            <div className="mt12 colstack" style={{ gap: 6 }}>
                              {plan.primaryGoal && (
                                <div className="kv"><span>Mục tiêu chính</span><b>{plan.primaryGoal}</b></div>
                              )}
                              {plan.totalCommitmentMinutesPerWeek && (
                                <div className="kv"><span>Thời gian cam kết</span><b>{plan.totalCommitmentMinutesPerWeek} phút / tuần</b></div>
                              )}
                            </div>
                          )}
                          {plan.milestones && plan.milestones.length > 0 && (
                            <>
                              <h3 style={{ fontSize: 14, margin: '14px 0 8px' }}>Các cột mốc quan trọng</h3>
                              <div className="colstack" style={{ gap: 6 }}>
                                {plan.milestones.map((m: any, idx: number) => (
                                  <div key={idx} className="row" style={{ gap: 10, padding: '8px 10px', background: 'rgba(250, 248, 241, 0.7)', borderRadius: 10 }}>
                                    <span className="pill">Tuần {m.week || idx + 1}</span>
                                    <span style={{ fontSize: 13, fontWeight: 600 }}>{m.name || m.title || `Hoàn thiện mục tiêu tuần ${m.week || idx + 1}`}</span>
                                  </div>
                                ))}
                              </div>
                            </>
                          )}
                        </>
                      )}
                    </MotionCard>
                  </div>
                </motion.div>
              )}

              {/* TAB 2: Weakness & Strength Analysis */}
              {tab === 'analysis' && (
                <motion.div
                  key="analysis"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                >
                  {!analysis ? (
                    <MotionCard className="center" style={{ padding: '32px 20px', gap: 10 }}>
                      <ViMascotImage pose="thinking" size={72} alt="Vi chờ phân tích điểm mạnh yếu" />
                      <h2 style={{ fontSize: 17, margin: 0 }}>Chưa có phân tích điểm mạnh — điểm yếu</h2>
                      <p className="sub" style={{ maxWidth: 400, margin: 0 }}>Chạy phân tích để AI đánh giá từ dữ liệu học của bạn.</p>
                      <button type="button" className="btn sm" onClick={startAnalysis} disabled={isAnalyzing}>
                        <Icon n="spark" s={15} /> Chạy phân tích AI
                      </button>
                    </MotionCard>
                  ) : (
                    <div className="colstack" style={{ gap: 14 }}>
                      <div className="card row" style={{ gap: 14, padding: '14px 18px' }}>
                        <ViMascotImage pose="explain" size={44} alt="Vi phân tích phong cách học" />
                        <div>
                          <h2 style={{ fontSize: 16, margin: 0 }}>Đặc điểm phong cách học của bạn</h2>
                          <div className="tiny muted mt4">
                            Phong cách chính: <b>{formatLearningStyle(analysis.learningStyle)}</b> · Duy trì: <b>{formatMotivationLevel(analysis.motivationLevel)}</b>
                          </div>
                        </div>
                      </div>

                      <div className="cols2" style={{ alignItems: 'start' }}>
                        <div className="card colstack" style={{ gap: 10 }}>
                          <h2 style={{ fontSize: 15.5, margin: 0, color: 'var(--green-dark)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <UiIcon name="check-circle" size={16} /> Điểm mạnh vượt trội ({analysis.outstandingStrengths?.length ?? 0})
                          </h2>
                          {!analysis.outstandingStrengths || analysis.outstandingStrengths.length === 0 ? (
                            <div className="tiny muted" style={{ fontStyle: 'italic' }}>Tiếp tục luyện tập để AI nhận diện các thế mạnh của bạn!</div>
                          ) : (
                            analysis.outstandingStrengths.map((s: any, idx: number) => (
                              <div key={idx} style={{ padding: 12, background: 'var(--success-bg)', border: '1px solid rgba(66,119,77,0.28)', borderRadius: 10 }}>
                                <div className="row between">
                                  <b style={{ color: 'var(--green-dark)', fontSize: 14 }}>{toVietnameseSkillName(s.area || s.skill || s.category || 'Điểm mạnh')}</b>
                                  <span className="pill greensoft">{formatExcellenceLevel(s.excellenceLevel || s.proficiencyLevel || 'XUẤT SẮC')}</span>
                                </div>
                                <div className="tiny mt4" style={{ color: 'var(--ink)' }}>{toVietnameseRoadmapText(s.description || s.leverageStrategy)}</div>
                              </div>
                            ))
                          )}
                        </div>

                        <div className="card colstack" style={{ gap: 10 }}>
                          <h2 style={{ fontSize: 15.5, margin: 0, color: 'var(--red-dark)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <UiIcon name="warning" size={16} /> Lỗ hổng cần cải thiện ({analysis.criticalWeaknesses?.length ?? 0})
                          </h2>
                          {!analysis.criticalWeaknesses || analysis.criticalWeaknesses.length === 0 ? (
                            <div style={{ padding: 12, background: 'var(--success-bg)', borderRadius: 10, color: 'var(--green-dark)', fontWeight: 700, fontSize: 13.5, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                              <UiIcon name="check-circle" size={15} /> Không còn lỗ hổng nghiêm trọng
                            </div>
                          ) : (
                            analysis.criticalWeaknesses.map((w: any, idx: number) => {
                              const rawRec = w.recommendation || (w.strategies && w.strategies.length > 0 ? w.strategies[0] : null);
                              return (
                                <div key={idx} style={{ padding: 12, background: 'var(--danger-bg)', border: '1px solid rgba(154,75,67,0.28)', borderRadius: 10 }}>
                                  <div className="row between">
                                    <b style={{ color: 'var(--red-dark)', fontSize: 14 }}>{toVietnameseSkillName(w.area || w.skill || w.category || 'Lỗ hổng kiến thức')}</b>
                                    <span className="pill warn">{formatSeverity(w.severity)}</span>
                                  </div>
                                  <div className="tiny mt4" style={{ color: 'var(--ink)' }}>{toVietnameseRoadmapText(w.description)}</div>
                                  {rawRec && (
                                    <div className="tiny mt4" style={{ fontStyle: 'italic', color: 'var(--red-dark)' }}>
                                      <UiIcon name="lightbulb" size={13} /> <b>Vi gợi ý:</b> {toVietnameseRoadmapText(rawRec)}
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>

                      {analysis.priorityActions && analysis.priorityActions.length > 0 && (
                        <div className="card">
                          <h2 style={{ fontSize: 15.5, marginBottom: 10 }}><Icon n="zap" s={17} /> Hành động ưu tiên</h2>
                          <div className="g3">
                            {analysis.priorityActions.slice(0, 3).map((act: any, i: number) => {
                              const area = formatArea(act.addressesArea, i);
                              let actionText = 'Vào Ôn tập';
                              let link = '/review';
                              if (area === 'Luyện nói') { actionText = 'Luyện nói ngay'; link = '/speaking'; }
                              else if (area === 'Ngữ pháp' || area.includes('Quiz')) { actionText = 'Làm Quiz'; link = '/quiz'; }
                              else if (area === 'Từ vựng') { actionText = 'Học từ vựng'; link = '/words'; }
                              const rationaleVi = toVietnameseRoadmapText(act.rationale);
                              return (
                                <div key={i} className="colstack between" style={{ border: '1px solid var(--line)', borderRadius: 12, padding: 12, gap: 8 }}>
                                  <div>
                                    <span className="pill">{area}</span>
                                    <h3 style={{ fontSize: 14, margin: '6px 0 4px' }}>{toVietnameseRoadmapText(act.action) || `Hành động ${i + 1}`}</h3>
                                    <div className="tiny muted">Tác động: {formatImpact(act.expectedImpact)}{rationaleVi ? `. ${rationaleVi}` : ''}</div>
                                  </div>
                                  <button type="button" className="btn secondary sm" onClick={() => nav(link)}>{actionText} →</button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              )}

              {/* TAB 3: Insights & Prediction */}
              {tab === 'insights' && (
                <motion.div
                  key="insights"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                  className="colstack"
                  style={{ gap: 14 }}
                >
                  {!prediction ? (
                    <div
                      className="card center"
                      style={{
                        background: 'linear-gradient(135deg, rgba(22, 34, 20, 0.94) 0%, rgba(44, 65, 39, 0.96) 100%)',
                        color: 'var(--cream)',
                        padding: '28px 20px',
                        gap: 10,
                      }}
                    >
                      <ViMascotImage pose="thinking" size={72} alt="Vi chờ phân tích dự báo tiến độ" />
                      <h2 style={{ fontSize: 18, margin: 0, color: 'var(--cream)' }}>Chưa có dự đoán tiến độ</h2>
                      <p style={{ color: 'rgba(250, 248, 241, 0.8)', maxWidth: 420, margin: 0, fontSize: 13.5 }}>
                        Chạy phân tích để AI dự đoán thời gian hoàn thành mục tiêu.
                      </p>
                      <button type="button" className="btn amber sm" onClick={startAnalysis} disabled={isAnalyzing}>
                        <Icon n="spark" s={15} /> Chạy phân tích AI
                      </button>
                    </div>
                  ) : (
                    <div
                      className="card"
                      style={{
                        background: 'linear-gradient(135deg, rgba(22, 34, 20, 0.94) 0%, rgba(44, 65, 39, 0.96) 100%)',
                        color: 'var(--cream)',
                        padding: 20,
                      }}
                    >
                      <div className="row between" style={{ flexWrap: 'wrap', gap: 16 }}>
                        <div>
                          <span className="pill" style={{ background: 'rgba(250, 248, 241, 0.16)', color: 'var(--cream)' }}>
                            Dự báo tiến độ AI
                          </span>
                          <h2 style={{ fontSize: 22, marginTop: 8, color: 'var(--cream)', marginBottom: 4 }}>
                            {nextLevel(currentLevel) ? `Dự kiến hoàn thành mục tiêu ${nextLevel(currentLevel)}` : 'Duy trì trình độ C1'}
                          </h2>
                          {prediction.estimatedCompletionDate && (
                            <div style={{ color: 'rgba(250, 248, 241, 0.82)', fontSize: 14 }}>
                              Thời điểm dự kiến: <b>{new Date(prediction.estimatedCompletionDate).toLocaleDateString('vi-VN')}</b>
                            </div>
                          )}
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 32, fontWeight: 800, color: '#f4c77f' }}>
                            {prediction.onTimeCompletionProbability != null
                              ? (prediction.onTimeCompletionProbability > 1
                                ? Math.min(100, Math.round(prediction.onTimeCompletionProbability))
                                : Math.min(100, Math.round(prediction.onTimeCompletionProbability * 100)))
                              : 0}%
                          </div>
                          <div className="tiny" style={{ color: 'rgba(250, 248, 241, 0.78)' }}>Xác suất đạt đúng hạn</div>
                          <span className="pill greensoft mt4">
                            {prediction.status === 'AHEAD' ? <><UiIcon name="rocket" size={13} /> Đang vượt tiến độ</> : 'Đang bám sát lộ trình'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="cols2" style={{ alignItems: 'start' }}>
                    <div className="card colstack" style={{ gap: 10 }}>
                      <h2 style={{ fontSize: 15.5, margin: 0, display: 'inline-flex', alignItems: 'center', gap: 6 }}><UiIcon name="zap" size={16} /> Nhiệm vụ ăn điểm nhanh (Quick Wins)</h2>
                      <div className="colstack" style={{ gap: 8 }}>
                        {[
                          ...(stats && stats.wordsNeedingReview === 0
                            ? []
                            : [{
                                text: stats?.wordsNeedingReview != null ? `Lướt ${stats.wordsNeedingReview} flashcard từ vựng đang trễ hạn` : 'Lướt flashcard từ vựng đang trễ hạn',
                                dur: '3 phút',
                                link: '/review',
                              }]),
                          { text: 'Gửi 1 đoạn văn tiếng Anh vào Chat với Vi để kiểm tra ngữ pháp', dur: '4 phút', link: '/chat' },
                          { text: 'Nghe phát âm chuẩn của 3 từ vựng mới trong kho từ', dur: '2 phút', link: '/words' },
                        ].map((item, idx) => (
                          <div key={idx} className="row between" style={{ padding: '10px 12px', background: 'rgba(250, 248, 241, 0.7)', borderRadius: 10, gap: 10 }}>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 13.5 }}>{item.text}</div>
                              <div className="tiny muted">Thời lượng: {item.dur}</div>
                            </div>
                            <button type="button" className="btn secondary sm" onClick={() => nav(item.link)}>Làm</button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="card colstack" style={{ gap: 10 }}>
                      <h2 style={{ fontSize: 15.5, margin: 0, display: 'inline-flex', alignItems: 'center', gap: 6 }}><UiIcon name="target" size={16} /> Mục tiêu dài hạn</h2>
                      {(() => {
                        const totalVocab = stats ? (stats.masteredWords || 0) + (stats.learningWords || 0) : 0;
                        const vocabPct = stats ? Math.min(100, Math.round((totalVocab / 500) * 100)) : 0;
                        const vocabSub = stats ? `${stats.masteredWords || 0} đã thuộc · ${stats.learningWords || 0} đang học` : 'Chưa tải được số liệu';
                        const longTermGoals = [
                          { title: 'Làm chủ 500 từ vựng cốt lõi', progress: `${vocabPct}%`, sub: vocabSub },
                          { title: 'Tự tin giao tiếp phản xạ', progress: `${speakingScore}%`, sub: `Điểm phản xạ nói: ${speakingScore}/100` },
                          { title: 'Nâng cao độ chính xác ngữ pháp', progress: `${grammarScore}%`, sub: `Điểm chính xác: ${grammarScore}/100` },
                          { title: 'Rèn luyện khả năng nghe hiểu', progress: `${listeningScore}%`, sub: `Điểm nghe hiểu: ${listeningScore}/100` },
                          { title: 'Tối ưu độ chính xác kiểm tra trắc nghiệm', progress: `${quizScore}%`, sub: `Điểm trắc nghiệm: ${quizScore}/100` },
                        ];
                        return longTermGoals.map((g, idx) => (
                          <div key={idx} style={{ border: '1px solid var(--line)', padding: 10, borderRadius: 10 }}>
                            <div className="row between" style={{ fontWeight: 700, fontSize: 13 }}>
                              <span>{g.title}</span>
                              <span style={{ color: 'var(--sage-dark)' }}>{g.progress}</span>
                            </div>
                            <div className="progress mt4" style={{ height: 6 }}>
                              <span style={{ width: g.progress }} />
                            </div>
                            <div className="tiny muted mt4">{g.sub}</div>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>

      <ConfirmModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onConfirm={handleConfirmResetAnalysis}
        title="Đặt lại lộ trình AI"
        itemName="lộ trình AI đã lưu"
        description={
          <p style={{ margin: 0 }}>
            Bạn có chắc chắn muốn đặt lại lộ trình học AI đã lưu không? Bạn sẽ có thể thực hiện khảo sát mục tiêu và phân tích lộ trình mới từ đầu.
          </p>
        }
        warningText="Toàn bộ kế hoạch học tập và tiến độ các hoạt động hàng ngày đã lưu sẽ bị xóa."
        confirmText="Xác nhận đặt lại"
        cancelText="Hủy bỏ"
        variant="danger"
        icon="trash"
      />
    </div>
  );
}
