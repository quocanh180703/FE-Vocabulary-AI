import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { wordApi, errMsg, getPartOfSpeechBadgeStyle, ttsApi } from '../api';
import type { Word } from '../api';
import { Icon } from '../components/icons';
import { AutocompleteSearch } from '../components/AutocompleteSearch';
import { useUsage } from '../context/UsageContext';

const LEVELS = ['Tất cả', 'A1', 'A2', 'B1', 'B2', 'C1'];

export default function Words() {
  const { isVip, openUpgradeModal, isAtLeastHalfFreeUsage } = useUsage();
  const [words, setWords] = useState<Word[]>([]);
  const [level, setLevel] = useState('Tất cả');
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(false);
  const [fav, setFav] = useState<Set<string>>(new Set());
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
    const loadFavs = (e?: Event) => {
      const ce = e as CustomEvent;
      if (ce?.detail?.ids && Array.isArray(ce.detail.ids)) {
        setFav(new Set(ce.detail.ids.map(String)));
        return;
      }

      try {
        const raw = localStorage.getItem('vocab_user');
        if (raw) {
          const u = JSON.parse(raw);
          const uid = u?.id || u?.username;
          if (uid) {
            const cachedIds: string[] = JSON.parse(localStorage.getItem(`vocab_favs_${uid}`) || '[]');
            if (Array.isArray(cachedIds) && cachedIds.length > 0) {
              setFav(new Set(cachedIds.map(String)));
            }
          }
        }
      } catch {}

      wordApi.favorites(0, 100)
        .then(({ data }) => {
          const ids = new Set<string>([
            ...data.content.map((w) => String(w.id)),
            ...(data.localIds || []).map((id) => String(id)),
          ]);
          setFav(ids);
        })
        .catch(() => {});
    };

    loadFavs();
    window.addEventListener('vocab_favorites_changed', loadFavs);
    return () => {
      window.removeEventListener('vocab_favorites_changed', loadFavs);
    };
  }, []);

  const toggleFav = async (id: number | string, wordObj?: Word) => {
    const idStr = String(id);
    const isFav = fav.has(idStr);
    setFav((s) => {
      const n = new Set(s);
      if (isFav) {
        n.delete(idStr);
      } else {
        n.add(idStr);
      }
      return n;
    });

    try {
      if (isFav) {
        await wordApi.unfavorite(id);
      } else {
        await wordApi.favorite(id, wordObj);
      }
    } catch (e) {
      setErr(errMsg(e));
      setFav((s) => {
        const n = new Set(s);
        if (isFav) n.add(idStr);
        else n.delete(idStr);
        return n;
      });
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
    <div className="content" style={{ maxWidth: 1180 }}>
      {/* Page Header */}
      <div className="pagehead" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14 }}>
        <div>
          <h1>Khám phá từ vựng tiếng Anh</h1>
          <div className="sub">
            Kho từ Oxford 3000/5000 · {totalElements > 0 ? `Hơn ${totalElements} từ vựng chuẩn CEFR (A1 - C1)` : 'Sắp xếp theo cấp độ CEFR'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn ghost" onClick={() => nav('/favorites')} style={{ minHeight: 46, padding: '0 20px', fontSize: 14 }}>
            <svg viewBox="0 0 24 24" className="ic" style={{ color: 'var(--red)' }}><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
            Từ yêu thích ({fav.size})
          </button>
          <button className="btn" onClick={() => nav('/review')} style={{ minHeight: 46, padding: '0 22px', fontSize: 14 }}>
            Ôn tập ngay
          </button>
        </div>
      </div>

      {/* Searchbar */}
      <div style={{ marginBottom: 14 }}>
        <AutocompleteSearch
          value={search}
          onChange={setSearch}
          onSearch={(query) => handleSearch(query)}
          placeholder="Tìm từ vựng… thử gõ “resilient”, “apple”, “business”..."
          type="words"
          showButton={true}
          buttonText="Tìm kiếm"
          limit={8}
        />
      </div>

      {/* Filter Chips matching words.html .chiprow and .fchip */}
      <div className="chiprow" style={{ marginBottom: 14 }}>
        {LEVELS.map((l) => {
          const isLocked = !isVip && isAtLeastHalfFreeUsage && (l === 'B1' || l === 'B2' || l === 'C1');
          return (
            <button
              key={l}
              className={'fchip' + (level === l ? ' on' : '')}
              onClick={() => {
                if (isLocked) {
                  openUpgradeModal({
                    feature: 'CEFR_B1_C1',
                    message: `Cấp độ ${l} thuộc kho từ vựng Oxford nâng cao (B1–C1) dành riêng cho tài khoản Premium. Hãy nâng cấp để mở khóa toàn bộ!`,
                  });
                  return;
                }
                setLevel(l);
                setPage(0);
              }}
              title={isLocked ? 'Cần tài khoản Premium' : undefined}
              style={isLocked ? { display: 'inline-flex', alignItems: 'center', gap: 4 } : undefined}
            >
              {l === 'Tất cả' ? 'Tất cả cấp độ' : l}
              {isLocked && <span style={{ fontSize: 11, opacity: 0.8 }}>🔒</span>}
            </button>
          );
        })}
        <span className="pill" style={{ marginLeft: 'auto', alignSelf: 'center' }}>
          {totalElements} từ
        </span>
      </div>

      {err && <div className="error">{err}</div>}

      {/* Word List Card */}
      <div className="card" style={{ padding: 12 }}>
        {loading && words.length === 0 ? (
          <div className="loading" style={{ padding: 48 }}>
            <Icon n="spark" s={20} /> Đang tải danh sách từ vựng chuẩn CEFR...
          </div>
        ) : words.length === 0 ? (
          <div className="empty" style={{ padding: '48px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
            <b style={{ fontSize: 16, color: 'var(--ink)' }}>Không tìm thấy từ vựng phù hợp</b>
            <div className="sub mt8">
              Hãy thử tìm kiếm với từ khóa khác hoặc chuyển sang cấp độ khác.
            </div>
          </div>
        ) : (
          words.map((w) => {
            const isSaved = fav.has(String(w.id));
            const badge = w.partOfSpeech ? getPartOfSpeechBadgeStyle(w.partOfSpeech) : null;
            return (
              <div
                className="wrow"
                key={w.id}
                onClick={() => nav(`/words/${w.id}`)}
                style={{ cursor: 'pointer' }}
              >
                <span className="wchk">
                  <svg viewBox="0 0 24 24" className="ic"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                </span>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="w">
                    {w.word || w.lemma}{' '}
                    {w.pronunciation && (
                      <span style={{ color: 'var(--muted)', fontSize: 13.5, fontWeight: 700 }}>
                        {w.pronunciation}
                      </span>
                    )}
                    <button
                      onClick={(e) => playAudio(w, e)}
                      title="Nghe phát âm chuẩn"
                      className="speakbtn"
                      style={{ width: 30, height: 30, marginLeft: 8, display: 'inline-flex' }}
                    >
                      <svg viewBox="0 0 24 24" className="ic" style={{ width: 16, height: 16 }}><path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.4 5.6a9 9 0 0 1 0 12.8"/></svg>
                    </button>
                  </div>

                  <div className="m">
                    {badge && (
                      <span
                        className="pill"
                        style={{
                          fontSize: 11,
                          padding: '1px 7px',
                          background: badge.bg,
                          color: badge.color,
                          border: `1px solid ${badge.border}`,
                          fontWeight: 800,
                          marginRight: 6,
                        }}
                      >
                        {badge.shortLabel}
                      </span>
                    )}
                    <span>{w.meaning || w.vietnameseMeaning}</span>
                  </div>
                </div>

                {(() => {
                  const wLevel = (w.level || w.cefrLevel || 'A1').toUpperCase();
                  const isLockedLevel = !isVip && ['B1', 'B2', 'C1'].includes(wLevel) && !isSaved;
                  return (
                    <span
                      className="pill level"
                      style={isLockedLevel ? { opacity: 0.9, borderColor: '#f59e0b', color: '#b45309' } : undefined}
                      title={isLockedLevel ? 'Cần tài khoản Premium hoặc đã lưu trong tiến độ để xem chi tiết' : undefined}
                    >
                      {isLockedLevel && <span style={{ marginRight: 3, fontSize: 10 }}>🔒</span>}
                      {wLevel}
                    </span>
                  );
                })()}

                <button
                  className={'heartbtn' + (isSaved ? ' on' : '')}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFav(w.id, w);
                  }}
                  title={isSaved ? 'Bỏ lưu yêu thích' : 'Lưu vào từ yêu thích'}
                >
                  <svg viewBox="0 0 24 24" className="ic"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination matching words.html */}
      {totalPages > 1 && (
        <div
          className="row"
          style={{
            marginTop: 18,
            padding: '0 4px',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <span className="sub">
            Trang <b>{page + 1}</b> / <b>{totalPages}</b> (Đang hiển thị {words.length} / {totalElements} từ)
          </span>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className="btn ghost"
              style={{ minHeight: 44, padding: '0 18px', fontSize: 13.5 }}
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
              style={{ minHeight: 44, padding: '0 18px', fontSize: 13.5 }}
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

