
// backend/controllers/analyticsController.js
// Computes mood trend analytics from the user's saved journal history.

const { getDb } = require('../config/firebase');
const { getOrCreateUserStore } = require('./journalController');

function userRef(uid) {
  const db = getDb();
  if (!db) return null;
  return db.ref(`journals/${uid}`);
}

function getFirstDefined(...values) {
  return values.find(value => value !== undefined && value !== null);
}

// GET /api/analytics/trends
async function getMoodTrends(req, res) {
  try {
    const uid = req.user.uid;
    const ref = userRef(uid);
    let entries = [];

    if (ref) {
      const snapshot = await ref.orderByChild('createdAt').once('value');
      const raw = snapshot.val() || {};

      entries = Object.entries(raw)
        .map(([id, entry]) => ({ id, ...entry }))
        .sort((a, b) => a.createdAt - b.createdAt);
    } else {
      const store = getOrCreateUserStore(uid);
      entries = Array.from(store.values())
        .sort((a, b) => a.createdAt - b.createdAt);
    }

    if (entries.length === 0) {
      return res.json({
        message: 'No journal entries yet.',
        trends: [],
        distribution: [],
        summary: {
          totalEntries: 0,
          mostFrequentEmotion: null,
          avgSleepHours: null,
          avgStressLevel: null,
        },
      });
    }

    // TEMPORARY DEBUG LOG: inspect saved prediction confidence.
    console.log(
      '[Analytics Debug]',
      entries.map(entry => ({
        fusedEmotion: entry.fusedResult?.fusedEmotion,
        fusedConfidence: entry.fusedResult?.confidence,
        textConfidence: entry.textResult?.confidence,
        faceConfidence: entry.faceResult?.confidence,
        voiceConfidence: entry.voiceResult?.confidence,
      }))
    );

    // Build timeline from saved journal entries.
    const trends = entries.map(entry => {
      const emotion = getFirstDefined(
        entry.fusedResult?.fusedEmotion,
        entry.fusedResult?.topEmotion,
        entry.textResult?.topEmotion,
        entry.faceResult?.topEmotion,
        entry.voiceResult?.topEmotion,
        entry.emotion,
        'neutral'
      );

      const confidence = getFirstDefined(
        entry.fusedResult?.confidence,
        entry.textResult?.confidence,
        entry.faceResult?.confidence,
        entry.voiceResult?.confidence,
        entry.confidence,
        0
      );

      const numericConfidence = Number(confidence);
      const confidencePercentage = Number.isFinite(numericConfidence)
        ? Math.round(
          numericConfidence <= 1
            ? numericConfidence * 100
            : numericConfidence
        )
        : 0;

      return {
        date: new Date(entry.createdAt).toLocaleDateString('en-IN'),
        emotion: String(emotion).toLowerCase(),
        confidence: confidencePercentage,
        sleepHours: entry.sleepHours ?? null,
        stressLevel: entry.stressLevel ?? null,
      };
    });

    // Calculate emotion distribution.
    const counts = {};

    trends.forEach(trend => {
      counts[trend.emotion] = (counts[trend.emotion] || 0) + 1;
    });

    const distribution = Object.entries(counts).map(
      ([emotion, count]) => ({
        emotion,
        count,
        percentage: Math.round((count / trends.length) * 100),
      })
    );

    // Calculate averages using available saved values.
    const validSleep = entries
      .map(entry => Number(entry.sleepHours))
      .filter(value => Number.isFinite(value) && value >= 0);

    const validStress = entries
      .map(entry => Number(entry.stressLevel))
      .filter(value => Number.isFinite(value) && value >= 0);

    const avgSleep = validSleep.length
      ? Number(
        (
          validSleep.reduce((sum, value) => sum + value, 0) /
          validSleep.length
        ).toFixed(1)
      )
      : null;

    const avgStress = validStress.length
      ? Number(
        (
          validStress.reduce((sum, value) => sum + value, 0) /
          validStress.length
        ).toFixed(1)
      )
      : null;

    // Find most frequent emotion.
    const dominant =
      [...distribution].sort((a, b) => b.count - a.count)[0]?.emotion ?? null;

    return res.json({
      trends,
      distribution,
      summary: {
        totalEntries: entries.length,
        mostFrequentEmotion: dominant,
        avgSleepHours: avgSleep,
        avgStressLevel: avgStress,
        firstEntryDate: new Date(
          entries[0].createdAt
        ).toLocaleDateString('en-IN'),
        lastEntryDate: new Date(
          entries[entries.length - 1].createdAt
        ).toLocaleDateString('en-IN'),
      },
    });
  } catch (err) {
    console.error('[Analytics] getMoodTrends:', err.message);
    return res.status(500).json({ error: err.message });
  }
}

module.exports = { getMoodTrends };
