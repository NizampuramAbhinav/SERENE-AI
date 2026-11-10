
const axios = require('axios');
const crypto = require('crypto');

// Local Python FastAPI inference service
const PYTHON_API = (
  process.env.PYTHON_INFERENCE_URL || 'http://127.0.0.1:8000'
).replace(/\/+$/, '');

const TIMEOUT = 120000;

// Creates multipart/form-data without requiring another npm package.
function createMultipart(fieldName, filename, contentType, fileBuffer) {
  const boundary = `----SERENE-${crypto.randomBytes(16).toString('hex')}`;

  const header = Buffer.from(
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="${fieldName}"; filename="${filename}"\r\n` +
    `Content-Type: ${contentType}\r\n\r\n`
  );

  const footer = Buffer.from(`\r\n--${boundary}--\r\n`);

  const body = Buffer.concat([header, fileBuffer, footer]);

  return {
    body,
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': body.length,
    },
  };
}

async function analyzeTextEmotion(text) {
  const response = await axios.post(
    `${PYTHON_API}/predict/text`,
    { text },
    { timeout: TIMEOUT }
  );

  return response.data;
}

async function analyzeFaceEmotion(imageBuffer) {
  const multipart = createMultipart(
    'image',
    'image.jpg',
    'application/octet-stream',
    imageBuffer
  );

  const response = await axios.post(
    `${PYTHON_API}/predict/face`,
    multipart.body,
    {
      headers: multipart.headers,
      timeout: TIMEOUT,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    }
  );

  return response.data;
}

async function analyzeVoiceEmotion(audioBuffer) {
  const multipart = createMultipart(
    'audio',
    'audio.wav',
    'application/octet-stream',
    audioBuffer
  );

  const response = await axios.post(
    `${PYTHON_API}/predict/voice`,
    multipart.body,
    {
      headers: multipart.headers,
      timeout: TIMEOUT,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    }
  );

  return response.data;
}

module.exports = {
  analyzeTextEmotion,
  analyzeFaceEmotion,
  analyzeVoiceEmotion,
};
