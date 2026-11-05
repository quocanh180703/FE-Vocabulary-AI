import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { QuotaBadge } from '../components/QuotaBadge';
import { Icon } from '../components/icons';
import FreeCheckPanel from '../components/grammar/FreeCheckPanel';
import TopicPanel from '../components/grammar/TopicPanel';
import TranslationPanel from '../components/grammar/TranslationPanel';
import HistoryPanel from '../components/grammar/HistoryPanel';

export type GrammarTabType = 'topics' | 'translate' | 'free' | 'history';

export default function Grammar() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryTab = searchParams.get('tab') as GrammarTabType;
  const initialTab: GrammarTabType =
    queryTab === 'translate' || queryTab === 'free' || queryTab === 'history' ? queryTab : 'topics';

  const [activeTab, setActiveTab] = useState<GrammarTabType>(initialTab);

  useEffect(() => {
    const t = searchParams.get('tab') as GrammarTabType;
    if (t && (t === 'topics' || t === 'translate' || t === 'free' || t === 'history')) {
      if (t !== activeTab) {
        setActiveTab(t);
      }
    }
  }, [searchParams]);

  const handleTabChange = (t: GrammarTabType) => {
    setActiveTab(t);
    setSearchParams(t === 'topics' ? {} : { tab: t });
  };

  const handleReplay = (data: {
    mode: 'FREE' | 'TOPIC' | 'TRANSLATION';
    text?: string;
    context?: any;
  }) => {
    if (data.mode === 'TOPIC') {
      setActiveTab('topics');
      setSearchParams({});
    } else if (data.mode === 'TRANSLATION') {
      const wordId = data.context?.wordId;
      setActiveTab('translate');
      setSearchParams(wordId ? { tab: 'translate', wordId: String(wordId) } : { tab: 'translate' });
    } else {
      setActiveTab('free');
      setSearchParams({ tab: 'free' });
    }
  };

  return (
    <div className="content" style={{ maxWidth: 1600 }}>
      {/* Page Header */}
      <div
        className="pagehead"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <h1>Sửa ngữ pháp &amp; Luyện viết AI</h1>
          <div className="sub">
            Vi đồng hành phân tích ngữ pháp, gợi ý cấu trúc câu và chấm bài viết chuyên sâu
          </div>
        </div>
        <QuotaBadge featureKey="grammar" labelSuffix="lượt kiểm tra hôm nay" />
      </div>

      {/* 4 Tabs Switcher */}
      <div className="chips" style={{ marginBottom: 22, gap: 10 }}>
        <button
          type="button"
          className={'chip' + (activeTab === 'topics' ? ' on' : '')}
          onClick={() => handleTabChange('topics')}
          style={{ padding: '8px 20px', fontSize: 14, fontWeight: 700 }}
        >
          <Icon n="pen" s={18} /> 1. Viết theo chủ đề
        </button>

        <button
          type="button"
          className={'chip' + (activeTab === 'translate' ? ' on' : '')}
          onClick={() => handleTabChange('translate')}
          style={{ padding: '8px 20px', fontSize: 14, fontWeight: 700 }}
        >
          <Icon n="heart" s={18} /> 2. Luyện câu theo từ yêu thích
        </button>

        <button
          type="button"
          className={'chip' + (activeTab === 'free' ? ' on' : '')}
          onClick={() => handleTabChange('free')}
          style={{ padding: '8px 20px', fontSize: 14, fontWeight: 700 }}
        >
          <Icon n="spark" s={18} /> 3. Viết tự do
        </button>

        <button
          type="button"
          className={'chip' + (activeTab === 'history' ? ' on' : '')}
          onClick={() => handleTabChange('history')}
          style={{ padding: '8px 20px', fontSize: 14, fontWeight: 700 }}
        >
          <Icon n="clock" s={18} /> 4. Lịch sử
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'topics' && <TopicPanel />}
      {activeTab === 'translate' && <TranslationPanel />}
      {activeTab === 'free' && <FreeCheckPanel />}
      {activeTab === 'history' && (
        <HistoryPanel
          onReplay={handleReplay}
          onGoToTopics={() => handleTabChange('topics')}
        />
      )}
    </div>
  );
}
