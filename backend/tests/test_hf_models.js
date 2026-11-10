// backend/tests/test_hf_models.js
// Tests the 3 Hugging Face model integrations using live inference requests.
// Strictly real model responses only. Keeps all credentials private (zero credential logging).

const axios = require('axios');
const FormData = require('form-data');

const baseURL = 'http://localhost:5000';
const authHeader = { headers: { Authorization: 'Bearer demo-token-model-test' } };

// Generate a valid PNG image buffer
function getValidImage() {
  return Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x20, 0x00, 0x00, 0x00, 0x20, // 32x32
    0x08, 0x02, 0x00, 0x00, 0x00, 0xfc, 0x18, 0xed,
    0xa3, 0x00, 0x00, 0x00, 0x19, 0x49, 0x44, 0x41,
    0x54, 0x78, 0x9c, 0x63, 0xf8, 0xcf, 0xc0, 0x00,
    0x00, 0x03, 0x01, 0x01, 0x00, 0x18, 0xdd, 0x8d,
    0xb0, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e,
    0x44, 0xae, 0x42, 0x60, 0x82
  ]);
}

// Generate a valid 16kHz PCM WAV audio buffer with a 440Hz tone
function getValidWavAudio() {
  const sampleRate = 16000;
  const durationSec = 1.0;
  const numSamples = Math.floor(sampleRate * durationSec);
  const dataSize = numSamples * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);

  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const sample = Math.sin(2 * Math.PI * 440 * t) * 16000;
    buffer.writeInt16LE(Math.floor(sample), 44 + i * 2);
  }

  return buffer;
}

async function testModels() {
  const summary = {};

  // 1. Text Emotion Model
  try {
    const res = await axios.post(
      `${baseURL}/api/emotion/text`,
      { text: 'I am incredibly thrilled and proud of completing this major milestone!' },
      authHeader
    );
    if (res.data.status === 'PASS' && res.data.topEmotion) {
      summary['1. Text Emotion (j-hartmann/emotion-english-distilroberta-base)'] = {
        status: 'PASS',
        httpStatus: res.status,
        model: res.data.model,
        topEmotion: res.data.topEmotion,
        confidence: Number((res.data.confidence * 100).toFixed(2)) + '%',
        topPredictions: res.data.distribution?.slice(0, 3) || [],
      };
    } else {
      summary['1. Text Emotion (j-hartmann/emotion-english-distilroberta-base)'] = {
        status: 'FAIL',
        httpStatus: res.status,
        error: 'Incomplete response',
      };
    }
  } catch (err) {
    summary['1. Text Emotion (j-hartmann/emotion-english-distilroberta-base)'] = {
      status: err.response?.data?.status || 'FAIL',
      httpStatus: err.response?.status || 500,
      error: err.response?.data?.detail || err.response?.data?.error || err.message,
    };
  }

  // 2. Facial Expression Model
  try {
    const form = new FormData();
    form.append('image', getValidImage(), { filename: 'test_face.png', contentType: 'image/png' });
    const res = await axios.post(`${baseURL}/api/emotion/face`, form, {
      ...authHeader,
      headers: { ...authHeader.headers, ...form.getHeaders() },
    });
    if (res.data.status === 'PASS' && res.data.topEmotion) {
      summary['2. Facial Expression (trpakov/vit-face-expression)'] = {
        status: 'PASS',
        httpStatus: res.status,
        model: res.data.model,
        topEmotion: res.data.topEmotion,
        confidence: Number((res.data.confidence * 100).toFixed(2)) + '%',
        topPredictions: res.data.distribution?.slice(0, 3) || [],
      };
    } else {
      summary['2. Facial Expression (trpakov/vit-face-expression)'] = {
        status: 'FAIL',
        httpStatus: res.status,
        error: 'Incomplete response',
      };
    }
  } catch (err) {
    summary['2. Facial Expression (trpakov/vit-face-expression)'] = {
      status: err.response?.data?.status || 'FAIL',
      httpStatus: err.response?.status || 500,
      error: err.response?.data?.detail || err.response?.data?.error || err.message,
    };
  }

  // 3. Voice Emotion Model
  try {
    const form = new FormData();
    form.append('audio', getValidWavAudio(), { filename: 'test_voice.wav', contentType: 'audio/wav' });
    const res = await axios.post(`${baseURL}/api/emotion/voice`, form, {
      ...authHeader,
      headers: { ...authHeader.headers, ...form.getHeaders() },
    });
    if (res.data.status === 'PASS' && res.data.topEmotion) {
      summary['3. Voice Emotion (ehcalabres/wav2vec2-lg-xlsr-en-speech-emotion-recognition)'] = {
        status: 'PASS',
        httpStatus: res.status,
        model: res.data.model,
        topEmotion: res.data.topEmotion,
        confidence: Number((res.data.confidence * 100).toFixed(2)) + '%',
        topPredictions: res.data.distribution?.slice(0, 3) || [],
      };
    } else {
      summary['3. Voice Emotion (ehcalabres/wav2vec2-lg-xlsr-en-speech-emotion-recognition)'] = {
        status: 'FAIL',
        httpStatus: res.status,
        error: 'Incomplete response',
      };
    }
  } catch (err) {
    summary['3. Voice Emotion (ehcalabres/wav2vec2-lg-xlsr-en-speech-emotion-recognition)'] = {
      status: err.response?.data?.status || 'FAIL',
      httpStatus: err.response?.status || 500,
      error: err.response?.data?.detail || err.response?.data?.error || err.message,
    };
  }

  console.log(JSON.stringify(summary, null, 2));
}

testModels();
