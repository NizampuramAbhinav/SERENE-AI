
const EMOTION_MAP = {
  // Text model: GoEmotions labels
  anger: 'anger',
  annoyance: 'anger',
  disapproval: 'anger',

  disgust: 'disgust',

  fear: 'fear',
  nervousness: 'fear',

  joy: 'joy',
  amusement: 'joy',
  excitement: 'joy',
  gratitude: 'joy',
  love: 'joy',
  optimism: 'joy',
  pride: 'joy',
  relief: 'joy',
  admiration: 'joy',

  neutral: 'neutral',
  realization: 'neutral',
  curiosity: 'neutral',

  sadness: 'sadness',
  disappointment: 'sadness',
  grief: 'sadness',
  remorse: 'sadness',
  embarrassment: 'sadness',

  surprise: 'surprise',

  // Face and voice model labels
  angry: 'anger',
  fearful: 'fear',
  happy: 'joy',
  happiness: 'joy',
  calm: 'neutral',
  sad: 'sadness',
  surprised: 'surprise',
};

const CANONICAL_EMOTIONS = [
  'anger',
  'disgust',
  'fear',
  'joy',
  'neutral',
  'sadness',
  'surprise',
];

const WEIGHTS = {
  text: 0.40,
  face: 0.35,
  voice: 0.25,
};

function normaliseLabel(label) {
  const key = String(label || '').toLowerCase();
  return EMOTION_MAP[key] || key;
}

function buildProbVector(distribution) {
  const vector = Object.fromEntries(
    CANONICAL_EMOTIONS.map(emotion => [emotion, 0])
  );

  let total = 0;

  for (const item of distribution) {
    const canonical = normaliseLabel(item.label);
    const score = Number(item.score);

    if (
      Object.prototype.hasOwnProperty.call(vector, canonical) &&
      Number.isFinite(score) &&
      score > 0
    ) {
      vector[canonical] += score;
      total += score;
    }
  }

  if (total > 0) {
    for (const emotion of CANONICAL_EMOTIONS) {
      vector[emotion] /= total;
    }
  }

  return vector;
}

function fuseEmotions({ text, face, voice }) {
  const available = {};

  if (text?.distribution?.length) available.text = text;
  if (face?.distribution?.length) available.face = face;
  if (voice?.distribution?.length) available.voice = voice;

  const modalities = Object.keys(available);

  if (modalities.length === 0) {
    throw new Error('No modality predictions available for fusion.');
  }

  // Re-normalise weights when one or more modalities are missing.
  const totalWeight = modalities.reduce(
    (sum, modality) => sum + WEIGHTS[modality],
    0
  );

  const normalisedWeights = {};

  for (const modality of modalities) {
    normalisedWeights[modality] = WEIGHTS[modality] / totalWeight;
  }

  const combined = Object.fromEntries(
    CANONICAL_EMOTIONS.map(emotion => [emotion, 0])
  );

  for (const modality of modalities) {
    const vector = buildProbVector(available[modality].distribution);

    for (const emotion of CANONICAL_EMOTIONS) {
      combined[emotion] +=
        normalisedWeights[modality] * vector[emotion];
    }
  }

  const sorted = CANONICAL_EMOTIONS
    .map(label => ({
      label,
      score: combined[label],
    }))
    .sort((a, b) => b.score - a.score);

  const fusedEmotion = sorted[0].label;

  return {
    fusedEmotion,
    confidence: sorted[0].score,
    distribution: sorted,
    modalitiesUsed: modalities,
    modalitiesWeights: normalisedWeights,
    disagreementNote: generateDisagreementNote(
      available,
      fusedEmotion
    ),
  };
}

function generateDisagreementNote(available, fusedEmotion) {
  const differences = Object.entries(available)
    .filter(
      ([, modality]) =>
        normaliseLabel(modality.topEmotion) !== fusedEmotion
    )
    .map(
      ([name, modality]) =>
        `${name} predicted "${normaliseLabel(modality.topEmotion)}"`
    );

  return differences.length
    ? `Note: ${differences.join('; ')}. The fused result represents the weighted consensus.`
    : null;
}

module.exports = { fuseEmotions };
