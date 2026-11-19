import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createPortal } from 'react-dom';
import {
  wordApi,
  aiApi,
  learnApi,
  errMsg,
  formatPartOfSpeech,
  analyzeWordRelations,
  ttsApi,
  TOPIC_MAP,
  contentReportApi,
  CONTENT_REPORT_TYPE_LABELS,
} from '../api';
import type { ContentReportType, Word, Explain } from '../api';
import { Icon } from '../components/icons';
import { AiExplanationBox } from '../components/AiExplanationBox';
import { useUsage } from '../context/UsageContext';
import { QuotaBadge } from '../components/QuotaBadge';
import { ViMascotImage } from '../components/ViMascotImage';
import { ViLoadingScreen } from '../components/states/ViLoadingScreen';
import { UiIcon } from '../components/UiIcon';
import { SplitHeading } from '../components/SageEffects';

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
    wordApi
      .favorites(0, 100)
      .then(({ data }) => {
        if (!isCurrent) return;
        const ids = new Set<string>([
          ...data.content.map((w) => String(w.id)),
          ...(data.localIds || []).map(String),
        ]);
        setIsFav(ids.has(String(id)));
      })
      .catch(() => {});
    wordApi
      .get(id)
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

  if (!word && !err) {
    return (
      <div className="content">
        <ViLoadingScreen subtitle="Đang tải chi tiết từ vựng" />
      </div>
    );
  }

  return (
    <div className="content">
      <div className="pagehead">
        <div>
          <div className="eyebrow">WORD DETAIL</div>
          <SplitHeading text={word?.word || 'Chi tiết từ vựng'} />
          <p className="sub">Một từ vựng, nhiều cách sử dụng trong ngữ cảnh thực tế.</p>
        </div>

        <div className="row">
          <button type="button" className="btn secondary sm" onClick={() => nav(-1)}>
            ← Quay lại
          </button>
          {word && (
            <>
              <button type="button" className="btn secondary sm" onClick={() => setShowReportModal(true)}>
                <UiIcon name="warning" size={14} /> Báo lỗi từ
              </button>
              <button
                type="button"
                className={`btn sm ${isFav ? 'danger' : 'secondary'}`}
                onClick={toggleFav}
              >
                {isFav ? '♥ Đã lưu' : '♡ Lưu từ'}
              </button>
            </>
          )}
        </div>
      </div>

      {err && !word && (
        <div className="card center" style={{ flex: 1, gap: 10 }}>
          <ViMascotImage pose="surprised" size={82} alt="Vi ngạc nhiên khi không tìm thấy từ" />
          <div className="error">{err}</div>
          <button type="button" className="btn sm" onClick={() => nav('/words')}>
            Về thư viện từ
          </button>
        </div>
      )}

      {actionErr && <div className="error">{actionErr}</div>}

      {word && (
        <div className="cols2" style={{ flex: 1, minHeight: 0 }}>
          {/* Left: Primary Word Glass Card */}
          <section
            className="card"
            style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', overflowY: 'auto' }}
          >
            <div className="row between">
              <span className="tag">
                CEFR {word.level || 'A1'}
                {word.topic && TOPIC_MAP[word.topic]
                  ? ` · ${TOPIC_MAP[word.topic]}`
                  : word.category
                  ? ` · ${word.category.name}`
                  : ''}
              </span>
              <button type="button" className="btn secondary sm" onClick={playAudio}>
                <Icon n="vol" s={15} /> Nghe phát âm
              </button>
            </div>

            <div style={{ padding: '12px 0' }}>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(36px, 4.8vw, 56px)', fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1.05 }}>
                {word.word}
              </div>
              <div className="sub" style={{ marginTop: 6, fontSize: 14 }}>
                {word.pronunciation || ''}
                {word.partOfSpeech ? ` · ${formatPartOfSpeech(word.partOfSpeech)}` : ''}
              </div>
              <h2 style={{ fontSize: 22, marginTop: 10, color: 'var(--sage)' }}>
                {word.meaning || word.vietnameseMeaning}
              </h2>
              {word.definition && (
                <p className="tiny muted" style={{ marginTop: 4 }}>{word.definition}</p>
              )}
            </div>

            {word.example && (
              <div className="state-demo">
                <div className="overline">VÍ DỤ NGỮ CẢNH</div>
                <div style={{ fontWeight: 700, fontSize: 15, marginTop: 6 }}>
                  “{word.example}”
                </div>
              </div>
            )}

            {(() => {
              const rel = analyzeWordRelations(word.word, word.partOfSpeech);
              return rel.warningNote ? (
                <div className="state-demo" style={{ borderColor: 'rgba(201, 134, 47, 0.35)', background: 'var(--amber-bg)' }}>
                  <div className="overline" style={{ color: 'var(--amber-dark)' }}>GHI CHÚ PHÂN BIỆT NGỮ PHÁP</div>
                  <div className="tiny" style={{ marginTop: 4 }}>{rel.warningNote}</div>
                </div>
              ) : null;
            })()}

            <div className="toolbar" style={{ marginTop: 8 }}>
              <button type="button" className="btn" onClick={startLearn}>
                <Icon n="bulb" s={16} /> Ôn từ này
              </button>
              <button type="button" className="btn secondary" onClick={() => nav('/chat')}>
                Hỏi Vi về từ này
              </button>
              <button type="button" className="btn secondary" onClick={explain} disabled={loadingEx}>
                <Icon n="spark" s={16} /> {loadingEx ? 'Vi đang phân tích...' : 'AI giải thích thêm'}
              </button>
            </div>
          </section>

          {/* Right: AI Explain Coach Card + Metadata */}
          <div className="colstack" style={{ minHeight: 0 }}>
            <section className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0 }}>
              <div className="row between" style={{ flex: 'none' }}>
                <div className="row">
                  <ViMascotImage
                    pose={loadingEx ? 'thinking' : 'explain'}
                    size={56}
                    alt={loadingEx ? 'Vi đang suy nghĩ giải thích từ' : 'Vi giải thích từ vựng'}
                  />
                  <div>
                    <div className="overline">AI GIẢI THÍCH</div>
                    <strong style={{ fontSize: 15 }}>Phân tích ngữ cảnh &amp; Collocations</strong>
                  </div>
                </div>
                <QuotaBadge featureKey="explain" labelSuffix="lượt hôm nay" showOnlyWhenLow={true} />
              </div>

              <div className="long-list" style={{ flex: 1, minHeight: 0, paddingRight: 4 }}>
                {ex ? (
                  <AiExplanationBox explanation={ex.meaning} />
                ) : (
                  <div className="state-demo" style={{ display: 'grid', gap: 8 }}>
                    <p style={{ margin: 0, fontSize: 13.5 }}>
                      Từ <strong>“{word.word}”</strong> thuộc cấp độ <strong>{word.level || 'chuẩn'}</strong>.
                      Nhấn <strong>“AI giải thích thêm”</strong> để Vi phân tích các cụm từ hay đi kèm, lỗi thường gặp và mẹo nhớ nhanh.
                    </p>
                    <div className="kv"><span>Loại từ</span><b>{formatPartOfSpeech(word.partOfSpeech || 'noun')}</b></div>
                    <div className="kv"><span>Cấp độ</span><b>CEFR {word.level || 'A1'}</b></div>
                    <div className="kv"><span>Trạng thái yêu thích</span><b>{isFav ? 'Đã lưu ♥' : 'Chưa lưu'}</b></div>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {showReportModal &&
        createPortal(
          <>
            <div className="scrim" onClick={() => !submittingReport && setShowReportModal(false)} />
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="row between" style={{ marginBottom: 14 }}>
                <h2 style={{ margin: 0 }}><UiIcon name="warning" size={14} /> Báo lỗi từ vựng: {word?.word}</h2>
                <button
                  type="button"
                  className="btn ghost sm"
                  onClick={() => setShowReportModal(false)}
                  disabled={submittingReport}
                >
                  ✕
                </button>
              </div>

              {reportErr && <div className="error" style={{ marginBottom: 12 }}>{reportErr}</div>}
              {reportSuccess && <div className="ok" style={{ marginBottom: 12 }}>{reportSuccess}</div>}

              <form onSubmit={handleSubmitReport} className="stack">
                <div className="field-wrap">
                  <label className="field-label">Loại lỗi phát hiện</label>
                  <select
                    className="field"
                    value={reportType}
                    onChange={(e) => setReportType(e.target.value as ContentReportType)}
                    disabled={submittingReport}
                  >
                    {(Object.keys(CONTENT_REPORT_TYPE_LABELS) as ContentReportType[]).map((t) => (
                      <option key={t} value={t}>
                        {CONTENT_REPORT_TYPE_LABELS[t]}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field-wrap">
                  <label className="field-label">
                    Mô tả chi tiết <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <textarea
                    className="field"
                    rows={4}
                    placeholder="Hãy giải thích rõ lỗi..."
                    value={reportDesc}
                    onChange={(e) => setReportDesc(e.target.value)}
                    disabled={submittingReport}
                    maxLength={500}
                    required
                  />
                  <div className="tiny muted" style={{ textAlign: 'right' }}>
                    {reportDesc.length} / 500 ký tự
                  </div>
                </div>

                <div className="row" style={{ justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() => setShowReportModal(false)}
                    disabled={submittingReport}
                  >
                    Hủy
                  </button>
                  <button type="submit" className="btn" disabled={submittingReport}>
                    {submittingReport ? 'Đang gửi...' : 'Gửi báo cáo lỗi'}
                  </button>
                </div>
              </form>
            </div>
          </>,
          document.body
        )}
    </div>
  );
}
