// frontend/src/components/dashboard/DailyCheckin.jsx
// Daily emotional check-in form — collects text, sleep hours, stress level,
// optional face image and voice recording, then analyzes and saves to journal.

import React, { useState, useRef } from 'react';
import { Sparkles, Save, CheckCircle } from 'lucide-react';
import { analyzeText, analyzeFace, analyzeVoice, fuseEmotions, createJournalEntry } from '../../services/api';
import EmotionResult from '../ui/EmotionResult';
import RecommendationCard from '../ui/RecommendationCard';

const STRESS_LABELS = ['', 'Very Low', 'Low', 'Mild', 'Moderate', 'Moderate+', 'High', 'High+', 'Very High', 'Severe', 'Overwhelming'];

export default function DailyCheckin() {
  const [text, setText] = useState('');
  const [sleepHours, setSleepHours] = useState(7);
  const [stressLevel, setStressLevel] = useState(3);
  const [imageFile, setImageFile] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const faceRef = useRef(null);
  const audioRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) { setError('Please write something about your day.'); return; }
    setError(''); setLoading(true); setResults(null); setSaved(false);

    const modResults = { text: null, face: null, voice: null };

    if (text.trim()) {
      setStatus('Analyzing your text…');
      try { const r = await analyzeText(text.trim()); modResults.text = r.data; } catch {}
    }
    if (imageFile) {
      setStatus('Analyzing your expression…');
      try { const r = await analyzeFace(imageFile); modResults.face = r.data; } catch {}
    }
    if (audioBlob) {
      setStatus('Analyzing your voice…');
      try { const r = await analyzeVoice(audioBlob, audioBlob.name || 'checkin.wav'); modResults.voice = r.data; } catch {}
    }

    let fused = null;
    if (modResults.text || modResults.face || modResults.voice) {
      setStatus('Fusing results…');
      try {
        const r = await fuseEmotions({ text: modResults.text, face: modResults.face, voice: modResults.voice });
        fused = r.data;
      } catch {}
    }

    const finalResults = { ...modResults, fused };
    setResults(finalResults);
    setStatus('');
    setLoading(false);
  };

  const handleSave = async () => {
    if (!results) return;
    setSaving(true);
    try {
      const primaryResult = results.fused || results.text || results.face || results.voice;
      await createJournalEntry({
        text, sleepHours, stressLevel,
        textResult: results.text, faceResult: results.face, voiceResult: results.voice,
        fusedResult: results.fused,
        recommendations: primaryResult?.recommendations || null,
      });
      setSaved(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save entry. Check that Firebase is configured.');
    } finally {
      setSaving(false);
    }
  };

  const displayResult = results?.fused
    ? { ...results.fused, topEmotion: results.fused.fusedEmotion }
    : results?.text || results?.face || results?.voice;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="card">
        <h2 className="section-title"><Sparkles size={20} />Daily Check-in</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
          Take a moment to reflect on how you feel today. All entries are private to your account.
        </p>

        <form id="checkin-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Text */}
          <div className="form-group">
            <label className="form-label" htmlFor="checkin-text">How are you feeling today? *</label>
            <textarea id="checkin-text" className="form-textarea"
              placeholder="Describe your mood, thoughts, or what happened today…"
              value={text} onChange={(e) => setText(e.target.value)}
              style={{ minHeight: '130px' }} required />
          </div>

          <div className="grid-2">
            {/* Sleep */}
            <div className="form-group">
              <label className="form-label" htmlFor="checkin-sleep">
                Sleep last night: <strong style={{ color: 'var(--gold)' }}>{sleepHours} hours</strong>
              </label>
              <input type="range" id="checkin-sleep" min="0" max="12" step="0.5"
                value={sleepHours} onChange={(e) => setSleepHours(parseFloat(e.target.value))} />
              <div className="flex justify-between" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <span>0h</span><span>6h</span><span>12h</span>
              </div>
            </div>

            {/* Stress */}
            <div className="form-group">
              <label className="form-label" htmlFor="checkin-stress">
                Stress level: <strong style={{ color: 'var(--gold)' }}>{stressLevel}/10 — {STRESS_LABELS[stressLevel]}</strong>
              </label>
              <input type="range" id="checkin-stress" min="1" max="10" step="1"
                value={stressLevel} onChange={(e) => setStressLevel(parseInt(e.target.value))} />
              <div className="flex justify-between" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <span>Low</span><span>Medium</span><span>High</span>
              </div>
            </div>
          </div>

          {/* Optional face */}
          <div className="form-group">
            <label className="form-label" htmlFor="checkin-face">Optional: Face photo</label>
            <input ref={faceRef} id="checkin-face" type="file" accept="image/*"
              className="form-input" style={{ padding: '0.5rem' }}
              onChange={(e) => setImageFile(e.target.files[0] || null)} />
            {imageFile && <span style={{ fontSize: '0.8rem', color: 'var(--green)' }}>✓ {imageFile.name}</span>}
          </div>

          {/* Optional voice */}
          <div className="form-group">
            <label className="form-label" htmlFor="checkin-audio">Optional: Voice recording</label>
            <input ref={audioRef} id="checkin-audio" type="file" accept="audio/*"
              className="form-input" style={{ padding: '0.5rem' }}
              onChange={(e) => setAudioBlob(e.target.files[0] || null)} />
            {audioBlob && <span style={{ fontSize: '0.8rem', color: 'var(--green)' }}>✓ {audioBlob.name}</span>}
          </div>

          {error && <div className="alert alert-error">{error}</div>}
          {status && <div className="alert alert-info">{status}</div>}

          <button type="submit" id="btn-checkin-submit" className="btn btn-primary btn-lg"
            disabled={loading || !text.trim()}>
            {loading ? <><span className="spinner" /> Analyzing…</> : <><Sparkles size={18} />Save & Analyze Entry</>}
          </button>
        </form>
      </div>

      {/* Results */}
      {results && displayResult && (
        <>
          <EmotionResult result={displayResult} title="Today's Emotional Analysis" />

          {/* Individual modality breakdown */}
          {(results.text || results.face || results.voice) && results.fused && (
            <div className="card">
              <h3 className="section-title">Individual Modality Breakdown</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.75rem' }}>
                {results.text && <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.375rem', fontWeight: 600 }}>TEXT</div>
                  <EmotionResult result={results.text} compact />
                </div>}
                {results.face && <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.375rem', fontWeight: 600 }}>FACE</div>
                  <EmotionResult result={results.face} compact />
                </div>}
                {results.voice && <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.375rem', fontWeight: 600 }}>VOICE</div>
                  <EmotionResult result={results.voice} compact />
                </div>}
              </div>
            </div>
          )}

          {displayResult?.recommendations && <RecommendationCard recommendations={displayResult.recommendations} />}

          {/* Save button */}
          {!saved ? (
            <button id="btn-save-checkin" className="btn btn-secondary btn-lg" onClick={handleSave} disabled={saving}>
              {saving ? <><span className="spinner" /> Saving…</> : <><Save size={18} />Save to Journal</>}
            </button>
          ) : (
            <div className="alert alert-success flex items-center gap-2">
              <CheckCircle size={18} /> Entry saved to your emotional journal!
            </div>
          )}
        </>
      )}
    </div>
  );
}
