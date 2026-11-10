
import React, { useEffect, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';
import {
  BarChart2, TrendingUp, PieChart as PieIcon, Moon, Activity
} from 'lucide-react';
import { getMoodTrends } from '../../services/api';
import {
  getEmotionColor, getEmotionEmoji, formatEmotion
} from '../../utils/emotionUtils';

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)',
      padding: '0.75rem'
    }}>
      <p style={{
        fontSize: '0.8rem',
        color: 'var(--text-muted)',
        marginBottom: '0.25rem'
      }}>
        {label}
      </p>

      {payload.map((p, i) => (
        <div key={i} style={{
          fontSize: '0.875rem',
          color: p.color || 'var(--text-primary)',
          fontWeight: 600
        }}>
          {p.name}: {p.value}
          {p.name?.includes('Confidence') ? '%' : ''}
        </div>
      ))}
    </div>
  );
}

export default function MoodTrends() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadTrends() {
      try {
        const res = await getMoodTrends();

        if (!cancelled) {
          setData(res.data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.error || 'Failed to load analytics.'
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadTrends();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '4rem',
        color: 'var(--text-muted)'
      }}>
        <span className="spinner" style={{
          width: 36,
          height: 36,
          margin: '0 auto 1rem'
        }} />
        <p>Loading your mood data…</p>
      </div>
    );
  }

  if (error) {
    return <div className="alert alert-error">{error}</div>;
  }

  if (!data?.trends?.length) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem' }}>
        <BarChart2 size={48} style={{
          color: 'var(--text-muted)',
          margin: '0 auto 1rem'
        }} />
        <h3 style={{
          color: 'var(--text-secondary)',
          marginBottom: '0.5rem'
        }}>
          No trend data yet
        </h3>
        <p style={{
          color: 'var(--text-muted)',
          fontSize: '0.875rem'
        }}>
          Complete at least one Daily Check-in to see your mood trends here.
        </p>
      </div>
    );
  }

  const { trends, distribution, summary } = data;

  // Convert backend values into chart-friendly numeric values.
  const lineData = trends.map((t) => {
    const confidenceValue = Number(t.confidence);
    const sleepValue = Number(t.sleepHours);
    const stressValue = Number(t.stressLevel);

    return {
      date: t.date,
      confidence:
        Number.isFinite(confidenceValue)
          ? Math.max(0, Math.min(100, confidenceValue))
          : null,
      sleep:
        t.sleepHours != null && Number.isFinite(sleepValue)
          ? sleepValue
          : null,
      stress:
        t.stressLevel != null && Number.isFinite(stressValue)
          ? stressValue * 10
          : null,
      emotion: t.emotion
    };
  });

  const confidenceData = lineData.filter(
    (item) => item.confidence !== null
  );

  const pieData = (distribution || []).map((d) => ({
    name: formatEmotion(d.emotion),
    value: Number(d.count) || 0,
    color: getEmotionColor(d.emotion),
    emoji: getEmotionEmoji(d.emotion)
  }));

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '1.75rem'
    }}>
      <h2 className="section-title">
        <BarChart2 size={20} />
        Mood Trends & Analytics
      </h2>

      {/* Summary statistics */}
      <div className="grid-4 stagger">
        {[
          {
            label: 'Total Entries',
            value: summary.totalEntries,
            icon: BarChart2,
            color: 'var(--blue-light)'
          },
          {
            label: 'Top Emotion',
            value: `${getEmotionEmoji(summary.mostFrequentEmotion)} ${formatEmotion(summary.mostFrequentEmotion)}`,
            icon: Activity,
            color: 'var(--gold)'
          },
          {
            label: 'Avg Sleep',
            value: summary.avgSleepHours != null
              ? `${summary.avgSleepHours}h`
              : 'N/A',
            icon: Moon,
            color: 'var(--teal)'
          },
          {
            label: 'Avg Stress',
            value: summary.avgStressLevel != null
              ? `${summary.avgStressLevel}/10`
              : 'N/A',
            icon: TrendingUp,
            color: 'var(--rose)'
          }
        ].map((s, i) => (
          <div key={i} className="card animate-fadeIn" style={{
            textAlign: 'center',
            padding: '1.25rem'
          }}>
            <s.icon size={22} style={{
              color: s.color,
              margin: '0 auto 0.5rem'
            }} />
            <div style={{
              fontSize: '1.25rem',
              fontWeight: 800,
              color: s.color,
              fontFamily: 'Outfit'
            }}>
              {s.value}
            </div>
            <div style={{
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              marginTop: '0.25rem'
            }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Confidence trend */}
      <div className="card">
        <h3 className="section-title">
          <TrendingUp size={18} />
          Confidence Trend Over Time
        </h3>

        <p style={{
          fontSize: '0.8rem',
          color: 'var(--text-muted)',
          marginBottom: '1rem'
        }}>
          AI confidence score for the top detected emotion per entry.
        </p>

        {confidenceData.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart
                data={confidenceData}
                margin={{ top: 20, right: 20, left: 5, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(148,163,184,0.1)"
                />

                <XAxis
                  dataKey="date"
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  tickLine={false}
                />

                <YAxis
                  type="number"
                  domain={[0, 100]}
                  ticks={[0, 20, 40, 60, 80, 100]}
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  tickLine={false}
                  unit="%"
                />

                <Tooltip content={<CustomTooltip />} />

                <Line
                  type="linear"
                  dataKey="confidence"
                  name="Confidence"
                  stroke="#f59e0b"
                  strokeWidth={3}
                  dot={{
                    fill: '#f59e0b',
                    stroke: '#ffffff',
                    strokeWidth: 2,
                    r: 7
                  }}
                  activeDot={{
                    r: 9,
                    fill: '#f59e0b',
                    stroke: '#ffffff',
                    strokeWidth: 2
                  }}
                  connectNulls
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>

            <p style={{
              textAlign: 'center',
              color: 'var(--text-secondary)',
              fontSize: '0.875rem',
              marginTop: '0.5rem'
            }}>
              Latest recorded confidence: {' '}
              <strong>
                {confidenceData[confidenceData.length - 1].confidence}%
              </strong>
            </p>
          </>
        ) : (
          <p style={{
            textAlign: 'center',
            padding: '2rem',
            color: 'var(--text-muted)'
          }}>
            Confidence data is not available for these entries.
          </p>
        )}
      </div>

      {/* Emotion distribution and counts */}
      <div className="grid-2" style={{ gap: '1.5rem' }}>
        <div className="card">
          <h3 className="section-title">
            <PieIcon size={18} />
            Emotion Distribution
          </h3>

          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={3}
                dataKey="value"
              >
                {pieData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.color}
                    stroke="var(--bg-card)"
                    strokeWidth={2}
                  />
                ))}
              </Pie>

              <Tooltip
                formatter={(v, n) => [v, n]}
                contentStyle={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 8
                }}
              />

              <Legend formatter={(v) => (
                <span style={{
                  color: 'var(--text-secondary)',
                  fontSize: '0.8rem'
                }}>
                  {v}
                </span>
              )} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="section-title">
            <BarChart2 size={18} />
            Emotion Counts
          </h3>

          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={pieData}
              margin={{ top: 5, right: 5, left: -20, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(148,163,184,0.1)"
                vertical={false}
              />

              <XAxis
                dataKey="name"
                tick={{ fill: '#64748b', fontSize: 11 }}
                tickLine={false}
              />

              <YAxis
                allowDecimals={false}
                tick={{ fill: '#64748b', fontSize: 11 }}
                tickLine={false}
              />

              <Tooltip
                contentStyle={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 8
                }}
              />

              <Bar dataKey="value" name="Count" radius={[4, 4, 0, 0]}>
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Sleep versus stress */}
      {lineData.some(
        (d) => d.sleep !== null && d.stress !== null
      ) && (
          <div className="card">
            <h3 className="section-title">
              <Moon size={18} />
              Sleep vs Stress Level
            </h3>

            <p style={{
              fontSize: '0.8rem',
              color: 'var(--text-muted)',
              marginBottom: '1rem'
            }}>
              Stress normalized to 0–100 scale (×10) for comparison.
              Not a causal inference.
            </p>

            <ResponsiveContainer width="100%" height={200}>
              <LineChart
                data={lineData.filter(
                  (d) => d.sleep !== null && d.stress !== null
                )}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(148,163,184,0.1)"
                />

                <XAxis
                  dataKey="date"
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  tickLine={false}
                />

                <YAxis
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  tickLine={false}
                />

                <Tooltip content={<CustomTooltip />} />
                <Legend />

                <Line
                  type="monotone"
                  dataKey="sleep"
                  stroke="#14b8a6"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="Sleep (h)"
                />

                <Line
                  type="monotone"
                  dataKey="stress"
                  stroke="#f43f5e"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="Stress ×10"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

      <div className="alert alert-warning" style={{ fontSize: '0.8rem' }}>
        📊 Charts are based on real saved data only. AI emotion predictions
        are estimates, not clinical assessments.
      </div>
    </div>
  );
}
