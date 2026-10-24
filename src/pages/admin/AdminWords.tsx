import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { adminApi } from '../../api';
import type { AdminVocabularyItem, AdminCefrStats } from '../../api';
import { Icon } from '../../components/icons';
import { AutocompleteSearch } from '../../components/AutocompleteSearch';
import { AdminVocabStudio } from './AdminVocabStudio';

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

  // Tab state: 'words' | 'vocab-studio'
  const [adminWordsTab, setAdminWordsTab] = useState<'words' | 'vocab-studio'>(
    searchParams.get('studio') === 'true' ? 'vocab-studio' : 'words'
  );
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingWord, setEditingWord] = useState<AdminVocabularyItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
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
              : `Kho ${totalElements.toLocaleString('vi-VN')} từ vựng Oxford · quản lý theo cấp độ và loại từ`}
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
          Kho từ vựng ({totalElements.toLocaleString('vi-VN')})
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
      <div className="chiprow">
        {CEFR_LEVELS.map((lvl) => {
          const count = getCefrCount(lvl);
          return (
            <button
              key={lvl}
              type="button"
              className={'fchip' + (cefrFilter === lvl ? ' on' : '')}
              onClick={() => {
                setCefrFilter(lvl);
                setPage(0);
              }}
            >
              {lvl === 'ALL' ? 'Tất cả' : lvl} {count !== '' && `· ${count}`}
            </button>
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

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {POS_LIST.map((pos) => (
            <button
              key={pos.id}
              type="button"
              className={'fchip' + (posFilter === pos.id ? ' on' : '')}
              onClick={() => {
                setPosFilter(pos.id);
                setPage(0);
              }}
            >
              {pos.label}
            </button>
          ))}
        </div>
      </div>

      {/* Vocabulary Table Card */}
      <div className="card" style={{ padding: '20px 14px' }}>
        <table className="atable">
          <thead>
            <tr>
              <th>Từ vựng</th>
              <th>Loại từ</th>
              <th>Nghĩa tiếng Việt</th>
              <th>Cấp độ</th>
              <th style={{ textAlign: 'right' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
                  Đang tải danh sách từ vựng...
                </td>
              </tr>
            ) : words.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
                  Không tìm thấy từ vựng nào phù hợp.
                </td>
              </tr>
            ) : (
              words.map((w) => (
                <tr key={w.id}>
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
              ))
            )}
          </tbody>
        </table>
      </div>

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
      {(showAddModal || editingWord) && (
        <>
          <div className="scrim" onClick={() => { setShowAddModal(false); setEditingWord(null); }} />
          <div className="modal" style={{ maxWidth: 560 }}>
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
        </>
      )}
    </div>
  );
}
