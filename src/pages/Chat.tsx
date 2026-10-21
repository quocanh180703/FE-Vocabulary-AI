import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { aiApi, errMsg } from '../api';
import type { Conversation, ChatMsg } from '../api';
import { Icon, Mascot } from '../components/icons';
import { AutocompleteSearch } from '../components/AutocompleteSearch';
import { messageBubbleVariant } from '../motion';

// ---------------- Inline Markdown Parser & Formatter ----------------
function renderInlineMarkdown(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const regex = /(`[^`]+`|\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('`') && token.endsWith('`')) {
      parts.push(
        <code
          key={match.index}
          style={{
            background: 'rgba(0,0,0,0.06)',
            padding: '2px 5px',
            borderRadius: 4,
            fontFamily: 'monospace',
            fontSize: '0.9em',
            color: '#be123c',
          }}
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith('***') && token.endsWith('***')) {
      parts.push(
        <strong key={match.index} style={{ fontWeight: 800 }}>
          <em>{token.slice(3, -3)}</em>
        </strong>
      );
    } else if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(
        <strong key={match.index} style={{ fontWeight: 700, color: 'var(--ink, #0f172a)' }}>
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      parts.push(<em key={match.index}>{token.slice(1, -1)}</em>);
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}

function ChatMarkdownView({ content }: { content: string }) {
  if (!content) return null;

  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let currentList: { type: 'ul' | 'ol'; items: string[] } | null = null;

  const flushList = () => {
    if (currentList) {
      if (currentList.type === 'ul') {
        elements.push(
          <ul key={`ul-${elements.length}`} style={{ margin: '6px 0 10px 18px', padding: 0 }}>
            {currentList.items.map((it, idx) => (
              <li key={idx} style={{ marginBottom: 4, lineHeight: 1.6 }}>
                {renderInlineMarkdown(it)}
              </li>
            ))}
          </ul>
        );
      } else {
        elements.push(
          <ol key={`ol-${elements.length}`} style={{ margin: '6px 0 10px 18px', padding: 0 }}>
            {currentList.items.map((it, idx) => (
              <li key={idx} style={{ marginBottom: 4, lineHeight: 1.6 }}>
                {renderInlineMarkdown(it)}
              </li>
            ))}
          </ol>
        );
      }
      currentList = null;
    }
  };

  lines.forEach((rawLine, i) => {
    const line = rawLine.trim();

    if (!line) {
      flushList();
      return;
    }

    if (/^---+$/.test(line) || /^___+$/.test(line)) {
      flushList();
      elements.push(
        <hr key={`hr-${i}`} style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '12px 0' }} />
      );
      return;
    }

    const headerMatch = line.match(/^(#{1,4})\s+(.+)$/);
    if (headerMatch) {
      flushList();
      const level = headerMatch[1].length;
      const title = headerMatch[2];
      const fontSize = level === 1 ? 17 : level === 2 ? 15.5 : 14.5;
      elements.push(
        <div
          key={`h-${i}`}
          style={{
            fontWeight: 800,
            fontSize,
            color: 'var(--ink, #0f172a)',
            marginTop: elements.length === 0 ? 0 : 10,
            marginBottom: 4,
          }}
        >
          {renderInlineMarkdown(title)}
        </div>
      );
      return;
    }

    const bulletMatch = line.match(/^[-*•]\s+(.+)$/);
    if (bulletMatch) {
      if (!currentList || currentList.type !== 'ul') {
        flushList();
        currentList = { type: 'ul', items: [] };
      }
      currentList.items.push(bulletMatch[1]);
      return;
    }

    const numMatch = line.match(/^(\d+)\.\s+(.+)$/);
    if (numMatch) {
      if (!currentList || currentList.type !== 'ol') {
        flushList();
        currentList = { type: 'ol', items: [] };
      }
      currentList.items.push(numMatch[2]);
      return;
    }

    flushList();
    elements.push(
      <p key={`p-${i}`} style={{ margin: '0 0 8px 0', lineHeight: 1.65, fontWeight: 400 }}>
        {renderInlineMarkdown(line)}
      </p>
    );
  });

  flushList();

  return <div className="chat-markdown" style={{ fontSize: 14.5, fontWeight: 400 }}>{elements}</div>;
}

// ---------------- Suggested Prompts ----------------
const STARTER_PROMPTS = [
  '💡 Phân biệt Affect và Effect',
  '📝 Sửa ngữ pháp: "She don\'t like apple"',
  '🎯 5 cách chào hỏi tự nhiên trong công việc',
  '🗣️ Cách dùng thì Hiện tại hoàn thành (Present Perfect)',
];

export default function Chat() {
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [cur, setCur] = useState<number | null>(null);
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // Pin state stored in localStorage
  const [pinnedIds, setPinnedIds] = useState<number[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('vocab_pinned_convs') || '[]');
    } catch {
      return [];
    }
  });

  // Rename inline state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;
    aiApi
      .listConv()
      .then(({ data }) => {
        if (!mounted) return;
        const list: Conversation[] = data?.content || [];
        setConvs(list);
        if (list[0]) openConv(list[0].id);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs, busy]);

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  const openConv = (id: number) => {
    setCur(id);
    setEditingId(null);
    aiApi
      .convMsgs(id)
      .then(({ data }) => {
        setMsgs(Array.isArray(data?.messages) ? data.messages : []);
      })
      .catch((e) => setErr(errMsg(e)));
  };

  const newConv = async () => {
    try {
      const { data } = await aiApi.createConv('GENERAL', 'Đoạn chat mới');
      setConvs((c) => [data, ...c]);
      openConv(data.id);
    } catch (e) {
      setErr(errMsg(e));
    }
  };

  const togglePin = (id: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setPinnedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((p) => p !== id) : [id, ...prev];
      try {
        localStorage.setItem('vocab_pinned_convs', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const startRename = (c: Conversation, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingId(c.id);
    setEditTitle(c.title);
  };

  const saveRename = async (id: number) => {
    const trimmed = editTitle.trim();
    if (!trimmed) {
      setEditingId(null);
      return;
    }
    setConvs((prev) => prev.map((c) => (c.id === id ? { ...c, title: trimmed } : c)));
    setEditingId(null);
    try {
      await aiApi.updateConvTitle(id, trimmed);
    } catch {
      // Local state is already updated
    }
  };

  const deleteConv = async (id: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!window.confirm('Bạn có chắc muốn xóa đoạn chat này không?')) return;
    try {
      await aiApi.deleteConv(id);
    } catch {
      // ignore
    }
    setConvs((prev) => prev.filter((c) => c.id !== id));
    setPinnedIds((prev) => {
      const next = prev.filter((p) => p !== id);
      try {
        localStorage.setItem('vocab_pinned_convs', JSON.stringify(next));
      } catch {}
      return next;
    });
    if (cur === id) {
      const remaining = convs.filter((c) => c.id !== id);
      if (remaining.length > 0) {
        openConv(remaining[0].id);
      } else {
        setCur(null);
        setMsgs([]);
      }
    }
  };

  const send = async (explicitText?: string) => {
    const messageToSend = (explicitText || text).trim();
    if (!messageToSend || busy) return;
    let cid = cur;
    if (!cid) {
      try {
        const { data } = await aiApi.createConv('GENERAL', messageToSend.slice(0, 32));
        cid = data.id;
        setConvs((c) => [data, ...c]);
        setCur(cid);
      } catch (e) {
        setErr(errMsg(e));
        return;
      }
    }
    setText('');
    setBusy(true);
    setErr('');
    setMsgs((m) => [...m, { id: Date.now(), conversationId: cid!, role: 'USER', content: messageToSend }]);
    try {
      const { data } = await aiApi.sendMsg(cid!, messageToSend);
      setMsgs((m) => [...m, data]);
    } catch (e) {
      setErr(errMsg(e, 'Vi chưa trả lời được, hãy thử lại nhé.'));
    } finally {
      setBusy(false);
    }
  };

  const copyToClipboard = (id: number, textToCopy: string) => {
    navigator.clipboard.writeText(textToCopy);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filter conversations by search keyword
  const filteredConvs = convs.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase().trim())
  );
  const pinnedList = filteredConvs.filter((c) => pinnedIds.includes(c.id));
  const otherList = filteredConvs.filter((c) => !pinnedIds.includes(c.id));

  const curConv = convs.find((c) => c.id === cur);
  const isCurPinned = cur ? pinnedIds.includes(cur) : false;

  return (
    <div className="content">
      {/* Page Header */}
      <div className="pagehead">
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '4px 12px', background: 'rgba(79, 70, 229, 0.08)', borderRadius: 99, color: 'var(--primary)', fontSize: 13, fontWeight: 800, marginBottom: 8 }}>
          <Icon n="spark" s={14} /> AI English Tutor & Chat Companion
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h1>Trò chuyện với Vi</h1>
            <div className="sub">Hỏi ngữ pháp, từ vựng, cách diễn đạt — Vi phản hồi thông minh, giải thích cặn kẽ 24/7</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--muted)', background: '#FFFFFF', padding: '6px 14px', borderRadius: 99, border: '1px solid #E2E8F0', boxShadow: '0 2px 6px rgba(15, 23, 42, 0.02)' }}>
            <span>🌐</span>
            <span>Hỏi tiếng Việt → Trả lời tiếng Việt · Ask English → Reply English</span>
          </div>
        </div>
      </div>

      <div className="cols2" style={{ gridTemplateColumns: '320px 1fr', alignItems: 'start', gap: 18 }}>
        {/* Left Sidebar: Conversations list */}
        <div className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 680, borderRadius: 20, border: '1px solid #E2E8F0', boxShadow: '0 4px 16px rgba(15, 23, 42, 0.03)' }}>
          <button
            className="btn block"
            style={{
              minHeight: 44,
              fontWeight: 800,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
              color: '#fff',
              boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)',
            }}
            onClick={newConv}
          >
            <Icon n="pen" s={18} /> Đoạn chat mới
          </button>

          {/* Search bar with autocomplete */}
          <AutocompleteSearch
            value={search}
            onChange={setSearch}
            onSearch={(query, item) => {
              setSearch(query);
              if (item?.id) {
                setCur(Number(item.id));
              }
            }}
            placeholder="Tìm đoạn chat..."
            type="custom"
            customItems={convs.map((c) => ({
              id: c.id,
              title: c.title,
              subtitle: new Date(c.createdAt).toLocaleDateString('vi-VN'),
              badge: pinnedIds.includes(c.id) ? 'Đã ghim' : undefined,
              raw: c,
            }))}
            limit={6}
            inputStyle={{ height: 40, fontSize: 13, borderRadius: 10, paddingLeft: 38 }}
          />

          {/* Scrollable Conversation List */}
          <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 6, paddingRight: 2 }}>
            {/* Pinned Section */}
            {pinnedList.length > 0 && (
              <div style={{ marginBottom: 6 }}>
                <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.8, color: '#b45309', padding: '4px 8px 6px', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>📌</span> Đã ghim ({pinnedList.length})
                </div>
                {pinnedList.map((c) => renderConvItem(c, true))}
              </div>
            )}

            {/* Other / Recent Section */}
            <div>
              {pinnedList.length > 0 && (
                <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.8, color: 'var(--muted)', padding: '6px 8px 4px' }}>
                  💬 Gần đây ({otherList.length})
                </div>
              )}
              {otherList.map((c) => renderConvItem(c, false))}
            </div>

            {filteredConvs.length === 0 && (
              <div className="empty" style={{ padding: 24, fontSize: 13 }}>
                {search ? 'Không tìm thấy đoạn chat nào.' : 'Chưa có đoạn chat nào.'}
              </div>
            )}
          </div>
        </div>

        {/* Right Chat Panel */}
        <div className="card" style={{ minHeight: 620, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden', borderRadius: 20, border: '1px solid #E2E8F0', boxShadow: '0 4px 16px rgba(15, 23, 42, 0.03)' }}>
          {/* Chat Window Header */}
          <div
            style={{
              padding: '14px 20px',
              borderBottom: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
              <div style={{ position: 'relative' }}>
                <Mascot s={36} />
                <span
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: '#22C55E',
                    border: '2px solid #fff',
                  }}
                  title="Vi đang online"
                />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <b style={{ fontSize: 15.5, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {curConv?.title || 'Trò chuyện cùng Vi'}
                  </b>
                  {isCurPinned && <span title="Đoạn chat đã được ghim">📌</span>}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>
                  Trợ lý AI tiếng Anh · Phản hồi ngắn gọn, rõ ràng
                </div>
              </div>
            </div>

            {curConv && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  className={'conv-btn' + (isCurPinned ? ' pinned' : '')}
                  onClick={() => cur && togglePin(cur)}
                  title={isCurPinned ? 'Bỏ ghim đoạn chat' : 'Ghim đoạn chat lên đầu'}
                  style={{ padding: '6px 10px', fontSize: 13, border: '1px solid #e2e8f0', borderRadius: 6 }}
                >
                  <Icon n="pin" s={15} />
                  <span style={{ marginLeft: 4 }}>{isCurPinned ? 'Đã ghim' : 'Ghim'}</span>
                </button>
                <button
                  className="conv-btn"
                  onClick={() => curConv && startRename(curConv)}
                  title="Đặt tên / Đổi tên đoạn chat"
                  style={{ padding: '6px 10px', fontSize: 13, border: '1px solid #e2e8f0', borderRadius: 6 }}
                >
                  <Icon n="edit" s={15} />
                  <span style={{ marginLeft: 4 }}>Đổi tên</span>
                </button>
                <button
                  className="conv-btn danger"
                  onClick={() => cur && deleteConv(cur)}
                  title="Xóa đoạn chat này"
                  style={{ padding: '6px 10px', fontSize: 13, border: '1px solid #fee2e2', borderRadius: 6 }}
                >
                  <Icon n="trash" s={15} />
                </button>
              </div>
            )}
          </div>

          {err && <div className="error" style={{ margin: '8px 16px' }}>{err}</div>}

          {/* Messages Scroll Area */}
          <div className="chat" style={{ flex: 1, overflowY: 'auto', maxHeight: 500, padding: 20 }}>
            {msgs.length === 0 && (
              <div className="center" style={{ padding: '40px 20px', maxWidth: 520, margin: '0 auto' }}>
                <Mascot s={68} />
                <h3 style={{ marginTop: 12, marginBottom: 6 }}>Chào bạn! Vi có thể giúp gì cho bạn?</h3>
                <div className="sub" style={{ fontSize: 13.5, lineHeight: 1.5 }}>
                  Vi sẵn sàng giải thích từ vựng, sửa bài ngữ pháp, hoặc trò chuyện bằng tiếng Anh và tiếng Việt.
                </div>

                {/* Prompt suggestion chips */}
                <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'left' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Gợi ý câu hỏi nhanh:
                  </div>
                  {STARTER_PROMPTS.map((prompt, idx) => (
                    <button
                      key={idx}
                      className="btn ghost sm"
                      style={{
                        justifyContent: 'flex-start',
                        textAlign: 'left',
                        padding: '10px 14px',
                        borderRadius: 10,
                        fontSize: 13.5,
                        borderColor: '#e2e8f0',
                        color: 'var(--ink)',
                      }}
                      onClick={() => send(prompt)}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {msgs.map((m) => {
              const isMe = m.role === 'USER';
              return (
                <motion.div
                  key={m.id}
                  variants={messageBubbleVariant}
                  initial="hidden"
                  animate="visible"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isMe ? 'flex-end' : 'flex-start',
                    gap: 4,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, maxWidth: '88%' }}>
                    {!isMe && (
                      <div style={{ marginTop: 4, flexShrink: 0 }}>
                        <Mascot s={28} />
                      </div>
                    )}
                    <div className={'msg ' + (isMe ? 'me' : 'ai')}>
                      {isMe ? (
                        <div style={{ whiteSpace: 'pre-wrap' }}>{m.content}</div>
                      ) : (
                        <ChatMarkdownView content={m.content} />
                      )}
                    </div>
                  </div>

                  {/* Actions under AI message: Copy button */}
                  {!isMe && (
                    <div style={{ marginLeft: 36, display: 'flex', alignItems: 'center', gap: 10 }}>
                      <button
                        onClick={() => copyToClipboard(m.id, m.content)}
                        className="conv-btn"
                        style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, color: 'var(--muted)' }}
                        title="Sao chép câu trả lời"
                      >
                        {copiedId === m.id ? (
                          <>
                            <Icon n="check" s={12} />
                            <span style={{ marginLeft: 4, color: '#16a34a', fontWeight: 700 }}>Đã sao chép</span>
                          </>
                        ) : (
                          <>
                            <Icon n="copy" s={12} />
                            <span style={{ marginLeft: 4 }}>Sao chép</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </motion.div>
              );
            })}

            <AnimatePresence>
              {busy && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.2 }}
                  style={{ display: 'flex', alignItems: 'center', gap: 10 }}
                >
                  <Mascot s={28} />
                  <div
                    className="msg ai"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      color: 'var(--muted)',
                      padding: '10px 14px',
                    }}
                  >
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <span className="chat-typing-dot" />
                      <span className="chat-typing-dot" />
                      <span className="chat-typing-dot" />
                    </div>
                    <span style={{ fontSize: 13, fontStyle: 'italic' }}>Vi đang suy nghĩ...</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div ref={bottom} />
          </div>

          {/* Chatbar / Input Box */}
          <div style={{ padding: '14px 18px', borderTop: '1px solid var(--line)', background: '#fff' }}>
            <div className="chatbar">
              <input
                className="input"
                style={{ fontSize: 14.5, borderRadius: 10 }}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder="Hỏi Vi bằng tiếng Việt hoặc tiếng Anh... (Enter để gửi)"
                disabled={busy}
              />
              <button className="btn" onClick={() => send()} disabled={busy || !text.trim()} aria-label="Gửi tin nhắn">
                <Icon n="send" s={20} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Helper renderer for each conversation item in left panel
  function renderConvItem(c: Conversation, isPinned: boolean) {
    const isSelected = cur === c.id;
    const isEditing = editingId === c.id;

    if (isEditing) {
      return (
        <div
          key={c.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '6px 8px',
            background: '#f1f5f9',
            borderRadius: 8,
          }}
        >
          <input
            ref={editInputRef}
            className="input sm"
            style={{ fontSize: 13, flex: 1, padding: '4px 8px' }}
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveRename(c.id);
              if (e.key === 'Escape') setEditingId(null);
            }}
          />
          <button
            className="conv-btn"
            style={{ color: '#16a34a', padding: 4 }}
            onClick={() => saveRename(c.id)}
            title="Lưu tên mới (Enter)"
          >
            <Icon n="check" s={16} />
          </button>
          <button
            className="conv-btn"
            style={{ color: 'var(--muted)', padding: 4 }}
            onClick={() => setEditingId(null)}
            title="Hủy (Esc)"
          >
            <Icon n="x" s={16} />
          </button>
        </div>
      );
    }

    return (
      <div
        key={c.id}
        className={'conv-item' + (isSelected ? ' on' : '')}
        onClick={() => openConv(c.id)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
          <span style={{ color: isPinned ? '#d97706' : isSelected ? 'var(--primary)' : 'var(--muted)', flexShrink: 0 }}>
            {isPinned ? '📌' : <Icon n="msg" s={16} />}
          </span>
          <span
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontSize: 13.5,
              color: 'inherit',
            }}
            title={c.title}
          >
            {c.title}
          </span>
        </div>

        {/* Hover / Active Action Buttons */}
        <div className="conv-actions">
          <button
            className={'conv-btn' + (isPinned ? ' pinned' : '')}
            onClick={(e) => togglePin(c.id, e)}
            title={isPinned ? 'Bỏ ghim' : 'Ghim lên đầu'}
          >
            <Icon n="pin" s={14} />
          </button>
          <button
            className="conv-btn"
            onClick={(e) => startRename(c, e)}
            title="Đặt lại tên cho đoạn chat"
          >
            <Icon n="edit" s={14} />
          </button>
          <button
            className="conv-btn danger"
            onClick={(e) => deleteConv(c.id, e)}
            title="Xóa đoạn chat"
          >
            <Icon n="trash" s={14} />
          </button>
        </div>
      </div>
    );
  }
}
