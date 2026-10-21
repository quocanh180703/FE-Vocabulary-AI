import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { speakApi, personalizedApi, errMsg } from '../api';
import type { SpeakSession } from '../api';
import { Icon, Mascot } from '../components/icons';
import { useAuth } from '../auth/AuthContext';

interface TopicItem {
  name: string;
  en: string;
  category: 'daily' | 'hobbies' | 'work' | 'travel' | 'tech';
  tag: string;
  desc: string;
}

const CATEGORIES = [
  { id: 'all', name: 'Tất cả' },
  { id: 'daily', name: 'Đời sống' },
  { id: 'hobbies', name: 'Sở thích' },
  { id: 'work', name: 'Công việc & Học tập' },
  { id: 'travel', name: 'Du lịch & Văn hóa' },
  { id: 'tech', name: 'Công nghệ & Xã hội' },
];

const TOPICS: TopicItem[] = [
  // 1. Đời sống
  {
    name: 'Giới thiệu bản thân',
    en: 'Introduce Yourself',
    category: 'daily',
    tag: 'A1-A2',
    desc: 'Nói về tên, tuổi, quê quán, nghề nghiệp hiện tại và các thành viên trong gia đình bạn.',
  },
  {
    name: 'Thói quen một ngày của bạn',
    en: 'My Daily Routine',
    category: 'daily',
    tag: 'A1-A2',
    desc: 'Kể về lịch trình từ sáng thức dậy, bữa ăn, công việc/học tập đến lúc đi ngủ.',
  },
  {
    name: 'Kể về cuối tuần vừa qua',
    en: 'My Last Weekend',
    category: 'daily',
    tag: 'A2',
    desc: 'Bạn đã dành thời gian làm gì? Đi chơi với ai, xem phim hay nghỉ ngơi ở nhà?',
  },
  {
    name: 'Ngôi nhà hoặc căn phòng lý tưởng',
    en: 'My Ideal Home or Room',
    category: 'daily',
    tag: 'A2-B1',
    desc: 'Mô tả không gian sống trong mơ của bạn: vị trí, nội thất và góc bạn yêu thích nhất.',
  },
  {
    name: 'Thói quen mua sắm và phong cách ăn mặc',
    en: 'Shopping & Personal Style',
    category: 'daily',
    tag: 'A2-B1',
    desc: 'Bạn thường mua sắm online hay ra cửa hàng? Phong cách thời trang bạn thấy tự tin nhất là gì?',
  },

  // 2. Sở thích & Phong cách sống
  {
    name: 'Món ăn và ẩm thực yêu thích',
    en: 'Favorite Food & Cooking',
    category: 'hobbies',
    tag: 'A2-B1',
    desc: 'Món ăn khoái khẩu của bạn là gì? Bạn có biết nấu ăn không và hương vị của nó ra sao?',
  },
  {
    name: 'Thú cưng và tình yêu động vật',
    en: 'Pets & Animals',
    category: 'hobbies',
    tag: 'A1-A2',
    desc: 'Kể về thú cưng bạn đang nuôi hoặc con vật bạn thích, lý do bạn thấy chúng đáng yêu.',
  },
  {
    name: 'Bộ phim hoặc cuốn sách đáng nhớ nhất',
    en: 'A Memorable Movie or Book',
    category: 'hobbies',
    tag: 'B1-B2',
    desc: 'Nội dung chính câu chuyện là gì và thông điệp hay bài học ý nghĩa đọng lại trong bạn?',
  },
  {
    name: 'Âm nhạc trong cuộc sống của bạn',
    en: 'Music in My Daily Life',
    category: 'hobbies',
    tag: 'A2-B1',
    desc: 'Thể loại nhạc và ca sĩ bạn yêu thích; bạn thường nghe nhạc khi nào (khi học, thư giãn)?',
  },
  {
    name: 'Thể thao và thói quen rèn luyện sức khỏe',
    en: 'Sports & Staying Fit',
    category: 'hobbies',
    tag: 'B1',
    desc: 'Môn thể thao bạn chơi hoặc cách bạn tập luyện để duy trì sức khỏe và giải tỏa căng thẳng.',
  },

  // 3. Công việc & Học tập
  {
    name: 'Công việc mơ ước trong tương lai',
    en: 'My Dream Career',
    category: 'work',
    tag: 'B1-B2',
    desc: 'Lý do bạn chọn nghề nghiệp này, môi trường làm việc lý tưởng và những kỹ năng bạn đang chuẩn bị.',
  },
  {
    name: 'Kỷ niệm ngày đầu tiên đi học hoặc đi làm',
    en: 'First Day Experience',
    category: 'work',
    tag: 'B1',
    desc: 'Cảm giác bỡ ngỡ, những người đồng nghiệp/bạn bè đầu tiên bạn gặp và bài học bạn nhận được.',
  },
  {
    name: 'Làm việc nhóm hay làm việc độc lập?',
    en: 'Teamwork vs Working Alone',
    category: 'work',
    tag: 'B2',
    desc: 'So sánh ưu nhược điểm của hai hình thức; bạn thấy bản thân phù hợp hơn với phương thức nào?',
  },
  {
    name: 'Kỹ năng quan trọng nhất trong thời đại số',
    en: 'Essential Modern Skills',
    category: 'work',
    tag: 'B2-C1',
    desc: 'Tại sao kỹ năng giao tiếp, ngoại ngữ hoặc tư duy phản biện lại là chìa khóa thành công?',
  },
  {
    name: 'Cách bạn quản lý thời gian và vượt qua áp lực',
    en: 'Time & Stress Management',
    category: 'work',
    tag: 'B1-B2',
    desc: 'Phương pháp bạn sắp xếp thứ tự ưu tiên cho công việc và cách lấy lại cân bằng khi bị stress.',
  },

  // 4. Du lịch & Văn hóa
  {
    name: 'Chuyến du lịch đáng nhớ nhất của bạn',
    en: 'A Memorable Journey',
    category: 'travel',
    tag: 'A2-B1',
    desc: 'Nơi bạn đã đến, phong cảnh, ẩm thực địa phương và kỷ niệm khiến bạn không thể quên.',
  },
  {
    name: 'Một lễ hội truyền thống bạn yêu thích',
    en: 'Favorite Traditional Festival',
    category: 'travel',
    tag: 'B1-B2',
    desc: 'Không khí ngày Tết cổ truyền, Trung thu hay lễ hội quê hương; những hoạt động truyền thống đặc sắc.',
  },
  {
    name: 'Thành phố bạn mơ ước được đặt chân đến',
    en: 'A City I Dream to Visit',
    category: 'travel',
    tag: 'A2-B1',
    desc: 'Thành phố nào trên thế giới cuốn hút bạn nhất? Bạn sẽ làm gì đầu tiên khi đến đó?',
  },
  {
    name: 'Trải nghiệm khám phá thiên nhiên',
    en: 'Outdoor Adventures & Nature',
    category: 'travel',
    tag: 'B1',
    desc: 'Cảm giác khi đi dã ngoại, leo núi, cắm trại ngoài trời hoặc ngắm hoàng hôn bên bờ biển.',
  },

  // 5. Công nghệ & Xã hội
  {
    name: 'Trí tuệ nhân tạo (AI) trong đời sống hàng ngày',
    en: 'AI in Daily Life',
    category: 'tech',
    tag: 'B1-B2',
    desc: 'AI mang lại những tiện ích gì cho việc học và bạn có lo ngại AI thay thế việc làm không?',
  },
  {
    name: 'Mặt tích cực và tiêu cực của Mạng xã hội',
    en: 'Social Media: Pros & Cons',
    category: 'tech',
    tag: 'B1-B2',
    desc: 'Facebook, TikTok giúp kết nối bạn bè nhưng ảnh hưởng thế nào đến thời gian và sự tập trung?',
  },
  {
    name: 'Bảo vệ môi trường và lối sống xanh',
    en: 'Protecting the Environment',
    category: 'tech',
    tag: 'B2',
    desc: 'Những hành động cụ thể mỗi ngày như phân loại rác, hạn chế đồ nhựa dùng một lần.',
  },
  {
    name: 'Tương lai của việc học ngoại ngữ trực tuyến',
    en: 'Future of Online Language Learning',
    category: 'tech',
    tag: 'B1-B2',
    desc: 'Liệu các ứng dụng thông minh có thể thay thế hoàn toàn lớp học truyền thống trong tương lai?',
  },
];

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'];

export default function Speaking() {
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [topic, setTopic] = useState<string>(TOPICS[0].name);
  const [customTopic, setCustomTopic] = useState<string>('');
  const [isCustom, setIsCustom] = useState<boolean>(false);

  // Storage key for roadmap data
  const storageKey = `vocab_ai_roadmap_${user?.id || user?.username || 'default'}`;
  const getInitialLevel = () => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.profile?.currentLevel) return parsed.profile.currentLevel;
      }
    } catch {}
    return 'B1';
  };

  const initialLvl = getInitialLevel();
  const [level, setLevel] = useState(initialLvl);
  const [recommendedLevel, setRecommendedLevel] = useState<string>(initialLvl);
  const [session, setSession] = useState<SpeakSession | null>(null);
  const [rec, setRec] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const mr = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const [historySessions, setHistorySessions] = useState<any[]>([]);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [, setLoadingHistory] = useState(false);
  const nav = useNavigate();

  useEffect(() => {
    let interval: any = null;
    if (rec) {
      setRecordSeconds(0);
      interval = setInterval(() => {
        setRecordSeconds((s) => s + 1);
      }, 1000);
    } else {
      setRecordSeconds(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [rec]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const loadHistory = () => {
    setLoadingHistory(true);
    speakApi
      .listSessions(0, 10)
      .then(({ data }) => {
        const list = Array.isArray(data?.content) ? data.content : Array.isArray(data) ? data : [];
        setHistorySessions(list);
      })
      .catch(() => {})
      .finally(() => setLoadingHistory(false));
  };

  useEffect(() => {
    loadHistory();
    personalizedApi
      .level()
      .then(({ data }) => {
        if (data && LEVELS.includes(data)) {
          setLevel(data);
          setRecommendedLevel(data);
        }
      })
      .catch(() => {});

    const onRoadmapAnalyzed = (e: any) => {
      const lvl = e?.detail?.currentLevel;
      if (lvl && LEVELS.includes(lvl)) {
        setLevel(lvl);
        setRecommendedLevel(lvl);
      }
    };
    window.addEventListener('vocab_roadmap_analyzed', onRoadmapAnalyzed);
    return () => window.removeEventListener('vocab_roadmap_analyzed', onRoadmapAnalyzed);
  }, [storageKey]);

  const activeTopicObj = TOPICS.find((t) => t.name === topic);

  const startSession = async () => {
    const finalTopic = isCustom && customTopic.trim() ? customTopic.trim() : topic;
    if (!finalTopic) {
      setErr('Vui lòng chọn hoặc nhập chủ đề luyện nói.');
      return;
    }

    setErr('');
    setBusy(true);
    try {
      const { data } = await speakApi.createSession(finalTopic, level);
      setSession(data);
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const toggleRec = async () => {
    if (rec) {
      mr.current?.stop();
      setRec(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunks.current = [];
      const m = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      m.ondataavailable = (e) => {
        if (e.data.size) chunks.current.push(e.data);
      };
      m.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (!session) return;
        setBusy(true);
        try {
          const res = await speakApi.uploadAttempt(session.id, new Blob(chunks.current, { type: 'audio/webm' }));
          nav('/speaking/result', { state: { sessionId: session.id, latestResult: res.data } });
        } catch (e) {
          setErr(errMsg(e, 'Gửi bản ghi lỗi, thử lại nhé.'));
          setBusy(false);
        }
      };
      mr.current = m;
      m.start();
      setRec(true);
    } catch {
      setErr('Không truy cập được micro. Cho phép quyền micro rồi thử lại nhé.');
    }
  };

  const filteredTopics =
    selectedCategory === 'all'
      ? TOPICS
      : TOPICS.filter((t) => t.category === selectedCategory);

  return (
    <div className="content narrow" style={{ maxWidth: 880 }}>
      <div className="pagehead">
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '4px 12px', background: 'rgba(79, 70, 229, 0.08)', borderRadius: 99, color: 'var(--primary)', fontSize: 13, fontWeight: 800, marginBottom: 8 }}>
          <Icon n="mic" s={14} /> AI Speech Evaluation & Fluency Lab
        </div>
        <h1>Luyện nói phản xạ cùng AI</h1>
        <div className="sub">Đa dạng chủ đề giao tiếp & học thuật — Chấm ngữ pháp, độ trôi chảy, phát âm và từ vựng tự nhiên</div>
      </div>

      {err && <div className="error">{err}</div>}

      {!session ? (
        <div className="card" style={{ padding: '28px 30px', borderRadius: 20 }}>
          {/* Badge độ khó thích ứng */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              background: 'linear-gradient(135deg, #F5F3FF 0%, #EEF2FF 100%)',
              border: '1px solid #DDD6FE',
              padding: '14px 18px',
              borderRadius: 14,
              marginBottom: 22,
            }}
          >
            <Mascot s={36} />
            <div style={{ fontSize: 13.5, color: '#1E1B4B', lineHeight: 1.5 }}>
              <b style={{ color: 'var(--primary)' }}>Độ khó thích ứng (Adaptive AI):</b> Vi gợi ý trình độ <b>{recommendedLevel}</b> phù hợp nhất với vốn từ vựng hiện tại của bạn. Bạn có thể chọn chủ đề bên dưới để bắt đầu ngay!
            </div>
          </div>

          {/* Bộ lọc danh mục chủ đề */}
          <div className="field">
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>1. Chọn danh mục chủ đề</span>
              <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 700 }}>
                {filteredTopics.length} chủ đề gợi ý
              </span>
            </label>
            <div className="chips" style={{ marginBottom: 6 }}>
              {CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  className={'chip' + (selectedCategory === c.id ? ' on' : '')}
                  onClick={() => setSelectedCategory(c.id)}
                  style={{ fontSize: 13, padding: '7px 14px' }}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* Danh sách chủ đề gợi ý phong phú */}
          <div className="field mt16">
            <label>2. Chủ đề luyện nói gợi ý</label>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                gap: 10,
                marginTop: 6,
                maxHeight: 280,
                overflowY: 'auto',
                paddingRight: 4,
              }}
            >
              {filteredTopics.map((t) => {
                const isSelected = !isCustom && topic === t.name;
                return (
                  <button
                    key={t.name}
                    className={`card hoverable ${isSelected ? 'selected-topic' : ''}`}
                    onClick={() => {
                      setTopic(t.name);
                      setIsCustom(false);
                    }}
                    style={{
                      textAlign: 'left',
                      padding: '12px 14px',
                      borderRadius: 10,
                      cursor: 'pointer',
                      border: isSelected ? '2px solid var(--primary)' : '1px solid var(--line)',
                      background: isSelected ? 'var(--tint)' : '#fff',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                      <b style={{ fontSize: 14, color: isSelected ? 'var(--primary-dark)' : 'var(--ink)' }}>
                        {t.name}
                      </b>
                      <span className="pill" style={{ fontSize: 10.5, padding: '2px 6px', flexShrink: 0 }}>
                        {t.tag}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4, fontStyle: 'italic' }}>
                      {t.en}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Hoặc tự nhập chủ đề theo ý muốn */}
          <div className="field mt16">
            <label>Hoặc tự nhập chủ đề bạn muốn luyện tập</label>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <input
                type="text"
                className="input"
                placeholder="Ví dụ: My favorite season, Living in a big city..."
                value={customTopic}
                onChange={(e) => {
                  setCustomTopic(e.target.value);
                  if (e.target.value.trim()) {
                    setIsCustom(true);
                  }
                }}
                style={{
                  height: 46,
                  fontSize: 14,
                  border: isCustom ? '2px solid var(--primary)' : '1px solid var(--line)',
                }}
              />
              {isCustom && customTopic.trim() && (
                <button
                  className="chip on"
                  style={{ height: 46, padding: '0 14px', whiteSpace: 'nowrap' }}
                  onClick={() => setIsCustom(false)}
                >
                  Dùng gợi ý
                </button>
              )}
            </div>
          </div>

          {/* Khung gợi ý ý tưởng nói (Speaking Idea Hints) */}
          {!isCustom && activeTopicObj && (
            <div
              style={{
                marginTop: 14,
                padding: '12px 16px',
                background: '#f8fafc',
                border: '1px dashed #cbd5e1',
                borderRadius: 8,
                fontSize: 13,
                lineHeight: 1.5,
                color: '#475569',
              }}
            >
              <b style={{ color: 'var(--primary-dark)' }}>💡 Gợi ý dàn ý: </b>
              {activeTopicObj.desc}
            </div>
          )}

          {/* Chọn trình độ CEFR */}
          <div className="field mt16">
            <label>3. Trình độ đánh giá (CEFR Level)</label>
            <div className="chips">
              {LEVELS.map((l) => (
                <button
                  key={l}
                  className={'chip' + (level === l ? ' on' : '')}
                  onClick={() => setLevel(l)}
                  style={{ minWidth: 60, justifyContent: 'center' }}
                >
                  {l}
                  {l === recommendedLevel && <span style={{ fontSize: 10.5, marginLeft: 4 }}>✨ Đề xuất</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Nút bắt đầu */}
          <button className="btn block mt16" disabled={busy} onClick={startSession} style={{ minHeight: 52 }}>
            <Icon n="mic" s={20} />
            {busy ? 'Đang tạo phòng luyện...' : `Bắt đầu luyện nói: "${isCustom && customTopic ? customTopic : topic}"`}
          </button>

          {/* Lịch sử các bài luyện nói đã lưu */}
          {historySessions.length > 0 && (
            <div style={{ marginTop: 28, borderTop: '1px solid var(--line)', paddingTop: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <h3 style={{ fontSize: 16.5, fontWeight: 900, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icon n="clock" s={18} />
                  Lịch sử các bài luyện nói đã lưu
                </h3>
                <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 700 }}>
                  {historySessions.length} phiên gần đây
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {historySessions.map((hs: any) => {
                  const score = hs.overallScore != null ? Math.round(Number(hs.overallScore)) : null;
                  return (
                    <div
                      key={hs.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 14px',
                        background: '#f8fafc',
                        border: '1px solid var(--line)',
                        borderRadius: 8,
                        gap: 12,
                      }}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <b style={{ fontSize: 14.5, color: 'var(--ink)' }}>{hs.topic}</b>
                          <span className="pill level" style={{ fontSize: 11, padding: '2px 6px' }}>
                            {hs.level}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>
                          {hs.attemptCount ? `${hs.attemptCount} lần thử` : '1 lần thử'} ·{' '}
                          {hs.createdAt ? new Date(hs.createdAt).toLocaleDateString('vi-VN') : 'Gần đây'}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                        {score != null ? (
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--primary-dark)' }}>
                              {score}đ
                            </div>
                            <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>Điểm tổng</div>
                          </div>
                        ) : (
                          <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>Chưa có điểm</span>
                        )}

                        <button
                          className="btn ghost"
                          style={{ minHeight: 36, padding: '0 14px', fontSize: 13, borderRadius: 6 }}
                          onClick={() => nav('/speaking/result', { state: { sessionId: hs.id } })}
                        >
                          Xem lại
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Màn hình khi đang ghi âm */
        <div
          className="card"
          style={{
            padding: '36px 32px',
            borderRadius: 24,
            textAlign: 'center',
            background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)',
            border: '1px solid #E2E8F0',
            boxShadow: '0 12px 32px rgba(15, 23, 42, 0.05)',
          }}
        >
          {/* Top navigation row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <button
              className="btn ghost sm"
              onClick={() => {
                if (rec) mr.current?.stop();
                setRec(false);
                setSession(null);
              }}
              style={{ fontSize: 13, gap: 6 }}
            >
              ← Chọn chủ đề khác
            </button>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span className="pill" style={{ fontSize: 12, padding: '4px 10px', background: '#EEF2FF', color: 'var(--primary)' }}>
                {topic}
              </span>
              <span className="pill level" style={{ fontSize: 12, padding: '4px 10px' }}>
                {level}
              </span>
            </div>
          </div>

          <h2 style={{ fontSize: 26, fontWeight: 900, color: 'var(--ink)', margin: '10px 0 6px' }}>
            Hãy nói về: <span style={{ color: 'var(--primary)' }}>"{topic}"</span>
          </h2>
          <div className="sub" style={{ fontSize: 14, color: 'var(--muted)' }}>
            Hãy trả lời tự nhiên từ 30–60 giây. Khi nói xong, bấm nút dừng để AI đánh giá chi tiết.
          </div>

          {/* Dàn ý gợi ý */}
          {activeTopicObj && (
            <div
              style={{
                maxWidth: 580,
                margin: '18px auto 0',
                padding: '12px 18px',
                background: '#F0F9FF',
                border: '1px dashed #BAE6FD',
                borderRadius: 12,
                fontSize: 13.5,
                color: '#0369A1',
                lineHeight: 1.6,
                textAlign: 'left',
              }}
            >
              <b style={{ color: '#0284C7' }}>💡 Gợi ý dàn ý: </b>
              {activeTopicObj.desc}
            </div>
          )}

          {/* Live Timer Pill */}
          <div style={{ margin: '24px auto 16px', display: 'flex', justifyContent: 'center' }}>
            {rec ? (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 20px',
                  background: '#FEF2F2',
                  border: '1px solid #FECACA',
                  borderRadius: 99,
                  color: '#DC2626',
                  fontWeight: 900,
                  fontSize: 16,
                  boxShadow: '0 4px 14px rgba(220, 38, 38, 0.15)',
                }}
              >
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: '#EF4444',
                    display: 'inline-block',
                    animation: 'pulse 1.2s infinite',
                  }}
                />
                Đang ghi âm: {formatTime(recordSeconds)}
                <span style={{ fontSize: 12, fontWeight: 600, color: '#991B1B' }}>/ 01:00</span>
              </div>
            ) : (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 16px',
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: 99,
                  color: '#64748B',
                  fontWeight: 700,
                  fontSize: 13,
                }}
              >
                ⏱️ Khuyên dùng: 30 - 60 giây
              </div>
            )}
          </div>

          {/* Microphone Animation & Recording Trigger */}
          <div style={{ margin: '20px 0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {rec ? (
              <>
                <div className="wave" style={{ marginBottom: 20 }}>
                  {Array.from({ length: 9 }).map((_, i) => (
                    <i key={i} style={{ background: 'linear-gradient(180deg, #EF4444 0%, #DC2626 100%)' }} />
                  ))}
                </div>
                <button
                  className="rec"
                  onClick={toggleRec}
                  style={{
                    width: 88,
                    height: 88,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                    color: '#fff',
                    border: '4px solid #FEE2E2',
                    boxShadow: '0 0 0 10px rgba(239, 68, 68, 0.2), 0 10px 24px rgba(220, 38, 38, 0.4)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease',
                  }}
                  title="Bấm để dừng ghi âm"
                >
                  <Icon n="mic" s={38} />
                </button>
              </>
            ) : (
              <button
                className="rec"
                onClick={toggleRec}
                disabled={busy}
                aria-label="bắt đầu ghi âm"
                style={{
                  width: 88,
                  height: 88,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
                  color: '#fff',
                  border: '4px solid #EEF2FF',
                  boxShadow: '0 10px 24px rgba(79, 70, 229, 0.3)',
                  cursor: busy ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                }}
              >
                <Icon n="mic" s={38} />
              </button>
            )}
          </div>

          {/* Action Button */}
          <div style={{ marginTop: 16 }}>
            {rec ? (
              <button
                className="btn"
                onClick={toggleRec}
                style={{
                  background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                  color: '#fff',
                  minHeight: 48,
                  padding: '0 24px',
                  borderRadius: 12,
                  fontWeight: 800,
                  fontSize: 15,
                  boxShadow: '0 6px 18px rgba(220, 38, 38, 0.25)',
                }}
              >
                ■ Dừng & gửi chấm điểm
              </button>
            ) : (
              <button
                className="btn"
                onClick={toggleRec}
                disabled={busy}
                style={{
                  minHeight: 48,
                  padding: '0 24px',
                  borderRadius: 12,
                  fontWeight: 800,
                  fontSize: 15,
                }}
              >
                <Icon n="mic" s={18} />
                {busy ? 'Đang gửi bản ghi...' : 'Bắt đầu ghi âm'}
              </button>
            )}
          </div>

          {/* Coach Vi Advice Box */}
          <div
            className="coach mt16"
            style={{
              textAlign: 'left',
              maxWidth: 580,
              margin: '28px auto 0',
              background: '#F8FAFC',
              borderRadius: 14,
              padding: '12px 18px',
              border: '1px solid #E2E8F0',
            }}
          >
            <Mascot s={46} />
            <div className="bubble" style={{ background: '#fff', border: '1px solid #E2E8F0' }}>
              <b style={{ color: 'var(--primary)' }}>Mẹo từ Vi: </b>
              Hãy nói to rõ ràng, phát âm chuẩn các âm đuôi (-s, -ed) và dùng thì phù hợp. Đừng lo lắng về lỗi sai nhé, AI sẽ chỉ ra để bạn cải thiện!
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
