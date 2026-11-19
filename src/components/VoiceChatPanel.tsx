import React, { useEffect, useRef, useState, useCallback } from 'react';
import { voiceChatApi, ttsApi, wordApi, errMsg } from '../api';
import type { VoiceChatScoreResponse, VoiceChatNewWord } from '../api';
import { Icon } from './icons';
import { QuotaBadge } from './QuotaBadge';
import { useUsage } from '../context/UsageContext';
import { ViMascotImage } from './ViMascotImage';
import { UiIcon } from './UiIcon';
import { ScoreRing } from './SageEffects';
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
  onLevelChange?: (lvl: string) => void;
  onScoreStateChange?: (hasScore: boolean) => void;
}

function getScoreTier(score: number) {
  if (score >= 90) {
    return {
      label: 'Xuất sắc',
      color: 'var(--green-dark)',
      bg: 'var(--success-bg)',
      border: 'rgba(66, 119, 77, 0.35)',
      strokeColor: 'var(--success)',
      icon: 'trophy',
    };
  }
  if (score >= 80) {
    return {
      label: 'Rất tốt',
      color: 'var(--sage-dark)',
      bg: 'rgba(71, 96, 63, 0.14)',
      border: 'rgba(71, 96, 63, 0.32)',
      strokeColor: 'var(--sage)',
      icon: 'star',
    };
  }
  if (score >= 65) {
    return {
      label: 'Khá tốt',
      color: 'var(--amber-dark)',
      bg: 'var(--amber-bg)',
      border: 'rgba(201, 134, 47, 0.35)',
      strokeColor: 'var(--amber)',
      icon: 'thumbs-up',
    };
  }
  return {
    label: 'Cần cố gắng',
    color: 'var(--red-dark)',
    bg: 'var(--danger-bg)',
    border: 'rgba(154, 75, 67, 0.32)',
    strokeColor: 'var(--danger)',
    icon: 'dumbbell',
  };
}

export const VOICES = [
  { id: 'alloy', name: 'Alloy (Tự nhiên, Chuẩn)', desc: 'Cân bằng, dễ nghe' },
  { id: 'echo', name: 'Echo (Ấm áp, Trầm)', desc: 'Giọng nam ấm' },
  { id: 'fable', name: 'Fable (Biểu cảm, Nhẹ nhàng)', desc: 'Giọng kể chuyện' },
  { id: 'onyx', name: 'Onyx (Trầm ấm, Chững chạc)', desc: 'Giọng nam trầm' },
  { id: 'nova', name: 'Nova (Trẻ trung, Năng động)', desc: 'Giọng nữ sáng' },
  { id: 'coral', name: 'Coral (Trong trẻo, Dễ nghe)', desc: 'Giọng nữ trong trẻo' },
];

function isVietnameseText(text: string): boolean {
  return /[\u00C0-\u1EF9]/i.test(text);
}

function stripMarkdown(text: string): string {
  return text
    // Bỏ chú thích tiếng Việt trong ngoặc đơn ví dụ: (Chào bạn! Tôi là...)
    .replace(/\([^)]*[\u00C0-\u1EF9][^)]*\)/g, '')
    .replace(/[*#_`~>\[\]()]/g, '')
    .replace(/^\s*[-•]\s*/gm, '')
    .replace(/\n+/g, ' ')
    .trim();
}

function splitSentences(text: string): string[] {
  if (!text) return [];
  // Tách theo dấu chấm, hỏi, than
  const raw = text.split(/(?<=[.!?])\s+/);
  return raw
    .map((s) => s.trim())
    .filter((s) => {
      const clean = stripMarkdown(s);
      return clean.length > 0;
    });
}

function getInstantOpeningGreeting(topic: string, _level?: string): string {
  const lower = (topic || '').toLowerCase();
  if (lower.includes('giới thiệu') || lower.includes('introduce') || lower.includes('self')) {
    return "Hello! I'm Vi, your English speaking partner. It's so nice to meet you! What is your name and where are you from?";
  }
  if (lower.includes('thói quen') || lower.includes('routine') || lower.includes('ngày')) {
    return "Hi there! I'm Vi. Let's talk about daily routines today! What time do you usually wake up in the morning?";
  }
  if (lower.includes('cuối tuần') || lower.includes('weekend')) {
    return "Hello! I'm Vi. Weekends are always fun to talk about! How was your last weekend?";
  }
  if (lower.includes('công việc') || lower.includes('career') || lower.includes('job') || lower.includes('work')) {
    return "Hi! I'm Vi, your speaking partner. Let's talk about careers today! What is your dream job?";
  }
  if (lower.includes('du lịch') || lower.includes('travel') || lower.includes('journey') || lower.includes('trip')) {
    return "Hello! I'm Vi. Traveling is one of my favorite topics! What is the most memorable place you have ever visited?";
  }
  if (lower.includes('món ăn') || lower.includes('food') || lower.includes('cooking') || lower.includes('ăn')) {
    return "Hi there! I'm Vi. Let's talk about food and cooking today! What is your favorite food?";
  }
  if (lower.includes('trí tuệ nhân tạo') || lower.includes('ai') || lower.includes('tech') || lower.includes('công nghệ')) {
    return "Hello! I'm Vi. Technology and AI are changing the world! How do you usually use AI in your daily life?";
  }
  if (lower.includes('sở thích') || lower.includes('hobby') || lower.includes('hobbies') || lower.includes('free time')) {
    return "Hi! I'm Vi, your English practice partner. What do you like to do in your free time?";
  }
  return `Hello! I'm Vi, your English speaking partner. Welcome to our practice about ${topic}! How are you feeling today?`;
}

interface WordSpan {
  word: string;
  startRatio: number;
  endRatio: number;
}

function computeWordSpans(words: string[]): WordSpan[] {
  if (words.length === 0) return [];
  // Trọng số ước tính theo độ dài từ để khớp nhịp đọc tự nhiên của âm thanh
  const weights = words.map((w) => {
    const letters = w.replace(/[^a-zA-Z0-9]/g, '');
    return Math.max(letters.length, 2);
  });
  const totalWeight = weights.reduce((acc, wt) => acc + wt, 0);

  let currentWeight = 0;
  return words.map((w, idx) => {
    const startRatio = currentWeight / totalWeight;
    currentWeight += weights[idx];
    const endRatio = currentWeight / totalWeight;
    return { word: w, startRatio, endRatio };
  });
}

interface MessageSpan {
  sentenceIdx: number;
  wordIdx: number;
  word: string;
  startRatio: number;
  endRatio: number;
}

function computeMessageSpans(sentences: string[]): MessageSpan[] {
  const items: { sentenceIdx: number; wordIdx: number; word: string; weight: number }[] = [];

  sentences.forEach((sent, sIdx) => {
    const cleanSent = stripMarkdown(sent);
    if (!cleanSent || isVietnameseText(cleanSent)) return;
    const words = sent.trim().split(/\s+/).filter(Boolean);
    words.forEach((w, wIdx) => {
      const letters = w.replace(/[^a-zA-Z0-9]/g, '');
      const weight = Math.max(letters.length, 2);
      items.push({ sentenceIdx: sIdx, wordIdx: wIdx, word: w, weight });
    });
  });

  if (items.length === 0) return [];
  const totalWeight = items.reduce((acc, it) => acc + it.weight, 0);

  let currentWeight = 0;
  return items.map((it) => {
    const startRatio = currentWeight / totalWeight;
    currentWeight += it.weight;
    const endRatio = currentWeight / totalWeight;
    return {
      sentenceIdx: it.sentenceIdx,
      wordIdx: it.wordIdx,
      word: it.word,
      startRatio,
      endRatio,
    };
  });
}

export const VoiceChatPanel: React.FC<VoiceChatPanelProps> = ({
  topic,
  level,
  customTopic,
  onBackToPractice,
  onLevelChange,
  onScoreStateChange,
}) => {
  const effectiveTopic = customTopic?.trim() || topic;
  const { decrementQuota } = useUsage();

  const [messages, setMessages] = useState<Message[]>([]);
  const [hasStarted, setHasStarted] = useState(false);
  const [status, setStatus] = useState<'idle' | 'recording' | 'transcribing' | 'thinking' | 'speaking'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeSentence, setActiveSentence] = useState<{ msgId: string; sentenceIdx: number } | null>(null);
  const [activeWordIdx, setActiveWordIdx] = useState<number>(-1);
  const [showTranscript, setShowTranscript] = useState(false);

  // Settings
  const [voice, setVoice] = useState<string>(() => localStorage.getItem('vocab_ai_voice') || 'alloy');
  const voiceRef = useRef(voice);
  useEffect(() => {
    voiceRef.current = voice;
  }, [voice]);

  // Voice Speed (Default 1.15x for natural conversational speed)
  const [speed, setSpeed] = useState<number>(() => {
    const saved = localStorage.getItem('vocab_ai_voice_speed');
    return saved ? parseFloat(saved) : 1.15;
  });
  const speedRef = useRef(speed);
  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  const handleSpeedChange = (newSpeed: number) => {
    setSpeed(newSpeed);
    speedRef.current = newSpeed;
    localStorage.setItem('vocab_ai_voice_speed', String(newSpeed));
    if (currentAudioRef.current) {
      currentAudioRef.current.playbackRate = newSpeed;
    }
  };

  const animFrameRef = useRef<number | null>(null);
  const playbackSessionRef = useRef<number>(0);

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

  // AbortController & Timeout reference to prevent infinite pending requests
  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutTimerRef = useRef<any>(null);

  // Clear pending request & timeout
  const cleanupRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (timeoutTimerRef.current) {
      clearTimeout(timeoutTimerRef.current);
      timeoutTimerRef.current = null;
    }
  }, []);

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, status, scrollToBottom]);

  // Stop currently playing audio and cancel any pending playback session
  const stopAudio = useCallback(() => {
    // Invalidate any ongoing playback loop session immediately
    playbackSessionRef.current += 1;

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (currentAudioRef.current) {
      currentAudioRef.current.onplaying = null;
      currentAudioRef.current.onended = null;
      currentAudioRef.current.onerror = null;
      currentAudioRef.current.pause();
      currentAudioRef.current.src = '';
      currentAudioRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    isPlayingRef.current = false;
    setActiveSentence(null);
    setActiveWordIdx(-1);
    setStatus((prev) => (prev === 'speaking' ? 'idle' : prev));
  }, []);

  // Handle Voice Change: immediately cut off old voice and clear preloaded audio
  const handleVoiceChange = useCallback(
    (newVoice: string) => {
      // 1. Dừng ngay lập tức giọng đọc cũ để không bao giờ bị đọc đè 2 giọng cùng lúc
      stopAudio();

      // 2. Dọn sạch các file audio đang tải trước của giọng cũ
      preloadedAudioMap.current.forEach((audio) => {
        audio.onplaying = null;
        audio.onended = null;
        audio.onerror = null;
        audio.pause();
        audio.src = '';
      });
      preloadedAudioMap.current.clear();

      // 3. Cập nhật giọng nói mới ngay lập tức
      setVoice(newVoice);
      voiceRef.current = newVoice;
      localStorage.setItem('vocab_ai_voice', newVoice);
    },
    [stopAudio]
  );

  // Play entire message in a SINGLE TTS request (Saves 3-4x cost and network calls)
  const playSentences = useCallback(
    async (msgId: string, sentences: string[], fullText?: string) => {
      stopAudio();
      if (!sentences || sentences.length === 0) return;

      const currentSessionId = playbackSessionRef.current;
      isPlayingRef.current = true;
      setStatus('speaking');

      // Tạo nội dung hoàn chỉnh không chứa markdown/tiếng Việt
      const rawText = fullText || sentences.join(' ');
      const cleanFullText = stripMarkdown(rawText);
      if (!cleanFullText || isVietnameseText(cleanFullText)) {
        isPlayingRef.current = false;
        setStatus('idle');
        return;
      }

      const spans = computeMessageSpans(sentences);
      const currentVoice = voiceRef.current;
      const streamUrl = ttsApi.getStreamUrl(cleanFullText, currentVoice);

      await new Promise<void>((resolve) => {
        if (playbackSessionRef.current !== currentSessionId) {
          resolve();
          return;
        }

        let audio = preloadedAudioMap.current.get(streamUrl);
        if (!audio) {
          audio = new Audio(streamUrl);
          preloadedAudioMap.current.set(streamUrl, audio);
        }
        currentAudioRef.current = audio;
        audio.playbackRate = speedRef.current;

        let animFrameId: number | null = null;

        const cleanup = () => {
          if (animFrameId) cancelAnimationFrame(animFrameId);
          animFrameRef.current = null;
          audio?.removeEventListener('playing', onPlaying);
          audio?.removeEventListener('ended', onEnded);
          audio?.removeEventListener('error', onError);
        };

        const onPlaying = () => {
          if (playbackSessionRef.current !== currentSessionId) {
            cleanup();
            resolve();
            return;
          }

          const trackProgress = () => {
            if (
              playbackSessionRef.current !== currentSessionId ||
              !isPlayingRef.current ||
              !audio ||
              audio.paused ||
              audio.ended
            ) {
              return;
            }

            const duration = audio.duration;
            if (duration && isFinite(duration) && duration > 0) {
              const progress = audio.currentTime / duration;
              const curSpan = spans.find((s) => progress >= s.startRatio && progress < s.endRatio);
              if (curSpan) {
                setActiveSentence({ msgId, sentenceIdx: curSpan.sentenceIdx });
                setActiveWordIdx(curSpan.wordIdx);
              } else if (progress >= 1 && spans.length > 0) {
                const last = spans[spans.length - 1];
                setActiveSentence({ msgId, sentenceIdx: last.sentenceIdx });
                setActiveWordIdx(last.wordIdx);
              }
            }

            animFrameId = requestAnimationFrame(trackProgress);
            animFrameRef.current = animFrameId;
          };

          animFrameId = requestAnimationFrame(trackProgress);
          animFrameRef.current = animFrameId;
        };

        const onEnded = () => {
          cleanup();
          setActiveSentence(null);
          setActiveWordIdx(-1);
          resolve();
        };

        const onError = () => {
          cleanup();
          if (playbackSessionRef.current !== currentSessionId) {
            resolve();
            return;
          }
          // Fallback to browser SpeechSynthesis (nếu API TTS bên thứ ba bị hết tiền / 402 hoặc lỗi mạng)
          if ('speechSynthesis' in window) {
            const utt = new SpeechSynthesisUtterance(cleanFullText);
            utt.lang = 'en-US';
            utt.rate = speedRef.current;

            utt.onboundary = (e) => {
              if (playbackSessionRef.current !== currentSessionId) return;
              if (e.name === 'word') {
                const charIndex = e.charIndex;
                let runningChars = 0;
                for (let i = 0; i < spans.length; i++) {
                  runningChars += spans[i].word.length + 1;
                  if (runningChars >= charIndex) {
                    setActiveSentence({ msgId, sentenceIdx: spans[i].sentenceIdx });
                    setActiveWordIdx(spans[i].wordIdx);
                    break;
                  }
                }
              }
            };

            utt.onend = () => {
              setActiveSentence(null);
              setActiveWordIdx(-1);
              resolve();
            };
            utt.onerror = () => {
              setActiveSentence(null);
              setActiveWordIdx(-1);
              resolve();
            };
            window.speechSynthesis.speak(utt);
          } else {
            resolve();
          }
        };

        audio.addEventListener('playing', onPlaying);
        audio.addEventListener('ended', onEnded);
        audio.addEventListener('error', onError);

        audio.play().catch(() => {
          onError();
        });
      });

      if (playbackSessionRef.current === currentSessionId) {
        isPlayingRef.current = false;
        setActiveSentence(null);
        setActiveWordIdx(-1);
        setStatus((prev) => (prev === 'speaking' ? 'idle' : prev));
      }
    },
    [stopAudio]
  );

  // Play individual sentence on user click
  const playSingleSentence = useCallback(
    (msgId: string, sentenceIdx: number, sentenceText: string) => {
      stopAudio();
      const cleanText = stripMarkdown(sentenceText);
      if (!cleanText || isVietnameseText(cleanText)) return;

      const currentSessionId = playbackSessionRef.current;
      const words = sentenceText.trim().split(/\s+/).filter(Boolean);
      const spans = computeWordSpans(words);

      setStatus('speaking');
      isPlayingRef.current = true;

      const currentVoice = voiceRef.current;
      const streamUrl = ttsApi.getStreamUrl(cleanText, currentVoice);
      const audio = new Audio(streamUrl);
      currentAudioRef.current = audio;
      audio.playbackRate = speedRef.current;

      let animFrameId: number | null = null;

      const finish = () => {
        if (animFrameId) cancelAnimationFrame(animFrameId);
        animFrameRef.current = null;
        if (playbackSessionRef.current === currentSessionId) {
          setActiveSentence(null);
          setActiveWordIdx(-1);
          setStatus((prev) => (prev === 'speaking' ? 'idle' : prev));
          isPlayingRef.current = false;
        }
      };

      const onPlaying = () => {
        if (playbackSessionRef.current !== currentSessionId) {
          finish();
          return;
        }
        setActiveSentence({ msgId, sentenceIdx });
        setActiveWordIdx(0);

        const trackProgress = () => {
          if (
            playbackSessionRef.current !== currentSessionId ||
            !isPlayingRef.current ||
            !audio ||
            audio.paused ||
            audio.ended
          ) {
            return;
          }

          const duration = audio.duration;
          if (duration && isFinite(duration) && duration > 0) {
            const progress = audio.currentTime / duration;
            const curIdx = spans.findIndex((s) => progress >= s.startRatio && progress < s.endRatio);
            if (curIdx !== -1) {
              setActiveWordIdx(curIdx);
            } else if (progress >= 1) {
              setActiveWordIdx(spans.length - 1);
            }
          }

          animFrameId = requestAnimationFrame(trackProgress);
          animFrameRef.current = animFrameId;
        };

        animFrameId = requestAnimationFrame(trackProgress);
        animFrameRef.current = animFrameId;
      };

      audio.addEventListener('playing', onPlaying);
      audio.onended = finish;
      audio.onerror = () => {
        if (playbackSessionRef.current !== currentSessionId) return;
        if ('speechSynthesis' in window) {
          const utt = new SpeechSynthesisUtterance(cleanText);
          utt.lang = 'en-US';
          utt.rate = speedRef.current;
          setActiveSentence({ msgId, sentenceIdx });
          setActiveWordIdx(0);

          utt.onboundary = (e) => {
            if (playbackSessionRef.current !== currentSessionId) return;
            if (e.name === 'word') {
              const charIndex = e.charIndex;
              let runningChars = 0;
              for (let w = 0; w < words.length; w++) {
                if (runningChars + words[w].length >= charIndex) {
                  setActiveWordIdx(w);
                  break;
                }
                runningChars += words[w].length + 1;
              }
            }
          };

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

  // Start conversation: show opening greeting and play audio
  const handleStart = () => {
    setHasStarted(true);
    loadOpening();
  };

  // Initial Opening message from Vi (Instant, 0ms wait, 0 LLM requests)
  const loadOpening = useCallback(() => {
    cleanupRequest();
    setErrorMsg(null);

    const replyText = getInstantOpeningGreeting(effectiveTopic, level);
    const sentences = splitSentences(replyText);
    const openingMsg: Message = {
      id: 'msg-open-' + Date.now(),
      role: 'assistant',
      text: replyText,
      sentences,
    };
    setMessages([openingMsg]);
    setStatus('idle');

    // Phát giọng câu mở đầu ngay lập tức (1 request duy nhất cho toàn bộ đoạn)
    playSentences(openingMsg.id, sentences, replyText);
  }, [effectiveTopic, level, playSentences, cleanupRequest]);

  useEffect(() => {
    const topicKey = `${effectiveTopic}-${level}`;
    if (loadedTopicRef.current === topicKey) return;
    loadedTopicRef.current = topicKey;

    setHasStarted(false);
    setMessages([]);
    stopAudio();
    cleanupRequest();
    setErrorMsg(null);

    return () => {
      cleanupRequest();
      stopAudio();
    };
  }, [effectiveTopic, level, cleanupRequest, stopAudio]);

  // Push-To-Talk: Start Recording
  const startRecording = async () => {
    if (status !== 'idle' && status !== 'speaking') return;
    stopAudio();
    cleanupRequest();
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

  // Request reply for history
  const requestAiReply = useCallback(
    async (history: Message[]) => {
      cleanupRequest();
      setStatus('thinking');
      setErrorMsg(null);

      const controller = new AbortController();
      abortControllerRef.current = controller;

      timeoutTimerRef.current = setTimeout(() => {
        if (!controller.signal.aborted) {
          controller.abort();
          setStatus('idle');
          setErrorMsg('Quá thời gian chờ phản hồi từ AI (60 giây). Bạn hãy bấm "Thử lại".');
        }
      }, 60000);

      const historyForLLM = history.map((m) => ({
        role: m.role,
        content: m.text,
      }));

      try {
        const replyRes = await voiceChatApi.reply(
          {
            topic: effectiveTopic,
            level,
            messages: historyForLLM,
            opening: false,
          },
          { signal: controller.signal, timeout: 60000 }
        );

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
        setStatus('idle');

        // Phát audio cả đoạn trong 1 request duy nhất
        playSentences(aiMsg.id, sentences, aiText);
      } catch (err: any) {
        if (controller.signal.aborted) return;
        setErrorMsg(errMsg(err, 'Lỗi khi kết nối với AI. Bạn hãy bấm "Thử lại".'));
        setStatus('idle');
      } finally {
        cleanupRequest();
      }
    },
    [effectiveTopic, level, decrementQuota, playSentences, cleanupRequest]
  );

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
      cleanupRequest();
      setStatus('transcribing');
      const transcribeController = new AbortController();
      abortControllerRef.current = transcribeController;

      timeoutTimerRef.current = setTimeout(() => {
        if (!transcribeController.signal.aborted) {
          transcribeController.abort();
          setStatus('idle');
          setErrorMsg('Quá thời gian xử lý giọng nói (45 giây). Vui lòng thử nói lại.');
        }
      }, 45000);

      let transcript = '';
      try {
        const transcribeRes = await voiceChatApi.transcribe(audioBlob, {
          signal: transcribeController.signal,
          timeout: 45000,
        });
        transcript = transcribeRes?.transcript?.trim() || '';
      } catch (err: any) {
        if (transcribeController.signal.aborted) return;
        setErrorMsg(errMsg(err, 'Lỗi khi nhận diện giọng nói. Bạn hãy thử nói lại.'));
        setStatus('idle');
        cleanupRequest();
        return;
      } finally {
        cleanupRequest();
      }

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
      requestAiReply(updatedMessages);
    };

    mr.stop();
  };

  // Cancel waiting state anytime
  const handleCancelWaiting = () => {
    cleanupRequest();
    setStatus('idle');
    setErrorMsg('Đã hủy lượt chờ. Bạn có thể bấm giữ micro để nói lại.');
  };

  // Retry last failed action
  const handleRetry = () => {
    setErrorMsg(null);
    if (messages.length === 0) {
      loadedTopicRef.current = null;
      loadOpening();
    } else {
      requestAiReply(messages);
    }
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
      onScoreStateChange?.(true);
    } catch (err: any) {
      setErrorMsg(errMsg(err, 'Không thể chấm điểm phiên nói. Vui lòng bấm thử lại.'));
    } finally {
      setIsScoring(false);
    }
  };

  const handleResetSession = () => {
    setScoreReport(null);
    setMessages([]);
    setHasStarted(false);
    setShowTranscript(false);
    onScoreStateChange?.(false);
  };

  const handleFinishSession = () => {
    setScoreReport(null);
    onScoreStateChange?.(false);
    if (onBackToPractice) {
      onBackToPractice();
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

  if (scoreReport) {
    const tier = getScoreTier(scoreReport.overall);
    const userTurnsCount = messages.filter((m: Message) => m.role === 'user').length;
    const criteriaList = [
      { key: 'grammar', name: 'Ngữ pháp (Grammar)', icon: <Icon n="book" s={15} />, data: scoreReport.grammar },
      { key: 'vocabulary', name: 'Từ vựng (Vocabulary)', icon: <Icon n="spark" s={15} />, data: scoreReport.vocabulary },
      { key: 'fluency', name: 'Trôi chảy (Fluency)', icon: <Icon n="zap" s={15} />, data: scoreReport.fluency },
      { key: 'content', name: 'Nội dung (Content)', icon: <Icon n="target" s={15} />, data: scoreReport.content },
      { key: 'pronunciation', name: 'Phát âm (Pronunciation)', icon: <Icon n="vol" s={15} />, data: scoreReport.pronunciation },
    ];

    return (
      <div className="voice-result-board">
        {/* Header */}
        <div className="voice-result-header">
          <div>
            <div className="voice-result-tag">
              <Icon n="spark" s={14} />
              <span>ĐÁNH GIÁ PHẢN XẠ NÓI CÙNG VI</span>
            </div>
            <h2 className="voice-result-title">Kết quả trò chuyện cùng Vi</h2>
            <div className="voice-result-sub">
              Chủ đề: <b>{effectiveTopic}</b> · Trình độ: <b>{level}</b> · <b>{userTurnsCount} lượt đối thoại</b>
            </div>
          </div>
          <div
            className="voice-result-tier-pill"
            style={{ background: tier.bg, color: tier.color, borderColor: tier.border }}
          >
            <span style={{ display: 'inline-flex' }}><UiIcon name={tier.icon} size={16} /></span>
            <span style={{ fontWeight: 800 }}>{tier.label}</span>
          </div>
        </div>

        {/* Hero Score & Vi Summary */}
        <div className="voice-result-hero">
          <div className="voice-result-dial-wrap">
            <ScoreRing
              value={scoreReport.overall}
              label={`${scoreReport.overall}`}
              size={110}
              accentColor={tier.strokeColor}
            />
          </div>

          <div className="voice-result-summary-box">
            <div className="voice-result-summary-head">
              <ViMascotImage
                pose={scoreReport.overall >= 70 ? 'celebrate' : 'listen'}
                animated={scoreReport.overall >= 80}
                size={44}
                alt="Vi nhận xét phản xạ giao tiếp tiếng Anh của bạn"
              />
              <div>
                <div style={{ fontWeight: 800, fontSize: '14.5px', color: 'var(--ink)' }}>Nhận xét từ trợ lý Vi</div>
                <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Đánh giá phản xạ &amp; độ tự nhiên theo khung CEFR</div>
              </div>
            </div>
            <div className="voice-result-summary-content">
              {scoreReport.summary}
            </div>
          </div>
        </div>

        {/* 5 Criteria */}
        <div className="voice-result-section">
          <div className="voice-result-section-title">
            <Icon n="check" s={18} />
            <span>Chi tiết 5 tiêu chí đánh giá phản xạ</span>
          </div>

          <div className="voice-criteria-grid">
            {criteriaList.map((crit, idx) => {
              const isLast = idx === 4; // Pronunciation
              const score = Math.round(crit.data?.score ?? 0);
              const color = score >= 85 ? 'var(--success)' : score >= 70 ? 'var(--sage)' : 'var(--amber)';
              return (
                <div key={crit.key} className={`voice-crit-card ${isLast ? 'full-span' : ''}`}>
                  <div className="voice-crit-top">
                    <div className="voice-crit-label">
                      <span className="voice-crit-icon">{crit.icon}</span>
                      <span className="voice-crit-name">{crit.name}</span>
                      {crit.data?.estimatedFromTranscript && (
                        <span className="voice-crit-pill-warn" title="Được ước lượng dựa trên bản ghi chuyển hóa văn bản">
                          Ước lượng từ văn bản
                        </span>
                      )}
                    </div>
                    <div className="voice-crit-score" style={{ color }}>
                      {score} <span style={{ fontSize: '12px', color: '#94a3b8' }}>/ 100</span>
                    </div>
                  </div>

                  <div className="voice-crit-bar-track">
                    <div
                      className="voice-crit-bar-fill"
                      style={{ width: `${Math.min(score, 100)}%`, backgroundColor: color }}
                    />
                  </div>

                  <div className="voice-crit-comment">
                    {crit.data?.comment || 'Chưa có nhận xét cho tiêu chí này.'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* New Words */}
        {scoreReport.newWords && scoreReport.newWords.length > 0 && (
          <div className="voice-result-section">
            <div className="voice-result-section-title">
              <Icon n="spark" s={18} />
              <span>Từ vựng gợi ý thêm từ hội thoại ({scoreReport.newWords.length} từ)</span>
            </div>
            <div className="voice-vocab-grid">
              {scoreReport.newWords.map((w: VoiceChatNewWord, idx: number) => {
                const isSaved = w.wordId ? savedWords.has(w.wordId) : false;
                return (
                  <div key={idx} className="voice-vocab-card">
                    <div className="voice-vocab-info">
                      <div className="voice-vocab-main">
                        <span className="voice-vocab-word">{w.word}</span>
                        <span className="voice-vocab-dot">·</span>
                        <span className="voice-vocab-meaning">{w.meaning}</span>
                      </div>
                      {w.example && (
                        <div className="voice-vocab-example" title={w.example}>
                          &ldquo;{w.example}&rdquo;
                        </div>
                      )}
                    </div>

                    <div className="voice-vocab-action">
                      {w.inDictionary && w.wordId ? (
                        <button
                          type="button"
                          onClick={() => handleSaveWord(w)}
                          disabled={isSaved}
                          className={`voice-save-btn ${isSaved ? 'saved' : ''}`}
                        >
                          {isSaved ? '✓ Đã lưu' : '+ Lưu từ'}
                        </button>
                      ) : (
                        <span className="voice-vocab-empty-tag" title="Từ này chưa có trong kho từ điển hệ thống">
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

        {/* Transcript toggle */}
        {messages.length > 0 && (
          <div className="voice-result-transcript-toggle">
            <button
              type="button"
              onClick={() => setShowTranscript((prev) => !prev)}
              className="voice-transcript-btn"
            >
              <Icon n={showTranscript ? 'x' : 'msg'} s={16} />
              <span>{showTranscript ? 'Thu gọn lịch sử đối thoại' : `Xem lại lịch sử đối thoại (${messages.length} tin nhắn)`}</span>
            </button>
          </div>
        )}

        {showTranscript && messages.length > 0 && (
          <div className="voice-result-transcript-body">
            {messages.map((m: Message) => (
              <div key={m.id} className={`voice-transcript-row ${m.role}`}>
                <span className="voice-transcript-author">{m.role === 'assistant' ? 'Vi' : 'Bạn'}:</span>
                <span className="voice-transcript-text">{m.text}</span>
              </div>
            ))}
          </div>
        )}

        {/* Action Footer */}
        <div className="voice-result-footer">
          <button
            type="button"
            onClick={handleResetSession}
            className="btn btn-outline voice-btn-replay"
          >
            <UiIcon name="refresh" size={14} /> Luyện tập lại phiên mới
          </button>
          {onBackToPractice && (
            <button
              type="button"
              onClick={handleFinishSession}
              className="btn btn-primary voice-btn-done"
            >
              ✓ Hoàn tất &amp; Về chủ đề
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="voice-chat-container">
      {/* 1. Header Bar */}
      <div className="voice-chat-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
          {onBackToPractice && (
            <button
              onClick={() => {
                stopAudio();
                onBackToPractice();
              }}
              className="btn btn-outline"
              style={{ padding: '6px 12px', fontSize: '13px', whiteSpace: 'nowrap' }}
            >
              <Icon n="chevronLeft" s={16} /> Quay lại
            </button>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
              <span style={{ fontWeight: 800, fontSize: '16px', whiteSpace: 'nowrap' }}>{effectiveTopic}</span>
              {onLevelChange ? (
                <select
                  value={level}
                  onChange={(e) => onLevelChange(e.target.value)}
                  style={{
                    padding: '3px 8px',
                    borderRadius: '8px',
                    border: '1px solid rgba(71, 96, 63, 0.3)',
                    background: 'rgba(71, 96, 63, 0.12)',
                    color: 'var(--sage-dark)',
                    fontSize: '12px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                  title="Thay đổi trình độ luyện nói"
                >
                  {['A1', 'A2', 'B1', 'B2', 'C1'].map((lvl) => (
                    <option key={lvl} value={lvl}>
                      {lvl}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="pill greensoft" style={{ fontSize: '11px', padding: '2px 8px', whiteSpace: 'nowrap' }}>
                  {level}
                </span>
              )}
            </div>
            <div className="sub" style={{ fontSize: '12.5px', whiteSpace: 'nowrap' }}>
              Luyện phản xạ giao tiếp hai chiều cùng trợ lý AI Vi
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', justifyContent: 'flex-end', flex: 1 }}>
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
                {v.name}
              </option>
            ))}
          </select>

          {/* Voice Speed Selector */}
          <select
            value={speed}
            onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
            style={{
              padding: '6px 10px',
              borderRadius: '10px',
              border: '1px solid var(--border, #cbd5e1)',
              background: '#fff',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
            title="Tốc độ nói của Vi"
          >
            <option value="1.0">⚡ 1.0x (Chậm)</option>
            <option value="1.15">⚡ 1.15x (Chuẩn giao tiếp)</option>
            <option value="1.25">⚡ 1.25x (Nhanh)</option>
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
            {isScoring ? 'Đang chấm điểm…' : <><UiIcon name="flag" size={14} /> Kết thúc &amp; Chấm điểm</>}
          </button>
        </div>
      </div>

      {/* 2. Messages Timeline */}
      <div className="voice-chat-messages long-list" ref={chatScrollRef}>
        {!hasStarted ? (
          <div className="voice-start-card">
            <div className="voice-start-avatar-wrap">
              <ViMascotImage
                pose="listen"
                animated
                size={88}
                alt="Vi đeo tai nghe sẵn sàng trò chuyện luyện phản xạ nói"
              />
              <span className="voice-start-online-dot" title="Sẵn sàng đối thoại" />
            </div>

            <div className="voice-start-title">Trò chuyện giọng nói cùng AI Vi</div>
            <div className="voice-start-desc">
              Chủ đề: <b style={{ color: 'var(--sage-dark)' }}>{effectiveTopic}</b> · Trình độ: <b>{level}</b>
              <br />
              Bấm nút <b>Bắt đầu</b> để Vi mở lời chào và câu hỏi phản xạ đầu tiên cho bạn nhé!
            </div>

            <button
              type="button"
              onClick={handleStart}
              className="voice-start-btn"
            >
              <Icon n="spark" s={20} />
              Bắt đầu
            </button>

            <div className="voice-start-hint">
              <span><UiIcon name="lightbulb" size={14} /> Bạn có thể chọn giọng đọc hoặc tốc độ nói ở góc trên trước khi bắt đầu</span>
            </div>
          </div>
        ) : (
          messages.map((m: Message) => (
          <div key={m.id} className={`voice-msg-row ${m.role}`}>
            {m.role === 'assistant' ? (
              <ViMascotImage
                pose="explain"
                size={42}
                alt="Vi trả lời hội thoại luyện nói"
              />
            ) : (
              <div className="voice-user-avatar">Bạn</div>
            )}

            <div className="voice-bubble">
              {m.role === 'assistant' && m.sentences ? (
                <div>
                  {m.sentences.map((sent: string, sIdx: number) => {
                    const isSentenceActive =
                      activeSentence?.msgId === m.id && activeSentence?.sentenceIdx === sIdx;
                    const words = sent.trim().split(/\s+/).filter(Boolean);
                    return (
                      <span
                        key={sIdx}
                        className={`voice-sentence ${isSentenceActive ? 'active-sentence' : ''}`}
                        onClick={() => playSingleSentence(m.id, sIdx, sent)}
                        title="Bấm để nghe lại câu này"
                      >
                        {words.map((word: string, wIdx: number) => {
                          const isWordActive = isSentenceActive && activeWordIdx === wIdx;
                          return (
                            <span
                              key={wIdx}
                              className={`voice-word ${isWordActive ? 'active-word' : ''}`}
                            >
                              {word}
                              {wIdx < words.length - 1 ? ' ' : ''}
                            </span>
                          );
                        })}
                        {' '}
                      </span>
                    );
                  })}
                  <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => playSentences(m.id, m.sentences || [], m.text)}
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
        ))
        )}

        {/* Live Status Indicator */}
        {status === 'transcribing' && (
          <div className="voice-status-box">
            <span className="grading-spin" style={{ display: 'inline-flex' }}><UiIcon name="headphones" size={18} /></span>
            <span>Whisper đang chuyển giọng nói thành văn bản…</span>
          </div>
        )}

        {status === 'thinking' && (
          <div className="voice-status-box" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
            <span className="grading-spin" style={{ display: 'inline-flex' }}><UiIcon name="sparkles" size={18} /></span>
            <span>Vi đang suy nghĩ câu trả lời…</span>
            <button
              onClick={handleCancelWaiting}
              className="btn btn-outline"
              style={{
                padding: '2px 10px',
                fontSize: '12px',
                color: '#64748b',
                borderColor: '#cbd5e1',
                borderRadius: '8px',
                cursor: 'pointer',
                background: '#fff',
              }}
              title="Hủy chờ và quay lại trạng thái nói"
            >
              Hủy chờ
            </button>
          </div>
        )}

        {errorMsg && (
          <div
            style={{
              padding: '10px 16px',
              borderRadius: '12px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#b91c1c',
              fontSize: '13.5px',
              alignSelf: 'center',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              flexWrap: 'wrap',
              justifyContent: 'center',
            }}
          >
            <span><UiIcon name="warning" size={14} /> {errorMsg}</span>
            <button
              onClick={handleRetry}
              className="btn btn-primary"
              style={{
                padding: '4px 12px',
                fontSize: '12px',
                fontWeight: 700,
                borderRadius: '8px',
                background: '#dc2626',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
              }}
              title="Thử lại request vừa rồi"
            >
              <UiIcon name="refresh" size={13} /> Thử lại
            </button>
          </div>
        )}
      </div>

      {/* 3. Bottom Controls (Push-to-talk) */}
      <div className="voice-chat-footer">
        <button
          className={`mic-ptt-btn ${status === 'recording' ? 'recording' : 'idle'}`}
          onPointerDown={hasStarted ? startRecording : undefined}
          onPointerUp={hasStarted ? stopRecordingAndSend : undefined}
          onPointerLeave={hasStarted ? stopRecordingAndSend : undefined}
          title={hasStarted ? "Bấm giữ để nói tiếng Anh, thả ra để gửi" : "Vui lòng bấm 'Bắt đầu' trước khi nói"}
          disabled={!hasStarted || status === 'transcribing' || status === 'thinking'}
          style={!hasStarted ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
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
          {!hasStarted ? (
            <div style={{ color: '#64748b', fontSize: '13.5px', fontWeight: 600 }}>
              <UiIcon name="arrow-right" size={14} /> Bấm <b>&quot;Bắt đầu&quot;</b> ở trên để Vi mở lời chào và câu hỏi phản xạ đầu tiên
            </div>
          ) : status === 'recording' ? (
            <div style={{ color: '#ef4444', fontWeight: 800, fontSize: '15px' }}>
              <UiIcon name="mic" size={13} color="var(--danger)" /> Đang ghi âm: {recordSeconds}s · Thả ra để gửi
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
    </div>
  );
};
