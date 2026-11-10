// backend/routes/analytics.js
const express = require('express');
const auth = require('../middleware/auth');
const { getMoodTrends } = require('../controllers/analyticsController');

const router = express.Router();
router.get('/trends', auth, getMoodTrends);

module.exports = router;
