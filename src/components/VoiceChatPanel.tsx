import React, { useEffect, useRef, useState, useCallback } from 'react';
import { voiceChatApi, ttsApi, wordApi, errMsg } from '../api';
import type { VoiceChatScoreResponse, VoiceChatNewWord } from '../api';
import { Icon } from './icons';
import { QuotaBadge } from './QuotaBadge';
import { useUsage } from '../context/UsageContext';
import viAvatar from '../assets/vi-3d.webp';
import './VoiceChatPanel.css';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  sentences?: string[];
  durationSec?: number;
}

interface VoiceChatPanelProps {
  topic: string;
  level: string;
  customTopic?: string;
  onBackToPractice?: () => void;
}

const VOICES = [
  { id: 'alloy', name: 'Alloy (Tự nhiên, Chuẩn)', desc: 'Cân bằng, dễ nghe' },
  { id: 'echo', name: 'Echo (Ấm áp, Trầm)', desc: 'Giọng nam ấm' },
  { id: 'fable', name: 'Fable (Biểu cảm, Nhẹ nhàng)', desc: 'Giọng kể chuyện' },
  { id: 'onyx', name: 'Onyx (Trầm ấm, Chững chạc)', desc: 'Giọng nam trầm' },
  { id: 'nova', name: 'Nova (Trẻ trung, Năng động)', desc: 'Giọng nữ sáng' },
  { id: 'shimmer', name: 'Shimmer (Rõ ràng, Tươi tắn)', desc: 'Giọng nữ êm' },
];

function splitSentences(text: string): string[] {
  if (!text) return [];
  // Tách theo dấu chấm, hỏi, than nhưng bảo toàn không ngắt ở viết tắt phổ biến
  const raw = text.split(/(?<=[.!?])\s+/);
  return raw.map((s) => s.trim()).filter(Boolean);
}

function stripMarkdown(text: string): string {
  return text
    .replace(/[*#_`~>\[\]()]/g, '')
    .replace(/^\s*[-•]\s*/gm, '')
    .replace(/\n+/g, ' ')
    .trim();
}

export const VoiceChatPanel: React.FC<VoiceChatPanelProps> = ({
  topic,
  level,
  customTopic,
  onBackToPractice,
}) => {
  const effectiveTopic = customTopic?.trim() || topic;
  const { decrementQuota } = useUsage();

  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState<'idle' | 'recording' | 'transcribing' | 'thinking' | 'speaking'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeSentence, setActiveSentence] = useState<{ msgId: string; sentenceIdx: number } | null>(null);

  // Settings
  const [voice, setVoice] = useState<string>(() => localStorage.getItem('vocab_ai_voice') || 'alloy');
  const voiceRef = useRef(voice);
  useEffect(() => {
    voiceRef.current = voice;
  }, [voice]);

  // Push-to-talk Recording state
  const [recordSeconds, setRecordSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<any>(null);
  const recordStartTimeRef = useRef<number>(0);

  // Longest audio track for pronunciation scoring
  const longestAudioRef = useRef<{ blob: Blob; duration: number } | null>(null);

  // Audio queue & playback
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const preloadedAudioMap = useRef<Map<string, HTMLAudioElement>>(new Map());
  const isPlayingRef = useRef<boolean>(false);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  // Scoring & End Session
  const [isScoring, setIsScoring] = useState(false);
  const [scoreReport, setScoreReport] = useState<VoiceChatScoreResponse | null>(null);
  const [savedWords, setSavedWords] = useState<Set<string>>(new Set());

  // Track if opening message was already requested for current topic & level
  const loadedTopicRef = useRef<string | null>(null);

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, status, scrollToBottom]);

  // Stop currently playing audio
  const stopAudio = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    isPlayingRef.current = false;
    setActiveSentence(null);
    setStatus((prev) => (prev === 'speaking' ? 'idle' : prev));
  }, []);

  // Play a sequence of sentences
  const playSentences = useCallback(
    async (msgId: string, sentences: string[]) => {
      stopAudio();
      if (!sentences || sentences.length === 0) return;

      isPlayingRef.current = true;
      setStatus('speaking');

      const currentVoice = voiceRef.current;
      for (let i = 0; i < sentences.length; i++) {
        if (!isPlayingRef.current) break;

        const sentence = sentences[i];
        const cleanText = stripMarkdown(sentence);
        if (!cleanText) continue;

        setActiveSentence({ msgId, sentenceIdx: i });

        // Prefetch next sentence
        if (i + 1 < sentences.length) {
          const nextClean = stripMarkdown(sentences[i + 1]);
          if (nextClean) {
            const nextUrl = ttsApi.getStreamUrl(nextClean, currentVoice);
            if (!preloadedAudioMap.current.has(nextUrl)) {
              const audioObj = new Audio(nextUrl);
              preloadedAudioMap.current.set(nextUrl, audioObj);
            }
          }
        }

        const streamUrl = ttsApi.getStreamUrl(cleanText, currentVoice);
        await new Promise<void>((resolve) => {
          let audio = preloadedAudioMap.current.get(streamUrl);
          if (!audio) {
            audio = new Audio(streamUrl);
            preloadedAudioMap.current.set(streamUrl, audio);
          }
          currentAudioRef.current = audio;

          const onEnded = () => {
            cleanup();
            resolve();
          };

          const onError = () => {
            cleanup();
            // Fallback to browser SpeechSynthesis
            if ('speechSynthesis' in window) {
              const utt = new SpeechSynthesisUtterance(cleanText);
              utt.lang = 'en-US';
              utt.onend = () => resolve();
              utt.onerror = () => resolve();
              window.speechSynthesis.speak(utt);
            } else {
              resolve();
            }
          };

          const cleanup = () => {
            audio?.removeEventListener('ended', onEnded);
            audio?.removeEventListener('error', onError);
          };

          audio.addEventListener('ended', onEnded);
          audio.addEventListener('error', onError);

          audio.play().catch(() => {
            onError();
          });
        });
      }

      isPlayingRef.current = false;
      setActiveSentence(null);
      setStatus((prev) => (prev === 'speaking' ? 'idle' : prev));
    },
    [stopAudio]
  );

  // Play individual sentence on user click
  const playSingleSentence = useCallback(
    (msgId: string, sentenceIdx: number, sentenceText: string) => {
      stopAudio();
      const cleanText = stripMarkdown(sentenceText);
      if (!cleanText) return;

      setActiveSentence({ msgId, sentenceIdx });
      setStatus('speaking');
      isPlayingRef.current = true;

      const currentVoice = voiceRef.current;
      const streamUrl = ttsApi.getStreamUrl(cleanText, currentVoice);
      const audio = new Audio(streamUrl);
      currentAudioRef.current = audio;

      const finish = () => {
        setActiveSentence(null);
        setStatus((prev) => (prev === 'speaking' ? 'idle' : prev));
        isPlayingRef.current = false;
      };

      audio.onended = finish;
      audio.onerror = () => {
        if ('speechSynthesis' in window) {
          const utt = new SpeechSynthesisUtterance(cleanText);
          utt.lang = 'en-US';
          utt.onend = finish;
          utt.onerror = finish;
          window.speechSynthesis.speak(utt);
        } else {
          finish();
        }
      };
      audio.play().catch(finish);
    },
    [stopAudio]
  );

  // Initial Opening message from Vi
  useEffect(() => {
    const topicKey = `${effectiveTopic}-${level}`;
    if (loadedTopicRef.current === topicKey) return;
    loadedTopicRef.current = topicKey;

    let mounted = true;
    const loadOpening = async () => {
      setStatus('thinking');
      setErrorMsg(null);
      try {
        const resp = await voiceChatApi.reply({
          topic: effectiveTopic,
          level,
          messages: [],
          opening: true,
        });

        if (!mounted) return;

        const replyText = resp?.reply || `Hello! Welcome to our speaking session about ${effectiveTopic}. How are you feeling today?`;
        const sentences = splitSentences(replyText);
        const openingMsg: Message = {
          id: 'msg-open-' + Date.now(),
          role: 'assistant',
          text: replyText,
          sentences,
        };
        setMessages([openingMsg]);
        setStatus('idle');

        // Phát giọng câu mở đầu
        playSentences(openingMsg.id, sentences);
      } catch (err: any) {
        if (!mounted) return;
        setStatus('idle');
        setErrorMsg(errMsg(err, 'Không thể tải câu mở đầu từ AI. Hãy thử bấm bắt đầu lại.'));
      }
    };

    loadOpening();

    return () => {
      mounted = false;
      stopAudio();
    };
  }, [effectiveTopic, level, playSentences, stopAudio]);

  // Handle Voice Change
  const handleVoiceChange = (newVoice: string) => {
    setVoice(newVoice);
    localStorage.setItem('vocab_ai_voice', newVoice);
    preloadedAudioMap.current.clear();
  };

  // Push-To-Talk: Start Recording
  const startRecording = async () => {
    if (status !== 'idle' && status !== 'speaking') return;
    stopAudio();
    setErrorMsg(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';

      const mr = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];

      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mr.start(100);
      mediaRecorderRef.current = mr;
      recordStartTimeRef.current = Date.now();
      setStatus('recording');
      setRecordSeconds(0);

      recordTimerRef.current = setInterval(() => {
        setRecordSeconds((s: number) => s + 1);
      }, 1000);
    } catch (e: any) {
      setErrorMsg(errMsg(e, 'Không thể truy cập microphone. Vui lòng cấp quyền micro cho trình duyệt.'));
      setStatus('idle');
    }
  };

  // Push-To-Talk: Stop Recording & Process
  const stopRecordingAndSend = () => {
    if (status !== 'recording' || !mediaRecorderRef.current) return;

    clearInterval(recordTimerRef.current);
    const duration = (Date.now() - recordStartTimeRef.current) / 1000;
    const mr = mediaRecorderRef.current;

    mr.onstop = async () => {
      // Dừng toàn bộ tracks
      mr.stream.getTracks().forEach((t: MediaStreamTrack) => t.stop());

      const mimeType = mr.mimeType || 'audio/webm';
      const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });

      if (duration < 0.8 || audioBlob.size < 800) {
        setErrorMsg('Nghe chưa rõ, bạn hãy bấm giữ nút micro và nói lại nhé.');
        setStatus('idle');
        return;
      }

      // Track longest audio turn for pronunciation scoring
      if (!longestAudioRef.current || duration > longestAudioRef.current.duration) {
        longestAudioRef.current = { blob: audioBlob, duration };
      }

      // 1. Gửi STT Whisper
      setStatus('transcribing');
      try {
        const transcribeRes = await voiceChatApi.transcribe(audioBlob);
        const transcript = transcribeRes?.transcript?.trim();

        if (!transcript) {
          setErrorMsg('Không nghe thấy giọng nói rõ ràng. Bạn hãy thử nói lại nhé.');
          setStatus('idle');
          return;
        }

        // Thêm message của user vào timeline
        const userMsg: Message = {
          id: 'user-' + Date.now(),
          role: 'user',
          text: transcript,
          durationSec: Math.round(duration),
        };
        const updatedMessages = [...messages, userMsg];
        setMessages(updatedMessages);

        // 2. Gửi LLM Reply
        setStatus('thinking');
        const historyForLLM = updatedMessages.map((m) => ({
          role: m.role,
          content: m.text,
        }));

        const replyRes = await voiceChatApi.reply({
          topic: effectiveTopic,
          level,
          messages: historyForLLM,
          opening: false,
        });

        // Trừ quota 1 lượt thành công
        decrementQuota('voice');

        const aiText = replyRes?.reply || "I didn't quite catch that. Could you say that again?";
        const sentences = splitSentences(aiText);
        const aiMsg: Message = {
          id: 'ai-' + Date.now(),
          role: 'assistant',
          text: aiText,
          sentences,
        };

        setMessages((prev: Message[]) => [...prev, aiMsg]);

        // 3. Phát audio theo từng câu
        playSentences(aiMsg.id, sentences);
      } catch (err: any) {
        setErrorMsg(errMsg(err, 'Lỗi khi kết nối với AI. Bạn hãy thử lại.'));
        setStatus('idle');
      }
    };

    mr.stop();
  };

  // End Session & Score
  const handleEndSession = async () => {
    stopAudio();
    setIsScoring(true);
    setErrorMsg(null);

    const userTurns = messages
      .filter((m: Message) => m.role === 'user')
      .map((m: Message) => ({ role: 'user', text: m.text }));

    if (userTurns.length === 0) {
      setIsScoring(false);
      setErrorMsg('Bạn chưa nói lượt nào trong phiên. Hãy trò chuyện một chút rồi kết thúc nhé!');
      return;
    }

    try {
      const longestBlob = longestAudioRef.current?.blob || null;
      const scoreRes = await voiceChatApi.score(longestBlob, {
        topic: effectiveTopic,
        level,
        turns: userTurns,
      });

      setScoreReport(scoreRes);
    } catch (err: any) {
      setErrorMsg(errMsg(err, 'Không thể chấm điểm phiên nói. Vui lòng bấm thử lại.'));
    } finally {
      setIsScoring(false);
    }
  };

  // Save new word to favorites
  const handleSaveWord = async (wordItem: { word: string; wordId?: string | null }) => {
    if (!wordItem.wordId) return;
    try {
      await wordApi.favorite(wordItem.wordId);
      setSavedWords((prev: Set<string>) => new Set([...prev, wordItem.wordId!]));
    } catch {
      // ignore
    }
  };

  return (
    <div className="voice-chat-container">
      {/* 1. Header Bar */}
      <div className="voice-chat-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 200 }}>
          {onBackToPractice && (
            <button
              onClick={() => {
                stopAudio();
                onBackToPractice();
              }}
              className="btn btn-outline"
              style={{ padding: '6px 12px', fontSize: '13px' }}
            >
              <Icon n="chevronLeft" s={16} /> Quay lại
            </button>
          )}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 800, fontSize: '16px' }}>{effectiveTopic}</span>
              <span className="pill greensoft" style={{ fontSize: '11px', padding: '2px 8px' }}>
                {level}
              </span>
            </div>
            <div className="sub" style={{ fontSize: '12.5px' }}>
              Luyện phản xạ giao tiếp hai chiều cùng trợ lý AI Vi
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <QuotaBadge featureKey="voice" labelSuffix="lượt thoại hôm nay" />

          {/* Voice Selector */}
          <select
            value={voice}
            onChange={(e) => handleVoiceChange(e.target.value)}
            style={{
              padding: '6px 12px',
              borderRadius: '10px',
              border: '1px solid var(--border, #cbd5e1)',
              background: '#fff',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
            title="Chọn giọng đọc của Vi"
          >
            {VOICES.map((v) => (
              <option key={v.id} value={v.id}>
                🎙️ {v.name}
              </option>
            ))}
          </select>

          {status === 'speaking' && (
            <button
              onClick={stopAudio}
              className="btn btn-outline"
              style={{ padding: '6px 14px', fontSize: '13px', color: '#dc2626', borderColor: '#fca5a5' }}
              title="Dừng phát giọng đọc"
            >
              ⏹️ Dừng đọc
            </button>
          )}

          <button
            onClick={handleEndSession}
            disabled={messages.filter((m: Message) => m.role === 'user').length === 0 || isScoring}
            className="btn btn-primary"
            style={{ padding: '7px 16px', fontSize: '13.5px', fontWeight: 700 }}
          >
            {isScoring ? 'Đang chấm điểm…' : '🏁 Kết thúc & Chấm điểm'}
          </button>
        </div>
      </div>

      {/* 2. Messages Timeline */}
      <div className="voice-chat-messages" ref={chatScrollRef}>
        {messages.map((m: Message) => (
          <div key={m.id} className={`voice-msg-row ${m.role}`}>
            {m.role === 'assistant' ? (
              <img src={viAvatar} alt="Vi" className="voice-avatar" />
            ) : (
              <div className="voice-user-avatar">Bạn</div>
            )}

            <div className="voice-bubble">
              {m.role === 'assistant' && m.sentences ? (
                <div>
                  {m.sentences.map((sent: string, sIdx: number) => {
                    const isActive =
                      activeSentence?.msgId === m.id && activeSentence?.sentenceIdx === sIdx;
                    return (
                      <span
                        key={sIdx}
                        className={`voice-sentence ${isActive ? 'active-sentence' : ''}`}
                        onClick={() => playSingleSentence(m.id, sIdx, sent)}
                        title="Bấm để nghe lại câu này"
                      >
                        {sent}{' '}
                      </span>
                    );
                  })}
                  <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => playSentences(m.id, m.sentences || [])}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#64748b',
                        cursor: 'pointer',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                      title="Nghe lại toàn bộ câu trả lời"
                    >
                      <Icon n="vol" s={14} /> Nghe lại cả đoạn
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div>{m.text}</div>
                  {m.durationSec != null && (
                    <div style={{ fontSize: '11px', opacity: 0.8, marginTop: '4px', textAlign: 'right' }}>
                      ⏱️ {m.durationSec}s
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Live Status Indicator */}
        {status === 'transcribing' && (
          <div className="voice-status-box">
            <span className="grading-spin" style={{ display: 'inline-block' }}>🎧</span>
            <span>Whisper đang chuyển giọng nói thành văn bản…</span>
          </div>
        )}

        {status === 'thinking' && (
          <div className="voice-status-box">
            <span className="grading-spin" style={{ display: 'inline-block' }}>✨</span>
            <span>Vi đang suy nghĩ câu trả lời…</span>
          </div>
        )}

        {errorMsg && (
          <div
            style={{
              padding: '12px 18px',
              borderRadius: '12px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#b91c1c',
              fontSize: '13.5px',
              alignSelf: 'center',
            }}
          >
            ⚠️ {errorMsg}
          </div>
        )}
      </div>

      {/* 3. Bottom Controls (Push-to-talk) */}
      <div className="voice-chat-footer">
        <button
          className={`mic-ptt-btn ${status === 'recording' ? 'recording' : 'idle'}`}
          onPointerDown={startRecording}
          onPointerUp={stopRecordingAndSend}
          onPointerLeave={stopRecordingAndSend}
          title="Bấm giữ để nói tiếng Anh, thả ra để gửi"
          disabled={status === 'transcribing' || status === 'thinking'}
        >
          {status === 'recording' ? (
            <div className="wave-bars">
              <span className="wave-bar" />
              <span className="wave-bar" />
              <span className="wave-bar" />
              <span className="wave-bar" />
            </div>
          ) : (
            <Icon n="mic" s={34} />
          )}
        </button>

        <div style={{ textAlign: 'center' }}>
          {status === 'recording' ? (
            <div style={{ color: '#ef4444', fontWeight: 800, fontSize: '15px' }}>
              🔴 Đang ghi âm: {recordSeconds}s · Thả ra để gửi
            </div>
          ) : (
            <div style={{ color: '#64748b', fontSize: '13.5px', fontWeight: 600 }}>
              {status === 'transcribing' || status === 'thinking'
                ? 'Đang xử lý hội thoại…'
                : 'Giữ phím micro để nói tiếng Anh · Thả ra để Vi trả lời'}
            </div>
          )}
        </div>
      </div>

      {/* 4. Scorecard Modal */}
      {scoreReport && (
        <div className="score-modal-backdrop">
          <div className="score-modal-content">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '22px', fontWeight: 900, margin: 0 }}>📊 Kết quả trò chuyện cùng Vi</h2>
                <div className="sub mt4">Chủ đề: {effectiveTopic} · Trình độ {level}</div>
              </div>
              <button
                onClick={() => setScoreReport(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <Icon n="x" s={22} />
              </button>
            </div>

            {/* Overall Score */}
            <div
              style={{
                textAlign: 'center',
                padding: '20px',
                background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
                borderRadius: '16px',
                marginBottom: '24px',
              }}
            >
              <div style={{ fontSize: '42px', fontWeight: 900, color: '#1d4ed8' }}>
                {scoreReport.overall} <span style={{ fontSize: '20px', color: '#60a5fa' }}>/ 100</span>
              </div>
              <div style={{ fontWeight: 700, color: '#1e3a8a', marginTop: '4px' }}>Điểm phản xạ tổng thể</div>
              <div style={{ fontSize: '14px', color: '#475569', marginTop: '8px', maxWidth: 520, margin: '8px auto 0' }}>
                {scoreReport.summary}
              </div>
            </div>

            {/* 5 Criteria */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px', marginBottom: '24px' }}>
              <div style={{ padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#fafafa' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                  <span>Ngữ pháp (Grammar)</span>
                  <span style={{ color: '#2563eb' }}>{scoreReport.grammar?.score}/100</span>
                </div>
                <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '4px' }}>{scoreReport.grammar?.comment}</div>
              </div>

              <div style={{ padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#fafafa' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                  <span>Từ vựng (Vocabulary)</span>
                  <span style={{ color: '#2563eb' }}>{scoreReport.vocabulary?.score}/100</span>
                </div>
                <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '4px' }}>{scoreReport.vocabulary?.comment}</div>
              </div>

              <div style={{ padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#fafafa' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                  <span>Trôi chảy (Fluency)</span>
                  <span style={{ color: '#2563eb' }}>{scoreReport.fluency?.score}/100</span>
                </div>
                <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '4px' }}>{scoreReport.fluency?.comment}</div>
              </div>

              <div style={{ padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#fafafa' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                  <span>Nội dung (Content)</span>
                  <span style={{ color: '#2563eb' }}>{scoreReport.content?.score}/100</span>
                </div>
                <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '4px' }}>{scoreReport.content?.comment}</div>
              </div>

              <div style={{ padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#fafafa' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700 }}>
                  <span>Phát âm (Pronunciation)</span>
                  <span style={{ color: '#2563eb' }}>{scoreReport.pronunciation?.score}/100</span>
                </div>
                {scoreReport.pronunciation?.estimatedFromTranscript && (
                  <span className="pill warn" style={{ fontSize: '10px', padding: '1px 6px', marginTop: '2px', display: 'inline-block' }}>
                    Ước lượng từ văn bản
                  </span>
                )}
                <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '4px' }}>{scoreReport.pronunciation?.comment}</div>
              </div>
            </div>

            {/* New Words Extracted */}
            {scoreReport.newWords && scoreReport.newWords.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Icon n="spark" s={18} /> Từ vựng gợi ý thêm từ hội thoại ({scoreReport.newWords.length} từ)
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {scoreReport.newWords.map((w: VoiceChatNewWord, idx: number) => {
                    const isSaved = w.wordId ? savedWords.has(w.wordId) : false;
                    return (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 14px',
                          borderRadius: '10px',
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <span style={{ fontWeight: 800, color: '#1e293b', fontSize: '14.5px' }}>{w.word}</span>
                          <span style={{ margin: '0 8px', color: '#94a3b8' }}>·</span>
                          <span style={{ color: '#475569', fontSize: '13.5px' }}>{w.meaning}</span>
                          {w.example && (
                            <div style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic', marginTop: '2px' }}>
                              &quot;{w.example}&quot;
                            </div>
                          )}
                        </div>

                        <div>
                          {w.inDictionary && w.wordId ? (
                            <button
                              onClick={() => handleSaveWord(w)}
                              disabled={isSaved}
                              className={`btn ${isSaved ? 'btn-outline' : 'btn-primary'}`}
                              style={{ padding: '4px 10px', fontSize: '12px', borderRadius: '8px' }}
                            >
                              {isSaved ? '✓ Đã lưu' : '+ Lưu từ'}
                            </button>
                          ) : (
                            <span
                              className="pill"
                              style={{ fontSize: '11px', color: '#94a3b8', cursor: 'not-allowed' }}
                              title="Từ này chưa có trong kho từ điển hệ thống"
                            >
                              Chưa có trong kho
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                onClick={() => {
                  setScoreReport(null);
                  setMessages([]);
                }}
                className="btn btn-outline"
                style={{ padding: '8px 18px', fontWeight: 700 }}
              >
                🔄 Luyện tập lại
              </button>
              {onBackToPractice && (
                <button
                  onClick={() => {
                    setScoreReport(null);
                    onBackToPractice();
                  }}
                  className="btn btn-primary"
                  style={{ padding: '8px 20px', fontWeight: 700 }}
                >
                  Hoàn tất
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
