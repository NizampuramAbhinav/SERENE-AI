
import React, { useState, useRef, useCallback } from 'react';
import { Camera, Upload, RefreshCw, Info } from 'lucide-react';
import Webcam from 'react-webcam';
import { analyzeFace } from '../../services/api';
import EmotionResult from '../ui/EmotionResult';
import RecommendationCard from '../ui/RecommendationCard';

export default function FaceEmotion() {
  const [mode, setMode] = useState('upload');
  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [webcamReady, setWebcamReady] = useState(false);

  const webcamRef = useRef(null);
  const fileInputRef = useRef(null);

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (JPEG, PNG, etc.).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Image size must be less than 10 MB.');
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setResult(null);
    setError('');
  };

  const captureWebcam = useCallback(() => {
    const screenshot = webcamRef.current?.getScreenshot();

    if (!screenshot) {
      setError('Failed to capture from webcam.');
      return;
    }

    const arr = screenshot.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1];

    if (!mime) {
      setError('Invalid webcam image format.');
      return;
    }

    const binary = atob(arr[1]);
    const bytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    const blob = new Blob([bytes], { type: mime });
    const file = new File([blob], 'webcam-capture.jpg', {
      type: mime,
    });

    setImageFile(file);
    setImagePreview(screenshot);
    setResult(null);
    setError('');
  }, []);

  const handleAnalyze = async () => {
    if (!imageFile) {
      setError('Please capture or upload an image first.');
      return;
    }

    setError('');
    setLoading(true);
    setResult(null);

    try {
      const res = await analyzeFace(imageFile);
      setResult(res.data);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        err.response?.data?.error ||
        'Facial analysis failed. Please ensure the backend and Python inference service are running.'
      );
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    if (imagePreview && imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview);
    }

    setImageFile(null);
    setImagePreview(null);
    setResult(null);
    setError('');
    setWebcamReady(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Information card */}
      <div className="alert alert-info flex gap-2">
        <Info size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <strong>Local Vision Transformer Facial Expression Recognition</strong>
          {' '}— Uses a locally fine-tuned Vision Transformer (ViT)
          trained on the FER-2013 dataset to identify seven facial
          emotion categories. Results are AI estimates and may not
          accurately reflect a person's actual emotional state.
        </div>
      </div>

      <div className="card">
        <h3 className="section-title">
          <Camera size={18} />
          Facial Expression Analysis
        </h3>

        {/* Mode toggle */}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '1.25rem',
          background: 'var(--bg-input)',
          padding: '0.25rem',
          borderRadius: 'var(--radius-md)',
        }}>
          {[
            { id: 'upload', label: 'Upload Image', icon: Upload },
            { id: 'webcam', label: 'Use Webcam', icon: Camera },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              id={`face-mode-${id}`}
              className={`btn btn-sm flex-1 ${mode === id ? 'btn-primary' : 'btn-ghost'
                }`}
              onClick={() => {
                reset();
                setMode(id);
              }}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {/* Upload mode */}
        {mode === 'upload' && (
          <div>
            {!imagePreview ? (
              <div
                className="upload-zone"
                id="face-upload-zone"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.add('dragover');
                }}
                onDragLeave={(e) => {
                  e.currentTarget.classList.remove('dragover');
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove('dragover');

                  const file = e.dataTransfer.files[0];

                  if (file) {
                    handleFileUpload({
                      target: { files: [file] },
                    });
                  }
                }}
              >
                <Upload
                  size={36}
                  style={{
                    color: 'var(--text-muted)',
                    marginBottom: '0.75rem',
                  }}
                />

                <p style={{
                  color: 'var(--text-secondary)',
                  marginBottom: '0.5rem',
                }}>
                  Drop an image here or{' '}
                  <span style={{ color: 'var(--gold)' }}>
                    click to browse
                  </span>
                </p>

                <p style={{
                  fontSize: '0.8rem',
                  color: 'var(--text-muted)',
                }}>
                  JPEG, PNG · Max 10 MB · Ensure a clear face is visible
                </p>

                <input
                  ref={fileInputRef}
                  id="face-file-input"
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleFileUpload}
                />
              </div>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <img
                  src={imagePreview}
                  alt="Uploaded face preview"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '320px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    objectFit: 'contain',
                  }}
                />

                <button
                  id="face-reset"
                  className="btn btn-ghost btn-sm mt-2"
                  onClick={reset}
                >
                  <RefreshCw size={14} />
                  Choose different image
                </button>
              </div>
            )}
          </div>
        )}

        {/* Webcam mode */}
        {mode === 'webcam' && (
          <div style={{ textAlign: 'center' }}>
            {!imagePreview ? (
              <div>
                <Webcam
                  ref={webcamRef}
                  audio={false}
                  screenshotFormat="image/jpeg"
                  videoConstraints={{ facingMode: 'user' }}
                  onUserMedia={() => setWebcamReady(true)}
                  onUserMediaError={() => {
                    setError(
                      'Webcam access denied. Please allow camera permissions.'
                    );
                  }}
                  style={{
                    width: '100%',
                    maxWidth: '480px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                  }}
                />

                <br />

                <button
                  id="btn-capture"
                  className="btn btn-secondary mt-4"
                  onClick={captureWebcam}
                  disabled={!webcamReady}
                >
                  <Camera size={16} />
                  Capture Photo
                </button>
              </div>
            ) : (
              <div>
                <img
                  src={imagePreview}
                  alt="Captured webcam preview"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '320px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    objectFit: 'contain',
                  }}
                />

                <button
                  id="face-recapture"
                  className="btn btn-ghost btn-sm mt-2 w-full"
                  onClick={reset}
                >
                  <RefreshCw size={14} />
                  Retake
                </button>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="alert alert-error mt-4">{error}</div>
        )}

        <button
          id="btn-analyze-face"
          className="btn btn-primary btn-lg mt-4 w-full"
          onClick={handleAnalyze}
          disabled={loading || !imageFile}
        >
          {loading ? (
            <>
              <span className="spinner" />
              Analyzing...
            </>
          ) : (
            <>
              <Camera size={18} />
              Analyze Expression
            </>
          )}
        </button>
      </div>

      {/* Results */}
      {result && (
        <>
          <EmotionResult
            result={result}
            title="Facial Expression Result"
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
