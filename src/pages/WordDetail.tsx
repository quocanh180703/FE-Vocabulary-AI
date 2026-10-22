import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { wordApi, aiApi, learnApi, errMsg, formatPartOfSpeech, analyzeWordRelations, ttsApi } from '../api';
import type { Word, Explain } from '../api';
import { Icon } from '../components/icons';
import { AiExplanationBox } from '../components/AiExplanationBox';

export default function WordDetail() {
  const { id } = useParams();
  const nav = useNavigate();
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
    try {
      const local: string[] = JSON.parse(localStorage.getItem('vocab_favs') || '[]');
      setIsFav(local.includes(String(id)));
    } catch {}
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
    <div className="content narrow">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 12 }}>
        <button
          onClick={() => nav(-1)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'none',
            border: 'none',
            color: 'var(--primary)',
            fontSize: 14.5,
            fontWeight: 800,
            cursor: 'pointer',
            padding: '6px 12px',
            borderRadius: 8,
            transition: 'background 0.15s ease',
          }}
        >
          ← Quay lại danh sách
        </button>

        {word && (
          <button
            onClick={toggleFav}
            className={'heart' + (isFav ? ' on' : '')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: isFav ? '#FEE2E2' : '#FFFFFF',
              color: isFav ? '#DC2626' : 'var(--muted)',
              border: `1.5px solid ${isFav ? '#FCA5A5' : 'var(--line)'}`,
              borderRadius: 99,
              padding: '7px 16px',
              fontSize: 13.5,
              fontWeight: 800,
              cursor: 'pointer',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              boxShadow: isFav ? '0 2px 8px rgba(239, 68, 68, 0.15)' : 'var(--shadow-sm)',
            }}
            title={isFav ? 'Bỏ lưu yêu thích' : 'Lưu vào từ yêu thích'}
          >
            <Icon n="heart" s={18} />
            <span>{isFav ? 'Đã lưu yêu thích' : 'Lưu yêu thích'}</span>
          </button>
        )}
      </div>

      {err && !word && <div className="error">{err}</div>}
      {actionErr && <div className="error">{actionErr}</div>}

      {word && (
        <>
          <div
            className="card center"
            style={{
              padding: '40px 32px',
              borderRadius: 20,
              background: 'linear-gradient(180deg, #FFFFFF 0%, #FAFAFC 100%)',
              border: '1px solid var(--line)',
              boxShadow: '0 8px 24px rgba(15, 23, 42, 0.05)',
            }}
          >
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
              <span className="pill level" style={{ fontSize: 13, padding: '4px 12px' }}>
                Cấp độ {word.level}
              </span>
              {word.partOfSpeech && (
                <span className="pill" style={{ background: '#EEF2FF', color: 'var(--primary)', border: '1px solid #C7D2FE', fontSize: 13, padding: '4px 12px' }}>
                  {formatPartOfSpeech(word.partOfSpeech)} ({word.partOfSpeech.toLowerCase()})
                </span>
              )}
              {word.category && (
                <span className="pill" style={{ background: '#F1F5F9', color: 'var(--ink)', fontSize: 13, padding: '4px 12px' }}>
                  📁 {word.category.name}
                </span>
              )}
            </div>

            <div style={{ fontSize: 48, fontWeight: 900, margin: '18px 0 4px', letterSpacing: '-0.5px', color: 'var(--ink)' }}>
              {word.word}
            </div>

            {word.pronunciation && (
              <div className="sub" style={{ fontSize: 18, color: 'var(--muted)', fontWeight: 600 }}>
                {word.pronunciation}
              </div>
            )}

            <button
              className="btn ghost"
              style={{
                width: 54,
                height: 54,
                minHeight: 54,
                padding: 0,
                margin: '18px auto 0',
                borderRadius: '50%',
                background: 'rgba(79, 70, 229, 0.08)',
                color: 'var(--primary)',
                border: '1.5px solid #C7D2FE',
                boxShadow: '0 4px 14px rgba(79, 70, 229, 0.12)',
              }}
              onClick={playAudio}
              aria-label="nghe phát âm"
              title="Bấm để nghe phát âm chuẩn"
            >
              <Icon n="vol" s={24} />
            </button>

            {/* Vietnamese Meaning Box */}
            <div
              style={{
                marginTop: 24,
                background: 'linear-gradient(135deg, #ECFDF5 0%, #F0FDF4 100%)',
                border: '1.5px solid #A7F3D0',
                padding: '16px 24px',
                borderRadius: 14,
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.08)',
                maxWidth: 540,
                width: '100%',
                margin: '24px auto 0',
              }}
            >
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 800, color: '#047857', background: '#D1FAE5', padding: '3px 10px', borderRadius: 99, border: '1px solid #A7F3D0' }}>
                🇻🇳 NGHĨA TIẾNG VIỆT
              </div>
              <div style={{ fontSize: 26, fontWeight: 900, marginTop: 8, color: '#065F46', lineHeight: 1.35 }}>
                {word.meaning || word.vietnameseMeaning}
              </div>
            </div>

            {(() => {
              const rel = analyzeWordRelations(word.word, word.partOfSpeech);
              return (
                <>
                  {rel.warningNote && (
                    <div style={{ marginTop: 16, width: '100%', maxWidth: 540, margin: '16px auto 0', background: '#FFFBEB', border: '1.5px solid #FCD34D', borderRadius: 14, padding: '14px 18px', textAlign: 'left', fontSize: 13, color: '#92400E', boxShadow: '0 2px 10px rgba(245, 158, 11, 0.08)' }}>
                      <div style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <span>🔍</span>
                        <span>Phân biệt Trạng từ & Từ gốc (Tránh nhầm lẫn):</span>
                      </div>
                      <div style={{ lineHeight: 1.5 }}>{rel.warningNote}</div>
                      {rel.exampleNote && (
                        <div style={{ marginTop: 6, fontStyle: 'italic', color: '#B45309', fontSize: 12.5 }}>
                          👉 {rel.exampleNote}
                        </div>
                      )}
                    </div>
                  )}

                  {!rel.warningNote && rel.isAdverb && rel.rootWord && (
                    <div style={{ marginTop: 14, display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12.5, background: '#F5F3FF', border: '1px solid #DDD6FE', color: '#6D28D9', padding: '6px 14px', borderRadius: 99 }}>
                      <span>💡 Tính từ gốc tương ứng:</span>
                      <b style={{ textDecoration: 'underline' }}>{rel.rootWord}</b>
                    </div>
                  )}

                  {!rel.warningNote && rel.isAdjective && rel.correspondingAdverb && (
                    <div style={{ marginTop: 14, display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12.5, background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1D4ED8', padding: '6px 14px', borderRadius: 99 }}>
                      <span>⚡ Trạng từ tương ứng:</span>
                      <b style={{ textDecoration: 'underline' }}>{rel.correspondingAdverb}</b>
                    </div>
                  )}
                </>
              );
            })()}

            {word.definition && word.definition !== word.meaning && (
              <div
                style={{
                  fontSize: 14.5,
                  maxWidth: 540,
                  margin: '16px auto 0',
                  color: 'var(--muted)',
                  lineHeight: 1.6,
                  background: '#F8FAFC',
                  padding: '10px 16px',
                  borderRadius: 10,
                  border: '1px solid var(--line)',
                  textAlign: 'left',
                }}
              >
                <b style={{ color: 'var(--ink)' }}>English Definition: </b>
                {word.definition}
              </div>
            )}

            {word.example && (
              <div
                style={{
                  fontSize: 14.5,
                  fontStyle: 'italic',
                  color: 'var(--ink)',
                  background: 'rgba(79, 70, 229, 0.04)',
                  padding: '12px 18px',
                  borderRadius: 10,
                  maxWidth: 540,
                  margin: '14px auto 0',
                  borderLeft: '3px solid var(--primary)',
                  textAlign: 'left',
                  lineHeight: 1.5,
                }}
              >
                "{word.example}"
              </div>
            )}
          </div>

          <div className="btn-row" style={{ marginTop: 16 }}>
            <button className="btn" onClick={explain} disabled={loadingEx} style={{ flex: 1 }}>
              <Icon n="spark" s={20} />{loadingEx ? 'Vi đang phân tích chuyên sâu...' : 'AI giải thích chi tiết'}
            </button>
            <button className="btn green" onClick={startLearn} style={{ flex: 1 }}>
              <Icon n="bulb" s={20} /> Học từ này (Thêm vào SRS)
            </button>
          </div>

          {ex && (
            <div style={{ marginTop: 20 }}>
              <AiExplanationBox explanation={ex.meaning} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

