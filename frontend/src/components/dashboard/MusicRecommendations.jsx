// frontend/src/components/dashboard/MusicRecommendations.jsx
// Standalone music recommendations panel with emotion selector.

import React, { useState } from 'react';
import { Music2, ExternalLink, Play } from 'lucide-react';
import { getEmotionEmoji, formatEmotion } from '../../utils/emotionUtils';
import { getRecommendations } from '../../utils/recommendationsData';

const EMOTIONS = ['joy', 'sadness', 'anger', 'fear', 'disgust', 'surprise', 'neutral'];

const EMOTION_BG = {
  joy: 'linear-gradient(135deg, rgba(251,191,36,0.1) 0%, rgba(217,119,6,0.05) 100%)',
  sadness: 'linear-gradient(135deg, rgba(96,165,250,0.1) 0%, rgba(59,130,246,0.05) 100%)',
  anger: 'linear-gradient(135deg, rgba(248,113,113,0.1) 0%, rgba(239,68,68,0.05) 100%)',
  fear: 'linear-gradient(135deg, rgba(167,139,250,0.1) 0%, rgba(139,92,246,0.05) 100%)',
  disgust: 'linear-gradient(135deg, rgba(52,211,153,0.1) 0%, rgba(16,185,129,0.05) 100%)',
  surprise: 'linear-gradient(135deg, rgba(251,146,60,0.1) 0%, rgba(234,88,12,0.05) 100%)',
  neutral: 'linear-gradient(135deg, rgba(148,163,184,0.1) 0%, rgba(100,116,139,0.05) 100%)',
};

export default function MusicRecommendations() {
  const [selected, setSelected] = useState('joy');
  const { music } = getRecommendations(selected);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="card">
        <h2 className="section-title"><Music2 size={20} />Music for Well-being</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
          Curated music suggestions to support your emotional state. Links open on YouTube.
          Music is not a medical treatment.
        </p>

        {/* Emotion selector */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          {EMOTIONS.map(emo => (
            <button key={emo} id={`music-emo-${emo}`}
              className={`btn btn-sm ${selected === emo ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setSelected(emo)}>
              {getEmotionEmoji(emo)} {formatEmotion(emo)}
            </button>
          ))}
        </div>

        {/* Category banner */}
        <div style={{
          background: EMOTION_BG[selected] || EMOTION_BG.neutral,
          borderRadius: 'var(--radius-lg)', padding: '1.25rem 1.5rem', marginBottom: '1.5rem',
          border: '1px solid var(--border)',
        }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.25rem' }}>
            Category
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {getEmotionEmoji(selected)} {music.category}
          </div>
        </div>

        {/* Track grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
          {music.tracks.map((track, i) => (
            <a key={i} href={track.url} target="_blank" rel="noopener noreferrer"
              id={`music-page-track-${i}`}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.875rem',
                padding: '1rem', background: 'var(--bg-input)',
                borderRadius: 'var(--radius-md)', border: '1px solid var(--border)',
                textDecoration: 'none', transition: 'all var(--transition)',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--gold)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = ''; }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                background: 'var(--gold-dim)', border: '1px solid var(--border-gold)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Play size={16} style={{ color: 'var(--gold)', marginLeft: '2px' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {track.title.split(' – ')[0]}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.1rem',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {track.title.includes(' – ') ? track.title.split(' – ')[1] : 'Artist'}
                </div>
              </div>
              <ExternalLink size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            </a>
          ))}
        </div>
      </div>

      <div className="alert alert-info" style={{ fontSize: '0.8rem' }}>
        🎵 These are curated YouTube links. SERENE AI does not host or distribute any music content.
        Music recommendations are for general well-being only and do not constitute medical advice.
      </div>
    </div>
  );
}
