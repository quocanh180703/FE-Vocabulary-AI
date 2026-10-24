import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { wordApi, errMsg, getPartOfSpeechBadgeStyle } from '../api';
import type { Word } from '../api';
import { Icon } from '../components/icons';
import { AutocompleteSearch } from '../components/AutocompleteSearch';

const CEFR_LEVELS = ['ALL', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;


export default function Favorites() {
  const [words, setWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [search, setSearch] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string>('ALL');
  const [playingId, setPlayingId] = useState<string | number | null>(null);
  const nav = useNavigate();

  const load = async () => {
    setLoading(true);
    setErr('');
    try {
      const { data } = await wordApi.favorites(0, 100);
      let list = data.content || [];

      // Nếu có localIds mà danh sách chưa có đủ từ (ví dụ CEFR words lưu ở client)
      if (data.localIds && data.localIds.length > 0) {
        const existingIds = new Set(list.map((w) => String(w.id)));
        const missingIds = data.localIds.filter((id: string) => !existingIds.has(String(id)));
        if (missingIds.length > 0) {
          const fetchedMissing = await Promise.all(
            missingIds.slice(0, 30).map((id: string) => wordApi.get(id).then((r) => r.data).catch(() => null))
          );
          const validMissing = fetchedMissing.filter((w): w is Word => w !== null);
          list = [...list, ...validMissing];
        }
      }

      setWords(list);
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const handleFavChange = () => {
      load();
    };
    window.addEventListener('vocab_favorites_changed', handleFavChange);
    return () => window.removeEventListener('vocab_favorites_changed', handleFavChange);
  }, []);

  const remove = async (id: number | string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await wordApi.unfavorite(id);
      setWords((w) => w.filter((x) => String(x.id) !== String(id)));
    } catch (e) {
      setErr(errMsg(e));
    }
  };

  const playAudio = (w: Word, e: React.MouseEvent) => {
    e.stopPropagation();
    const textToSpeak = w.word || w.lemma || '';
    if (!textToSpeak) return;

    setPlayingId(w.id);
    if (w.audioUrl) {
      const audio = new Audio(w.audioUrl);
      audio.onended = () => setPlayingId(null);
      audio.onerror = () => setPlayingId(null);
      audio.play().catch(() => setPlayingId(null));
    } else if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(textToSpeak);
      u.lang = 'en-US';
      u.rate = 0.95;
      u.onend = () => setPlayingId(null);
      u.onerror = () => setPlayingId(null);
      window.speechSynthesis.speak(u);
    } else {
      setPlayingId(null);
    }
  };

  // Tính số lượng từ theo từng CEFR Level
  const levelCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: words.length };
    words.forEach((w) => {
      const lvl = (w.level || w.cefrLevel || '').toUpperCase();
      if (lvl) counts[lvl] = (counts[lvl] || 0) + 1;
    });
    return counts;
  }, [words]);

  // Lọc từ vựng theo Level và Search query
  const filteredWords = useMemo(() => {
    return words.filter((w) => {
      const wLevel = (w.level || w.cefrLevel || '').toUpperCase();
      if (selectedLevel !== 'ALL' && wLevel !== selectedLevel) {
        return false;
      }
      if (!search.trim()) return true;

      const q = search.trim().toLowerCase();
      const wordText = (w.word || w.lemma || '').toLowerCase();
      const meaningText = (w.vietnameseMeaning || w.meaning || '').toLowerCase();
      const defText = (w.definition || '').toLowerCase();
      const pronText = (w.pronunciation || '').toLowerCase();

      return (
        wordText.includes(q) ||
        meaningText.includes(q) ||
        defText.includes(q) ||
        pronText.includes(q)
      );
    });
  }, [words, selectedLevel, search]);

  return (
    <div className="content" style={{ maxWidth: 1180 }}>
      {/* Page Header matching favorites.html */}
      <div className="pagehead" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14 }}>
        <div>
          <h1>Từ yêu thích của bạn</h1>
          <div className="sub">
            {words.length} từ đã lưu · bấm vào từ để xem chi tiết và giải thích AI
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {words.length > 0 && (
            <button
              className="btn"
              onClick={() => nav('/review?mode=FAVORITES')}
              style={{ minHeight: 46, padding: '0 22px', fontSize: 14 }}
            >
              <svg viewBox="0 0 24 24" className="ic"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.4 1 2.3h6c0-.9.4-1.8 1-2.3A7 7 0 0 0 12 2z"/></svg>
              Ôn bằng flashcard
            </button>
          )}
          <button
            className="btn ghost"
            onClick={() => nav('/words')}
            style={{ minHeight: 46, padding: '0 20px', fontSize: 14 }}
          >
            + Tìm thêm từ
          </button>
        </div>
      </div>

      {err && <div className="error">{err}</div>}

      {/* Filter and Search Bar */}
      <div style={{ marginBottom: 14 }}>
        <AutocompleteSearch
          value={search}
          onChange={setSearch}
          onSearch={(query) => setSearch(query)}
          placeholder="Tìm từ vựng yêu thích theo từ hoặc nghĩa..."
          type="favorites"
          favoriteWords={words}
          limit={8}
        />
      </div>

      {/* Level Filter Chips */}
      <div className="chiprow" style={{ marginBottom: 14 }}>
        {CEFR_LEVELS.map((lvl) => {
          const count = levelCounts[lvl] || 0;
          const isSelected = selectedLevel === lvl;
          const label = lvl === 'ALL' ? 'Tất cả cấp độ' : lvl;
          if (lvl !== 'ALL' && count === 0) return null;

          return (
            <button
              key={lvl}
              onClick={() => setSelectedLevel(lvl)}
              className={'fchip' + (isSelected ? ' on' : '')}
            >
              {label} ({count})
            </button>
          );
        })}
      </div>

      {/* Word List Card matching favorites.html */}
      <div className="card" style={{ padding: 12 }}>
        {loading ? (
          <div className="loading" style={{ padding: 48 }}>
            <Icon n="spark" s={20} /> Đang tải danh sách từ yêu thích của bạn...
          </div>
        ) : words.length === 0 ? (
          <div className="empty" style={{ padding: '48px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>❤️</div>
            <b style={{ fontSize: 16, color: 'var(--ink)' }}>Chưa có từ yêu thích nào</b>
            <div className="sub mt8" style={{ maxWidth: 420, margin: '8px auto 0' }}>
              Khi học từ vựng, hãy bấm biểu tượng trái tim để lưu lại từ cần rèn luyện nhé.
            </div>
            <button
              className="btn mt16"
              onClick={() => nav('/words')}
              style={{ minHeight: 44, padding: '0 24px' }}
            >
              Khám phá từ vựng ngay
            </button>
          </div>
        ) : filteredWords.length === 0 ? (
          <div className="empty" style={{ padding: '36px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
            <b style={{ fontSize: 16, color: 'var(--ink)' }}>Không tìm thấy từ yêu thích phù hợp</b>
            <div className="sub mt8">
              Không có từ nào khớp với từ khóa "{search}" ở cấp độ {selectedLevel === 'ALL' ? 'Tất cả' : selectedLevel}.
            </div>
            <button
              className="btn ghost mt16"
              onClick={() => {
                setSearch('');
                setSelectedLevel('ALL');
              }}
            >
              Xóa bộ lọc tìm kiếm
            </button>
          </div>
        ) : (
          filteredWords.map((w) => {
            const wordText = w.word || w.lemma || '';
            const meaningText = w.vietnameseMeaning || w.meaning || '';
            const posBadge = w.partOfSpeech ? getPartOfSpeechBadgeStyle(w.partOfSpeech) : null;

            return (
              <div
                key={w.id}
                className="wrow"
                onClick={() => nav(`/words/${w.id}`)}
                style={{ cursor: 'pointer' }}
              >
                <span className="wchk">
                  <svg viewBox="0 0 24 24" className="ic"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                </span>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="w">
                    {wordText}{' '}
                    {w.pronunciation && (
                      <span style={{ color: 'var(--muted)', fontSize: 13.5, fontWeight: 700 }}>
                        {w.pronunciation}
                      </span>
                    )}
                    <button
                      onClick={(e) => playAudio(w, e)}
                      title="Nghe phát âm chuẩn"
                      className={'speakbtn' + (playingId === w.id ? ' on' : '')}
                      style={{ width: 30, height: 30, marginLeft: 8, display: 'inline-flex' }}
                    >
                      <svg viewBox="0 0 24 24" className="ic" style={{ width: 16, height: 16 }}><path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.4 5.6a9 9 0 0 1 0 12.8"/></svg>
                    </button>
                  </div>

                  <div className="m">
                    {posBadge && (
                      <span
                        className="pill"
                        style={{
                          fontSize: 11,
                          padding: '1px 7px',
                          background: posBadge.bg,
                          color: posBadge.color,
                          border: `1px solid ${posBadge.border}`,
                          fontWeight: 800,
                          marginRight: 6,
                        }}
                      >
                        {posBadge.shortLabel}
                      </span>
                    )}
                    <span>{meaningText}</span>
                  </div>
                </div>

                <span className="pill level">
                  {w.level || w.cefrLevel || 'A1'}
                </span>

                <button
                  className="heartbtn on"
                  onClick={(e) => remove(w.id, e)}
                  title="Bỏ lưu khỏi danh sách yêu thích"
                >
                  <svg viewBox="0 0 24 24" className="ic"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
                </button>
              </div>
            );
          })
        )}
      </div>

      <div className="sub mt16" style={{ textAlign: 'center' }}>
        Bấm biểu tượng trái tim đỏ để bỏ lưu từ khỏi danh sách yêu thích.
      </div>
    </div>
  );
}
