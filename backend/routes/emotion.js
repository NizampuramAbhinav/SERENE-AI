// backend/routes/emotion.js
const express = require('express');
const multer = require('multer');
const auth = require('../middleware/auth');
const { analyzeText, analyzeFace, analyzeVoice, fuseEmotion } = require('../controllers/emotionController');

const router = express.Router();
// Store files in memory (buffer) — no disk writes needed for inference
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.post('/text', auth, analyzeText);
router.post('/face', auth, upload.single('image'), analyzeFace);
router.post('/voice', auth, upload.single('audio'), analyzeVoice);
router.post('/fuse', auth, fuseEmotion);

module.exports = router;
