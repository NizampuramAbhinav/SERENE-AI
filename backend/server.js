// backend/server.js
// Main Express server entry point for SERENE AI backend.

require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  })
);

// ── Body parsers ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/emotion', require('./routes/emotion'));
app.use('/api/journal', require('./routes/journal'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/pdf', require('./routes/pdf'));

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'SERENE AI Backend',
    timestamp: new Date().toISOString(),
    hfConfigured: !!process.env.HF_TOKEN,
    firebaseConfigured: !!process.env.FIREBASE_PROJECT_ID,
  });
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('[Server Error]', err);
  res.status(500).json({ error: 'Internal server error.', detail: err.message });
});

app.listen(PORT, () => {
  console.log(`\n✅ SERENE AI Backend running at http://localhost:${PORT}`);
  console.log(`   HF Token configured  : ${!!process.env.HF_TOKEN}`);
  console.log(`   Firebase configured  : ${!!process.env.FIREBASE_PROJECT_ID}\n`);
});
