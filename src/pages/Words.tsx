import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  wordApi,
  myWordsApi,
  errMsg,
  getPartOfSpeechBadgeStyle,
  ttsApi,
  TOPIC_MAP,
} from '../api';
import type { Word, CustomWordItem } from '../api';
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

const POS_OPTIONS = [
  { value: 'noun', label: 'Danh từ (noun)' },
  { value: 'verb', label: 'Động từ (verb)' },
  { value: 'adjective', label: 'Tính từ (adjective)' },
  { value: 'adverb', label: 'Phó từ / Trạng từ (adverb)' },
  { value: 'preposition', label: 'Giới từ (preposition)' },
  { value: 'conjunction', label: 'Liên từ (conjunction)' },
  { value: 'pronoun', label: 'Đại từ (pronoun)' },
  { value: 'interjection', label: 'Thán từ (interjection)' },
];

export default function Words() {
  const { isVip, openUpgradeModal, isAtLeastHalfFreeUsage } = useUsage();
  const nav = useNavigate();

  // Tab State
  const [activeTab, setActiveTab] = useState<'CEFR' | 'MY_WORDS'>('CEFR');

  // CEFR Dictionary State
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

  // User Custom Words State
  const [myWords, setMyWords] = useState<CustomWordItem[]>([]);
  const [myLevel, setMyLevel] = useState('Tất cả');
  const [myTopic, setMyTopic] = useState('ALL');
  const [mySearch, setMySearch] = useState('');
  const [myQ, setMyQ] = useState('');
  const [myPage, setMyPage] = useState(0);
  const [myTotalPages, setMyTotalPages] = useState(1);
  const [myTotalElements, setMyTotalElements] = useState(0);
  const [myLoading, setMyLoading] = useState(false);
  const [myErr, setMyErr] = useState('');

  // Custom Word Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWord, setEditingWord] = useState<CustomWordItem | null>(null);
  const [formLemma, setFormLemma] = useState('');
  const [formVietnameseMeaning, setFormVietnameseMeaning] = useState('');
  const [formPartOfSpeech, setFormPartOfSpeech] = useState('noun');
  const [formCefrLevel, setFormCefrLevel] = useState('A1');
  const [formTopic, setFormTopic] = useState('WORK');
  const [formExample, setFormExample] = useState('');
  const [formExampleTranslation, setFormExampleTranslation] = useState('');
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalErr, setModalErr] = useState('');

  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isModalOpen]);

  // Load CEFR Dictionary
  const loadCefr = () => {
    setLoading(true);
    setErr('');
    wordApi
      .list({
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
    if (activeTab === 'CEFR') {
      loadCefr();
    }
  }, [level, topic, page, q, activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const isLocked = !isVip && isAtLeastHalfFreeUsage && (level === 'B1' || level === 'B2' || level === 'C1');
    if (isLocked) {
      setTopicCounts({});
      return;
    }

    wordApi
      .topicCounts(level === 'Tất cả' ? undefined : level)
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

  // Load User Custom Words
  const loadMyWords = () => {
    setMyLoading(true);
    setMyErr('');
    myWordsApi
      .list({
        page: myPage,
        size: 20,
        level: myLevel === 'Tất cả' ? undefined : myLevel,
        topic: myTopic === 'ALL' ? undefined : myTopic,
        search: myQ || undefined,
      })
      .then((res) => {
        const d = res.data?.data || res.data;
        const content = Array.isArray(d?.content) ? d.content : (Array.isArray(d) ? d : []);
        setMyWords(content);
        setMyTotalPages(d?.totalPages ?? 1);
        setMyTotalElements(d?.totalElements ?? content.length);
      })
      .catch((e) => setMyErr(errMsg(e)))
      .finally(() => setMyLoading(false));
  };

  useEffect(() => {
    if (activeTab === 'MY_WORDS') {
      loadMyWords();
    }
  }, [myLevel, myTopic, myPage, myQ, activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch count for My Words badge
  useEffect(() => {
    myWordsApi
      .list({ size: 1 })
      .then((res) => {
        const d = res.data?.data || res.data;
        if (typeof d?.totalElements === 'number') {
          setMyTotalElements(d.totalElements);
        }
      })
      .catch(() => {});
  }, []);

  // Sync Favorites
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

      wordApi
        .favorites(0, 100)
        .then(({ data }) => {
          const count =
            typeof data?.totalElements === 'number'
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

  const handleCefrSearch = (customQuery?: string) => {
    const query = typeof customQuery === 'string' ? customQuery : search;
    setPage(0);
    setQ(query.trim());
  };

  const handleMyWordsSearch = (customQuery?: string) => {
    const query = typeof customQuery === 'string' ? customQuery : mySearch;
    setMyPage(0);
    setMyQ(query.trim());
  };

  const playAudio = (w: { word?: string; lemma?: string; audioUrl?: string }, e: React.MouseEvent) => {
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

  // Custom Word Modal Handlers
  const openCreateModal = () => {
    setEditingWord(null);
    setFormLemma('');
    setFormVietnameseMeaning('');
    setFormPartOfSpeech('noun');
    setFormCefrLevel('A1');
    setFormTopic('WORK');
    setFormExample('');
    setFormExampleTranslation('');
    setModalErr('');
    setIsModalOpen(true);
  };

  const openEditModal = (item: CustomWordItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingWord(item);
    setFormLemma(item.lemma);
    setFormVietnameseMeaning(item.vietnameseMeaning);
    setFormPartOfSpeech(item.partOfSpeech || 'noun');
    setFormCefrLevel(item.cefrLevel || 'A1');
    setFormTopic(item.topic || 'WORK');
    setFormExample(item.example || '');
    setFormExampleTranslation(item.exampleTranslation || '');
    setModalErr('');
    setIsModalOpen(true);
  };

  const handleDeleteCustomWord = async (item: CustomWordItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Bạn có chắc chắn muốn xóa từ "${item.lemma}" khỏi danh sách từ riêng của bạn không?`)) {
      return;
    }
    try {
      await myWordsApi.delete(item.id);
      loadMyWords();
    } catch (err) {
      alert(errMsg(err));
    }
  };

  const handleSubmitModal = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalErr('');
    const cleanLemma = formLemma.trim();
    const cleanMeaning = formVietnameseMeaning.trim();

    if (!cleanLemma) {
      setModalErr('Vui lòng nhập từ vựng tiếng Anh');
      return;
    }
    if (!cleanMeaning) {
      setModalErr('Vui lòng nhập nghĩa tiếng Việt');
      return;
    }

    setModalSubmitting(true);
    try {
      if (editingWord) {
        await myWordsApi.update(editingWord.id, {
          vietnameseMeaning: cleanMeaning,
          partOfSpeech: formPartOfSpeech,
          cefrLevel: formCefrLevel,
          topic: formTopic,
          example: formExample.trim() || undefined,
          exampleTranslation: formExampleTranslation.trim() || undefined,
        });
      } else {
        await myWordsApi.create({
          lemma: cleanLemma,
          vietnameseMeaning: cleanMeaning,
          partOfSpeech: formPartOfSpeech,
          cefrLevel: formCefrLevel,
          topic: formTopic,
          example: formExample.trim() || undefined,
          exampleTranslation: formExampleTranslation.trim() || undefined,
        });
      }
      setIsModalOpen(false);
      loadMyWords();
    } catch (err: any) {
      const msg = errMsg(err);
      if (err?.response?.status === 409 || msg.includes('đã tồn tại')) {
        setModalErr('Từ vựng này đã tồn tại trong danh sách từ riêng của bạn.');
      } else {
        setModalErr(msg || 'Có lỗi xảy ra khi lưu từ vựng.');
      }
    } finally {
      setModalSubmitting(false);
    }
  };

  return (
    <div className="content" style={{ maxWidth: 1600 }}>
      {/* Page Header */}
      <div className="pagehead" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14 }}>
        <div>
          <h1>{activeTab === 'CEFR' ? 'Khám phá từ vựng tiếng Anh' : 'Từ vựng riêng của tôi'}</h1>
          <div className="sub">
            {activeTab === 'CEFR'
              ? (totalElements > 0 ? `Hơn ${totalElements} từ vựng chuẩn Oxford & CEFR (A1 - C1)` : 'Sắp xếp theo cấp độ CEFR')
              : 'Sổ tay từ vựng cá nhân · Tự thêm, tra cứu, chỉnh sửa và ôn luyện flashcard riêng'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {activeTab === 'CEFR' ? (
            <>
              <button className="btn ghost" onClick={() => nav('/favorites')} style={{ minHeight: 46, padding: '0 20px', fontSize: 14 }}>
                <svg viewBox="0 0 24 24" className="ic" style={{ color: 'var(--red)' }}><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
                Từ yêu thích ({favCount})
              </button>
              <button className="btn" onClick={() => nav('/review')} style={{ minHeight: 46, padding: '0 22px', fontSize: 14 }}>
                Ôn tập ngay
              </button>
            </>
          ) : (
            <>
              <button className="btn ghost" onClick={() => nav('/review?mode=MY_WORDS')} style={{ minHeight: 46, padding: '0 20px', fontSize: 14 }}>
                <Icon n="spark" s={18} />
                Ôn bằng flashcard
              </button>
              <button className="btn" onClick={openCreateModal} style={{ minHeight: 46, padding: '0 22px', fontSize: 14 }}>
                + Thêm từ riêng
              </button>
            </>
          )}
        </div>
      </div>

      {/* Primary Tab Navigation */}
      <div
        style={{
          display: 'flex',
          gap: 10,
          marginBottom: 18,
          borderBottom: '1px solid var(--border)',
          paddingBottom: 12,
        }}
      >
        <button
          className={'fchip' + (activeTab === 'CEFR' ? ' on' : '')}
          onClick={() => setActiveTab('CEFR')}
          style={{
            fontSize: 14,
            fontWeight: 800,
            padding: '9px 20px',
            borderRadius: 12,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span>📚</span>
          <span>Kho từ vựng CEFR</span>
        </button>
        <button
          className={'fchip' + (activeTab === 'MY_WORDS' ? ' on' : '')}
          onClick={() => setActiveTab('MY_WORDS')}
          style={{
            fontSize: 14,
            fontWeight: 800,
            padding: '9px 20px',
            borderRadius: 12,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span>📝</span>
          <span>Từ riêng của tôi</span>
          {myTotalElements > 0 && (
            <span
              style={{
                fontSize: 11.5,
                background: activeTab === 'MY_WORDS' ? 'rgba(255, 255, 255, 0.25)' : 'rgba(37, 99, 235, 0.12)',
                color: activeTab === 'MY_WORDS' ? '#fff' : '#2563EB',
                padding: '2px 7px',
                borderRadius: 999,
                fontWeight: 800,
              }}
            >
              {myTotalElements}
            </span>
          )}
        </button>
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: KHO TỪ VỰNG CEFR                                                  */}
      {/* ========================================================================= */}
      {activeTab === 'CEFR' && (
        <>
          {/* Searchbar */}
          <div style={{ marginBottom: 14 }}>
            <AutocompleteSearch
              value={search}
              onChange={setSearch}
              onSearch={(query) => handleCefrSearch(query)}
              placeholder="Tìm từ vựng… thử gõ “resilient”, “apple”, “business”..."
              type="words"
              showButton={true}
              buttonText="Tìm kiếm"
              limit={8}
            />
          </div>

          {/* Filter Chips matching words.html */}
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
                  const isSaved =
                    fav.has(String(w.id).toLowerCase().trim()) ||
                    (!!w.word && fav.has(w.word.toLowerCase().trim())) ||
                    (!!w.lemma && fav.has(w.lemma.toLowerCase().trim()));
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

          {/* Pagination */}
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
        </>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: TỪ RIÊNG CỦA TÔI (PHASE 3B)                                       */}
      {/* ========================================================================= */}
      {activeTab === 'MY_WORDS' && (
        <>
          {/* Searchbar */}
          <div style={{ marginBottom: 14 }}>
            <AutocompleteSearch
              value={mySearch}
              onChange={setMySearch}
              onSearch={(query) => handleMyWordsSearch(query)}
              placeholder="Tìm kiếm trong danh sách từ riêng của bạn..."
              type="words"
              showButton={true}
              buttonText="Tìm kiếm"
              limit={6}
            />
          </div>

          {/* Filter Level Chips */}
          <div className="chiprow" style={{ marginBottom: 14 }}>
            {LEVELS.map((l) => (
              <button
                key={l}
                className={'fchip' + (myLevel === l ? ' on' : '')}
                onClick={() => {
                  setMyLevel(l);
                  setMyPage(0);
                }}
              >
                {l === 'Tất cả' ? 'Tất cả cấp độ' : l}
              </button>
            ))}
            <span className="pill" style={{ marginLeft: 'auto', alignSelf: 'center' }}>
              <AnimatedCounter value={myTotalElements} /> từ riêng
            </span>
          </div>

          {/* Filter Topic Chips */}
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
            {TOPICS.map((t) => (
              <button
                key={t.code}
                className={'fchip' + (myTopic === t.code ? ' on' : '')}
                onClick={() => {
                  setMyTopic(t.code);
                  setMyPage(0);
                }}
                style={{
                  fontSize: 13,
                  padding: '6px 12px',
                  borderRadius: 999,
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {myErr && <div className="error">{myErr}</div>}

          {/* My Words List Card */}
          <MotionCard style={{ padding: 12 }}>
            {myLoading && myWords.length === 0 ? (
              <div className="loading" style={{ padding: 48 }}>
                <Icon n="spark" s={20} /> Đang tải danh sách từ riêng...
              </div>
            ) : myWords.length === 0 ? (
              <div className="empty" style={{ padding: '48px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>📝</div>
                <b style={{ fontSize: 16, color: 'var(--ink)' }}>Chưa có từ riêng nào</b>
                <div className="sub mt8" style={{ maxWidth: 440, margin: '8px auto 16px' }}>
                  Bạn có thể tự thêm từ mới kèm nghĩa tiếng Việt, câu ví dụ để ôn tập với Flashcard bất cứ lúc nào.
                </div>
                <button className="btn" onClick={openCreateModal}>
                  + Thêm từ riêng đầu tiên
                </button>
              </div>
            ) : (
              <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
                key={`my-${myLevel}-${myPage}-${myQ}`}
              >
                {myWords.map((item) => {
                  const badge = item.partOfSpeech ? getPartOfSpeechBadgeStyle(item.partOfSpeech) : null;
                  return (
                    <motion.div key={item.id} variants={staggerItem}>
                      <div
                        className="wrow"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          padding: '14px 16px',
                          borderBottom: '1px solid var(--border)',
                        }}
                      >
                        <span className="wchk" style={{ color: 'var(--brand)' }}>
                          <svg viewBox="0 0 24 24" className="ic"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </span>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="w" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 16, fontWeight: 800 }}>{item.lemma}</span>
                            <button
                              onClick={(e) => playAudio(item, e)}
                              title="Nghe phát âm"
                              className="speakbtn"
                              style={{ width: 28, height: 28, display: 'inline-flex' }}
                            >
                              <svg viewBox="0 0 24 24" className="ic" style={{ width: 15, height: 15 }}><path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.4 5.6a9 9 0 0 1 0 12.8"/></svg>
                            </button>
                          </div>

                          <div className="m" style={{ marginTop: 4 }}>
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
                            <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{item.vietnameseMeaning}</span>
                          </div>

                          {item.example && (
                            <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 4, fontStyle: 'italic' }}>
                              “{item.example}”
                              {item.exampleTranslation && <span style={{ fontStyle: 'normal' }}> — {item.exampleTranslation}</span>}
                            </div>
                          )}
                        </div>

                        {item.topic && TOPIC_MAP[item.topic] && (
                          <span
                            className="pill"
                            style={{
                              fontSize: 11,
                              padding: '2px 8px',
                              background: 'rgba(28, 140, 75, 0.08)',
                              color: '#166534',
                              border: '1px solid rgba(28, 140, 75, 0.2)',
                              fontWeight: 700,
                            }}
                          >
                            {TOPIC_MAP[item.topic]}
                          </span>
                        )}

                        <span className="pill level">
                          {item.cefrLevel || 'A1'}
                        </span>

                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <button
                            type="button"
                            className="btn ghost sm"
                            onClick={(e) => openEditModal(item, e)}
                            title="Chỉnh sửa từ này"
                            style={{ padding: '6px 12px', fontSize: 12.5 }}
                          >
                            Sửa
                          </button>
                          <button
                            type="button"
                            className="btn ghost sm"
                            onClick={(e) => handleDeleteCustomWord(item, e)}
                            title="Xóa từ này"
                            style={{ padding: '6px 10px', fontSize: 12.5, color: 'var(--red)' }}
                          >
                            Xóa
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </MotionCard>

          {/* Pagination for My Words */}
          {myTotalPages > 1 && (
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
                Trang <b>{myPage + 1}</b> / <b>{myTotalPages}</b> (Đang hiển thị {myWords.length} / {myTotalElements} từ riêng)
              </span>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  className="btn ghost"
                  style={{ minHeight: 44, padding: '0 18px', fontSize: 13.5 }}
                  disabled={myPage === 0}
                  onClick={() => {
                    setMyPage((p) => Math.max(0, p - 1));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  ← Trang trước
                </button>
                <button
                  className="btn ghost"
                  style={{ minHeight: 44, padding: '0 18px', fontSize: 13.5 }}
                  disabled={myPage + 1 >= myTotalPages}
                  onClick={() => {
                    setMyPage((p) => p + 1);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  Trang sau →
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ========================================================================= */}
      {/* MODAL: THÊM / SỬA TỪ RIÊNG (Render qua portal để phủ toàn bộ màn hình)    */}
      {/* ========================================================================= */}
      {isModalOpen &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 99999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 16,
              background: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
            }}
            onClick={() => !modalSubmitting && setIsModalOpen(false)}
          >
            <div
              style={{
                background: '#fff',
                borderRadius: 20,
                maxWidth: 560,
                width: '100%',
                maxHeight: '92vh',
                overflowY: 'auto',
                padding: '26px 28px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 19, fontWeight: 800, margin: 0 }}>
                {editingWord ? 'Chỉnh sửa từ riêng' : 'Thêm từ riêng mới'}
              </h2>
              <button
                type="button"
                className="btn ghost sm"
                onClick={() => setIsModalOpen(false)}
                disabled={modalSubmitting}
                style={{ padding: '4px 8px' }}
              >
                ✕
              </button>
            </div>

            {modalErr && (
              <div
                style={{
                  background: '#FEE2E2',
                  border: '1px solid #FECACA',
                  color: '#DC2626',
                  borderRadius: 8,
                  padding: '10px 14px',
                  fontSize: 13,
                  fontWeight: 600,
                  marginBottom: 16,
                }}
              >
                {modalErr}
              </div>
            )}

            <form onSubmit={handleSubmitModal}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 5 }}>
                    Từ vựng tiếng Anh (Lemma) <span style={{ color: 'var(--red)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="input"
                    placeholder="ví dụ: serendipity, elaborate..."
                    value={formLemma}
                    onChange={(e) => setFormLemma(e.target.value)}
                    disabled={editingWord != null || modalSubmitting}
                    maxLength={100}
                    required
                    style={{ width: '100%' }}
                  />
                  {editingWord && (
                    <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 4 }}>
                      Không thể sửa từ khóa chính. Nếu muốn đổi từ, vui lòng xóa và thêm mới.
                    </div>
                  )}
                </div>

                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 5 }}>
                    Nghĩa tiếng Việt <span style={{ color: 'var(--red)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="input"
                    placeholder="ví dụ: sự may mắn tình cờ, giải thích tỉ mỉ..."
                    value={formVietnameseMeaning}
                    onChange={(e) => setFormVietnameseMeaning(e.target.value)}
                    disabled={modalSubmitting}
                    maxLength={255}
                    required
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 5 }}>
                    Từ loại
                  </label>
                  <select
                    className="input"
                    value={formPartOfSpeech}
                    onChange={(e) => setFormPartOfSpeech(e.target.value)}
                    disabled={modalSubmitting}
                    style={{ width: '100%' }}
                  >
                    {POS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 5 }}>
                    Cấp độ ước lượng
                  </label>
                  <select
                    className="input"
                    value={formCefrLevel}
                    onChange={(e) => setFormCefrLevel(e.target.value)}
                    disabled={modalSubmitting}
                    style={{ width: '100%' }}
                  >
                    {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map((lvl) => (
                      <option key={lvl} value={lvl}>
                        {lvl}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 5 }}>
                    Chủ đề
                  </label>
                  <select
                    className="input"
                    value={formTopic}
                    onChange={(e) => setFormTopic(e.target.value)}
                    disabled={modalSubmitting}
                    style={{ width: '100%' }}
                  >
                    {TOPICS.filter((t) => t.code !== 'ALL').map((t) => (
                      <option key={t.code} value={t.code}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 5 }}>
                    Câu ví dụ tiếng Anh (tùy chọn)
                  </label>
                  <input
                    type="text"
                    className="input"
                    placeholder="ví dụ: Finding this cafe was pure serendipity."
                    value={formExample}
                    onChange={(e) => setFormExample(e.target.value)}
                    disabled={modalSubmitting}
                    maxLength={500}
                    style={{ width: '100%' }}
                  />
                </div>

                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 5 }}>
                    Dịch nghĩa câu ví dụ (tùy chọn)
                  </label>
                  <input
                    type="text"
                    className="input"
                    placeholder="ví dụ: Tìm thấy quán cà phê này đúng là may mắn bất ngờ."
                    value={formExampleTranslation}
                    onChange={(e) => setFormExampleTranslation(e.target.value)}
                    disabled={modalSubmitting}
                    maxLength={500}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => setIsModalOpen(false)}
                  disabled={modalSubmitting}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn"
                  disabled={modalSubmitting}
                >
                  {modalSubmitting ? 'Đang lưu...' : (editingWord ? 'Cập nhật từ' : 'Thêm từ vựng')}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
