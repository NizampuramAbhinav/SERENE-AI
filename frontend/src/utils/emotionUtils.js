// frontend/src/utils/emotionUtils.js
// Utility functions for emotion display, colors, and labels.

export const EMOTION_COLORS = {
  joy: '#fbbf24',
  happiness: '#fbbf24',
  happy: '#fbbf24',
  sadness: '#60a5fa',
  sad: '#60a5fa',
  anger: '#f87171',
  angry: '#f87171',
  fear: '#a78bfa',
  fearful: '#a78bfa',
  disgust: '#34d399',
  surprise: '#fb923c',
  surprised: '#fb923c',
  neutral: '#94a3b8',
  calm: '#94a3b8',
};

export const EMOTION_EMOJIS = {
  joy: '😊', happiness: '😊', happy: '😊',
  sadness: '😢', sad: '😢',
  anger: '😡', angry: '😡',
  fear: '😨', fearful: '😨',
  disgust: '🤢',
  surprise: '😲', surprised: '😲',
  neutral: '😐', calm: '😐',
};

export function getEmotionColor(emotion) {
  return EMOTION_COLORS[(emotion || '').toLowerCase()] || '#94a3b8';
}

export function getEmotionEmoji(emotion) {
  return EMOTION_EMOJIS[(emotion || '').toLowerCase()] || '🧠';
}

export function formatEmotion(emotion) {
  if (!emotion) return 'Unknown';
  return emotion.charAt(0).toUpperCase() + emotion.slice(1).toLowerCase();
}

export function formatConfidence(score) {
  return `${Math.round((score || 0) * 100)}%`;
}
