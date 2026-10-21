import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { wordApi, errMsg, getPartOfSpeechBadgeStyle } from '../api';
import type { Word } from '../api';
import { Icon, Mascot } from '../components/icons';
import { AutocompleteSearch } from '../components/AutocompleteSearch';

const CEFR_LEVELS = ['ALL', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;

const getLevelBadgeStyle = (lvl?: string) => {
  const l = (lvl || '').toUpperCase();
  switch (l) {
    case 'A1':
      return { bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' };
    case 'A2':
      return { bg: '#f0fdfa', color: '#0f766e', border: '#99f6e4' };
    case 'B1':
      return { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' };
    case 'B2':
      return { bg: '#f5f3ff', color: '#6d28d9', border: '#ddd6fe' };
    case 'C1':
      return { bg: '#fffbeb', color: '#b45309', border: '#fde68a' };
    case 'C2':
      return { bg: '#fff1f2', color: '#be123c', border: '#fecdd3' };
    default:
      return { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' };
  }
};

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
    <div className="content" style={{ maxWidth: 1080 }}>
      {/* Top Header Card */}
      <div
        className="card"
        style={{
          padding: '24px 28px',
          background: 'linear-gradient(135deg, #ffffff 0%, #f0f7ff 100%)',
          border: '1.5px solid #d5dde8',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 20,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: '#fee2e2',
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(239, 68, 68, 0.15)',
            }}
          >
            <Icon n="heart" s={30} />
          </div>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 900, color: 'var(--ink, #0A2540)', margin: 0 }}>
              Từ vựng yêu thích
            </h1>
            <div className="sub" style={{ fontSize: 15, marginTop: 4 }}>
              Bạn đang lưu <b>{words.length}</b> từ vựng để tiện xem lại và rèn luyện mỗi ngày.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {words.length > 0 && (
            <button
              className="btn green"
              onClick={() => nav('/review?mode=FAVORITES')}
              style={{ minHeight: 48, padding: '0 20px', fontSize: 15, borderRadius: 8 }}
              title="Mở chế độ Flashcard ôn tập các từ yêu thích"
            >
              <Icon n="book" s={20} />
              <span>Ôn tập Flashcard</span>
            </button>
          )}
          <button
            className="btn ghost"
            onClick={() => nav('/words')}
            style={{ minHeight: 48, padding: '0 18px', fontSize: 15, borderRadius: 8 }}
          >
            <span>+ Khám phá thêm từ</span>
          </button>
        </div>
      </div>

      {err && <div className="error">{err}</div>}

      {/* Filter and Search Bar */}
      <div
        className="card"
        style={{
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          background: 'var(--card, #ffffff)',
        }}
      >
        {/* Search input with prefix autocomplete */}
        <AutocompleteSearch
          value={search}
          onChange={setSearch}
          onSearch={(query) => setSearch(query)}
          placeholder="Tìm từ vựng yêu thích theo tiền tố (ví dụ: app, apple, difference) hoặc nghĩa..."
          type="favorites"
          favoriteWords={words}
          limit={8}
          inputStyle={{ minHeight: 48, fontSize: 15 }}
        />

        {/* Level Filter Chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--muted, #64748b)', marginRight: 4 }}>
            Cấp độ:
          </span>
          {CEFR_LEVELS.map((lvl) => {
            const count = levelCounts[lvl] || 0;
            const isSelected = selectedLevel === lvl;
            const label = lvl === 'ALL' ? 'Tất cả' : lvl;

            // Chỉ hiển thị level nếu có từ hoặc là 'ALL'
            if (lvl !== 'ALL' && count === 0) return null;

            return (
              <button
                key={lvl}
                onClick={() => setSelectedLevel(lvl)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 14px',
                  borderRadius: 20,
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: 'pointer',
                  border: isSelected ? '1.5px solid var(--primary, #1565c0)' : '1px solid var(--line, #d5dde8)',
                  background: isSelected ? 'var(--tint, #edf4fc)' : '#ffffff',
                  color: isSelected ? 'var(--primary-dark, #0d47a1)' : 'var(--ink, #0a2540)',
                  transition: 'all 0.15s',
                }}
              >
                <span>{label}</span>
                <span
                  style={{
                    fontSize: 11,
                    padding: '1px 6px',
                    borderRadius: 10,
                    background: isSelected ? 'var(--primary, #1565c0)' : 'var(--bg, #f6f9fc)',
                    color: isSelected ? '#ffffff' : 'var(--muted, #64748b)',
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading ? (
          <div className="card loading" style={{ padding: 48, fontSize: 16 }}>
            <Mascot s={36} />
            <span>Đang tải danh sách từ yêu thích của bạn...</span>
          </div>
        ) : words.length === 0 ? (
          /* Empty State - No favorites saved */
          <div
            className="card"
            style={{
              padding: '60px 24px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 16,
              background: '#ffffff',
            }}
          >
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                background: '#fee2e2',
                color: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 6,
              }}
            >
              <Icon n="heart" s={42} />
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 900, color: 'var(--ink, #0A2540)' }}>
              Chưa có từ yêu thích nào
            </h2>
            <p style={{ maxWidth: 460, color: 'var(--muted, #64748b)', fontSize: 15, lineHeight: 1.6, margin: 0 }}>
              Khi duyệt từ vựng ở trang <b>Từ vựng</b> hoặc khi làm bài thi, hãy bấm biểu tượng trái tim{' '}
              <span style={{ color: '#ef4444' }}>❤️</span> để lưu lại các từ bạn muốn ghi nhớ nhé.
            </p>
            <button
              className="btn"
              onClick={() => nav('/words')}
              style={{ minHeight: 48, padding: '0 24px', fontSize: 15, marginTop: 10, borderRadius: 8 }}
            >
              <Icon n="book" s={20} />
              <span>Khám phá kho từ vựng ngay</span>
            </button>
          </div>
        ) : filteredWords.length === 0 ? (
          /* Empty State - Search filter has no match */
          <div
            className="card"
            style={{
              padding: '48px 20px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div style={{ fontSize: 32 }}>🔍</div>
            <h3 style={{ fontSize: 18, fontWeight: 800 }}>Không tìm thấy từ yêu thích phù hợp</h3>
            <p className="sub" style={{ fontSize: 14 }}>
              Không có từ nào khớp với từ khóa "{search}" ở cấp độ {selectedLevel === 'ALL' ? 'Tất cả' : selectedLevel}.
            </p>
            <button
              className="btn ghost"
              onClick={() => {
                setSearch('');
                setSelectedLevel('ALL');
              }}
              style={{ minHeight: 40, padding: '0 16px', fontSize: 14, borderRadius: 6 }}
            >
              Xóa bộ lọc tìm kiếm
            </button>
          </div>
        ) : (
          /* Words Grid / List */
          filteredWords.map((w) => {
            const wordText = w.word || w.lemma || '';
            const meaningText = w.vietnameseMeaning || w.meaning || '';
            const lvlStyle = getLevelBadgeStyle(w.level || w.cefrLevel);
            const posBadge = w.partOfSpeech ? getPartOfSpeechBadgeStyle(w.partOfSpeech) : null;
            const isPlaying = playingId === w.id;

            return (
              <div
                key={w.id}
                className="card"
                onClick={() => nav(`/words/${w.id}`)}
                style={{
                  padding: '18px 22px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 16,
                  cursor: 'pointer',
                  border: '1.5px solid var(--line, #d5dde8)',
                  borderRadius: 12,
                  transition: 'all 0.18s ease-in-out',
                  position: 'relative',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--primary, #1565c0)';
                  e.currentTarget.style.boxShadow = '0 6px 18px rgba(21, 101, 192, 0.08)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--line, #d5dde8)';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {/* Left: Speaker + Word info */}
                <div style={{ flex: 1, minWidth: 0, display: 'flex', gap: 16 }}>
                  {/* Speaker Button */}
                  <button
                    onClick={(e) => playAudio(w, e)}
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 10,
                      background: isPlaying ? 'var(--primary, #1565c0)' : 'var(--tint, #edf4fc)',
                      color: isPlaying ? '#ffffff' : 'var(--primary-dark, #0d47a1)',
                      border: '1px solid var(--line, #d5dde8)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      flexShrink: 0,
                      marginTop: 2,
                      transition: 'all 0.15s',
                    }}
                    title="Nghe phát âm chuẩn"
                  >
                    <Icon n="vol" s={22} />
                  </button>

                  {/* Word Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Head row: Word, Phonetic, Badges */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <span
                        style={{
                          fontSize: 22,
                          fontWeight: 900,
                          color: 'var(--ink, #0A2540)',
                          letterSpacing: '-0.3px',
                        }}
                      >
                        {wordText}
                      </span>

                      {w.pronunciation && (
                        <span
                          style={{
                            fontSize: 14,
                            fontWeight: 600,
                            color: 'var(--muted, #64748b)',
                            fontFamily: 'system-ui, sans-serif',
                          }}
                        >
                          {w.pronunciation}
                        </span>
                      )}

                      {/* Level Badge */}
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: 6,
                          background: lvlStyle.bg,
                          color: lvlStyle.color,
                          border: `1px solid ${lvlStyle.border}`,
                        }}
                      >
                        {w.level || w.cefrLevel || 'A1'}
                      </span>

                      {/* Part of Speech Badge */}
                      {posBadge && (
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 6,
                            background: posBadge.bg,
                            color: posBadge.color,
                            border: `1px solid ${posBadge.border}`,
                          }}
                        >
                          {posBadge.shortLabel}
                        </span>
                      )}
                    </div>

                    {/* Vietnamese Meaning Box */}
                    {meaningText && (
                      <div
                        style={{
                          marginTop: 10,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 8,
                          background: '#f0fdf4',
                          border: '1px solid #bbf7d0',
                          color: '#15803d',
                          padding: '6px 14px',
                          borderRadius: 8,
                          fontSize: 15,
                          fontWeight: 800,
                          lineHeight: 1.4,
                        }}
                      >
                        <span>👉</span>
                        <span>{meaningText}</span>
                      </div>
                    )}

                    {/* Example sentence or English Definition */}
                    {w.example && (
                      <div
                        style={{
                          marginTop: 8,
                          fontSize: 13.5,
                          color: 'var(--muted, #64748b)',
                          fontStyle: 'italic',
                          lineHeight: 1.5,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        "{w.example}"
                      </div>
                    )}

                    {!w.example && w.definition && w.definition !== meaningText && (
                      <div
                        style={{
                          marginTop: 8,
                          fontSize: 13,
                          color: 'var(--muted, #64748b)',
                          lineHeight: 1.45,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {w.definition}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Actions */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    flexShrink: 0,
                    marginLeft: 12,
                  }}
                >
                  <button
                    className="btn ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      nav(`/words/${w.id}`);
                    }}
                    style={{
                      minHeight: 38,
                      padding: '0 14px',
                      fontSize: 13.5,
                      fontWeight: 800,
                      borderRadius: 6,
                    }}
                    title="Xem chi tiết từ vựng và giải thích chuyên sâu AI"
                  >
                    <span>Chi tiết</span>
                    <span style={{ fontSize: 16, marginLeft: 2 }}>→</span>
                  </button>

                  <button
                    onClick={(e) => remove(w.id, e)}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 8,
                      background: '#fee2e2',
                      border: '1px solid #fca5a5',
                      color: '#dc2626',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                    title="Bỏ khỏi từ yêu thích"
                    aria-label="Bỏ khỏi từ yêu thích"
                  >
                    <Icon n="heart" s={22} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
