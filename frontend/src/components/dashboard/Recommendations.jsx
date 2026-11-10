// frontend/src/components/dashboard/Recommendations.jsx
// Standalone activity recommendations panel (allows selecting emotion manually).

import React, { useState } from 'react';
import { Brain, ChevronDown } from 'lucide-react';
import { getRecommendations } from '../../utils/recommendationsData';
import RecommendationCard from '../ui/RecommendationCard';
import { getEmotionEmoji, formatEmotion } from '../../utils/emotionUtils';

const EMOTIONS = ['joy', 'sadness', 'anger', 'fear', 'disgust', 'surprise', 'neutral'];

export default function Recommendations() {
  const [selected, setSelected] = useState('neutral');
  const rec = getRecommendations(selected);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="card">
        <h2 className="section-title"><Brain size={20} />Well-being Activity Suggestions</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
          Select an emotion to explore personalized general wellness suggestions. These are not medical advice.
        </p>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          {EMOTIONS.map(emo => (
            <button key={emo} id={`emo-btn-${emo}`}
              className={`btn btn-sm ${selected === emo ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setSelected(emo)}
              style={{ gap: '0.375rem' }}>
              {getEmotionEmoji(emo)} {formatEmotion(emo)}
            </button>
          ))}
        </div>

        <div style={{ background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', padding: '1rem', marginBottom: '1rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
            Showing suggestions for:
          </span>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--gold)', marginTop: '0.25rem' }}>
            {getEmotionEmoji(selected)} {formatEmotion(selected)}
          </div>
        </div>
      </div>

      <RecommendationCard recommendations={rec} />
    </div>
  );
}
