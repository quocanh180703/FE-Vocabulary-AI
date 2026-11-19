import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { aiApi, errMsg } from '../api';
import type { Conversation, ChatMsg } from '../api';
import { Icon } from '../components/icons';
import { ConfirmModal } from '../components/ConfirmModal';
import { AutocompleteSearch } from '../components/AutocompleteSearch';
import { messageBubbleVariant } from '../motion';
import { ViMascotImage } from '../components/ViMascotImage';
import { UiIcon } from '../components/UiIcon';
import { SplitHeading } from '../components/SageEffects';
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
  'Phân biệt Affect và Effect',
  'Sửa ngữ pháp: "She don\'t like apple"',
  '5 cách chào hỏi tự nhiên trong công việc',
  'Cách dùng thì Hiện tại hoàn thành (Present Perfect)',
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
  const [convToDelete, setConvToDelete] = useState<{ id: number; title: string } | null>(null);
  const [deletingConv, setDeletingConv] = useState(false);
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

  const handleConfirmDeleteConv = async () => {
    if (!convToDelete) return;
    const id = convToDelete.id;
    setDeletingConv(true);
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
    setDeletingConv(false);
    setConvToDelete(null);
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
    <div className="content">
      {/* Compact Page Header */}
      <div className="pagehead">
        <div>
          <div className="eyebrow">VI AI TUTOR · CONVERSATION</div>
          <SplitHeading text="Trò chuyện với Vi" />
          <p className="sub">Hỏi nghĩa từ, luyện viết câu, giải thích ngữ pháp — Vi trả lời ngay</p>
        </div>
        <QuotaBadge featureKey="chat" labelSuffix="lượt hôm nay" />
      </div>

      {/* Viewport-Locked 2-Column Chat Workspace */}
      <div
        className="cols2"
        style={{
          gridTemplateColumns: '280px minmax(0, 1fr)',
          flex: 1,
          minHeight: 0,
          alignItems: 'stretch',
        }}
      >
        {/* Left Sidebar: Conversations list */}
        <div className="card colstack" style={{ padding: 12, gap: 10, minHeight: 0 }}>
          <button
            type="button"
            className="btn block sm"
            style={{ flex: 'none' }}
            onClick={newConv}
          >
            <Icon n="pen" s={16} /> Cuộc trò chuyện mới
          </button>

          <div style={{ flex: 'none' }}>
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
              inputStyle={{ height: 38, fontSize: 13, borderRadius: 10, paddingLeft: 36 }}
            />
          </div>

          <div className="conv long-list" style={{ flex: 1, minHeight: 0, paddingRight: 2 }}>
            {pinnedList.length > 0 && (
              <div style={{ marginBottom: 6 }}>
                <div style={{ fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.8, color: 'var(--amber-dark)', padding: '4px 8px' }}>
                  <UiIcon name="pin" size={12} /> Đã ghim ({pinnedList.length})
                </div>
                {pinnedList.map((c) => renderConvItem(c, true))}
              </div>
            )}

            <div>
              {pinnedList.length > 0 && (
                <div style={{ fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.8, color: 'var(--muted)', padding: '6px 8px 4px' }}>
                  <UiIcon name="message" size={12} /> Gần đây ({otherList.length})
                </div>
              )}
              {otherList.map((c) => renderConvItem(c, false))}
            </div>

            {filteredConvs.length === 0 && (
              <div className="center" style={{ padding: 20, fontSize: 13, color: 'var(--muted)' }}>
                {search ? 'Không tìm thấy đoạn chat nào.' : 'Chưa có đoạn chat nào.'}
              </div>
            )}
          </div>
        </div>

        {/* Right Chat Panel */}
        <div className="card colstack" style={{ padding: 16, gap: 10, minHeight: 0 }}>
          {/* Chat Window Header */}
          <div
            className="row between"
            style={{
              paddingBottom: 10,
              borderBottom: '1px solid var(--line)',
              flex: 'none',
              flexWrap: 'wrap',
              gap: 10,
            }}
          >
            <div className="row" style={{ gap: 10, minWidth: 0, flex: 1 }}>
              <ViMascotImage
                pose="explain"
                size={44}
                priority
                alt="Vi trợ lý AI giải thích tiếng Anh"
              />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="row" style={{ gap: 6 }}>
                  <b style={{ fontSize: 15, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {curConv?.title || 'Trò chuyện cùng Vi'}
                  </b>
                  {isCurPinned && <span title="Đoạn chat đã được ghim"><UiIcon name="pin" size={13} /></span>}
                </div>
                <div className="tiny muted">Trợ lý AI tiếng Anh · Phản hồi thông minh</div>
              </div>
            </div>

            {curConv && (
              <div className="row" style={{ gap: 6 }}>
                <button
                  type="button"
                  className="btn ghost sm"
                  onClick={() => cur && togglePin(cur)}
                  title={isCurPinned ? 'Bỏ ghim' : 'Ghim'}
                >
                  <Icon n="pin" s={14} />
                  <span>{isCurPinned ? 'Đã ghim' : 'Ghim'}</span>
                </button>
                <button
                  type="button"
                  className="btn ghost sm"
                  onClick={() => curConv && startRename(curConv)}
                  title="Đổi tên"
                >
                  <Icon n="edit" s={14} />
                  <span>Đổi tên</span>
                </button>
                <button
                  type="button"
                  className="btn softred sm"
                  onClick={() => cur && setConvToDelete({ id: cur, title: curConv?.title || 'Đoạn hội thoại này' })}
                  title="Xóa"
                >
                  <Icon n="trash" s={14} />
                </button>
              </div>
            )}
          </div>

          {err && <div className="error">{err}</div>}

          {/* Messages Scroll Area */}
          <div className="chat-window long-list" style={{ flex: 1, minHeight: 0, padding: '8px 4px' }}>
            {msgs.length === 0 && (
              <div className="center" style={{ padding: '20px 16px', maxWidth: 480, margin: 'auto', gap: 10 }}>
                <ViMascotImage
                  pose="explain"
                  size={76}
                  alt="Vi chào bạn — hãy hỏi bất kỳ câu hỏi tiếng Anh nào"
                />
                <h3 style={{ margin: 0, fontSize: 17 }}>Chào bạn! Vi có thể giúp gì cho bạn?</h3>
                <div className="tiny muted">
                  Hỏi mình nghĩa từ, sửa câu, gợi ý từ vựng theo chủ đề hoặc giải thích cấu trúc ngữ pháp nhé!
                </div>

                <div className="colstack" style={{ gap: 6, width: '100%', textAlign: 'left', marginTop: 6 }}>
                  <div className="overline">Gợi ý câu hỏi nhanh</div>
                  {STARTER_PROMPTS.map((prompt, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="taskrow"
                      style={{ cursor: 'pointer', textAlign: 'left', width: '100%', padding: '8px 12px' }}
                      onClick={() => send(prompt)}
                    >
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{prompt}</span>
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
                      <ViMascotImage
                        pose="explain"
                        size={34}
                        alt="Vi AI trả lời câu hỏi"
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

                  {!isMe && (
                    <div style={{ marginLeft: 42, display: 'flex', alignItems: 'center', gap: 10 }}>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(m.id, m.content)}
                        className="btn ghost sm"
                        style={{ padding: '2px 8px', fontSize: 11.5 }}
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
                  <ViMascotImage
                    pose="thinking"
                    size={36}
                    alt="Vi đang suy nghĩ câu trả lời"
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

          {/* Chatbar / Input Box pinned at bottom */}
          <div className="chatbar" style={{ flex: 'none' }}>
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
              <Icon n="send" s={18} />
            </button>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={!!convToDelete}
        onClose={() => !deletingConv && setConvToDelete(null)}
        onConfirm={handleConfirmDeleteConv}
        title="Xác nhận xóa đoạn chat"
        itemName={convToDelete?.title}
        description={
          <p style={{ margin: 0 }}>
            Bạn có chắc muốn xóa cuộc trò chuyện <b style={{ color: '#0F172A' }}>"{convToDelete?.title}"</b> không?
          </p>
        }
        warningText="Toàn bộ lịch sử tin nhắn trong cuộc trò chuyện này sẽ bị xóa và không thể khôi phục."
        confirmText="Xác nhận xóa"
        cancelText="Hủy bỏ"
        loadingText="Đang xóa..."
        isLoading={deletingConv}
      />
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
            <UiIcon name="pin" size={12} />
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
