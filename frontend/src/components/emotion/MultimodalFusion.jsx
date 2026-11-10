// frontend/src/components/emotion/MultimodalFusion.jsx
// Multimodal emotion analysis with text, facial image, and voice inputs.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Webcam from 'react-webcam';
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  ExternalLink,
  FileText,
  Info,
  Layers,
  Mic,
  Moon,
  Music2,
  RefreshCw,
  StopCircle,
  Upload,
  Video,
  Zap,
} from 'lucide-react';

import {
  analyzeText,
  analyzeFace,
  analyzeVoice,
  fuseEmotions,
} from '../../services/api';
import { getRecommendations } from '../../utils/recommendationsData';
import EmotionResult from '../ui/EmotionResult';
import RecommendationCard from '../ui/RecommendationCard';
import {
  getEmotionColor,
  getEmotionEmoji,
  formatEmotion,
  formatConfidence,
} from '../../utils/emotionUtils';


// Convert browser-recorded WebM/Opus audio into 16-bit PCM WAV.
// The Python inference service can then decode the microphone recording.
async function convertToWav(audioBlob) {
  const AudioContextClass =
    window.AudioContext || window.webkitAudioContext;

  if (!AudioContextClass) {
    throw new Error('Audio conversion is not supported by this browser.');
  }

  const audioContext = new AudioContextClass();

  try {
    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    const channels = audioBuffer.numberOfChannels;
    const samples = audioBuffer.length;
    const sampleRate = audioBuffer.sampleRate;

    // Create a 16-bit, mono PCM WAV file.
    const wavBuffer = new ArrayBuffer(44 + samples * 2);
    const view = new DataView(wavBuffer);

    const writeString = (offset, value) => {
      for (let i = 0; i < value.length; i++) {
        view.setUint8(offset + i, value.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + samples * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, samples * 2, true);

    const channelData = Array.from(
      { length: channels },
      (_, channel) => audioBuffer.getChannelData(channel)
    );

    let offset = 44;

    for (let i = 0; i < samples; i++) {
      let sample = 0;

      for (let channel = 0; channel < channels; channel++) {
        sample += channelData[channel][i];
      }

      sample /= channels;
      sample = Math.max(-1, Math.min(1, sample));

      view.setInt16(
        offset,
        sample < 0 ? sample * 32768 : sample * 32767,
        true
      );

      offset += 2;
    }

    return new Blob([wavBuffer], { type: 'audio/wav' });
  } finally {
    await audioContext.close();
  }
}

const EMOTIONS = [
  'joy',
  'sadness',
  'anger',
  'fear',
  'disgust',
  'surprise',
  'neutral',
];

const EMOTION_LABELS = {
  joy: '😊 Joy',
  sadness: '😢 Sadness',
  anger: '😠 Anger',
  fear: '😨 Fear',
  disgust: '🤢 Disgust',
  surprise: '😲 Surprise',
  neutral: '😐 Neutral',
};

const initialResults = {
  text: null,
  face: null,
  voice: null,
  fused: null,
};

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function getErrorMessage(error) {
  return (
    error?.response?.data?.detail ||
    error?.response?.data?.error ||
    error?.message ||
    'An unexpected error occurred.'
  );
}

function isUsablePrediction(data) {
  if (!data || typeof data !== 'object') return false;
  if (data.error || data.status === 'ERROR' || data.status === 'FAILED') return false;
  return Boolean(
    data.topEmotion ||
    data.emotion ||
    data.predicted_emotion ||
    data.label ||
    data.predictions
  );
}

function WebcamCapture({ onCapture }) {
  const webcamRef = useRef(null);
  const [cameraError, setCameraError] = useState('');
  const [cameraReady, setCameraReady] = useState(false);
  const [snapshot, setSnapshot] = useState(null);

  const handleCameraError = useCallback((error) => {
    setCameraReady(false);

    if (error?.name === 'NotAllowedError') {
      setCameraError('Camera permission denied. Allow camera access in your browser settings.');
    } else if (error?.name === 'NotFoundError') {
      setCameraError('No camera was found on this device.');
    } else {
      setCameraError(`Camera unavailable: ${error?.message || error?.name || 'Unknown error'}`);
    }
  }, []);

  const handleCapture = useCallback(async () => {
    const dataUrl = webcamRef.current?.getScreenshot();
    if (!dataUrl) {
      setCameraError('The camera is not ready. Please try again.');
      return;
    }

    try {
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const file = new File([blob], 'webcam-capture.jpg', { type: 'image/jpeg' });

      setSnapshot(dataUrl);
      setCameraError('');
      onCapture(file);
    } catch (error) {
      setCameraError(`Could not process the photo: ${getErrorMessage(error)}`);
    }
  }, [onCapture]);

  const handleRetake = useCallback(() => {
    setSnapshot(null);
    onCapture(null);
  }, [onCapture]);

  if (snapshot) {
    return (
      <div className="flex flex-col gap-3">
        <img
          src={snapshot}
          alt="Captured face preview"
          style={{
            width: '100%',
            maxHeight: 240,
            objectFit: 'cover',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-gold)',
          }}
        />
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={handleRetake}
          style={{ alignSelf: 'flex-start' }}
        >
          <RefreshCw size={14} /> Retake photo
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {cameraError && (
        <div className="alert alert-warning" role="alert">
          <AlertTriangle size={14} style={{ display: 'inline', marginRight: 6 }} />
          {cameraError}
        </div>
      )}

      {!cameraError && (
        <div
          style={{
            position: 'relative',
            overflow: 'hidden',
            minHeight: 180,
            background: '#000',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <Webcam
            ref={webcamRef}
            audio={false}
            screenshotFormat="image/jpeg"
            videoConstraints={{ facingMode: 'user' }}
            onUserMedia={() => setCameraReady(true)}
            onUserMediaError={handleCameraError}
            style={{ display: 'block', width: '100%' }}
          />
          {!cameraReady && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                color: 'var(--text-muted)',
                background: 'var(--bg-input)',
              }}
            >
              <span className="spinner" />
              Initializing webcam...
            </div>
          )}
        </div>
      )}

      {!cameraError && (
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={handleCapture}
          disabled={!cameraReady}
          style={{ alignSelf: 'flex-start' }}
        >
          <Camera size={14} /> Capture photo
        </button>
      )}
    </div>
  );
}

function MicRecorder({ onRecorded }) {
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const streamRef = useRef(null);
  const audioUrlRef = useRef(null);

  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState(null);
  const [micError, setMicError] = useState('');

  const supported =
    typeof window !== 'undefined' &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    Boolean(window.MediaRecorder);

  const clearRecordingTimer = useCallback(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const clearAudioPreview = useCallback(() => {
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    setAudioUrl(null);
  }, []);

  useEffect(() => {
    return () => {
      clearRecordingTimer();
      streamRef.current?.getTracks().forEach((track) => track.stop());

      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }
    };
  }, [clearRecordingTimer]);

  const startRecording = async () => {
    setMicError('');
    setSeconds(0);
    onRecorded(null);
    clearAudioPreview();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true
      });

      streamRef.current = stream;
      chunksRef.current = [];

      const supportedTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4'
      ];

      const mimeType = supportedTypes.find((type) =>
        MediaRecorder.isTypeSupported(type)
      );

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data?.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        setMicError('Recording failed. Please try again or upload an audio file.');
        setRecording(false);
        clearRecordingTimer();
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      };

      // Convert the browser recording to WAV before passing it to the API.
      recorder.onstop = async () => {
        try {
          const recordedBlob = new Blob(chunksRef.current, {
            type: recorder.mimeType || 'audio/webm'
          });

          if (!recordedBlob.size) {
            throw new Error('No audio was captured. Please record again.');
          }

          const wavBlob = await convertToWav(recordedBlob);

          const wavFile = new File(
            [wavBlob],
            'recording.wav',
            { type: 'audio/wav' }
          );

          const url = URL.createObjectURL(wavBlob);
          clearAudioPreview();
          audioUrlRef.current = url;
          setAudioUrl(url);

          onRecorded(wavFile);
        } catch (error) {
          setMicError(`Audio conversion failed: ${getErrorMessage(error)}`);
          onRecorded(null);
        } finally {
          stream.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
      };

      recorder.start();
      setRecording(true);

      timerRef.current = window.setInterval(() => {
        setSeconds((current) => current + 1);
      }, 1000);
    } catch (error) {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;

      if (error?.name === 'NotAllowedError') {
        setMicError('Microphone permission denied. Allow microphone access in your browser settings.');
      } else if (error?.name === 'NotFoundError') {
        setMicError('No microphone was found on this device.');
      } else {
        setMicError(`Microphone unavailable: ${getErrorMessage(error)}`);
      }
    }
  };

  const stopRecording = () => {
    clearRecordingTimer();
    const recorder = mediaRecorderRef.current;

    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    }

    setRecording(false);
  };

  const recordAgain = () => {
    clearAudioPreview();
    setSeconds(0);
    setMicError('');
    onRecorded(null);
  };

  if (!supported) {
    return (
      <div className="alert alert-warning" role="alert">
        Your browser does not support audio recording. Please upload an audio file instead.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {micError && (
        <div className="alert alert-warning" role="alert">
          <AlertTriangle size={14} style={{ display: 'inline', marginRight: 6 }} />
          {micError}
        </div>
      )}

      {!recording && !audioUrl && (
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={startRecording}
          style={{ alignSelf: 'flex-start' }}
        >
          <Mic size={14} /> Start recording
        </button>
      )}

      {recording && (
        <div className="flex items-center gap-4">
          <span style={{ color: 'var(--rose)', fontWeight: 600 }}>
            <span
              style={{
                display: 'inline-block',
                width: 9,
                height: 9,
                marginRight: 7,
                borderRadius: '50%',
                background: 'var(--rose)'
              }}
            />
            REC {formatTime(seconds)}
          </span>

          <button
            type="button"
            className="btn btn-danger btn-sm"
            onClick={stopRecording}
          >
            <StopCircle size={14} /> Stop
          </button>
        </div>
      )}

      {audioUrl && (
        <div className="flex flex-col gap-2">
          <audio controls src={audioUrl} style={{ width: '100%' }} />
          <p className="form-success">
            WAV recording ready for local emotion analysis.
          </p>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={recordAgain}
            style={{ alignSelf: 'flex-start' }}
          >
            <RefreshCw size={14} /> Record again
          </button>
        </div>
      )}
    </div>
  );
}

function MusicPanel({ detectedMood }) {
  const [manualMood, setManualMood] = useState(null);

  useEffect(() => {
    setManualMood(null);
  }, [detectedMood]);

  const activeMood = manualMood || detectedMood || '';
  const recommendations = activeMood ? getRecommendations(activeMood) : null;
  const music = recommendations?.music;

  const selectMood = (mood) => {
    setManualMood((current) => (current === mood ? null : mood));
  };

  return (
    <div className="card" style={{ border: '1px solid var(--border)' }}>
      <h3 className="section-title">
        <Music2 size={18} /> Music for emotional well-being
      </h3>

      {detectedMood && !manualMood && (
        <div className="alert alert-success" style={{ marginBottom: '1rem' }}>
          Showing recommendations for your detected mood:{' '}
          <strong>{formatEmotion(detectedMood)}</strong>.
        </div>
      )}

      {detectedMood && manualMood && (
        <div className="flex items-center gap-3" style={{ marginBottom: '1rem', flexWrap: 'wrap' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Manual selection: <strong>{formatEmotion(manualMood)}</strong>
          </span>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setManualMood(null)}
          >
            <RefreshCw size={13} /> Return to detected mood
          </button>
        </div>
      )}

      <p className="form-label">Choose a mood to explore:</p>
      <div className="flex flex-wrap gap-2" style={{ marginBottom: '1rem' }}>
        {EMOTIONS.map((emotion) => (
          <button
            type="button"
            key={emotion}
            className={`btn btn-sm ${activeMood === emotion ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => selectMood(emotion)}
            aria-pressed={activeMood === emotion}
          >
            {EMOTION_LABELS[emotion]}
          </button>
        ))}
      </div>

      {!activeMood && (
        <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>
          Run emotion analysis or select a mood to view music recommendations.
        </p>
      )}

      {music?.tracks?.length > 0 && (
        <>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Category: <strong style={{ color: 'var(--gold)' }}>{music.category}</strong>
          </p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '0.65rem',
            }}
          >
            {music.tracks.map((track, index) => (
              <a
                key={`${track.url || track.title || 'track'}-${index}`}
                href={track.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  padding: '0.75rem',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-secondary)',
                  textDecoration: 'none',
                }}
              >
                <Music2 size={14} />
                <span style={{ flex: 1 }}>{track.title || 'Open music track'}</span>
                <ExternalLink size={12} />
              </a>
            ))}
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
            Music suggestions are intended for relaxation and emotional well-being. They are
            not medical advice or treatment.
          </p>
        </>
      )}
    </div>
  );
}

export default function MultimodalFusion() {
  const [textInput, setTextInput] = useState('');
  const [faceMode, setFaceMode] = useState('upload');
  const [imageFile, setImageFile] = useState(null);
  const [audioMode, setAudioMode] = useState('upload');
  const [audioFile, setAudioFile] = useState(null);
  const [sleepHours, setSleepHours] = useState('7.5');
  const [sleepError, setSleepError] = useState('');

  const [results, setResults] = useState(initialResults);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [warningNotes, setWarningNotes] = useState([]);

  const detectedMood = results.fused?.fusedEmotion || null;
  const hasAnyInput = Boolean(textInput.trim() || imageFile || audioFile);

  const handleSleepChange = (value) => {
    setSleepHours(value);

    if (value === '') {
      setSleepError('');
      return;
    }

    const numericValue = Number(value);
    if (!Number.isFinite(numericValue) || numericValue < 0 || numericValue > 24) {
      setSleepError('Enter a valid sleep duration between 0 and 24 hours.');
    } else {
      setSleepError('');
    }
  };

  const handleFaceUpload = (event) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setImageFile(file);
    } else if (file) {
      setError('Please select a valid image file.');
    }
  };

  const handleAudioUpload = (event) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('audio/')) {
      setAudioFile(file);
    } else if (file) {
      setError('Please select a valid audio file.');
    }
  };

  const switchFaceMode = (mode) => {
    setFaceMode(mode);
    setImageFile(null);
  };

  const switchAudioMode = (mode) => {
    setAudioMode(mode);
    setAudioFile(null);
  };

  const handleFuse = async () => {
    if (!hasAnyInput) {
      setError('Please provide at least one input: text, a face photo, or voice audio.');
      return;
    }

    if (sleepError) {
      setError('Please correct the sleep-duration value before continuing.');
      return;
    }

    setLoading(true);
    setError('');
    setStatus('');
    setWarningNotes([]);
    setResults(initialResults);

    const modalityResults = {
      text: null,
      face: null,
      voice: null,
    };
    const failures = [];

    // Each selected modality is requested once. A failed request is not silently retried.
    if (textInput.trim()) {
      setStatus('Analyzing text...');
      try {
        const response = await analyzeText(textInput.trim());
        const data = response?.data;
        if (isUsablePrediction(data)) {
          modalityResults.text = data;
        } else {
          failures.push(`Text analysis returned no usable prediction${data?.error ? `: ${data.error}` : '.'}`);
        }
      } catch (requestError) {
        failures.push(`Text analysis failed: ${getErrorMessage(requestError)}`);
      }
    }

    if (imageFile) {
      setStatus('Analyzing facial expression...');
      try {
        const response = await analyzeFace(imageFile);
        const data = response?.data;
        if (isUsablePrediction(data)) {
          modalityResults.face = data;
        } else {
          failures.push(`Face analysis returned no usable prediction${data?.error ? `: ${data.error}` : '.'}`);
        }
      } catch (requestError) {
        failures.push(`Face analysis failed: ${getErrorMessage(requestError)}`);
      }
    }

    if (audioFile) {
      setStatus('Analyzing voice...');
      try {
        const response = await analyzeVoice(audioFile, audioFile.name || 'recording.webm');
        const data = response?.data;
        if (isUsablePrediction(data)) {
          modalityResults.voice = data;
        } else {
          failures.push(`Voice analysis returned no usable prediction${data?.error ? `: ${data.error}` : '.'}`);
        }
      } catch (requestError) {
        failures.push(`Voice analysis failed: ${getErrorMessage(requestError)}`);
      }
    }

    const successfulCount = Object.values(modalityResults).filter(Boolean).length;

    if (successfulCount === 0) {
      setError(
        failures.length
          ? failures.join(' ')
          : 'No selected modality returned a usable prediction. Check that the inference services are running.'
      );
      setWarningNotes(failures);
      setStatus('');
      setLoading(false);
      return;
    }

    setStatus('Combining successful modality predictions...');
    try {
      const fusionResponse = await fuseEmotions({
        text: modalityResults.text,
        face: modalityResults.face,
        voice: modalityResults.voice,
      });

      const fusedData = fusionResponse?.data;
      if (!fusedData?.fusedEmotion) {
        throw new Error(fusedData?.error || 'Fusion did not return a fused emotion.');
      }

      setResults({
        ...modalityResults,
        fused: fusedData,
      });

      if (failures.length) {
        setWarningNotes(failures);
      }
    } catch (fusionError) {
      setResults({
        ...modalityResults,
        fused: null,
      });
      setError(`Multimodal fusion failed: ${getErrorMessage(fusionError)}`);
      if (failures.length) setWarningNotes(failures);
    } finally {
      setStatus('');
      setLoading(false);
    }
  };

  const tabStyle = (active) => ({
    padding: '0.4rem 0.8rem',
    borderRadius: 'var(--radius-sm)',
    border: `1px solid ${active ? 'var(--gold)' : 'var(--border)'}`,
    background: active ? 'var(--gold-dim)' : 'transparent',
    color: active ? 'var(--gold)' : 'var(--text-muted)',
    cursor: 'pointer',
    fontSize: '0.8125rem',
    fontWeight: 600,
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.375rem',
  });

  const resultCardStyle = {
    background: 'var(--bg-input)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    padding: '0.85rem',
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        maxWidth: 1240,
        margin: '0 auto',
      }}
    >
      <div
        className="alert alert-info"
        style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}
      >
        <Info size={16} style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          <strong>Weighted late fusion:</strong> text (40%), face (35%), and voice (25%).
          Missing or failed modalities are excluded by the fusion service. Weights should be
          re-normalized by that service for the modalities it receives.
        </div>
      </div>

      <div
        style={{
          padding: '0.9rem 1.1rem',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid rgba(245, 158, 11, 0.25)',
          background: 'rgba(15, 29, 53, 0.75)',
          color: 'var(--text-secondary)',
          fontSize: '0.82rem',
          lineHeight: 1.5,
        }}
      >
        <strong style={{ color: 'var(--gold-light)' }}>Disclaimer:</strong> This application
        provides experimental emotion estimates from user-provided inputs. It is not a
        diagnostic tool and is not a substitute for professional medical advice, diagnosis,
        or treatment.
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))',
          gap: '1.25rem',
          alignItems: 'start',
        }}
      >
        {/* Input column */}
        <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 className="section-title">
            <Layers size={18} /> Emotion analysis inputs
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
            Provide any combination of text, a facial image, and voice audio. Each selected
            modality is analyzed independently before fusion.
          </p>

          {/* Text */}
          <div style={resultCardStyle}>
            <div className="flex items-center gap-2" style={{ marginBottom: '0.65rem' }}>
              <FileText size={16} />
              <strong>Text input</strong>
              <span className="badge badge-gold">40% weight</span>
            </div>
            <textarea
              id="fusion-text"
              className="form-textarea"
              value={textInput}
              onChange={(event) => setTextInput(event.target.value)}
              placeholder="Write your current thoughts, reflections, or feelings..."
              style={{ minHeight: 110, width: '100%' }}
            />
          </div>

          {/* Face */}
          <div style={resultCardStyle}>
            <div className="flex items-center gap-2" style={{ marginBottom: '0.65rem' }}>
              <Camera size={16} />
              <strong>Facial expression</strong>
              <span className="badge badge-gold">35% weight</span>
            </div>

            <div className="flex flex-wrap gap-2" style={{ marginBottom: '0.8rem' }}>
              <button
                type="button"
                style={tabStyle(faceMode === 'upload')}
                onClick={() => switchFaceMode('upload')}
              >
                <Upload size={13} /> Upload photo
              </button>
              <button
                type="button"
                style={tabStyle(faceMode === 'webcam')}
                onClick={() => switchFaceMode('webcam')}
              >
                <Video size={13} /> Use webcam
              </button>
            </div>

            {faceMode === 'upload' ? (
              <div>
                <input
                  id="fusion-image"
                  type="file"
                  accept="image/*"
                  className="form-input"
                  onChange={handleFaceUpload}
                />
                {imageFile && (
                  <p className="form-success" style={{ marginTop: '0.5rem' }}>
                    <CheckCircle2 size={13} style={{ display: 'inline', marginRight: 5 }} />
                    {imageFile.name} selected
                  </p>
                )}
              </div>
            ) : (
              <WebcamCapture onCapture={setImageFile} />
            )}
          </div>

          {/* Voice */}
          <div style={resultCardStyle}>
            <div className="flex items-center gap-2" style={{ marginBottom: '0.65rem' }}>
              <Mic size={16} />
              <strong>Voice emotion</strong>
              <span className="badge badge-gold">25% weight</span>
            </div>

            <div className="flex flex-wrap gap-2" style={{ marginBottom: '0.8rem' }}>
              <button
                type="button"
                style={tabStyle(audioMode === 'upload')}
                onClick={() => switchAudioMode('upload')}
              >
                <Upload size={13} /> Upload audio
              </button>
              <button
                type="button"
                style={tabStyle(audioMode === 'record')}
                onClick={() => switchAudioMode('record')}
              >
                <Mic size={13} /> Record audio
              </button>
            </div>

            {audioMode === 'upload' ? (
              <div>
                <input
                  id="fusion-audio"
                  type="file"
                  accept="audio/*"
                  className="form-input"
                  onChange={handleAudioUpload}
                />
                {audioFile && (
                  <p className="form-success" style={{ marginTop: '0.5rem' }}>
                    <CheckCircle2 size={13} style={{ display: 'inline', marginRight: 5 }} />
                    {audioFile.name} selected
                  </p>
                )}
              </div>
            ) : (
              <MicRecorder onRecorded={setAudioFile} />
            )}
          </div>

          {/* Sleep */}
          <div style={resultCardStyle}>
            <div className="flex items-center gap-2" style={{ marginBottom: '0.65rem' }}>
              <Moon size={16} />
              <strong>Sleep duration</strong>
              <span className="badge badge-blue">Optional</span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 0 }}>
              Record how many hours you slept. This value is collected separately and is not
              automatically inferred from your text, face, or voice.
            </p>
            <div className="flex items-center gap-3">
              <input
                id="fusion-sleep-range"
                type="range"
                min="0"
                max="16"
                step="0.5"
                value={sleepHours === '' || sleepError ? 7.5 : Math.min(Number(sleepHours), 16)}
                onChange={(event) => handleSleepChange(event.target.value)}
                style={{ flex: 1 }}
                aria-label="Sleep duration slider"
              />
              <input
                id="fusion-sleep"
                type="number"
                min="0"
                max="24"
                step="0.5"
                className="form-input"
                value={sleepHours}
                onChange={(event) => handleSleepChange(event.target.value)}
                placeholder="7.5"
                style={{ width: 95 }}
                aria-label="Sleep duration in hours"
              />
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>hours</span>
            </div>
            <div className="flex flex-wrap gap-2" style={{ marginTop: '0.65rem' }}>
              {[6, 7, 7.5, 8, 9].map((hours) => (
                <button
                  type="button"
                  key={hours}
                  className="btn btn-ghost btn-sm"
                  onClick={() => handleSleepChange(String(hours))}
                >
                  {hours}h
                </button>
              ))}
            </div>
            {sleepError && (
              <p className="form-error" role="alert" style={{ marginBottom: 0 }}>
                {sleepError}
              </p>
            )}
          </div>

          {error && (
            <div className="alert alert-error" role="alert">
              <AlertTriangle size={14} style={{ display: 'inline', marginRight: 6 }} />
              {error}
            </div>
          )}

          {warningNotes.length > 0 && (
            <div className="alert alert-warning" role="status">
              <strong>Modality notes:</strong>
              <ul style={{ margin: '0.35rem 0 0 1.2rem' }}>
                {warningNotes.map((note, index) => <li key={`${index}-${note}`}>{note}</li>)}
              </ul>
            </div>
          )}

          {status && (
            <div className="alert alert-info" role="status">
              <span className="spinner" style={{ marginRight: 8 }} />
              {status}
            </div>
          )}

          <button
            id="btn-run-fusion"
            type="button"
            className="btn btn-primary btn-lg w-full"
            onClick={handleFuse}
            disabled={loading || !hasAnyInput || Boolean(sleepError)}
          >
            {loading ? (
              <>
                <span className="spinner" /> Analyzing...
              </>
            ) : (
              <>
                <Zap size={18} /> Run multimodal analysis
              </>
            )}
          </button>
        </section>

        {/* Results column */}
        <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 className="section-title">
            <Zap size={18} /> Multimodal emotion insights
          </h3>

          {loading && (
            <div className="alert alert-info" role="status">
              <span className="spinner" style={{ marginRight: 8 }} />
              {status || 'Analyzing selected inputs...'}
            </div>
          )}

          {!loading && !results.fused && (
            <div
              style={{
                textAlign: 'center',
                padding: '2rem 1rem',
                background: 'var(--bg-input)',
                border: '1px dashed var(--border)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✨</div>
              <strong>Awaiting analysis</strong>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 0 }}>
                Add at least one input and run the analysis to see emotion predictions.
              </p>
            </div>
          )}

          {!loading && results.fused && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '1.1rem',
                borderRadius: 'var(--radius-md)',
                background: `${getEmotionColor(results.fused.fusedEmotion)}15`,
                border: `1px solid ${getEmotionColor(results.fused.fusedEmotion)}40`,
              }}
            >
              <span style={{ fontSize: '2.8rem' }}>
                {getEmotionEmoji(results.fused.fusedEmotion)}
              </span>
              <div>
                <div
                  style={{
                    color: getEmotionColor(results.fused.fusedEmotion),
                    fontSize: '1.45rem',
                    fontWeight: 800,
                  }}
                >
                  {formatEmotion(results.fused.fusedEmotion)}
                </div>
                <span className="badge badge-gold">
                  {formatConfidence(results.fused.confidence)} confidence
                </span>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: '0.35rem 0 0' }}>
                  Fused result from {results.fused.modalitiesUsed?.join(', ') || 'successful modalities'}.
                </p>
              </div>
            </div>
          )}

          {results.fused?.distribution?.length > 0 && (
            <div style={resultCardStyle}>
              <strong style={{ fontSize: '0.8rem' }}>Emotion distribution</strong>
              <div className="flex flex-col gap-3" style={{ marginTop: '0.75rem' }}>
                {results.fused.distribution.slice(0, 5).map((item, index) => {
                  const emotion = item.label || item.emotion;
                  const score = Number(item.score) || 0;
                  const percentage = Math.round(score * 100);
                  const color = getEmotionColor(emotion);

                  return (
                    <div key={`${emotion || 'emotion'}-${index}`}>
                      <div className="flex justify-between" style={{ fontSize: '0.8rem', marginBottom: 4 }}>
                        <span>{getEmotionEmoji(emotion)} {formatEmotion(emotion)}</span>
                        <strong style={{ color }}>{percentage}%</strong>
                      </div>
                      <div className="progress-bar" style={{ height: 6 }}>
                        <div
                          className="progress-fill"
                          style={{ width: `${Math.max(0, Math.min(100, percentage))}%`, background: color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {results.fused?.disagreementNote && (
            <div className="alert alert-info" style={{ fontSize: '0.82rem' }}>
              {results.fused.disagreementNote}
            </div>
          )}

          {(results.text || results.face || results.voice) && (
            <div>
              <h4 style={{ marginBottom: '0.75rem' }}>Individual modality predictions</h4>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))',
                  gap: '0.7rem',
                }}
              >
                {[
                  ['Text', results.text],
                  ['Face', results.face],
                  ['Voice', results.voice],
                ].filter(([, result]) => Boolean(result)).map(([label, result]) => {
                  const emotion =
                    result.topEmotion ||
                    result.emotion ||
                    result.predicted_emotion ||
                    result.label ||
                    'Unknown';

                  return (
                    <div key={label} style={resultCardStyle}>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                        {label} model
                      </div>
                      <div style={{ color: getEmotionColor(emotion), fontWeight: 700, marginTop: 4 }}>
                        {getEmotionEmoji(emotion)} {formatEmotion(emotion)}
                      </div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: 3 }}>
                        {formatConfidence(result.confidence)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {results.fused?.recommendations && (
            <RecommendationCard recommendations={results.fused.recommendations} />
          )}

          {(results.text || results.face || results.voice) && (
            <div className="flex flex-col gap-3">
              {results.text && <EmotionResult result={results.text} title="Text emotion" compact />}
              {results.face && <EmotionResult result={results.face} title="Facial emotion" compact />}
              {results.voice && <EmotionResult result={results.voice} title="Voice emotion" compact />}
            </div>
          )}
        </section>
      </div>

      <MusicPanel detectedMood={detectedMood} />
    </div>
  );
}
