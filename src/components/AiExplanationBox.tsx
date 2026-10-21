import React, { useState } from 'react';
import { Mascot, Icon } from './icons';

export interface AiExplanationBoxProps {
  explanation: string;
  compact?: boolean;
}

type SectionKey = 'examples' | 'synonyms_antonyms' | 'context' | 'mistakes' | 'memory_tips';

interface SectionConfig {
  key: SectionKey;
  title: string;
  icon: string;
  badgeBg: string;
  badgeColor: string;
  borderColor: string;
  bgColor: string;
}

const SECTION_MAP: Record<SectionKey, SectionConfig> = {
  examples: {
    key: 'examples',
    title: 'Ví dụ thực tế',
    icon: '💡',
    badgeBg: '#e0f2fe',
    badgeColor: '#0284c7',
    borderColor: '#bae6fd',
    bgColor: '#f8fafc',
  },
  synonyms_antonyms: {
    key: 'synonyms_antonyms',
    title: 'Synonyms & Antonyms',
    icon: '🔗',
    badgeBg: '#f3e8ff',
    badgeColor: '#7c3aed',
    borderColor: '#e9d5ff',
    bgColor: '#faf5ff',
  },
  context: {
    key: 'context',
    title: 'Ngữ cảnh sử dụng',
    icon: '🎯',
    badgeBg: '#fef3c7',
    badgeColor: '#d97706',
    borderColor: '#fde68a',
    bgColor: '#fffdf5',
  },
  mistakes: {
    key: 'mistakes',
    title: 'Lỗi thường gặp',
    icon: '⚠️',
    badgeBg: '#ffe4e6',
    badgeColor: '#e11d48',
    borderColor: '#fecdd3',
    bgColor: '#fff5f5',
  },
  memory_tips: {
    key: 'memory_tips',
    title: 'Mẹo ghi nhớ',
    icon: '🧠',
    badgeBg: '#dcfce7',
    badgeColor: '#16a34a',
    borderColor: '#bbf7d0',
    bgColor: '#f4fbf6',
  },
};

/** Only top-level headers (starting with # or 1., 2., 3., 4., 5.) can be section headers */
function detectMainSection(line: string): SectionKey | null {
  const trimmed = line.trim();
  // Bullets like "- ", "* ", "+ " are NEVER main section headers
  if (/^[-*•+]\s/.test(trimmed)) return null;

  const isHeading =
    trimmed.startsWith('#') ||
    /^(?:(?:[1-5]\.|\([1-5]\))\s*|\*\*(?:[1-5]\.|\([1-5]\))\s*)/.test(trimmed) ||
    /^(?:\*\*)?(?:ví dụ thực tế|synonyms\s*&\s*antonyms|ngữ cảnh sử dụng|lỗi thường gặp|mẹo ghi nhớ)/i.test(trimmed);

  if (!isHeading) return null;

  if (/(?:ví dụ thực tế|example sentence|câu ví dụ)/i.test(trimmed) || /^(?:#{1,4}\s*)?1[\.\)]/i.test(trimmed)) {
    return 'examples';
  }
  if (/(?:synonym|antonym|đồng nghĩa|trái nghĩa)/i.test(trimmed) || /^(?:#{1,4}\s*)?2[\.\)]/i.test(trimmed)) {
    return 'synonyms_antonyms';
  }
  if (/(?:ngữ cảnh sử dụng|ngữ cảnh|bối cảnh|context)/i.test(trimmed) || /^(?:#{1,4}\s*)?3[\.\)]/i.test(trimmed)) {
    return 'context';
  }
  if (/(?:lỗi thường gặp|lỗi hay gặp|sai lầm|mistake)/i.test(trimmed) || /^(?:#{1,4}\s*)?4[\.\)]/i.test(trimmed)) {
    return 'mistakes';
  }
  if (/(?:mẹo ghi nhớ|mẹo nhớ|memory tip)/i.test(trimmed) || /^(?:#{1,4}\s*)?5[\.\)]/i.test(trimmed)) {
    return 'memory_tips';
  }
  return null;
}

interface TableItem {
  word: string;
  meaning: string;
}

/** Parses Synonyms & Antonyms lines into Antonyms (left) and Synonyms (right) */
function parseSynonymsAntonyms(lines: string[]): { antonyms: TableItem[]; synonyms: TableItem[] } {
  let mode: 'antonym' | 'synonym' | null = null;
  const antonyms: TableItem[] = [];
  const synonyms: TableItem[] = [];

  function extractItems(raw: string, targetList: TableItem[]) {
    const clean = raw.replace(/^[-*•+\d\.\)]+\s*/, '').trim();
    if (!clean) return;
    if (clean.includes(':')) {
      const [w, ...rest] = clean.split(':');
      targetList.push({ word: w.replace(/\*\*/g, '').trim(), meaning: rest.join(':').trim() });
    } else if (clean.includes(' - ')) {
      const [w, ...rest] = clean.split(' - ');
      targetList.push({ word: w.replace(/\*\*/g, '').trim(), meaning: rest.join(' - ').trim() });
    } else {
      const parts = clean.split(',');
      for (const p of parts) {
        if (p.trim()) targetList.push({ word: p.replace(/\*\*/g, '').trim(), meaning: '' });
      }
    }
  }

  for (const line of lines) {
    const t = line.trim();
    if (/trái nghĩa|antonym/i.test(t) && !/đồng nghĩa|synonym/i.test(t)) {
      mode = 'antonym';
      const afterColon = t.split(/:\s*(.*)/)[1];
      if (afterColon && afterColon.trim()) {
        extractItems(afterColon, antonyms);
      }
      continue;
    }
    if (/đồng nghĩa|synonym/i.test(t) && !/trái nghĩa|antonym/i.test(t)) {
      mode = 'synonym';
      const afterColon = t.split(/:\s*(.*)/)[1];
      if (afterColon && afterColon.trim()) {
        extractItems(afterColon, synonyms);
      }
      continue;
    }
    if (t.startsWith('#')) continue;

    if (mode === 'antonym') {
      extractItems(t, antonyms);
    } else if (mode === 'synonym') {
      extractItems(t, synonyms);
    }
  }
  return { antonyms, synonyms };
}

/** Parse inline Markdown bold (**...**) and italic (*...*) */
function renderInlineFormatting(text: string): React.ReactNode {
  const boldParts = text.split(/(\*\*[^*]+\*\*)/g);
  return boldParts.map((bPart, bIdx) => {
    if (bPart.startsWith('**') && bPart.endsWith('**')) {
      return (
        <strong key={bIdx} style={{ color: '#0f172a', fontWeight: 700 }}>
          {bPart.slice(2, -2)}
        </strong>
      );
    }
    const italicParts = bPart.split(/(\*[^*]+\*)/g);
    return italicParts.map((iPart, iIdx) => {
      if (iPart.startsWith('*') && iPart.endsWith('*')) {
        return (
          <em key={`${bIdx}-${iIdx}`} style={{ color: '#475569', fontStyle: 'italic' }}>
            {iPart.slice(1, -1)}
          </em>
        );
      }
      return iPart;
    });
  });
}

export const AiExplanationBox: React.FC<AiExplanationBoxProps> = ({ explanation, compact }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!explanation) return;
    navigator.clipboard.writeText(explanation).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (!explanation) return null;

  // Split into lines
  const rawLines = explanation.split('\n');

  // Fixed section buckets to strictly prevent duplicate sections
  const sectionData: Record<SectionKey, string[]> = {
    examples: [],
    synonyms_antonyms: [],
    context: [],
    mistakes: [],
    memory_tips: [],
  };

  let currentKey: SectionKey | null = null;
  const unsectionedLines: string[] = [];

  for (const line of rawLines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const detected = detectMainSection(trimmed);
    if (detected) {
      currentKey = detected;
      continue;
    }

    if (currentKey) {
      sectionData[currentKey].push(trimmed);
    } else {
      unsectionedLines.push(trimmed);
    }
  }

  // Check if at least 2 structured sections were detected
  const activeKeys = (Object.keys(sectionData) as SectionKey[]).filter(
    (k) => sectionData[k].length > 0
  );
  const hasParsedSections = activeKeys.length >= 2;

  // Parse synonyms & antonyms for 2-column table
  const { antonyms, synonyms } = parseSynonymsAntonyms(sectionData.synonyms_antonyms);
  const maxTableRows = Math.max(antonyms.length, synonyms.length);

  return (
    <div
      className="card"
      onClick={(e) => e.stopPropagation()}
      style={{
        background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)',
        borderColor: '#cbd5e1',
        padding: compact ? '14px 16px' : '20px 22px',
        fontSize: compact ? 13 : 14,
        lineHeight: 1.6,
        textAlign: 'left',
        width: '100%',
        boxShadow: '0 4px 16px rgba(15, 23, 42, 0.05)',
        borderRadius: 14,
        maxHeight: compact ? 420 : undefined,
        overflowY: compact ? 'auto' : undefined,
      }}
    >
      {/* Header bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 14,
          paddingBottom: 10,
          borderBottom: '1px solid #e2e8f0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Mascot s={compact ? 28 : 34} />
          <div>
            <div
              style={{
                fontWeight: 800,
                color: '#0369a1',
                fontSize: compact ? 13 : 15,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              Vi giải thích chuyên sâu
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  background: '#e0f2fe',
                  color: '#0284c7',
                  padding: '2px 8px',
                  borderRadius: 99,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                AI Pro
              </span>
            </div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>
              5 phần: Ví dụ · Bảng Đồng/Trái nghĩa · Ngữ cảnh · Lỗi sai · Mẹo nhớ
            </div>
          </div>
        </div>

        <button
          onClick={handleCopy}
          className="btn ghost sm"
          style={{
            fontSize: 11,
            padding: '4px 10px',
            height: 28,
            color: copied ? '#16a34a' : '#64748b',
            borderColor: copied ? '#86efac' : '#cbd5e1',
            background: copied ? '#f0fdf4' : '#ffffff',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
          title="Sao chép nội dung giải thích"
        >
          <Icon n={copied ? 'check' : 'copy'} s={12} />
          {copied ? 'Đã sao chép!' : 'Sao chép'}
        </button>
      </div>

      {/* Unsectioned Intro if any */}
      {unsectionedLines.length > 0 && (
        <div
          style={{
            marginBottom: 14,
            padding: '8px 12px',
            background: '#f1f5f9',
            borderRadius: 8,
            fontSize: compact ? 12 : 13,
            color: '#334155',
          }}
        >
          {unsectionedLines.map((l, idx) => (
            <div key={idx}>{renderInlineFormatting(l)}</div>
          ))}
        </div>
      )}

      {/* Render 5 Structured Sections (strictly 1 time each, no duplicates) */}
      {hasParsedSections ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* 1. Ví dụ thực tế */}
          {sectionData.examples.length > 0 && (
            <div
              style={{
                borderRadius: 10,
                border: `1px solid ${SECTION_MAP.examples.borderColor}`,
                background: SECTION_MAP.examples.bgColor,
                padding: '10px 14px',
              }}
            >
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: SECTION_MAP.examples.badgeBg,
                  color: SECTION_MAP.examples.badgeColor,
                  padding: '3px 10px',
                  borderRadius: 6,
                  fontWeight: 700,
                  fontSize: compact ? 11 : 12,
                  marginBottom: 8,
                }}
              >
                <span>{SECTION_MAP.examples.icon}</span>
                <span>{SECTION_MAP.examples.title}</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, color: '#1e293b' }}>
                {sectionData.examples.map((line, lIdx) => {
                  const isBullet = line.startsWith('- ') || line.startsWith('* ');
                  const cleanText = isBullet ? line.slice(2).trim() : line;
                  const isTranslation =
                    cleanText.startsWith('(') ||
                    cleanText.startsWith('*(') ||
                    cleanText.startsWith('->') ||
                    cleanText.startsWith('*(Dịch') ||
                    cleanText.startsWith('*(Nghĩa');

                  return (
                    <div
                      key={lIdx}
                      style={{
                        paddingLeft: isTranslation ? 16 : isBullet ? 4 : 0,
                        fontSize: isTranslation ? (compact ? 11.5 : 12.5) : (compact ? 12.5 : 13.5),
                        color: isTranslation ? '#64748b' : '#1e293b',
                        fontStyle: isTranslation ? 'italic' : 'normal',
                        display: isBullet && !isTranslation ? 'flex' : 'block',
                        gap: 6,
                        lineHeight: 1.5,
                      }}
                    >
                      {isBullet && !isTranslation && (
                        <span style={{ color: SECTION_MAP.examples.badgeColor, fontWeight: 700 }}>•</span>
                      )}
                      <div>{renderInlineFormatting(cleanText)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. Synonyms & Antonyms (Bảng 2 cột: Trái nghĩa cột trái, Đồng nghĩa cột phải) */}
          {sectionData.synonyms_antonyms.length > 0 && (
            <div
              style={{
                borderRadius: 10,
                border: `1px solid ${SECTION_MAP.synonyms_antonyms.borderColor}`,
                background: SECTION_MAP.synonyms_antonyms.bgColor,
                padding: '10px 14px',
              }}
            >
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: SECTION_MAP.synonyms_antonyms.badgeBg,
                  color: SECTION_MAP.synonyms_antonyms.badgeColor,
                  padding: '3px 10px',
                  borderRadius: 6,
                  fontWeight: 700,
                  fontSize: compact ? 11 : 12,
                  marginBottom: 8,
                }}
              >
                <span>{SECTION_MAP.synonyms_antonyms.icon}</span>
                <span>{SECTION_MAP.synonyms_antonyms.title}</span>
              </div>

              {/* Bảng so sánh 2 cột: Cột trái = Trái nghĩa (Antonyms), Cột phải = Đồng nghĩa (Synonyms) */}
              {maxTableRows > 0 ? (
                <div
                  style={{
                    overflowX: 'auto',
                    borderRadius: 8,
                    border: '1px solid #e9d5ff',
                    background: '#ffffff',
                    marginTop: 6,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  }}
                >
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: compact ? 12 : 13 }}>
                    <thead>
                      <tr style={{ background: '#faf5ff', borderBottom: '1px solid #e9d5ff' }}>
                        <th
                          style={{
                            width: '50%',
                            padding: '8px 12px',
                            textAlign: 'left',
                            color: '#be123c',
                            borderRight: '1px solid #e9d5ff',
                            fontWeight: 700,
                          }}
                        >
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              background: '#ffe4e6',
                              color: '#e11d48',
                              padding: '2px 8px',
                              borderRadius: 4,
                              fontSize: compact ? 11 : 12,
                            }}
                          >
                            ⚡ Trái nghĩa (Antonyms)
                          </span>
                        </th>
                        <th
                          style={{
                            width: '50%',
                            padding: '8px 12px',
                            textAlign: 'left',
                            color: '#15803d',
                            fontWeight: 700,
                          }}
                        >
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              background: '#dcfce7',
                              color: '#16a34a',
                              padding: '2px 8px',
                              borderRadius: 4,
                              fontSize: compact ? 11 : 12,
                            }}
                          >
                            🔗 Đồng nghĩa (Synonyms)
                          </span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: maxTableRows }).map((_, rIdx) => {
                        const ant = antonyms[rIdx];
                        const syn = synonyms[rIdx];
                        return (
                          <tr
                            key={rIdx}
                            style={{
                              borderBottom:
                                rIdx < maxTableRows - 1 ? '1px solid #f3e8ff' : 'none',
                              background: rIdx % 2 === 0 ? '#ffffff' : '#fdfcff',
                            }}
                          >
                            {/* Cột trái: Trái nghĩa (Antonyms) */}
                            <td
                              style={{
                                padding: '8px 12px',
                                verticalAlign: 'top',
                                borderRight: '1px solid #e9d5ff',
                                lineHeight: 1.45,
                              }}
                            >
                              {ant ? (
                                <div>
                                  <strong style={{ color: '#be123c', fontWeight: 700 }}>
                                    {ant.word}
                                  </strong>
                                  {ant.meaning && (
                                    <div
                                      style={{
                                        color: '#475569',
                                        fontSize: compact ? 11 : 12,
                                        marginTop: 2,
                                      }}
                                    >
                                      {ant.meaning}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span style={{ color: '#cbd5e1' }}>—</span>
                              )}
                            </td>

                            {/* Cột phải: Đồng nghĩa (Synonyms) */}
                            <td
                              style={{
                                padding: '8px 12px',
                                verticalAlign: 'top',
                                lineHeight: 1.45,
                              }}
                            >
                              {syn ? (
                                <div>
                                  <strong style={{ color: '#15803d', fontWeight: 700 }}>
                                    {syn.word}
                                  </strong>
                                  {syn.meaning && (
                                    <div
                                      style={{
                                        color: '#475569',
                                        fontSize: compact ? 11 : 12,
                                        marginTop: 2,
                                      }}
                                    >
                                      {syn.meaning}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span style={{ color: '#cbd5e1' }}>—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* Fallback text if synonyms/antonyms were not parseable into pairs */
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
                  {sectionData.synonyms_antonyms.map((line, lIdx) => (
                    <div key={lIdx} style={{ fontSize: compact ? 12 : 13, color: '#334155' }}>
                      {renderInlineFormatting(line)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 3. Ngữ cảnh sử dụng */}
          {sectionData.context.length > 0 && (
            <div
              style={{
                borderRadius: 10,
                border: `1px solid ${SECTION_MAP.context.borderColor}`,
                background: SECTION_MAP.context.bgColor,
                padding: '10px 14px',
              }}
            >
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: SECTION_MAP.context.badgeBg,
                  color: SECTION_MAP.context.badgeColor,
                  padding: '3px 10px',
                  borderRadius: 6,
                  fontWeight: 700,
                  fontSize: compact ? 11 : 12,
                  marginBottom: 8,
                }}
              >
                <span>{SECTION_MAP.context.icon}</span>
                <span>{SECTION_MAP.context.title}</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, color: '#1e293b' }}>
                {sectionData.context.map((line, lIdx) => (
                  <div key={lIdx} style={{ fontSize: compact ? 12 : 13, lineHeight: 1.5 }}>
                    {renderInlineFormatting(line)}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. Lỗi thường gặp */}
          {sectionData.mistakes.length > 0 && (
            <div
              style={{
                borderRadius: 10,
                border: `1px solid ${SECTION_MAP.mistakes.borderColor}`,
                background: SECTION_MAP.mistakes.bgColor,
                padding: '10px 14px',
              }}
            >
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: SECTION_MAP.mistakes.badgeBg,
                  color: SECTION_MAP.mistakes.badgeColor,
                  padding: '3px 10px',
                  borderRadius: 6,
                  fontWeight: 700,
                  fontSize: compact ? 11 : 12,
                  marginBottom: 8,
                }}
              >
                <span>{SECTION_MAP.mistakes.icon}</span>
                <span>{SECTION_MAP.mistakes.title}</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, color: '#1e293b' }}>
                {sectionData.mistakes.map((line, lIdx) => (
                  <div key={lIdx} style={{ fontSize: compact ? 12 : 13, lineHeight: 1.5 }}>
                    {renderInlineFormatting(line)}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. Mẹo ghi nhớ */}
          {sectionData.memory_tips.length > 0 && (
            <div
              style={{
                borderRadius: 10,
                border: `1px solid ${SECTION_MAP.memory_tips.borderColor}`,
                background: SECTION_MAP.memory_tips.bgColor,
                padding: '10px 14px',
              }}
            >
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: SECTION_MAP.memory_tips.badgeBg,
                  color: SECTION_MAP.memory_tips.badgeColor,
                  padding: '3px 10px',
                  borderRadius: 6,
                  fontWeight: 700,
                  fontSize: compact ? 11 : 12,
                  marginBottom: 8,
                }}
              >
                <span>{SECTION_MAP.memory_tips.icon}</span>
                <span>{SECTION_MAP.memory_tips.title}</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, color: '#1e293b' }}>
                {sectionData.memory_tips.map((line, lIdx) => (
                  <div key={lIdx} style={{ fontSize: compact ? 12 : 13, lineHeight: 1.5 }}>
                    {renderInlineFormatting(line)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Fallback renderer if format is plain text */
        <div style={{ whiteSpace: 'pre-wrap', color: '#1e293b', lineHeight: 1.6 }}>
          {rawLines.map((line, idx) => (
            <div key={idx} style={{ marginBottom: line.trim() ? 4 : 8 }}>
              {renderInlineFormatting(line)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AiExplanationBox;
