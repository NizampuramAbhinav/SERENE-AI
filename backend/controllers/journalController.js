// backend/controllers/journalController.js
// CRUD operations for emotion journal entries stored in Firebase Realtime Database
// with seamless in-memory fallback for immediate local testing.

const { getDb } = require('../config/firebase');

// In-memory fallback store: uid -> Map(id -> entry)
const memoryStore = new Map();

// Helper for in-memory fallback store
function getOrCreateUserStore(uid) {
  if (!memoryStore.has(uid)) {
    memoryStore.set(uid, new Map());
  }
  return memoryStore.get(uid);
}

function userRef(uid) {
  const db = getDb();
  if (!db) return null;
  return db.ref(`journals/${uid}`);
}

// POST /api/journal  — create new entry
async function createEntry(req, res) {
  try {
    const uid = req.user.uid;
    const { text, sleepHours, stressLevel, textResult, faceResult, voiceResult, fusedResult, recommendations } = req.body;

    const entry = {
      uid,
      text: text || null,
      sleepHours: sleepHours ?? null,
      stressLevel: stressLevel ?? null,
      textResult: textResult || null,
      faceResult: faceResult || null,
      voiceResult: voiceResult || null,
      fusedResult: fusedResult || null,
      recommendations: recommendations || null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const ref = userRef(uid);
    if (ref) {
      const newRef = ref.push();
      await newRef.set(entry);
      return res.status(201).json({ id: newRef.key, ...entry });
    } else {
      // In-memory fallback
      const id = 'entry-' + Date.now();
      const store = getOrCreateUserStore(uid);
      const saved = { id, ...entry };
      store.set(id, saved);
      return res.status(201).json(saved);
    }
  } catch (err) {
    console.error('[Journal] createEntry:', err.message);
    return res.status(500).json({ error: err.message });
  }
}

// GET /api/journal  — list all entries for logged-in user
async function listEntries(req, res) {
  try {
    const uid = req.user.uid;
    const ref = userRef(uid);

    if (ref) {
      const snapshot = await ref.orderByChild('createdAt').once('value');
      const raw = snapshot.val() || {};
      const entries = Object.entries(raw)
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => b.createdAt - a.createdAt);
      return res.json({ entries });
    } else {
      const store = getOrCreateUserStore(uid);
      const entries = Array.from(store.values()).sort((a, b) => b.createdAt - a.createdAt);
      return res.json({ entries });
    }
  } catch (err) {
    console.error('[Journal] listEntries:', err.message);
    return res.status(500).json({ error: err.message });
  }
}

// GET /api/journal/:id  — get single entry
async function getEntry(req, res) {
  try {
    const uid = req.user.uid;
    const { id } = req.params;
    const ref = userRef(uid);

    if (ref) {
      const snapshot = await ref.child(id).once('value');
      if (!snapshot.exists()) {
        return res.status(404).json({ error: 'Entry not found.' });
      }
      return res.json({ id, ...snapshot.val() });
    } else {
      const store = getOrCreateUserStore(uid);
      const entry = store.get(id);
      if (!entry) return res.status(404).json({ error: 'Entry not found.' });
      return res.json(entry);
    }
  } catch (err) {
    console.error('[Journal] getEntry:', err.message);
    return res.status(500).json({ error: err.message });
  }
}

// PATCH /api/journal/:id  — update entry
async function updateEntry(req, res) {
  try {
    const uid = req.user.uid;
    const { id } = req.params;
    const updates = { ...req.body, updatedAt: Date.now() };
    delete updates.uid;

    const ref = userRef(uid);
    if (ref) {
      const itemRef = ref.child(id);
      const snapshot = await itemRef.once('value');
      if (!snapshot.exists()) {
        return res.status(404).json({ error: 'Entry not found.' });
      }
      await itemRef.update(updates);
      const updated = await itemRef.once('value');
      return res.json({ id, ...updated.val() });
    } else {
      const store = getOrCreateUserStore(uid);
      const current = store.get(id);
      if (!current) return res.status(404).json({ error: 'Entry not found.' });
      const updated = { ...current, ...updates };
      store.set(id, updated);
      return res.json(updated);
    }
  } catch (err) {
    console.error('[Journal] updateEntry:', err.message);
    return res.status(500).json({ error: err.message });
  }
}

// DELETE /api/journal/:id
async function deleteEntry(req, res) {
  try {
    const uid = req.user.uid;
    const { id } = req.params;
    const ref = userRef(uid);

    if (ref) {
      const itemRef = ref.child(id);
      const snapshot = await itemRef.once('value');
      if (!snapshot.exists()) {
        return res.status(404).json({ error: 'Entry not found.' });
      }
      await itemRef.remove();
      return res.json({ message: 'Entry deleted successfully.' });
    } else {
      const store = getOrCreateUserStore(uid);
      if (!store.has(id)) return res.status(404).json({ error: 'Entry not found.' });
      store.delete(id);
      return res.json({ message: 'Entry deleted successfully.' });
    }
  } catch (err) {
    console.error('[Journal] deleteEntry:', err.message);
    return res.status(500).json({ error: err.message });
  }
}

module.exports = { createEntry, listEntries, getEntry, updateEntry, deleteEntry, getOrCreateUserStore };
