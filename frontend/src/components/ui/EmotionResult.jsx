// frontend/src/components/ui/EmotionResult.jsx
// Reusable component to display emotion prediction result with confidence bar.

import React from 'react';
import { getEmotionColor, getEmotionEmoji, formatEmotion, formatConfidence } from '../../utils/emotionUtils';

export default function EmotionResult({ result, title = 'Detected Emotion', compact = false }) {
  if (!result) return null;

  const emotion = result.topEmotion || result.fusedEmotion || 'neutral';
  const confidence = result.confidence || 0;
  const color = getEmotionColor(emotion);
  const emoji = getEmotionEmoji(emotion);
  const distribution = result.distribution || [];

  if (compact) {
    return (
      <div style={{
        background: 'var(--bg-input)', borderRadius: 'var(--radius-md)',
        padding: '0.875rem', border: `1px solid ${color}30`
      }}>
        <div className="flex items-center gap-2">
          <span style={{ fontSize: '1.5rem' }}>{emoji}</span>
          <div>
            <div style={{ fontWeight: 700, color, fontSize: '1rem' }}>{formatEmotion(emotion)}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {formatConfidence(confidence)} confidence
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card animate-fadeIn" style={{ border: `1px solid ${color}30` }}>
      <h3 className="section-title">{title}</h3>

      {/* Top emotion */}
      <div className="flex items-center gap-4 mb-4" style={{
        background: `${color}10`, borderRadius: 'var(--radius-md)',
        padding: '1.25rem', border: `1px solid ${color}25`
      }}>
        <div style={{ fontSize: '3rem', lineHeight: 1 }}>{emoji}</div>
        <div>
          <div style={{ fontSize: '1.875rem', fontWeight: 800, color, fontFamily: 'Outfit' }}>
            {formatEmotion(emotion)}
          </div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Confidence: <strong style={{ color }}>{formatConfidence(confidence)}</strong>
          </div>
          {result.modelType && (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Model: {result.model || result.modelType}
            </div>
          )}
        </div>
      </div>

      {/* Distribution */}
      {distribution.length > 1 && (
        <div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Emotion Distribution
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {distribution.slice(0, 7).map((item) => {
              const itemEmotion = item.label || item.emotion;
              const itemColor = getEmotionColor(itemEmotion);
              const pct = Math.round((item.score || 0) * 100);
              return (
                <div key={itemEmotion}>
                  <div className="flex justify-between items-center" style={{ marginBottom: '0.25rem' }}>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                      {getEmotionEmoji(itemEmotion)} {formatEmotion(itemEmotion)}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: itemColor, fontWeight: 600 }}>{pct}%</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${itemColor}bb, ${itemColor})` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Disagreement note (fusion only) */}
      {result.disagreementNote && (
        <div className="alert alert-info mt-4" style={{ fontSize: '0.8rem' }}>
          ℹ️ {result.disagreementNote}
        </div>
      )}
    </div>
  );
}
