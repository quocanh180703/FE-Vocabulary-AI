import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { adminApi } from '../../api';
import type { AdminVocabularyItem, AdminCefrStats } from '../../api';
import { Icon } from '../../components/icons';
import { AutocompleteSearch } from '../../components/AutocompleteSearch';
import { AdminVocabStudio } from './AdminVocabStudio';
import { AnimatedCounter, MotionCard } from '../../motion';
import { motion } from 'framer-motion';

const CEFR_LEVELS = ['ALL', 'A1', 'A2', 'B1', 'B2', 'C1'];
const POS_LIST = [
  { id: 'ALL', label: 'Mọi loại từ' },
  { id: 'NOUN', label: 'Danh từ' },
  { id: 'VERB', label: 'Động từ' },
  { id: 'ADJECTIVE', label: 'Tính từ' },
  { id: 'ADVERB', label: 'Phó từ' },
];

export default function AdminWords() {
  const [searchParams] = useSearchParams();
  const [words, setWords] = useState<AdminVocabularyItem[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(0);
  const [cefrFilter, setCefrFilter] = useState('ALL');
  const [posFilter, setPosFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [cefrStats, setCefrStats] = useState<AdminCefrStats | null>(null);
  const [selectedWordIds, setSelectedWordIds] = useState<string[]>([]);

  // Tab state: 'words' | 'vocab-studio'
  const [adminWordsTab, setAdminWordsTab] = useState<'words' | 'vocab-studio'>(
    searchParams.get('studio') === 'true' ? 'vocab-studio' : 'words'
  );
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingWord, setEditingWord] = useState<AdminVocabularyItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => {
    if (showAddModal || editingWord) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showAddModal, editingWord]);

  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    word: '',
    pronunciation: '',
    partOfSpeech: 'NOUN',
    cefr: 'A1',
    meaning: '',
    definition: '',
    example: '',
  });

  const loadStats = async () => {
    try {
      const res = await adminApi.cefrStats();
      if (res.data) setCefrStats(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchWords = async (overrideSearch?: string) => {
    setLoading(true);
    try {
      const queryToUse = typeof overrideSearch === 'string' ? overrideSearch : search;
      const res = await adminApi.vocabulary(page, 20, cefrFilter, queryToUse, posFilter);
      if (res.data) {
        setWords(res.data.content || []);
        setTotalElements(res.data.totalElements || 0);
        setTotalPages(res.data.totalPages || 1);
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    if (searchParams.get('studio') === 'true') {
      setAdminWordsTab('vocab-studio');
    }
  }, [searchParams]);

  useEffect(() => {
    fetchWords();
  }, [page, cefrFilter, posFilter]);

  const handleSearch = (customQuery?: string) => {
    const q = typeof customQuery === 'string' ? customQuery : search;
    setPage(0);
    fetchWords(q);
  };

  const handleBulkAiTag = async () => {
    if (selectedWordIds.length === 0) return;
    try {
      setMessage({ text: `Đang khởi chạy gắn tag AI cho ${selectedWordIds.length} từ đã chọn...` });
      await adminApi.aiVocabTagBackfill({
        scope: 'IDS',
        wordIds: selectedWordIds,
        batchSize: 10,
        confidenceThreshold: 0.8,
      });
      setSelectedWordIds([]);
      setAdminWordsTab('vocab-studio');
    } catch (err: any) {
      setMessage({ text: 'Lỗi gắn tag AI: ' + (err?.response?.data?.message || err.message), error: true });
    }
  };

  const handleImportAll = async () => {
    if (!confirm('Khởi chạy Import toàn bộ 5 tệp CEFR (A1-C1) vào hệ thống? Thao tác này sẽ tự động bỏ qua từ trùng lặp.')) return;
    setImporting(true);
    setMessage({ text: 'Đang tiến hành import dữ liệu từ vựng CEFR, vui lòng chờ...' });
    try {
      const res = await adminApi.importAllCefr();
      setMessage({ text: 'Import thành công: ' + (res.data?.message || 'Đã cập nhật cơ sở dữ liệu!') });
      await loadStats();
      await fetchWords();
    } catch (e: any) {
      setMessage({ text: 'Lỗi import: ' + (e?.message || 'Lỗi server'), error: true });
    } finally {
      setImporting(false);
    }
  };

  const openAdd = () => {
    setFormData({
      word: '',
      pronunciation: '',
      partOfSpeech: 'NOUN',
      cefr: 'A1',
      meaning: '',
      definition: '',
      example: '',
    });
    setShowAddModal(true);
  };

  const openEdit = (w: AdminVocabularyItem) => {
    setEditingWord(w);
    setFormData({
      word: w.word,
      pronunciation: w.pronunciation || '',
      partOfSpeech: w.partOfSpeech || 'NOUN',
      cefr: w.cefr || 'A1',
      meaning: w.vietnameseMeaning || w.meaning || '',
      definition: w.definition || '',
      example: w.example || '',
    });
  };

  const handleSaveWord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.word.trim()) {
      alert('Vui lòng nhập từ vựng');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        level: formData.cefr,
        cefr: formData.cefr,
      };
      if (editingWord) {
        await adminApi.updateWord(editingWord.id, payload);
        setMessage({ text: `Đã cập nhật từ "${formData.word}" thành công!` });
        setEditingWord(null);
      } else {
        await adminApi.createWord(payload);
        setMessage({ text: `Đã thêm từ mới "${formData.word}" thành công!` });
        setShowAddModal(false);
      }
      await fetchWords();
      await loadStats();
      setTimeout(() => setMessage(null), 4000);
    } catch (e: any) {
      alert('Lỗi lưu từ vựng: ' + (e?.message || 'Vui lòng kiểm tra lại dữ liệu'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteWord = async (w: AdminVocabularyItem) => {
    if (!confirm(`Bạn có chắc muốn xóa từ "${w.word}" khỏi hệ thống?`)) return;
    try {
      await adminApi.deleteWord(w.id);
      setMessage({ text: `Đã xóa từ "${w.word}"!` });
      await fetchWords();
      await loadStats();
      setTimeout(() => setMessage(null), 4000);
    } catch (e: any) {
      alert('Lỗi khi xóa từ: ' + (e?.message || 'Không thể xóa'));
    }
  };

  const getCefrCount = (lvl: string) => {
    if (!cefrStats) return '';
    switch (lvl) {
      case 'A1': return cefrStats.a1Count ?? 898;
      case 'A2': return cefrStats.a2Count ?? 792;
      case 'B1': return cefrStats.b1Count ?? 690;
      case 'B2': return cefrStats.b2Count ?? 1297;
      case 'C1': return cefrStats.c1Count ?? 1277;
      default: return cefrStats.totalCount ?? 4954;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Header */}
      <div className="pagehead" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1>Từ vựng &amp; CEFR</h1>
          <div className="sub">
            {adminWordsTab === 'vocab-studio'
              ? 'Xưởng từ vựng AI · Tự động làm giàu dữ liệu và sinh từ vựng chuẩn Oxford CEFR'
              : <span>Kho <AnimatedCounter value={totalElements} /> từ vựng Oxford · quản lý theo cấp độ và loại từ</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            type="button"
            className="btn ghost"
            disabled={importing}
            onClick={handleImportAll}
          >
            <Icon n="zap" s={16} />
            {importing ? 'Đang Import...' : 'Import File CEFR'}
          </button>
          <button
            type="button"
            className="btn"
            onClick={openAdd}
          >
            <Icon n="plus" s={18} />
            Thêm từ mới
          </button>
        </div>
      </div>

      {message && (
        <div className={message.error ? 'error' : 'ok'}>
          {message.text}
        </div>
      )}

      {/* Sub-Tabs: Kho từ vựng vs Xưởng từ vựng AI */}
      <div className="chiprow">
        <button
          type="button"
          className={'fchip' + (adminWordsTab === 'words' ? ' on' : '')}
          onClick={() => setAdminWordsTab('words')}
          style={{ fontSize: 13.5, padding: '7px 16px' }}
        >
          <Icon n="book" s={15} />
          Kho từ vựng (<AnimatedCounter value={totalElements} />)
        </button>
        <button
          type="button"
          className={'fchip' + (adminWordsTab === 'vocab-studio' ? ' on' : '')}
          onClick={() => setAdminWordsTab('vocab-studio')}
          style={{ fontSize: 13.5, padding: '7px 16px' }}
        >
          <Icon n="spark" s={15} />
          Xưởng từ vựng AI
        </button>
      </div>

      {/* VIEW 1: VOCABULARY STUDIO */}
      {adminWordsTab === 'vocab-studio' ? (
        <AdminVocabStudio
          onSaved={() => {
            fetchWords();
            loadStats();
          }}
          onBackToWords={() => setAdminWordsTab('words')}
        />
      ) : (
        /* VIEW 2: WORDS LIST TABLE */
        <>
          {/* CEFR Level Filter Chips */}
      <div className="chiprow" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {CEFR_LEVELS.map((lvl) => {
          const count = getCefrCount(lvl);
          const isActive = cefrFilter === lvl;
          return (
            <motion.button
              key={lvl}
              type="button"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              className={'fchip' + (isActive ? ' on' : '')}
              onClick={() => {
                if (cefrFilter !== lvl) {
                  setCefrFilter(lvl);
                  setPage(0);
                }
              }}
              style={{
                position: 'relative',
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'border-color 0.2s ease, color 0.2s ease',
              }}
            >
              {isActive && (
                <motion.div
                  layoutId="active-cefr-chip"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'var(--primary)',
                    borderRadius: 999,
                    zIndex: 0,
                  }}
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              <span style={{ position: 'relative', zIndex: 1, color: isActive ? '#fff' : 'inherit' }}>
                {lvl === 'ALL' ? 'Tất cả' : lvl} {count !== '' && `· ${count}`}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Toolbar: Search + Part of Speech Filters */}
      <div className="toolbar">
        <div style={{ flex: 1, minWidth: 260 }}>
          <AutocompleteSearch
            value={search}
            onChange={setSearch}
            onSearch={handleSearch}
            placeholder="Tìm từ vựng trong kho..."
            type="admin-words"
            showButton={true}
            buttonText="Tìm kiếm"
            limit={8}
            inputStyle={{ minHeight: 46 }}
          />
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {POS_LIST.map((pos) => {
            const isActive = posFilter === pos.id;
            return (
              <motion.button
                key={pos.id}
                type="button"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                className={'fchip' + (isActive ? ' on' : '')}
                onClick={() => {
                  if (posFilter !== pos.id) {
                    setPosFilter(pos.id);
                    setPage(0);
                  }
                }}
                style={{
                  position: 'relative',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'border-color 0.2s ease, color 0.2s ease',
                }}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-pos-chip"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'var(--primary)',
                      borderRadius: 999,
                      zIndex: 0,
                    }}
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
                <span style={{ position: 'relative', zIndex: 1, color: isActive ? '#fff' : 'inherit' }}>
                  {pos.label}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Vocabulary Table Card */}
      <MotionCard className="card" style={{ padding: '20px 14px', position: 'relative', overflow: 'hidden' }}>
        {/* Subtle loading pulse bar on top */}
        {loading && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 3,
              overflow: 'hidden',
              background: 'rgba(21, 101, 192, 0.08)',
              zIndex: 5,
            }}
          >
            <div className="admin-loading-pulse-bar" />
          </div>
        )}

        <table className="atable">
          <thead>
            <tr>
              <th style={{ width: 44, textAlign: 'center' }}>
                <span
                  className={'cb' + (words.length > 0 && selectedWordIds.length === words.length ? ' on' : '')}
                  onClick={() => {
                    if (selectedWordIds.length === words.length) {
                      setSelectedWordIds([]);
                    } else {
                      setSelectedWordIds(words.map((w) => w.id));
                    }
                  }}
                  style={{ cursor: 'pointer', display: 'inline-flex' }}
                  title="Chọn tất cả từ trên trang này"
                >
                  {words.length > 0 && selectedWordIds.length === words.length && <Icon n="check" s={13} />}
                </span>
              </th>
              <th>Từ vựng</th>
              <th>Loại từ</th>
              <th>Nghĩa tiếng Việt</th>
              <th>Cấp độ</th>
              <th style={{ textAlign: 'right' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody
            style={{
              opacity: loading && words.length > 0 ? 0.45 : 1,
              transition: 'opacity 0.22s ease',
              pointerEvents: loading ? 'none' : 'auto',
            }}
          >
            {loading && words.length === 0 ? (
              Array.from({ length: 6 }).map((_, idx) => (
                <tr key={`skel-${idx}`}>
                  <td>
                    <div className="skeleton-cell" style={{ width: 20, margin: 'auto' }} />
                  </td>
                  <td>
                    <div className="skeleton-cell" style={{ width: '60%' }} />
                  </td>
                  <td>
                    <div className="skeleton-cell" style={{ width: 50, borderRadius: 999 }} />
                  </td>
                  <td>
                    <div className="skeleton-cell" style={{ width: '85%' }} />
                  </td>
                  <td>
                    <div className="skeleton-cell" style={{ width: 36, borderRadius: 999 }} />
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="skeleton-cell" style={{ width: 70, marginLeft: 'auto' }} />
                  </td>
                </tr>
              ))
            ) : words.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
                  Không tìm thấy từ vựng nào phù hợp.
                </td>
              </tr>
            ) : (
              words.map((w) => {
                const isSelected = selectedWordIds.includes(w.id);
                return (
                  <tr
                    key={w.id}
                    className="table-row-fade"
                    style={{ background: isSelected ? 'rgba(21, 101, 192, 0.04)' : undefined }}
                  >
                    <td style={{ width: 44, textAlign: 'center' }}>
                      <span
                        className={'cb' + (isSelected ? ' on' : '')}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedWordIds((prev) => prev.filter((id) => id !== w.id));
                          } else {
                            setSelectedWordIds((prev) => [...prev, w.id]);
                          }
                        }}
                        style={{ cursor: 'pointer', display: 'inline-flex' }}
                      >
                        {isSelected && <Icon n="check" s={13} />}
                      </span>
                    </td>
                    <td>
                      <b style={{ fontSize: 15.5 }}>{w.word}</b>{' '}
                      {w.pronunciation && (
                        <span className="sub">{w.pronunciation}</span>
                      )}
                    </td>
                    <td>
                      <span className="pill" style={{ fontSize: 11 }}>
                        {w.partOfSpeech || 'NOUN'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--ink)' }}>
                      {w.vietnameseMeaning || w.meaning || '—'}
                    </td>
                    <td>
                      <span className="pill level">{w.cefr || 'A1'}</span>
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button
                        type="button"
                        className="link"
                        onClick={() => openEdit(w)}
                        style={{ fontSize: 13.5, marginRight: 8 }}
                      >
                        Sửa
                      </button>
                      ·
                      <button
                        type="button"
                        className="link"
                        onClick={() => handleDeleteWord(w)}
                        style={{ fontSize: 13.5, color: 'var(--red-dark)', marginLeft: 8 }}
                      >
                        Xóa
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </MotionCard>

      {/* Floating Action Bar for Selected Words */}
      {selectedWordIds.length > 0 && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--ink)',
            color: '#fff',
            padding: '10px 22px',
            borderRadius: 999,
            boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            zIndex: 9999,
            backdropFilter: 'blur(8px)',
          }}
        >
          <span style={{ fontSize: 14 }}>
            Đã chọn <b>{selectedWordIds.length}</b> từ vựng
          </span>
          <button
            type="button"
            className="btn ghost sm"
            onClick={() => setSelectedWordIds([])}
            style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.35)', fontSize: 13 }}
          >
            Bỏ chọn
          </button>
          <button
            type="button"
            className="btn green sm"
            onClick={handleBulkAiTag}
            style={{ fontSize: 13, padding: '0 16px' }}
          >
            <Icon n="spark" s={14} />
            ⚡ Gắn tag AI cho {selectedWordIds.length} từ
          </button>
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="row" style={{ alignItems: 'center' }}>
          <span className="sub">
            Trang <b>{page + 1}</b> / <b>{totalPages}</b> · {totalElements.toLocaleString('vi-VN')} từ
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              className="pagebtn"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              ‹
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pNum = i;
              return (
                <button
                  key={pNum}
                  type="button"
                  className={'pagebtn' + (page === pNum ? ' on' : '')}
                  onClick={() => setPage(pNum)}
                >
                  {pNum + 1}
                </button>
              );
            })}
            <button
              type="button"
              className="pagebtn"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            >
              ›
            </button>
          </div>
        </div>
      )}
        </>
      )}

      {/* Add / Edit Word Modal */}
      {(showAddModal || editingWord) &&
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
            }}
          >
            <div
              className="scrim"
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 1,
                background: 'rgba(10, 37, 64, 0.55)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
              }}
              onClick={() => { setShowAddModal(false); setEditingWord(null); }}
            />
            <div
              className="modal"
              style={{
                position: 'relative',
                top: 'auto',
                left: 'auto',
                transform: 'none',
                maxWidth: 560,
                width: '100%',
                zIndex: 2,
                margin: 0,
                borderRadius: 24,
                boxShadow: '0 25px 70px rgba(10, 37, 64, 0.35)',
                background: '#ffffff',
                padding: '28px 30px',
                maxHeight: '90vh',
                overflowY: 'auto',
              }}
              onClick={(e) => e.stopPropagation()}
            >
            <div className="row" style={{ alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 20 }}>
                {editingWord ? `Chỉnh sửa từ: "${editingWord.word}"` : 'Thêm từ vựng mới'}
              </h2>
              <button
                type="button"
                className="btn ghost sm"
                onClick={() => { setShowAddModal(false); setEditingWord(null); }}
                style={{ padding: '4px 8px' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveWord} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 12 }}>
                <div className="field">
                  <label>Từ tiếng Anh (*)</label>
                  <input
                    className="input"
                    value={formData.word}
                    onChange={(e) => setFormData({ ...formData, word: e.target.value })}
                    placeholder="e.g. resilient"
                    required
                  />
                </div>
                <div className="field">
                  <label>Phiên âm IPA</label>
                  <input
                    className="input"
                    value={formData.pronunciation}
                    onChange={(e) => setFormData({ ...formData, pronunciation: e.target.value })}
                    placeholder="/rɪˈzɪliənt/"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="field">
                  <label>Loại từ</label>
                  <select
                    className="input"
                    value={formData.partOfSpeech}
                    onChange={(e) => setFormData({ ...formData, partOfSpeech: e.target.value })}
                  >
                    <option value="NOUN">Danh từ (Noun)</option>
                    <option value="VERB">Động từ (Verb)</option>
                    <option value="ADJECTIVE">Tính từ (Adjective)</option>
                    <option value="ADVERB">Phó từ (Adverb)</option>
                    <option value="PREPOSITION">Giới từ (Preposition)</option>
                    <option value="CONJUNCTION">Liên từ (Conjunction)</option>
                  </select>
                </div>
                <div className="field">
                  <label>Cấp độ CEFR</label>
                  <select
                    className="input"
                    value={formData.cefr}
                    onChange={(e) => setFormData({ ...formData, cefr: e.target.value })}
                  >
                    <option value="A1">A1 - Sơ cấp căn bản</option>
                    <option value="A2">A2 - Sơ cấp nâng cao</option>
                    <option value="B1">B1 - Trung cấp</option>
                    <option value="B2">B2 - Trung cấp nâng cao</option>
                    <option value="C1">C1 - Cao cấp</option>
                  </select>
                </div>
              </div>

              <div className="field">
                <label>Nghĩa tiếng Việt (*)</label>
                <input
                  className="input"
                  value={formData.meaning}
                  onChange={(e) => setFormData({ ...formData, meaning: e.target.value })}
                  placeholder="e.g. kiên cường, mau hồi phục"
                  required
                />
              </div>

              <div className="field">
                <label>Câu ví dụ (Example sentence)</label>
                <textarea
                  className="input"
                  value={formData.example}
                  onChange={(e) => setFormData({ ...formData, example: e.target.value })}
                  placeholder="e.g. She is a resilient leader who stays calm under pressure."
                  style={{ minHeight: 70 }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => { setShowAddModal(false); setEditingWord(null); }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn"
                  disabled={submitting}
                >
                  {submitting ? 'Đang lưu...' : editingWord ? 'Lưu cập nhật' : 'Thêm vào kho'}
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
