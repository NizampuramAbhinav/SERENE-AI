
import React, { useState } from 'react';
import { Send, FileText, Info } from 'lucide-react';
import { analyzeText } from '../../services/api';
import EmotionResult from '../ui/EmotionResult';
import RecommendationCard from '../ui/RecommendationCard';

const EXAMPLE_TEXTS = [
  "I had such a wonderful day today! Everything just fell into place perfectly.",
  "I'm feeling really overwhelmed and don't know how to handle all the pressure at work.",
  "Why can't people just listen? It's infuriating when nobody takes my concerns seriously.",
  "I'm not sure how I feel today — just kind of floating along.",
];

export default function TextEmotion() {
  const [text, setText] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAnalyze = async () => {
    if (!text.trim() || text.trim().length < 2) {
      setError('Please enter at least a few words to analyze.');
      return;
    }

    setError('');
    setLoading(true);
    setResult(null);

    try {
      const res = await analyzeText(text.trim());
      setResult(res.data);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        err.response?.data?.error ||
        'Text analysis failed. Please ensure the Node.js backend and Python inference service are running.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Information card */}
      <div className="alert alert-info flex gap-2">
        <Info size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <strong>Local NLP-based Emotion Analysis</strong> — Uses the
          locally fine-tuned DistilRoBERTa model trained on the GoEmotions
          dataset. It identifies 28 emotion labels using multi-label
          classification. Results are AI estimates for self-reflection only.
        </div>
      </div>

      {/* Input card */}
      <div className="card">
        <h3 className="section-title">
          <FileText size={18} />
          Write your thoughts
        </h3>

        <div className="form-group">
          <textarea
            id="text-input"
            className="form-textarea"
            placeholder="Describe how you are feeling, share your thoughts, or write about your day…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            style={{ minHeight: '160px' }}
          />

          <div
            style={{
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              textAlign: 'right',
            }}
          >
            {text.length} characters
          </div>
        </div>

        {/* Example prompts */}
        <div style={{ marginBottom: '1rem' }}>
          <div
            style={{
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              marginBottom: '0.5rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Try an example:
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {EXAMPLE_TEXTS.map((ex, i) => (
              <button
                key={i}
                id={`example-text-${i}`}
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setText(ex);
                  setResult(null);
                  setError('');
                }}
                style={{
                  maxWidth: '260px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {ex.slice(0, 45)}…
              </button>
            ))}
          </div>
        </div>

        {error && <div className="alert alert-error mb-4">{error}</div>}

        <button
          id="btn-analyze-text"
          className="btn btn-primary btn-lg"
          onClick={handleAnalyze}
          disabled={loading || !text.trim()}
        >
          {loading ? (
            <>
              <span className="spinner" />
              Analyzing…
            </>
          ) : (
            <>
              <Send size={18} />
              Analyze Text
            </>
          )}
        </button>
      </div>

      {/* Results */}
      {result && (
        <>
          <EmotionResult
            result={result}
            title="Text Emotion Analysis Result"
          />

          {result.recommendations && (
            <RecommendationCard
              recommendations={result.recommendations}
            />
          )}
        </>
      )}
    </div>
  );
}
