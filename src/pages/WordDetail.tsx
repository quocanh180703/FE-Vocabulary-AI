import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { wordApi, aiApi, learnApi, errMsg, formatPartOfSpeech, analyzeWordRelations, ttsApi } from '../api';
import type { Word, Explain } from '../api';
import { Icon } from '../components/icons';
import { AiExplanationBox } from '../components/AiExplanationBox';
import { useUsage } from '../context/UsageContext';
import { QuotaBadge } from '../components/QuotaBadge';
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
    <div className="content" style={{ maxWidth: 1180 }}>
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

        {word && (
          <button
            onClick={toggleFav}
            className={'heartbtn' + (isFav ? ' on' : '')}
            style={{ width: 44, height: 44, borderRadius: '50%' }}
            title={isFav ? 'Bỏ lưu yêu thích' : 'Lưu vào từ yêu thích'}
          >
            <svg viewBox="0 0 24 24" className="ic"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
          </button>
        )}
      </div>

      {err && !word && <div className="error">{err}</div>}
      {actionErr && <div className="error">{actionErr}</div>}

      {word && (
        <>
          {/* Word Hero Card matching word.html */}
          <div className="wordhero" style={{ position: 'relative' }}>
            <span className="pill level" style={{ position: 'absolute', top: 22, right: 26 }}>
              {word.level || 'A1'}{word.category ? ` · ${word.category.name}` : ''}
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
          </div>

          {/* 2 Columns */}
          <div className="cols2" style={{ marginTop: 24 }}>
            {/* Left Column Stack */}
            <div className="colstack">
              <div className="card">
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
              </div>

              {/* Coach Vi Card */}
              <div className="card">
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
              </div>

              {ex && (
                <div style={{ marginTop: 12 }}>
                  <AiExplanationBox explanation={ex.meaning} />
                </div>
              )}
            </div>

            {/* Right Column Stack */}
            <div className="colstack">
              <div className="card">
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
              </div>

              <div className="card">
                <h2><span className="dot a"></span>Trạng thái học của bạn</h2>
                <div className="mt8">
                  <div className="kv"><span>Trạng thái</span>Đang ôn theo SRS</div>
                  <div className="kv"><span>Cấp độ</span>CEFR {word.level || 'A1'}</div>
                  <div className="kv"><span>Lần ôn tiếp theo</span>Hôm nay</div>
                  <div className="kv"><span>Yêu thích</span>{isFav ? 'Đã lưu ♥' : 'Chưa lưu'}</div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

