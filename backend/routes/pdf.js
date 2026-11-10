// backend/routes/pdf.js
const express = require('express');
const auth = require('../middleware/auth');
const { exportPDF } = require('../controllers/pdfController');

const router = express.Router();
router.get('/export', auth, exportPDF);

module.exports = router;
