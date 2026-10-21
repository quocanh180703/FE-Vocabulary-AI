import { useEffect, useState } from 'react';
import { adminApi } from '../../api';
import type { AdminVocabularyItem, AdminCefrStats } from '../../api';
import { Icon } from '../../components/icons';
import { AutocompleteSearch } from '../../components/AutocompleteSearch';

const CEFR_LEVELS = ['ALL', 'A1', 'A2', 'B1', 'B2', 'C1'];
const POS_LIST = ['ALL', 'NOUN', 'VERB', 'ADJECTIVE', 'ADVERB', 'PREPOSITION', 'CONJUNCTION', 'PRONOUN', 'DETERMINER'];

export default function AdminWords() {
  const [words, setWords] = useState<AdminVocabularyItem[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(0);
  const [cefrFilter, setCefrFilter] = useState('ALL');
  const [posFilter, setPosFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [cefrStats, setCefrStats] = useState<AdminCefrStats | null>(null);

  // Modals state
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

  return (
    <div style={{ maxWidth: 1240, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: '1.9rem', fontWeight: 900, margin: 0, color: '#0F172A', letterSpacing: '-0.5px' }}>
            Kho Từ Vựng & Khung Năng Lực CEFR
          </h1>
          <p style={{ margin: '4px 0 0 0', color: '#64748B', fontSize: '0.94rem' }}>
            Quản trị {totalElements.toLocaleString('vi-VN')} từ vựng chuẩn Cambridge / Oxford (A1 - C1)
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={handleImportAll}
            disabled={importing}
            style={{
              background: '#059669',
              color: '#FFFFFF',
              border: 'none',
              padding: '10px 18px',
              borderRadius: 12,
              fontWeight: 700,
              cursor: importing ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)'
            }}
          >
            <Icon n="zap" s={18} />
            {importing ? 'Đang Import...' : 'Import File CEFR'}
          </button>
          <button
            onClick={openAdd}
            style={{
              background: '#4F46E5',
              color: '#FFFFFF',
              border: 'none',
              padding: '10px 20px',
              borderRadius: 12,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)'
            }}
          >
            <Icon n="spark" s={18} />
            Thêm từ mới
          </button>
        </div>
      </div>

      {message && (
        <div style={{
          background: message.error ? '#FEE2E2' : '#D1FAE5',
          color: message.error ? '#991B1B' : '#065F46',
          border: `1px solid ${message.error ? '#FCA5A5' : '#6EE7B7'}`,
          padding: '12px 18px',
          borderRadius: 12,
          marginBottom: 20,
          fontWeight: 600,
          fontSize: '0.92rem'
        }}>
          {message.text}
        </div>
      )}

      {/* CEFR Level Bar Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
        gap: 14,
        marginBottom: 22
      }}>
        {[
          { level: 'A1', label: 'Căn bản', count: cefrStats?.a1Count ?? 898, color: '#10B981' },
          { level: 'A2', label: 'Sơ cấp', count: cefrStats?.a2Count ?? 792, color: '#06B6D4' },
          { level: 'B1', label: 'Trung cấp', count: cefrStats?.b1Count ?? 690, color: '#3B82F6' },
          { level: 'B2', label: 'Trung cao', count: cefrStats?.b2Count ?? 1297, color: '#8B5CF6' },
          { level: 'C1', label: 'Cao cấp', count: cefrStats?.c1Count ?? 1277, color: '#EC4899' },
        ].map((item) => (
          <div
            key={item.level}
            onClick={() => { setCefrFilter(item.level); setPage(0); }}
            style={{
              background: cefrFilter === item.level ? item.color : '#FFFFFF',
              color: cefrFilter === item.level ? '#FFFFFF' : '#1E293B',
              border: `1px solid ${cefrFilter === item.level ? item.color : '#E2E8F0'}`,
              borderRadius: 14,
              padding: '14px 18px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: cefrFilter === item.level ? `0 6px 16px ${item.color}40` : '0 2px 6px rgba(0,0,0,0.02)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 800, fontSize: '1.2rem' }}>{item.level}</span>
              <span style={{ fontSize: '0.78rem', fontWeight: 600, opacity: 0.85 }}>{item.label}</span>
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: 4 }}>
              {item.count.toLocaleString('vi-VN')} <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>từ</span>
            </div>
          </div>
        ))}
      </div>

      {/* Filter & Search Bar */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: 16,
        padding: '16px 20px',
        border: '1px solid #E2E8F0',
        marginBottom: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 14
      }}>
        <div style={{ flex: 1, minWidth: 280 }}>
          <AutocompleteSearch
            value={search}
            onChange={setSearch}
            onSearch={handleSearch}
            placeholder="Tìm theo từ vựng hoặc nghĩa tiếng Việt (app, apple, difference...)..."
            type="admin-words"
            showButton={true}
            buttonText="Tìm kiếm"
            limit={8}
          />
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748B' }}>CEFR:</span>
            <select
              value={cefrFilter}
              onChange={(e) => { setCefrFilter(e.target.value); setPage(0); }}
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid #CBD5E1',
                fontWeight: 600,
                fontSize: '0.88rem',
                outline: 'none',
                background: '#FFFFFF'
              }}
            >
              {CEFR_LEVELS.map((lvl) => (
                <option key={lvl} value={lvl}>{lvl === 'ALL' ? 'Tất cả cấp độ' : `Cấp độ ${lvl}`}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748B' }}>Từ loại:</span>
            <select
              value={posFilter}
              onChange={(e) => { setPosFilter(e.target.value); setPage(0); }}
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid #CBD5E1',
                fontWeight: 600,
                fontSize: '0.88rem',
                outline: 'none',
                background: '#FFFFFF'
              }}
            >
              {POS_LIST.map((p) => (
                <option key={p} value={p}>{p === 'ALL' ? 'Tất cả từ loại' : p}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Words Table */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: 18,
        border: '1px solid #E2E8F0',
        overflow: 'hidden',
        boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
        marginBottom: 20
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B' }}>
                <th style={{ padding: '14px 18px' }}>Từ Vựng</th>
                <th style={{ padding: '14px 18px' }}>Phát âm</th>
                <th style={{ padding: '14px 18px' }}>Từ loại</th>
                <th style={{ padding: '14px 18px' }}>Cấp độ</th>
                <th style={{ padding: '14px 18px' }}>Nghĩa Tiếng Việt</th>
                <th style={{ padding: '14px 18px' }}>Định nghĩa / Ví dụ</th>
                <th style={{ padding: '14px 18px', textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>
                    Đang tải danh sách từ vựng...
                  </td>
                </tr>
              ) : words.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>
                    Không có từ vựng nào khớp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                words.map((w) => (
                  <tr key={w.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '14px 18px', fontWeight: 800, color: '#0F172A', fontSize: '1rem' }}>
                      {w.word}
                    </td>
                    <td style={{ padding: '14px 18px', color: '#64748B', fontFamily: 'monospace' }}>
                      {w.pronunciation || '—'}
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      <span style={{
                        padding: '2px 8px',
                        background: '#F1F5F9',
                        borderRadius: 6,
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        color: '#475569'
                      }}>
                        {w.partOfSpeech || 'NOUN'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: 6,
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        color: '#FFFFFF',
                        background:
                          w.cefr === 'A1' ? '#10B981' :
                          w.cefr === 'A2' ? '#06B6D4' :
                          w.cefr === 'B1' ? '#3B82F6' :
                          w.cefr === 'B2' ? '#8B5CF6' : '#EC4899'
                      }}>
                        {w.cefr || 'A1'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 18px', fontWeight: 600, color: '#0F172A', maxWidth: 260 }}>
                      {w.vietnameseMeaning || w.meaning || '—'}
                    </td>
                    <td style={{ padding: '14px 18px', color: '#64748B', maxWidth: 280, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={w.definition || w.example || ''}>
                      {w.definition || w.example || '—'}
                    </td>
                    <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        <button
                          onClick={() => openEdit(w)}
                          style={{
                            background: '#F1F5F9',
                            border: '1px solid #E2E8F0',
                            color: '#4F46E5',
                            padding: '5px 10px',
                            borderRadius: 8,
                            fontSize: '0.82rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          Sửa
                        </button>
                        <button
                          onClick={() => handleDeleteWord(w)}
                          style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            color: '#DC2626',
                            padding: '5px 10px',
                            borderRadius: 8,
                            fontSize: '0.82rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{
            padding: '14px 20px',
            borderTop: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#F8FAFC'
          }}>
            <span style={{ fontSize: '0.88rem', color: '#64748B' }}>
              Trang <b>{page + 1}</b> / <b>{totalPages}</b>
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                style={{
                  padding: '6px 14px',
                  borderRadius: 8,
                  border: '1px solid #CBD5E1',
                  background: page === 0 ? '#F1F5F9' : '#FFFFFF',
                  color: page === 0 ? '#94A3B8' : '#334155',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: page === 0 ? 'not-allowed' : 'pointer'
                }}
              >
                Trang trước
              </button>
              <button
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                style={{
                  padding: '6px 14px',
                  borderRadius: 8,
                  border: '1px solid #CBD5E1',
                  background: page >= totalPages - 1 ? '#F1F5F9' : '#FFFFFF',
                  color: page >= totalPages - 1 ? '#94A3B8' : '#334155',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer'
                }}
              >
                Trang kế tiếp
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Word Modal */}
      {(showAddModal || editingWord) && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 20
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: 22,
            padding: '28px 32px',
            maxWidth: 580,
            width: '100%',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            position: 'relative'
          }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 18px 0', color: '#0F172A' }}>
              {editingWord ? `Chỉnh sửa từ: "${editingWord.word}"` : 'Thêm từ vựng mới'}
            </h2>

            <form onSubmit={handleSaveWord}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    Từ tiếng Anh (*)
                  </label>
                  <input
                    type="text"
                    required
                    disabled={Boolean(editingWord)}
                    value={formData.word}
                    onChange={(e) => setFormData({ ...formData, word: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    Phiên âm IPA
                  </label>
                  <input
                    type="text"
                    placeholder="/.../"
                    value={formData.pronunciation}
                    onChange={(e) => setFormData({ ...formData, pronunciation: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    Cấp độ CEFR
                  </label>
                  <select
                    value={formData.cefr}
                    onChange={(e) => setFormData({ ...formData, cefr: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', boxSizing: 'border-box', background: '#FFFFFF' }}
                  >
                    {['A1', 'A2', 'B1', 'B2', 'C1'].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    Từ loại (POS)
                  </label>
                  <select
                    value={formData.partOfSpeech}
                    onChange={(e) => setFormData({ ...formData, partOfSpeech: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', boxSizing: 'border-box', background: '#FFFFFF' }}
                  >
                    {POS_LIST.filter((p) => p !== 'ALL').map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  Nghĩa Tiếng Việt (*)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: xinh đẹp, rực rỡ"
                  value={formData.meaning}
                  onChange={(e) => setFormData({ ...formData, meaning: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  Định nghĩa tiếng Anh
                </label>
                <input
                  type="text"
                  placeholder="pleasing to look at; attractive"
                  value={formData.definition}
                  onChange={(e) => setFormData({ ...formData, definition: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  Câu ví dụ minh họa
                </label>
                <input
                  type="text"
                  placeholder="She has a beautiful smile."
                  value={formData.example}
                  onChange={(e) => setFormData({ ...formData, example: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); setEditingWord(null); }}
                  style={{
                    background: '#F1F5F9',
                    color: '#334155',
                    border: '1px solid #CBD5E1',
                    padding: '10px 18px',
                    borderRadius: 10,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    background: '#4F46E5',
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '10px 22px',
                    borderRadius: 10,
                    fontWeight: 700,
                    cursor: submitting ? 'wait' : 'pointer',
                    boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)'
                  }}
                >
                  {submitting ? 'Đang lưu...' : 'Lưu từ vựng'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
