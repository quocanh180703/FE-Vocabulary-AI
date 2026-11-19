import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { wordApi, errMsg, getPartOfSpeechBadgeStyle } from '../api';
import type { Word } from '../api';
import { Icon } from '../components/icons';
import { AutocompleteSearch } from '../components/AutocompleteSearch';
import { AnimatedCounter, staggerContainer, staggerItem } from '../motion';
import { ViMascotImage } from '../components/ViMascotImage';
import { ViLoadingScreen } from '../components/states/ViLoadingScreen';
import { SplitHeading } from '../components/SageEffects';

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
    const handleFavChange = () => load();
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

  const levelCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: words.length };
    words.forEach((w) => {
      const lvl = (w.level || w.cefrLevel || '').toUpperCase();
      if (lvl) counts[lvl] = (counts[lvl] || 0) + 1;
    });
    return counts;
  }, [words]);

  const filteredWords = useMemo(() => {
    return words.filter((w) => {
      const wLevel = (w.level || w.cefrLevel || '').toUpperCase();
      if (selectedLevel !== 'ALL' && wLevel !== selectedLevel) return false;
      if (!search.trim()) return true;

      const q = search.trim().toLowerCase();
      const wordText = (w.word || w.lemma || '').toLowerCase();
      const meaningText = (w.vietnameseMeaning || w.meaning || '').toLowerCase();
      const defText = (w.definition || '').toLowerCase();
      const pronText = (w.pronunciation || '').toLowerCase();

      return wordText.includes(q) || meaningText.includes(q) || defText.includes(q) || pronText.includes(q);
    });
  }, [words, selectedLevel, search]);

  return (
    <div className="content">
      <div className="pagehead">
        <div>
          <div className="eyebrow">SAVED WORDS</div>
          <SplitHeading text="Từ đã lưu" />
          <p className="sub">
            <AnimatedCounter value={words.length} /> từ bạn muốn quay lại luyện tập và xem giải thích AI.
          </p>
        </div>

        <div className="row">
          {words.length > 0 && (
            <button type="button" className="btn sm" onClick={() => nav('/review?mode=FAVORITES')}>
              <Icon n="bulb" s={15} /> Ôn bằng flashcard
            </button>
          )}
          <button type="button" className="btn secondary sm" onClick={() => nav('/words')}>
            + Tìm thêm từ
          </button>
        </div>
      </div>

      {err && <div className="error">{err}</div>}

      <section className="card" style={{ flex: 'none', padding: '12px 14px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: '1 1 260px', minWidth: 200 }}>
          <AutocompleteSearch
            value={search}
            onChange={setSearch}
            onSearch={(query) => setSearch(query)}
            placeholder="Tìm từ vựng đã lưu theo từ hoặc nghĩa..."
            type="favorites"
            favoriteWords={words}
            limit={8}
          />
        </div>

        <div className="chiprow">
          {CEFR_LEVELS.map((lvl) => {
            const count = levelCounts[lvl] || 0;
            if (lvl !== 'ALL' && count === 0) return null;
            return (
              <button
                key={lvl}
                type="button"
                onClick={() => setSelectedLevel(lvl)}
                className={'fchip' + (selectedLevel === lvl ? ' on' : '')}
              >
                {lvl === 'ALL' ? 'Tất cả' : lvl} (<AnimatedCounter value={count} />)
              </button>
            );
          })}
        </div>
      </section>

      <div id="saved-results" className="long-list" style={{ flex: 1, minHeight: 0, paddingRight: 4 }}>
        {loading ? (
          <ViLoadingScreen subtitle="Đang tải danh sách từ đã lưu" />
        ) : words.length === 0 ? (
          <div className="card center" style={{ minHeight: 240, gap: 10 }}>
            <ViMascotImage pose="happy-wave" size={82} alt="Vi chào bạn — lưu từ yêu thích đầu tiên" />
            <strong>Chưa có từ đã lưu</strong>
            <div className="sub">Nhấn biểu tượng ♡ ở trang Từ vựng để thêm từ vào danh sách.</div>
            <button type="button" className="btn sm" onClick={() => nav('/words')}>
              Khám phá từ
            </button>
          </div>
        ) : filteredWords.length === 0 ? (
          <div className="card center" style={{ minHeight: 220, gap: 10 }}>
            <ViMascotImage pose="happy-wave" size={76} alt="Không có từ phù hợp bộ lọc" />
            <strong>Không tìm thấy từ yêu thích phù hợp</strong>
            <div className="sub">Không có từ khớp với &quot;{search}&quot; ở cấp độ {selectedLevel}.</div>
            <button
              type="button"
              className="btn secondary sm"
              onClick={() => {
                setSearch('');
                setSelectedLevel('ALL');
              }}
            >
              Xóa bộ lọc
            </button>
          </div>
        ) : (
          <motion.div className="grid g2" variants={staggerContainer} initial="hidden" animate="visible">
            {filteredWords.map((w) => {
              const wordText = w.word || w.lemma || '';
              const meaningText = w.vietnameseMeaning || w.meaning || '';
              const posBadge = w.partOfSpeech ? getPartOfSpeechBadgeStyle(w.partOfSpeech) : null;

              return (
                <motion.section
                  key={w.id}
                  variants={staggerItem}
                  className="card"
                  style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 10 }}
                  onClick={() => nav(`/words/${w.id}`)}
                >
                  <div className="row between">
                    <div className="row" style={{ gap: 6 }}>
                      <span className="tag">{w.level || w.cefrLevel || 'A1'}</span>
                      {posBadge && <span className="pill level">{posBadge.shortLabel}</span>}
                    </div>
                    <div className="row" style={{ gap: 6 }}>
                      <button
                        type="button"
                        className={'speakbtn' + (playingId === w.id ? ' on' : '')}
                        style={{ width: 30, height: 30 }}
                        onClick={(e) => playAudio(w, e)}
                        title="Nghe phát âm"
                      >
                        <Icon n="vol" s={15} />
                      </button>
                      <button
                        type="button"
                        className="heartbtn on"
                        style={{ width: 30, height: 30 }}
                        onClick={(e) => remove(w.id, e)}
                        title="Bỏ lưu"
                        aria-label="Bỏ lưu từ"
                      >
                        <Icon n="heart" s={14} />
                      </button>
                    </div>
                  </div>

                  <div>
                    <div style={{ fontFamily: 'var(--font-heading)', fontSize: 20, fontWeight: 700 }}>
                      {wordText}
                    </div>
                    {w.pronunciation && <div className="tiny muted">{w.pronunciation}</div>}
                    <strong style={{ display: 'block', marginTop: 4 }}>{meaningText}</strong>
                    {w.example && <p className="tiny muted" style={{ margin: '4px 0 0' }}>“{w.example}”</p>}
                  </div>

                  <div>
                    <span className="btn secondary sm">Xem chi tiết</span>
                  </div>
                </motion.section>
              );
            })}
          </motion.div>
        )}
      </div>
    </div>
  );
}
