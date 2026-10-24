import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { aiApi, errMsg } from '../api';
import type { Conversation, ChatMsg } from '../api';
import { Icon } from '../components/icons';
import { AutocompleteSearch } from '../components/AutocompleteSearch';
import { messageBubbleVariant } from '../motion';
import viAvatar from '../assets/vi-3d.webp';
import { QuotaBadge } from '../components/QuotaBadge';
import { useUsage } from '../context/UsageContext';

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
            color: 'var(--red-dark)',
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
        <strong key={match.index} style={{ fontWeight: 800, color: 'var(--ink)' }}>
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
        <hr key={`hr-${i}`} style={{ border: 'none', borderTop: '1px solid var(--line)', margin: '12px 0' }} />
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
            color: 'var(--ink)',
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
      <p key={`p-${i}`} style={{ margin: '0 0 8px 0', lineHeight: 1.65 }}>
        {renderInlineMarkdown(line)}
      </p>
    );
  });

  flushList();

  return <div className="chat-markdown" style={{ fontSize: 14.5 }}>{elements}</div>;
}

// ---------------- Suggested Prompts ----------------
const STARTER_PROMPTS = [
  '💡 Phân biệt Affect và Effect',
  '📝 Sửa ngữ pháp: "She don\'t like apple"',
  '🎯 5 cách chào hỏi tự nhiên trong công việc',
  '🗣️ Cách dùng thì Hiện tại hoàn thành (Present Perfect)',
];

export default function Chat() {
  const { decrementQuota } = useUsage();
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
        const list: Conversation[] = (data?.content || []).filter(
          (c: Conversation) =>
            c.type === 'GENERAL' &&
            !c.title?.startsWith('Giải thích:') &&
            !c.title?.startsWith('Giải thích câu:')
        );
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
      decrementQuota('chat');
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
    <div className="content" style={{ maxWidth: 1180 }}>
      {/* Page Header */}
      <div className="pagehead">
        <h1>Trò chuyện với Vi</h1>
        <div className="sub">Hỏi nghĩa từ, luyện viết câu, giải thích ngữ pháp — Vi trả lời ngay</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 18, alignItems: 'start' }}>
        {/* Left Sidebar: Conversations list */}
        <div className="card" style={{ padding: 14 }}>
          <button
            type="button"
            className="btn block"
            style={{ minHeight: 48 }}
            onClick={newConv}
          >
            <Icon n="pen" s={18} /> Cuộc trò chuyện mới
          </button>

          {/* Search bar with autocomplete */}
          <div style={{ marginTop: 10 }}>
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
              inputStyle={{ height: 40, fontSize: 13, borderRadius: 12, paddingLeft: 38 }}
            />
          </div>

          {/* Scrollable Conversation List */}
          <div className="conv mt8" style={{ maxHeight: 520, overflowY: 'auto' }}>
            {/* Pinned Section */}
            {pinnedList.length > 0 && (
              <div style={{ marginBottom: 6 }}>
                <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.8, color: 'var(--yellow-dark)', padding: '4px 8px 6px', display: 'flex', alignItems: 'center', gap: 4 }}>
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
              <div className="center" style={{ padding: 24, fontSize: 13, color: 'var(--muted)' }}>
                {search ? 'Không tìm thấy đoạn chat nào.' : 'Chưa có đoạn chat nào.'}
              </div>
            )}
          </div>
        </div>

        {/* Right Chat Panel */}
        <div className="card" style={{ padding: 22, display: 'flex', flexDirection: 'column', minHeight: 620 }}>
          {/* Chat Window Header */}
          <div
            style={{
              paddingBottom: 14,
              borderBottom: '1px solid var(--line)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <img
                  src={viAvatar}
                  alt="Vi"
                  style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover' }}
                />
                <span
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: 'var(--green)',
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
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                  Trợ lý AI tiếng Anh · Phản hồi thông minh 24/7
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              <QuotaBadge featureKey="chat" labelSuffix="lượt hôm nay" />
              {curConv && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  type="button"
                  className="btn ghost sm"
                  onClick={() => cur && togglePin(cur)}
                  title={isCurPinned ? 'Bỏ ghim' : 'Ghim'}
                  style={{ padding: '6px 10px', fontSize: 12.5 }}
                >
                  <Icon n="pin" s={14} />
                  <span>{isCurPinned ? 'Đã ghim' : 'Ghim'}</span>
                </button>
                <button
                  type="button"
                  className="btn ghost sm"
                  onClick={() => curConv && startRename(curConv)}
                  title="Đổi tên"
                  style={{ padding: '6px 10px', fontSize: 12.5 }}
                >
                  <Icon n="edit" s={14} />
                  <span>Đổi tên</span>
                </button>
                <button
                  type="button"
                  className="btn ghost sm"
                  onClick={() => cur && deleteConv(cur)}
                  title="Xóa"
                  style={{ padding: '6px 10px', color: 'var(--red-dark)', borderColor: 'rgba(229,72,77,0.3)' }}
                >
                  <Icon n="trash" s={14} />
                </button>
              </div>
            )}
            </div>
          </div>

          {err && <div className="error mt8">{err}</div>}

          {/* Messages Scroll Area */}
          <div className="chatwin" style={{ flex: 1, overflowY: 'auto', maxHeight: 460, padding: '16px 4px' }}>
            {msgs.length === 0 && (
              <div className="center" style={{ padding: '40px 20px', maxWidth: 480, margin: '0 auto' }}>
                <img src={viAvatar} alt="Vi" style={{ width: 72, height: 72, objectFit: 'contain' }} />
                <h3 style={{ marginTop: 14, marginBottom: 6 }}>Chào bạn! Vi có thể giúp gì cho bạn?</h3>
                <div className="sub" style={{ fontSize: 13.5, lineHeight: 1.5 }}>
                  Hỏi mình nghĩa từ, sửa câu, gợi ý từ vựng theo chủ đề hoặc giải thích cấu trúc ngữ pháp nhé!
                </div>

                {/* Prompt suggestion chips */}
                <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 8, width: '100%', textAlign: 'left' }}>
                  <div style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Gợi ý câu hỏi nhanh:
                  </div>
                  {STARTER_PROMPTS.map((prompt, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="taskrow"
                      style={{
                        cursor: 'pointer',
                        border: '1px solid var(--line)',
                        background: '#fff',
                        textAlign: 'left',
                        padding: '10px 14px',
                        fontSize: 13.5,
                        fontWeight: 700,
                        color: 'var(--ink)',
                        width: '100%',
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
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, maxWidth: '85%' }}>
                    {!isMe && (
                      <img
                        src={viAvatar}
                        alt="Vi"
                        style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, marginTop: 4 }}
                      />
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
                    <div style={{ marginLeft: 40, display: 'flex', alignItems: 'center', gap: 10 }}>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(m.id, m.content)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: 11.5,
                          padding: '2px 8px',
                          borderRadius: 6,
                          color: 'var(--muted)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          fontWeight: 700,
                        }}
                        title="Sao chép câu trả lời"
                      >
                        {copiedId === m.id ? (
                          <>
                            <Icon n="check" s={12} />
                            <span style={{ color: 'var(--green-dark)' }}>Đã sao chép</span>
                          </>
                        ) : (
                          <>
                            <Icon n="copy" s={12} />
                            <span>Sao chép</span>
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
                  <img
                    src={viAvatar}
                    alt="Vi"
                    style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }}
                  />
                  <div className="msg ai" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="copilot-dot" />
                    <span className="copilot-dot" />
                    <span className="copilot-dot" />
                    <span style={{ fontSize: 13, color: 'var(--muted)', marginLeft: 4 }}>Vi đang suy nghĩ...</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div ref={bottom} />
          </div>

          {/* Chatbar / Input Box */}
          <div className="chatbar mt16">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Nhắn cho Vi… (Enter để gửi)"
              disabled={busy}
            />
            <button
              type="button"
              className="sendbtn"
              onClick={() => send()}
              disabled={busy || !text.trim()}
              aria-label="Gửi tin nhắn"
            >
              <Icon n="send" s={20} />
            </button>
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
            background: 'var(--tint)',
            borderRadius: 12,
          }}
        >
          <input
            ref={editInputRef}
            className="input"
            style={{ fontSize: 13, flex: 1, padding: '4px 8px', minHeight: 32 }}
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveRename(c.id);
              if (e.key === 'Escape') setEditingId(null);
            }}
          />
          <button
            type="button"
            className="btn ghost sm"
            style={{ color: 'var(--green-dark)', padding: '4px 8px' }}
            onClick={() => saveRename(c.id)}
            title="Lưu (Enter)"
          >
            <Icon n="check" s={14} />
          </button>
          <button
            type="button"
            className="btn ghost sm"
            style={{ color: 'var(--muted)', padding: '4px 8px' }}
            onClick={() => setEditingId(null)}
            title="Hủy (Esc)"
          >
            <Icon n="x" s={14} />
          </button>
        </div>
      );
    }

    return (
      <button
        key={c.id}
        type="button"
        className={'convitem' + (isSelected ? ' on' : '')}
        onClick={() => openConv(c.id)}
      >
        <span className="wchk" style={{ flexShrink: 0 }}>
          {isPinned ? (
            <span style={{ fontSize: 12 }}>📌</span>
          ) : (
            <Icon n="spark" s={14} />
          )}
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <div className="ct" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {c.title}
          </div>
          <div className="cs">
            {new Date(c.createdAt).toLocaleDateString('vi-VN')}
          </div>
        </span>
      </button>
    );
  }
}
