import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { wordApi, aiApi, learnApi, errMsg, formatPartOfSpeech, analyzeWordRelations, ttsApi, TOPIC_MAP, contentReportApi, CONTENT_REPORT_TYPE_LABELS } from '../api';
import type { ContentReportType } from '../api';
import type { Word, Explain } from '../api';
import { Icon } from '../components/icons';
import { AiExplanationBox } from '../components/AiExplanationBox';
import { useUsage } from '../context/UsageContext';
import { QuotaBadge } from '../components/QuotaBadge';
import { MotionCard, staggerContainer, staggerItem } from '../motion';
import viAvatar from '../assets/vi-3d.webp';

export default function WordDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { decrementQuota } = useUsage();
  const [word, setWord] = useState<Word | null>(null);
  const [ex, setEx] = useState<Explain | null>(null);
  const [loadingEx, setLoadingEx] = useState(false);
  const [isFav, setIsFav] = useState(false);
  const [err, setErr] = useState('');
  const [actionErr, setActionErr] = useState('');
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportType, setReportType] = useState<ContentReportType>('WRONG_MEANING');
  const [reportDesc, setReportDesc] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);
  const [reportErr, setReportErr] = useState('');
  const [reportSuccess, setReportSuccess] = useState('');

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!word) return;
    if (!reportDesc.trim()) {
      setReportErr('Vui lòng nhập mô tả chi tiết lỗi.');
      return;
    }
    setSubmittingReport(true);
    setReportErr('');
    setReportSuccess('');
    try {
      await contentReportApi.create({
        cefrWordId: String(word.id),
        type: reportType,
        description: reportDesc.trim(),
      });
      setReportSuccess('Báo cáo lỗi đã được gửi thành công. Cảm ơn bạn!');
      setReportDesc('');
      setTimeout(() => {
        setShowReportModal(false);
        setReportSuccess('');
      }, 1800);
    } catch (e: any) {
      setReportErr(errMsg(e, 'Không thể gửi báo cáo lỗi lúc này.'));
    } finally {
      setSubmittingReport(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    let isCurrent = true;
    setErr('');
    setActionErr('');
    setIsFav(wordApi.isFavorite(id));
    wordApi.favorites(0, 100)
      .then(({ data }) => {
        if (!isCurrent) return;
        const ids = new Set<string>([
          ...data.content.map((w) => String(w.id)),
          ...(data.localIds || []).map(String),
        ]);
        setIsFav(ids.has(String(id)));
      })
      .catch(() => {});
    wordApi.get(id)
      .then(({ data }) => {
        if (!isCurrent) return;
        setWord(data);
        setErr('');
      })
      .catch((e) => {
        if (!isCurrent) return;
        setErr(errMsg(e, 'Không tìm thấy từ này.'));
      });
    return () => {
      isCurrent = false;
    };
  }, [id]);

  const toggleFav = async () => {
    if (!word) return;
    setActionErr('');
    try {
      if (isFav) {
        await wordApi.unfavorite(word.id);
        setIsFav(false);
      } else {
        await wordApi.favorite(word.id, word);
        setIsFav(true);
      }
    } catch (e) {
      setActionErr(errMsg(e));
    }
  };

  const playAudio = () => {
    if (!word) return;
    if (word.audioUrl) {
      new Audio(word.audioUrl).play().catch(() => {});
    } else {
      const audio = new Audio(ttsApi.getStreamUrl(word.word));
      audio.play().catch(() => {
        if (window.speechSynthesis) {
          const u = new SpeechSynthesisUtterance(word.word);
          u.lang = 'en-US';
          window.speechSynthesis.speak(u);
        }
      });
    }
  };

  const explain = async () => {
    if (!word) return;
    setLoadingEx(true);
    setActionErr('');
    try {
      const { data } = await aiApi.explain(word.id, word.word, {
        partOfSpeech: word.partOfSpeech,
        level: word.level,
        vietnameseMeaning: word.vietnameseMeaning || word.meaning,
      });
      setEx(data);
      decrementQuota('explain');
    } catch (e) {
      setActionErr(errMsg(e, 'AI đang bận, thử lại sau nhé.'));
    } finally {
      setLoadingEx(false);
    }
  };

  const startLearn = async () => {
    if (!word) return;
    setActionErr('');
    try {
      await learnApi.start(word.id);
      nav('/review');
    } catch (e) {
      setActionErr(errMsg(e));
    }
  };

  if (!word && !err) return <div className="content"><div className="loading">Đang tải chi tiết từ vựng...</div></div>;

  return (
    <div className="content" style={{ maxWidth: 1600 }}>
      {/* Back button & Action Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 16 }}>
        <button
          onClick={() => nav(-1)}
          className="sub"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'none',
            border: 'none',
            color: 'var(--primary)',
            fontSize: 15,
            fontWeight: 800,
            cursor: 'pointer',
            padding: '4px 8px',
          }}
        >
          ← Quay lại danh sách từ
        </button>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {word && (
            <>
              <button
                type="button"
                onClick={() => setShowReportModal(true)}
                className="btn ghost sm"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 13,
                  fontWeight: 700,
                  color: 'var(--muted)',
                  border: '1px solid var(--border)',
                  padding: '8px 14px',
                  borderRadius: 999,
                }}
                title="Báo cáo lỗi nội dung (sai nghĩa, sai chính tả, lỗi phát âm...)"
              >
                <span>⚠️</span>
                <span>Báo lỗi từ</span>
              </button>
              <button
                onClick={toggleFav}
                className={'heartbtn' + (isFav ? ' on' : '')}
                style={{ width: 44, height: 44, borderRadius: '50%' }}
                title={isFav ? 'Bỏ lưu yêu thích' : 'Lưu vào từ yêu thích'}
              >
                <svg viewBox="0 0 24 24" className="ic"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
              </button>
            </>
          )}
        </div>
      </div>

      {err && !word && <div className="error">{err}</div>}
      {actionErr && <div className="error">{actionErr}</div>}

      {word && (
        <>
          {/* Word Hero Card matching word.html */}
          <MotionCard className="wordhero" style={{ position: 'relative' }}>
            <span className="pill level" style={{ position: 'absolute', top: 22, right: 26, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span>{word.level || 'A1'}</span>
              {word.topic && TOPIC_MAP[word.topic] ? (
                <>
                  <span style={{ opacity: 0.5 }}>·</span>
                  <span>{TOPIC_MAP[word.topic]}</span>
                </>
              ) : word.category ? (
                <>
                  <span style={{ opacity: 0.5 }}>·</span>
                  <span>{word.category.name}</span>
                </>
              ) : null}
            </span>
            <div className="big">{word.word}</div>
            <div style={{ fontSize: 18, color: 'var(--muted)', fontWeight: 700, marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <span>{word.pronunciation || ''}{word.partOfSpeech ? ` · ${formatPartOfSpeech(word.partOfSpeech)}` : ''}</span>
              <button className="speakbtn" onClick={playAudio} title="Nghe phát âm chuẩn">
                <svg viewBox="0 0 24 24" className="ic"><path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.4 5.6a9 9 0 0 1 0 12.8"/></svg>
              </button>
            </div>
            <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--primary-dark)', marginTop: 12 }}>
              {word.meaning || word.vietnameseMeaning}
            </div>
            {word.example && (
              <div className="ex" style={{ display: 'inline-block', fontStyle: 'italic', color: '#3D5875', fontWeight: 700, fontSize: 16, background: '#F4F9FD', borderRadius: 16, padding: '12px 20px', marginTop: 14 }}>
                “{word.example}”
              </div>
            )}
          </MotionCard>

          {/* 2 Columns */}
          <motion.div
            className="cols2"
            style={{ marginTop: 24 }}
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {/* Left Column Stack */}
            <motion.div className="colstack" variants={staggerItem}>
              <MotionCard className="card">
                <h2><span className="dot"></span>Nghĩa &amp; cách dùng</h2>
                {word.definition ? (
                  <p className="mt8" style={{ fontWeight: 700, lineHeight: 1.65, color: '#33475C' }}>
                    {word.definition}
                  </p>
                ) : (
                  <p className="mt8" style={{ fontWeight: 700, lineHeight: 1.65, color: '#33475C' }}>
                    {word.meaning || word.vietnameseMeaning}
                  </p>
                )}
                {word.example && (
                  <p className="mt8" style={{ fontWeight: 700, lineHeight: 1.65, color: '#33475C', fontStyle: 'italic' }}>
                    “{word.example}”
                  </p>
                )}

                {(() => {
                  const rel = analyzeWordRelations(word.word, word.partOfSpeech);
                  return rel.warningNote ? (
                    <div style={{ marginTop: 14, background: 'var(--yellow-bg)', border: '1px solid #FCD34D', borderRadius: 12, padding: '12px 16px', fontSize: 13, color: '#92400E' }}>
                      <div style={{ fontWeight: 800, marginBottom: 4 }}>💡 Ghi chú phân biệt ngữ pháp:</div>
                      <div>{rel.warningNote}</div>
                    </div>
                  ) : null;
                })()}
              </MotionCard>

              {/* Coach Vi Card */}
              <MotionCard className="card">
                <div className="coach">
                  <img src={viAvatar} alt="Vi" style={{ width: 54, height: 54, borderRadius: '50%', objectFit: 'cover' }} />
                  <div className="bubble">
                    <b>Vi giải thích:</b> Từ “<b>{word.word}</b>” thuộc cấp độ <b>{word.level || 'chuẩn'}</b>. Bạn có thể nhấn “AI giải thích thêm” để phân tích ngữ cảnh bài thi IELTS/TOEIC và các collocations thường gặp!
                  </div>
                </div>
                <div className="btn-row mt16" style={{ alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <button className="btn" onClick={explain} disabled={loadingEx} style={{ width: '100%' }}>
                      <Icon n="spark" s={18} /> {loadingEx ? 'Vi đang phân tích...' : 'AI giải thích thêm'}
                    </button>
                    <QuotaBadge featureKey="explain" labelSuffix="lượt hôm nay" showOnlyWhenLow={true} />
                  </div>
                  <button className="btn green" onClick={startLearn} style={{ flex: 1 }}>
                    <Icon n="bulb" s={18} /> Bắt đầu học từ này
                  </button>
                </div>
              </MotionCard>

              {ex && (
                <div style={{ marginTop: 12 }}>
                  <AiExplanationBox explanation={ex.meaning} />
                </div>
              )}
            </motion.div>

            {/* Right Column Stack */}
            <motion.div className="colstack" variants={staggerItem}>
              <MotionCard className="card">
                <h2><span className="dot g"></span>Từ liên quan &amp; Ngữ cảnh</h2>
                <div className="sub mt8" style={{ marginBottom: 7 }}>Loại từ</div>
                <div className="chiprow">
                  <span className="relchip">{formatPartOfSpeech(word.partOfSpeech || 'noun')}</span>
                  {word.category && <span className="relchip">{word.category.name}</span>}
                  <span className="relchip">CEFR {word.level || 'A1'}</span>
                </div>
                <div className="sub mt16" style={{ marginBottom: 7 }}>Trạng thái từ vựng</div>
                <div className="chiprow">
                  <span className="relchip" style={{ background: isFav ? 'var(--red-bg)' : undefined, color: isFav ? 'var(--red-dark)' : undefined }}>
                    {isFav ? 'Đã lưu yêu thích ♥' : 'Chưa lưu yêu thích'}
                  </span>
                  <span className="relchip" style={{ background: 'var(--green-bg)', color: 'var(--green-dark)' }}>
                    Chuẩn Oxford 3000
                  </span>
                </div>
              </MotionCard>

              <MotionCard className="card">
                <h2><span className="dot a"></span>Trạng thái học của bạn</h2>
                <div className="mt8">
                  <div className="kv"><span>Trạng thái</span>Đang ôn theo SRS</div>
                  <div className="kv"><span>Cấp độ</span>CEFR {word.level || 'A1'}</div>
                  <div className="kv"><span>Lần ôn tiếp theo</span>Hôm nay</div>
                  <div className="kv"><span>Yêu thích</span>{isFav ? 'Đã lưu ♥' : 'Chưa lưu'}</div>
                </div>
              </MotionCard>
            </motion.div>
          </motion.div>
        </>
      )}

      {/* Modal Báo lỗi từ */}
      {showReportModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.55)',
            backdropFilter: 'blur(3px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => !submittingReport && setShowReportModal(false)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 16,
              maxWidth: 480,
              width: '100%',
              padding: '24px 26px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>⚠️</span>
                <span>Báo lỗi từ vựng: {word?.word}</span>
              </h2>
              <button
                type="button"
                className="btn ghost sm"
                onClick={() => setShowReportModal(false)}
                disabled={submittingReport}
                style={{ padding: '4px 8px' }}
              >
                ✕
              </button>
            </div>

            {reportErr && (
              <div
                style={{
                  background: '#FEE2E2',
                  border: '1px solid #FECACA',
                  color: '#DC2626',
                  borderRadius: 8,
                  padding: '10px 14px',
                  fontSize: 13,
                  fontWeight: 600,
                  marginBottom: 14,
                }}
              >
                {reportErr}
              </div>
            )}

            {reportSuccess && (
              <div
                style={{
                  background: '#DCFCE7',
                  border: '1px solid #BBF7D0',
                  color: '#15803D',
                  borderRadius: 8,
                  padding: '10px 14px',
                  fontSize: 13,
                  fontWeight: 700,
                  marginBottom: 14,
                }}
              >
                {reportSuccess}
              </div>
            )}

            <form onSubmit={handleSubmitReport}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
                  Loại lỗi phát hiện
                </label>
                <select
                  className="input"
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value as ContentReportType)}
                  disabled={submittingReport}
                  style={{ width: '100%' }}
                >
                  {(Object.keys(CONTENT_REPORT_TYPE_LABELS) as ContentReportType[]).map((t) => (
                    <option key={t} value={t}>
                      {CONTENT_REPORT_TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
                  Mô tả chi tiết <span style={{ color: 'var(--red)' }}>*</span>
                </label>
                <textarea
                  className="input"
                  rows={4}
                  placeholder="Hãy giải thích rõ lỗi (ví dụ: nghĩa đúng phải là..., ví dụ chưa chuẩn ngữ pháp...)"
                  value={reportDesc}
                  onChange={(e) => setReportDesc(e.target.value)}
                  disabled={submittingReport}
                  maxLength={500}
                  required
                  style={{ width: '100%', resize: 'vertical' }}
                />
                <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 4, textAlign: 'right' }}>
                  {reportDesc.length} / 500 ký tự
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => setShowReportModal(false)}
                  disabled={submittingReport}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn"
                  disabled={submittingReport}
                >
                  {submittingReport ? 'Đang gửi...' : 'Gửi báo cáo lỗi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

