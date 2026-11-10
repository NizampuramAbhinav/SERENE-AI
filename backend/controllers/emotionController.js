
const {
  analyzeTextEmotion,
  analyzeFaceEmotion,
  analyzeVoiceEmotion,
} = require('../services/huggingface');

const { fuseEmotions } = require('../services/fusion');
const { getRecommendations } = require('../services/recommendations');

// Convert model-specific emotion labels into canonical emotions
function canonicalEmotion(label) {
  const map = {
    angry: 'anger',
    fearful: 'fear',
    happy: 'joy',
    happiness: 'joy',
    calm: 'neutral',
    sad: 'sadness',
    surprised: 'surprise',
    amusement: 'joy',
    excitement: 'joy',
    gratitude: 'joy',
    love: 'joy',
    optimism: 'joy',
    pride: 'joy',
    relief: 'joy',
    admiration: 'joy',
    annoyance: 'anger',
    disapproval: 'anger',
    nervousness: 'fear',
    realization: 'neutral',
    curiosity: 'neutral',
    disappointment: 'sadness',
    grief: 'sadness',
    remorse: 'sadness',
    embarrassment: 'sadness',
  };

  const key = String(label || 'neutral').toLowerCase();
  return map[key] || key;
}

// Handle errors from the local Python inference service
function handleEmotionError(res, err, modality) {
  console.error(`[${modality} Emotion]`, err.message);

  const pythonError =
    err.response?.data?.detail || err.response?.data?.error;

  if (err.code === 'ECONNREFUSED' || err.code === 'ECONNRESET') {
    return res.status(503).json({
      status: 'NOT_CONFIGURED',
      error: 'Local emotion inference service is unavailable.',
      detail:
        'Please ensure the Python FastAPI service is running at http://127.0.0.1:8000.',
    });
  }

  return res.status(503).json({
    status: 'FAIL',
    error: `${modality} emotion inference failed.`,
    detail: pythonError || err.message,
  });
}

// POST /api/emotion/text
async function analyzeText(req, res) {
  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string' || text.trim().length < 2) {
      return res.status(400).json({
        error: 'Please provide at least 2 characters of text.',
      });
    }

    const result = await analyzeTextEmotion(text.trim());

    const recommendations = getRecommendations(
      canonicalEmotion(result.topEmotion)
    );

    return res.json({
      status: 'PASS',
      ...result,
      recommendations,
    });
  } catch (err) {
    return handleEmotionError(res, err, 'Text');
  }
}

// POST /api/emotion/face
async function analyzeFace(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No image file uploaded. Please provide an image.',
      });
    }

    const result = await analyzeFaceEmotion(req.file.buffer);

    const recommendations = getRecommendations(
      canonicalEmotion(result.topEmotion)
    );

    return res.json({
      status: 'PASS',
      ...result,
      recommendations,
    });
  } catch (err) {
    return handleEmotionError(res, err, 'Face');
  }
}

// POST /api/emotion/voice
async function analyzeVoice(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No audio file uploaded. Please provide an audio file.',
      });
    }

    const result = await analyzeVoiceEmotion(req.file.buffer);

    const recommendations = getRecommendations(
      canonicalEmotion(result.topEmotion)
    );

    return res.json({
      status: 'PASS',
      ...result,
      recommendations,
    });
  } catch (err) {
    return handleEmotionError(res, err, 'Voice');
  }
}

// POST /api/emotion/fuse
async function fuseEmotion(req, res) {
  try {
    const { text, face, voice } = req.body;

    if (!text && !face && !voice) {
      return res.status(400).json({
        error: 'Provide at least one modality result for fusion.',
      });
    }

    const fusionResult = fuseEmotions({ text, face, voice });

    const recommendations = getRecommendations(
      canonicalEmotion(fusionResult.fusedEmotion)
    );

    return res.json({
      status: 'PASS',
      ...fusionResult,
      recommendations,
    });
  } catch (err) {
    console.error('[Fusion]', err.message);

    return res.status(400).json({
      status: 'FAIL',
      error: err.message,
    });
  }
}

module.exports = {
  analyzeText,
  analyzeFace,
  analyzeVoice,
  fuseEmotion,
};
