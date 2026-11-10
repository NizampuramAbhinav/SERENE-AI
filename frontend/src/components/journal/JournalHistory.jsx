// frontend/src/components/journal/JournalHistory.jsx
// Displays paginated journal entries with view, edit, and delete actions.

import React, { useEffect, useState } from 'react';
import { BookOpen, Trash2, Eye, ChevronDown, ChevronUp, Download, AlertTriangle } from 'lucide-react';
import { getJournalEntries, deleteJournalEntry, downloadPDF } from '../../services/api';
import { getEmotionEmoji, getEmotionColor, formatEmotion, formatConfidence } from '../../utils/emotionUtils';

function EntryCard({ entry, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const emotion = entry.fusedResult?.fusedEmotion || entry.textResult?.topEmotion || entry.faceResult?.topEmotion || entry.voiceResult?.topEmotion || 'neutral';
  const confidence = entry.fusedResult?.confidence || entry.textResult?.confidence || entry.faceResult?.confidence || entry.voiceResult?.confidence || 0;
  const color = getEmotionColor(emotion);

  return (
    <div className="card animate-fadeIn" style={{ border: `1px solid ${color}20` }}>
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <span style={{ fontSize: '1.75rem' }}>{getEmotionEmoji(emotion)}</span>
          <div>
            <div style={{ fontWeight: 700, color, fontSize: '1rem' }}>{formatEmotion(emotion)}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {new Date(entry.createdAt).toLocaleString()} · {formatConfidence(confidence)}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button id={`btn-expand-${entry.id}`} className="btn btn-ghost btn-icon"
            onClick={() => setExpanded(s => !s)} aria-label="Toggle details">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          <button id={`btn-view-${entry.id}`} className="btn btn-secondary btn-icon"
            onClick={() => setExpanded(s => !s)} aria-label="View entry">
            <Eye size={16} />
          </button>
          <button id={`btn-delete-${entry.id}`} className="btn btn-danger btn-icon"
            onClick={() => onDelete(entry.id)} aria-label="Delete entry">
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Summary badges */}
      <div className="flex gap-2 mt-3" style={{ flexWrap: 'wrap' }}>
        {entry.sleepHours != null && <span className="badge badge-blue">💤 {entry.sleepHours}h sleep</span>}
        {entry.stressLevel != null && <span className="badge badge-rose" style={{ '--rose': '#f43f5e' }}>😤 Stress {entry.stressLevel}/10</span>}
        {entry.textResult && <span className="badge badge-gold">📝 Text</span>}
        {entry.faceResult && <span className="badge badge-teal">📷 Face</span>}
        {entry.voiceResult && <span className="badge badge-purple">🎤 Voice</span>}
        {entry.fusedResult && <span className="badge badge-green">⚡ Fused</span>}
      </div>

      {/* Expanded details */}
      {expanded && (
        <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {entry.text && (
            <div style={{ background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', padding: '0.875rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.375rem', fontWeight: 600, textTransform: 'uppercase' }}>Your Words</div>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>"{entry.text}"</p>
            </div>
          )}
          {entry.recommendations?.feedback && (
            <div style={{ background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', padding: '0.875rem', borderLeft: '3px solid var(--gold)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.375rem', fontWeight: 600, textTransform: 'uppercase' }}>AI Insight</div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{entry.recommendations.feedback}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function JournalHistory() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(null);
  const [downloading, setDownloading] = useState(false);

  const loadEntries = async () => {
    setLoading(true);
    try {
      const res = await getJournalEntries();
      setEntries(res.data.entries || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load journal. Ensure Firebase is configured.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadEntries(); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this journal entry? This cannot be undone.')) return;
    setDeleting(id);
    try {
      await deleteJournalEntry(id);
      setEntries(es => es.filter(e => e.id !== id));
    } catch { setError('Failed to delete entry.'); }
    finally { setDeleting(null); }
  };

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try { await downloadPDF(); }
    catch { setError('PDF export failed.'); }
    finally { setDownloading(false); }
  };

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
      <span className="spinner" style={{ width: 36, height: 36, margin: '0 auto 1rem' }} />
      <p>Loading your journal…</p>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header row */}
      <div className="flex justify-between items-center flex-wrap gap-3">
        <h2 className="section-title" style={{ marginBottom: 0 }}>
          <BookOpen size={20} />Your Emotional Journal
        </h2>
        {entries.length > 0 && (
          <button id="btn-export-pdf" className="btn btn-secondary" onClick={handleDownloadPDF} disabled={downloading}>
            {downloading ? <><span className="spinner" />Exporting…</> : <><Download size={16} />Export PDF</>}
          </button>
        )}
      </div>

      {error && <div className="alert alert-error flex gap-2"><AlertTriangle size={16} />{error}</div>}

      {entries.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem' }}>
          <BookOpen size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 1rem' }} />
          <h3 style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>No journal entries yet</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Complete a Daily Check-in to create your first entry.
          </p>
        </div>
      ) : (
        <>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            {entries.length} {entries.length === 1 ? 'entry' : 'entries'} — newest first
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {entries.map(entry => (
              <EntryCard key={entry.id} entry={entry} onDelete={handleDelete} />
            ))}
          </div>
          <div className="alert alert-warning flex gap-2" style={{ fontSize: '0.8rem' }}>
            <AlertTriangle size={14} style={{ flexShrink: 0 }} />
            All emotion predictions are AI estimates for self-reflection only, not medical diagnoses.
          </div>
        </>
      )}
    </div>
  );
}
