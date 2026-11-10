// frontend/src/services/api.js
// Axios instance that attaches the Firebase ID token or demo token to every request.

import axios from 'axios';
import { auth } from '../config/firebase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use(async (config) => {
  let token = null;
  try {
    if (auth && auth.currentUser) {
      token = await auth.currentUser.getIdToken();
    } else if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('serene_user');
      if (saved) {
        token = 'demo-token-serene-user';
      }
    }
  } catch (e) {
    token = 'demo-token-serene-user';
  }

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;

// ── Emotion APIs ─────────────────────────────────────────────────────────────
export const analyzeText = (text) => api.post('/api/emotion/text', { text });

export const analyzeFace = (imageFile) => {
  const form = new FormData();
  form.append('image', imageFile);
  return api.post('/api/emotion/face', form, { headers: { 'Content-Type': 'multipart/form-data' } });
};

export const analyzeVoice = (audioBlob, filename = 'recording.wav') => {
  const form = new FormData();
  form.append('audio', audioBlob, filename);
  return api.post('/api/emotion/voice', form, { headers: { 'Content-Type': 'multipart/form-data' } });
};

export const fuseEmotions = (data) => api.post('/api/emotion/fuse', data);

// ── Journal APIs ──────────────────────────────────────────────────────────────
export const createJournalEntry = (entry) => api.post('/api/journal', entry);
export const getJournalEntries = () => api.get('/api/journal');
export const getJournalEntry = (id) => api.get(`/api/journal/${id}`);
export const updateJournalEntry = (id, updates) => api.patch(`/api/journal/${id}`, updates);
export const deleteJournalEntry = (id) => api.delete(`/api/journal/${id}`);

// ── Analytics ─────────────────────────────────────────────────────────────────
export const getMoodTrends = () => api.get('/api/analytics/trends');

// ── PDF Export ────────────────────────────────────────────────────────────────
export const downloadPDF = async () => {
  let token = '';
  try {
    if (auth && auth.currentUser) {
      token = await auth.currentUser.getIdToken();
    } else if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('serene_user');
      if (saved) token = 'demo-token-serene-user';
    }
  } catch (e) {
    token = 'demo-token-serene-user';
  }

  const response = await fetch(`${API_URL}/api/pdf/export`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error('PDF export failed');
  }
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `SERENE_AI_Journal_${Date.now()}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
};
