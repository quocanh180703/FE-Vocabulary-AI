import React, { useState, useEffect, useRef, useCallback } from 'react';
import { wordApi, adminApi, getPartOfSpeechBadgeStyle } from '../api';
import type { Word } from '../api';
import { Icon } from './icons';

export interface AutocompleteSearchProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: (query: string, selectedItem?: any) => void;
  placeholder?: string;
  type?: 'words' | 'favorites' | 'admin-words' | 'admin-users' | 'custom';
  favoriteWords?: Word[];
  customItems?: Array<{ id: string | number; title: string; subtitle?: string; badge?: string; raw?: any }>;
  debounceMs?: number;
  limit?: number;
  showButton?: boolean;
  buttonText?: string;
  buttonStyle?: React.CSSProperties;
  inputStyle?: React.CSSProperties;
  containerStyle?: React.CSSProperties;
  autoFocus?: boolean;
  className?: string;
}

interface SuggestionItem {
  id: string | number;
  mainText: string;
  subText?: string;
  extraText?: string;
  badge?: string;
  badgeColor?: { bg: string; color: string; border?: string };
  pos?: string;
  pronunciation?: string;
  isExactMatch?: boolean;
  raw: any;
}

const CEFR_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  A1: { bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' },
  A2: { bg: '#f0f9ff', color: '#0284c7', border: '#bae6fd' },
  B1: { bg: '#eef2ff', color: '#4338ca', border: '#c7d2fe' },
  B2: { bg: '#faf5ff', color: '#7e22ce', border: '#e9d5ff' },
  C1: { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' },
};

const EMPTY_FAVORITE_WORDS: Word[] = [];
const EMPTY_CUSTOM_ITEMS: Array<{ id: string | number; title: string; subtitle?: string; badge?: string; raw?: any }> = [];

export const AutocompleteSearch: React.FC<AutocompleteSearchProps> = ({
  value,
  onChange,
  onSearch,
  placeholder = 'Tìm kiếm từ vựng...',
  type = 'words',
  favoriteWords = EMPTY_FAVORITE_WORDS,
  customItems = EMPTY_CUSTOM_ITEMS,
  debounceMs = 250,
  limit = 8,
  showButton = false,
  buttonText = 'Tìm kiếm',
  buttonStyle,
  inputStyle,
  containerStyle,
  autoFocus = false,
  className = '',
}) => {
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const cacheRef = useRef<Map<string, SuggestionItem[]>>(new Map());
  const requestIdRef = useRef<number>(0);

  // Helper to highlight matching prefix in text
  const renderHighlightedText = (text: string, query: string) => {
    if (!query || !text) return <span>{text}</span>;
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase().trim();

    if (lowerText.startsWith(lowerQuery)) {
      const matchPart = text.slice(0, lowerQuery.length);
      const restPart = text.slice(lowerQuery.length);
      return (
        <span>
          <span style={{ fontWeight: 800, color: '#4F46E5', background: 'rgba(79, 70, 229, 0.08)', borderRadius: 2, padding: '1px 2px' }}>
            {matchPart}
          </span>
          <span style={{ color: '#0F172A', fontWeight: 600 }}>{restPart}</span>
        </span>
      );
    }

    const idx = lowerText.indexOf(lowerQuery);
    if (idx !== -1) {
      const before = text.slice(0, idx);
      const match = text.slice(idx, idx + lowerQuery.length);
      const after = text.slice(idx + lowerQuery.length);
      return (
        <span>
          <span>{before}</span>
          <span style={{ fontWeight: 800, color: '#4F46E5', background: 'rgba(79, 70, 229, 0.08)', borderRadius: 2, padding: '1px 2px' }}>
            {match}
          </span>
          <span>{after}</span>
        </span>
      );
    }

    return <span>{text}</span>;
  };

  // Convert raw word item to SuggestionItem
  const mapWordToSuggestion = useCallback((w: Word, query: string): SuggestionItem => {
    const wordText = w.word || w.lemma || '';
    const meaning = w.vietnameseMeaning || w.meaning || w.definition || '';
    const cleanMeaning = meaning.replace(/^danh từ|^động từ|^tính từ|^trạng từ/i, '').replace(/^[;,.\s]+/, '').trim();
    const level = (w.level || w.cefrLevel || '').toUpperCase();
    const isExact = wordText.toLowerCase() === query.toLowerCase().trim();

    return {
      id: w.id,
      mainText: wordText,
      subText: cleanMeaning,
      extraText: w.definition && w.definition !== meaning ? w.definition : undefined,
      badge: level || undefined,
      badgeColor: level && CEFR_COLORS[level] ? CEFR_COLORS[level] : undefined,
      pos: w.partOfSpeech || undefined,
      pronunciation: w.pronunciation || undefined,
      isExactMatch: isExact,
      raw: w,
    };
  }, []);

  // Fetch suggestions depending on mode
  const fetchSuggestions = useCallback(async (query: string) => {
    const q = query.trim();
    if (!q) {
      setSuggestions([]);
      setIsOpen(false);
      setLoading(false);
      return;
    }

    const cacheKey = `${type}:${q.toLowerCase()}`;
    if (cacheRef.current.has(cacheKey)) {
      const cached = cacheRef.current.get(cacheKey)!;
      setSuggestions(cached);
      setIsOpen(cached.length > 0);
      setLoading(false);
      return;
    }

    const curRequestId = ++requestIdRef.current;
    setLoading(true);

    try {
      let results: SuggestionItem[] = [];

      if (type === 'words' || type === 'admin-words') {
        const words = await wordApi.autocomplete(q, limit);
        if (curRequestId !== requestIdRef.current) return;
        results = words.map((w) => mapWordToSuggestion(w, q));
      } else if (type === 'favorites') {
        const lowerQ = q.toLowerCase();
        // Prefix matching and exact match priority over general favorites
        const exactMatches: Word[] = [];
        const prefixMatches: Word[] = [];
        const containsMatches: Word[] = [];

        favoriteWords.forEach((w) => {
          const text = (w.word || w.lemma || '').toLowerCase();
          const meaning = (w.vietnameseMeaning || w.meaning || '').toLowerCase();
          if (text === lowerQ) {
            exactMatches.push(w);
          } else if (text.startsWith(lowerQ)) {
            prefixMatches.push(w);
          } else if (text.includes(lowerQ) || meaning.includes(lowerQ)) {
            containsMatches.push(w);
          }
        });

        // Sort prefix matches by length then alphabet
        prefixMatches.sort((a, b) => {
          const aText = (a.word || a.lemma || '');
          const bText = (b.word || b.lemma || '');
          return aText.length - bText.length || aText.localeCompare(bText);
        });

        const combined = [...exactMatches, ...prefixMatches, ...containsMatches].slice(0, limit);
        results = combined.map((w) => mapWordToSuggestion(w, q));
      } else if (type === 'admin-users') {
        const res = await adminApi.students(0, limit, q);
        if (curRequestId !== requestIdRef.current) return;
        const students = res.data?.content || [];
        const lowerQ = q.toLowerCase();

        results = students.map((s: any) => {
          const isExact = (s.username || '').toLowerCase() === lowerQ || (s.email || '').toLowerCase() === lowerQ;
          return {
            id: s.userId || s.id,
            mainText: s.fullName || s.username || 'User',
            subText: s.email || '',
            extraText: s.username ? `@${s.username}` : undefined,
            badge: s.status,
            badgeColor: s.status === 'ACTIVE'
              ? { bg: '#ecfdf5', color: '#059669', border: '#a7f3d0' }
              : s.status === 'BANNED'
              ? { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' }
              : { bg: '#fefce8', color: '#ca8a04', border: '#fef08a' },
            isExactMatch: isExact,
            raw: s,
          };
        });
      } else if (type === 'custom') {
        const lowerQ = q.toLowerCase();
        const exact: SuggestionItem[] = [];
        const prefix: SuggestionItem[] = [];
        const contains: SuggestionItem[] = [];

        customItems.forEach((item) => {
          const t = item.title.toLowerCase();
          const sub = (item.subtitle || '').toLowerCase();
          const isExact = t === lowerQ;
          const sItem: SuggestionItem = {
            id: item.id,
            mainText: item.title,
            subText: item.subtitle,
            badge: item.badge,
            isExactMatch: isExact,
            raw: item.raw || item,
          };
          if (isExact) exact.push(sItem);
          else if (t.startsWith(lowerQ)) prefix.push(sItem);
          else if (t.includes(lowerQ) || sub.includes(lowerQ)) contains.push(sItem);
        });

        prefix.sort((a, b) => a.mainText.length - b.mainText.length || a.mainText.localeCompare(b.mainText));
        results = [...exact, ...prefix, ...contains].slice(0, limit);
      }

      if (curRequestId === requestIdRef.current) {
        cacheRef.current.set(cacheKey, results);
        setSuggestions(results);
        setIsOpen(results.length > 0);
        setHighlightedIndex(results.length > 0 && results[0].isExactMatch ? 0 : -1);
      }
    } catch (e) {
      console.warn('Error fetching search autocomplete:', e);
    } finally {
      if (curRequestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [type, limit, favoriteWords, customItems, mapWordToSuggestion]);

  const fetchSuggestionsRef = useRef(fetchSuggestions);
  fetchSuggestionsRef.current = fetchSuggestions;

  // Debounced effect for typing / backspacing
  useEffect(() => {
    if (!value.trim()) {
      setSuggestions((prev) => (prev.length === 0 ? prev : []));
      setIsOpen((prev) => (prev ? false : prev));
      setLoading((prev) => (prev ? false : prev));
      setHighlightedIndex((prev) => (prev === -1 ? prev : -1));
      return;
    }

    const timer = setTimeout(() => {
      fetchSuggestionsRef.current(value);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [value, debounceMs]);

  // Handle outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectSuggestion = (item: SuggestionItem) => {
    const textToSearch = item.mainText;
    onChange(textToSearch);
    setIsOpen(false);
    setHighlightedIndex(-1);
    onSearch(textToSearch, item.raw);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) {
      if (e.key === 'Enter') {
        e.preventDefault();
        onSearch(value.trim());
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        handleSelectSuggestion(suggestions[highlightedIndex]);
      } else {
        setIsOpen(false);
        onSearch(value.trim());
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleClear = () => {
    onChange('');
    setSuggestions([]);
    setIsOpen(false);
    setHighlightedIndex(-1);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleSubmitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setIsOpen(false);
    onSearch(value.trim());
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        width: '100%',
        ...containerStyle,
      }}
      className={className}
    >
      <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
        {/* Left search icon */}
        <span
          style={{
            position: 'absolute',
            left: 14,
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#94A3B8',
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            zIndex: 2,
          }}
        >
          <Icon n="search" s={20} />
        </span>

        {/* Search input */}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => {
            if (value.trim() && suggestions.length > 0) {
              setIsOpen(true);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          style={{
            width: '100%',
            height: 46,
            paddingLeft: 44,
            paddingRight: value ? 40 : 16,
            borderRadius: 10,
            border: '1.5px solid #CBD5E1',
            background: '#FFFFFF',
            color: '#0F172A',
            fontSize: '0.94rem',
            outline: 'none',
            boxSizing: 'border-box',
            transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
            ...inputStyle,
          }}
        />

        {/* Right action: Loading spinner or Clear button */}
        {loading ? (
          <span
            style={{
              position: 'absolute',
              right: 14,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 16,
              height: 16,
              border: '2px solid #CBD5E1',
              borderTopColor: '#4F46E5',
              borderRadius: '50%',
              animation: 'spin 0.6s linear infinite',
              display: 'inline-block',
            }}
          />
        ) : value ? (
          <button
            type="button"
            onClick={handleClear}
            title="Xóa từ khóa"
            style={{
              position: 'absolute',
              right: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'transparent',
              border: 'none',
              color: '#94A3B8',
              cursor: 'pointer',
              padding: 4,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              lineHeight: 1,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#0F172A')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#94A3B8')}
          >
            ✕
          </button>
        ) : null}
      </div>

      {/* Optional Search submit button */}
      {showButton && (
        <button
          type="button"
          onClick={handleSubmitSearch}
          style={{
            height: 46,
            padding: '0 20px',
            background: 'linear-gradient(135deg, #4F46E5 0%, #3730A3 100%)',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: 10,
            fontWeight: 700,
            fontSize: '0.94rem',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            boxShadow: '0 2px 8px rgba(79, 70, 229, 0.25)',
            transition: 'all 0.15s ease',
            ...buttonStyle,
          }}
        >
          <span>{buttonText}</span>
        </button>
      )}

      {/* Autocomplete Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: showButton ? 'calc(100px + 10px)' : 0,
            background: '#FFFFFF',
            borderRadius: 12,
            boxShadow: '0 12px 30px -4px rgba(15, 23, 42, 0.18), 0 4px 12px -2px rgba(15, 23, 42, 0.08)',
            border: '1.5px solid #E2E8F0',
            zIndex: 9999,
            maxHeight: 380,
            overflowY: 'auto',
            padding: '6px 0',
          }}
        >
          {/* Header notice */}
          <div
            style={{
              padding: '6px 14px 4px 14px',
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: '#64748B',
              borderBottom: '1px solid #F1F5F9',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>Gợi ý theo tiền tố "{value.trim()}"</span>
            <span style={{ fontSize: '0.72rem', fontWeight: 500, color: '#94A3B8' }}>
              ↑↓ để chọn · Enter để xem
            </span>
          </div>

          {suggestions.map((item, idx) => {
            const isHighlighted = idx === highlightedIndex;
            const posBadge = item.pos ? getPartOfSpeechBadgeStyle(item.pos) : null;

            return (
              <div
                key={`${item.id}-${idx}`}
                onMouseEnter={() => setHighlightedIndex(idx)}
                onClick={() => handleSelectSuggestion(item)}
                style={{
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  cursor: 'pointer',
                  background: isHighlighted
                    ? '#F8FAFC'
                    : item.isExactMatch
                    ? 'rgba(79, 70, 229, 0.03)'
                    : 'transparent',
                  borderLeft: isHighlighted
                    ? '3px solid #4F46E5'
                    : item.isExactMatch
                    ? '3px solid #10B981'
                    : '3px solid transparent',
                  transition: 'background-color 0.1s ease',
                }}
              >
                {/* Left info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                  {/* Exact match star icon */}
                  {item.isExactMatch ? (
                    <span
                      title="Trùng khớp hoàn toàn"
                      style={{
                        fontSize: 15,
                        flexShrink: 0,
                        color: '#10B981',
                        filter: 'drop-shadow(0 1px 2px rgba(16, 185, 129, 0.3))',
                      }}
                    >
                      ⭐
                    </span>
                  ) : (
                    <span style={{ color: '#94A3B8', fontSize: 13, flexShrink: 0 }}>🔍</span>
                  )}

                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      {/* Main Lemma / Word text with highlighted prefix */}
                      <span style={{ fontSize: '0.98rem', fontWeight: 600 }}>
                        {renderHighlightedText(item.mainText, value)}
                      </span>

                      {/* Exact match badge */}
                      {item.isExactMatch && (
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            color: '#065F46',
                            background: '#D1FAE5',
                            border: '1px solid #A7F3D0',
                            padding: '1px 6px',
                            borderRadius: 6,
                          }}
                        >
                          Khớp chính xác
                        </span>
                      )}

                      {/* Pronunciation */}
                      {item.pronunciation && (
                        <span style={{ fontSize: '0.82rem', color: '#64748B', fontFamily: 'monospace' }}>
                          {item.pronunciation}
                        </span>
                      )}

                      {/* Part of speech tag */}
                      {posBadge && (
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            color: posBadge.color,
                            background: posBadge.bg,
                            border: `1px solid ${posBadge.border}`,
                            padding: '1px 6px',
                            borderRadius: 6,
                          }}
                        >
                          {posBadge.shortLabel}
                        </span>
                      )}
                    </div>

                    {/* Vietnamese meaning or subtitle */}
                    {item.subText && (
                      <div
                        style={{
                          fontSize: '0.84rem',
                          color: '#475569',
                          marginTop: 2,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {item.subText}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right badges */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  {item.extraText && (
                    <span style={{ fontSize: '0.76rem', color: '#64748B', fontWeight: 500 }}>
                      {item.extraText}
                    </span>
                  )}

                  {item.badge && (
                    <span
                      style={{
                        fontSize: '0.76rem',
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: 6,
                        background: item.badgeColor?.bg || '#F1F5F9',
                        color: item.badgeColor?.color || '#334155',
                        border: item.badgeColor?.border ? `1px solid ${item.badgeColor.border}` : '1px solid #E2E8F0',
                      }}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
export default AutocompleteSearch;
