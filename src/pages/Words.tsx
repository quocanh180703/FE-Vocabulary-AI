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
import { TOPIC_FILTER_OPTIONS as TOPICS } from '../constants/topics';
import { Icon } from '../components/icons';
import { ConfirmModal } from '../components/ConfirmModal';
import { AutocompleteSearch } from '../components/AutocompleteSearch';
import { useUsage } from '../context/UsageContext';
import { AnimatedCounter, staggerContainer, staggerItem } from '../motion';
import { ViMascotImage } from '../components/ViMascotImage';
import { ViLoadingScreen } from '../components/states/ViLoadingScreen';
import { UiIcon } from '../components/UiIcon';
import { SplitHeading } from '../components/SageEffects';

const LEVELS = ['Tất cả', 'A1', 'A2', 'B1', 'B2', 'C1'];

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
  const [customWordToDelete, setCustomWordToDelete] = useState<CustomWordItem | null>(null);
  const [deletingCustomWord, setDeletingCustomWord] = useState(false);
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
        const content = Array.isArray(d?.content) ? d.content : Array.isArray(d) ? d : [];
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
              : Array.isArray(data?.content)
              ? data.content.length
              : 0;
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

  const handleConfirmDeleteCustomWord = async () => {
    if (!customWordToDelete) return;
    setDeletingCustomWord(true);
    try {
      await myWordsApi.delete(customWordToDelete.id);
      loadMyWords();
      setCustomWordToDelete(null);
    } catch (err) {
      setMyErr(errMsg(err));
    } finally {
      setDeletingCustomWord(false);
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
    <div className="content">
      {/* Compact Header */}
      <div className="pagehead">
        <div>
          <div className="eyebrow">WORD LIBRARY</div>
          <SplitHeading text={activeTab === 'CEFR' ? 'Thư viện từ vựng' : 'Từ riêng của tôi'} />
          <p className="sub">
            {activeTab === 'CEFR'
              ? `Oxford 3000/5000 (${totalElements > 0 ? totalElements : '4.900+'} từ chuẩn CEFR A1–C1)`
              : 'Sổ tay từ vựng cá nhân — tự thêm và ôn luyện bằng flashcard'}
          </p>
        </div>

        <div className="row" style={{ flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`fchip ${activeTab === 'CEFR' ? 'on' : ''}`}
            onClick={() => setActiveTab('CEFR')}
          >
            Kho CEFR
          </button>
          <button
            type="button"
            className={`fchip ${activeTab === 'MY_WORDS' ? 'on' : ''}`}
            onClick={() => setActiveTab('MY_WORDS')}
          >
            Từ riêng ({myTotalElements})
          </button>
          {activeTab === 'CEFR' ? (
            <>
              <button type="button" className="btn secondary sm" onClick={() => nav('/favorites')}>
                <Icon n="heart" s={14} /> Đã lưu ({favCount})
              </button>
              <button type="button" className="btn sm" onClick={() => nav('/review')}>
                Ôn tập
              </button>
            </>
          ) : (
            <>
              <button type="button" className="btn secondary sm" onClick={() => nav('/review?mode=MY_WORDS')}>
                Ôn flashcard
              </button>
              <button type="button" className="btn sm" onClick={openCreateModal}>
                + Thêm từ riêng
              </button>
            </>
          )}
        </div>
      </div>

      {/* VIEW 1: CEFR DICTIONARY */}
      {activeTab === 'CEFR' && (
        <>
          <section className="card" style={{ flex: 'none', padding: '12px 14px', display: 'grid', gap: 10 }}>
            <div className="row" style={{ flexWrap: 'wrap', gap: 10 }}>
              <div style={{ flex: '1 1 280px', minWidth: 200 }}>
                <AutocompleteSearch
                  value={search}
                  onChange={setSearch}
                  onSearch={(query) => handleCefrSearch(query)}
                  placeholder="Tìm từ vựng hoặc nghĩa tiếng Việt…"
                  type="words"
                  showButton={true}
                  buttonText="Tìm"
                  limit={8}
                />
              </div>

              <div className="chiprow">
                {LEVELS.map((l) => {
                  const isLocked = !isVip && isAtLeastHalfFreeUsage && (l === 'B1' || l === 'B2' || l === 'C1');
                  return (
                    <button
                      key={l}
                      type="button"
                      className={'fchip' + (level === l ? ' on' : '')}
                      onClick={() => {
                        if (isLocked) {
                          openUpgradeModal({
                            feature: 'CEFR_B1_C1',
                            message: `Cấp độ ${l} thuộc kho từ vựng Oxford nâng cao (B1–C1) dành riêng cho tài khoản Premium.`,
                          });
                          return;
                        }
                        setLevel(l);
                        setPage(0);
                      }}
                    >
                      {l === 'Tất cả' ? 'Tất cả' : l}
                      {isLocked && <> <UiIcon name="lock" size={12} /></>}
                    </button>
                  );
                })}
                <span className="pill">
                  <AnimatedCounter value={totalElements} /> từ
                </span>
              </div>
            </div>

            <div className="chiprow" style={{ flexWrap: 'nowrap', overflowX: 'auto', paddingBottom: 2 }}>
              {TOPICS.map((t) => {
                const count = t.code === 'ALL' ? undefined : topicCounts[t.code] ?? 0;
                const isZero = t.code !== 'ALL' && count === 0;
                return (
                  <button
                    key={t.code}
                    type="button"
                    className={'fchip' + (topic === t.code ? ' on' : '')}
                    disabled={isZero}
                    style={{ flexShrink: 0, opacity: isZero ? 0.42 : 1 }}
                    onClick={() => {
                      setTopic(t.code);
                      setPage(0);
                    }}
                  >
                    {t.label}
                    {count !== undefined && <span style={{ opacity: 0.75 }}>({count})</span>}
                  </button>
                );
              })}
            </div>
          </section>

          {err && (
            <div className="card row" style={{ flex: 'none' }}>
              <ViMascotImage pose="surprised" size={56} alt="Vi báo lỗi tải từ vựng" />
              <div className="error" style={{ flex: 1 }}>{err}</div>
            </div>
          )}

          {/* Scrollable 2-Column Word Results */}
          <div id="word-results" className="long-list" style={{ flex: 1, minHeight: 0, paddingRight: 4 }}>
            {loading && words.length === 0 ? (
              <ViLoadingScreen subtitle="Đang tải kho từ vựng Oxford" />
            ) : words.length === 0 ? (
              <div className="card center" style={{ minHeight: 220, gap: 8 }}>
                <ViMascotImage pose="happy-wave" size={76} alt="Vi gợi ý tìm từ khác" />
                <strong>Không tìm thấy từ vựng phù hợp</strong>
                <div className="sub">Hãy thử từ khóa khác hoặc chuyển sang cấp độ khác.</div>
              </div>
            ) : (
              <motion.div
                className="grid g2"
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
                  const wLevel = (w.level || w.cefrLevel || 'A1').toUpperCase();
                  const isLockedLevel = !isVip && ['B1', 'B2', 'C1'].includes(wLevel) && !isSaved;

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
                          <span className={isLockedLevel ? 'pill warn' : 'tag'}>
                            {isLockedLevel ? <><UiIcon name="lock" size={11} /> {wLevel}</> : wLevel}
                          </span>
                          {badge && <span className="pill level">{badge.shortLabel}</span>}
                          {w.topic && TOPIC_MAP[w.topic] && (
                            <span className="pill">{TOPIC_MAP[w.topic]}</span>
                          )}
                        </div>
                        <div className="row" style={{ gap: 6 }}>
                          <button
                            type="button"
                            className="speakbtn"
                            style={{ width: 30, height: 30 }}
                            onClick={(e) => playAudio(w, e)}
                            title="Nghe phát âm"
                            aria-label={`Nghe phát âm ${w.word || w.lemma}`}
                          >
                            <Icon n="vol" s={15} />
                          </button>
                          <button
                            type="button"
                            className={'heartbtn' + (isSaved ? ' on' : '')}
                            style={{ width: 30, height: 30 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFav(w.id, w);
                            }}
                            title={isSaved ? 'Bỏ lưu' : 'Lưu từ'}
                            aria-label={isSaved ? 'Bỏ lưu từ' : 'Lưu từ'}
                          >
                            <Icon n="heart" s={14} />
                          </button>
                        </div>
                      </div>

                      <div>
                        <div style={{ fontFamily: 'var(--font-heading)', fontSize: 20, fontWeight: 700 }}>
                          {w.word || w.lemma}
                        </div>
                        {w.pronunciation && <div className="tiny muted">{w.pronunciation}</div>}
                        <strong style={{ display: 'block', marginTop: 4 }}>
                          {w.meaning || w.vietnameseMeaning}
                        </strong>
                        {w.example && (
                          <p className="tiny muted" style={{ margin: '4px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            “{w.example}”
                          </p>
                        )}
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

          {totalPages > 1 && (
            <div className="row between" style={{ flex: 'none', padding: '2px 4px', color: 'var(--cream)' }}>
              <span className="tiny" style={{ color: 'rgba(250,248,241,0.9)' }}>
                Trang <b>{page + 1}</b> / <b>{totalPages}</b> ({words.length} / {totalElements} từ)
              </span>
              <div className="row">
                <button
                  type="button"
                  className="btn secondary sm"
                  disabled={page === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  ← Trước
                </button>
                <button
                  type="button"
                  className="btn secondary sm"
                  disabled={page + 1 >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Sau →
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* VIEW 2: MY CUSTOM WORDS */}
      {activeTab === 'MY_WORDS' && (
        <>
          <section className="card" style={{ flex: 'none', padding: '12px 14px', display: 'grid', gap: 10 }}>
            <div className="row" style={{ flexWrap: 'wrap', gap: 10 }}>
              <div style={{ flex: '1 1 280px', minWidth: 200 }}>
                <AutocompleteSearch
                  value={mySearch}
                  onChange={setMySearch}
                  onSearch={(query) => handleMyWordsSearch(query)}
                  placeholder="Tìm kiếm trong từ riêng của bạn..."
                  type="words"
                  showButton={true}
                  buttonText="Tìm"
                  limit={6}
                />
              </div>

              <div className="chiprow">
                {LEVELS.map((l) => (
                  <button
                    key={l}
                    type="button"
                    className={'fchip' + (myLevel === l ? ' on' : '')}
                    onClick={() => {
                      setMyLevel(l);
                      setMyPage(0);
                    }}
                  >
                    {l === 'Tất cả' ? 'Tất cả' : l}
                  </button>
                ))}
                <span className="pill">
                  <AnimatedCounter value={myTotalElements} /> từ riêng
                </span>
              </div>
            </div>

            <div className="chiprow" style={{ flexWrap: 'nowrap', overflowX: 'auto', paddingBottom: 2 }}>
              {TOPICS.map((t) => (
                <button
                  key={t.code}
                  type="button"
                  className={'fchip' + (myTopic === t.code ? ' on' : '')}
                  style={{ flexShrink: 0 }}
                  onClick={() => {
                    setMyTopic(t.code);
                    setMyPage(0);
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </section>

          {myErr && <div className="error">{myErr}</div>}

          <div className="long-list" style={{ flex: 1, minHeight: 0, paddingRight: 4 }}>
            {myLoading && myWords.length === 0 ? (
              <ViLoadingScreen compact subtitle="Đang tải danh sách từ riêng" />
            ) : myWords.length === 0 ? (
              <div className="card center" style={{ minHeight: 220, gap: 10 }}>
                <ViMascotImage pose="happy-wave" size={78} alt="Vi chào bạn — thêm từ riêng đầu tiên" />
                <strong>Chưa có từ riêng nào</strong>
                <div className="sub">Thêm từ mới kèm nghĩa và ví dụ để ôn flashcard bất cứ lúc nào.</div>
                <button type="button" className="btn sm" onClick={openCreateModal}>
                  + Thêm từ riêng đầu tiên
                </button>
              </div>
            ) : (
              <motion.div
                className="grid g2"
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
                key={`my-${myLevel}-${myPage}-${myQ}`}
              >
                {myWords.map((item) => {
                  const badge = item.partOfSpeech ? getPartOfSpeechBadgeStyle(item.partOfSpeech) : null;
                  return (
                    <motion.section
                      key={item.id}
                      variants={staggerItem}
                      className="card"
                      style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 10 }}
                    >
                      <div className="row between">
                        <div className="row" style={{ gap: 6 }}>
                          <span className="tag">{item.cefrLevel || 'A1'}</span>
                          {badge && <span className="pill level">{badge.shortLabel}</span>}
                          {item.topic && TOPIC_MAP[item.topic] && (
                            <span className="pill">{TOPIC_MAP[item.topic]}</span>
                          )}
                        </div>
                        <button
                          type="button"
                          className="speakbtn"
                          style={{ width: 30, height: 30 }}
                          onClick={(e) => playAudio(item, e)}
                          title="Nghe phát âm"
                        >
                          <Icon n="vol" s={15} />
                        </button>
                      </div>

                      <div>
                        <div style={{ fontFamily: 'var(--font-heading)', fontSize: 20, fontWeight: 700 }}>
                          {item.lemma}
                        </div>
                        <strong style={{ display: 'block', marginTop: 4 }}>{item.vietnameseMeaning}</strong>
                        {item.example && (
                          <p className="tiny muted" style={{ margin: '4px 0 0' }}>
                            “{item.example}”
                            {item.exampleTranslation ? ` — ${item.exampleTranslation}` : ''}
                          </p>
                        )}
                      </div>

                      <div className="row">
                        <button type="button" className="btn secondary sm" onClick={(e) => openEditModal(item, e)}>
                          Sửa
                        </button>
                        <button
                          type="button"
                          className="btn ghost sm"
                          style={{ color: 'var(--danger)' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setCustomWordToDelete(item);
                          }}
                        >
                          Xóa
                        </button>
                      </div>
                    </motion.section>
                  );
                })}
              </motion.div>
            )}
          </div>

          {myTotalPages > 1 && (
            <div className="row between" style={{ flex: 'none', padding: '2px 4px', color: 'var(--cream)' }}>
              <span className="tiny" style={{ color: 'rgba(250,248,241,0.9)' }}>
                Trang <b>{myPage + 1}</b> / <b>{myTotalPages}</b> ({myWords.length} / {myTotalElements} từ riêng)
              </span>
              <div className="row">
                <button
                  type="button"
                  className="btn secondary sm"
                  disabled={myPage === 0}
                  onClick={() => setMyPage((p) => Math.max(0, p - 1))}
                >
                  ← Trước
                </button>
                <button
                  type="button"
                  className="btn secondary sm"
                  disabled={myPage + 1 >= myTotalPages}
                  onClick={() => setMyPage((p) => p + 1)}
                >
                  Sau →
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Create / Edit Custom Word Modal */}
      {isModalOpen &&
        createPortal(
          <>
            <div className="scrim" onClick={() => !modalSubmitting && setIsModalOpen(false)} />
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="row between" style={{ marginBottom: 14 }}>
                <h2 style={{ margin: 0 }}>{editingWord ? 'Chỉnh sửa từ riêng' : 'Thêm từ riêng mới'}</h2>
                <button
                  type="button"
                  className="btn ghost sm"
                  onClick={() => setIsModalOpen(false)}
                  disabled={modalSubmitting}
                >
                  ✕
                </button>
              </div>

              {modalErr && <div className="error" style={{ marginBottom: 12 }}>{modalErr}</div>}

              <form onSubmit={handleSubmitModal} className="stack">
                <div className="field-wrap">
                  <label className="field-label">
                    Từ vựng tiếng Anh (Lemma) <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="field"
                    placeholder="ví dụ: serendipity, elaborate..."
                    value={formLemma}
                    onChange={(e) => setFormLemma(e.target.value)}
                    disabled={editingWord != null || modalSubmitting}
                    maxLength={100}
                    required
                  />
                </div>

                <div className="field-wrap">
                  <label className="field-label">
                    Nghĩa tiếng Việt <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="field"
                    placeholder="ví dụ: sự may mắn tình cờ..."
                    value={formVietnameseMeaning}
                    onChange={(e) => setFormVietnameseMeaning(e.target.value)}
                    disabled={modalSubmitting}
                    maxLength={255}
                    required
                  />
                </div>

                <div className="grid g2">
                  <div className="field-wrap">
                    <label className="field-label">Từ loại</label>
                    <select
                      className="field"
                      value={formPartOfSpeech}
                      onChange={(e) => setFormPartOfSpeech(e.target.value)}
                      disabled={modalSubmitting}
                    >
                      {POS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field-wrap">
                    <label className="field-label">Cấp độ CEFR</label>
                    <select
                      className="field"
                      value={formCefrLevel}
                      onChange={(e) => setFormCefrLevel(e.target.value)}
                      disabled={modalSubmitting}
                    >
                      {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map((lvl) => (
                        <option key={lvl} value={lvl}>
                          {lvl}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="field-wrap">
                  <label className="field-label">Chủ đề</label>
                  <select
                    className="field"
                    value={formTopic}
                    onChange={(e) => setFormTopic(e.target.value)}
                    disabled={modalSubmitting}
                  >
                    {TOPICS.filter((t) => t.code !== 'ALL').map((t) => (
                      <option key={t.code} value={t.code}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field-wrap">
                  <label className="field-label">Câu ví dụ tiếng Anh (tùy chọn)</label>
                  <input
                    type="text"
                    className="field"
                    placeholder="ví dụ: Finding this cafe was pure serendipity."
                    value={formExample}
                    onChange={(e) => setFormExample(e.target.value)}
                    disabled={modalSubmitting}
                    maxLength={500}
                  />
                </div>

                <div className="field-wrap">
                  <label className="field-label">Dịch nghĩa câu ví dụ (tùy chọn)</label>
                  <input
                    type="text"
                    className="field"
                    placeholder="ví dụ: Tìm thấy quán cà phê này đúng là may mắn bất ngờ."
                    value={formExampleTranslation}
                    onChange={(e) => setFormExampleTranslation(e.target.value)}
                    disabled={modalSubmitting}
                    maxLength={500}
                  />
                </div>

                <div className="row" style={{ justifyContent: 'flex-end' }}>
                  <button type="button" className="btn ghost" onClick={() => setIsModalOpen(false)} disabled={modalSubmitting}>
                    Hủy
                  </button>
                  <button type="submit" className="btn" disabled={modalSubmitting}>
                    {modalSubmitting ? 'Đang lưu...' : editingWord ? 'Cập nhật từ' : 'Thêm từ vựng'}
                  </button>
                </div>
              </form>
            </div>
          </>,
          document.body
        )}

      <ConfirmModal
        isOpen={!!customWordToDelete}
        onClose={() => !deletingCustomWord && setCustomWordToDelete(null)}
        onConfirm={handleConfirmDeleteCustomWord}
        title="Xác nhận xóa từ vựng"
        itemName={customWordToDelete?.lemma}
        description={
          <p style={{ margin: 0 }}>
            Bạn có chắc chắn muốn xóa từ <b>&quot;{customWordToDelete?.lemma}&quot;</b> khỏi danh sách từ vựng cá nhân của bạn không?
          </p>
        }
        warningText="Từ này sẽ bị gỡ bỏ khỏi danh sách từ riêng của bạn và các lượt ôn tập liên quan."
        confirmText="Xác nhận xóa"
        cancelText="Hủy bỏ"
        loadingText="Đang xóa..."
        isLoading={deletingCustomWord}
      />
    </div>
  );
}
