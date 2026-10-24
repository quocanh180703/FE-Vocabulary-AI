import { useEffect, useState } from 'react';
import {
  adminApi,
  type AiVocabAuditSummary,
  type AiGeneratedWordItem,
} from '../../api';
import { Icon } from '../../components/icons';

interface AdminVocabStudioProps {
  onSaved?: () => void;
  onBackToWords?: () => void;
}

export function AdminVocabStudio({ onSaved, onBackToWords }: AdminVocabStudioProps) {
  // Audit state
  const [vocabAudit, setVocabAudit] = useState<AiVocabAuditSummary | null>(null);
  const [loadingAudit, setLoadingAudit] = useState(false);

  // Studio mode & missing data state
  const [studioMode, setStudioMode] = useState<'enrich' | 'create'>('enrich');
  const [missingType, setMissingType] = useState<'example' | 'meaning' | 'pronunciation' | 'definition'>('example');
  const [missingLimit, setMissingLimit] = useState<number>(5);
  const [missingWords, setMissingWords] = useState<any[]>([]);
  const [selectedMissingIds, setSelectedMissingIds] = useState<(string | number)[]>([]);
  const [loadingMissing, setLoadingMissing] = useState(false);

  // Create new words state
  const [customWordsInput, setCustomWordsInput] = useState('');
  const [customLevelHint, setCustomLevelHint] = useState('B2');

  // Generation & review state
  const [generatingVocab, setGeneratingVocab] = useState(false);
  const [generatedWords, setGeneratedWords] = useState<AiGeneratedWordItem[]>([]);
  const [overwriteExisting, setOverwriteExisting] = useState(true);
  const [approving, setApproving] = useState(false);
  const [approvalNotice, setApprovalNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadVocabAuditData = async () => {
    setLoadingAudit(true);
    try {
      const res = await adminApi.aiVocabAudit();
      if (res?.data) setVocabAudit(res.data);
    } catch (err) {
      console.error('Failed to load vocab audit:', err);
    } finally {
      setLoadingAudit(false);
    }
  };

  const loadMissingWordsData = async (type: string, limit: number) => {
    setLoadingMissing(true);
    try {
      const res = await adminApi.aiVocabMissingData(type, limit);
      if (res?.data) {
        setMissingWords(res.data);
        setSelectedMissingIds(res.data.map((w: any) => w.id));
      }
    } catch (err) {
      console.error('Failed to load missing words:', err);
    } finally {
      setLoadingMissing(false);
    }
  };

  useEffect(() => {
    loadVocabAuditData();
    loadMissingWordsData(missingType, missingLimit);
  }, []);

  const toggleSelectAllMissing = () => {
    if (selectedMissingIds.length === missingWords.length) {
      setSelectedMissingIds([]);
    } else {
      setSelectedMissingIds(missingWords.map((w) => w.id));
    }
  };

  const toggleSelectOneMissing = (id: string | number) => {
    if (selectedMissingIds.includes(id)) {
      setSelectedMissingIds(selectedMissingIds.filter((item) => item !== id));
    } else {
      setSelectedMissingIds([...selectedMissingIds, id]);
    }
  };

  const handleGenerateVocab = async () => {
    setGeneratingVocab(true);
    setApprovalNotice(null);
    try {
      if (studioMode === 'enrich') {
        const wordsToEnrich = missingWords
          .filter((w) => selectedMissingIds.includes(w.id))
          .map((w) => w.word);
        if (wordsToEnrich.length === 0) {
          alert('Vui lòng chọn ít nhất một từ vựng để làm giàu dữ liệu!');
          setGeneratingVocab(false);
          return;
        }
        const res = await adminApi.aiVocabBatchGenerate(wordsToEnrich);
        if (res?.data) {
          setGeneratedWords(res.data);
        }
      } else {
        const wordsList = customWordsInput
          .split(/[\n,]+/)
          .map((w) => w.trim())
          .filter(Boolean);
        if (wordsList.length === 0) {
          alert('Vui lòng nhập danh sách từ cần tạo!');
          setGeneratingVocab(false);
          return;
        }
        const res = await adminApi.aiVocabBatchGenerate(wordsList, customLevelHint);
        if (res?.data) {
          setGeneratedWords(res.data);
        }
      }
    } catch (err: any) {
      console.error(err);
      alert('Không thể tạo dữ liệu từ vựng bằng AI: ' + (err?.message || 'Lỗi server'));
    } finally {
      setGeneratingVocab(false);
    }
  };

  const handleFieldChange = (idx: number, field: keyof AiGeneratedWordItem, value: any) => {
    setGeneratedWords((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: value };
      return copy;
    });
  };

  const handleRemoveGeneratedWord = (idx: number) => {
    setGeneratedWords((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleApproveAndSave = async () => {
    if (generatedWords.length === 0) return;
    setApproving(true);
    setApprovalNotice(null);
    try {
      const res = await adminApi.aiVocabApprove(generatedWords, overwriteExisting);
      const data = res?.data;
      setApprovalNotice({
        type: 'success',
        message: `Đã lưu thành công ${data?.savedCount || generatedWords.length} từ vựng vào Database!`,
      });
      setGeneratedWords([]);
      await loadVocabAuditData();
      await loadMissingWordsData(missingType, missingLimit);
      onSaved?.();
    } catch (err: any) {
      console.error(err);
      setApprovalNotice({
        type: 'error',
        message: 'Lỗi khi lưu từ vựng: ' + (err?.message || 'Vui lòng kiểm tra lại'),
      });
    } finally {
      setApproving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Top Banner / Breadcrumb */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '14px 20px', borderRadius: 20, boxShadow: 'var(--sh)', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(37, 99, 235, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon n="spark" s={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <b style={{ fontSize: 16, color: 'var(--ink)' }}>Xưởng từ vựng AI (Vocabulary Studio)</b>
              <span className="adminbadge">Gemini AI</span>
            </div>
            <div className="sub" style={{ fontSize: 12.5, margin: 0 }}>Tự động kiểm tra chất lượng kho từ, làm giàu câu ví dụ và sinh từ vựng chuẩn CEFR Oxford</div>
          </div>
        </div>

        {onBackToWords && (
          <button
            type="button"
            className="btn ghost sm"
            onClick={onBackToWords}
            style={{ fontSize: 13.5, padding: '6px 14px' }}
          >
            ← Quay lại kho từ vựng
          </button>
        )}
      </div>

      {/* Approval Notification Banner */}
      {approvalNotice && (
        <div className={approvalNotice.type === 'success' ? 'ok' : 'error'}>
          {approvalNotice.message}
        </div>
      )}

      {/* Audit Dashboard KPI Cards */}
      <div className="kpi-row">
        <div className="kpi">
          <div className="kic" style={{ background: 'var(--green-bg)', color: 'var(--green-dark)' }}>
            <Icon n="check" s={22} />
          </div>
          <div className="lbl">Tỷ lệ hoàn thiện dữ liệu</div>
          <div className="num">
            {vocabAudit ? `${vocabAudit.completenessRate}%` : '98.9%'}
          </div>
          <div className="delta up">Chuẩn Oxford CEFR</div>
        </div>

        <div className="kpi">
          <div className="kic" style={{ background: 'var(--tint)', color: 'var(--primary)' }}>
            <Icon n="book" s={22} />
          </div>
          <div className="lbl">Tổng kho từ vựng</div>
          <div className="num">
            {vocabAudit ? vocabAudit.totalWords.toLocaleString('vi-VN') : '4.962'}
          </div>
          <div className="delta up">
            <button
              type="button"
              className="link"
              onClick={() => {
                loadVocabAuditData();
                loadMissingWordsData(missingType, missingLimit);
              }}
              disabled={loadingAudit}
              style={{ fontSize: 13 }}
            >
              {loadingAudit ? 'Đang quét...' : 'Quét lại'}
            </button>
          </div>
        </div>

        <div className="kpi">
          <div className="kic" style={{ background: 'var(--yellow-bg)', color: 'var(--yellow-dark)' }}>
            <Icon n="spark" s={22} />
          </div>
          <div className="lbl">Thiếu ví dụ ngữ cảnh</div>
          <div className="num">
            {vocabAudit ? vocabAudit.wordsMissingExample.toLocaleString('vi-VN') : '112'}
          </div>
          <div className="delta up">
            <button
              type="button"
              className="link"
              onClick={() => {
                setStudioMode('enrich');
                setMissingType('example');
                loadMissingWordsData('example', missingLimit);
              }}
              style={{ fontSize: 13, color: 'var(--yellow-dark)' }}
            >
              Khắc phục ngay ›
            </button>
          </div>
        </div>

        <div className="kpi">
          <div className="kic" style={{ background: 'var(--red-bg)', color: 'var(--red-dark)' }}>
            <Icon n="spark" s={22} />
          </div>
          <div className="lbl">Thiếu nghĩa / Phiên âm</div>
          <div className="num">
            {vocabAudit
              ? (vocabAudit.wordsMissingMeaning + vocabAudit.wordsMissingPronunciation).toLocaleString('vi-VN')
              : '83'}
          </div>
          <div className="delta up">
            <button
              type="button"
              className="link"
              onClick={() => {
                setStudioMode('enrich');
                setMissingType('meaning');
                loadMissingWordsData('meaning', missingLimit);
              }}
              style={{ fontSize: 13, color: 'var(--red-dark)' }}
            >
              Bổ sung ngay ›
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Studio Workspace Card */}
      <div className="card">
        <div className="row" style={{ marginBottom: 16 }}>
          <div>
            <h2><span className="dot g" />Khu vực sinh nội dung từ vựng bằng AI</h2>
            <div className="sub">Tự động làm giàu các từ còn thiếu câu ví dụ / nghĩa tiếng Việt hoặc tạo bộ từ vựng mới theo chuẩn CEFR</div>
          </div>

          <div className="seg">
            <button
              type="button"
              className={studioMode === 'enrich' ? 'on' : ''}
              onClick={() => setStudioMode('enrich')}
            >
              Làm giàu từ thiếu
            </button>
            <button
              type="button"
              className={studioMode === 'create' ? 'on' : ''}
              onClick={() => setStudioMode('create')}
            >
              Tạo từ vựng mới
            </button>
          </div>
        </div>

        {/* Mode 1: Enrich Missing Words */}
        {studioMode === 'enrich' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="toolbar" style={{ flexWrap: 'wrap', gap: 10 }}>
              <div className="chiprow">
                {[
                  { id: 'example', label: 'Thiếu ví dụ' },
                  { id: 'meaning', label: 'Thiếu nghĩa VN' },
                  { id: 'pronunciation', label: 'Thiếu phiên âm IPA' },
                  { id: 'definition', label: 'Thiếu định nghĩa' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    className={'fchip' + (missingType === tab.id ? ' on' : '')}
                    onClick={() => {
                      setMissingType(tab.id as any);
                      loadMissingWordsData(tab.id, missingLimit);
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="sub">Số lượng:</span>
                <select
                  value={missingLimit}
                  onChange={(e) => {
                    const lim = Number(e.target.value);
                    setMissingLimit(lim);
                    loadMissingWordsData(missingType, lim);
                  }}
                  className="input"
                  style={{ minHeight: 38, padding: '0 10px', fontSize: 13.5, width: 80 }}
                >
                  <option value={3}>3 từ</option>
                  <option value={5}>5 từ</option>
                  <option value={10}>10 từ</option>
                  <option value={20}>20 từ</option>
                </select>

                <button
                  type="button"
                  className="btn"
                  onClick={handleGenerateVocab}
                  disabled={generatingVocab || selectedMissingIds.length === 0}
                  style={{ minHeight: 44, padding: '0 20px', fontSize: 14 }}
                >
                  <Icon n="spark" s={16} />
                  {generatingVocab ? 'Gemini đang sinh...' : `AI sinh dữ liệu (${selectedMissingIds.length})`}
                </button>
              </div>
            </div>

            {/* Missing Words Selection Table */}
            <div style={{ border: '1.5px solid var(--line)', borderRadius: 18, overflow: 'hidden' }}>
              <table className="atable">
                <thead>
                  <tr>
                    <th style={{ width: 44, textAlign: 'center' }}>
                      <span
                        className={'cb' + (selectedMissingIds.length === missingWords.length && missingWords.length > 0 ? ' on' : '')}
                        onClick={toggleSelectAllMissing}
                      >
                        {selectedMissingIds.length === missingWords.length && missingWords.length > 0 && <Icon n="check" s={13} />}
                      </span>
                    </th>
                    <th>Từ vựng</th>
                    <th>Loại từ</th>
                    <th>Cấp độ</th>
                    <th>Tình trạng thiếu dữ liệu</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingMissing ? (
                    <tr>
                      <td colSpan={5} style={{ padding: 30, textAlign: 'center', color: 'var(--muted)' }}>
                        Đang tải danh sách từ cần khắc phục...
                      </td>
                    </tr>
                  ) : missingWords.length > 0 ? (
                    missingWords.map((w) => {
                      const isSel = selectedMissingIds.includes(w.id);
                      return (
                        <tr key={w.id} onClick={() => toggleSelectOneMissing(w.id)} style={{ cursor: 'pointer' }}>
                          <td style={{ textAlign: 'center' }}>
                            <span className={'cb' + (isSel ? ' on' : '')}>
                              {isSel && <Icon n="check" s={13} />}
                            </span>
                          </td>
                          <td><b style={{ fontSize: 15.5 }}>{w.word}</b></td>
                          <td><span className="pill" style={{ fontSize: 11 }}>{w.partOfSpeech || 'NOUN'}</span></td>
                          <td><span className="pill level">{w.cefr || 'A1'}</span></td>
                          <td>
                            <span className="pill redsoft">
                              {missingType === 'example' && 'Chưa có câu ví dụ'}
                              {missingType === 'meaning' && 'Chưa có nghĩa tiếng Việt'}
                              {missingType === 'pronunciation' && 'Chưa có phiên âm IPA'}
                              {missingType === 'definition' && 'Chưa có định nghĩa Anh - Anh'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} style={{ padding: 30, textAlign: 'center', color: 'var(--green-dark)' }}>
                        ✓ Tuyệt vời! Không còn từ vựng nào thiếu trường dữ liệu này.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Mode 2: Create New Words Batch */}
        {studioMode === 'create' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="field">
              <label>Danh sách từ vựng cần sinh (mỗi từ một dòng hoặc cách nhau bằng dấu phẩy):</label>
              <textarea
                className="input"
                rows={4}
                placeholder="ví dụ: resilient, ambiguous, paradigm, serendipity"
                value={customWordsInput}
                onChange={(e) => setCustomWordsInput(e.target.value)}
              />
            </div>

            <div className="row" style={{ flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="sub">Cấp độ CEFR mục tiêu:</span>
                <select
                  value={customLevelHint}
                  onChange={(e) => setCustomLevelHint(e.target.value)}
                  className="input"
                  style={{ minHeight: 40, padding: '0 12px', fontSize: 13.5, width: 90 }}
                >
                  <option value="A1">A1</option>
                  <option value="A2">A2</option>
                  <option value="B1">B1</option>
                  <option value="B2">B2</option>
                  <option value="C1">C1</option>
                </select>
              </div>

              <button
                type="button"
                className="btn"
                onClick={handleGenerateVocab}
                disabled={generatingVocab || !customWordsInput.trim()}
                style={{ minHeight: 44, padding: '0 24px', fontSize: 14 }}
              >
                <Icon n="spark" s={16} />
                {generatingVocab ? 'Gemini đang phân tích & sinh...' : 'Bắt đầu sinh dữ liệu'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Generated Words Review & Approval Section */}
      {generatedWords.length > 0 && (
        <div className="card" style={{ padding: '20px 14px' }}>
          <div className="row" style={{ padding: '0 10px 14px', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <h2><span className="dot g" />Xem trước &amp; Duyệt dữ liệu do AI tạo ({generatedWords.length} từ)</h2>
              <div className="sub">Bạn có thể chỉnh sửa trực tiếp nội dung trước khi lưu chính thức vào cơ sở dữ liệu</div>
            </div>
            <button
              type="button"
              className="link"
              onClick={() => setGeneratedWords([])}
              style={{ color: 'var(--red-dark)', fontSize: 13.5 }}
            >
              Hủy danh sách này
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="atable">
              <thead>
                <tr>
                  <th>Từ vựng</th>
                  <th>Phiên âm IPA</th>
                  <th>Loại từ</th>
                  <th>Nghĩa tiếng Việt</th>
                  <th>Câu ví dụ &amp; Dịch nghĩa</th>
                  <th>CEFR</th>
                  <th style={{ textAlign: 'center' }}>Xóa</th>
                </tr>
              </thead>
              <tbody>
                {generatedWords.map((item, idx) => (
                  <tr key={idx}>
                    <td>
                      <input
                        className="input"
                        value={item.word}
                        onChange={(e) => handleFieldChange(idx, 'word', e.target.value)}
                        style={{ minHeight: 36, padding: '0 8px', fontSize: 14, fontWeight: 800, width: 120 }}
                      />
                    </td>
                    <td>
                      <input
                        className="input"
                        value={item.pronunciation || ''}
                        onChange={(e) => handleFieldChange(idx, 'pronunciation', e.target.value)}
                        style={{ minHeight: 36, padding: '0 8px', fontSize: 13, width: 110 }}
                      />
                    </td>
                    <td>
                      <select
                        className="input"
                        value={item.partOfSpeech || 'NOUN'}
                        onChange={(e) => handleFieldChange(idx, 'partOfSpeech', e.target.value)}
                        style={{ minHeight: 36, padding: '0 6px', fontSize: 12, width: 90 }}
                      >
                        <option value="NOUN">NOUN</option>
                        <option value="VERB">VERB</option>
                        <option value="ADJECTIVE">ADJ</option>
                        <option value="ADVERB">ADV</option>
                      </select>
                    </td>
                    <td>
                      <input
                        className="input"
                        value={item.meaning || ''}
                        onChange={(e) => handleFieldChange(idx, 'meaning', e.target.value)}
                        style={{ minHeight: 36, padding: '0 8px', fontSize: 13.5, width: 160 }}
                      />
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <input
                          className="input"
                          value={item.example || ''}
                          onChange={(e) => handleFieldChange(idx, 'example', e.target.value)}
                          placeholder="Câu ví dụ tiếng Anh"
                          style={{ minHeight: 34, padding: '0 8px', fontSize: 13, width: 260 }}
                        />
                        <input
                          className="input"
                          value={item.exampleTranslation || ''}
                          onChange={(e) => handleFieldChange(idx, 'exampleTranslation', e.target.value)}
                          placeholder="Dịch nghĩa tiếng Việt"
                          style={{ minHeight: 34, padding: '0 8px', fontSize: 12.5, width: 260, color: 'var(--muted)' }}
                        />
                      </div>
                    </td>
                    <td>
                      <select
                        className="input"
                        value={item.level || 'B2'}
                        onChange={(e) => handleFieldChange(idx, 'level', e.target.value)}
                        style={{ minHeight: 36, padding: '0 6px', fontSize: 12, width: 68 }}
                      >
                        <option value="A1">A1</option>
                        <option value="A2">A2</option>
                        <option value="B1">B1</option>
                        <option value="B2">B2</option>
                        <option value="C1">C1</option>
                      </select>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        className="link"
                        onClick={() => handleRemoveGeneratedWord(idx)}
                        style={{ color: 'var(--red-dark)' }}
                        title="Xóa từ"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bottom Actions */}
          <div className="row" style={{ padding: '16px 10px 0', borderTop: '1.5px dashed var(--line)', marginTop: 12, flexWrap: 'wrap', gap: 12 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, fontWeight: 700, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={overwriteExisting}
                onChange={(e) => setOverwriteExisting(e.target.checked)}
                style={{ width: 16, height: 16 }}
              />
              <span>Ghi đè nội dung nếu từ đã có trong Database</span>
            </label>

            <button
              type="button"
              className="btn green"
              onClick={handleApproveAndSave}
              disabled={approving}
              style={{ minHeight: 46, padding: '0 26px' }}
            >
              <Icon n="check" s={18} />
              {approving ? 'Đang lưu vào Database...' : `Phê duyệt & Lưu vào Database (${generatedWords.length} từ)`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
