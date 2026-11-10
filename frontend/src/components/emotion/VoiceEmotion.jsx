
import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  MicOff,
  Upload,
  RefreshCw,
  Info,
  Square
} from 'lucide-react';

import { analyzeVoice } from '../../services/api';
import EmotionResult from '../ui/EmotionResult';
import RecommendationCard from '../ui/RecommendationCard';

// Convert browser-recorded audio (WebM/Opus) into PCM WAV.
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

    // Create 16-bit, mono PCM WAV.
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

export default function VoiceEmotion() {
  const [mode, setMode] = useState('record');
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioURL, setAudioURL] = useState(null);
  const [timer, setTimer] = useState(0);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const fileInputRef = useRef(null);
  const audioURLRef = useRef(null);
  const streamRef = useRef(null);

  const clearAudioURL = () => {
    if (audioURLRef.current) {
      URL.revokeObjectURL(audioURLRef.current);
      audioURLRef.current = null;
    }

    setAudioURL(null);
  };

  const setPreviewURL = (blob) => {
    clearAudioURL();

    const url = URL.createObjectURL(blob);
    audioURLRef.current = url;
    setAudioURL(url);
  };

  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);

      streamRef.current?.getTracks().forEach(track => track.stop());

      if (audioURLRef.current) {
        URL.revokeObjectURL(audioURLRef.current);
      }
    };
  }, []);

  const startRecording = async () => {
    setError('');
    setResult(null);
    setAudioBlob(null);
    clearAudioURL();
    setTimer(0);

    try {
      if (
        !navigator.mediaDevices?.getUserMedia ||
        !window.MediaRecorder
      ) {
        throw new Error(
          'Your browser does not support microphone recording.'
        );
      }

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

      const mimeType = supportedTypes.find(type =>
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

      // IMPORTANT: Convert the recording to WAV before saving it.
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

          setAudioBlob(wavFile);
          setPreviewURL(wavBlob);

        } catch (err) {
          setError(
            'Audio conversion failed: ' + err.message
          );
        } finally {
          stream.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };

      recorder.onerror = () => {
        setError('Recording failed. Please try again.');
        clearInterval(timerRef.current);
        setRecording(false);
        stream.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      };

      recorder.start();
      setRecording(true);

      timerRef.current = setInterval(() => {
        setTimer(current => current + 1);
      }, 1000);

    } catch (err) {
      streamRef.current?.getTracks().forEach(track => track.stop());
      streamRef.current = null;

      setError(
        err.message ||
        'Microphone access failed. Please allow microphone permissions.'
      );
    }
  };

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current;

    clearInterval(timerRef.current);

    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    }

    setRecording(false);
  };

  const handleFileUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
      setError('Please upload a valid audio file.');
      event.target.value = '';
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Audio file must be smaller than 10 MB.');
      event.target.value = '';
      return;
    }

    clearAudioURL();
    setAudioBlob(file);
    setPreviewURL(file);
    setResult(null);
    setError('');
  };

  const getAudioFilename = (blob) => {
    if (blob.name) return blob.name;

    const mime = (blob.type || '').toLowerCase();

    if (mime.includes('wav')) return 'recording.wav';
    if (mime.includes('mp4')) return 'recording.m4a';
    if (mime.includes('ogg')) return 'recording.ogg';
    if (mime.includes('mpeg')) return 'recording.mp3';

    return 'recording.wav';
  };

  const handleAnalyze = async () => {
    if (!audioBlob) {
      setError('Please record or upload audio first.');
      return;
    }

    setError('');
    setResult(null);
    setLoading(true);

    try {
      const filename = getAudioFilename(audioBlob);

      const response = await analyzeVoice(
        audioBlob,
        filename
      );

      setResult(response.data);

    } catch (err) {
      setError(
        err.response?.data?.detail ||
        err.response?.data?.error ||
        'Voice analysis failed. Check that both backend services are running.'
      );
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    if (recording) {
      stopRecording();
    }

    setAudioBlob(null);
    clearAudioURL();
    setResult(null);
    setError('');
    setTimer(0);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatTime = (seconds) =>
    `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '1.5rem'
    }}>

      <div className="alert alert-info flex gap-2">
        <Info size={16} style={{
          flexShrink: 0,
          marginTop: '2px'
        }} />

        <div>
          <strong>Local Wav2Vec2 Voice Emotion Recognition</strong> —
          Uses a locally fine-tuned Wav2Vec2 model trained on
          the RAVDESS dataset to identify eight vocal emotion categories.

          <p style={{ marginTop: '0.5rem' }}>
            The model analyzes acoustic features from speech audio
            rather than relying on speech-to-text transcription.
            Audio is processed by your local inference service.
          </p>

          <p style={{ marginTop: '0.5rem' }}>
            Results are AI estimates and may not accurately reflect
            a person's actual emotional state.
          </p>
        </div>
      </div>

      <div className="card">
        <h3 className="section-title">
          <Mic size={18} />
          Voice Emotion Analysis
        </h3>

        <div style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '1.25rem',
          background: 'var(--bg-input)',
          padding: '0.25rem',
          borderRadius: 'var(--radius-md)'
        }}>
          {[
            { id: 'record', label: 'Record Audio', icon: Mic },
            { id: 'upload', label: 'Upload File', icon: Upload }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              id={`voice-mode-${id}`}
              className={`btn btn-sm flex-1 ${mode === id ? 'btn-primary' : 'btn-ghost'
                }`}
              onClick={() => {
                setMode(id);
                reset();
              }}
              disabled={recording || loading}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {mode === 'record' && (
          <div style={{
            textAlign: 'center',
            padding: '2rem 0'
          }}>
            {!audioURL ? (
              <div>
                <div style={{
                  width: 100,
                  height: 100,
                  borderRadius: '50%',
                  margin: '0 auto 1.5rem',
                  background: recording
                    ? 'rgba(244,63,94,0.15)'
                    : 'var(--bg-input)',
                  border: `3px solid ${recording ? 'var(--rose)' : 'var(--border)'
                    }`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  animation: recording
                    ? 'pulse 1.5s ease-in-out infinite'
                    : 'none'
                }}>
                  {recording
                    ? <MicOff size={36} style={{ color: 'var(--rose)' }} />
                    : <Mic size={36} style={{ color: 'var(--text-muted)' }} />
                  }
                </div>

                {recording && (
                  <div style={{
                    fontSize: '1.5rem',
                    fontFamily: 'Outfit',
                    color: 'var(--rose)',
                    marginBottom: '0.5rem'
                  }}>
                    {formatTime(timer)}
                  </div>
                )}

                <p style={{
                  color: 'var(--text-muted)',
                  marginBottom: '1.25rem',
                  fontSize: '0.875rem'
                }}>
                  {recording
                    ? 'Recording in progress… speak naturally'
                    : 'Click below and speak clearly for best results'
                  }
                </p>

                {!recording ? (
                  <button
                    id="btn-start-record"
                    className="btn btn-primary btn-lg"
                    onClick={startRecording}
                    disabled={loading}
                  >
                    <Mic size={18} />
                    Start Recording
                  </button>
                ) : (
                  <button
                    id="btn-stop-record"
                    className="btn btn-danger btn-lg"
                    onClick={stopRecording}
                  >
                    <Square size={18} />
                    Stop Recording
                  </button>
                )}
              </div>
            ) : (
              <div>
                <p style={{
                  color: 'var(--text-secondary)',
                  marginBottom: '0.875rem'
                }}>
                  Recording complete:
                </p>

                <audio
                  id="audio-preview"
                  controls
                  src={audioURL}
                  style={{
                    width: '100%',
                    maxWidth: '400px',
                    borderRadius: 'var(--radius-md)'
                  }}
                />

                <br />

                <button
                  id="voice-reset"
                  className="btn btn-ghost btn-sm mt-3"
                  onClick={reset}
                >
                  <RefreshCw size={14} />
                  Record again
                </button>
              </div>
            )}
          </div>
        )}

        {mode === 'upload' && (
          <div>
            {!audioURL ? (
              <div
                className="upload-zone"
                id="voice-upload-zone"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={36} style={{
                  color: 'var(--text-muted)',
                  marginBottom: '0.75rem'
                }} />

                <p style={{
                  color: 'var(--text-secondary)',
                  marginBottom: '0.5rem'
                }}>
                  Choose an audio file
                </p>

                <p style={{
                  fontSize: '0.8rem',
                  color: 'var(--text-muted)'
                }}>
                  WAV recommended · MP3 and OGG may be supported · Max 10 MB
                </p>

                <input
                  ref={fileInputRef}
                  id="voice-file-input"
                  type="file"
                  accept="audio/*"
                  style={{ display: 'none' }}
                  onChange={handleFileUpload}
                />
              </div>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <audio
                  id="audio-preview-upload"
                  controls
                  src={audioURL}
                  style={{
                    width: '100%',
                    borderRadius: 'var(--radius-md)'
                  }}
                />

                <button
                  id="voice-reset-upload"
                  className="btn btn-ghost btn-sm mt-2"
                  onClick={reset}
                >
                  <RefreshCw size={14} />
                  Choose different file
                </button>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="alert alert-error mt-4" role="alert">
            {error}
          </div>
        )}

        <button
          id="btn-analyze-voice"
          className="btn btn-primary btn-lg mt-4 w-full"
          onClick={handleAnalyze}
          disabled={loading || !audioBlob || recording}
        >
          {loading
            ? <><span className="spinner" /> Analyzing voice…</>
            : <><Mic size={18} /> Analyze Voice</>
          }
        </button>
      </div>

      {result && (
        <>
          <EmotionResult
            result={result}
            title="Voice Emotion Result"
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
