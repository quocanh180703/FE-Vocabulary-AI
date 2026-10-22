import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { wordApi, errMsg, getPartOfSpeechBadgeStyle, ttsApi } from '../api';
import type { Word } from '../api';
import { Icon } from '../components/icons';
import { AutocompleteSearch } from '../components/AutocompleteSearch';

const LEVELS = ['Tất cả', 'A1', 'A2', 'B1', 'B2', 'C1'];

export default function Words() {
  const [words, setWords] = useState<Word[]>([]);
  const [level, setLevel] = useState('Tất cả');
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(false);
  const [fav, setFav] = useState<Set<number | string>>(new Set());
  const [err, setErr] = useState('');
  const nav = useNavigate();

  const load = () => {
    setLoading(true);
    setErr('');
    wordApi.list({
      page,
      size: 20,
      level: level === 'Tất cả' ? undefined : level,
      search: q || undefined,
    })
      .then(({ data }) => {
        setWords(data.content);
        setTotalPages(data.totalPages ?? 1);
        setTotalElements(data.totalElements ?? data.content.length);
      })
      .catch((e) => setErr(errMsg(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [level, page, q]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    wordApi.favorites(0, 100)
      .then(({ data }) => {
        const ids = new Set<number | string>(data.content.map((w) => w.id));
        (data.localIds || []).forEach((id) => ids.add(id));
        setFav(ids);
      })
      .catch(() => { });
  }, []);

  const toggleFav = async (id: number | string, wordObj?: Word) => {
    const isFav = fav.has(id) || fav.has(String(id));
    try {
      if (isFav) {
        await wordApi.unfavorite(id);
      } else {
        await wordApi.favorite(id, wordObj);
      }
      setFav((s) => {
        const n = new Set(s);
        if (isFav) {
          n.delete(id);
          n.delete(String(id));
        } else {
          n.add(id);
        }
        return n;
      });
    } catch (e) {
      setErr(errMsg(e));
    }
  };

  const handleSearch = (customQuery?: string) => {
    const query = typeof customQuery === 'string' ? customQuery : search;
    setPage(0);
    setQ(query.trim());
  };

  const playAudio = (w: Word, e: React.MouseEvent) => {
    e.stopPropagation();
    if (w.audioUrl) {
      new Audio(w.audioUrl).play().catch(() => {});
    } else {
      const text = w.word || w.lemma || '';
      if (!text) return;
      const audio = new Audio(ttsApi.getStreamUrl(text));
      audio.play().catch(() => {
        if (window.speechSynthesis) {
          const u = new SpeechSynthesisUtterance(text);
          u.lang = 'en-US';
          window.speechSynthesis.speak(u);
        }
      });
    }
  };

  return (
    <div className="content">
      <div className="pagehead" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '4px 12px', background: 'rgba(79, 70, 229, 0.08)', borderRadius: 99, color: 'var(--primary)', fontSize: 13, fontWeight: 800, marginBottom: 8 }}>
            <Icon n="spark" s={14} /> Kho từ vựng Oxford 3000/5000
          </div>
          <h1>Khám phá từ vựng tiếng Anh</h1>
          <div className="sub">
            {totalElements > 0 ? `Hơn ${totalElements} từ vựng chuẩn CEFR (A1 - C1) kèm phiên âm IPA, nghĩa tiếng Việt và ví dụ thực tế.` : 'Tìm kiếm từ mới theo trình độ và chủ đề.'}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="btn ghost" onClick={() => nav('/favorites')} style={{ minHeight: 42, padding: '0 16px', fontSize: 14 }}>
            <Icon n="heart" s={16} /> Từ yêu thích ({fav.size})
          </button>
          <button className="btn" onClick={() => nav('/review')} style={{ minHeight: 42, padding: '0 18px', fontSize: 14 }}>
            <Icon n="bulb" s={16} /> Ôn tập SRS
          </button>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <AutocompleteSearch
          value={search}
          onChange={setSearch}
          onSearch={(query) => handleSearch(query)}
          placeholder="Tìm từ vựng theo tiền tố hoặc từ tiếng Anh (ví dụ: apple, brilliant, difference)..."
          type="words"
          showButton={true}
          buttonText="Tìm kiếm"
          limit={8}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <div className="chips">
          {LEVELS.map((l) => (
            <button
              key={l}
              className={'chip' + (level === l ? ' on' : '')}
              onClick={() => {
                setLevel(l);
                setPage(0);
              }}
            >
              {l === 'Tất cả' ? '🌐 Tất cả cấp độ' : `Cấp độ ${l}`}
            </button>
          ))}
        </div>
        <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 700 }}>
          Đang hiển thị <b>{words.length}</b> / {totalElements} từ
        </span>
      </div>

      {err && <div className="error">{err}</div>}

      <div className="card" style={{ padding: 10 }}>
        {loading && words.length === 0 ? (
          <div className="loading" style={{ padding: 48 }}>
            <Icon n="spark" s={20} /> Đang tải danh sách từ vựng chuẩn CEFR...
          </div>
        ) : words.length === 0 ? (
          <div className="empty" style={{ padding: '48px 20px' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
            <b style={{ fontSize: 16, color: 'var(--ink)' }}>Không tìm thấy từ vựng phù hợp</b>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
              Hãy thử tìm kiếm với từ khóa khác hoặc chuyển sang cấp độ khác.
            </div>
          </div>
        ) : (
          words.map((w, idx) => (
            <div
              className="word"
              key={w.id}
              style={{
                borderBottom: idx === words.length - 1 ? 'none' : '1px solid var(--line)',
                cursor: 'pointer',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
              }}
              onClick={() => nav(`/words/${w.id}`)}
            >
              <div className="avatar">
                <Icon n="book" s={22} />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="w" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 16.5, fontWeight: 900, color: 'var(--ink)' }}>{w.word || w.lemma}</span>
                  {w.pronunciation && (
                    <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600 }}>
                      {w.pronunciation}
                    </span>
                  )}
                  <button
                    onClick={(e) => playAudio(w, e)}
                    title="Nghe phát âm chuẩn"
                    style={{
                      border: 'none',
                      background: 'rgba(79, 70, 229, 0.08)',
                      color: 'var(--primary)',
                      cursor: 'pointer',
                      borderRadius: '50%',
                      width: 28,
                      height: 28,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <Icon n="vol" s={14} />
                  </button>
                </div>

                <div className="m" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  {w.partOfSpeech && (() => {
                    const badge = getPartOfSpeechBadgeStyle(w.partOfSpeech);
                    return (
                      <span
                        className="pill"
                        style={{
                          fontSize: 11,
                          padding: '2px 8px',
                          background: badge.bg,
                          color: badge.color,
                          border: `1px solid ${badge.border}`,
                          fontWeight: 800,
                        }}
                      >
                        {badge.shortLabel}
                      </span>
                    );
                  })()}
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 14, color: 'var(--muted)', fontWeight: 600 }}>
                    {w.meaning || w.vietnameseMeaning}
                  </span>
                </div>
              </div>

              <span className="pill level" style={{ marginLeft: 8, fontWeight: 800, fontSize: 12 }}>
                {w.level || w.cefrLevel}
              </span>

              <button
                className={'heart' + (fav.has(w.id) || fav.has(String(w.id)) ? ' on' : '')}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFav(w.id, w);
                }}
                aria-label="yêu thích"
                title={fav.has(w.id) || fav.has(String(w.id)) ? 'Bỏ lưu yêu thích' : 'Lưu vào từ yêu thích'}
              >
                <Icon n="heart" s={22} />
              </button>
            </div>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 20,
            padding: '0 8px',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div className="sub" style={{ fontSize: 14 }}>
            Trang <b>{page + 1}</b> / <b>{totalPages}</b> (Tổng <b>{totalElements}</b> từ vựng)
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className="btn ghost"
              style={{ minHeight: 40, padding: '0 16px', fontSize: 13 }}
              disabled={page === 0}
              onClick={() => {
                setPage((p) => Math.max(0, p - 1));
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              ← Trang trước
            </button>
            <button
              className="btn ghost"
              style={{ minHeight: 40, padding: '0 16px', fontSize: 13 }}
              disabled={page + 1 >= totalPages}
              onClick={() => {
                setPage((p) => p + 1);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              Trang sau →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

