// frontend/src/components/ui/RecommendationCard.jsx
// Displays activity + music recommendations from the AI analysis result.

import React, { useState } from 'react';
import { Lightbulb, Music2, ExternalLink, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';

export default function RecommendationCard({ recommendations }) {
  const [showAll, setShowAll] = useState(false);
  if (!recommendations) return null;

  const { feedback, activities = [], music = {}, disclaimer } = recommendations;
  const visibleActivities = showAll ? activities : activities.slice(0, 3);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* AI Feedback */}
      {feedback && (
        <div className="card animate-fadeIn" style={{ border: '1px solid var(--border-gold)' }}>
          <h3 className="section-title"><Lightbulb size={18} />AI Emotional Insight</h3>
          <p style={{ color: 'var(--text-secondary)', lineHeight: '1.7' }}>{feedback}</p>
        </div>
      )}

      {/* Activities */}
      {activities.length > 0 && (
        <div className="card animate-fadeIn">
          <h3 className="section-title">Well-being Activities</h3>
          <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', listStyle: 'none' }}>
            {visibleActivities.map((act, i) => (
              <li key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                padding: '0.75rem', background: 'var(--bg-input)',
                borderRadius: 'var(--radius-md)', fontSize: '0.875rem', color: 'var(--text-secondary)',
              }}>
                <span style={{ color: 'var(--gold)', fontWeight: 700, flexShrink: 0 }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                {act}
              </li>
            ))}
          </ul>
          {activities.length > 3 && (
            <button id="btn-show-more-activities" className="btn btn-ghost btn-sm mt-4"
              onClick={() => setShowAll(s => !s)}>
              {showAll ? <><ChevronUp size={14} />Show less</> : <><ChevronDown size={14} />Show all {activities.length} activities</>}
            </button>
          )}
        </div>
      )}

      {/* Music */}
      {music?.tracks?.length > 0 && (
        <div className="card animate-fadeIn">
          <h3 className="section-title"><Music2 size={18} />Music for Well-being</h3>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '0.875rem' }}>
            Category: <span style={{ color: 'var(--gold)', fontWeight: 600 }}>{music.category}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.625rem' }}>
            {music.tracks.map((track, i) => (
              <a
                key={i}
                href={track.url}
                target="_blank"
                rel="noopener noreferrer"
                id={`music-track-${i}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.625rem',
                  padding: '0.75rem', background: 'var(--bg-input)',
                  borderRadius: 'var(--radius-md)', border: '1px solid var(--border)',
                  fontSize: '0.8125rem', color: 'var(--text-secondary)',
                  transition: 'all var(--transition)', textDecoration: 'none',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--gold)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
              >
                <Music2 size={14} style={{ color: 'var(--gold)', flexShrink: 0 }} />
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.title}</span>
                <ExternalLink size={12} style={{ flexShrink: 0 }} />
              </a>
            ))}
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
            Music links open on YouTube. Music is not a medical treatment.
          </p>
        </div>
      )}

      {/* Disclaimer */}
      {disclaimer && (
        <div className="alert alert-warning flex gap-2" style={{ fontSize: '0.8rem' }}>
          <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
          {disclaimer}
        </div>
      )}
    </div>
  );
}
