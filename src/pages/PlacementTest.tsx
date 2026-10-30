import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { placementApi } from '../api';
import type { PlacementStatus, PlacementQuestion, PlacementSubmitResult } from '../api';
import { PageTransition, AnimatedProgressBar, staggerContainer, staggerItem } from '../motion';
import viImg from '../assets/vi-hero.png';
import './PlacementTest.css';

export default function PlacementTest() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<PlacementStatus | null>(null);
  const [view, setView] = useState<'intro' | 'testing' | 'result'>('intro');

  const [questions, setQuestions] = useState<PlacementQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<PlacementSubmitResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load status on mount
  useEffect(() => {
    placementApi
      .getStatus()
      .then(({ data }) => {
        setStatus(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load placement status:', err);
        setLoading(false);
      });
  }, []);

  // Handle "Để sau" (skip for now)
  const handleSkip = useCallback(() => {
    sessionStorage.setItem('placement_dismissed', 'true');
    navigate('/dashboard');
  }, [navigate]);

  // Start / Retest
  const handleStartTest = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await placementApi.getTest();
      if (!data || data.length === 0) {
        throw new Error('Chưa có câu hỏi kiểm tra trong hệ thống.');
      }
      setQuestions(data);
      setCurrentIndex(0);
      setAnswers({});
      setView('testing');
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Không tải được đề kiểm tra. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Option selection
  const handleSelectOption = (qId: number, optIdx: number) => {
    setAnswers((prev) => ({ ...prev, [qId]: optIdx }));
  };

  // Exit while taking test
  const handleExitTest = () => {
    if (window.confirm('Bạn có chắc muốn thoát? Kết quả bài làm hiện tại sẽ không được lưu.')) {
      setView('intro');
    }
  };

  // Submit test
  const handleSubmit = async () => {
    if (submitting) return;

    const answeredCount = Object.keys(answers).length;
    if (answeredCount < questions.length) {
      const confirmed = window.confirm(
        `Bạn mới trả lời ${answeredCount}/${questions.length} câu. Các câu chưa làm sẽ tính là sai. Bạn có chắc muốn nộp bài?`
      );
      if (!confirmed) return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        answers: questions.map((q) => ({
          questionId: q.id,
          selectedIndex: answers[q.id] !== undefined ? answers[q.id] : null,
        })),
      };

      const { data } = await placementApi.submit(payload);
      setSubmitResult(data);
      setView('result');

      // Dispatch global event so header/dashboard can refresh level immediately
      window.dispatchEvent(new CustomEvent('vocab_placement_updated', { detail: data }));
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Không thể nộp bài kiểm tra. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="placement-page">
        <div className="placement-card" style={{ padding: '60px 20px', textAlign: 'center' }}>
          <div className="loading">Đang tải thông tin kiểm tra...</div>
        </div>
      </div>
    );
  }

  // ---------------- VIEW 1: INTRO ----------------
  if (view === 'intro') {
    const isRetest = status?.completed;
    const currentLvl = status?.placementLevel || 'A1';

    return (
      <PageTransition className="placement-page">
        <div className="placement-card">
          <div className="placement-hero">
            <div className="placement-mascot-wrap">
              <img src={viImg} alt="Vi Mascot" className="placement-mascot-img" />
            </div>

            <span className="placement-badge-pill">
              ⭐ Bài kiểm tra xếp lớp đầu vào CEFR
            </span>

            <h1 className="placement-title">
              {isRetest ? 'Kiểm tra lại trình độ tiếng Anh' : 'Vi chào bạn! Hãy tìm trình độ chuẩn của bạn'}
            </h1>

            <p className="placement-desc">
              {isRetest
                ? `Trình độ kiểm tra hiện tại của bạn là ${currentLvl}. Bạn có thể làm lại bất cứ lúc nào để cập nhật lại lộ trình học và từ vựng.`
                : 'Bài kiểm tra nhanh gồm 20 câu trắc nghiệm (~10 phút), xếp bậc từ A1 đến C1 giúp Vi gợi ý chính xác từ vựng, bài quiz và lộ trình học phù hợp nhất cho bạn.'}
            </p>

            {isRetest && (
              <div className="placement-retest-banner">
                <span>💡</span>
                <span>
                  <strong>Không giới hạn số lần làm lại:</strong> Kết quả mới nhất sẽ được lưu và dùng làm mức chuẩn cho hệ thống học tập của bạn.
                </span>
              </div>
            )}

            <motion.div
              className="placement-features-grid"
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
            >
              <motion.div className="placement-feature-item" variants={staggerItem}>
                <div className="placement-feature-icon">📝</div>
                <div>
                  <div className="placement-feature-title">20 câu trắc nghiệm</div>
                  <div className="placement-feature-sub">4 câu mỗi cấp A1 → C1 từ ngân hàng từ vựng thật</div>
                </div>
              </motion.div>
              <motion.div className="placement-feature-item" variants={staggerItem}>
                <div className="placement-feature-icon">⏱️</div>
                <div>
                  <div className="placement-feature-title">Khoảng 10 phút</div>
                  <div className="placement-feature-sub">Không giới hạn thời gian gắt gao, làm thoải mái</div>
                </div>
              </motion.div>
              <motion.div className="placement-feature-item" variants={staggerItem}>
                <div className="placement-feature-icon">🎯</div>
                <div>
                  <div className="placement-feature-title">Cá nhân hóa ngay</div>
                  <div className="placement-feature-sub">Flashcard & Quiz lập tức đồng bộ theo cấp độ của bạn</div>
                </div>
              </motion.div>
            </motion.div>

            {error && (
              <div style={{ color: '#DC2626', marginBottom: '18px', fontWeight: 700 }}>
                {error}
              </div>
            )}

            <div className="placement-actions-row">
              <button
                type="button"
                className="btn-primary-placement"
                onClick={handleStartTest}
              >
                {isRetest ? 'Bắt đầu làm lại bài test ▸' : 'Bắt đầu kiểm tra ngay ▸'}
              </button>

              <button
                type="button"
                className="btn-secondary-placement"
                onClick={handleSkip}
              >
                {isRetest ? 'Về Dashboard' : 'Để sau (vào học luôn)'}
              </button>
            </div>
          </div>
        </div>
      </PageTransition>
    );
  }

  // ---------------- VIEW 2: TESTING ----------------
  if (view === 'testing') {
    const currentQ = questions[currentIndex];
    const progress = Math.round(((currentIndex + 1) / questions.length) * 100);
    const selectedOption = answers[currentQ?.id];
    const optionLabels = ['A', 'B', 'C', 'D'];

    return (
      <PageTransition className="placement-page">
        <div className="placement-card">
          <div className="placement-test-header">
            <div className="placement-test-nav">
              <button
                type="button"
                className="btn-secondary-placement"
                style={{ padding: '6px 14px', fontSize: '13px' }}
                onClick={handleExitTest}
              >
                ✕ Thoát
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className={`placement-level-tag ${currentQ?.level?.toLowerCase() || 'a1'}`}>
                  Cấp độ {currentQ?.level}
                </span>
                <span className="placement-q-count">
                  Câu {currentIndex + 1} / {questions.length}
                </span>
              </div>
            </div>

            <div className="placement-progress-track">
              <AnimatedProgressBar value={progress} color="#1565C0" height={8} />
            </div>
          </div>

          <div className="placement-body">
            <div className="placement-q-box">
              <p className="placement-q-text">{currentQ?.content}</p>
            </div>

            <div className="placement-options-list">
              {currentQ?.options?.map((opt, idx) => {
                const isSelected = selectedOption === idx;
                return (
                  <button
                    key={idx}
                    type="button"
                    className={`placement-option-btn ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSelectOption(currentQ.id, idx)}
                  >
                    <span className="placement-option-key">{optionLabels[idx] || idx + 1}</span>
                    <span>{opt}</span>
                  </button>
                );
              })}
            </div>

            {error && (
              <div style={{ color: '#DC2626', marginTop: '16px', fontWeight: 700 }}>
                {error}
              </div>
            )}
          </div>

          <div className="placement-test-footer">
            <button
              type="button"
              className="btn-secondary-placement"
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
              style={{ opacity: currentIndex === 0 ? 0.4 : 1 }}
            >
              ◂ Câu trước
            </button>

            {currentIndex < questions.length - 1 ? (
              <button
                type="button"
                className="btn-primary-placement"
                onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
              >
                Câu tiếp theo ▸
              </button>
            ) : (
              <button
                type="button"
                className="btn-primary-placement"
                style={{ background: '#1E7E46' }}
                disabled={submitting}
                onClick={handleSubmit}
              >
                {submitting ? 'Đang chấm điểm...' : 'Hoàn thành & Nộp bài ✓'}
              </button>
            )}
          </div>
        </div>
      </PageTransition>
    );
  }

  // ---------------- VIEW 3: RESULT ----------------
  if (view === 'result' && submitResult) {
    const lvl = submitResult.level || 'A1';
    const breakdown = submitResult.scoreByLevel || {};
    const cefrLevels = ['A1', 'A2', 'B1', 'B2', 'C1'];

    const levelDescriptions: Record<string, string> = {
      A1: 'Mới bắt đầu · Sơ cấp cơ bản',
      A2: 'Sơ cấp nâng cao · Giao tiếp hằng ngày',
      B1: 'Trung cấp · Tự tin độc lập',
      B2: 'Trung cấp trên · Vận dụng linh hoạt',
      C1: 'Cao cấp · Thành thạo chuyên sâu',
    };

    return (
      <PageTransition className="placement-page">
        <div className="placement-card">
          <div className="placement-result-card">
            <div className={`placement-result-badge ${lvl.toLowerCase()}`}>
              {lvl}
            </div>

            <h2 className="placement-result-level-name">
              Cấp độ {lvl} — {levelDescriptions[lvl] || 'Trình độ tiếng Anh'}
            </h2>

            <div className="placement-vi-quote">
              💬 <strong>Lời khuyên từ Vi:</strong> {submitResult.feedback}
            </div>

            <div className="placement-breakdown-title">
              Bảng điểm đánh giá năng lực liên tục (Mastery Gate)
            </div>

            <motion.div
              className="placement-breakdown-grid"
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
            >
              {cefrLevels.map((l) => {
                const score = breakdown[l] !== undefined ? breakdown[l] : 0;
                const passed = score >= 3;
                return (
                  <motion.div
                    key={l}
                    className={`placement-breakdown-cell ${passed ? 'passed' : ''}`}
                    variants={staggerItem}
                  >
                    <div className="lvl">{l}</div>
                    <div className="score">{score}/4</div>
                    <span className={`status-tag ${passed ? 'ok' : 'fail'}`}>
                      {passed ? 'Đạt' : 'Chưa đạt'}
                    </span>
                  </motion.div>
                );
              })}
            </motion.div>

            <p style={{ fontSize: '14.5px', color: '#64748B', maxWidth: '560px', margin: '0 auto 28px' }}>
              Toàn bộ bài tập Flashcard ôn tập, đề xuất bài Quiz và lộ trình học tập cá nhân hóa của bạn đã được cập nhật chuẩn theo mức <strong>{lvl}</strong>.
            </p>

            <div className="placement-actions-row">
              <button
                type="button"
                className="btn-primary-placement"
                style={{ background: '#1E7E46' }}
                onClick={() => navigate('/dashboard')}
              >
                Vào Dashboard học ngay ▸
              </button>

              <button
                type="button"
                className="btn-secondary-placement"
                onClick={handleStartTest}
              >
                Làm lại bài kiểm tra
              </button>
            </div>
          </div>
        </div>
      </PageTransition>
    );
  }

  return null;
}
