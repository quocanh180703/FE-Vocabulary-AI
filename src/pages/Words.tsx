import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { wordApi, errMsg, getPartOfSpeechBadgeStyle, ttsApi, TOPIC_MAP } from '../api';
import type { Word } from '../api';
import { Icon } from '../components/icons';
import { AutocompleteSearch } from '../components/AutocompleteSearch';
import { useUsage } from '../context/UsageContext';
import { MotionCard, staggerContainer, staggerItem, AnimatedCounter } from '../motion';

const LEVELS = ['Tất cả', 'A1', 'A2', 'B1', 'B2', 'C1'];

const TOPICS = [
  { code: 'ALL', label: 'Tất cả chủ đề' },
  { code: 'WORK', label: 'Công việc & Văn phòng' },
  { code: 'TRAVEL', label: 'Du lịch & Di chuyển' },
  { code: 'ACADEMIC', label: 'Học thuật & Giáo dục' },
  { code: 'TECHNOLOGY', label: 'Công nghệ' },
  { code: 'HEALTH', label: 'Sức khỏe' },
  { code: 'FOOD', label: 'Ăn uống' },
  { code: 'MONEY', label: 'Mua sắm & Tiền bạc' },
  { code: 'FAMILY', label: 'Gia đình & Bạn bè' },
  { code: 'SPORTS', label: 'Thể thao & Giải trí' },
  { code: 'ENVIRONMENT', label: 'Môi trường' },
  { code: 'SOCIETY', label: 'Xã hội & Pháp luật' },
  { code: 'ARTS', label: 'Nghệ thuật & Văn hóa' },
];

export default function Words() {
  const { isVip, openUpgradeModal, isAtLeastHalfFreeUsage } = useUsage();
  const [words, setWords] = useState<Word[]>([]);
  const [level, setLevel] = useState('Tất cả');
  const [topic, setTopic] = useState('ALL');
  const [topicCounts, setTopicCounts] = useState<Record<string, number>>({});
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(false);
  const [fav, setFav] = useState<Set<string>>(new Set());
  const [favCount, setFavCount] = useState<number>(0);
  const [err, setErr] = useState('');
  const nav = useNavigate();

  const load = () => {
    setLoading(true);
    setErr('');
    wordApi.list({
      page,
      size: 20,
      level: level === 'Tất cả' ? undefined : level,
      topic: topic === 'ALL' ? undefined : topic,
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
  }, [level, topic, page, q]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const isLocked = !isVip && isAtLeastHalfFreeUsage && (level === 'B1' || level === 'B2' || level === 'C1');
    if (isLocked) {
      setTopicCounts({});
      return;
    }

    wordApi.topicCounts(level === 'Tất cả' ? undefined : level)
      .then(({ data }) => {
        const counts: Record<string, number> = {};
        if (Array.isArray(data)) {
          data.forEach((item) => {
            if (item.topic) counts[item.topic] = item.count;
          });
        }
        setTopicCounts(counts);
      })
      .catch(() => {});
  }, [level, isVip, isAtLeastHalfFreeUsage]);

  useEffect(() => {
    const loadFavs = (e?: Event) => {
      const ce = e as CustomEvent;
      if (typeof ce?.detail?.count === 'number') {
        setFavCount(ce.detail.count);
      }
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
            const cachedItems = JSON.parse(localStorage.getItem(`vocab_fav_items_${uid}`) || '[]');
            if (Array.isArray(cachedItems) && cachedItems.length > 0) {
              setFavCount(cachedItems.length);
            }
            const cachedIds: string[] = JSON.parse(localStorage.getItem(`vocab_favs_${uid}`) || '[]');
            if (Array.isArray(cachedIds) && cachedIds.length > 0) {
              setFav(new Set(cachedIds.map(String)));
            }
          }
        }
      } catch {}

      wordApi.favorites(0, 100)
        .then(({ data }) => {
          const count = typeof data?.totalElements === 'number'
            ? data.totalElements
            : (Array.isArray(data?.content) ? data.content.length : 0);
          setFavCount(count);
          const ids = new Set<string>();
          (data?.content || []).forEach((w: any) => {
            if (w.id != null) ids.add(String(w.id).toLowerCase().trim());
            if (w.word) ids.add(String(w.word).toLowerCase().trim());
            if (w.lemma) ids.add(String(w.lemma).toLowerCase().trim());
          });
          (data?.localIds || []).forEach((id: any) => {
            if (id != null) ids.add(String(id).toLowerCase().trim());
          });
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
    const idStr = String(id).toLowerCase().trim();
    const wordKey = wordObj?.word ? wordObj.word.toLowerCase().trim() : '';
    const isFav = fav.has(idStr) || (!!wordKey && fav.has(wordKey));
    setFavCount((c) => Math.max(0, isFav ? c - 1 : c + 1));
    setFav((s) => {
      const n = new Set(s);
      if (isFav) {
        n.delete(idStr);
        if (wordKey) n.delete(wordKey);
      } else {
        n.add(idStr);
        if (wordKey) n.add(wordKey);
      }
      return n;
    });

    try {
      if (isFav) {
        await wordApi.unfavorite(id, wordObj?.word);
      } else {
        await wordApi.favorite(id, wordObj);
      }
    } catch (e) {
      setErr(errMsg(e));
      setFavCount((c) => (isFav ? c + 1 : Math.max(0, c - 1)));
      setFav((s) => {
        const n = new Set(s);
        if (isFav) {
          n.add(idStr);
          if (wordKey) n.add(wordKey);
        } else {
          n.delete(idStr);
          if (wordKey) n.delete(wordKey);
        }
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
    <div className="content" style={{ maxWidth: 1600 }}>
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
            Từ yêu thích ({favCount})
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
          <AnimatedCounter value={totalElements} /> từ
        </span>
      </div>

      {/* Topic Filter Chips */}
      <div
        className="chiprow"
        style={{
          marginBottom: 16,
          display: 'flex',
          overflowX: 'auto',
          flexWrap: 'wrap',
          gap: 6,
          paddingBottom: 2,
        }}
      >
        {TOPICS.map((t) => {
          const count = t.code === 'ALL' ? undefined : (topicCounts[t.code] ?? 0);
          const isZero = t.code !== 'ALL' && count === 0;
          return (
            <button
              key={t.code}
              className={'fchip' + (topic === t.code ? ' on' : '')}
              disabled={isZero}
              onClick={() => {
                setTopic(t.code);
                setPage(0);
              }}
              style={{
                opacity: isZero ? 0.38 : 1,
                cursor: isZero ? 'not-allowed' : 'pointer',
                fontSize: 13,
                padding: '6px 12px',
                borderRadius: 999,
              }}
              title={isZero ? 'Không có từ nào thuộc chủ đề này ở cấp độ đã chọn' : undefined}
            >
              {t.label}
              {count !== undefined && (
                <span style={{ marginLeft: 5, opacity: 0.75, fontSize: 11.5, fontWeight: 700 }}>
                  ({count})
                </span>
              )}
            </button>
          );
        })}
      </div>

      {err && <div className="error">{err}</div>}

      {/* Word List Card */}
      <MotionCard style={{ padding: 12 }}>
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
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            key={`${level}-${page}-${q}`}
          >
            {words.map((w) => {
              const isSaved = fav.has(String(w.id).toLowerCase().trim()) || (!!w.word && fav.has(w.word.toLowerCase().trim())) || (!!w.lemma && fav.has(w.lemma.toLowerCase().trim()));
              const badge = w.partOfSpeech ? getPartOfSpeechBadgeStyle(w.partOfSpeech) : null;
              return (
                <motion.div key={w.id} variants={staggerItem}>
                  <div
                    className="wrow"
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

                    {w.topic && TOPIC_MAP[w.topic] && (
                      <span
                        className="pill"
                        style={{
                          fontSize: 11,
                          padding: '2px 8px',
                          background: 'rgba(28, 140, 75, 0.08)',
                          color: '#166534',
                          border: '1px solid rgba(28, 140, 75, 0.2)',
                          fontWeight: 700,
                          marginRight: 6,
                        }}
                      >
                        {TOPIC_MAP[w.topic]}
                      </span>
                    )}

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
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </MotionCard>

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

