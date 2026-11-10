// backend/routes/journal.js
const express = require('express');
const auth = require('../middleware/auth');
const { createEntry, listEntries, getEntry, updateEntry, deleteEntry } = require('../controllers/journalController');

const router = express.Router();

router.post('/', auth, createEntry);
router.get('/', auth, listEntries);
router.get('/:id', auth, getEntry);
router.patch('/:id', auth, updateEntry);
router.delete('/:id', auth, deleteEntry);

module.exports = router;
