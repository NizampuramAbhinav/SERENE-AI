// frontend/src/components/dashboard/Overview.jsx
// Dashboard overview showing stats, last entry, and quick action cards.

import React, { useEffect, useState } from 'react';
import { Brain, BookOpen, TrendingUp, Sparkles, ArrowRight, Activity } from 'lucide-react';
import { getJournalEntries, getMoodTrends } from '../../services/api';
import { getEmotionEmoji, getEmotionColor, formatEmotion, formatConfidence } from '../../utils/emotionUtils';
import { useAuth } from '../../contexts/AuthContext';

export default function Overview() {
  const { currentUser } = useAuth();
  const [stats, setStats] = useState(null);
  const [lastEntry, setLastEntry] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [entriesRes, trendsRes] = await Promise.all([getJournalEntries(), getMoodTrends()]);
        const entries = entriesRes.data.entries || [];
        setLastEntry(entries[0] || null);
        setStats(trendsRes.data.summary || null);
      } catch {
        // Firebase not yet configured — show empty state gracefully
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const lastEmotion = lastEntry
    ? lastEntry.fusedResult?.fusedEmotion || lastEntry.textResult?.topEmotion || lastEntry.faceResult?.topEmotion || lastEntry.voiceResult?.topEmotion
    : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Hero greeting */}
      <div className="card animate-glow" style={{
        background: 'linear-gradient(135deg, #1a2744 0%, #0f1d35 100%)',
        border: '1px solid var(--border-gold)',
        padding: '2rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: 56, height: 56, borderRadius: '14px',
            background: 'linear-gradient(135deg, var(--gold) 0%, #d97706 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: 'var(--shadow-glow-gold)', flexShrink: 0,
          }}>
            <Brain size={28} color="#0b1120" />
          </div>
          <div>
            <div style={{ fontSize: '1.5rem', fontFamily: 'Outfit', fontWeight: 800, color: 'var(--text-primary)' }}>
              {greeting()}, {currentUser?.displayName?.split(' ')[0] || 'there'}! 👋
            </div>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem', fontSize: '0.9375rem' }}>
              How are you feeling today? Track your emotional well-being with SERENE AI.
            </p>
          </div>
        </div>
      </div>

      {/* Stats row */}
      {!loading && stats && (
        <div className="grid-4 stagger" style={{ gap: '1rem' }}>
          {[
            { label: 'Journal Entries', value: stats.totalEntries ?? 0, icon: BookOpen, color: 'var(--blue-light)' },
            { label: 'Top Emotion', value: formatEmotion(stats.mostFrequentEmotion || 'neutral'), icon: Brain, color: 'var(--gold)' },
            { label: 'Avg Sleep', value: stats.avgSleepHours ? `${stats.avgSleepHours}h` : 'N/A', icon: Activity, color: 'var(--teal)' },
            { label: 'Avg Stress', value: stats.avgStressLevel ? `${stats.avgStressLevel}/10` : 'N/A', icon: TrendingUp, color: 'var(--rose)' },
          ].map((stat, i) => (
            <div key={i} className="card animate-fadeIn" style={{ textAlign: 'center', padding: '1.25rem' }}>
              <stat.icon size={24} style={{ color: stat.color, margin: '0 auto 0.625rem' }} />
              <div style={{ fontSize: '1.625rem', fontWeight: 800, fontFamily: 'Outfit', color: stat.color }}>{stat.value}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Last entry */}
      {lastEntry && lastEmotion && (
        <div className="card animate-fadeIn">
          <h3 className="section-title">Last Check-in</h3>
          <div className="flex items-center gap-3" style={{ padding: '0.75rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
            <span style={{ fontSize: '2rem' }}>{getEmotionEmoji(lastEmotion)}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, color: getEmotionColor(lastEmotion), fontSize: '1.125rem' }}>
                {formatEmotion(lastEmotion)}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {new Date(lastEntry.createdAt).toLocaleString()} ·{' '}
                Confidence: {formatConfidence(
                  lastEntry.fusedResult?.confidence || lastEntry.textResult?.confidence || lastEntry.faceResult?.confidence || lastEntry.voiceResult?.confidence
                )}
              </div>
              {lastEntry.text && (
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.5rem',
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  "{lastEntry.text}"
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Quick action cards */}
      <div>
        <h3 className="section-title">Quick Actions</h3>
        <div className="grid-3 stagger">
          {[
            { icon: Sparkles, title: 'Daily Check-in', desc: 'Analyze your current emotional state', color: 'var(--gold)', section: 'checkin' },
            { icon: BookOpen, title: 'View Journal', desc: 'Browse your emotional history', color: 'var(--blue-light)', section: 'journal' },
            { icon: TrendingUp, title: 'Mood Trends', desc: 'Visualize your emotional patterns', color: 'var(--teal)', section: 'trends' },
          ].map(({ icon: Icon, title, desc, color }) => (
            <div key={title} className="card" style={{
              cursor: 'pointer', transition: 'all var(--transition)',
              border: `1px solid ${color}25`,
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = `${color}25`; e.currentTarget.style.transform = ''; }}>
              <Icon size={24} style={{ color, marginBottom: '0.75rem' }} />
              <div style={{ fontWeight: 700, marginBottom: '0.375rem', color: 'var(--text-primary)' }}>{title}</div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '0.875rem' }}>{desc}</div>
              <div style={{ fontSize: '0.8rem', color, display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600 }}>
                Open <ArrowRight size={14} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Empty state */}
      {!loading && !stats?.totalEntries && (
        <div className="alert alert-info" style={{ textAlign: 'center', padding: '2rem' }}>
          <Brain size={36} style={{ margin: '0 auto 1rem', color: 'var(--gold)' }} />
          <div style={{ fontWeight: 700, marginBottom: '0.375rem' }}>Welcome to SERENE AI!</div>
          <p style={{ fontSize: '0.875rem' }}>
            Start your first Daily Check-in to begin tracking your emotional patterns.
          </p>
        </div>
      )}
    </div>
  );
}
